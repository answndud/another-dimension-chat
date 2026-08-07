import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const configuredUrl = process.argv[2] || process.env.AD_ACCEPTANCE_URL;
if (!configuredUrl) {
  console.error("Usage: node scripts/check_https_endpoint.mjs https://your-server.example");
  process.exit(2);
}

const origin = new URL(configuredUrl);
assert.equal(origin.protocol, "https:", "The acceptance endpoint must use HTTPS.");
assert.equal(origin.pathname, "/", "Pass an HTTPS origin without a path.");
assert.ok(!["localhost", "127.0.0.1", "::1"].includes(origin.hostname), "The acceptance endpoint must be non-loopback.");

async function getJson(label, url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
  const body = await response.json();
  assert.ok(response.ok, `${label} returned HTTP ${response.status}`);
  return body;
}

const health = await getJson("public health", new URL("/api/v1/health", origin));
assert.deepEqual(health, { ok: true, protocol: 1 });

const dataDir = process.env.AD_SERVER_DATA_DIR || resolve(process.cwd(), ".another-dimension-server");
const localAccess = (await readFile(resolve(dataDir, "local-access-capability"), "utf8")).trim();
const localOrigin = new URL(process.env.AD_LOCAL_URL || `http://127.0.0.1:${process.env.AD_PORT || 1422}`);
const info = await getJson("private local info", new URL("/api/v1/info", localOrigin), {
  headers: { "x-ad-local-access": localAccess },
});
const inboxUrl = new URL(info.inboxUrl);
assert.equal(inboxUrl.protocol, "https:", "The signed invite would advertise a non-HTTPS inbox.");
assert.equal(inboxUrl.origin, origin.origin, "The advertised inbox origin does not match the checked server.");
assert.equal(info.externalSecure, true);

const envelope = `ADENV1.acceptance-${randomBytes(18).toString("base64url")}`;
const accepted = await getJson("public inbox delivery", inboxUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ envelope }),
});
const localHeaders = { "x-ad-local-access": localAccess };
const listed = await getJson("private inbox read", inboxUrl, { headers: localHeaders });
assert.ok(listed.items.some((item) => item.id === accepted.id && item.envelope === envelope), "The accepted envelope was not readable.");

const ackUrl = new URL(`${inboxUrl.pathname}/ack`, inboxUrl);
const acknowledged = await getJson("private inbox acknowledgement", ackUrl, {
  method: "POST",
  headers: { "content-type": "application/json", ...localHeaders },
  body: JSON.stringify({ ids: [accepted.id] }),
});
assert.equal(acknowledged.acknowledged, 1);

console.log(`trusted HTTPS endpoint passed: ${origin.origin} health -> delivery -> read -> ack`);

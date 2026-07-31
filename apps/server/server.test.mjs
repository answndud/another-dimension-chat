import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { connect } from "node:net";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServerConfig } from "../../scripts/configure_local_server.mjs";
import { createLocalServer, loadServerConfig } from "./server.mjs";

function call(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers } }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    if (body) req.end(JSON.stringify(body)); else req.end();
  });
}

function rawCall(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers: { "content-type": "application/json" } }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

function localHeaders(runtime) {
  return { "x-ad-local-access": runtime.localAccessCapability };
}

test("local server exposes health and a capability-scoped opaque inbox", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist") });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const health = await call(port, "GET", "/api/v1/health");
  assert.deepEqual(health.body, { ok: true, protocol: 1 });
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const envelope = "ADENVWEB3.test-envelope";
  const accepted = await call(port, "POST", inboxPath, { envelope });
  assert.equal(accepted.status, 202);
  assert.equal((await call(port, "GET", inboxPath)).status, 403);
  const listed = await call(port, "GET", inboxPath, undefined, localHeaders(runtime));
  assert.equal(listed.body.items.length, 1);
  assert.equal(listed.body.items[0].envelope, envelope);
  const duplicate = await call(port, "POST", inboxPath, { envelope });
  assert.equal(duplicate.status, 202);
  assert.equal((await call(port, "GET", inboxPath, undefined, localHeaders(runtime))).body.items.length, 1);
  assert.equal((await call(port, "POST", `${inboxPath}/ack`, { ids: [accepted.body.id] })).status, 403);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("relay-only mode never serves the browser bundle", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const distDir = await mkdtemp(join(tmpdir(), "another-dimension-dist-"));
  await writeFile(join(distDir, "index.html"), JSON.stringify({ malicious: true }));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const root = await call(port, "GET", "/");
  assert.equal(root.status, 404);
  assert.equal(root.body.error, "relay_only");
  const info = await call(port, "GET", "/api/v1/info", undefined, localHeaders(runtime));
  assert.equal(info.body.serveStatic, false);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
  await rm(distDir, { recursive: true, force: true });
});

test("static serving requires an explicit development opt-in", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const distDir = await mkdtemp(join(tmpdir(), "another-dimension-dist-"));
  await writeFile(join(distDir, "index.html"), JSON.stringify({ development: true }));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir, serveStatic: true });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const root = await call(port, "GET", "/");
  assert.equal(root.status, 200);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
  await rm(distDir, { recursive: true, force: true });
});

test("server applies security headers and rejects unlisted cross-origin API calls", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist"), publicUrl: "https://chat.example.test", corsOrigins: ["https://peer.example.test"] });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const health = await call(port, "GET", "/api/v1/health", undefined, { origin: "https://peer.example.test" });
  assert.equal(health.status, 200);
  assert.equal(health.headers["access-control-allow-origin"], "https://peer.example.test");
  assert.equal(health.headers["x-content-type-options"], "nosniff");
  assert.equal(health.headers["cross-origin-opener-policy"], "same-origin");
  assert.equal(health.headers["cross-origin-resource-policy"], "same-origin");
  assert.equal(health.headers["form-action"], "'self'");
  assert.equal(health.headers["strict-transport-security"], "max-age=31536000");
  const denied = await call(port, "GET", "/api/v1/health", undefined, { origin: "https://unexpected.example.test" });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error, "origin_not_allowed");
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("local access can rotate the inbox capability and invalidate the old URL", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist") });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const oldPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const rotated = await call(port, "POST", "/api/v1/inbox/rotate", {}, localHeaders(runtime));
  assert.equal(rotated.status, 200);
  const newPath = new URL(rotated.body.inboxUrl.replace(":0", `:${port}`)).pathname;
  assert.notEqual(newPath, oldPath);
  assert.equal((await call(port, "POST", oldPath, { envelope: "ADENVWEB1.old-capability" })).status, 404);
  assert.equal((await call(port, "POST", newPath, { envelope: "ADENVWEB1.new-capability" })).status, 202);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("local server requires TLS key and certificate as a pair", async () => {
  await assert.rejects(() => createLocalServer({ tlsKeyFile: "key.pem" }), /must be configured together/);
});

test("local server validates its advertised public origin", async () => {
  await assert.rejects(() => createLocalServer({ publicUrl: "https://example.test/chat" }), /must be an HTTP\(S\) origin/);
  await assert.rejects(() => createLocalServer({ publicUrl: "https://user@example.test" }), /must be an HTTP\(S\) origin/);
  await assert.rejects(() => createLocalServer({ bindHost: "0.0.0.0" }), /AD_PUBLIC_URL is required/);

  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({
    bindHost: "0.0.0.0",
    port: 0,
    publicUrl: "https://chat.example.test/",
    dataDir,
    distDir: join(dataDir, "missing-dist"),
  });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  assert.equal((await call(port, "GET", "/api/v1/info")).status, 403);
  const info = await call(port, "GET", "/api/v1/info", undefined, { "x-ad-local-access": runtime.localAccessCapability });
  assert.equal(info.body.publicOrigin, "https://chat.example.test");
  assert.equal(info.body.externalSecure, true);
  assert.equal(info.body.listenerTls, false);
  assert.equal(info.body.networkScope, "non-loopback");
  assert.equal(info.body.highRiskAllowed, false);
  assert.equal(info.body.transportMode, "direct-https-low-risk");
  assert.match(info.body.inboxUrl, /^https:\/\/chat\.example\.test\/api\/v1\/inbox\//);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("trusted proxy mode requires a public origin and local control endpoints are rate limited", async () => {
  await assert.rejects(() => createLocalServer({ trustProxy: true }), /requires an explicitly configured publicUrl/);
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, publicUrl: "https://relay.example.test" });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  for (let index = 0; index < 30; index += 1) assert.equal((await call(port, "GET", "/api/v1/info", undefined, localHeaders(runtime))).status, 200);
  assert.equal((await call(port, "GET", "/api/v1/info", undefined, localHeaders(runtime))).status, 429);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("untrusted forwarded headers cannot bypass local rate limits", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  for (let index = 0; index < 30; index += 1) {
    assert.equal((await call(port, "GET", "/api/v1/info", undefined, { "x-ad-local-access": runtime.localAccessCapability, "x-forwarded-for": `198.51.100.${index}` })).status, 200);
  }
  assert.equal((await call(port, "GET", "/api/v1/info", undefined, { "x-ad-local-access": runtime.localAccessCapability, "x-forwarded-for": "198.51.100.250" })).status, 429);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("relay rejects non-JSON envelope writes", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const response = await new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method: "POST", path: inboxPath, headers: { "content-type": "text/plain" } }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    req.end(JSON.stringify({ envelope: "ADENVWEB3.invalid-content-type" }));
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "content_type_not_allowed");
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("relay requires JSON content type for envelope and acknowledgement writes", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const response = await new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method: "POST", path: inboxPath }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    req.end(JSON.stringify({ envelope: "ADENVWEB3.missing-content-type" }));
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "content_type_not_allowed");
  const ack = await new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method: "POST", path: `${inboxPath}/ack`, headers: localHeaders(runtime) }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    req.end(JSON.stringify({ ids: [] }));
  });
  assert.equal(ack.status, 400);
  assert.equal(ack.body.error, "content_type_not_allowed");
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("guided server config validates modes and resolves stored paths", async () => {
  assert.deepEqual(
    buildServerConfig({ mode: "local", port: "1555", dataDir: "/tmp/ad-config-test" }),
    { bindHost: "127.0.0.1", port: 1555, dataDir: "/tmp/ad-config-test" },
  );
  assert.deepEqual(
    buildServerConfig({ mode: "reverse-proxy", publicUrl: "https://chat.example.test/", dataDir: "/tmp/ad-config-test" }),
    { bindHost: "127.0.0.1", port: 1422, dataDir: "/tmp/ad-config-test", publicUrl: "https://chat.example.test" },
  );
  assert.throws(() => buildServerConfig({ mode: "direct-tls", publicUrl: "https://chat.example.test" }), /requires both/);
  assert.throws(() => buildServerConfig({ mode: "reverse-proxy", publicUrl: "http://chat.example.test" }), /HTTPS origin/);

  const directory = await mkdtemp(join(tmpdir(), "another-dimension-config-"));
  const configFile = join(directory, "server-config.json");
  await writeFile(configFile, JSON.stringify({ bindHost: "127.0.0.1", port: 1777, dataDir: "state" }));
  assert.deepEqual(await loadServerConfig(configFile), {
    bindHost: "127.0.0.1",
    port: 1777,
    dataDir: join(directory, "state"),
  });
  await writeFile(configFile, JSON.stringify({ unexpected: true }));
  await assert.rejects(() => loadServerConfig(configFile), /Unknown server config field/);
  await rm(directory, { recursive: true, force: true });
});

test("local server rejects malformed inbox requests without storing them", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist") });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  assert.equal((await rawCall(port, "POST", inboxPath, "not-json")).status, 400);
  assert.equal((await call(port, "POST", `${inboxPath}/../inbox`, { envelope: "ADENVWEB1.invalid-path" })).status, 404);
  assert.equal((await call(port, "GET", inboxPath, undefined, localHeaders(runtime))).body.items.length, 0);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("local server recovers its bounded queue and purges expired envelopes", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const first = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist"), ttlMs: 1 });
  await new Promise((resolve) => first.server.listen(0, "127.0.0.1", resolve));
  const port = first.server.address().port;
  const inboxPath = new URL(first.inboxUrl.replace(":0", `:${port}`)).pathname;
  await call(port, "POST", inboxPath, { envelope: "ADENVWEB1.persisted" });
  await first.server.close();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist"), ttlMs: 1 });
  await new Promise((resolve) => second.server.listen(0, "127.0.0.1", resolve));
  const secondPort = second.server.address().port;
  const secondPath = new URL(second.inboxUrl.replace(":0", `:${secondPort}`)).pathname;
  assert.equal((await call(secondPort, "GET", secondPath, undefined, localHeaders(second))).body.items.length, 0);
  await second.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("ack reports only envelopes that were actually removed", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist") });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const accepted = await call(port, "POST", inboxPath, { envelope: "ADENVWEB1.ack-count" });
  assert.equal((await call(port, "POST", `${inboxPath}/ack`, { ids: [accepted.body.id, "missing"] }, localHeaders(runtime))).body.acknowledged, 1);
  assert.equal((await call(port, "POST", `${inboxPath}/ack`, { ids: [accepted.body.id] }, localHeaders(runtime))).body.acknowledged, 0);
  assert.equal((await call(port, "POST", `${inboxPath}/ack`, { ids: Array.from({ length: 257 }, (_, index) => String(index)) }, localHeaders(runtime))).status, 400);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("relay refuses new envelopes when the bounded queue is full", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  await writeFile(join(dataDir, "inbox.json"), JSON.stringify(Array.from({ length: 256 }, (_, index) => ({ id: `existing-${index}`, envelope: `ADENVWEB1.existing-${index}`, receivedAt: Date.now() }))));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist") });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const response = await call(port, "POST", inboxPath, { envelope: "ADENVWEB1.queue-full" });
  assert.equal(response.status, 429);
  assert.equal(response.body.error, "queue_full");
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("capability records rotate after expiry and preserve private file permissions", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const oldToken = "expired-capability-token";
  await writeFile(join(dataDir, "inbox-capability"), JSON.stringify({
    format: "another-dimension-capability", version: 1, token: oldToken, scope: "inbox-write", issuedAt: 1, expiresAt: 1,
  }));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist") });
  assert.notEqual(runtime.inboxCapability, oldToken);
  const capabilityRecord = JSON.parse(await readFile(join(dataDir, "inbox-capability"), "utf8"));
  assert.equal(capabilityRecord.scope, "inbox-write");
  assert.ok(capabilityRecord.expiresAt > Date.now());
  assert.equal((await stat(dataDir)).mode & 0o777, 0o700);
  assert.equal((await stat(join(dataDir, "inbox-capability"))).mode & 0o777, 0o600);
  assert.equal((await stat(join(dataDir, "local-access-capability"))).mode & 0o777, 0o600);
  assert.equal((await stat(join(dataDir, "local-ui-url"))).mode & 0o777, 0o600);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("relay refuses symlinked data directories and sensitive files", async () => {
  const parent = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const target = join(parent, "target");
  const linked = join(parent, "linked");
  await mkdir(target, { recursive: true });
  await symlink(target, linked);
  await assert.rejects(() => createLocalServer({ port: 0, dataDir: linked }), /real directory, not a symlink/);
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const capabilityTarget = join(dataDir, "capability-target");
  await writeFile(capabilityTarget, "secret");
  await rm(join(dataDir, "inbox-capability"), { force: true });
  await symlink(capabilityTarget, join(dataDir, "inbox-capability"));
  await assert.rejects(() => createLocalServer({ port: 0, dataDir }), /not a regular file/);
  await rm(parent, { recursive: true, force: true });
  await rm(dataDir, { recursive: true, force: true });
});

test("relay refuses corrupt queue state and recovers a valid interrupted queue write", async () => {
  const corruptDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  await writeFile(join(corruptDir, "inbox.json"), "not-json");
  await assert.rejects(() => createLocalServer({ port: 0, dataDir: corruptDir }), /inbox file is corrupt/);
  await rm(corruptDir, { recursive: true, force: true });

  const recoveryDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  await writeFile(join(recoveryDir, "inbox.json.tmp"), JSON.stringify([{ id: "recovered", envelope: "ADENVWEB1.recovered", receivedAt: Date.now() }]));
  const runtime = await createLocalServer({ port: 0, dataDir: recoveryDir, distDir: join(recoveryDir, "missing-dist") });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const items = await call(port, "GET", inboxPath, undefined, localHeaders(runtime));
  assert.deepEqual(items.body.items.map((item) => item.id), ["recovered"]);
  await runtime.server.close();
  await rm(recoveryDir, { recursive: true, force: true });
});

test("relay bounds slow client settings and closes an incomplete body", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, headersTimeoutMs: 80, requestTimeoutMs: 120, keepAliveTimeoutMs: 80 });
  assert.equal(runtime.server.headersTimeout, 80);
  assert.equal(runtime.server.requestTimeout, 120);
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const result = await new Promise((resolve, reject) => {
    const socket = connect(port, "127.0.0.1");
    let output = "";
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("slow client was not closed within the bounded timeout")); }, 1_000);
    socket.on("connect", () => socket.write("POST /api/v1/inbox/slow HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 100\r\nContent-Type: application/json\r\n\r\n{"));
    socket.on("data", (chunk) => { output += chunk.toString(); });
    socket.on("close", () => { clearTimeout(timer); resolve(output); });
    socket.on("error", (error) => { if (error.code !== "ECONNRESET") reject(error); });
  });
  assert.ok(result === "" || /408|Request Timeout|HTTP\/1\.1/.test(result));
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

test("relay fails queue writes safely when the data directory becomes read-only", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const failingWriter = async (file, contents) => {
    if (file.endsWith("inbox.json")) throw new Error("disk_full");
    await writeFile(file, contents, { mode: 0o600 });
  };
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist"), privateFileWriter: failingWriter });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const response = await call(port, "POST", inboxPath, { envelope: "ADENVWEB1.read-only" });
  assert.equal(response.status, 400);
  assert.equal(response.body.accepted, false);
  assert.equal((await call(port, "GET", inboxPath, undefined, localHeaders(runtime))).body.items.length, 0);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

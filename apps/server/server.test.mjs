import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
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

test("server applies security headers and rejects unlisted cross-origin API calls", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist"), publicUrl: "https://chat.example.test", corsOrigins: ["https://peer.example.test"] });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const health = await call(port, "GET", "/api/v1/health", undefined, { origin: "https://peer.example.test" });
  assert.equal(health.status, 200);
  assert.equal(health.headers["access-control-allow-origin"], "https://peer.example.test");
  assert.equal(health.headers["x-content-type-options"], "nosniff");
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
  assert.equal((await call(port, "POST", oldPath, { envelope: "ADENVWEB1.old-capability" })).status, 405);
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
  assert.match(info.body.inboxUrl, /^https:\/\/chat\.example\.test\/api\/v1\/inbox\//);
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
  assert.equal((await call(port, "POST", `${inboxPath}/../inbox`, { envelope: "ADENVWEB1.invalid-path" })).status, 405);
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

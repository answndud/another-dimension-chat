import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalServer } from "../apps/server/server.mjs";

function call(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers } }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    if (body) req.end(JSON.stringify(body)); else req.end();
  });
}

const root = await mkdtemp(join(tmpdir(), "another-dimension-smoke-"));
const serverA = await createLocalServer({ port: 0, dataDir: join(root, "a"), distDir: join(root, "missing-a") });
let serverB = await createLocalServer({ port: 0, dataDir: join(root, "b"), distDir: join(root, "missing-b") });
await Promise.all([
  new Promise((resolve) => serverA.server.listen(0, "127.0.0.1", resolve)),
  new Promise((resolve) => serverB.server.listen(0, "127.0.0.1", resolve)),
]);

try {
  const portA = serverA.server.address().port;
  let portB = serverB.server.address().port;
  let pathB = new URL(serverB.inboxUrl.replace(":0", `:${portB}`)).pathname;
  assert.deepEqual((await call(portA, "GET", "/api/v1/health")).body, { ok: true, protocol: 1 });
  assert.deepEqual((await call(portB, "GET", "/api/v1/health")).body, { ok: true, protocol: 1 });
  const envelope = "ADENVWEB1.smoke-opaque-envelope";
  const accepted = await call(portB, "POST", pathB, { envelope });
  assert.equal(accepted.status, 202);
  assert.equal((await call(portB, "GET", pathB)).status, 403);
  assert.equal((await call(portB, "GET", pathB, undefined, { "x-ad-local-access": serverB.localAccessCapability })).body.items.length, 1);
  await serverB.server.close();
  serverB = await createLocalServer({ port: 0, dataDir: join(root, "b"), distDir: join(root, "missing-b") });
  await new Promise((resolve) => serverB.server.listen(0, "127.0.0.1", resolve));
  const restartedPortB = serverB.server.address().port;
  const restartedPathB = new URL(serverB.inboxUrl.replace(":0", `:${restartedPortB}`)).pathname;
  assert.notEqual(restartedPortB, portB);
  const localHeaders = { "x-ad-local-access": serverB.localAccessCapability };
  assert.equal((await call(restartedPortB, "GET", restartedPathB, undefined, localHeaders)).body.items.length, 1);
  const duplicate = await call(restartedPortB, "POST", restartedPathB, { envelope });
  assert.equal(duplicate.status, 202);
  assert.equal((await call(restartedPortB, "GET", restartedPathB, undefined, localHeaders)).body.items.length, 1);
  assert.equal((await call(restartedPortB, "POST", `${restartedPathB}/ack`, { ids: [accepted.body.id] }, localHeaders)).body.acknowledged, 1);
  assert.equal((await call(restartedPortB, "GET", restartedPathB, undefined, localHeaders)).body.items.length, 0);
  console.log("user-owned server smoke passed: health -> delivery -> restart -> duplicate rejection -> ack -> empty inbox");
} finally {
  await Promise.all([serverA.server.close(), serverB.server.close()]);
  await rm(root, { recursive: true, force: true });
}

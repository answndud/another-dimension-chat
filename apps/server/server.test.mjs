import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { request } from "node:http";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalServer } from "./server.mjs";

function call(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers: body ? { "content-type": "application/json" } : {} }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on("error", reject);
    if (body) req.end(JSON.stringify(body)); else req.end();
  });
}

test("local server exposes health and a capability-scoped opaque inbox", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-server-"));
  const runtime = await createLocalServer({ port: 0, dataDir, distDir: join(dataDir, "missing-dist") });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const port = runtime.server.address().port;
  const health = await call(port, "GET", "/api/v1/health");
  assert.deepEqual(health.body, { ok: true, protocol: 1 });
  const inboxPath = new URL(runtime.inboxUrl.replace(":0", `:${port}`)).pathname;
  const envelope = "ADENVWEB1.test-envelope";
  const accepted = await call(port, "POST", inboxPath, { envelope });
  assert.equal(accepted.status, 202);
  const listed = await call(port, "GET", inboxPath);
  assert.equal(listed.body.items.length, 1);
  assert.equal(listed.body.items[0].envelope, envelope);
  const duplicate = await call(port, "POST", inboxPath, { envelope });
  assert.equal(duplicate.status, 202);
  assert.equal((await call(port, "GET", inboxPath)).body.items.length, 1);
  await runtime.server.close();
  await rm(dataDir, { recursive: true, force: true });
});

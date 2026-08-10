import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const projectDir = new URL("..", import.meta.url).pathname;
const root = await mkdtemp(join(tmpdir(), "another-dimension-boundary-negative-"));
try {
await mkdir(join(root, "apps/web/dist"), { recursive: true });
await mkdir(join(root, "apps/server"), { recursive: true });
await mkdir(join(root, "reference"), { recursive: true });
await cp(new URL("../reference/product_boundary.json", import.meta.url), join(root, "reference/product_boundary.json"));
await cp(new URL("../reference/PRODUCT_BOUNDARY.md", import.meta.url), join(root, "reference/PRODUCT_BOUNDARY.md"));
await cp(new URL("../SECURITY.md", import.meta.url), join(root, "SECURITY.md"));
await writeFile(join(root, "apps/web/package.json"), "{}\n");
await writeFile(join(root, "apps/web/dist/index.html"), "<!doctype html>\n");
await writeFile(join(root, "apps/server/server.mjs"), "// fixture\n");
await mkdir(join(root, "apps/desktop-tauri"), { recursive: true });
await writeFile(join(root, "apps/desktop-tauri/legacy.txt"), "legacy\n");

const result = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [join(projectDir, "scripts/verify_product_boundary.mjs"), root, "--release"], { cwd: projectDir, stdio: "pipe" });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("error", reject);
  child.on("close", (code) => resolve({ code, output }));
});
assert.notEqual(result.code, 0);
assert.match(result.output, /legacy product files leaked|legacy product surface/i);
console.log("product boundary negative acceptance passed: legacy release surface rejected");
} finally {
  await rm(root, { recursive: true, force: true });
}

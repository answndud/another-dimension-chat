import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  closeSync,
  ftruncateSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { checkStorageBudget, measureStorageBudget, removeGeneratedArtifacts } from "./storage-budget.mjs";

function makeSandbox() {
  return mkdtempSync(join(tmpdir(), "ad-storage-budget-"));
}

function makeRepoFixture(root) {
  const repoRoot = root;
  const desktopRoot = join(repoRoot, "apps/desktop-tauri");
  mkdirSync(join(repoRoot, ".git"), { recursive: true });
  mkdirSync(join(repoRoot, "node_modules"), { recursive: true });
  mkdirSync(join(desktopRoot, "node_modules"), { recursive: true });
  mkdirSync(join(desktopRoot, "src-tauri/binaries"), { recursive: true });
  mkdirSync(join(repoRoot, "target"), { recursive: true });
  mkdirSync(join(desktopRoot, "src-tauri/target"), { recursive: true });
  mkdirSync(join(repoRoot, ".build-cache"), { recursive: true });
  mkdirSync(join(desktopRoot, "dist"), { recursive: true });
  mkdirSync(join(desktopRoot, ".vite"), { recursive: true });
  writeFileSync(join(repoRoot, "tracked.txt"), "tracked-source", "utf8");
  writeFileSync(join(repoRoot, "untracked.txt"), "ignored", "utf8");
  writeFileSync(join(repoRoot, "node_modules/dep.js"), "dep", "utf8");
  writeFileSync(join(desktopRoot, "node_modules/desktop-dep.js"), "desktop-dep", "utf8");
  writeFileSync(join(desktopRoot, "src-tauri/binaries/another-dimension-engine-test"), "sidecar", "utf8");
  writeFileSync(join(repoRoot, ".git", "HEAD"), "ref: refs/heads/main", "utf8");
  return { repoRoot, desktopRoot };
}

test("removeGeneratedArtifacts only deletes allowlisted generated paths", () => {
  const root = makeSandbox();
  const { repoRoot, desktopRoot } = makeRepoFixture(root);
  const docsDir = join(repoRoot, "docs");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, "keep.txt"), "keep", "utf8");

  const removed = removeGeneratedArtifacts(root);
  assert.ok(removed.includes(join(repoRoot, "target")));
  assert.ok(removed.includes(join(desktopRoot, "src-tauri/target")));
  assert.ok(removed.includes(join(repoRoot, ".build-cache")));
  assert.ok(removed.includes(join(desktopRoot, "dist")));
  assert.equal(existsSync(join(repoRoot, "target")), false);
  assert.equal(existsSync(join(desktopRoot, "src-tauri/target")), false);
  assert.equal(existsSync(join(repoRoot, ".build-cache")), false);
  assert.equal(existsSync(join(desktopRoot, "dist")), false);
  assert.equal(existsSync(join(desktopRoot, ".vite")), false);
  assert.equal(existsSync(join(desktopRoot, "src-tauri/binaries/another-dimension-engine-test")), false);
  assert.equal(existsSync(join(docsDir, "keep.txt")), true);

  rmSync(root, { recursive: true, force: true });
});

test("checkStorageBudget rejects forbidden generated paths and reports categories", () => {
  const root = makeSandbox();
  makeRepoFixture(root);

  try {
    checkStorageBudget({ repoRoot: root, budgetBytes: 1024 * 1024 * 1024 });
    assert.fail("expected forbidden generated paths to fail");
  } catch (error) {
    assert.match(String(error), /forbidden-generated-paths-present/);
    assert.match(error.report ?? "", /forbidden_generated_paths=/);
  }

  const stats = measureStorageBudget(root);
  assert.ok(stats.sourceBytes > 0);
  assert.ok(stats.gitBytes > 0);
  assert.ok(stats.dependenciesBytes > 0);
  assert.ok(stats.generatedBytes > 0);
  assert.ok(stats.checkoutBytes > 0);

  rmSync(root, { recursive: true, force: true });
});

test("checkStorageBudget fails when checkout budget exceeds cap", () => {
  const root = makeSandbox();
  const repoRoot = root;
  const desktopRoot = join(repoRoot, "apps/desktop-tauri");
  mkdirSync(join(repoRoot, ".git"), { recursive: true });
  writeFileSync(join(repoRoot, "tracked.txt"), "tracked-source", "utf8");
  mkdirSync(join(repoRoot, "node_modules"), { recursive: true });
  writeFileSync(join(repoRoot, "node_modules/dep.js"), "dep", "utf8");
  mkdirSync(join(desktopRoot, "node_modules"), { recursive: true });
  writeFileSync(join(desktopRoot, "node_modules/desktop-dep.js"), "desktop-dep", "utf8");
  const largeFile = join(repoRoot, "large.bin");
  const fd = openSync(largeFile, "w");
  try {
    ftruncateSync(fd, 2 * 1024 * 1024);
  } finally {
    closeSync(fd);
  }
  rmSync(join(desktopRoot, "src-tauri/target"), { recursive: true, force: true });
  rmSync(join(repoRoot, ".build-cache"), { recursive: true, force: true });
  rmSync(join(desktopRoot, "dist"), { recursive: true, force: true });
  rmSync(join(desktopRoot, ".vite"), { recursive: true, force: true });
  rmSync(join(repoRoot, "target"), { recursive: true, force: true });

  assert.throws(() => checkStorageBudget({ repoRoot: root, budgetBytes: 1024 * 1024 }), /checkout-budget-exceeded/);

  rmSync(root, { recursive: true, force: true });
});

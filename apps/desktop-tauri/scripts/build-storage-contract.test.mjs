import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

function runCargoTree(args) {
  return spawnSync("cargo", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertNoForbiddenFeatures(output, label) {
  assert.doesNotMatch(
    output,
    /legacy-embedded-runtime|full-runtime|arti-manual-bootstrap|arti-bridge-client/,
    `${label} exposed forbidden public build features`,
  );
}

function assertProfileSettings(path, expected) {
  const body = readFileSync(resolve(repoRoot, path), "utf8");
  for (const text of expected) {
    assert.match(body, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

function assertFileContains(path, text) {
  const body = readFileSync(resolve(repoRoot, path), "utf8");
  assert.match(body, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

function assertFileDoesNotContain(path, text) {
  const body = readFileSync(resolve(repoRoot, path), "utf8");
  assert.doesNotMatch(body, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

test("release profiles are pinned for public build targets", () => {
  assertProfileSettings("Cargo.toml", [
    "[profile.release]",
    "incremental = false",
    "debug = 1",
    'strip = "symbols"',
    'panic = "abort"',
    "codegen-units = 1",
  ]);
  assertProfileSettings("apps/desktop-tauri/src-tauri/Cargo.toml", [
    "[profile.release]",
    "incremental = false",
    "debug = 1",
    'strip = "symbols"',
    'panic = "abort"',
    "codegen-units = 1",
  ]);
});

test("public shell cargo tree excludes legacy runtime graph", () => {
  assertFileContains("apps/desktop-tauri/src-tauri/tauri.conf.json", '"targets": ["dmg"]');
  assertFileContains("apps/desktop-tauri/package.json", "node scripts/run-clean-build.mjs node scripts/with-cargo-target.mjs tauri build");
  assertFileContains("apps/desktop-tauri/package.json", "VITE_AD_BUILD_CHANNEL=beta-onion node scripts/run-clean-build.mjs node scripts/prepare-engine-sidecar.mjs --release --manual-e2ee-runtime --tauri-build -- tauri build --config src-tauri/tauri.sidecar.conf.json");
  assertFileContains("apps/desktop-tauri/package.json", "tauri:build:macos-dmg:beta-onion");
  assertFileContains("apps/desktop-tauri/package.json", "--bundles dmg");
  assertFileDoesNotContain("apps/desktop-tauri/package.json", "verify:warm");
  assertFileDoesNotContain("apps/desktop-tauri/package.json", "verify:cold");
  assertFileDoesNotContain("apps/desktop-tauri/package.json", "legacy:tauri");
  assertFileDoesNotContain("scripts/smoke_tauri_two_profile.sh", ".build-cache");
  assertFileDoesNotContain("scripts/smoke_tauri_two_profile.sh", "Library/Caches/another-dimension");

  const result = runCargoTree([
    "tree",
    "--manifest-path",
    "apps/desktop-tauri/src-tauri/Cargo.toml",
    "--no-default-features",
    "--features",
    "public-shell",
    "-e",
    "features",
    "--depth",
    "1",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assertNoForbiddenFeatures(result.stdout, "public shell tree");
});

test("manual e2ee engine cargo tree excludes core and arti bridge graph", () => {
  const result = runCargoTree([
    "tree",
    "-p",
    "another-dimension-engine",
    "--features",
    "manual-e2ee-runtime",
    "-e",
    "features",
    "--depth",
    "1",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assertNoForbiddenFeatures(result.stdout, "manual e2ee engine tree");
  assert.doesNotMatch(
    result.stdout,
    /another-dimension-core|another-dimension-transport.*arti-manual-bootstrap|another-dimension-transport.*arti-bridge-client/,
  );
});

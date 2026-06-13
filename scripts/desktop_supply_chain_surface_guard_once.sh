#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "FAIL $*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_ignored_path() {
  local path="$1"
  git -C "$ROOT_DIR" check-ignore -q "$path" || fail "path is not ignored: $path"
}

require_not_tracked() {
  local path="$1"
  if git -C "$ROOT_DIR" ls-files "$path" | grep -q .; then
    fail "generated/private path is tracked: $path"
  fi
}

require_not_staged_pattern() {
  local pattern="$1"
  if git -C "$ROOT_DIR" diff --cached --name-only | grep -Eq "$pattern"; then
    fail "private docs, AGENTS.md, or generated artifact path is staged"
  fi
}

require_text() {
  local file="$1"
  local expected="$2"
  grep -Fq -- "$expected" "$file" || fail "missing expected text in $file: $expected"
}

check_tauri_surface() {
  node --input-type=module - "$ROOT_DIR" <<'NODE'
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
const config = JSON.parse(readFileSync(join(root, "apps/desktop-tauri/src-tauri/tauri.conf.json"), "utf8"));
const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};

if (config.app?.security?.csp !== "default-src 'self'; style-src 'self' 'unsafe-inline'") {
  fail("unexpected tauri CSP");
}
if (JSON.stringify(config.bundle?.resources ?? []) !== "[]") {
  fail("tauri bundled resources must stay empty");
}
if (config.bundle?.macOS?.hardenedRuntime !== true) {
  fail("macOS hardenedRuntime must remain true");
}
if (config.bundle?.macOS?.entitlements !== "Entitlements.plist") {
  fail("macOS entitlements file must be explicit");
}
if (config.bundle?.macOS?.exceptionDomain !== null) {
  fail("macOS exceptionDomain must stay null");
}
NODE

  require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/Entitlements.plist" "<dict/>"
  if [ -d "$ROOT_DIR/apps/desktop-tauri/src-tauri/capabilities" ]; then
    find "$ROOT_DIR/apps/desktop-tauri/src-tauri/capabilities" -type f -print |
      while IFS= read -r capability; do
        require_text "$capability" "\"identifier\""
      done
  fi

  echo "tauri_csp=minimal-self-and-inline-style-only"
  echo "tauri_bundle_resources=empty"
  echo "tauri_macos_entitlements=empty-dict"
}

check_dependency_allowlist() {
  node --input-type=module - "$ROOT_DIR" <<'NODE'
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
const pkg = JSON.parse(readFileSync(join(root, "apps/desktop-tauri/package.json"), "utf8"));
const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};
const dependencyNames = Object.keys(pkg.dependencies ?? {}).sort();
const devDependencyNames = Object.keys(pkg.devDependencies ?? {}).sort();
if (dependencyNames.join(",") !== "@tauri-apps/api") {
  fail(`unexpected runtime dependencies: ${dependencyNames.join(",")}`);
}
if (devDependencyNames.join(",") !== "@tauri-apps/cli,vite") {
  fail(`unexpected dev dependencies: ${devDependencyNames.join(",")}`);
}
NODE

  require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/Cargo.toml" 'tauri = { version = "2", features = [] }'
  require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/Cargo.toml" 'tauri-build = { version = "2", features = [] }'
  require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/Cargo.toml" 'rustls = { version = "0.23.40", default-features = false, features = ["ring"] }'
  require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/Cargo.toml" 'tokio = { version = "1.52.3", default-features = false, features = ["macros", "time"] }'

  echo "npm_runtime_dependency_allowlist=@tauri-apps/api"
  echo "npm_dev_dependency_allowlist=@tauri-apps/cli#vite"
  echo "tauri_rust_features=empty"
  echo "rustls_default_features=false"
  echo "tokio_default_features=false"
}

check_lockfiles_and_artifacts() {
  require_file "$ROOT_DIR/Cargo.lock"
  require_file "$ROOT_DIR/apps/desktop-tauri/src-tauri/Cargo.lock"
  require_file "$ROOT_DIR/apps/desktop-tauri/package-lock.json"

  require_ignored_path "docs/"
  require_ignored_path "apps/desktop-tauri/public-release/"
  require_ignored_path "apps/desktop-tauri/beta-artifacts/"
  require_ignored_path "public-release/"
  require_ignored_path "beta-artifacts/"
  require_not_tracked "docs"
  require_not_tracked "apps/desktop-tauri/public-release"
  require_not_tracked "apps/desktop-tauri/beta-artifacts"
  require_not_tracked "public-release"
  require_not_tracked "beta-artifacts"
  require_not_staged_pattern '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'

  (
    cd "$ROOT_DIR"
    shasum -a 256 Cargo.lock apps/desktop-tauri/src-tauri/Cargo.lock apps/desktop-tauri/package-lock.json
  )

  echo "private_docs_tracked=false"
  echo "generated_artifacts_tracked=false"
  echo "private_or_generated_paths_staged=false"
  echo "dependency_lockfiles_present=3"
}

echo "preflight=desktop-supply-chain-surface-guard"
echo "scope=source-only-no-artifact-generation"
check_tauri_surface
check_dependency_allowlist
check_lockfiles_and_artifacts
echo "status=desktop-supply-chain-surface-guard-ready"

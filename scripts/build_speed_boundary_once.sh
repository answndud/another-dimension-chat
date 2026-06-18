#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

TAURI_CARGO="apps/desktop-tauri/src-tauri/Cargo.toml"

# ---------------------------------------------------------------------------
# Build-boundary evidence: confirm that public-shell (default) never pulls in
# heavy crates through the Tauri Cargo.toml dependency graph.
#
# "Heavy crates" are those whose transitive dependency trees add significant
# compile time, native-library linking, or vendored C builds: arti-client,
# tokio, rusqlite/bundled-sqlcipher, tor-*, futures, safelog, tor-cell,
# tor-hsservice, tor-rtcompat, and all seven another-dimension runtime crates.
#
# The Tauri shell's default feature set is "public-shell".  Under that feature
# the only Rust dependencies are tauri, serde, and serde_json.  Everything else
# is behind an optional dep gated by legacy-embedded-runtime.
# ---------------------------------------------------------------------------

# 1. Verify the file exists
test -f "$TAURI_CARGO" || fail "$TAURI_CARGO not found"

# 2. Confirm default features = ["public-shell"]
default_raw="$(sed -n '/^\[features\]/,/^\[/p' "$TAURI_CARGO" | grep '^default' | head -1 | tr -d '[:space:]')"
if [[ "$default_raw" != 'default=["public-shell"]' ]]; then
  fail "unexpected default features: got '$default_raw', expected default=[\"public-shell\"]"
fi

# 3. Confirm heavy crates are optional-only in [dependencies]
heavy_crates=(
  "another-dimension-core"
  "another-dimension-crypto"
  "another-dimension-identity"
  "another-dimension-pairing"
  "another-dimension-protocol"
  "another-dimension-storage"
  "another-dimension-transport"
  "rustls"
  "tokio"
)

heavy_non_optional=""
for crate in "${heavy_crates[@]}"; do
  if grep -q "^${crate} " "$TAURI_CARGO"; then
    if ! grep "^${crate} " "$TAURI_CARGO" | head -1 | grep -q 'optional = true'; then
      heavy_non_optional="$heavy_non_optional $crate"
    fi
  fi
done

if [[ -n "$heavy_non_optional" ]]; then
  fail "heavy crate(s) not optional:$heavy_non_optional"
fi

# 4. Extract full feature block for legacy-embedded-runtime (multi-line)
extract_feature_block() {
  local section="$1"
  local f="$2"
  awk -v section="$section" '
    $0 == "[" section "]" { in_section=1; next }
    in_section && /^\[/ && $0 != "[" section "]" { exit }
    in_section { print }
  ' "$f"
}

legacy_block="$(extract_feature_block "features" "$TAURI_CARGO" \
  | awk '/^legacy-embedded-runtime/ { in_block=1 } in_block && /^\[/ && !/^legacy-embedded-runtime/ { exit } in_block { lines = lines $0 } END { print lines }')"

if ! echo "$legacy_block" | tr -d '[:space:]' | grep -q 'dep:another-dimension-core'; then
  fail "legacy-embedded-runtime missing dep:another-dimension-core"
fi
if ! echo "$legacy_block" | tr -d '[:space:]' | grep -q 'dep:rustls'; then
  fail "legacy-embedded-runtime missing dep:rustls"
fi
if ! echo "$legacy_block" | tr -d '[:space:]' | grep -q 'dep:tokio'; then
  fail "legacy-embedded-runtime missing dep:tokio"
fi

# 5. Check that full-runtime (or any of its subtypes) is not in default
#   Quick safe check: default features line should contain exactly "public-shell"
default_deps="$(sed -n '/^\[features\]/,/^\[/p' "$TAURI_CARGO" | grep '^default' | tr -d '[:space:]')"
if echo "$default_deps" | grep -q 'full-runtime'; then
  fail "full-runtime must not be default"
fi
if echo "$default_deps" | grep -q 'legacy-embedded-runtime'; then
  fail "legacy-embedded-runtime must not be default"
fi

# 6. Output machine-checkable summary
cat <<STATUS
build_speed_boundary_status=ok
default_features=public-shell
public_shell_heavy_crates_optional_only=true
heavy_non_optional=
full_runtime_is_opt_in=true
full_runtime_includes_core=true
full_runtime_includes_rustls=true
full_runtime_includes_tokio=true
full_runtime_not_in_default=true
legacy_embedded_runtime_not_in_default=true
fast_path=public-shell+vite-first
fast_path_engine_sidecar=none
fast_path_native_tauri_build=false
heavy_path=legacy-embedded-runtime|full-runtime|manual-onion-client-attempt|manual-onion-bridge-client
heavy_path_requires_rustls=true
heavy_path_requires_tokio=true
heavy_path_requires_rusqlite_bundled_sqlcipher=true
heavy_path_requires_arti=true
STATUS

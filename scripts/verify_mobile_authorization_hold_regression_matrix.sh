#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
MATRIX="$ROOT_DIR/apps/mobile/ffi/authorization_hold_regression_matrix.json"
HOLD="$ROOT_DIR/apps/mobile/ffi/callable_ffi_authorization_hold.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile authorization hold regression matrix file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile authorization hold regression matrix text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile authorization hold regression matrix text in $file: $text" >&2
    exit 1
  fi
}

for file in "$CONTRACT" "$MATRIX" "$HOLD" "$FFI_README" "$HANDOFF"; do
  require_file "$file"
done

node - "$CONTRACT" "$MATRIX" "$HOLD" "$ROOT_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const [contractPath, matrixPath, holdPath, rootDir] = process.argv.slice(2);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

function walk(dir) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walk(full));
    } else {
      entries.push(full);
    }
  }
  return entries;
}

assert(contract.authorization_hold_regression_matrix_verified === true, "contract regression matrix flag is not true");
assert(contract.authorization_hold_regression_matrix_file === "apps/mobile/ffi/authorization_hold_regression_matrix.json", "contract regression matrix file mismatch");
assert(matrix.authorization_hold_regression_matrix_verified === true, "matrix verified flag is not true");
assert(matrix.owner_authorization_for_callable_ffi === false, "matrix owner authorization is not false");
assert(matrix.explicit_callable_ffi_implementation_request === false, "matrix implementation request is not false");
assert(hold.owner_authorization_for_callable_ffi === false, "hold owner authorization is not false");
assert(hold.explicit_callable_ffi_implementation_request === false, "hold implementation request is not false");

for (const root of matrix.source_roots) {
  assert(fs.existsSync(path.join(rootDir, root)), `matrix source root missing: ${root}`);
}

const sourceFiles = matrix.source_roots.flatMap((root) => walk(path.join(rootDir, root)));
const rel = (file) => path.relative(rootDir, file).split(path.sep).join("/");

for (const file of sourceFiles) {
  const relative = `/${rel(file)}`;
  for (const ext of matrix.forbidden_file_extensions) {
    assert(!relative.endsWith(ext), `forbidden mobile artifact extension found: ${rel(file)}`);
  }
  for (const fragment of matrix.forbidden_path_fragments) {
    assert(!relative.includes(fragment), `forbidden mobile path fragment found: ${rel(file)}`);
  }
}

const androidFiles = walk(path.join(rootDir, "apps/mobile/android")).filter((file) =>
  /\.(kt|kts|java|xml)$/.test(file)
);
const iosFiles = walk(path.join(rootDir, "apps/mobile/ios")).filter((file) =>
  /\.(swift|m|mm|h|plist|pbxproj)$/.test(file)
);

for (const file of androidFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of matrix.forbidden_android_source_patterns) {
    assert(!text.includes(pattern), `forbidden Android source pattern ${pattern} found in ${rel(file)}`);
  }
}

for (const file of iosFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of matrix.forbidden_ios_source_patterns) {
    assert(!text.includes(pattern), `forbidden iOS source pattern ${pattern} found in ${rel(file)}`);
  }
}
NODE

require_text "$CONTRACT" '"authorization_hold_regression_matrix_verified": true'
require_text "$CONTRACT" '"authorization_hold_regression_matrix_file": "apps/mobile/ffi/authorization_hold_regression_matrix.json"'
require_text "$MATRIX" '"status": "source-boundary-authorization-hold-regression-matrix"'
require_text "$MATRIX" '"owner_authorization_for_callable_ffi": false'
require_text "$MATRIX" '"explicit_callable_ffi_implementation_request": false'
require_text "$FFI_README" "Authorization Hold Regression Matrix"
require_text "$FFI_README" "authorization_hold_regression_matrix.json"
require_text "$FFI_README" "forbidden file extensions absent"
require_text "$FFI_README" "forbidden path fragments absent"
require_text "$FFI_README" "forbidden Android source patterns absent"
require_text "$FFI_README" "forbidden iOS source patterns absent"
require_text "$FFI_README" "forbidden claim patterns absent"
require_text "$HANDOFF" "scripts/verify_mobile_authorization_hold_regression_matrix.sh"

for output in \
  "forbidden_file_extensions=absent" \
  "forbidden_path_fragments=absent" \
  "forbidden_android_source_patterns=absent" \
  "forbidden_ios_source_patterns=absent" \
  "forbidden_claim_patterns=absent"; do
  require_text "$MATRIX" "$output"
done

reject_text "$CONTRACT" '"owner_authorization_for_callable_ffi": true'
reject_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": true'
reject_text "$CONTRACT" '"callable_ffi_implemented": true'
reject_text "$CONTRACT" '"generated_bindings_claimed": true'
reject_text "$CONTRACT" '"mobile_readiness_claimed": true'
reject_text "$CONTRACT" '"security_ready_claimed": true'
reject_text "$HOLD" '"owner_authorization_for_callable_ffi": true'
reject_text "$HOLD" '"explicit_callable_ffi_implementation_request": true'

printf 'status=mobile-authorization-hold-regression-matrix-verified\n'
printf 'authorization_hold_regression_matrix_verified=true\n'
printf 'forbidden_file_extensions=absent\n'
printf 'forbidden_path_fragments=absent\n'
printf 'forbidden_android_source_patterns=absent\n'
printf 'forbidden_ios_source_patterns=absent\n'
printf 'forbidden_claim_patterns=absent\n'
printf 'mobile_readiness_claim=false\n'
printf 'security_ready_claim=false\n'

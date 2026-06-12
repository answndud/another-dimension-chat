#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local name="$1"
  shift
  echo "step=$name"
  "$@"
}

require_text() {
  local file="$1"
  local expected="$2"
  if ! grep -Fq -- "$expected" "$file"; then
    echo "FAIL stale existing release output missing expected text in $file: $expected" >&2
    exit 1
  fi
}

check_existing_release_output() {
  local release_dir="$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta"
  if [ ! -d "$release_dir" ]; then
    echo "existing_release_output=absent"
    return
  fi

  echo "existing_release_output=present"
  require_text "$release_dir/MANIFEST.md" "Operator Upload Boundary"
  require_text "$release_dir/MANIFEST.md" "Do not upload \`docs/\`, \`beta-artifacts/\`, the \`public-release/\` folder itself"
  require_text "$release_dir/GITHUB_RELEASE_BODY.md" "Upload boundary for operators"
  require_text "$release_dir/GITHUB_RELEASE_BODY.md" "Use \`GITHUB_RELEASE_BODY.md\` exactly as"
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"upload_allowlist_source\": \"MANIFEST.md\""
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"upload_forbidden\": \"docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data\""
  echo "existing_release_output_status=current"
}

echo "preflight=public-release-readiness"
echo "scope=source-only-no-dmg-required-no-generated-artifacts"
echo "artifact_generation=false"
echo "dmg_required=false"
echo "network_or_onion_work=false"
echo "checks=artifact-boundary,update-integrity-policy,public-beta-gap,public-claim-acceptance"
echo "checks_run=artifact-boundary,update-integrity-policy,public-beta-gap,public-claim-acceptance"

run_step artifact-boundary "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-artifact-boundary
run_step update-integrity-policy "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-policy
run_step public-beta-gap "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
run_step public-claim-acceptance env PUBLIC_RELEASE_PREFLIGHT_CHILD=1 "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"
run_step existing-release-output check_existing_release_output

echo "status=public-release-readiness-source-preflight-ready"
echo "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
echo "fallback=return-to-desktop-hardening-if-source-preflight-fails"
echo "scope=source-only-no-dmg-required-no-generated-artifacts"
echo "artifact_generation=false"
echo "generated_artifacts_created=false"
echo "release_artifact_generation=false"
echo "dmg_required=false"
echo "network_or_onion_work=false"
echo "external_delivery_claim=false"
echo "security_ready_claim=false"
echo "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
echo "operator_non_claims=unsigned experimental public beta; not audited; not production-ready; sensitive communication prohibited; external_delivery_claim=false; security_ready_claim=false"
echo "next=if a frozen ignored DMG exists, run scripts/prepare_unsigned_public_beta_release.sh and upload only files listed in MANIFEST.md"

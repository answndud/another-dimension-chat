#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local name="$1"
  shift
  echo "step=$name"
  "$@"
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

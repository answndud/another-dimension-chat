#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local name="$1"
  shift
  echo "step=$name"
  "$@"
}

run_step artifact-boundary "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-artifact-boundary
run_step update-integrity-policy "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-policy
run_step public-beta-gap "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
run_step public-claim-acceptance "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"

echo "status=public-release-readiness-source-preflight-ready"
echo "scope=source-only-no-dmg-required-no-generated-artifacts"
echo "external_delivery_claim=false"
echo "security_ready_claim=false"
echo "next=if a frozen ignored DMG exists, run scripts/prepare_unsigned_public_beta_release.sh and upload only files listed in MANIFEST.md"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing public claim file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing public claim text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden public claim text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_CLAIM_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
  "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md"
  "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
  "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
  "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md"
  "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md"
)

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  require_file "$file"
done

require_text "$ROOT_DIR/README.md" "This project does not currently provide a secure messenger."
require_text "$ROOT_DIR/SECURITY.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "not a secure messenger release"

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"; do
  require_file "$file"
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

require_text "$ROOT_DIR/README.md" "The beta does not claim Briar/Cwtch equivalence"
require_text "$ROOT_DIR/SECURITY.md" "Briar/Cwtch-equivalent privacy or security level"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "Briar/Cwtch-equivalent."
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "gap map, not a"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "not audited, not production-ready, and sensitive communication prohibited"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "not an external review result"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Public Claims Not Allowed Today"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Suggested Public-Safe Review Commands"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "practical transport split"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "manual GitHub Release download"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "public support diagnostics"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "workflow state"
require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" 'Private planning notes stay in ignored `docs/`.'
require_text "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "not a secure messenger release today"
require_text "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "Release and updates"
require_text "$ROOT_DIR/README.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/SECURITY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "public support diagnostics"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "public support diagnostics"
require_text "$ROOT_DIR/README.md" "desktop local-private-flow acceptance blockers"
require_text "$ROOT_DIR/SECURITY.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "desktop local-private-flow acceptance"
require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_file "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "prepare_unsigned_public_beta_release.sh\" --check-artifact-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "prepare_unsigned_public_beta_release.sh\" --check-policy"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "public_beta_gap_acceptance_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "public_claim_acceptance_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "status=public-release-readiness-source-preflight-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "scope=source-only-no-dmg-required-no-generated-artifacts"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "external_delivery_claim=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "security_ready_claim=false"
require_text "$ROOT_DIR/README.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/SECURITY.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/SECURITY.md" "source-only preflight before staging artifacts"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "source-only preflight"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "--check-artifact-boundary"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "release output must stay under ignored apps/desktop-tauri/public-release/"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "next=upload all and only generated files listed in MANIFEST.md from release_dir"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "INSTALL_UNSIGNED_MACOS.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "PUBLIC_THREAT_MODEL.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "PRIVACY_MODEL_COMPARISON.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "INDEPENDENT_REVIEW_PACKET.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "PRIVACY_MODEL_COMPARISON.md"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" 'Upload files from `apps/desktop-tauri/public-release/unsigned-public-beta/` only'
require_text "$ROOT_DIR/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/SECURITY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/README.md" "no external delivery claim is made"
require_text "$ROOT_DIR/SECURITY.md" "report is expected or required for this v0.1 claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "No peer report is"

if git -C "$ROOT_DIR" ls-files docs | grep -q .; then
  echo "FAIL private docs are tracked in git" >&2
  git -C "$ROOT_DIR" ls-files docs >&2
  exit 1
fi

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  reject_text "$file" "production-ready secure messenger"
  reject_text "$file" "Briar/Cwtch-equivalent privacy or security level achieved"
  reject_text "$file" "independent review complete=true"
  reject_text "$file" "security_ready_claim=true"
  reject_text "$file" "does not close the external-evidence gate"
  reject_text "$file" "accepted for unsigned public beta release gating only"
done
reject_text "$ROOT_DIR/apps/desktop-tauri/README.md" "manual network permission state"
reject_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "external delivery evidence must come from real peer reports"
reject_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "실제 peer report에서만"
reject_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "manual network"

bash -n "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh"
bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
if [ "${PUBLIC_RELEASE_PREFLIGHT_CHILD:-0}" != "1" ]; then
  preflight_output="$("$ROOT_DIR/scripts/public_release_readiness_preflight.sh")"
  printf '%s\n' "$preflight_output" | grep -Fq -- "status=public-release-readiness-source-preflight-ready" || {
    echo "FAIL release readiness preflight missing ready status" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "scope=source-only-no-dmg-required-no-generated-artifacts" || {
    echo "FAIL release readiness preflight missing source-only scope" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "external_delivery_claim=false" || {
    echo "FAIL release readiness preflight missing external delivery non-claim" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "security_ready_claim=false" || {
    echo "FAIL release readiness preflight missing security-ready non-claim" >&2
    exit 1
  }
fi
bash "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-artifact-boundary
if "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "$ROOT_DIR/release-upload-test" >/tmp/another-dimension-release-output-check.out 2>&1; then
  echo "FAIL release prepare accepted a non-ignored output directory" >&2
  exit 1
fi
require_text /tmp/another-dimension-release-output-check.out "release output must stay under ignored apps/desktop-tauri/public-release/"
bash -n "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/final_acceptance_once.sh"
if final_acceptance_output="$("$ROOT_DIR/scripts/final_acceptance_once.sh" 2>&1)"; then
  echo "FAIL final acceptance unexpectedly succeeded" >&2
  exit 1
fi
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "outside the v0.1 public product claim" || {
  echo "FAIL final acceptance missing public product claim boundary" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "external_delivery_claim=false" || {
  echo "FAIL final acceptance missing external delivery non-claim" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "scripts/public_beta_gap_acceptance_once.sh" || {
  echo "FAIL final acceptance missing public beta gap next step" >&2
  exit 1
}

echo "status=public-claim-audit-readiness-ready"

#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden signed RC pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md"
DIST_GATE="reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
CREDENTIAL_GATE="reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
EXECUTION_PATH="reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"

for file in "$DOC" "$DIST_GATE" "$CREDENTIAL_GATE" "README.md" "SECURITY.md" \
  "$EXECUTION_PATH" "reference/INDEPENDENT_REVIEW_PACKET.md"; do
  [ -f "$file" ] || fail "missing required signed RC input: $file"
done

CODESIGN_AVAILABLE=false
SPCTL_AVAILABLE=false
STAPLER_AVAILABLE=false
command -v codesign >/dev/null 2>&1 && CODESIGN_AVAILABLE=true
command -v spctl >/dev/null 2>&1 && SPCTL_AVAILABLE=true
xcrun --find stapler >/dev/null 2>&1 && STAPLER_AVAILABLE=true

must_contain "$DOC" "Status: M100-3 is closed by explicit owner policy waiver"
must_contain "$DOC" "m100_3_signed_notarized_rc_runbook_reviewed=true"
must_contain "$DOC" "m100_3_artifact_blocker_closed=true"
must_contain "$DOC" "signed_notarized_rc_policy_waiver_authorized=true"
must_contain "$DOC" "signed_notarized_rc_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "signed_notarized_artifact_required_for_distribution_claims=true"
must_contain "$DOC" "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
must_contain "$DOC" "d100_3_signed_notarized_execution_path_reviewed=true"
must_contain "$DOC" "macos_signed_notarized_execution_path_available=true"
must_contain "$DOC" "signed_notarized_rc_artifact_verifier_available=true"
must_contain "$DOC" "signed_notarized_rc_artifact_available=false"
must_contain "$DOC" "ad_signed_rc_dmg_input_required_for_artifact_verification=true"
must_contain "$DOC" "codesign_tool_available=$CODESIGN_AVAILABLE"
must_contain "$DOC" "spctl_tool_available=$SPCTL_AVAILABLE"
must_contain "$DOC" "stapler_tool_available=$STAPLER_AVAILABLE"
must_contain "$DOC" "codesign_verify_passed=false"
must_contain "$DOC" "spctl_assess_passed=false"
must_contain "$DOC" "stapler_validate_passed=false"
must_contain "$DOC" "rc_artifact_sha256_recorded=false"
must_contain "$DOC" "release_upload_authorized=false"
must_contain "$DOC" "dmg_rebuild_authorized=false"
must_contain "$DOC" "generated_release_artifacts_staged=false"
must_contain "$DOC" "next_required_phase=Phase O100-1 - Operations, Incident, And Vulnerability Readiness"

must_contain "$DIST_GATE" "stable_signed_notarized_artifact_available=false"
must_contain "$DIST_GATE" "production_distribution_ready=false"
must_contain "$CREDENTIAL_GATE" "developer_id_signing_available=false"
must_contain "$CREDENTIAL_GATE" "notarization_credential_available=false"
must_contain "README.md" "reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md"
must_contain "README.md" "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
must_contain "SECURITY.md" "reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md"
must_contain "SECURITY.md" "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"

for file in "$DOC" "$DIST_GATE" "$CREDENTIAL_GATE" "README.md" "SECURITY.md"; do
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "stable_release_allowed=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

if git -C "$ROOT" ls-files | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  fail "generated public-release or beta-artifacts path is tracked"
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/)'; then
  fail "private docs, AGENTS.md, or generated release artifact path is staged"
fi

RC_DMG="${AD_SIGNED_RC_DMG:-}"
if [ -z "$RC_DMG" ]; then
  cat <<'STATUS'
status=macos-signed-notarized-rc-artifact-held
m100_3_signed_notarized_rc_runbook_reviewed=true
m100_3_artifact_blocker_closed=true
signed_notarized_rc_policy_waiver_authorized=true
signed_notarized_rc_waiver_scope=active-queue-unblock-only
signed_notarized_artifact_required_for_distribution_claims=true
signed_notarized_rc_artifact_verifier_available=true
signed_notarized_rc_artifact_available=false
codesign_verify_passed=false
spctl_assess_passed=false
stapler_validate_passed=false
rc_artifact_sha256_recorded=false
release_upload_authorized=false
dmg_rebuild_authorized=false
generated_release_artifacts_staged=false
next_required_phase=Phase-O100-1-Operations-Incident-And-Vulnerability-Readiness
STATUS
  exit 0
fi

[ -f "$RC_DMG" ] || fail "AD_SIGNED_RC_DMG does not point to a file: $RC_DMG"

case "$RC_DMG" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*)
    ;;
  "$ROOT"/*)
    fail "signed RC artifact must be in an ignored generated artifact directory, not tracked source: $RC_DMG"
    ;;
esac

[ "$CODESIGN_AVAILABLE" = "true" ] || fail "codesign unavailable"
[ "$SPCTL_AVAILABLE" = "true" ] || fail "spctl unavailable"
[ "$STAPLER_AVAILABLE" = "true" ] || fail "stapler unavailable"

codesign --verify --deep --strict --verbose=2 "$RC_DMG" >/dev/null
spctl --assess --type open --verbose=4 "$RC_DMG" >/dev/null
xcrun stapler validate "$RC_DMG" >/dev/null
rc_sha="$(shasum -a 256 "$RC_DMG" | awk '{print $1}')"

cat <<STATUS
status=macos-signed-notarized-rc-artifact-verified
m100_3_signed_notarized_rc_runbook_reviewed=true
m100_3_artifact_blocker_closed=true
signed_notarized_rc_policy_waiver_authorized=true
signed_notarized_rc_artifact_available=true
codesign_verify_passed=true
spctl_assess_passed=true
stapler_validate_passed=true
rc_artifact_sha256=$rc_sha
release_upload_authorized=false
dmg_rebuild_authorized=false
generated_release_artifacts_staged=false
STATUS

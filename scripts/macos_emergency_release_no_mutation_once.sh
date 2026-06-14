#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required emergency release text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden emergency release pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_EMERGENCY_RELEASE_INTEGRITY.md"
UPDATE_DOC="reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"
OPS_DOC="reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md"
SCRIPT="scripts/prepare_macos_emergency_release_advisory_packet.sh"

for file in "$DOC" "$UPDATE_DOC" "$OPS_DOC" "$SCRIPT"; do
  [ -f "$file" ] || fail "missing emergency release no-mutation input: $file"
done

for flag in \
  "macos_emergency_release_integrity_available=true" \
  "emergency_release_advisory_packet_script_available=true" \
  "emergency_release_no_artifact_mutation_verifier_ready=true" \
  "emergency_advisory_requires_affected_release_artifact_binding=true" \
  "emergency_advisory_requires_platform_release_class_binding=true" \
  "emergency_advisory_requires_release_artifact_identity_tuple=true" \
  "emergency_advisory_requires_distribution_manifest_sha256=true" \
  "emergency_advisory_requires_signed_false_hold_flags=true" \
  "emergency_release_generates_app_artifact=false" \
  "emergency_release_upload_authorized=false" \
  "emergency_release_dmg_rebuild_authorized=false" \
  "emergency_release_asset_delete_authorized=false" \
  "emergency_release_advisory_publication_authorized=false" \
  "compromised_artifact_public_copy_ready=true" \
  "dependency_vulnerability_decision_table_available=true" \
  "dependency_vulnerability_decisions=hold#advisory#rebuild#revoke" \
  "same_release_asset_authority_required=true" \
  "branch_source_release_authority_allowed=false" \
  "rollback_warning_policy_ready=true" \
  "rollback_prevention_claimed=false" \
  "auto_update_channel_ready=false" \
  "signed_update_manifest_ready=false" \
  "update_signature_ready=false" \
  "production_distribution_ready=false" \
  "security_ready_claimed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$UPDATE_DOC" "MACOS_EMERGENCY_RELEASE_INTEGRITY.md"
must_contain "$UPDATE_DOC" "emergency_release_no_artifact_mutation_verifier_ready=true"
must_contain "$OPS_DOC" "Any release upload, release edit, DMG rebuild, asset deletion, or advisory"
must_contain "$SCRIPT" "AD_EXECUTE_MACOS_EMERGENCY_ADVISORY"
must_contain "$SCRIPT" "AD_OWNER_APPROVED_EMERGENCY_ADVISORY"
must_contain "$SCRIPT" "AD_AFFECTED_ARTIFACT_SHA256"
must_contain "$SCRIPT" "AD_AFFECTED_PLATFORM"
must_contain "$SCRIPT" "AD_AFFECTED_RELEASE_CLASS"
must_contain "$SCRIPT" "AD_AFFECTED_PROVENANCE_SHA256"
must_contain "$SCRIPT" "AD_AFFECTED_DISTRIBUTION_MANIFEST_SHA256"
must_contain "$SCRIPT" "release_artifact_identity"
must_contain "$SCRIPT" "release_artifact_identity_binding_required=true"
must_contain "$SCRIPT" "manual_verification_required=true"
must_contain "$SCRIPT" "hold_flags"
must_contain "$SCRIPT" "emergency_release_generates_app_artifact=false"
must_contain "$SCRIPT" "emergency_release_upload_authorized=false"
must_contain "$SCRIPT" "emergency_release_dmg_rebuild_authorized=false"
must_contain "$SCRIPT" "emergency_release_asset_delete_authorized=false"
must_contain "$SCRIPT" "emergency_release_advisory_publication_authorized=false"

for file in "$DOC" "$UPDATE_DOC" "$SCRIPT"; do
  must_not_match "$file" "emergency_release_generates_app_artifact=true"
  must_not_match "$file" "emergency_release_upload_authorized=true"
  must_not_match "$file" "emergency_release_dmg_rebuild_authorized=true"
  must_not_match "$file" "emergency_release_asset_delete_authorized=true"
  must_not_match "$file" "emergency_release_advisory_publication_authorized=true"
  must_not_match "$file" "rollback_prevention_claimed=true"
  must_not_match "$file" "auto_update_channel_ready=true"
  must_not_match "$file" "signed_update_manifest_ready=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

dry_run_output="$("$SCRIPT")"
printf '%s\n' "$dry_run_output" | grep -Fq "status=macos-emergency-release-advisory-dry-run" ||
  fail "emergency advisory script did not default to dry-run"
printf '%s\n' "$dry_run_output" | grep -Fq "emergency_release_generates_app_artifact=false" ||
  fail "dry-run output did not preserve artifact false flag"
printf '%s\n' "$dry_run_output" | grep -Fq "emergency_release_upload_authorized=false" ||
  fail "dry-run output did not preserve upload false flag"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

if AD_EXECUTE_MACOS_EMERGENCY_ADVISORY=1 \
AD_OWNER_APPROVED_EMERGENCY_ADVISORY=1 \
AD_EMERGENCY_OUTPUT_DIR="$tmp_dir/missing-binding" \
"$SCRIPT" >"$tmp_dir/missing-binding.out" 2>&1; then
  fail "emergency advisory packet accepted unknown affected release/artifact binding"
fi
grep -Fq "AD_AFFECTED_RELEASE_TAG must be a concrete release tag" "$tmp_dir/missing-binding.out" ||
  fail "emergency advisory packet did not reject unknown affected release tag"

AD_EXECUTE_MACOS_EMERGENCY_ADVISORY=1 \
AD_OWNER_APPROVED_EMERGENCY_ADVISORY=1 \
AD_EMERGENCY_OUTPUT_DIR="$tmp_dir" \
AD_EMERGENCY_INCIDENT_CLASS=bad-release \
AD_EMERGENCY_DECISION=rebuild \
AD_AFFECTED_RELEASE_TAG=v0.1.1-rc.1 \
AD_AFFECTED_ARTIFACT=another-dimension-chat-0.1.1-rc.1-macos-aarch64.dmg \
AD_AFFECTED_PLATFORM=macos \
AD_AFFECTED_RELEASE_CLASS=unsigned-public-beta \
AD_AFFECTED_ARTIFACT_SHA256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
AD_AFFECTED_PROVENANCE_SHA256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
AD_AFFECTED_DISTRIBUTION_MANIFEST_SHA256=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc \
"$SCRIPT" >"$tmp_dir/macos_emergency_advisory_packet.out"

for file in \
  "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" \
  "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY.md"; do
  [ -f "$file" ] || fail "emergency advisory packet did not write expected file: $file"
done

if find "$tmp_dir" -type f | grep -E '\.(dmg|zip|msi|apk|aab|ipa)$' >/dev/null; then
  fail "emergency advisory packet generated a release artifact"
fi

must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"emergency_release_generates_app_artifact": false'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"emergency_release_upload_authorized": false'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"emergency_release_dmg_rebuild_authorized": false'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"affected_platform": "macos"'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"affected_release_class": "unsigned-public-beta"'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"release_artifact_identity": {'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"release_artifact_identity_binding_required": true'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"manual_verification_required": true'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"affected_artifact_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"affected_provenance_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"affected_distribution_manifest_sha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"hold_flags": {'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"production_ready_claim_allowed": false'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json" '"rollback_prevention_claimed": false'
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY.md" "Affected artifact SHA-256"
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY.md" "Affected platform"
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY.md" "Affected release class"
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY.md" "Treat the affected release tag, artifact filename, platform, release"
must_contain "$tmp_dir/MACOS_EMERGENCY_RELEASE_ADVISORY.md" "Branch files and source archives are not release"

cat <<'STATUS'
status=macos-emergency-release-no-mutation-ready
macos_emergency_release_integrity_available=true
emergency_release_advisory_packet_script_available=true
emergency_release_no_artifact_mutation_verifier_ready=true
emergency_advisory_requires_affected_release_artifact_binding=true
emergency_advisory_requires_platform_release_class_binding=true
emergency_advisory_requires_release_artifact_identity_tuple=true
emergency_advisory_requires_distribution_manifest_sha256=true
emergency_advisory_requires_signed_false_hold_flags=true
emergency_release_generates_app_artifact=false
emergency_release_upload_authorized=false
emergency_release_dmg_rebuild_authorized=false
emergency_release_asset_delete_authorized=false
emergency_release_advisory_publication_authorized=false
dependency_vulnerability_decision_table_available=true
dependency_vulnerability_decisions=hold#advisory#rebuild#revoke
rollback_prevention_claimed=false
auto_update_channel_ready=false
signed_update_manifest_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
STATUS

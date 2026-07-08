#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

DOC="reference/FINAL_100_EVIDENCE_LEDGER_SCHEMA.md"
VALIDATOR="scripts/validate_final_100_evidence_ledger.mjs"

for file in "$DOC" "$VALIDATOR" "reference/FINAL_100_CLAIM_GATE.md"; do
  [ -f "$file" ] || fail "missing final 100 evidence ledger input: $file"
done

for flag in \
  "final_100_evidence_ledger_schema_available=true" \
  "final_100_evidence_ledger_validator_available=true" \
  "final_100_evidence_ledger_waiting_for_real_inputs=true" \
  "final_100_evidence_ledger_rejects_fabricated_or_local_only=true" \
  "final_100_evidence_ledger_rejects_private_material=true" \
  "final_100_evidence_ledger_requires_child_evidence_files=true" \
  "final_100_evidence_ledger_child_files_sha_verified=true" \
  "final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true" \
  "final_100_evidence_candidate_requires_owner_claim_decision=true" \
  "macos_public_app_100_claim_allowed=false" \
  "whole_target_standard_100_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$VALIDATOR" "final-100-evidence-ledger-v1"
must_contain "$VALIDATOR" "real-external-and-device-evidence"
must_contain "$VALIDATOR" "final_100_evidence_ledger_child_files_sha_verified=true"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true"
must_contain "$VALIDATOR" "status=final-100-evidence-candidate-requires-review"
must_contain "reference/FINAL_100_CLAIM_GATE.md" "final_100_evidence_ledger_schema_available=true"
must_contain "scripts/final_100_claim_gate_once.sh" "final_100_evidence_ledger_once.sh"

node --check "$VALIDATOR" >/dev/null

empty_output="$(node "$VALIDATOR" "$ROOT/docs/final-100-evidence")"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-final-100-evidence-ledger" ||
  fail "empty final 100 evidence ledger validator did not wait"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
write_evidence() {
  local rel="$1"
  local body="$2"
  mkdir -p "$tmp_dir/$(dirname "$rel")"
  printf '%s\n' "$body" >"$tmp_dir/$rel"
}

write_evidence "macos/artifact.provenance.json" '{"schema":"macos-provenance","result":"signed-notarized-stapled"}'
write_evidence "macos/distribution-manifest.json" '{"schema":"macos-release-distribution-manifest-v1","result":"verified"}'
write_evidence "macos/gatekeeper-assessment.txt" 'spctl assessment passed on clean macOS host'
write_evidence "macos/dmg-contained-app-assessment.txt" 'mounted DMG app codesign, execute assessment, and source bundle match passed'
for index in 1 2 3; do
  write_evidence "macos/usability-$index.md" "representative usability report $index: completed required macOS public app flow"
done
write_evidence "windows/artifact-manifest.json" '{"schema":"windows-public-artifact-manifest-v1","result":"verified"}'
write_evidence "windows/runtime-result.md" 'real Windows runtime result: WebView2 and app-data checks passed'
write_evidence "android/artifact-manifest.json" '{"schema":"android-public-artifact-manifest-v1","result":"verified"}'
write_evidence "android/device-result.md" 'real Android device result: shared-core flow and backup exclusion passed'
write_evidence "ios/artifact-manifest.json" '{"schema":"ios-public-artifact-manifest-v1","result":"verified"}'
write_evidence "ios/device-result.md" 'real iOS device result: shared-core flow and entitlements review passed'
write_evidence "external/review-signoff.json" '{"schema_version":"external-review-signoff-v1","result":"candidate"}'
write_evidence "external/audit-finding-tracker.md" 'audit finding tracker: critical and high findings closed'
for index in 1 2 3 4; do
  write_evidence "external/field-$index.md" "redacted field report $index: accepted real multi-platform evidence"
done
write_evidence "claim/release-copy-review.md" 'release copy reviewed: public claims do not exceed evidence'
write_evidence "claim/support-copy-review.md" 'support copy reviewed: public claims do not exceed evidence'

node - "$tmp_dir" <<'NODE'
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = process.argv[2];
const ref = (relativePath) => ({
  path: relativePath,
  sha256: createHash("sha256")
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest("hex"),
});

const ledger = {
  schema_version: "final-100-evidence-ledger-v1",
  source_commit: "abcdef1234567890",
  evidence_origin: "real-external-and-device-evidence",
  final_100_claim_gate_ready: true,
  macos_public_app_100_claim_allowed: false,
  whole_target_standard_100_claim_allowed: false,
  production_ready_claim_allowed: false,
  audited_claim_allowed: false,
  sensitive_communication_allowed: false,
  evidence_files: {
    macos: {
      artifact_provenance: ref("macos/artifact.provenance.json"),
      distribution_manifest: ref("macos/distribution-manifest.json"),
      gatekeeper_assessment: ref("macos/gatekeeper-assessment.txt"),
      dmg_contained_app_assessment: ref("macos/dmg-contained-app-assessment.txt"),
      representative_usability_reports: [
        ref("macos/usability-1.md"),
        ref("macos/usability-2.md"),
        ref("macos/usability-3.md"),
      ],
    },
    windows: {
      artifact_manifest: ref("windows/artifact-manifest.json"),
      runtime_result: ref("windows/runtime-result.md"),
    },
    android: {
      artifact_manifest: ref("android/artifact-manifest.json"),
      real_device_result: ref("android/device-result.md"),
    },
    ios: {
      artifact_manifest: ref("ios/artifact-manifest.json"),
      real_device_result: ref("ios/device-result.md"),
    },
    external: {
      review_signoff: ref("external/review-signoff.json"),
      audit_finding_tracker: ref("external/audit-finding-tracker.md"),
      redacted_field_reports: [
        ref("external/field-1.md"),
        ref("external/field-2.md"),
        ref("external/field-3.md"),
        ref("external/field-4.md"),
      ],
    },
    claim_discipline: {
      release_copy_review: ref("claim/release-copy-review.md"),
      support_copy_review: ref("claim/support-copy-review.md"),
    },
  },
  macos: {
    developer_id_signed: true,
    notarized: true,
    stapled: true,
    spctl_assess_passed: true,
    dmg_mounted_app_found: true,
    dmg_contained_app_codesign_verify_passed: true,
    dmg_contained_app_gatekeeper_assess_passed: true,
    dmg_contained_app_matches_signed_source_app: true,
    gatekeeper_clean_open_observed: true,
    release_distribution_manifest_verified: true,
    representative_usability_completed: true,
    representative_usability_report_count: 3,
    artifact_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    distribution_manifest_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  windows: {
    real_runtime_smoke_passed: true,
    webview2_runtime_verified: true,
    public_artifact_manifest_verified: true,
    artifact_sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    artifact_manifest_sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  },
  android: {
    real_device_smoke_passed: true,
    shared_core_flow_verified: true,
    apk_or_aab_manifest_verified: true,
    backup_exclusion_verified: true,
    artifact_sha256: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    artifact_manifest_sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  },
  ios: {
    real_device_smoke_passed: true,
    shared_core_flow_verified: true,
    ipa_or_testflight_manifest_verified: true,
    minimal_entitlements_reviewed: true,
    privacy_labels_reviewed: true,
    artifact_sha256: "1111111111111111111111111111111111111111111111111111111111111111",
    artifact_manifest_sha256: "2222222222222222222222222222222222222222222222222222222222222222",
  },
  security: {
    production_e2ee_reviewed: true,
    key_management_reviewed: true,
    storage_lifecycle_reviewed: true,
    default_transport_ready: true,
    redacted_diagnostics_reviewed: true,
  },
  external: {
    named_external_review_completed: true,
    audit_completed: true,
    critical_high_findings_closed: true,
    repeated_real_field_reports_available: true,
    accepted_field_report_count: 4,
  },
  claim_discipline: {
    public_claim_may_not_exceed_evidence: true,
    release_copy_reviewed: true,
    support_copy_reviewed: true,
  },
};

fs.writeFileSync(path.join(root, "valid-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
NODE

candidate_output="$(node "$VALIDATOR" "$tmp_dir/valid-ledger.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_final_100_evidence_ledgers=1" ||
  fail "valid final 100 evidence ledger was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_child_files_sha_verified=true" ||
  fail "final 100 ledger validator did not verify child evidence file SHAs"
printf '%s\n' "$candidate_output" | grep -Fq "macos_public_app_100_claim_allowed=false" ||
  fail "final 100 ledger validator must not auto-open macOS claim"
printf '%s\n' "$candidate_output" | grep -Fq "status=final-100-evidence-candidate-requires-review" ||
  fail "final 100 ledger validator did not require review"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/valid-ledger.json" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict final 100 evidence ledger validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale.out" ||
  fail "strict final 100 evidence ledger validator did not report stale source commit"

cat >"$tmp_dir/local-only-ledger.json" <<'JSON'
{
  "schema_version": "final-100-evidence-ledger-v1",
  "source_commit": "abcdef1234567890",
  "evidence_origin": "real-external-and-device-evidence",
  "note": "local-only same-machine synthetic evidence",
  "final_100_claim_gate_ready": true
}
JSON

if node "$VALIDATOR" "$tmp_dir/local-only-ledger.json" >"$tmp_dir/local-only.out" 2>&1; then
  fail "final 100 evidence ledger accepted local-only synthetic evidence"
fi
grep -Fq "forbidden-content:synthetic-evidence" "$tmp_dir/local-only.out" ||
  fail "synthetic evidence rejection was not reported"

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=final-100-evidence-ledger-gate-ready
final_100_evidence_ledger_schema_available=true
final_100_evidence_ledger_validator_available=true
final_100_evidence_ledger_waiting_for_real_inputs=true
final_100_evidence_ledger_rejects_fabricated_or_local_only=true
final_100_evidence_ledger_rejects_private_material=true
final_100_evidence_ledger_requires_child_evidence_files=true
final_100_evidence_ledger_child_files_sha_verified=true
final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true
final_100_evidence_candidate_requires_owner_claim_decision=true
macos_public_app_100_claim_allowed=false
whole_target_standard_100_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
STATUS

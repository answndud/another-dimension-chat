#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local text="$1"
  local needle="$2"
  printf '%s\n' "$text" | grep -Fq "$needle" || fail "missing expected output: $needle"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MANIFEST_VALIDATOR="scripts/validate_windows_artifact_manifest.mjs"
RESULT_VALIDATOR="scripts/validate_windows_public_artifact_results.mjs"

[ -f "$MANIFEST_VALIDATOR" ] || fail "missing manifest validator"
[ -f "$RESULT_VALIDATOR" ] || fail "missing runtime result validator"

node --check "$MANIFEST_VALIDATOR" >/dev/null
node --check "$RESULT_VALIDATOR" >/dev/null

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

artifact_name="Another Dimension Chat_0.1.0_x64-setup.exe"
artifact="$tmp_dir/$artifact_name"
node - "$artifact" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const bytes = Buffer.alloc(512, 0);
bytes.write("MZ", 0, "ascii");
bytes.writeUInt32LE(0x80, 0x3c);
bytes.write("PE\0\0", 0x80, "binary");
fs.writeFileSync(file, bytes);
NODE

artifact_sha="$(shasum -a 256 "$artifact" | awk '{print $1}')"
artifact_size="$(wc -c <"$artifact" | tr -d ' ')"
printf '%s  %s\n' "$artifact_sha" "$artifact_name" >"$tmp_dir/$artifact_name.sha256"

cat >"$tmp_dir/$artifact_name.provenance.json" <<JSON
{
  "schema_version": "windows-public-artifact-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "abcdef1234567890",
  "artifact_filename": "$artifact_name",
  "artifact_sha256": "$artifact_sha",
  "release_class": "unsigned-windows-beta",
  "bundle_target": "nsis",
  "signing_status": "unsigned-hold",
  "release_upload_authorized": false,
  "windows_public_artifact_ready": false,
  "generated_release_artifacts_commit_allowed": false
}
JSON
provenance_sha="$(shasum -a 256 "$tmp_dir/$artifact_name.provenance.json" | awk '{print $1}')"

cat >"$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" <<JSON
{
  "schema_version": "windows-public-artifact-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "abcdef1234567890",
  "version": "0.1.0",
  "release_class": "unsigned-windows-beta",
  "manifest_file": "WINDOWS_ARTIFACT_MANIFEST.json",
  "manifest_sha256_file": "WINDOWS_ARTIFACT_MANIFEST.json.sha256",
  "default_bundle_target": "nsis",
  "default_artifact_extension": ".exe",
  "webview2_runtime_required": true,
  "app_data_resolver": "tauri-app-data",
  "redacted_diagnostics_required": true,
  "auto_update": false,
  "same_release_asset_authority_required": true,
  "release_upload_authorized": false,
  "release_body_edit_authorized": false,
  "windows_public_artifact_ready": false,
  "windows_installer_ready": false,
  "generated_release_artifacts_commit_allowed": false,
  "public_non_claims": [
    "unsigned experimental public beta",
    "sensitive communication prohibited",
    "not audited",
    "not production-ready",
    "no public Windows artifact",
    "no Windows installer",
    "no public artifact upload"
  ],
  "artifacts": [
    {
      "filename": "$artifact_name",
      "artifact_basename": "$artifact_name",
      "sha256": "$artifact_sha",
      "size_bytes": $artifact_size,
      "platform": "windows",
      "architecture": "windows-x64",
      "bundle_target": "nsis",
      "signing_status": "unsigned-hold",
      "checksum_file": "$artifact_name.sha256",
      "checksum_sidecar": "$artifact_name.sha256",
      "provenance_file": "$artifact_name.provenance.json",
      "provenance_path": "$artifact_name.provenance.json",
      "artifact_path_class": "generated-release-directory-relative-basename",
      "webview2_runtime_required": true,
      "app_data_resolver": "tauri-app-data",
      "encrypted_store_required": true,
      "redacted_diagnostics_required": true,
      "auto_update": false,
      "smartscreen_reputation_claim": false,
      "signing_trust_boundary": false
    }
  ]
}
JSON
shasum -a 256 "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" | sed 's#'"$tmp_dir"'/##' >"$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json.sha256"
manifest_sha="$(shasum -a 256 "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" | awk '{print $1}')"

manifest_output="$(node "$MANIFEST_VALIDATOR" "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json")"
must_contain "$manifest_output" "accepted_windows_artifact_manifests=1"
must_contain "$manifest_output" "windows_artifact_checksum_bytes_verified=true"
must_contain "$manifest_output" "windows_public_artifact_ready=false"
must_contain "$manifest_output" "status=windows-artifact-manifest-candidate-requires-release-gate"

if AD_REQUIRE_CURRENT_HEAD=1 node "$MANIFEST_VALIDATOR" "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" >"$tmp_dir/stale-manifest.out" 2>&1; then
  fail "strict manifest validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale-manifest.out" ||
  fail "strict manifest validator did not report stale source commit"

include_manifest_file=false
if grep -Fq '"artifact_manifest_file"' "$RESULT_VALIDATOR"; then
  include_manifest_file=true
fi

{
  echo "schema_version=windows-public-artifact-result-v1"
  echo "result_id=WIN-0001"
  echo "run_host=real-windows-machine"
  echo "platform=windows"
  echo "windows_version=Windows 11 23H2 redacted"
  echo "architecture=x64"
  echo "artifact_kind=tauri-bundle"
  echo "artifact_app_version=0.1.0"
  echo "artifact_release_class=unsigned-windows-beta"
  echo "artifact_path_redacted=true"
  echo "install_path_class=redacted-standard-user-install"
  echo "app_data_resolver_class=tauri-app-data"
  if [ "$include_manifest_file" = true ]; then
    echo "artifact_manifest_file=WINDOWS_ARTIFACT_MANIFEST.json"
  fi
  echo "artifact_sha256=$artifact_sha"
  echo "artifact_provenance_sha256=$provenance_sha"
  echo "artifact_manifest_sha256=$manifest_sha"
  echo "source_commit=abcdef1234567890"
  echo "webview2_rendered=pass"
  echo "app_data_root_redacted=pass"
  echo "path_separator_behavior=pass"
  echo "encrypted_store_profile_unlock=pass"
  echo "profile_create_unlock=pass"
  echo "local_deletion_behavior=pass"
  echo "redacted_diagnostics_only=pass"
  echo "redacted_diagnostics_copy=pass"
  echo "explicit_user_action_before_network=pass"
  echo "app_launch_network=false"
  echo "local_manual_envelope_default_path=pass"
  echo "auto_update_channel_absent=pass"
  echo "public_non_claims_visible=pass"
  echo "installer_signing_decision=unsigned-hold"
  echo "smartscreen_reputation_claim=false"
  echo "public_copy_reviewed=true"
  echo "checksum_provenance_verified=true"
  echo "support_diagnostics_reviewed=true"
  echo "non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready#no-public-windows-artifact#no-windows-installer#no-public-artifact-upload"
} >"$tmp_dir/win-valid.md"

result_output="$(node "$RESULT_VALIDATOR" "$tmp_dir/win-valid.md")"
must_contain "$result_output" "accepted_windows_public_artifact_results=1"
must_contain "$result_output" "windows_public_artifact_ready=false"
must_contain "$result_output" "status=windows-public-artifact-candidate-requires-review"

if AD_REQUIRE_CURRENT_HEAD=1 node "$RESULT_VALIDATOR" "$tmp_dir/win-valid.md" >"$tmp_dir/stale-result.out" 2>&1; then
  fail "strict result validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale-result.out" ||
  fail "strict result validator did not report stale source commit"

sed 's/run_host=real-windows-machine/run_host=macos-local/' "$tmp_dir/win-valid.md" >"$tmp_dir/not-windows.md"
if node "$RESULT_VALIDATOR" "$tmp_dir/not-windows.md" >"$tmp_dir/not-windows.out" 2>&1; then
  fail "result validator accepted non-Windows host"
fi
grep -Fq "invalid-value:run_host" "$tmp_dir/not-windows.out" ||
  fail "non-Windows host rejection was not reported"

sed 's/app_data_root_redacted=pass/app_data_root_redacted=pass %LOCALAPPDATA%/' "$tmp_dir/win-valid.md" >"$tmp_dir/private-path.md"
if node "$RESULT_VALIDATOR" "$tmp_dir/private-path.md" >"$tmp_dir/private-path.out" 2>&1; then
  fail "result validator accepted private local app-data path"
fi
grep -Fq "windows-local-app-data" "$tmp_dir/private-path.out" ||
  fail "private local app-data path rejection was not reported"

echo "status=windows-artifact-runtime-evidence-contract-ready"
echo "windows_artifact_manifest_fixture_accepted=true"
echo "windows_runtime_result_fixture_accepted=true"
echo "windows_result_requires_real_windows_machine=true"
echo "windows_result_rejects_private_local_app_data=true"
echo "windows_strict_current_head_rejects_stale_evidence=true"
echo "windows_public_artifact_ready=false"

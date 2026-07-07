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
    fail "$file contains forbidden Windows artifact scope-down text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md"
PARITY="apps/desktop-tauri/windows_desktop_parity_intake.json"
HANDOFF="apps/desktop-tauri/windows_local_runtime_smoke_handoff.json"

for file in "$DOC" "$PARITY" "$HANDOFF" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required Windows artifact scope-down input: $file"
done

must_contain "$DOC" "rb_10_windows_public_artifact_scope_down_reviewed=true"
must_contain "$DOC" "windows_readiness=local-build-candidate-only"
must_contain "$DOC" "windows_local_usable_criteria_defined=true"
must_contain "$DOC" "windows_local_runtime_smoke_status=source-boundary-only"
must_contain "$DOC" "windows_local_runtime_smoke_passed=false"
must_contain "$DOC" "windows_public_artifact_ready=false"
must_contain "$DOC" "windows_installer_ready=false"
must_contain "$DOC" "windows_signing_ready=false"
must_contain "$DOC" "windows_public_artifact_upload_allowed=false"
must_contain "$DOC" "windows_release_packaging_allowed=false"
must_contain "$DOC" "windows_generated_artifact_commit_allowed=false"
must_contain "$DOC" "windows_stable_claim_allowed=false"
must_contain "$DOC" "windows_unsigned_beta_or_rc_scope_allowed=true"
must_contain "$DOC" "windows_public_artifact_no_longer_blocks_cross_platform_planning=true"
must_contain "$DOC" "windows_public_artifact_still_blocks_windows_public_claims=true"
must_contain "$DOC" "next_required_phase=RB-11 android implementation authorization and shell closure"

must_contain "$PARITY" '"windows_public_artifact_ready": false'
must_contain "$PARITY" '"windows_installer_ready": false'
must_contain "$PARITY" '"windows_public_artifact_upload_allowed": false'
must_contain "$PARITY" '"windows_local_runtime_smoke_passed": false'
must_contain "$HANDOFF" '"windows_local_runtime_smoke_passed": false'
must_contain "$HANDOFF" '"must_run_on": "real-windows-machine"'
must_contain "README.md" "reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md"

for file in "$DOC" "$PARITY" "$HANDOFF" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_not_match "$file" "windows_public_artifact_ready[=:] ?true"
  must_not_match "$file" "windows_installer_ready[=:] ?true"
  must_not_match "$file" "windows_signing_ready[=:] ?true"
  must_not_match "$file" "windows_public_artifact_upload_allowed[=:] ?true"
  must_not_match "$file" "windows_release_packaging_allowed[=:] ?true"
  must_not_match "$file" "windows_generated_artifact_commit_allowed[=:] ?true"
  must_not_match "$file" "windows_stable_claim_allowed[=:] ?true"
done

scripts/desktop_windows_readiness_source_audit_once.sh >/dev/null
scripts/desktop_windows_local_runtime_smoke_boundary_once.sh >/dev/null

cat <<'STATUS'
status=windows-public-artifact-scope-down-closed
rb_10_windows_public_artifact_scope_down_reviewed=true
windows_readiness=local-build-candidate-only
windows_local_runtime_smoke_status=source-boundary-only
windows_public_artifact_ready=false
windows_installer_ready=false
windows_signing_ready=false
windows_public_artifact_upload_allowed=false
windows_release_packaging_allowed=false
windows_unsigned_beta_or_rc_scope_allowed=true
windows_public_artifact_no_longer_blocks_cross_platform_planning=true
windows_public_artifact_still_blocks_windows_public_claims=true
next_required_phase=RB-11-android-implementation-authorization-and-shell-closure
STATUS

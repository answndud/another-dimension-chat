#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md"
FIXTURE_SCRIPT="$ROOT_DIR/scripts/verify_release_signing_candidate_evidence_fixture.sh"

test -f "$DOC"
test -x "$FIXTURE_SCRIPT"

grep -q 'Audit status: fixture coverage audit only, not candidate evidence' "$DOC"
grep -q 'scripts/verify_release_signing_candidate_evidence_fixture.sh' "$DOC"
grep -q 'fixture-filled-not-release-evidence' "$DOC"
grep -q 'missing candidate index' "$DOC"
grep -q 'missing key ceremony record' "$DOC"
grep -q 'mismatched candidate commit' "$DOC"
grep -q 'mismatched artifact manifest' "$DOC"
grep -q 'template-only evidence' "$DOC"
grep -q 'placeholder evidence' "$DOC"
grep -q 'empty blocker status' "$DOC"
grep -q 'real release key ceremony evidence' "$DOC"
grep -q 'real signed artifact evidence' "$DOC"
grep -q 'real user/reviewer verification transcript evidence' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not approve fixture coverage as release evidence' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

grep -q 'expect_rejects "missing candidate index"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "missing key ceremony record"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "mismatched candidate commit"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "mismatched artifact manifest"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "template-only evidence"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "placeholder evidence"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "empty blocker status"' "$FIXTURE_SCRIPT"
grep -q 'fixture-filled-not-release-evidence' "$FIXTURE_SCRIPT"
grep -q 'reject_if_unsafe_record_text' "$FIXTURE_SCRIPT"

grep -q 'RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'candidate evidence fixture coverage audit' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_fixture_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'fixture coverage approved for release|fixture coverage is release evidence|candidate evidence package complete|release signing approved|signed artifact verification passed|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "fixture coverage audit must not be treated as release evidence or approval" >&2
  exit 1
fi

printf 'release signing candidate evidence fixture coverage audit remains audit-only\n'

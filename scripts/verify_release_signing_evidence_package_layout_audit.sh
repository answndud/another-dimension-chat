#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md"
FIXTURE_SCRIPT="$ROOT_DIR/scripts/verify_release_signing_evidence_package_layout_fixture.sh"

test -f "$DOC"
test -x "$FIXTURE_SCRIPT"

grep -q 'Audit status: package layout coverage audit only, not candidate evidence' "$DOC"
grep -q 'scripts/verify_release_signing_evidence_package_layout_fixture.sh' "$DOC"
grep -q 'CANDIDATE_EVIDENCE_INDEX' "$DOC"
grep -q 'release-signing/key-ceremony.record' "$DOC"
grep -q 'release-signing/signed-artifacts.record' "$DOC"
grep -q 'release-signing/verification-ux.record' "$DOC"
grep -q 'binary-verification/binary-verification.record' "$DOC"
grep -q 'dependency-review/dependency-review.record' "$DOC"
grep -q 'signoff/release-signoff.record' "$DOC"
grep -q 'external-review/external-review.record' "$DOC"
grep -q 'update-integrity/update-integrity.record' "$DOC"
grep -q 'blockers/unresolved-blockers.record' "$DOC"
grep -q 'missing candidate index' "$DOC"
grep -q 'missing gate directory' "$DOC"
grep -q 'missing required record' "$DOC"
grep -q 'misplaced root record' "$DOC"
grep -q 'unknown top-level directory' "$DOC"
grep -q 'unknown record inside a gate directory' "$DOC"
grep -q 'empty required record' "$DOC"
grep -q 'real release key ceremony evidence' "$DOC"
grep -q 'real signed artifact verification evidence' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not approve package layout as release evidence' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

grep -q 'release-signing/key-ceremony.record' "$FIXTURE_SCRIPT"
grep -q 'release-signing/signed-artifacts.record' "$FIXTURE_SCRIPT"
grep -q 'release-signing/verification-ux.record' "$FIXTURE_SCRIPT"
grep -q 'binary-verification/binary-verification.record' "$FIXTURE_SCRIPT"
grep -q 'dependency-review/dependency-review.record' "$FIXTURE_SCRIPT"
grep -q 'signoff/release-signoff.record' "$FIXTURE_SCRIPT"
grep -q 'external-review/external-review.record' "$FIXTURE_SCRIPT"
grep -q 'update-integrity/update-integrity.record' "$FIXTURE_SCRIPT"
grep -q 'blockers/unresolved-blockers.record' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "missing candidate index"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "missing gate directory"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "missing required record"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "misplaced root record"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "unknown top-level directory"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "unknown record inside gate directory"' "$FIXTURE_SCRIPT"
grep -q 'expect_rejects "empty required record"' "$FIXTURE_SCRIPT"

grep -q 'RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'evidence package layout coverage audit' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_evidence_package_layout_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'package layout approved for release|layout coverage is release evidence|candidate evidence package complete|release signing approved|signed artifact verification passed|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "layout coverage audit must not be treated as release evidence or approval" >&2
  exit 1
fi

printf 'release signing evidence package layout coverage audit remains audit-only\n'

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
    fail "$file contains forbidden GitHub release publication text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/GITHUB_RELEASE_PUBLICATION_SCOPE_DOWN.md"
CLAIM_DECISION="reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"

for file in "$DOC" "$CLAIM_DECISION" "$STABLE_GATE" "$PACKET" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required GitHub release publication input: $file"
done

must_contain "$DOC" "rb_9_github_release_publication_scope_down_reviewed=true"
must_contain "$DOC" "r100_2_stable_macos_release_decision_closed=true"
must_contain "$DOC" "stable_release_publication_performed=false"
must_contain "$DOC" "release_tag=v0.1.0-beta-onion-unsigned"
must_contain "$DOC" "release_class=unsigned-experimental-public-beta"
must_contain "$DOC" "existing_lower_release_public_prerelease_observed=true"
must_contain "$DOC" "existing_lower_release_draft=false"
must_contain "$DOC" "existing_lower_release_asset_set_observed=true"
must_contain "$DOC" "existing_lower_release_dmg_asset_observed=true"
must_contain "$DOC" "existing_lower_release_sha256_asset_observed=true"
must_contain "$DOC" "existing_lower_release_provenance_asset_observed=true"
must_contain "$DOC" "lower_release_publication_selected=true"
must_contain "$DOC" "stable_release_published=false"
must_contain "$DOC" "stable_release_tag_created=false"
must_contain "$DOC" "stable_release_upload_authorized=false"
must_contain "$DOC" "release_upload_performed=false"
must_contain "$DOC" "release_body_edit_performed=false"
must_contain "$DOC" "release_asset_delete_performed=false"
must_contain "$DOC" "dmg_rebuild_performed=false"
must_contain "$DOC" "generated_release_artifacts_commit_allowed=false"
must_contain "$DOC" "public_stable_release_allowed=false"
must_contain "$DOC" "lower_release_publication_claim_boundary_ready=true"
must_contain "$DOC" "next_required_phase=RB-10 windows desktop public artifact closure"

must_contain "$CLAIM_DECISION" "next_release_class=signed-public-beta-or-rc"
must_contain "$STABLE_GATE" "rb_9_github_release_publication_scope_down_reviewed=true"
must_contain "$STABLE_GATE" "lower_release_publication_selected=true"
must_contain "$PACKET" "reference/GITHUB_RELEASE_PUBLICATION_SCOPE_DOWN.md"
must_contain "README.md" "reference/GITHUB_RELEASE_PUBLICATION_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/GITHUB_RELEASE_PUBLICATION_SCOPE_DOWN.md"

for file in "$DOC" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "stable_release_published=true"
  must_not_match "$file" "stable_release_upload_authorized=true"
  must_not_match "$file" "release_upload_performed=true"
  must_not_match "$file" "release_body_edit_performed=true"
  must_not_match "$file" "release_asset_delete_performed=true"
  must_not_match "$file" "dmg_rebuild_performed=true"
  must_not_match "$file" "generated_release_artifacts_commit_allowed=true"
  must_not_match "$file" "public_stable_release_allowed=true"
done

if git -C "$ROOT" ls-files | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  fail "generated public-release or beta-artifacts path is tracked"
fi

cat <<'STATUS'
status=github-release-publication-scope-down-closed
rb_9_github_release_publication_scope_down_reviewed=true
r100_2_stable_macos_release_decision_closed=true
stable_release_publication_performed=false
lower_release_publication_selected=true
release_tag=v0.1.0-beta-onion-unsigned
stable_release_published=false
stable_release_upload_authorized=false
release_upload_performed=false
release_body_edit_performed=false
dmg_rebuild_performed=false
public_stable_release_allowed=false
lower_release_publication_claim_boundary_ready=true
next_required_phase=RB-10-windows-desktop-public-artifact-closure
STATUS

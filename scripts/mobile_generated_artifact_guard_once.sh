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

for pattern in \
  "public-release/" \
  "beta-artifacts/" \
  "*.dmg" \
  "*.zip" \
  "*.msi" \
  "apps/mobile/android/.gradle/" \
  "apps/mobile/android/build/" \
  "apps/mobile/android/app/build/" \
  "apps/mobile/android/public-release/" \
  "apps/mobile/ios/build/" \
  "apps/mobile/ios/DerivedData/" \
  "apps/mobile/ios/public-release/" \
  "*.apk" \
  "*.aab" \
  "*.ipa" \
  "*.xcarchive"; do
  must_contain ".gitignore" "$pattern"
done

generated_artifact_pattern='(^|/)(public-release|beta-artifacts)/|^(apps/mobile/(android|ios)/(build|DerivedData)/|apps/mobile/android/(\.gradle|app/build)/)|\.(dmg|zip|msi|apk|aab|ipa|xcarchive)(/|$)'

if git -C "$ROOT" ls-files | grep -Eq "$generated_artifact_pattern"; then
  fail "generated build/release artifact path is tracked"
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq "^(docs/|AGENTS.md)|$generated_artifact_pattern"; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=mobile-generated-artifact-guard-ready
root_release_artifact_dirs_ignored=true
desktop_package_artifacts_ignored=true
mobile_android_build_outputs_ignored=true
mobile_ios_build_outputs_ignored=true
mobile_public_release_outputs_ignored=true
mobile_package_artifacts_ignored=true
generated_artifacts_tracked=false
generated_artifacts_staged=false
mobile_generated_artifacts_tracked=false
mobile_generated_artifacts_staged=false
docs_or_agents_staged=false
STATUS

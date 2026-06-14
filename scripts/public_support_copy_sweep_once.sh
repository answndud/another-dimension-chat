#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing public support copy sweep text in $file: $text" >&2
    exit 1
  fi
}

reject_pattern() {
  local file="$1"
  local pattern="$2"
  if grep -Eiq -- "$pattern" "$file"; then
    echo "FAIL forbidden public support copy pattern in $file: $pattern" >&2
    exit 1
  fi
}

FILES=(
  "$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
  "$ROOT_DIR/reference/PUBLIC_SUPPORT_TRIAGE.md"
  "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
  "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml"
)

for file in "${FILES[@]}"; do
  [ -f "$file" ] || {
    echo "FAIL missing public support copy sweep input: $file" >&2
    exit 1
  }
done

require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "do not include raw logs in public reports"
require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "Do not include bridge lines in public diagnostics or issues."
require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "원본 로그를 공개 보고에 포함하지 말고"
require_text "$ROOT_DIR/reference/PUBLIC_SUPPORT_TRIAGE.md" "Do not include the envelope payload in this issue."
require_text "$ROOT_DIR/reference/PUBLIC_SUPPORT_TRIAGE.md" "Please copy only the app's Public diagnostics output"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "copy only public diagnostics"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "Copy only the app's redacted Public diagnostics output."
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "Do not include local paths."

for file in "${FILES[@]}"; do
  reject_pattern "$file" "paste only"
  reject_pattern "$file" "do not paste"
  reject_pattern "$file" "paste raw logs"
  reject_pattern "$file" "paste .*payload"
  reject_pattern "$file" "paste .*diagnostics"
  reject_pattern "$file" "send screenshot"
  reject_pattern "$file" "send logs"
  reject_pattern "$file" "attach crash"
  reject_pattern "$file" "share terminal output"
  reject_pattern "$file" "share local path"
done

printf '%s\n' "status=public-support-copy-sweep-ready"
printf '%s\n' "public_support_copy_uses_redacted_diagnostics=true"
printf '%s\n' "raw_logs_requested=false"
printf '%s\n' "payloads_requested=false"
printf '%s\n' "screenshots_requested=false"
printf '%s\n' "local_paths_requested=false"

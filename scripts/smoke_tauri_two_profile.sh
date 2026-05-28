#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/desktop-tauri"

require_contains() {
  local file="$1"
  local pattern="$2"

  if ! grep -Eq -- "$pattern" "$file"; then
    echo "missing expected chat-first UI pattern in $file: $pattern" >&2
    exit 1
  fi
}

require_dist_contains() {
  local pattern="$1"

  if ! grep -REq -- "$pattern" "$APP_DIR/dist"; then
    echo "missing expected chat-first UI pattern in built dist: $pattern" >&2
    exit 1
  fi
}

cd "$APP_DIR"
npm run build

require_contains "$APP_DIR/index.html" 'Alice / Bob room'
require_contains "$APP_DIR/index.html" 'toggle-chat-settings'
require_contains "$APP_DIR/index.html" 'chat-settings-panel'
require_contains "$APP_DIR/index.html" 'Room settings'
require_contains "$APP_DIR/index.html" 'Write message'
require_contains "$APP_DIR/index.html" 'Send'
require_contains "$APP_DIR/src/i18n.js" 'Darkroom chat'
require_contains "$APP_DIR/src/i18n.js" '다크룸 채팅'
require_contains "$APP_DIR/src/i18n.js" 'Room settings'
require_contains "$APP_DIR/src/i18n.js" '방 설정'
require_contains "$APP_DIR/src/i18n.js" 'Write message'
require_contains "$APP_DIR/src/i18n.js" '메시지'
require_contains "$APP_DIR/src/i18n.js" 'Send'
require_contains "$APP_DIR/src/i18n.js" '보내기'
require_contains "$APP_DIR/src/main.js" 'updateMinimalChatMode'
require_contains "$APP_DIR/src/main.js" 'is-chat-active'
require_contains "$APP_DIR/src/styles.css" 'body\.is-chat-active'
require_contains "$APP_DIR/src/styles.css" 'chat-settings-panel'

require_dist_contains 'Alice / Bob room'
require_dist_contains 'Darkroom chat|다크룸 채팅'
require_dist_contains 'Room settings|방 설정'
require_dist_contains 'Write message|메시지'
require_dist_contains 'Send|보내기'
require_dist_contains 'is-chat-active'

echo "Tauri chat-first headless smoke passed"

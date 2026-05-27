#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/desktop-tauri"
LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/another-dimension-tauri-smoke.XXXXXX")"
RESULT_FILE=""
PROFILE_SUFFIX="$(date +%s)$$"
PROFILE_A="smokea${PROFILE_SUFFIX}"
PROFILE_B="smokeb${PROFILE_SUFFIX}"
PASSPHRASE="correctpassphrase${PROFILE_SUFFIX}"
APP_PROCESS="another-dimension-desktop-tauri"
TAURI_PID=""

cleanup() {
  local status=$?
  if [[ -n "$TAURI_PID" ]]; then
    pkill -P "$TAURI_PID" 2>/dev/null || true
    kill "$TAURI_PID" 2>/dev/null || true
    wait "$TAURI_PID" 2>/dev/null || true
  fi
  pkill -f "$APP_DIR/src-tauri/target/debug/$APP_PROCESS" 2>/dev/null || true
  if [[ "$status" -eq 0 ]]; then
    rm -f "$LOG_FILE"
  else
    echo "Tauri smoke log retained at $LOG_FILE" >&2
  fi
  if [[ -n "$RESULT_FILE" ]]; then
    rm -f "$RESULT_FILE"
  fi
}

trap cleanup EXIT

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Tauri two-profile runtime smoke skipped: macOS GUI automation is required"
  exit 0
fi

cd "$APP_DIR"
npm run tauri -- dev >"$LOG_FILE" 2>&1 &
TAURI_PID="$!"

for _ in $(seq 1 90); do
  if osascript -e "tell application \"System Events\" to exists process \"$APP_PROCESS\"" \
    | grep -q true; then
    if osascript -e "tell application \"System Events\" to tell process \"$APP_PROCESS\" to exists window 1" \
      | grep -q true; then
      break
    fi
  fi
  if ! kill -0 "$TAURI_PID" 2>/dev/null; then
    echo "Tauri dev process exited before smoke could run" >&2
    cat "$LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done

if ! osascript -e "tell application \"System Events\" to tell process \"$APP_PROCESS\" to exists window 1" \
  | grep -q true; then
  echo "Tauri app window did not appear before timeout" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

export AD_PROFILE_A="$PROFILE_A"
export AD_PROFILE_B="$PROFILE_B"
export AD_PASSPHRASE="$PASSPHRASE"

osascript >/dev/null <<'APPLESCRIPT'
set profileA to system attribute "AD_PROFILE_A"
set profileB to system attribute "AD_PROFILE_B"
set passphraseText to system attribute "AD_PASSPHRASE"
set previousClipboard to the clipboard
try
  tell application "System Events"
    tell process "another-dimension-desktop-tauri"
      set frontmost to true
      delay 2
      tell scroll area 1 of group 1 of group 1 of window 1
        set value of scroll bar 1 to 0
      end tell
      delay 0.3
      tell group 1 of group "Alice/Bob dev-insecure flow" of group "Another Dimension Chat" of group 1 of UI element 1 of scroll area 1 of group 1 of group 1 of window 1
        repeat with attemptIndex from 1 to 5
          click text field 1
          set focused of text field 1 to true
          delay 0.1
          keystroke "a" using command down
          delay 0.1
          set the clipboard to profileA
          keystroke "v" using command down
          delay 0.2
          if value of text field 1 is profileA then exit repeat
        end repeat
        repeat with attemptIndex from 1 to 5
          click text field 2
          set focused of text field 2 to true
          delay 0.1
          keystroke "a" using command down
          delay 0.1
          set the clipboard to profileB
          keystroke "v" using command down
          delay 0.2
          if value of text field 2 is profileB then exit repeat
        end repeat
        click text field 3
        set focused of text field 3 to true
        delay 0.1
        keystroke "a" using command down
        delay 0.1
        set the clipboard to passphraseText
        keystroke "v" using command down
        delay 0.2
        if value of text field 1 is not profileA then error "profile A field did not receive smoke value"
        if value of text field 2 is not profileB then error "profile B field did not receive smoke value"
        click button "Run two-profile roundtrip"
      end tell
    end tell
  end tell
  set the clipboard to previousClipboard
on error errorMessage number errorNumber
  set the clipboard to previousClipboard
  error errorMessage number errorNumber
end try
APPLESCRIPT

RESULT_FILE="$(mktemp "${TMPDIR:-/tmp}/another-dimension-tauri-smoke-result.XXXXXX")"

for _ in $(seq 1 60); do
  if ! osascript >"$RESULT_FILE" 2>&1 <<'APPLESCRIPT'
tell application "System Events"
  tell process "another-dimension-desktop-tauri"
    tell group 1 of group "Alice/Bob dev-insecure flow" of group "Another Dimension Chat" of group 1 of UI element 1 of scroll area 1 of group 1 of group 1 of window 1
      set collectedText to ""
      repeat with groupIndex from 1 to count of groups
        try
          set collectedText to collectedText & ((value of every static text of group groupIndex) as text) & linefeed
        end try
      end repeat
      repeat with listIndex from 1 to count of lists
        repeat with groupIndex from 1 to count of groups of list listIndex
          try
            set collectedText to collectedText & ((value of every static text of group groupIndex of list listIndex) as text) & linefeed
          end try
        end repeat
      end repeat
      return collectedText
    end tell
  end tell
end tell
APPLESCRIPT
  then
    if ! osascript -e "tell application \"System Events\" to exists process \"$APP_PROCESS\"" \
      | grep -q true; then
      echo "Tauri app process exited during two-profile runtime smoke" >&2
      cat "$RESULT_FILE" >&2
      cat "$LOG_FILE" >&2
      exit 1
    fi
    sleep 1
    continue
  fi
  if grep -q "a=true b=true payloads=true" "$RESULT_FILE" &&
    grep -q "drafts=true handshake=true sender=true receiver=true" "$RESULT_FILE" &&
    grep -q "reserved=true envelope=true inbound=true status=true match=true" "$RESULT_FILE"; then
    break
  fi
  if grep -q "Two-profile roundtrip failed" "$RESULT_FILE"; then
    echo "Tauri two-profile runtime smoke failed" >&2
    cat "$RESULT_FILE" >&2
    cat "$LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done

if ! grep -q "a=true b=true payloads=true" "$RESULT_FILE" ||
  ! grep -q "drafts=true handshake=true sender=true receiver=true" "$RESULT_FILE" ||
  ! grep -q "reserved=true envelope=true inbound=true status=true match=true" "$RESULT_FILE"; then
  echo "Tauri two-profile runtime smoke timed out" >&2
  cat "$RESULT_FILE" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

required_patterns=(
  "a=true b=true payloads=true"
  "drafts=true handshake=true sender=true receiver=true"
  "reserved=true envelope=true inbound=true status=true match=true"
  "plaintext_returned=false"
  "path_returned=false"
  "passphrase_retained=false"
  "key_material=false"
  "network_io=false"
  "transport_io=false"
  "runtime=false"
)

for pattern in "${required_patterns[@]}"; do
  if ! grep -q "$pattern" "$RESULT_FILE"; then
    echo "Tauri two-profile runtime smoke missing expected result: $pattern" >&2
    cat "$RESULT_FILE" >&2
    exit 1
  fi
done

echo "Tauri two-profile runtime smoke passed"

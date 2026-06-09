#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="$ROOT_DIR/apps/desktop-tauri/beta-artifacts"
PACKET_ZIP="$BASE_DIR/phase-az-operator-packet.zip"
PACKET_SHA="$PACKET_ZIP.sha256"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing file: $1" >&2
    exit 1
  fi
}

require_entry() {
  local entry="$1"
  if ! printf '%s\n' "$entries" | grep -Fxq "$entry"; then
    echo "FAIL missing packet entry: $entry" >&2
    exit 1
  fi
}

require_file "$PACKET_ZIP"
require_file "$PACKET_SHA"

(
  cd "$BASE_DIR"
  shasum -a 256 -c "$(basename "$PACKET_SHA")"
)

entries="$(unzip -Z1 "$PACKET_ZIP")"

if printf '%s\n' "$entries" | grep -Eq '(^|/)__MACOSX/|(^|/)\._'; then
  echo "FAIL packet contains macOS resource metadata" >&2
  exit 1
fi

require_entry "phase-az-operator-packet/README.md"
require_entry "phase-az-operator-packet/SEND_TO_PEER_A.md"
require_entry "phase-az-operator-packet/SEND_TO_PEER_B.md"
require_entry "phase-az-operator-packet/INTAKE_COMMANDS.md"
require_entry "phase-az-operator-packet/PEER_DELIVERY_READY_MANIFEST.md"
require_entry "phase-az-operator-packet/RETURN_GUIDE.md"
require_entry "phase-az-operator-packet/OPERATOR_INTAKE_CHECKLIST.md"
require_entry "phase-az-operator-packet/PEER_REPORT_REQUEST_MESSAGE.md"
require_entry "phase-az-operator-packet/PEER_REPORT_TEMPLATE.md"
require_entry "phase-az-operator-packet/peer-delivery-a-ready.zip"
require_entry "phase-az-operator-packet/peer-delivery-a-ready.zip.sha256"
require_entry "phase-az-operator-packet/peer-delivery-b-ready.zip"
require_entry "phase-az-operator-packet/peer-delivery-b-ready.zip.sha256"

if ! unzip -p "$PACKET_ZIP" "phase-az-operator-packet/INTAKE_COMMANDS.md" |
  grep -Fq "scripts/phase_az_status.sh"; then
  echo "FAIL packet intake commands do not mention Phase AZ status gate" >&2
  exit 1
fi

if ! unzip -p "$PACKET_ZIP" "phase-az-operator-packet/INTAKE_COMMANDS.md" |
  grep -Fq "scripts/public_beta_gap_acceptance_once.sh"; then
  echo "FAIL packet intake commands do not mention public beta gap acceptance runner" >&2
  exit 1
fi

echo "operator_packet=$PACKET_ZIP"
echo "status=phase-az-operator-packet-verified"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="$ROOT_DIR/apps/desktop-tauri/beta-artifacts"
PACKET_ZIP="$BASE_DIR/phase-az-operator-packet.zip"
PACKET_SHA="$PACKET_ZIP.sha256"
PEER_A_ZIP="$BASE_DIR/peer-delivery-a-ready.zip"
PEER_A_SHA="$PEER_A_ZIP.sha256"
PEER_B_ZIP="$BASE_DIR/peer-delivery-b-ready.zip"
PEER_B_SHA="$PEER_B_ZIP.sha256"
DISPATCH_SUMMARY="$BASE_DIR/PHASE_AZ_DISPATCH_SUMMARY.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing dispatch input: $1" >&2
    exit 1
  fi
}

"$ROOT_DIR/scripts/prepare_verify_phase_az_operator_packet.sh"

require_file "$PACKET_ZIP"
require_file "$PACKET_SHA"
require_file "$PEER_A_ZIP"
require_file "$PEER_A_SHA"
require_file "$PEER_B_ZIP"
require_file "$PEER_B_SHA"

packet_sha="$(awk '{print $1}' "$PACKET_SHA")"
peer_a_sha="$(awk '{print $1}' "$PEER_A_SHA")"
peer_b_sha="$(awk '{print $1}' "$PEER_B_SHA")"

cat > "$DISPATCH_SUMMARY" <<EOF
# Phase AZ Dispatch Summary

This summary is generated for the operator sending the Phase AZ external
field-test packet. It does not contain peer reports and does not start Phase AZ
intake.

This is an unsigned experimental public beta/internal field-test path. It is
not audited, not production-ready, and sensitive communication prohibited.

## Operator Packet

- File: \`$PACKET_ZIP\`
- SHA-256: \`$packet_sha\`
- Send this packet only to the operator, or unpack it locally and send each peer
  only their matching ready zip and checksum.

## Peer A

- Send: \`$PEER_A_ZIP\`
- Send checksum: \`$PEER_A_SHA\`
- SHA-256: \`$peer_a_sha\`
- Save returned report as: \`docs/peer-field-test-intake/peer-a.md\`

## Peer B

- Send: \`$PEER_B_ZIP\`
- Send checksum: \`$PEER_B_SHA\`
- SHA-256: \`$peer_b_sha\`
- Save returned report as: \`docs/peer-field-test-intake/peer-b.md\`

## After Both Reports Return

If reports are outside the repository:

\`\`\`bash
scripts/phase_az_import_readiness.sh PATH_TO_PEER_A_REPORT PATH_TO_PEER_B_REPORT
scripts/import_and_complete_phase_az_reports.sh PATH_TO_PEER_A_REPORT PATH_TO_PEER_B_REPORT
\`\`\`

If reports are already installed:

\`\`\`bash
scripts/complete_phase_az_peer_intake.sh
\`\`\`

Then run:

\`\`\`bash
scripts/phase_az_status.sh
\`\`\`

Do not create placeholder reports. Do not run broad tests, smoke tests, or full
verification loops as part of dispatch or intake.
EOF

echo "dispatch_summary=$DISPATCH_SUMMARY"
echo "operator_packet=$PACKET_ZIP"
echo "operator_packet_sha256=$packet_sha"
echo "peer_a_zip=$PEER_A_ZIP"
echo "peer_a_sha256=$peer_a_sha"
echo "peer_b_zip=$PEER_B_ZIP"
echo "peer_b_sha256=$peer_b_sha"
echo "status=phase-az-dispatch-ready"

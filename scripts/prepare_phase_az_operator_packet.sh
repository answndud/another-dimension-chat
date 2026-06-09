#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="$ROOT_DIR/apps/desktop-tauri/beta-artifacts"
PACKET_DIR="$BASE_DIR/phase-az-operator-packet"
PACKET_ZIP="$BASE_DIR/phase-az-operator-packet.zip"
PACKET_SHA="$PACKET_ZIP.sha256"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing file: $1" >&2
    exit 1
  fi
}

"$ROOT_DIR/scripts/prepare_peer_delivery_ready_zips.sh"

require_file "$BASE_DIR/peer-delivery-a-ready.zip"
require_file "$BASE_DIR/peer-delivery-a-ready.zip.sha256"
require_file "$BASE_DIR/peer-delivery-b-ready.zip"
require_file "$BASE_DIR/peer-delivery-b-ready.zip.sha256"
require_file "$BASE_DIR/PEER_DELIVERY_READY_MANIFEST.md"
require_file "$ROOT_DIR/docs/peer-field-test-intake/RETURN_GUIDE.md"
require_file "$ROOT_DIR/docs/peer-field-test-intake/OPERATOR_INTAKE_CHECKLIST.md"
require_file "$ROOT_DIR/docs/peer-field-test-intake/PEER_REPORT_REQUEST_MESSAGE.md"
require_file "$ROOT_DIR/docs/peer-field-test-intake/PEER_REPORT_TEMPLATE.md"

rm -rf "$PACKET_DIR"
mkdir -p "$PACKET_DIR"

cp "$BASE_DIR/peer-delivery-a-ready.zip" "$PACKET_DIR/"
cp "$BASE_DIR/peer-delivery-a-ready.zip.sha256" "$PACKET_DIR/"
cp "$BASE_DIR/peer-delivery-b-ready.zip" "$PACKET_DIR/"
cp "$BASE_DIR/peer-delivery-b-ready.zip.sha256" "$PACKET_DIR/"
cp "$BASE_DIR/PEER_DELIVERY_READY_MANIFEST.md" "$PACKET_DIR/"
cp "$ROOT_DIR/docs/peer-field-test-intake/RETURN_GUIDE.md" "$PACKET_DIR/"
cp "$ROOT_DIR/docs/peer-field-test-intake/OPERATOR_INTAKE_CHECKLIST.md" "$PACKET_DIR/"
cp "$ROOT_DIR/docs/peer-field-test-intake/PEER_REPORT_REQUEST_MESSAGE.md" "$PACKET_DIR/"
cp "$ROOT_DIR/docs/peer-field-test-intake/PEER_REPORT_TEMPLATE.md" "$PACKET_DIR/"

peer_a_sha="$(awk '{print $1}' "$BASE_DIR/peer-delivery-a-ready.zip.sha256")"
peer_b_sha="$(awk '{print $1}' "$BASE_DIR/peer-delivery-b-ready.zip.sha256")"

cat > "$PACKET_DIR/SEND_TO_PEER_A.md" <<EOF
# Send To Peer A

Send exactly these two files to peer A:

- \`peer-delivery-a-ready.zip\`
- \`peer-delivery-a-ready.zip.sha256\`

Expected SHA-256:

\`\`\`text
$peer_a_sha
\`\`\`

Tell peer A to open the zip, read \`PEER_REPORT_REQUEST_MESSAGE.md\`, follow
\`PEER_HANDOFF_MESSAGE.md\`, and return only the completed
\`PEER_FIELD_TEST_REPORT.md\` content.

Save the returned report as:

\`\`\`text
docs/peer-field-test-intake/peer-a.md
\`\`\`

Do not accept bridge lines, onion endpoints, invite codes, pairing/envelope
payloads, endpoint payloads, safety phrases, passphrases, profile names, message
text, plaintext, local app data paths, raw logs, or key material.
EOF

cat > "$PACKET_DIR/SEND_TO_PEER_B.md" <<EOF
# Send To Peer B

Send exactly these two files to peer B:

- \`peer-delivery-b-ready.zip\`
- \`peer-delivery-b-ready.zip.sha256\`

Expected SHA-256:

\`\`\`text
$peer_b_sha
\`\`\`

Tell peer B to open the zip, read \`PEER_REPORT_REQUEST_MESSAGE.md\`, follow
\`PEER_HANDOFF_MESSAGE.md\`, and return only the completed
\`PEER_FIELD_TEST_REPORT.md\` content.

Save the returned report as:

\`\`\`text
docs/peer-field-test-intake/peer-b.md
\`\`\`

Do not accept bridge lines, onion endpoints, invite codes, pairing/envelope
payloads, endpoint payloads, safety phrases, passphrases, profile names, message
text, plaintext, local app data paths, raw logs, or key material.
EOF

cat > "$PACKET_DIR/INTAKE_COMMANDS.md" <<'EOF'
# Phase AZ Intake Commands

Use these commands only after both real external peer reports have been
returned. Do not create placeholder reports.

## If Returned Reports Are Outside The Repository

Run:

```bash
scripts/phase_az_import_readiness.sh PATH_TO_PEER_A_REPORT PATH_TO_PEER_B_REPORT
scripts/import_and_complete_phase_az_reports.sh PATH_TO_PEER_A_REPORT PATH_TO_PEER_B_REPORT
```

The readiness command checks source-path and overwrite mistakes without running
the peer validator. The import command validates both files in a temporary
directory, installs them as:

- `docs/peer-field-test-intake/peer-a.md`
- `docs/peer-field-test-intake/peer-b.md`

Then it creates:

- `docs/BETA_FIELD_TEST_RESULTS.md`
- `docs/PEER_FIELD_TEST_BLOCKER.md`

## If Reports Are Already Installed

Run:

```bash
scripts/complete_phase_az_peer_intake.sh
```

## Status After Intake

After intake succeeds, run:

```bash
scripts/phase_az_status.sh
```

For single-machine public beta gap acceptance, run:

```bash
scripts/public_beta_gap_acceptance_once.sh
```

For final security-ready acceptance with real external peer evidence, use
`scripts/final_acceptance_once.sh`.

## Boundary

Both commands fail closed before validation if required report files are
missing. Do not run broad tests, smoke tests, or full verification loops as part
of Phase AZ intake or final acceptance.
EOF

cat > "$PACKET_DIR/README.md" <<'EOF'
# Phase AZ Operator Packet

This packet is for sending external peer delivery files and collecting real
peer reports.

This is not a secure release, not audited, not production-ready, and sensitive
communication prohibited.

## Send

- Send `peer-delivery-a-ready.zip` and `peer-delivery-a-ready.zip.sha256` to peer A.
- Send `peer-delivery-b-ready.zip` and `peer-delivery-b-ready.zip.sha256` to peer B.
- Use `SEND_TO_PEER_A.md` and `SEND_TO_PEER_B.md` as the operator-facing send notes.
- Use `PEER_DELIVERY_READY_MANIFEST.md` to confirm the expected file names and hashes.
- From the repository root, `scripts/phase_az_dispatch_packet.sh` can regenerate
  and verify this packet, then write `PHASE_AZ_DISPATCH_SUMMARY.md` with exact
  send paths and hashes.

## Return

- Save peer A's returned report as `docs/peer-field-test-intake/peer-a.md`.
- Save peer B's returned report as `docs/peer-field-test-intake/peer-b.md`.
- If returned reports are outside the repository, use `INTAKE_COMMANDS.md`.
- Do not create placeholder reports.

## Intake

After both real reports exist, use `INTAKE_COMMANDS.md`.

Do not run intake before both reports exist. Do not check
`docs/FINAL_ACCEPTANCE_CHECKLIST.md` during single-machine public beta gap
acceptance.
EOF

ditto -c -k --norsrc --keepParent "$PACKET_DIR" "$PACKET_ZIP"

(
  cd "$BASE_DIR"
  shasum -a 256 "$(basename "$PACKET_ZIP")" > "$(basename "$PACKET_SHA")"
)

echo "operator_packet_dir=$PACKET_DIR"
echo "operator_packet_zip=$PACKET_ZIP"
echo "operator_packet_sha256_file=$PACKET_SHA"
echo "status=phase-az-operator-packet-ready"

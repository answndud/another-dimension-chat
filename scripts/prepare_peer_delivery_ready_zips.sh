#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="$ROOT_DIR/apps/desktop-tauri/beta-artifacts"
HANDOFF_ZIP="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-field-test-handoff.zip"
HANDOFF_SHA="${HANDOFF_ZIP}.sha256"
READY_MANIFEST="$BASE_DIR/PEER_DELIVERY_READY_MANIFEST.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing file: $1" >&2
    exit 1
  fi
}

require_dir() {
  if [ ! -d "$1" ]; then
    echo "FAIL missing directory: $1" >&2
    exit 1
  fi
}

package_peer() {
  local peer="$1"
  local delivery_dir="$BASE_DIR/peer-delivery-$peer"
  local output_zip="$BASE_DIR/peer-delivery-$peer-ready.zip"
  local output_sha="$output_zip.sha256"

  require_dir "$delivery_dir"
  require_file "$delivery_dir/MANIFEST.md"
  require_file "$delivery_dir/PEER_HANDOFF_MESSAGE.md"
  require_file "$delivery_dir/PEER_REPORT_REQUEST_MESSAGE.md"
  require_file "$delivery_dir/$HANDOFF_ZIP"
  require_file "$delivery_dir/$HANDOFF_SHA"

  ditto -c -k --norsrc --keepParent "$delivery_dir" "$output_zip"

  (
    cd "$BASE_DIR"
    shasum -a 256 "peer-delivery-$peer-ready.zip" > "peer-delivery-$peer-ready.zip.sha256"
  )

  echo "peer=$peer"
  echo "delivery_zip=$output_zip"
  echo "delivery_sha256_file=$output_sha"
}

package_peer a
package_peer b

peer_a_sha="$(awk '{print $1}' "$BASE_DIR/peer-delivery-a-ready.zip.sha256")"
peer_b_sha="$(awk '{print $1}' "$BASE_DIR/peer-delivery-b-ready.zip.sha256")"

cat > "$READY_MANIFEST" <<EOF
# Peer Delivery Ready Manifest

These files are prepared for external Phase AZ field-test peers.

This is not a secure release, not audited, not production-ready, and sensitive
communication prohibited.

## Send To Peer A

- \`peer-delivery-a-ready.zip\`
- \`peer-delivery-a-ready.zip.sha256\`
- SHA-256: \`$peer_a_sha\`
- Returned report path: \`docs/peer-field-test-intake/peer-a.md\`

## Send To Peer B

- \`peer-delivery-b-ready.zip\`
- \`peer-delivery-b-ready.zip.sha256\`
- SHA-256: \`$peer_b_sha\`
- Returned report path: \`docs/peer-field-test-intake/peer-b.md\`

## Boundary

Do not add bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint
payloads, safety phrases, passphrases, profile names, message text, local logs,
or key material to these delivery files.

Do not start Phase AZ validation or summary until both returned reports exist.
EOF

echo "ready_manifest=$READY_MANIFEST"
echo "status=peer-delivery-ready-zips-prepared"

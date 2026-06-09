#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/scripts/prepare_phase_az_operator_packet.sh"
"$ROOT_DIR/scripts/verify_phase_az_operator_packet.sh"
"$ROOT_DIR/scripts/phase_az_status.sh"

echo "status=phase-az-operator-packet-prepared-and-verified"

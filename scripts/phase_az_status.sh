#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT_DIR/docs/peer-field-test-intake"
PEER_A="$REPORT_DIR/peer-a.md"
PEER_B="$REPORT_DIR/peer-b.md"
PACKET_ZIP="$ROOT_DIR/apps/desktop-tauri/beta-artifacts/phase-az-operator-packet.zip"
PACKET_SHA="$PACKET_ZIP.sha256"
DISPATCH_SUMMARY="$ROOT_DIR/apps/desktop-tauri/beta-artifacts/PHASE_AZ_DISPATCH_SUMMARY.md"
RESULTS_FILE="$ROOT_DIR/docs/BETA_FIELD_TEST_RESULTS.md"
BLOCKER_FILE="$ROOT_DIR/docs/PEER_FIELD_TEST_BLOCKER.md"
PLAN_FILE="$ROOT_DIR/docs/PLAN.md"

exists() {
  [ -f "$1" ]
}

echo "phase=AZ"
echo "peer_a_report=$([ -f "$PEER_A" ] && echo present || echo missing)"
echo "peer_b_report=$([ -f "$PEER_B" ] && echo present || echo missing)"
echo "operator_packet=$([ -f "$PACKET_ZIP" ] && echo present || echo missing)"
echo "operator_packet_sha256=$([ -f "$PACKET_SHA" ] && echo present || echo missing)"
echo "dispatch_summary=$([ -f "$DISPATCH_SUMMARY" ] && echo present || echo missing)"
echo "results_file=$([ -f "$RESULTS_FILE" ] && echo present || echo missing)"
echo "blocker_file=$([ -f "$BLOCKER_FILE" ] && echo present || echo missing)"

if ! exists "$PACKET_ZIP" || ! exists "$PACKET_SHA" || ! exists "$DISPATCH_SUMMARY"; then
  echo "status=dispatch-packet-needed"
  echo "next=scripts/phase_az_dispatch_packet.sh"
  exit 0
fi

packet_hash="$(awk '{print $1}' "$PACKET_SHA")"
actual_packet_hash="$(shasum -a 256 "$PACKET_ZIP" | awk '{print $1}')"
summary_hash="$(
  sed -n 's/^- SHA-256: `\([0-9a-f]\{64\}\)`$/\1/p' "$DISPATCH_SUMMARY" |
    head -n 1
)"

echo "operator_packet_sha256_value=$packet_hash"
echo "operator_packet_actual_sha256_value=$actual_packet_hash"
echo "dispatch_summary_packet_sha256_value=${summary_hash:-missing}"

if [ "$actual_packet_hash" != "$packet_hash" ]; then
  echo "status=operator-packet-sha256-stale"
  echo "next=scripts/phase_az_dispatch_packet.sh"
  exit 0
fi

if [ "$summary_hash" != "$packet_hash" ]; then
  echo "status=dispatch-summary-stale"
  echo "next=scripts/phase_az_dispatch_packet.sh"
  exit 0
fi

if grep -Fq "single-machine blocked external evidence gap" "$PLAN_FILE" &&
  ! exists "$PEER_A" && ! exists "$PEER_B"; then
  echo "status=public-beta-release-gate-accepted-with-external-evidence-gap"
  echo "operator_packet_path=$PACKET_ZIP"
  echo "external_delivery_claim=false"
  echo "security_ready_claim=false"
  echo "next=scripts/public_beta_gap_acceptance_once.sh"
  exit 0
fi

if ! exists "$PEER_A" || ! exists "$PEER_B"; then
  echo "status=waiting-for-peer-reports"
  echo "operator_packet_path=$PACKET_ZIP"
  echo "next=send files listed in apps/desktop-tauri/beta-artifacts/PHASE_AZ_DISPATCH_SUMMARY.md, collect real peer-a.md and peer-b.md"
  exit 0
fi

if ! exists "$RESULTS_FILE" && ! exists "$BLOCKER_FILE"; then
  echo "status=ready-for-intake"
  echo "next=scripts/complete_phase_az_peer_intake.sh"
  exit 0
fi

if exists "$RESULTS_FILE" && ! exists "$BLOCKER_FILE"; then
  echo "status=ready-for-blocker-promotion"
  echo "next=node scripts/promote_peer_field_test_blocker.mjs docs/BETA_FIELD_TEST_RESULTS.md docs/PEER_FIELD_TEST_BLOCKER.md"
  exit 0
fi

if ! exists "$RESULTS_FILE" && exists "$BLOCKER_FILE"; then
  echo "status=az-evidence-inconsistent"
  echo "next=inspect docs/PEER_FIELD_TEST_BLOCKER.md and restore docs/BETA_FIELD_TEST_RESULTS.md before closeout"
  exit 0
fi

if ! grep -Fq "### Phase AZ - Real External Onion Delivery Stabilization and Bridge/Censorship Evidence" "$PLAN_FILE"; then
  echo "status=az-docs-closed"
  echo "next=scripts/final_acceptance_once.sh"
  exit 0
fi

echo "status=az-evidence-ready"
echo "next=scripts/final_acceptance_once.sh"

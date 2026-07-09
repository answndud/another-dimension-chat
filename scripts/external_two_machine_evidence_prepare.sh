#!/usr/bin/env bash
set -euo pipefail

cat <<'JSON'
{
  "schema_version": "external-two-machine-evidence-v1",
  "app_version": "0.1.0",
  "build_commit": "redacted-build-commit",
  "platform_pair": "macos-to-windows",
  "checksum_status": "pass",
  "machine_a_report_present": false,
  "machine_b_report_present": false,
  "app_version_match": false,
  "build_commit_match": false,
  "checksum_match": false,
  "invite_created": false,
  "safety_compared": false,
  "outbound_exported": false,
  "inbound_imported": false,
  "retry_cancel_delete_verified": false,
  "broad_failure_class": "not-run-redacted",
  "local_only_rehearsal": false,
  "fabricated_evidence": false
}
JSON

cat >&2 <<'TEXT'
status=external-two-machine-evidence-skeleton
schema=reference/EXTERNAL_TWO_MACHINE_EVIDENCE_SCHEMA.md
external_two_machine_evidence_present=false
stable_candidate_evidence_present=false
allowed_fields=app-version#build-commit#platform-pair#checksum-status#flow-flags#broad-failure-class
forbidden_fields=invite-body#envelope-payload#onion-endpoint#local-path#profile-name#message-body#passphrase#private-key#key-material#raw-logs
local_only_promoted_to_external=false
fabricated_evidence_allowed=false
reliable_delivery_claim_allowed=false
audited_claim_allowed=false
TEXT

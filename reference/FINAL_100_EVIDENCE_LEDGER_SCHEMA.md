# Final 100 Evidence Ledger Schema

Status: final 100 evidence ledger intake is source-ready and currently waiting
for real external evidence. This is not a 100% claim, not production-ready, not
audited, and not permission for sensitive communication.

The ledger is the operator handoff format for the final evidence bundle that
would be required before `reference/FINAL_100_CLAIM_GATE.md` can move out of
hold. Candidate ledgers should live under ignored/private evidence paths such as
`docs/final-100-evidence/` and must not include private payloads, local paths,
raw logs, passphrases, keys, invite codes, endpoints, or generated artifacts.

## Required Evidence Groups

Each ledger uses `schema_version=final-100-evidence-ledger-v1` and must include:

- macOS signed/notarized/stapled artifact evidence, DMG-contained app
  codesign/Gatekeeper/source-match evidence, release distribution manifest
  evidence, clean Gatekeeper open evidence, and representative usability
  evidence.
- Windows real runtime and public artifact evidence.
- Android real device and APK/AAB artifact evidence.
- iOS real device and IPA/TestFlight artifact evidence.
- Core security, key/storage, default transport, external review/audit, and
  repeated field evidence.
- Claim discipline proving public wording has not been promoted ahead of
  evidence.

The ledger must also bind each claim group to child evidence files by relative
path and SHA-256. Absolute paths, parent-directory traversal, missing files,
SHA mismatches, and forbidden private/local-only child evidence content are
rejected. macOS representative usability child reports must also pass
`scripts/validate_representative_usability_reports.mjs` as a candidate report
set before the final ledger can be accepted. The validator can be run with
`--require-current-head` or `AD_REQUIRE_CURRENT_HEAD=1` when the evidence bundle
must match the checked-out commit.

Passing this validator only produces a candidate-for-review status. It never
sets public claims true by itself.

## Current Gate Flags

- final_100_evidence_ledger_schema_available=true
- final_100_evidence_ledger_validator_available=true
- final_100_evidence_ledger_waiting_for_real_inputs=true
- final_100_evidence_ledger_rejects_fabricated_or_local_only=true
- final_100_evidence_ledger_rejects_private_material=true
- final_100_evidence_ledger_requires_child_evidence_files=true
- final_100_evidence_ledger_child_files_sha_verified=true
- final_100_evidence_ledger_child_files_content_redacted=true
- final_100_evidence_ledger_requires_valid_representative_usability_reports=true
- final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true
- final_100_evidence_candidate_requires_owner_claim_decision=true
- macos_public_app_100_claim_allowed=false
- whole_target_standard_100_claim_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false

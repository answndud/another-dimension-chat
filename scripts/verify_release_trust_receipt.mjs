#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const REQUIRED = [
  "record_type", "event_id", "recorded_at_utc", "bootstrap_key_id", "bootstrap_spki_sha256",
  "release_key_id", "release_spki_sha256", "trust_manifest_minimum_version", "release_version_range",
  "channel_a", "channel_b", "matched_byte_for_byte", "verifier_command", "verification_result",
  "operator_initials", "reviewer_required", "external_evidence_reference", "notes",
];
const VERSION = /^\d+\.\d+\.\d+$/;
const HEX32 = /^[0-9a-f]{32}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const SAFE = /^[A-Za-z0-9._:/+@ ()_<>==?-]+$/;

export function parseReceipt(text) {
  const values = {};
  for (const [lineNumber, line] of String(text).split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator <= 0) throw new Error(`receipt line ${lineNumber + 1} is not key: value`);
    const key = line.slice(0, separator).trim();
    if (values[key] !== undefined) throw new Error(`receipt field is duplicated: ${key}`);
    values[key] = line.slice(separator + 1).trim();
  }
  return values;
}

export function verifyReceipt(receipt) {
  for (const field of REQUIRED) if (!receipt?.[field]) throw new Error(`receipt field is missing: ${field}`);
  if (receipt.record_type !== "release-trust-bootstrap-ack-v1") throw new Error("unsupported trust receipt format");
  if (!/^[-A-Za-z0-9_]{8,80}$/.test(receipt.event_id)) throw new Error("receipt event_id is invalid");
  if (Number.isNaN(Date.parse(receipt.recorded_at_utc))) throw new Error("receipt timestamp is invalid");
  if (!HEX32.test(receipt.bootstrap_key_id) || !HEX64.test(receipt.bootstrap_spki_sha256)) throw new Error("bootstrap fingerprint is invalid");
  if (!HEX32.test(receipt.release_key_id) || !HEX64.test(receipt.release_spki_sha256)) throw new Error("release fingerprint is invalid");
  if (!VERSION.test(receipt.trust_manifest_minimum_version)) throw new Error("trust manifest version is invalid");
  if (!SAFE.test(receipt.release_version_range) || !SAFE.test(receipt.channel_a) || !SAFE.test(receipt.channel_b)) throw new Error("receipt contains unsafe free-form data");
  if (receipt.channel_a === receipt.channel_b) throw new Error("receipt channels must be distinct");
  if (receipt.matched_byte_for_byte !== "true") throw new Error("fingerprints were not matched byte-for-byte");
  if (receipt.verification_result !== "passed") throw new Error(`receipt verification result is not passed: ${receipt.verification_result}`);
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(receipt.operator_initials)) throw new Error("operator initials are invalid");
  if (!/^(true|false)$/.test(receipt.reviewer_required)) throw new Error("reviewer_required must be true or false");
  if (!/^external[-_][A-Za-z0-9._-]{3,120}$/.test(receipt.external_evidence_reference)) throw new Error("external evidence reference is required");
  if (!SAFE.test(receipt.verifier_command) || !SAFE.test(receipt.notes)) throw new Error("receipt contains unsafe notes or command");
  return { eventId: receipt.event_id, bootstrapKeyId: receipt.bootstrap_key_id, releaseKeyId: receipt.release_key_id, externalEvidenceReference: receipt.external_evidence_reference };
}

function fixture() {
  const receipt = parseReceipt(`record_type: release-trust-bootstrap-ack-v1
event_id: fixture-event-01
recorded_at_utc: 2026-08-03T00:00:00Z
bootstrap_key_id: ${"a".repeat(32)}
bootstrap_spki_sha256: ${"b".repeat(64)}
release_key_id: ${"c".repeat(32)}
release_spki_sha256: ${"d".repeat(64)}
trust_manifest_minimum_version: 0.1.0
release_version_range: >=0.1.0 <1.0.0
channel_a: offline-record-A
channel_b: voice-record-B
matched_byte_for_byte: true
verifier_command: verify_release_trust.mjs
verification_result: passed
operator_initials: fixture
reviewer_required: true
external_evidence_reference: external-fixture-record
notes: redacted fixture only`);
  assert.equal(verifyReceipt(receipt).externalEvidenceReference, "external-fixture-record");
  assert.throws(() => verifyReceipt({ ...receipt, external_evidence_reference: "" }), /external_evidence_reference/);
  assert.throws(() => verifyReceipt({ ...receipt, channel_b: receipt.channel_a }), /distinct/);
  assert.throws(() => verifyReceipt({ ...receipt, verification_result: "blocked" }), /not passed/);
  console.log("release trust receipt fixture passed: redacted shape -> missing external evidence -> duplicate channel -> blocked result rejection");
}

const launchedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (launchedDirectly && process.argv[2] === "--fixture") fixture();
else if (launchedDirectly) {
  const receiptPath = process.argv[2];
  if (!receiptPath) throw new Error("Usage: verify_release_trust_receipt.mjs --fixture | RECEIPT_FILE");
  const result = verifyReceipt(parseReceipt(await readFile(receiptPath, "utf8")));
  console.log(`release trust receipt shape passed: event=${result.eventId}, externalEvidence=${result.externalEvidenceReference}; independent channel evidence remains external`);
}

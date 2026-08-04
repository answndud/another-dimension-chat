#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: verify_openmls_storage_contract.mjs OPENMLS_TRAITS_STORAGE_RS");
const source = await readFile(sourcePath, "utf8");
const methods = [...source.matchAll(/^    fn ([a-z0-9_]+)</gm)].map((match) => match[1]);
const required = [
  "write_mls_join_config", "append_own_leaf_node", "queue_proposal", "write_tree",
  "write_interim_transcript_hash", "write_context", "write_confirmation_tag", "write_group_state",
  "write_message_secrets", "write_resumption_psk_store", "write_own_leaf_index", "write_group_epoch_secrets",
  "write_signature_key_pair", "write_encryption_key_pair", "write_encryption_epoch_key_pairs",
  "write_key_package", "write_psk", "mls_group_join_config", "own_leaf_nodes", "queued_proposal_refs",
  "queued_proposals", "tree", "group_context", "interim_transcript_hash", "confirmation_tag",
  "group_state", "message_secrets", "resumption_psk_store", "own_leaf_index", "group_epoch_secrets",
  "signature_key_pair", "encryption_key_pair", "encryption_epoch_key_pairs", "key_package", "psk",
  "remove_proposal", "delete_own_leaf_nodes", "delete_group_config", "delete_tree",
  "delete_confirmation_tag", "delete_group_state", "delete_context", "delete_interim_transcript_hash",
  "delete_message_secrets", "delete_all_resumption_psk_secrets", "delete_own_leaf_index",
  "delete_group_epoch_secrets", "clear_proposal_queue", "delete_signature_key_pair",
  "delete_encryption_key_pair", "delete_encryption_epoch_key_pairs", "delete_key_package", "delete_psk",
];
for (const method of required) assert.ok(methods.includes(method), `missing OpenMLS storage method: ${method}`);
assert.equal(new Set(methods).size, methods.length, "duplicate OpenMLS storage method detected");
assert.ok(source.includes("pub const CURRENT_VERSION: u16 = 1;"), "unexpected OpenMLS storage version");
console.log(`OpenMLS storage contract passed: ${methods.length} methods, CURRENT_VERSION=1`);

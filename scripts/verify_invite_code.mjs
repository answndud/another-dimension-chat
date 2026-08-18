#!/usr/bin/env node
import assert from "node:assert/strict";
import { createInviteCode, consumeInviteCode, inviteCodeHash, normalizeInviteCode, revokeInviteCode } from "../apps/server/invite-code.mjs";

const invite = `ADWEB3.${Buffer.from(JSON.stringify({ v: 3, inviteId: "fixture", signature: "redacted", server: { inboxUrl: "https://relay.example/api/v1/inbox/fixture" } })).toString("base64url")}`;
const created = createInviteCode({ invite, now: 1_000, ttlMs: 60_000 });
assert.match(created.code, /^(?:[0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{2}$/);
assert.equal(created.record.codeHash, inviteCodeHash(created.code));
assert.notEqual(created.record.codeHash, created.code);
assert.equal(normalizeInviteCode(created.code.replaceAll("-", " ")), normalizeInviteCode(created.code));

const records = [created.record];
const consumed = consumeInviteCode(records, created.code, 1_001);
assert.equal(consumed.ok, true);
assert.equal(consumed.record.invite, invite);
assert.equal(records.length, 1);
assert.equal(records[0].consumedAt, 1_001);
assert.equal(consumeInviteCode(records, created.code, 1_002).ok, false, "replay must fail");

const expired = createInviteCode({ invite, now: 2_000, ttlMs: 1_000 });
assert.equal(consumeInviteCode([expired.record], expired.code, 3_000).ok, false, "expired code must fail");
assert.equal(consumeInviteCode([expired.record], "0000-0000-0000-0000-0000-0000-00", 2_001).ok, false, "wrong code must fail");
assert.throws(() => createInviteCode({ invite: "not-an-invite", now: 1_000 }), /invalid_signed_invite/);

// Revoke is fail-closed: a revoked code can no longer be consumed, and a
// second revoke or an unknown code is rejected without revealing existence.
const revokeRecords = [];
const revocable = createInviteCode({ invite, now: 4_000, ttlMs: 60_000 });
revokeRecords.push(revocable.record);
assert.equal(revokeInviteCode(revokeRecords, revocable.code, 4_001).ok, true, "owner revoke of an active code must succeed");
assert.equal(consumeInviteCode(revokeRecords, revocable.code, 4_002).ok, false, "revoked code must fail consumption");
assert.equal(revokeInviteCode(revokeRecords, revocable.code, 4_003).ok, false, "second revoke of a removed code must fail");
assert.equal(revokeInviteCode(revokeRecords, "0000-0000-0000-0000-0000-0000-00", 4_004).ok, false, "revoke of an unknown code must fail");
const neverCreated = createInviteCode({ invite, now: 5_000, ttlMs: 60_000 });
assert.equal(revokeInviteCode(revokeRecords, neverCreated.code, 5_001).ok, false, "revoke of a never-published code must fail");
console.log("invite code verification passed: CSPRNG format, hash-only record, binding, expiry, single-use, and owner revoke rejection");

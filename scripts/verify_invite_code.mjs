#!/usr/bin/env node
import assert from "node:assert/strict";
import { createInviteCode, consumeInviteCode, inviteCodeHash, normalizeInviteCode } from "../apps/server/invite-code.mjs";

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
console.log("invite code verification passed: CSPRNG format, hash-only record, binding, expiry, and single-use rejection");

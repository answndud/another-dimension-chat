import { createHash, randomBytes } from "node:crypto";
import { createPublicKey, verify } from "node:crypto";

// Crockford-style alphabet without visually confusing I, L, O, or U.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 26;
const CODE_GROUP_SIZE = 4;
export const DEFAULT_INVITE_CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000;
export const INVITE_CODE_FORMAT = /^([0-9A-HJKMNP-TV-Z]{4}-?){6}[0-9A-HJKMNP-TV-Z]{2}$/;
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function randomCode() {
  const output = [];
  while (output.length < CODE_LENGTH) {
    for (const byte of randomBytes(32)) {
      // Reject the remainder so each alphabet symbol has equal probability.
      if (byte >= 224) continue;
      output.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
      if (output.length === CODE_LENGTH) break;
    }
  }
  return output.join("");
}

export function normalizeInviteCode(value) {
  const normalized = String(value || "").trim().replace(/[\s-]/g, "").toUpperCase();
  if (normalized.length !== CODE_LENGTH || ![...normalized].every((char) => CODE_ALPHABET.includes(char))) {
    throw new Error("invalid_invite_code");
  }
  return normalized;
}

export function formatInviteCode(value) {
  const normalized = normalizeInviteCode(value);
  return Array.from({ length: Math.ceil(CODE_LENGTH / CODE_GROUP_SIZE) }, (_, index) => normalized.slice(index * CODE_GROUP_SIZE, (index + 1) * CODE_GROUP_SIZE)).join("-");
}

export function inviteCodeHash(value) {
  return createHash("sha256").update(normalizeInviteCode(value), "utf8").digest("hex");
}

export function invitePayloadDigest(invite) {
  return createHash("sha256").update(invite, "utf8").digest("hex");
}

export function validateDaemonInvite(invite, expectedRelayOrigin, now = Date.now()) {
  if (typeof invite !== "string" || !invite.startsWith("ADDAINV1.")) throw new Error("invalid_signed_invite");
  const parts = invite.split(".");
  if (parts.length !== 3) throw new Error("invalid_signed_invite");
  if (!/^(?:[0-9a-f]{2})+$/.test(parts[1]) || !/^[0-9a-f]{128}$/.test(parts[2])) throw new Error("invalid_signed_invite");
  const payload = Buffer.from(parts[1], "hex");
  const signature = Buffer.from(parts[2], "hex");
  const lines = payload.toString("utf8").split("\n");
  if (![6, 7].includes(lines.length) || lines[0] !== "another-dimension/invite/v1") throw new Error("invalid_signed_invite");
  const accountId = lines[1];
  const publicKeyHex = accountId.startsWith("ad1pk") ? accountId.slice("ad1pk".length) : "";
  if (!/^[0-9a-f]{64}$/.test(publicKeyHex) || signature.length !== 64 || !/^[0-9a-f]{64}$/.test(lines[3])) throw new Error("invalid_signed_invite");
  const expiresAt = Number(lines[4]);
  // Daemon invite payloads use Unix seconds; relay-local invite records use ms.
  // Normalize only the comparison boundary so the signed wire format stays stable.
  const expiryNow = expiresAt < 1_000_000_000_000 ? Math.floor(now / 1000) : now;
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= expiryNow) throw new Error("signed_invite_expired");
  let relayOrigin;
  try { relayOrigin = new URL(lines[5]).origin; } catch { throw new Error("signed_invite_relay_binding_missing"); }
  if (relayOrigin !== expectedRelayOrigin) throw new Error("signed_invite_relay_binding_mismatch");
  if (lines.length === 7 && lines[6]) {
    let inbox;
    try { inbox = new URL(lines[6]); } catch { throw new Error("signed_invite_inbox_binding_invalid"); }
    const capability = inbox.pathname.split("/").at(-1);
    if (inbox.origin !== relayOrigin || !inbox.pathname.startsWith("/api/v1/inbox/") || !CAPABILITY_PATTERN.test(capability || "") || inbox.search || inbox.hash) {
      throw new Error("signed_invite_inbox_binding_invalid");
    }
  }
  const publicKeyDer = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKeyHex, "hex")]);
  const publicKey = createPublicKey({ key: publicKeyDer, format: "der", type: "spki" });
  if (!verify(null, payload, publicKey, signature)) throw new Error("invalid_signed_invite_signature");
  return true;
}

function advertisedRelayOrigin(invite) {
  if (invite.startsWith("ADDAINV1.")) {
    try {
      const payloadHex = invite.split(".")[1];
      const payload = Buffer.from(payloadHex, "hex").toString("utf8").split("\n");
      const url = new URL(payload[5]);
      return url.origin;
    } catch { throw new Error("signed_invite_relay_binding_missing"); }
  }
  try {
    const payload = JSON.parse(Buffer.from(invite.slice("ADWEB3.".length), "base64url").toString("utf8"));
    const url = new URL(payload?.server?.inboxUrl);
    return url.origin;
  } catch { throw new Error("signed_invite_relay_binding_missing"); }
}

export function createInviteCode({ invite, expectedRelayOrigin = "", now = Date.now(), ttlMs = DEFAULT_INVITE_CODE_TTL_MS } = {}) {
  if (typeof invite !== "string" || !(invite.startsWith("ADWEB3.") || invite.startsWith("ADDAINV1.")) || invite.length > 96 * 1024) {
    throw new Error("invalid_signed_invite");
  }
  if (expectedRelayOrigin && advertisedRelayOrigin(invite) !== expectedRelayOrigin) throw new Error("signed_invite_relay_binding_mismatch");
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_INVITE_CODE_TTL_MS) {
    throw new Error("invalid_invite_code_ttl");
  }
  const code = randomCode();
  return {
    code: formatInviteCode(code),
    record: {
      version: 1,
      codeHash: inviteCodeHash(code),
      invite,
      inviteDigest: invitePayloadDigest(invite),
      createdAt: now,
      expiresAt: now + ttlMs,
    },
  };
}

export function purgeInviteCodes(records, now = Date.now()) {
  return records.filter((record) => (
    record?.version === 1
    && typeof record.codeHash === "string"
    && /^[a-f0-9]{64}$/.test(record.codeHash)
    && typeof record.invite === "string"
    && typeof record.inviteDigest === "string"
    && Number.isSafeInteger(record.createdAt)
    && Number.isSafeInteger(record.expiresAt)
    && record.expiresAt > now
  ));
}

export function consumeInviteCode(records, suppliedCode, now = Date.now()) {
  let hash;
  try { hash = inviteCodeHash(suppliedCode); } catch { return { ok: false, reason: "invalid_or_expired" }; }
  const index = records.findIndex((record) => record.codeHash === hash && record.expiresAt > now);
  if (index < 0) return { ok: false, reason: "invalid_or_expired" };
  const [record] = records.splice(index, 1);
  return { ok: true, record };
}

export function revokeInviteCode(records, suppliedCode, now = Date.now()) {
  let hash;
  try { hash = inviteCodeHash(suppliedCode); } catch { return { ok: false, reason: "invalid_or_expired" }; }
  const index = records.findIndex((record) => record.codeHash === hash && record.expiresAt > now);
  if (index < 0) return { ok: false, reason: "invalid_or_expired" };
  records.splice(index, 1);
  return { ok: true };
}

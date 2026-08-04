import { createHash, randomBytes } from "node:crypto";

// Crockford-style alphabet without visually confusing I, L, O, or U.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 26;
const CODE_GROUP_SIZE = 4;
export const DEFAULT_INVITE_CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000;
export const INVITE_CODE_FORMAT = /^([0-9A-HJKMNP-TV-Z]{4}-?){6}[0-9A-HJKMNP-TV-Z]{2}$/;

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

import initCrypto, {
  initSync as initCryptoSync,
  olm_account_new,
  olm_inbound_accept,
  olm_outbound_finish,
  olm_outbound_start,
  olm_session_decrypt,
  olm_session_encrypt,
  safety_material,
} from "./generated/ad_crypto.js";

const DB_NAME = "another-dimension-web-v3";
const DB_VERSION = 1;
const INVITE_PREFIX = "ADWEB3.";
const ENVELOPE_PREFIX = "ADENVWEB3.";
const MAX_ENVELOPE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const profileNames = [];
let activeProfile = null;
let localInfoCache = null;

const cryptoReady = (() => {
  if (globalThis.__AD_CRYPTO_WASM_BYTES__) {
    initCryptoSync({ module: globalThis.__AD_CRYPTO_WASM_BYTES__ });
    return Promise.resolve();
  }
  return initCrypto();
})();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "name" });
      if (!db.objectStoreNames.contains("messages")) db.createObjectStore("messages", { keyPath: "id" });
      if (!db.objectStoreNames.contains("seen")) db.createObjectStore("seen", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser storage could not be opened."));
  });
}

function request(store, method, value) {
  return new Promise((resolve, reject) => {
    const req = store[method](value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Browser storage operation failed."));
  });
}

async function read(storeName, key) {
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readonly").objectStore(storeName), "get", key); } finally { db.close(); }
}

async function write(storeName, value) {
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readwrite").objectStore(storeName), "put", value); } finally { db.close(); }
}

async function all(storeName) {
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readonly").objectStore(storeName), "getAll"); } finally { db.close(); }
}

function bytesToBase64(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64ToBytes(value) {
  const padded = String(value).replaceAll("-", "+").replaceAll("_", "/") + "===".slice((String(value).length + 3) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function encode(value) { return bytesToBase64(new TextEncoder().encode(JSON.stringify(value))); }
function decode(value) { return JSON.parse(new TextDecoder().decode(base64ToBytes(value))); }

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function validInboxUrl(value) {
  if (!value) return null;
  let url;
  try { url = new URL(String(value)); } catch { throw new Error("Server endpoint is not a valid URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash || !url.pathname.includes("/api/v1/inbox/")) {
    throw new Error("Server endpoint must be an HTTP(S) capability inbox URL.");
  }
  return url.href;
}

async function localServerInfo() {
  if (localInfoCache) return localInfoCache;
  try {
    const localAccess = new URLSearchParams(globalThis.location?.hash?.slice(1) || "").get("local");
    if (!localAccess) return null;
    const response = await fetch("/api/v1/info", { headers: { accept: "application/json", "x-ad-local-access": localAccess } });
    if (!response.ok) return null;
    const info = await response.json();
    localInfoCache = { ...info, inboxUrl: validInboxUrl(info.inboxUrl), localAccess };
    return localInfoCache;
  } catch { return null; }
}

export async function getLocalServerInfo() { return localServerInfo(); }

async function wrappingKey(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function sealWithKey(material, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(material)));
  return { salt: bytesToBase64(salt), iv: bytesToBase64(iv), sealed: bytesToBase64(sealed) };
}

async function sealPrivateMaterial(material, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await wrappingKey(passphrase, salt);
  return { ...(await sealWithKey(material, key, salt)), wrappingKey: key };
}

async function openPrivateMaterial(record, passphrase) {
  const salt = base64ToBytes(record.salt);
  const key = await wrappingKey(passphrase, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(record.iv) }, key, base64ToBytes(record.sealed));
    return { material: JSON.parse(new TextDecoder().decode(plain)), wrappingKey: key };
  } catch { throw new Error("Wrong passphrase or damaged local profile."); }
}

function storedProfile(profile) {
  return {
    name: profile.name,
    ecdsaPublic: profile.ecdsaPublic,
    olmEd25519Public: profile.olmEd25519Public,
    olmCurve25519Public: profile.olmCurve25519Public,
    olmOneTimePublic: profile.olmOneTimePublic,
    salt: profile.salt,
    iv: profile.iv,
    sealed: profile.sealed,
    peer: profile.peer || null,
    selfInviteBody: profile.selfInviteBody || null,
    createdAt: profile.createdAt,
  };
}

async function persistPrivateProfile() {
  const sealed = await sealWithKey(activeProfile.privateMaterial, activeProfile.wrappingKey, base64ToBytes(activeProfile.salt));
  Object.assign(activeProfile, sealed);
  await write("profiles", storedProfile(activeProfile));
}

async function persistPublicProfile() {
  await write("profiles", storedProfile(activeProfile));
}

function ensureCrypto() {
  if (globalThis.isSecureContext === false || !globalThis.crypto?.subtle) throw new Error("A secure browser context (HTTPS or localhost) is required for Web Crypto.");
}

export const ready = (async () => {
  await cryptoReady;
  const records = await all("profiles").catch(() => []);
  profileNames.splice(0, profileNames.length, ...records.map((record) => record.name).sort());
})();

export function listProfiles() { return [...profileNames]; }

export async function createProfile(name, passphrase) {
  ensureCrypto();
  await cryptoReady;
  if (!/^[A-Za-z0-9_-]+$/.test(String(name)) || String(name).length > 48) throw new Error("Use letters, numbers, hyphen, or underscore for the profile name.");
  if (String(passphrase).length < 10) throw new Error("Use a passphrase of at least 10 characters.");
  if (await read("profiles", name)) throw new Error("That local profile already exists.");
  const ecdsa = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const olm = JSON.parse(olm_account_new());
  const ecdsaPublic = await crypto.subtle.exportKey("jwk", ecdsa.publicKey);
  const privateMaterial = {
    ecdsaPrivate: await crypto.subtle.exportKey("jwk", ecdsa.privateKey),
    olmAccountPickle: olm.accountPickle,
    session: null,
  };
  const { wrappingKey: profileWrappingKey, ...sealed } = await sealPrivateMaterial(privateMaterial, passphrase);
  const record = {
    name: String(name),
    ecdsaPublic,
    olmEd25519Public: olm.ed25519Public,
    olmCurve25519Public: olm.curve25519Public,
    olmOneTimePublic: olm.oneTimePublic,
    ...sealed,
    peer: null,
    selfInviteBody: null,
    createdAt: Date.now(),
  };
  await write("profiles", record);
  profileNames.push(record.name);
  activeProfile = {
    ...record,
    ecdsaPrivate: ecdsa.privateKey,
    wrappingKey: profileWrappingKey,
    privateMaterial,
  };
  return activeProfile;
}

export async function unlockProfile(name, passphrase) {
  ensureCrypto();
  await cryptoReady;
  const record = await read("profiles", name);
  if (!record) throw new Error("Local profile not found.");
  const { material, wrappingKey: profileWrappingKey } = await openPrivateMaterial(record, passphrase);
  const ecdsaPrivate = await crypto.subtle.importKey("jwk", material.ecdsaPrivate, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  activeProfile = {
    ...record,
    ecdsaPrivate,
    wrappingKey: profileWrappingKey,
    privateMaterial: material,
  };
  return activeProfile;
}

export function lockProfile() { activeProfile = null; }

async function selfInviteBody() {
  const info = await localServerInfo();
  const body = {
    v: 3,
    name: activeProfile.name,
    ecdsaPublic: activeProfile.ecdsaPublic,
    olmEd25519Public: activeProfile.olmEd25519Public,
    olmCurve25519Public: activeProfile.olmCurve25519Public,
    olmOneTimePublic: activeProfile.olmOneTimePublic,
    messageProtocol: "Olm.v2.Curve25519-AES-SHA2",
    ...(info ? { server: { inboxUrl: info.inboxUrl, protocol: info.protocol } } : {}),
  };
  activeProfile.selfInviteBody = body;
  await persistPublicProfile();
  return body;
}

export async function exportInvite() {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  const body = await selfInviteBody();
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, activeProfile.ecdsaPrivate, new TextEncoder().encode(canonical(body)));
  return `${INVITE_PREFIX}${encode({ ...body, signature: bytesToBase64(signature) })}`;
}

function participantKey(participant) {
  return canonical({
    ecdsaPublic: participant.ecdsaPublic,
    olmCurve25519Public: participant.olmCurve25519Public,
  });
}

function sessionTranscript(local, peer) {
  const participants = [local, peer]
    .map((participant) => ({
      name: participant.name,
      ecdsaPublic: participant.ecdsaPublic,
      olmEd25519Public: participant.olmEd25519Public,
      olmCurve25519Public: participant.olmCurve25519Public,
      olmOneTimePublic: participant.olmOneTimePublic,
      server: participant.server || null,
    }))
    .sort((left, right) => participantKey(left).localeCompare(participantKey(right)));
  return `AD-OLM-SESSION-V3|${canonical(participants)}`;
}

async function signedEnvelope(type, payload) {
  const body = {
    v: 3,
    type,
    id: crypto.randomUUID(),
    from: activeProfile.name,
    to: activeProfile.peer.name,
    createdAt: Date.now(),
    payload,
  };
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, activeProfile.ecdsaPrivate, new TextEncoder().encode(canonical(body)));
  return `${ENVELOPE_PREFIX}${encode({ ...body, signature: bytesToBase64(signature) })}`;
}

async function flushPendingEnvelope() {
  const session = activeProfile?.privateMaterial?.session;
  if (!session?.pendingEnvelope || !activeProfile.peer?.server?.inboxUrl) return false;
  const response = await fetch(activeProfile.peer.server.inboxUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ envelope: session.pendingEnvelope }),
  });
  if (!response.ok) return false;
  session.pendingEnvelope = null;
  await persistPrivateProfile();
  return true;
}

async function initializeOlmSession() {
  const local = activeProfile.selfInviteBody || await selfInviteBody();
  const peer = activeProfile.peer;
  const localKey = participantKey(local);
  const peerKey = participantKey(peer);
  if (localKey === peerKey) throw new Error("Peer identity collides with this profile.");
  const role = localKey < peerKey ? "initiator" : "responder";
  const session = {
    role,
    status: role === "initiator" ? "init-sent" : "waiting-init",
    transcript: sessionTranscript(local, peer),
    safetyVerified: false,
    pendingEnvelope: null,
  };
  activeProfile.privateMaterial.session = session;
  if (role === "initiator") {
    const init = JSON.parse(olm_outbound_start(
      activeProfile.privateMaterial.olmAccountPickle,
      peer.olmCurve25519Public,
      peer.olmOneTimePublic,
      session.transcript,
    ));
    session.sessionPickle = init.sessionPickle;
    session.pendingEnvelope = await signedEnvelope("olm-init", init.message);
  }
  await persistPrivateProfile();
  await flushPendingEnvelope().catch(() => false);
}

export async function importInvite(value) {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  if (activeProfile.peer) throw new Error("This profile is already paired. Create a fresh profile to pair with someone else.");
  const text = String(value || "").trim();
  if (!text.startsWith(INVITE_PREFIX)) throw new Error("This is not a valid Olm web invite.");
  const invite = decode(text.slice(INVITE_PREFIX.length));
  const { signature, ...body } = invite;
  if (body.server) body.server = { ...body.server, inboxUrl: validInboxUrl(body.server.inboxUrl) };
  const olmKey = /^[A-Za-z0-9+/]{43}$/;
  if (
    !olmKey.test(body.olmEd25519Public)
    || !olmKey.test(body.olmCurve25519Public)
    || !olmKey.test(body.olmOneTimePublic)
    || body.messageProtocol !== "Olm.v2.Curve25519-AES-SHA2"
  ) throw new Error("Invite Olm setup material is invalid.");
  const publicKey = await crypto.subtle.importKey("jwk", body.ecdsaPublic, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, base64ToBytes(signature), new TextEncoder().encode(canonical(body)));
  if (!valid || body.v !== 3 || body.name === activeProfile.name) throw new Error("Invite signature or peer identity is invalid.");
  activeProfile.peer = body;
  await initializeOlmSession();
  return body;
}

export function safetyPhrase(local, peer) {
  if (!local?.selfInviteBody || !peer) return "Olm session setup is not ready.";
  return `${safety_material(sessionTranscript(local.selfInviteBody, peer))} · compare over a trusted channel`;
}

export function getSessionStatus() {
  return activeProfile?.privateMaterial?.session?.status || "not-paired";
}

export function isSafetyVerified() {
  return activeProfile?.privateMaterial?.session?.safetyVerified === true;
}

export async function confirmSafetyVerification(material) {
  const session = activeProfile?.privateMaterial?.session;
  if (!session || !activeProfile.peer) throw new Error("Pair with a peer before verifying safety material.");
  if (String(material || "").trim() !== safetyPhrase(activeProfile.selfInviteBody, activeProfile.peer)) {
    throw new Error("Safety material does not match. Compare the complete phrase over a trusted channel.");
  }
  session.safetyVerified = true;
  await persistPrivateProfile();
}

export function getPendingEnvelope() {
  return activeProfile?.privateMaterial?.session?.pendingEnvelope || "";
}

export async function confirmPendingEnvelopeDelivered() {
  const session = activeProfile?.privateMaterial?.session;
  if (session?.status !== "ready" || !session.pendingEnvelope) {
    throw new Error("There is no final handshake envelope awaiting manual delivery.");
  }
  session.pendingEnvelope = null;
  await persistPrivateProfile();
}

function envelopeIdFromValue(value) {
  return decode(String(value).slice(ENVELOPE_PREFIX.length)).id;
}

async function recordSentEnvelope(envelope, text) {
  const envelopeId = envelopeIdFromValue(envelope);
  await write("messages", { id: `${activeProfile.name}:${envelopeId}`, envelopeId, profile: activeProfile.name, direction: "sent", text, createdAt: Date.now() });
}

export async function exportEnvelope(text, { record = true } = {}) {
  if (!activeProfile?.peer) throw new Error("Pair with a peer before sending.");
  const message = String(text || "").trim();
  if (!message) throw new Error("Write a message first.");
  const session = activeProfile.privateMaterial.session;
  if (session?.status !== "ready") throw new Error("The Olm session is still establishing. Keep both rooms open or move the pending handshake envelope manually.");
  if (!session.safetyVerified) throw new Error("Compare the safety material with the peer and confirm it before sending messages.");
  if (session.pendingEnvelope) throw new Error("Deliver and confirm the final Olm handshake envelope before sending a message.");
  let encrypted;
  try {
    encrypted = JSON.parse(olm_session_encrypt(session.sessionPickle, new TextEncoder().encode(message)));
  } catch {
    throw new Error("Olm message encryption failed. Pair again before sending.");
  }
  const result = await signedEnvelope("message", encrypted.message);
  const previousPickle = session.sessionPickle;
  session.sessionPickle = encrypted.sessionPickle;
  try { await persistPrivateProfile(); } catch (error) {
    session.sessionPickle = previousPickle;
    throw error;
  }
  if (record) await recordSentEnvelope(result, message);
  return result;
}

export async function sendEnvelope(text) {
  if (!activeProfile?.peer?.server?.inboxUrl) throw new Error("Peer has no reachable server endpoint; export a sealed envelope instead.");
  const message = String(text || "").trim();
  if (!message) throw new Error("Write a message first.");
  const session = activeProfile.privateMaterial.session;
  if (session?.pendingEnvelope && !await flushPendingEnvelope().catch(() => false)) {
    throw new Error("The final Olm handshake envelope has not reached the peer yet. Keep both rooms open or deliver it manually.");
  }
  const envelope = await exportEnvelope(message, { record: false });
  const response = await fetch(activeProfile.peer.server.inboxUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ envelope }) });
  if (!response.ok) {
    const error = new Error("Peer server could not accept the sealed envelope. Export the prepared envelope manually instead.");
    error.envelope = envelope;
    throw error;
  }
  await recordSentEnvelope(envelope, message);
  return envelope;
}

function ackUrl(inboxUrl) {
  const url = new URL(inboxUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ack`;
  return url.href;
}

export async function syncInbox() {
  await flushPendingEnvelope().catch(() => false);
  const localInfo = await localServerInfo();
  if (!localInfo?.inboxUrl) throw new Error("This browser is not connected to a local server.");
  const inboxUrl = localInfo.inboxUrl;
  const localHeaders = { accept: "application/json", "x-ad-local-access": localInfo.localAccess };
  const response = await fetch(inboxUrl, { headers: localHeaders });
  if (!response.ok) throw new Error("Peer server inbox could not be reached.");
  const payload = await response.json();
  const accepted = [];
  let messageCount = 0;
  for (const item of Array.isArray(payload.items) ? payload.items : []) {
    try {
      const message = await importEnvelope(item.envelope);
      if (message !== null) messageCount += 1;
      accepted.push(item.id);
    } catch (error) {
      if (!/already imported/.test(error.message)) throw error;
      accepted.push(item.id);
    }
  }
  if (accepted.length) {
    const ack = await fetch(ackUrl(inboxUrl), { method: "POST", headers: { "content-type": "application/json", "x-ad-local-access": localInfo.localAccess }, body: JSON.stringify({ ids: accepted }) });
    if (!ack.ok) throw new Error("Message was received but the local server could not acknowledge it.");
  }
  return messageCount;
}

async function verifiedEnvelope(value) {
  const text = String(value || "").trim();
  if (!text.startsWith(ENVELOPE_PREFIX)) throw new Error("This is not a valid sealed Olm envelope.");
  const envelope = decode(text.slice(ENVELOPE_PREFIX.length));
  const now = Date.now();
  if (
    envelope.v !== 3
    || envelope.to !== activeProfile.name
    || envelope.from !== activeProfile.peer.name
    || !["olm-init", "olm-ready", "message"].includes(envelope.type)
    || !envelope.signature
    || !Number.isSafeInteger(envelope.createdAt)
    || !/^[-0-9a-f]{36}$/i.test(envelope.id)
    || envelope.createdAt < now - MAX_ENVELOPE_AGE_MS
    || envelope.createdAt > now + MAX_CLOCK_SKEW_MS
  ) throw new Error("Envelope identity or replay window does not match this room.");
  const signingKey = await crypto.subtle.importKey("jwk", activeProfile.peer.ecdsaPublic, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  const { signature, ...body } = envelope;
  if (!await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, signingKey, base64ToBytes(signature), new TextEncoder().encode(canonical(body)))) {
    throw new Error("Envelope signature is invalid or it was modified.");
  }
  if (await read("seen", `${activeProfile.name}:${envelope.id}`)) throw new Error("This envelope was already imported.");
  return envelope;
}

async function processHandshakeEnvelope(envelope) {
  const session = activeProfile.privateMaterial.session;
  if (envelope.type === "olm-init") {
    if (session.role !== "responder" || session.status !== "waiting-init") throw new Error("Unexpected Olm init message.");
    let accepted;
    try {
      accepted = JSON.parse(olm_inbound_accept(
        activeProfile.privateMaterial.olmAccountPickle,
        activeProfile.peer.olmCurve25519Public,
        envelope.payload?.messageType,
        envelope.payload?.body,
        session.transcript,
      ));
    } catch {
      throw new Error("Olm init is invalid or is not bound to this pairing transcript.");
    }
    activeProfile.privateMaterial.olmAccountPickle = accepted.accountPickle;
    session.sessionPickle = accepted.sessionPickle;
    session.status = "ready";
    session.pendingEnvelope = await signedEnvelope("olm-ready", accepted.message);
  } else if (envelope.type === "olm-ready") {
    if (session.role !== "initiator" || session.status !== "init-sent") throw new Error("Unexpected Olm ready message.");
    try {
      session.sessionPickle = olm_outbound_finish(
        session.sessionPickle,
        envelope.payload?.messageType,
        envelope.payload?.body,
        session.transcript,
      );
    } catch {
      throw new Error("Olm ready message is invalid or is not bound to this pairing transcript.");
    }
    session.pendingEnvelope = null;
    session.status = "ready";
  } else {
    throw new Error("Unsupported Olm control envelope.");
  }
  await persistPrivateProfile();
  await flushPendingEnvelope().catch(() => false);
}

export async function importEnvelope(value) {
  if (!activeProfile?.peer) throw new Error("Pair with a peer before importing.");
  const envelope = await verifiedEnvelope(value);
  if (envelope.type !== "message") {
    await processHandshakeEnvelope(envelope);
    await write("seen", { id: `${activeProfile.name}:${envelope.id}`, profile: activeProfile.name, createdAt: Date.now() });
    return null;
  }
  const session = activeProfile.privateMaterial.session;
  if (session?.status !== "ready") throw new Error("Olm session is not ready.");
  let decrypted;
  try {
    decrypted = JSON.parse(olm_session_decrypt(
      session.sessionPickle,
      envelope.payload?.messageType,
      envelope.payload?.body,
    ));
  } catch {
    throw new Error("Olm envelope authentication failed, was replayed, or was modified.");
  }
  const message = new TextDecoder().decode(base64ToBytes(decrypted.plaintext));
  session.sessionPickle = decrypted.sessionPickle;
  await persistPrivateProfile();
  await write("seen", { id: `${activeProfile.name}:${envelope.id}`, profile: activeProfile.name, createdAt: Date.now() });
  await write("messages", { id: `${activeProfile.name}:${envelope.id}`, envelopeId: envelope.id, profile: activeProfile.name, direction: "received", text: message, createdAt: envelope.createdAt });
  return message;
}

export async function listMessages() {
  if (!activeProfile) return [];
  return (await all("messages")).filter((message) => message.profile === activeProfile.name).sort((a, b) => a.createdAt - b.createdAt);
}

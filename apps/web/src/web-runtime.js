import initCrypto, {
  argon2id_profile_key,
  initSync as initCryptoSync,
  olm_account_new,
  olm_account_replenish,
  olm_account_revoke,
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
const BACKUP_PREFIX = "ADBACKUP1.";
const ENVELOPE_PREFIX = "ADENVWEB3.";
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const AUTO_LOCK_MS = 5 * 60 * 1000;
const MIN_PASSPHRASE_LENGTH = 12;
const MAX_ENVELOPE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const profileNames = [];
let activeProfile = null;
let localInfoCache = null;
let lastActivityAt = 0;
let argon2WorkerInstance = null;
let argon2WorkerSequence = 0;
const argon2WorkerRequests = new Map();

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
  if (globalThis.__AD_TEST_FAIL_NEXT_WRITE__ === true) {
    delete globalThis.__AD_TEST_FAIL_NEXT_WRITE__;
    throw new Error("Injected browser storage write failure.");
  }
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readwrite").objectStore(storeName), "put", value); } finally { db.close(); }
}

async function remove(storeName, key) {
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readwrite").objectStore(storeName), "delete", key); } finally { db.close(); }
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
  if (url.protocol === "http:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Remote relay endpoints require HTTPS; HTTP does not provide anonymity or safe capability transport.");
  }
  return url.href;
}

async function localServerInfo() {
  if (localInfoCache) return localInfoCache;
  try {
    const hash = new URLSearchParams(globalThis.location?.hash?.slice(1) || "");
    const localAccess = hash.get("local");
    const relayOrigin = hash.get("relay");
    if (!localAccess) return null;
    let infoUrl = "/api/v1/info";
    if (relayOrigin) {
      let origin;
      try { origin = new URL(relayOrigin).origin; } catch { return null; }
      infoUrl = `${origin}/api/v1/info`;
    }
    const response = await fetch(infoUrl, { headers: { accept: "application/json", "x-ad-local-access": localAccess } });
    if (!response.ok) return null;
    const info = await response.json();
    localInfoCache = { ...info, inboxUrl: validInboxUrl(info.inboxUrl), localAccess };
    return localInfoCache;
  } catch { return null; }
}

export async function getLocalServerInfo() { return localServerInfo(); }

async function wrappingKey(passphrase, salt, algorithm = "argon2id-v1") {
  if (algorithm === "argon2id-v1") {
    const derived = await deriveArgon2id(String(passphrase), salt);
    return crypto.subtle.importKey("raw", derived, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function deriveArgon2id(passphrase, salt) {
  if (typeof Worker !== "function" || typeof URL !== "function" || String(globalThis.location?.protocol || "").startsWith("node")) {
    return Promise.resolve(argon2id_profile_key(passphrase, salt));
  }
  if (!argon2WorkerInstance) {
    argon2WorkerInstance = new Worker(new URL("./argon2-worker.js", import.meta.url), { type: "module" });
    argon2WorkerInstance.onmessage = ({ data }) => {
      const request = argon2WorkerRequests.get(data?.id);
      if (!request) return;
      argon2WorkerRequests.delete(data.id);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(new Uint8Array(data.key));
    };
    argon2WorkerInstance.onerror = () => {
      for (const request of argon2WorkerRequests.values()) request.reject(new Error("Argon2id worker stopped."));
      argon2WorkerRequests.clear();
      argon2WorkerInstance?.terminate();
      argon2WorkerInstance = null;
    };
  }
  const id = ++argon2WorkerSequence;
  return new Promise((resolve, reject) => {
    argon2WorkerRequests.set(id, { resolve, reject });
    const transferableSalt = new Uint8Array(salt);
    argon2WorkerInstance.postMessage({ id, passphrase, salt: transferableSalt }, [transferableSalt.buffer]);
  });
}

function stopArgon2Worker() {
  argon2WorkerInstance?.terminate();
  argon2WorkerInstance = null;
  for (const request of argon2WorkerRequests.values()) request.reject(new Error("Profile session locked during key derivation."));
  argon2WorkerRequests.clear();
}

async function sealWithKey(material, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(material)));
  return { salt: bytesToBase64(salt), iv: bytesToBase64(iv), sealed: bytesToBase64(sealed) };
}

async function sealPrivateMaterial(material, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await wrappingKey(passphrase, salt);
  return { ...(await sealWithKey(material, key, salt)), wrappingKey: key, kdf: "argon2id-v1" };
}

async function openPrivateMaterial(record, passphrase) {
  const salt = base64ToBytes(record.salt);
  const key = await wrappingKey(passphrase, salt, record.kdf || "pbkdf2-v1");
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
    kdf: profile.kdf || "pbkdf2-v1",
    peer: profile.peer || null,
    selfInviteBody: profile.selfInviteBody || null,
    createdAt: profile.createdAt,
  };
}

function capturePrivateState() {
  if (!activeProfile) return null;
  return {
    privateMaterial: structuredClone(activeProfile.privateMaterial),
    salt: activeProfile.salt,
    iv: activeProfile.iv,
    sealed: activeProfile.sealed,
    kdf: activeProfile.kdf,
    peer: structuredClone(activeProfile.peer),
    selfInviteBody: structuredClone(activeProfile.selfInviteBody),
    olmOneTimePublic: activeProfile.olmOneTimePublic,
  };
}

function restorePrivateState(snapshot) {
  if (!activeProfile || !snapshot) return;
  activeProfile.privateMaterial = snapshot.privateMaterial;
  activeProfile.salt = snapshot.salt;
  activeProfile.iv = snapshot.iv;
  activeProfile.sealed = snapshot.sealed;
  activeProfile.kdf = snapshot.kdf;
  activeProfile.peer = snapshot.peer;
  activeProfile.selfInviteBody = snapshot.selfInviteBody;
  activeProfile.olmOneTimePublic = snapshot.olmOneTimePublic;
}

async function rollbackPrivateState(snapshot) {
  restorePrivateState(snapshot);
  try {
    await persistPrivateProfile();
  } catch {
    throw new Error("Local session persistence failed. Stop using this pairing and create a fresh profile.");
  }
}

async function replenishPrekeys(minimum = 3) {
  const prekeys = activeProfile.privateMaterial.prekeys || [];
  activeProfile.privateMaterial.prekeys = prekeys;
  const available = prekeys.filter((prekey) => prekey.state === "available").length;
  if (available >= minimum) return;
  const replenished = JSON.parse(olm_account_replenish(activeProfile.privateMaterial.olmAccountPickle, Math.max(3, 10 - available)));
  activeProfile.privateMaterial.olmAccountPickle = replenished.accountPickle;
  for (const publicKey of replenished.oneTimePublicKeys || []) {
    if (!prekeys.some((prekey) => prekey.public === publicKey)) prekeys.push({ public: publicKey, state: "available", issuedAt: null });
  }
}

function prekeyByPublic(publicKey) {
  return (activeProfile.privateMaterial.prekeys || []).find((prekey) => prekey.public === publicKey);
}

async function consumeLocalPrekey(publicKey) {
  const prekey = prekeyByPublic(publicKey);
  if (prekey) prekey.state = "consumed";
  await replenishPrekeys(3);
}

async function persistPrivateProfile() {
  const snapshot = capturePrivateState();
  try {
    const sealed = await sealWithKey(activeProfile.privateMaterial, activeProfile.wrappingKey, base64ToBytes(activeProfile.salt));
    const record = storedProfile({ ...activeProfile, ...sealed });
    await write("profiles", record);
    Object.assign(activeProfile, sealed);
  } catch (error) {
    restorePrivateState(snapshot);
    throw error;
  }
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
  if (String(passphrase).length < MIN_PASSPHRASE_LENGTH) throw new Error(`Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  if (await read("profiles", name)) throw new Error("That local profile already exists.");
  const ecdsa = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const olm = JSON.parse(olm_account_new());
  const ecdsaPublic = await crypto.subtle.exportKey("jwk", ecdsa.publicKey);
  const privateMaterial = {
    ecdsaPrivate: await crypto.subtle.exportKey("jwk", ecdsa.privateKey),
    olmAccountPickle: olm.accountPickle,
    prekeys: (olm.oneTimePublicKeys || []).map((publicKey) => ({ public: publicKey, state: "available", issuedAt: null })),
    session: null,
  };
  const { wrappingKey: profileWrappingKey, ...sealed } = await sealPrivateMaterial(privateMaterial, passphrase);
  const record = {
    name: String(name),
    ecdsaPublic,
    olmEd25519Public: olm.ed25519Public,
    olmCurve25519Public: olm.curve25519Public,
    olmOneTimePublic: olm.oneTimePublicKeys?.[0] || "",
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
  lastActivityAt = Date.now();
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
  localInfoCache = null;
  let migratedSession = false;
  if (activeProfile.privateMaterial.session && activeProfile.peer && !activeProfile.privateMaterial.session.peerIdentity) {
    activeProfile.privateMaterial.session.localIdentity = identityFingerprint(activeProfile.selfInviteBody || activeProfile);
    activeProfile.privateMaterial.session.peerIdentity = identityFingerprint(activeProfile.peer);
    migratedSession = true;
  }
  lastActivityAt = Date.now();
  if (!record.kdf) {
    activeProfile.wrappingKey = await wrappingKey(passphrase, base64ToBytes(record.salt));
    activeProfile.kdf = "argon2id-v1";
    await persistPrivateProfile();
  } else if (migratedSession) {
    await persistPrivateProfile();
  }
  return activeProfile;
}

export function lockProfile() { stopArgon2Worker(); activeProfile = null; localInfoCache = null; lastActivityAt = 0; }

export function touchActivity() {
  if (activeProfile) lastActivityAt = Date.now();
}

export function checkAutoLock() {
  if (activeProfile && lastActivityAt > 0 && Date.now() - lastActivityAt >= AUTO_LOCK_MS) {
    lockProfile();
    return true;
  }
  return false;
}

export async function deleteProfile(name, passphrase) {
  const record = await read("profiles", name);
  if (!record) throw new Error("Local profile not found.");
  await openPrivateMaterial(record, passphrase);
  const messages = await all("messages");
  const seen = await all("seen");
  for (const message of messages.filter((item) => item.profile === name)) await remove("messages", message.id);
  for (const item of seen.filter((entry) => entry.profile === name)) await remove("seen", item.id);
  await remove("profiles", name);
  const index = profileNames.indexOf(name);
  if (index >= 0) profileNames.splice(index, 1);
  if (activeProfile?.name === name) lockProfile();
  else localInfoCache = null;
}

export async function exportProfileBackup() {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  return `${BACKUP_PREFIX}${encode({ format: BACKUP_PREFIX.slice(0, -1), version: 1, createdAt: Date.now(), profile: storedProfile(activeProfile) })}`;
}

export async function importProfileBackup(value) {
  const text = String(value || "").trim();
  if (!text.startsWith(BACKUP_PREFIX)) throw new Error("This is not a valid encrypted profile backup.");
  const decoded = decode(text.slice(BACKUP_PREFIX.length));
  const backup = decoded?.profile ? decoded : { format: BACKUP_PREFIX.slice(0, -1), version: 0, createdAt: 0, profile: decoded };
  const record = backup?.profile;
  if (
    !backup
    || backup.format !== BACKUP_PREFIX.slice(0, -1)
    || ![0, 1].includes(backup.version)
    || !Number.isSafeInteger(backup.createdAt)
    || backup.createdAt > Date.now() + MAX_CLOCK_SKEW_MS
    || !record
    || typeof record.name !== "string"
    || !/^[A-Za-z0-9_-]+$/.test(record.name)
    || record.name.length > 48
    || !record.salt
    || !record.iv
    || !record.sealed
    || !record.kdf
    || !["argon2id-v1", "pbkdf2-v1"].includes(record.kdf)
  ) {
    throw new Error("Profile backup metadata is invalid.");
  }
  if (await read("profiles", record.name)) throw new Error("That local profile already exists; refusing to overwrite it.");
  await write("profiles", record);
  profileNames.push(record.name);
  profileNames.sort();
  return record.name;
}

async function selfInviteBody() {
  const now = Date.now();
  const existing = activeProfile.selfInviteBody;
  if (existing && activeProfile.peer) return existing;
  if (existing && existing.expiresAt > now && existing.inviteId) return existing;
  const previousPrekey = existing && prekeyByPublic(existing.olmOneTimePublic);
  if (previousPrekey?.state === "reserved") {
    previousPrekey.state = "available";
    previousPrekey.issuedAt = null;
  }
  await replenishPrekeys(1);
  const prekey = activeProfile.privateMaterial.prekeys.find((candidate) => candidate.state === "available");
  if (!prekey) throw new Error("No one-time prekey is available. Create a fresh profile before pairing.");
  prekey.state = "reserved";
  prekey.issuedAt = now;
  activeProfile.olmOneTimePublic = prekey.public;
  const info = await localServerInfo();
  const body = {
    v: 3,
    inviteId: crypto.randomUUID(),
    issuedAt: now,
    expiresAt: now + INVITE_TTL_MS,
    name: activeProfile.name,
    ecdsaPublic: activeProfile.ecdsaPublic,
    olmEd25519Public: activeProfile.olmEd25519Public,
    olmCurve25519Public: activeProfile.olmCurve25519Public,
    olmOneTimePublic: prekey.public,
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

export async function revokeInvite() {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  if (activeProfile.peer) throw new Error("The paired session is active. Create a fresh profile to revoke its identity safely.");
  const existing = activeProfile.selfInviteBody;
  if (!existing) return false;
  const prekey = prekeyByPublic(existing.olmOneTimePublic);
  if (prekey) prekey.state = "revoked";
  activeProfile.privateMaterial.olmAccountPickle = olm_account_revoke(activeProfile.privateMaterial.olmAccountPickle, existing.olmOneTimePublic);
  activeProfile.selfInviteBody = null;
  activeProfile.olmOneTimePublic = "";
  await persistPrivateProfile();
  await persistPublicProfile();
  return true;
}

function participantKey(participant) {
  return canonical({
    ecdsaPublic: participant.ecdsaPublic,
    olmCurve25519Public: participant.olmCurve25519Public,
  });
}

function identityFingerprint(participant) {
  return canonical({
    name: participant.name,
    ecdsaPublic: participant.ecdsaPublic,
    olmEd25519Public: participant.olmEd25519Public,
    olmCurve25519Public: participant.olmCurve25519Public,
  });
}

export function getIdentityFingerprint() {
  if (!activeProfile) return "";
  return identityFingerprint({
    name: activeProfile.name,
    ecdsaPublic: activeProfile.ecdsaPublic,
    olmEd25519Public: activeProfile.olmEd25519Public,
    olmCurve25519Public: activeProfile.olmCurve25519Public,
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
    localIdentity: identityFingerprint(local),
    peerIdentity: identityFingerprint(peer),
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
    || !/^[-0-9a-f]{36}$/i.test(body.inviteId || "")
    || !Number.isSafeInteger(body.issuedAt)
    || !Number.isSafeInteger(body.expiresAt)
    || body.expiresAt <= body.issuedAt
    || body.expiresAt - body.issuedAt > INVITE_TTL_MS
    || body.issuedAt > Date.now() + MAX_CLOCK_SKEW_MS
    || body.expiresAt < Date.now()
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
  const snapshot = capturePrivateState();
  let encrypted;
  try {
    encrypted = JSON.parse(olm_session_encrypt(session.sessionPickle, new TextEncoder().encode(message)));
  } catch {
    throw new Error("Olm message encryption failed. Pair again before sending.");
  }
  const result = await signedEnvelope("message", encrypted.message);
  session.sessionPickle = encrypted.sessionPickle;
  try {
    await persistPrivateProfile();
    if (record) await recordSentEnvelope(result, message);
  } catch (error) {
    await rollbackPrivateState(snapshot);
    throw error;
  }
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
  const snapshot = capturePrivateState();
  if (!session?.peerIdentity || session.peerIdentity !== identityFingerprint(activeProfile.peer)) throw new Error("Peer identity changed. Stop and establish a fresh verified session.");
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
    await consumeLocalPrekey(activeProfile.selfInviteBody.olmOneTimePublic);
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
  try {
    await persistPrivateProfile();
    await flushPendingEnvelope().catch(() => false);
  } catch (error) {
    await rollbackPrivateState(snapshot);
    throw error;
  }
}

export async function importEnvelope(value) {
  if (!activeProfile?.peer) throw new Error("Pair with a peer before importing.");
  const envelope = await verifiedEnvelope(value);
  if (envelope.type !== "message") {
    const snapshot = capturePrivateState();
    try {
      await processHandshakeEnvelope(envelope);
      await write("seen", { id: `${activeProfile.name}:${envelope.id}`, profile: activeProfile.name, createdAt: Date.now() });
    } catch (error) {
      await rollbackPrivateState(snapshot);
      throw new Error(`Handshake transaction failed and was rolled back: ${error.message}`);
    }
    return null;
  }
  const session = activeProfile.privateMaterial.session;
  if (session?.status !== "ready") throw new Error("Olm session is not ready.");
  const snapshot = capturePrivateState();
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
  try {
    await persistPrivateProfile();
    await write("seen", { id: `${activeProfile.name}:${envelope.id}`, profile: activeProfile.name, createdAt: Date.now() });
    await write("messages", { id: `${activeProfile.name}:${envelope.id}`, envelopeId: envelope.id, profile: activeProfile.name, direction: "received", text: message, createdAt: envelope.createdAt });
  } catch (error) {
    await rollbackPrivateState(snapshot);
    throw error;
  }
  return message;
}

export async function listMessages() {
  if (!activeProfile) return [];
  return (await all("messages")).filter((message) => message.profile === activeProfile.name).sort((a, b) => a.createdAt - b.createdAt);
}

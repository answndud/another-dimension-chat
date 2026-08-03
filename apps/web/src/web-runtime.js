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
const SESSION_BACKUP_PREFIX = "ADSESSION1.";
const TRANSCRIPT_BACKUP_PREFIX = "ADTRANSCRIPT1.";
const ENVELOPE_PREFIX = "ADENVWEB3.";
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const AUTO_LOCK_MS = 5 * 60 * 1000;
const MIN_PASSPHRASE_LENGTH = 12;
const MAX_ENVELOPE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_BACKUP_BYTES = 512 * 1024;
const KDF_METADATA = Object.freeze({
  "argon2id-v1": { algorithm: "Argon2id", version: "0x13", memoryKiB: 19_456, timeCost: 2, parallelism: 1, outputBytes: 32 },
  "pbkdf2-v1": { algorithm: "PBKDF2", hash: "SHA-256", iterations: 210_000, outputBytes: 32 },
});
const COORDINATION_CHANNEL = "another-dimension-session-v1";
const profileNames = [];
let activeProfile = null;
let localInfoCache = null;
let lastActivityAt = 0;
let activeSessionEpoch = 0;
let storageState = { available: true, error: "" };
let argon2WorkerInstance = null;
let argon2WorkerSequence = 0;
const argon2WorkerRequests = new Map();
const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const coordinationChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel(COORDINATION_CHANNEL) : null;
coordinationChannel?.unref?.();

function notifySessionEvent(type, detail = {}) {
  globalThis.__AD_SESSION_EVENT__?.({ type, ...detail });
}

function broadcastSession(type, profile = activeProfile?.name) {
  coordinationChannel?.postMessage({ type, profile, source: tabId, at: Date.now() });
}

function markStorageUnavailable(error) {
  storageState = { available: false, error: error?.message || "Browser storage is unavailable." };
  const wasActive = Boolean(activeProfile);
  lockProfile({ broadcast: false, reason: "storage-failure" });
  if (wasActive) notifySessionEvent("storage-failure", { message: "Browser storage is unavailable. The session was locked; preserve any offline backup before retrying." });
}

function requireStorage() {
  if (!storageState.available) throw new Error("Browser storage is unavailable. The session is locked; do not send messages until storage is restored.");
}

function assertSessionEpoch(epoch = activeSessionEpoch) {
  if (!activeProfile || epoch !== activeSessionEpoch) throw new Error("This tab was locked by another tab or a storage failure. Unlock the profile again before continuing.");
}

if (coordinationChannel) {
  coordinationChannel.onmessage = ({ data }) => {
    if (!data || data.source === tabId || !["lock", "wipe", "profile-updated"].includes(data.type)) return;
    if (data.profile && activeProfile?.name !== data.profile) return;
    if (!activeProfile) return;
    lockProfile({ broadcast: false, reason: data.type === "wipe" ? "remote-wipe" : "remote-lock" });
    notifySessionEvent(data.type === "wipe" ? "profile-wiped" : "remote-lock", {
      message: data.type === "wipe"
        ? "Another tab deleted this profile. This tab was locked and its in-memory session was discarded."
        : "Another tab changed or locked this profile. This tab was locked and its in-memory session was discarded.",
    });
  };
}

const cryptoReady = (() => {
  if (globalThis.__AD_CRYPTO_WASM_BYTES__) {
    initCryptoSync({ module: globalThis.__AD_CRYPTO_WASM_BYTES__ });
    return Promise.resolve();
  }
  return initCrypto();
})();

function openDb() {
  requireStorage();
  return new Promise((resolve, reject) => {
    let request;
    try { request = indexedDB.open(DB_NAME, DB_VERSION); } catch (error) { markStorageUnavailable(error); reject(new Error("Browser storage could not be opened.")); return; }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "name" });
      if (!db.objectStoreNames.contains("messages")) db.createObjectStore("messages", { keyPath: "id" });
      if (!db.objectStoreNames.contains("seen")) db.createObjectStore("seen", { keyPath: "id" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onblocked = () => reject(new Error("Browser storage is busy in another tab. Close stale tabs and retry."));
    request.onerror = () => { markStorageUnavailable(request.error); reject(new Error("Browser storage could not be opened.")); };
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
  try { return await request(db.transaction(storeName, "readonly").objectStore(storeName), "get", key); } catch (error) { markStorageUnavailable(error); throw error; } finally { db.close(); }
}

async function write(storeName, value) {
  if (globalThis.__AD_TEST_FAIL_NEXT_WRITE__ === true) {
    delete globalThis.__AD_TEST_FAIL_NEXT_WRITE__;
    throw new Error("Injected browser storage write failure.");
  }
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readwrite").objectStore(storeName), "put", value); } catch (error) { if (error?.name !== "Error") markStorageUnavailable(error); throw error; } finally { db.close(); }
}

async function remove(storeName, key) {
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readwrite").objectStore(storeName), "delete", key); } catch (error) { markStorageUnavailable(error); throw error; } finally { db.close(); }
}

async function all(storeName) {
  const db = await openDb();
  try { return await request(db.transaction(storeName, "readonly").objectStore(storeName), "getAll"); } catch (error) { markStorageUnavailable(error); throw error; } finally { db.close(); }
}

function bytesToBase64(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function assertBackupSize(value) {
  if (new TextEncoder().encode(String(value)).byteLength > MAX_BACKUP_BYTES) throw new Error("Backup is too large; refusing to load it into browser memory.");
}

function kdfMetadata(algorithm) {
  const metadata = KDF_METADATA[algorithm];
  if (!metadata) throw new Error("Unsupported key derivation policy.");
  return { algorithm, ...metadata };
}

async function integrityDigest(value) {
  return bytesToBase64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value))));
}

function backupPayload(backup) {
  const { integrity, ...payload } = backup;
  return payload;
}

async function assertBackupIntegrity(backup) {
  if (!backup?.integrity || backup.integrity.algorithm !== "SHA-256" || typeof backup.integrity.digest !== "string") throw new Error("Backup integrity metadata is missing.");
  if (backup.integrity.digest !== await integrityDigest(backupPayload(backup))) throw new Error("Backup integrity check failed; the backup was altered or truncated.");
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
  const hostname = url.hostname.replace(/\.$/, "");
  if (hostname.endsWith(".onion")) throw new Error("Onion/Tor endpoints are not supported in this web product; high-risk transport is disabled.");
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
    try {
      const cleanUrl = `${globalThis.location?.pathname || "/"}${globalThis.location?.search || ""}`;
      globalThis.history?.replaceState?.(null, globalThis.document?.title || "Another Dimension", cleanUrl);
    } catch { /* A non-browser fixture may not expose history; keep the capability memory-only. */ }
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
    revision: Number.isSafeInteger(profile.revision) ? profile.revision : 0,
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
    revision: activeProfile.revision,
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
  activeProfile.revision = snapshot.revision;
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
    if (!activeProfile) throw new Error("Profile session is locked.");
    const privateMaterial = {
      ...activeProfile.privateMaterial,
      peer: structuredClone(activeProfile.peer),
      selfInviteBody: structuredClone(activeProfile.selfInviteBody),
      olmOneTimePublic: activeProfile.olmOneTimePublic,
    };
    const sealed = await sealWithKey(privateMaterial, activeProfile.wrappingKey, base64ToBytes(activeProfile.salt));
    const record = storedProfile({ ...activeProfile, ...sealed, revision: (activeProfile.revision || 0) + 1 });
    await write("profiles", record);
    activeProfile.privateMaterial = privateMaterial;
    Object.assign(activeProfile, sealed);
    activeProfile.revision = record.revision;
    broadcastSession("profile-updated");
  } catch (error) {
    restorePrivateState(snapshot);
    throw error;
  }
}

function ensureCrypto() {
  if (globalThis.isSecureContext === false || !globalThis.crypto?.subtle) throw new Error("A secure browser context (HTTPS or localhost) is required for Web Crypto.");
}

export const ready = (async () => {
  await cryptoReady;
  const records = await all("profiles");
  profileNames.splice(0, profileNames.length, ...records.map((record) => record.name).sort());
})();

export function listProfiles() { return [...profileNames]; }

export function getStorageStatus() { return { ...storageState }; }

export function onSessionEvent(listener) {
  globalThis.__AD_SESSION_EVENT__ = typeof listener === "function" ? listener : null;
  return () => { if (globalThis.__AD_SESSION_EVENT__ === listener) globalThis.__AD_SESSION_EVENT__ = null; };
}

export async function createProfile(name, passphrase) {
  ensureCrypto();
  requireStorage();
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
    peer: null,
    selfInviteBody: null,
    olmOneTimePublic: "",
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
    revision: 1,
    createdAt: Date.now(),
  };
  await write("profiles", record);
  profileNames.push(record.name);
  activeProfile = {
    ...record,
    ecdsaPrivate: ecdsa.privateKey,
    wrappingKey: profileWrappingKey,
    privateMaterial,
    revision: record.revision,
  };
  lastActivityAt = Date.now();
  return activeProfile;
}

export async function unlockProfile(name, passphrase) {
  ensureCrypto();
  requireStorage();
  await cryptoReady;
  const record = await read("profiles", name);
  if (!record) throw new Error("Local profile not found.");
  const { material, wrappingKey: profileWrappingKey } = await openPrivateMaterial(record, passphrase);
  const ecdsaPrivate = await crypto.subtle.importKey("jwk", material.ecdsaPrivate, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const migratedPublicState = Boolean(record.peer || record.selfInviteBody);
  const peer = material.peer || record.peer || null;
  const selfInvite = material.selfInviteBody || record.selfInviteBody || null;
  material.peer = peer;
  material.selfInviteBody = selfInvite;
  material.olmOneTimePublic = material.olmOneTimePublic || record.olmOneTimePublic || "";
  activeProfile = {
    ...record,
    peer,
    selfInviteBody: selfInvite,
    olmOneTimePublic: material.olmOneTimePublic,
    ecdsaPrivate,
    wrappingKey: profileWrappingKey,
    privateMaterial: material,
  };
  activeSessionEpoch += 1;
  localInfoCache = null;
  let migratedSession = false;
  if (activeProfile.privateMaterial.session && activeProfile.peer && !activeProfile.privateMaterial.session.peerIdentity) {
    activeProfile.privateMaterial.session.localIdentity = identityFingerprint(activeProfile.selfInviteBody || activeProfile);
    activeProfile.privateMaterial.session.peerIdentity = identityFingerprint(activeProfile.peer);
    activeProfile.privateMaterial.session.endpointBinding = endpointBinding(activeProfile.peer);
    migratedSession = true;
  } else if (activeProfile.privateMaterial.session && activeProfile.peer && !activeProfile.privateMaterial.session.endpointBinding) {
    activeProfile.privateMaterial.session.endpointBinding = endpointBinding(activeProfile.peer);
    migratedSession = true;
  }
  lastActivityAt = Date.now();
  if (!record.kdf) {
    activeProfile.wrappingKey = await wrappingKey(passphrase, base64ToBytes(record.salt));
    activeProfile.kdf = "argon2id-v1";
    await persistPrivateProfile();
  } else if (migratedSession || migratedPublicState || !Object.hasOwn(material, "peer")) {
    await persistPrivateProfile();
  }
  return activeProfile;
}

export function lockProfile({ broadcast = true, reason = "manual" } = {}) {
  const profile = activeProfile?.name;
  stopArgon2Worker();
  activeProfile = null;
  localInfoCache = null;
  lastActivityAt = 0;
  activeSessionEpoch += 1;
  if (broadcast && profile) broadcastSession(reason === "profile-deleted" ? "wipe" : "lock", profile);
  notifySessionEvent("locked", { reason, profile });
}

export function touchActivity() {
  if (activeProfile) lastActivityAt = Date.now();
}

export function checkAutoLock() {
  if (activeProfile && lastActivityAt > 0 && Date.now() - lastActivityAt >= AUTO_LOCK_MS) {
    lockProfile({ reason: "idle" });
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
  if (activeProfile?.name === name) lockProfile({ reason: "profile-deleted" });
  else localInfoCache = null;
}

export async function exportProfileBackup() {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  const profileOnlyMaterial = {
    ...structuredClone(activeProfile.privateMaterial),
    session: null,
    peer: null,
    selfInviteBody: null,
    olmOneTimePublic: "",
  };
  const profileOnlySealed = await sealWithKey(profileOnlyMaterial, activeProfile.wrappingKey, base64ToBytes(activeProfile.salt));
  const backup = {
    format: "ADPROFILE1",
    version: 1,
    createdAt: Date.now(),
    revision: activeProfile.revision || 0,
    kdf: kdfMetadata(activeProfile.kdf),
    profile: { ...storedProfile(activeProfile), ...profileOnlySealed, revision: activeProfile.revision || 0 },
  };
  backup.integrity = { algorithm: "SHA-256", digest: await integrityDigest(backup) };
  const encoded = `${BACKUP_PREFIX}${encode(backup)}`;
  assertBackupSize(encoded);
  return encoded;
}

export async function importProfileBackup(value) {
  requireStorage();
  const text = String(value || "").trim();
  assertBackupSize(text);
  if (!text.startsWith(BACKUP_PREFIX)) throw new Error("This is not a valid encrypted profile backup.");
  const decoded = decode(text.slice(BACKUP_PREFIX.length));
  const backup = decoded;
  await assertBackupIntegrity(backup);
  const record = backup?.profile;
  if (
    !backup
    || backup.format !== "ADPROFILE1"
    || backup.version !== 1
    || !Number.isSafeInteger(backup.createdAt)
    || backup.createdAt > Date.now() + MAX_CLOCK_SKEW_MS
    || !Number.isSafeInteger(backup.revision)
    || !backup.kdf
    || !record
    || typeof record.name !== "string"
    || !/^[A-Za-z0-9_-]+$/.test(record.name)
    || record.name.length > 48
    || !record.salt
    || !record.iv
    || !record.sealed
    || !record.kdf
    || record.kdf !== "argon2id-v1"
    || canonical(backup.kdf) !== canonical(kdfMetadata(record.kdf))
    || record.revision !== backup.revision
  ) {
    throw new Error("Profile backup metadata is invalid or uses a weak/future key derivation policy.");
  }
  if (await read("profiles", record.name)) throw new Error("That local profile already exists; refusing to overwrite it.");
  await write("profiles", record);
  profileNames.push(record.name);
  profileNames.sort();
  return record.name;
}

async function exportEncryptedState(prefix, format, state) {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  const epoch = activeSessionEpoch;
  const sealed = await sealWithKey(state, activeProfile.wrappingKey, base64ToBytes(activeProfile.salt));
  assertSessionEpoch(epoch);
  const backup = {
    format,
    version: 1,
    createdAt: Date.now(),
    revision: activeProfile.revision || 0,
    profileName: activeProfile.name,
    kdf: kdfMetadata(activeProfile.kdf),
    sealed,
  };
  backup.integrity = { algorithm: "SHA-256", digest: await integrityDigest(backup) };
  const encoded = `${prefix}${encode(backup)}`;
  assertBackupSize(encoded);
  return encoded;
}

async function importEncryptedState(value, prefix, format) {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  const text = String(value || "").trim();
  assertBackupSize(text);
  if (!text.startsWith(prefix)) throw new Error(`This is not a valid ${format} backup.`);
  const backup = decode(text.slice(prefix.length));
  await assertBackupIntegrity(backup);
  if (
    backup?.format !== format
    || backup.version !== 1
    || !Number.isSafeInteger(backup.createdAt)
    || backup.createdAt > Date.now() + MAX_CLOCK_SKEW_MS
    || backup.profileName !== activeProfile.name
    || !Number.isSafeInteger(backup.revision)
    || backup.revision < (activeProfile.revision || 0)
    || canonical(backup.kdf) !== canonical(kdfMetadata(activeProfile.kdf))
    || !backup.sealed?.iv
    || !backup.sealed?.sealed
  ) throw new Error(`${format} metadata is invalid, stale, or uses a different key derivation policy.`);
  let plain;
  try {
    plain = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(backup.sealed.iv) },
      activeProfile.wrappingKey,
      base64ToBytes(backup.sealed.sealed),
    )));
  } catch { throw new Error(`${format} authentication failed or the backup belongs to another profile.`); }
  return { backup, plain };
}

export async function exportSessionBackup() {
  if (!activeProfile?.privateMaterial?.session) throw new Error("An established session is required before exporting session state.");
  const seen = (await all("seen")).filter((entry) => entry.profile === activeProfile.name);
  return exportEncryptedState(SESSION_BACKUP_PREFIX, "ADSESSION1", {
    session: structuredClone(activeProfile.privateMaterial.session),
    seen: structuredClone(seen),
  });
}

export async function importSessionBackup(value) {
  const { backup, plain } = await importEncryptedState(value, SESSION_BACKUP_PREFIX, "ADSESSION1");
  if (!plain?.session || !Array.isArray(plain.seen) || plain.seen.some((entry) => entry.profile !== activeProfile.name || typeof entry.id !== "string")) {
    throw new Error("Session backup contents are invalid.");
  }
  const previous = capturePrivateState();
  const existingSeen = await all("seen");
  const existingIds = new Set(existingSeen.filter((entry) => entry.profile === activeProfile.name).map((entry) => entry.id));
  const added = [];
  try {
    activeProfile.privateMaterial.session = structuredClone(plain.session);
    assertSessionBinding(activeProfile.privateMaterial.session, activeProfile.peer);
    await persistPrivateProfile();
    for (const entry of plain.seen) {
      if (!existingIds.has(entry.id)) { await write("seen", structuredClone(entry)); added.push(entry.id); }
    }
  } catch (error) {
    for (const id of added) await remove("seen", id).catch(() => {});
    restorePrivateState(previous);
    try { await persistPrivateProfile(); } catch { throw new Error("Session backup import failed and rollback could not be completed. Stop using this profile and restore it from a fresh profile backup."); }
    throw new Error(`Session backup import failed and was rolled back: ${error.message}`);
  }
  return { profile: activeProfile.name, revision: backup.revision };
}

export async function exportTranscript() {
  const messages = (await all("messages")).filter((message) => message.profile === activeProfile?.name);
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  return exportEncryptedState(TRANSCRIPT_BACKUP_PREFIX, "ADTRANSCRIPT1", { messages: structuredClone(messages) });
}

export async function importTranscript(value) {
  const { backup, plain } = await importEncryptedState(value, TRANSCRIPT_BACKUP_PREFIX, "ADTRANSCRIPT1");
  if (!plain || !Array.isArray(plain.messages) || plain.messages.some((message) => message.profile !== activeProfile.name || typeof message.id !== "string" || typeof message.text !== "string")) {
    throw new Error("Transcript export contents are invalid.");
  }
  const existing = new Set((await all("messages")).filter((message) => message.profile === activeProfile.name).map((message) => message.id));
  if (plain.messages.some((message) => existing.has(message.id))) throw new Error("Transcript import would overwrite an existing message; refusing the import.");
  const added = [];
  try {
    for (const message of plain.messages) { await write("messages", structuredClone(message)); added.push(message.id); }
  } catch (error) {
    for (const id of added) await remove("messages", id).catch(() => {});
    throw new Error(`Transcript import failed and was rolled back: ${error.message}`);
  }
  return { profile: activeProfile.name, revision: backup.revision, count: plain.messages.length };
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
  activeProfile.privateMaterial.olmOneTimePublic = prekey.public;
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
  activeProfile.privateMaterial.selfInviteBody = body;
  await persistPrivateProfile();
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
  activeProfile.privateMaterial.selfInviteBody = null;
  activeProfile.olmOneTimePublic = "";
  activeProfile.privateMaterial.olmOneTimePublic = "";
  await persistPrivateProfile();
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

function endpointBinding(participant) {
  return canonical({
    inboxUrl: participant?.server?.inboxUrl || null,
    protocol: participant?.server?.protocol || null,
  });
}

function assertSessionBinding(session, peer) {
  if (!session?.peerIdentity || session.peerIdentity !== identityFingerprint(peer)) {
    throw new Error("Peer identity changed. Stop and establish a fresh verified session.");
  }
  if (!session.endpointBinding || session.endpointBinding !== endpointBinding(peer)) {
    throw new Error("Peer endpoint or capability changed. Stop and establish a fresh verified session.");
  }
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
    endpointBinding: endpointBinding(peer),
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
  activeProfile.privateMaterial.peer = body;
  await initializeOlmSession();
  return body;
}

export function safetyPhrase(local, peer) {
  if (!local?.selfInviteBody || !peer) return "Olm session setup is not ready.";
  return `${safety_material(sessionTranscript(local.selfInviteBody, peer))} · compare over a trusted channel`;
}

export function getSafetyPhrase() {
  return activeProfile?.peer ? safetyPhrase(activeProfile, activeProfile.peer) : "";
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
  const epoch = activeSessionEpoch;
  const message = String(text || "").trim();
  if (!message) throw new Error("Write a message first.");
  const session = activeProfile.privateMaterial.session;
  assertSessionBinding(session, activeProfile.peer);
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
  assertSessionEpoch(epoch);
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
  const epoch = activeSessionEpoch;
  const message = String(text || "").trim();
  if (!message) throw new Error("Write a message first.");
  const session = activeProfile.privateMaterial.session;
  if (session?.pendingEnvelope && !await flushPendingEnvelope().catch(() => false)) {
    throw new Error("The final Olm handshake envelope has not reached the peer yet. Keep both rooms open or deliver it manually.");
  }
  const envelope = await exportEnvelope(message, { record: false });
  const response = await fetch(activeProfile.peer.server.inboxUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ envelope }) });
  assertSessionEpoch(epoch);
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
  const epoch = activeSessionEpoch;
  assertSessionEpoch(epoch);
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
    assertSessionEpoch(epoch);
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
    assertSessionEpoch(epoch);
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
  assertSessionBinding(activeProfile.privateMaterial.session, activeProfile.peer);
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
  assertSessionBinding(session, activeProfile.peer);
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
  const epoch = activeSessionEpoch;
  const envelope = await verifiedEnvelope(value);
  assertSessionEpoch(epoch);
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

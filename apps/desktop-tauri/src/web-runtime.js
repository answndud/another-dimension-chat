const DB_NAME = "another-dimension-web-v1";
const DB_VERSION = 1;
const profileNames = [];
let activeProfile = null;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "name" });
      if (!db.objectStoreNames.contains("messages")) db.createObjectStore("messages", { keyPath: "id" });
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
function canonical(value) { return JSON.stringify(value, Object.keys(value).sort()); }

async function wrappingKey(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function sealPrivateMaterial(material, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await wrappingKey(passphrase, salt);
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(material)));
  return { salt: bytesToBase64(salt), iv: bytesToBase64(iv), sealed: bytesToBase64(sealed) };
}

async function openPrivateMaterial(record, passphrase) {
  const key = await wrappingKey(passphrase, base64ToBytes(record.salt));
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(record.iv) }, key, base64ToBytes(record.sealed));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch { throw new Error("Wrong passphrase or damaged local profile."); }
}

async function importPrivateKeys(material) {
  return {
    ecdhPrivate: await crypto.subtle.importKey("jwk", material.ecdhPrivate, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
    ecdsaPrivate: await crypto.subtle.importKey("jwk", material.ecdsaPrivate, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
  };
}

function profileView(record, privateKeys) { return { ...record, ...privateKeys }; }

export const ready = (async () => {
  const records = await all("profiles").catch(() => []);
  profileNames.splice(0, profileNames.length, ...records.map((record) => record.name).sort());
})();

export function listProfiles() { return [...profileNames]; }

export async function createProfile(name, passphrase) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(name)) || String(name).length > 48) throw new Error("Use letters, numbers, hyphen, or underscore for the profile name.");
  if (String(passphrase).length < 10) throw new Error("Use a passphrase of at least 10 characters.");
  if (await read("profiles", name)) throw new Error("That local profile already exists.");
  const ecdh = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ecdsa = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const ecdhPublic = await crypto.subtle.exportKey("jwk", ecdh.publicKey);
  const ecdsaPublic = await crypto.subtle.exportKey("jwk", ecdsa.publicKey);
  const privateMaterial = { ecdhPrivate: await crypto.subtle.exportKey("jwk", ecdh.privateKey), ecdsaPrivate: await crypto.subtle.exportKey("jwk", ecdsa.privateKey) };
  const sealed = await sealPrivateMaterial(privateMaterial, passphrase);
  const record = { name: String(name), ecdhPublic, ecdsaPublic, ...sealed, peer: null, createdAt: Date.now() };
  await write("profiles", record);
  profileNames.push(record.name);
  activeProfile = profileView(record, { ecdhPrivate: ecdh.privateKey, ecdsaPrivate: ecdsa.privateKey });
  return activeProfile;
}

export async function unlockProfile(name, passphrase) {
  const record = await read("profiles", name);
  if (!record) throw new Error("Local profile not found.");
  const material = await openPrivateMaterial(record, passphrase);
  activeProfile = profileView(record, await importPrivateKeys(material));
  return activeProfile;
}

export function lockProfile() { activeProfile = null; }

export async function exportInvite() {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  const body = { v: 1, name: activeProfile.name, ecdhPublic: activeProfile.ecdhPublic, ecdsaPublic: activeProfile.ecdsaPublic };
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, activeProfile.ecdsaPrivate, new TextEncoder().encode(canonical(body)));
  return `ADWEB1.${encode({ ...body, signature: bytesToBase64(signature) })}`;
}

export async function importInvite(value) {
  if (!activeProfile) throw new Error("Unlock a local profile first.");
  const text = String(value || "").trim();
  if (!text.startsWith("ADWEB1.")) throw new Error("This is not a valid web invite.");
  const invite = decode(text.slice("ADWEB1.".length));
  const { signature, ...body } = invite;
  const publicKey = await crypto.subtle.importKey("jwk", body.ecdsaPublic, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, base64ToBytes(signature), new TextEncoder().encode(canonical(body)));
  if (!valid || body.v !== 1 || body.name === activeProfile.name) throw new Error("Invite signature or peer identity is invalid.");
  activeProfile.peer = body;
  await write("profiles", { name: activeProfile.name, ecdhPublic: activeProfile.ecdhPublic, ecdsaPublic: activeProfile.ecdsaPublic, salt: activeProfile.salt, iv: activeProfile.iv, sealed: activeProfile.sealed, peer: body, createdAt: activeProfile.createdAt });
  return body;
}

export function safetyPhrase(local, peer) {
  const source = [JSON.stringify(local.ecdhPublic), JSON.stringify(peer.ecdhPublic)].sort().join("|");
  let hash = 2166136261;
  for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${(hash >>> 0).toString(16).padStart(8, "0")} · compare this phrase in person`;
}

async function messageKey(peer) {
  const peerPublic = await crypto.subtle.importKey("jwk", peer.ecdhPublic, { name: "ECDH", namedCurve: "P-256" }, true, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: peerPublic }, activeProfile.ecdhPrivate, 256);
  return crypto.subtle.importKey("raw", bits, { name: "HKDF" }, false, ["deriveKey"]);
}

export async function exportEnvelope(text) {
  if (!activeProfile?.peer) throw new Error("Pair with a peer before sending.");
  const message = String(text || "").trim();
  if (!message) throw new Error("Write a message first.");
  const keyMaterial = await messageKey(activeProfile.peer);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("another-dimension-web-message-v1") }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(message));
  const envelope = encode({ v: 1, id: crypto.randomUUID(), from: activeProfile.name, to: activeProfile.peer.name, senderEcdhPublic: activeProfile.ecdhPublic, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext), createdAt: Date.now() });
  const envelopeId = JSON.parse(new TextDecoder().decode(base64ToBytes(envelope))).id;
  await write("messages", { id: `${activeProfile.name}:${envelopeId}`, envelopeId, profile: activeProfile.name, direction: "sent", text: message, createdAt: Date.now() });
  return `ADENVWEB1.${envelope}`;
}

export async function importEnvelope(value) {
  if (!activeProfile?.peer) throw new Error("Pair with a peer before importing.");
  const text = String(value || "").trim();
  if (!text.startsWith("ADENVWEB1.")) throw new Error("This is not a valid sealed web envelope.");
  const envelope = decode(text.slice("ADENVWEB1.".length));
  if (envelope.v !== 1 || envelope.to !== activeProfile.name || envelope.from !== activeProfile.peer.name) throw new Error("Envelope identity does not match this room.");
  const sender = await crypto.subtle.importKey("jwk", envelope.senderEcdhPublic, { name: "ECDH", namedCurve: "P-256" }, true, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: sender }, activeProfile.ecdhPrivate, 256);
  const material = await crypto.subtle.importKey("raw", bits, { name: "HKDF" }, false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: base64ToBytes(envelope.salt), info: new TextEncoder().encode("another-dimension-web-message-v1") }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.ciphertext)); } catch { throw new Error("Envelope authentication failed or it was modified."); }
  const message = new TextDecoder().decode(plain);
  if (await read("messages", `${activeProfile.name}:${envelope.id}`)) throw new Error("This envelope was already imported.");
  await write("messages", { id: `${activeProfile.name}:${envelope.id}`, envelopeId: envelope.id, profile: activeProfile.name, direction: "received", text: message, createdAt: envelope.createdAt });
  return message;
}

export async function listMessages() {
  if (!activeProfile) return [];
  return (await all("messages")).filter((message) => message.profile === activeProfile.name).sort((a, b) => a.createdAt - b.createdAt);
}

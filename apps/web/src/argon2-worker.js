import initCrypto, { argon2id_profile_key } from "./generated/ad_crypto.js";

let ready;

async function ensureReady() {
  if (!ready) ready = initCrypto();
  await ready;
}

self.onmessage = async (event) => {
  const { id, passphrase, salt } = event.data || {};
  if (!id || typeof passphrase !== "string" || !salt) return;
  try {
    await ensureReady();
    const key = argon2id_profile_key(passphrase, new Uint8Array(salt));
    self.postMessage({ id, key }, [key.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error?.message || "Argon2id worker failed." });
  }
};

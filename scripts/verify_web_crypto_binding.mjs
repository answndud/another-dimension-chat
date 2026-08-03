import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] || process.cwd());
const writeManifest = process.argv.includes("--write");
const generated = join(root, "apps/web/src/generated");
const manifestPath = join(generated, "ad_crypto.binding.json");
const files = [
  "ad_crypto.js",
  "ad_crypto.d.ts",
  "ad_crypto_bg.wasm",
  "ad_crypto_bg.wasm.d.ts",
];
const requiredExports = [
  "argon2id_profile_key",
  "olm_account_new",
  "olm_account_replenish",
  "olm_account_revoke",
  "olm_inbound_accept",
  "olm_outbound_finish",
  "olm_outbound_start",
  "olm_session_decrypt",
  "olm_session_encrypt",
  "safety_material",
];

async function digest(path) {
  const bytes = await readFile(path);
  return { bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
}

const assets = Object.fromEntries(await Promise.all(files.map(async (file) => [file, await digest(join(generated, file))])));
if (writeManifest) {
  await writeFile(manifestPath, `${JSON.stringify({
    format: "another-dimension-web-crypto-binding",
    version: 1,
    wasmBindgen: "0.2.121",
    assets,
  }, null, 2)}\n`);
}

let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch (error) {
  throw new Error(`Cannot read generated crypto binding manifest: ${error.message}`);
}
if (manifest.format !== "another-dimension-web-crypto-binding" || manifest.version !== 1 || manifest.wasmBindgen !== "0.2.121") {
  throw new Error("Generated crypto binding manifest has an unsupported format or tool version.");
}
for (const file of files) {
  const expected = manifest.assets?.[file];
  const actual = assets[file];
  if (!expected || expected.bytes !== actual.bytes || expected.sha256 !== actual.sha256) {
    throw new Error(`Generated crypto binding mismatch: ${file}`);
  }
}
const bindingSource = await readFile(join(generated, "ad_crypto.js"), "utf8");
for (const name of requiredExports) {
  if (!new RegExp(`export function ${name}\\b`).test(bindingSource)) throw new Error(`Generated crypto binding is missing export: ${name}`);
}
console.log(`web crypto binding verified: wasm ${assets["ad_crypto_bg.wasm"].sha256.slice(0, 16)} · binding ${assets["ad_crypto.js"].sha256.slice(0, 16)}`);

import { createHash, createPublicKey, sign, verify } from 'node:crypto';
import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MANIFEST_NAME = 'release-manifest.json';
export const MANIFEST_VERSION = 1;

function compareVersions(left, right) {
  const parse = (value) => String(value).split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  if (a.length !== 3 || b.length !== 3 || [...a, ...b].some((part) => !Number.isSafeInteger(part) || part < 0)) throw new Error("release versions must use MAJOR.MINOR.PATCH");
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function canonicalJson(value) { return JSON.stringify(value); }

function assertSafeRelativePath(relativePath) {
  if (!relativePath || path.posix.isAbsolute(relativePath) || relativePath.includes('\\') || relativePath.split('/').includes('..')) {
    throw new Error(`unsafe release path: ${relativePath}`);
  }
}

async function collectFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = path.join(current, entry.name);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    assertSafeRelativePath(relativePath);
    const info = await lstat(absolutePath);
    if (info.isSymbolicLink()) throw new Error(`symbolic links are not allowed in releases: ${relativePath}`);
    if (info.isDirectory()) files.push(...await collectFiles(root, absolutePath));
    else if (info.isFile() && entry.name !== MANIFEST_NAME) files.push({ absolutePath, relativePath });
    else if (!info.isFile()) throw new Error(`unsupported release entry: ${relativePath}`);
  }
  return files;
}

export async function createManifest(root, { version, privateKey } = {}) {
  const files = [];
  for (const file of await collectFiles(root)) {
    const contents = await readFile(file.absolutePath);
    files.push({ path: file.relativePath, bytes: contents.byteLength, sha256: createHash('sha256').update(contents).digest('hex') });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const sourceDateEpoch = Number(process.env.SOURCE_DATE_EPOCH);
  const createdAt = Number.isSafeInteger(sourceDateEpoch) && sourceDateEpoch >= 0
    ? new Date(sourceDateEpoch * 1000).toISOString()
    : new Date().toISOString();
  const manifest = { format: 'another-dimension-release-manifest', manifestVersion: MANIFEST_VERSION, releaseVersion: version, createdAt, files, signature: null };
  if (privateKey) {
    const publicKey = createPublicKey(privateKey);
    const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
    const keyId = createHash('sha256').update(publicKeyDer).digest('hex').slice(0, 32);
    manifest.signature = { algorithm: 'Ed25519', keyId, publicKey: publicKey.export({ type: 'spki', format: 'pem' }), value: sign(null, Buffer.from(canonicalJson(manifest)), privateKey).toString('base64') };
  }
  return manifest;
}

export async function writeManifest(root, options = {}) {
  const manifest = await createManifest(root, options);
  await writeFile(path.join(root, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

export async function verifyManifest(root, { manifest = null, publicKey = null, requireSignature = false, minVersion = null } = {}) {
  const loaded = manifest ?? JSON.parse(await readFile(path.join(root, MANIFEST_NAME), 'utf8'));
  if (loaded.format !== 'another-dimension-release-manifest' || loaded.manifestVersion !== MANIFEST_VERSION) throw new Error('unsupported release manifest');
  if (minVersion && compareVersions(loaded.releaseVersion, minVersion) < 0) throw new Error(`release ${loaded.releaseVersion} is older than the minimum allowed ${minVersion}`);
  if (!Array.isArray(loaded.files) || loaded.files.some((file) => !file || typeof file.path !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256))) throw new Error('invalid release manifest file list');
  const listedPaths = new Set();
  for (const listed of loaded.files) {
    assertSafeRelativePath(listed.path);
    if (listed.path === MANIFEST_NAME || listedPaths.has(listed.path)) throw new Error(`duplicate or reserved release path: ${listed.path}`);
    listedPaths.add(listed.path);
    const absolutePath = path.join(root, ...listed.path.split('/'));
    const info = await lstat(absolutePath).catch(() => null);
    if (!info?.isFile() || info.isSymbolicLink()) throw new Error(`missing release file: ${listed.path}`);
    const contents = await readFile(absolutePath);
    if (createHash('sha256').update(contents).digest('hex') !== listed.sha256 || contents.byteLength !== listed.bytes) throw new Error(`release hash mismatch: ${listed.path}`);
  }
  const actualFiles = await collectFiles(root);
  if (actualFiles.some(({ relativePath }) => !listedPaths.has(relativePath))) throw new Error('release contains unlisted files');
  const signature = loaded.signature;
  if (!signature) {
    if (requireSignature) throw new Error('signed release required');
    return { signed: false, releaseVersion: loaded.releaseVersion, fileCount: loaded.files.length };
  }
  if (signature.algorithm !== 'Ed25519' || typeof signature.value !== 'string' || typeof signature.keyId !== 'string') throw new Error('invalid release signature');
  const trustedKey = publicKey?.type === 'public' ? publicKey : createPublicKey(publicKey ?? signature.publicKey);
  const trustedKeyId = createHash('sha256').update(trustedKey.export({ type: 'spki', format: 'der' })).digest('hex').slice(0, 32);
  if (trustedKeyId !== signature.keyId) throw new Error('release signing key fingerprint mismatch');
  const unsigned = { ...loaded, signature: null };
  if (!verify(null, Buffer.from(canonicalJson(unsigned)), trustedKey, Buffer.from(signature.value, 'base64'))) throw new Error('invalid release signature');
  return { signed: true, keyId: signature.keyId, releaseVersion: loaded.releaseVersion, fileCount: loaded.files.length };
}

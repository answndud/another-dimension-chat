import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createManifest, verifyManifest } from './release_manifest.mjs';

test('signed release manifests detect tampering and verify with the trusted key', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'another-dimension-manifest-'));
  await mkdir(path.join(root, 'apps'), { recursive: true });
  await writeFile(path.join(root, 'apps', 'bundle.js'), 'immutable bundle\n');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const manifest = await createManifest(root, { version: '1.2.3', privateKey });
  assert.equal((await verifyManifest(root, { manifest, publicKey, requireSignature: true })).signed, true);
  await writeFile(path.join(root, 'apps', 'bundle.js'), 'replaced bundle\n');
  await assert.rejects(() => verifyManifest(root, { manifest, publicKey, requireSignature: true }), /hash mismatch/);
});

test('unsigned development manifests are rejected by the verified path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'another-dimension-manifest-'));
  await writeFile(path.join(root, 'index.html'), 'development\n');
  const manifest = await createManifest(root, { version: '0.1.0' });
  assert.equal((await verifyManifest(root, { manifest })).signed, false);
  await assert.rejects(() => verifyManifest(root, { manifest, requireSignature: true }), /signed release required/);
  await assert.rejects(() => verifyManifest(root, { manifest, minVersion: '0.2.0' }), /older than the minimum/);
});

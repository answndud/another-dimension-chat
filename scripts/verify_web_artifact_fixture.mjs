#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyWebArtifact } from "./verify_web_artifact.mjs";

const root = await mkdtemp(join(tmpdir(), "another-dimension-web-artifact-"));
await mkdir(join(root, "assets"), { recursive: true });
await writeFile(join(root, "assets/app.js"), "console.log('fixture');\n");
const bytes = Buffer.from(await import("node:fs/promises").then(({ readFile }) => readFile(join(root, "assets/app.js"))));
const { createHash } = await import("node:crypto");
await writeFile(join(root, "asset-integrity.json"), JSON.stringify({ format: "another-dimension-asset-integrity", version: 1, assets: { "/assets/app.js": { sha256: createHash("sha256").update(bytes).digest("base64"), bytes: bytes.byteLength } } }));
const hash = createHash("sha256").update(bytes).digest("base64");
await writeFile(join(root, "index.html"), `<script type="module" src="/assets/app.js" integrity="sha256-${hash}" crossorigin="anonymous"></script>\n`);
assert.deepEqual(await verifyWebArtifact(root), { assetCount: 1, references: 1 });
await writeFile(join(root, "index.html"), '<script type="module" src="/src/main.js"></script>\n');
await assert.rejects(() => verifyWebArtifact(root), /source path/);
console.log("web artifact negative acceptance passed: source-path UI rejected");

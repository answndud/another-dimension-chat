import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function allFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await allFiles(root, absolute));
    else files.push(absolute.slice(root.length + 1).split("\\").join("/"));
  }
  return files;
}

function integrityManifest() {
  return {
    name: "another-dimension-asset-integrity",
    apply: "build",
    async closeBundle() {
      const root = join(process.cwd(), "dist");
      const files = await allFiles(root);
      const assets = {};
      for (const file of files) {
        if (file === "asset-integrity.json" || file.endsWith(".map")) continue;
        const bytes = await readFile(join(root, file));
        assets[`/${file}`] = {
          sha256: createHash("sha256").update(bytes).digest("base64"),
          bytes: bytes.byteLength,
        };
      }
      const indexFile = join(root, "index.html");
      let index = await readFile(indexFile, "utf8");
      index = index.replace(/(<(?:script|link)\b[^>]+(?:src|href)="(\/assets\/[^"]+)"[^>]*)(>)/g, (full, prefix, asset, end) => {
        const entry = assets[asset];
        if (!entry || /\bintegrity=/.test(prefix)) return full;
        return `${prefix} integrity="sha256-${entry.sha256}" crossorigin="anonymous"${end}`;
      });
      await writeFile(indexFile, index);
      const indexedBytes = await readFile(indexFile);
      assets["/index.html"] = {
        sha256: createHash("sha256").update(indexedBytes).digest("base64"),
        bytes: indexedBytes.byteLength,
      };
      await writeFile(join(root, "asset-integrity.json"), `${JSON.stringify({ format: "another-dimension-asset-integrity", version: 1, assets }, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  clearScreen: false,
  server: {
    headers: {
      "Cache-Control": "no-store",
    },
  },
  plugins: [integrityManifest()],
  build: {
    sourcemap: false,
    manifest: true,
  },
});

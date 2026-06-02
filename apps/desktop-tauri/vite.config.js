import { defineConfig } from "vite";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, "../..");
const previewStoreRoot = resolve(repoRoot, "another-dimension-dev-browser-rendezvous");
const previewPeer =
  process.env.VITE_AD_PREVIEW_PEER === "peer-a" || process.env.VITE_AD_PREVIEW_PEER === "peer-b"
    ? process.env.VITE_AD_PREVIEW_PEER
    : "";

function previewStoreFile(kind, key) {
  const safeKey = Buffer.from(String(key ?? ""), "utf8").toString("hex");
  return resolve(previewStoreRoot, `${kind}-${safeKey}.json`);
}

function readPreviewJson(kind, key, fallback) {
  try {
    return JSON.parse(readFileSync(previewStoreFile(kind, key), "utf8"));
  } catch {
    return fallback;
  }
}

function writePreviewJson(kind, key, value) {
  mkdirSync(previewStoreRoot, { recursive: true });
  writeFileSync(previewStoreFile(kind, key), JSON.stringify(value), "utf8");
}

function readRequestJson(req) {
  return new Promise((resolveRead) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolveRead(JSON.parse(body || "{}"));
      } catch {
        resolveRead({});
      }
    });
  });
}

function sendJson(res, value) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(value));
}

function browserPreviewRendezvousPlugin() {
  return {
    name: "another-dimension-browser-preview-rendezvous",
    configureServer(server) {
      server.middlewares.use("/__ad_preview", async (req, res) => {
        const body = await readRequestJson(req);
        if (req.url === "/reset") {
          rmSync(previewStoreRoot, { recursive: true, force: true });
          sendJson(res, { ok: true });
          return;
        }
        if (req.url === "/invite/get") {
          sendJson(res, { ok: true, record: readPreviewJson("invite", body.token, null) });
          return;
        }
        if (req.url === "/invite/put") {
          writePreviewJson("invite", body.token, body.record ?? null);
          sendJson(res, { ok: true });
          return;
        }
        if (req.url === "/transcript/get") {
          sendJson(res, { ok: true, entries: readPreviewJson("transcript", body.profile, []) });
          return;
        }
        if (req.url === "/transcript/append") {
          const entries = readPreviewJson("transcript", body.profile, []);
          entries.push(body.entry);
          writePreviewJson("transcript", body.profile, entries);
          sendJson(res, { ok: true });
          return;
        }
        res.statusCode = 404;
        res.end();
      });
    },
  };
}

export default defineConfig({
  clearScreen: false,
  cacheDir: previewPeer ? `node_modules/.vite-${previewPeer}` : "node_modules/.vite",
  plugins: [browserPreviewRendezvousPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

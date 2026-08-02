#!/usr/bin/env node
import { access, lstat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { loadServerConfig } from "../apps/server/server.mjs";
import { verifyWebArtifact } from "./verify_web_artifact.mjs";

const args = process.argv.slice(2);
const configIndex = args.indexOf("--config");
const configFile = configIndex >= 0 ? args[configIndex + 1] : "";
if (configIndex >= 0 && (!configFile || configFile.startsWith("--"))) throw new Error("--config requires a path.");
if (Number(process.versions.node.split(".")[0]) < 20) throw new Error(`Node.js 20 or newer is required (found ${process.version}).`);

const config = configFile ? await loadServerConfig(configFile) : {};
const distDir = resolve(config.distDir || new URL("../apps/web/dist", import.meta.url).pathname);
if (config.serveStatic === true || process.env.AD_SERVE_UI === "1") {
  await access(resolve(distDir, "index.html"), constants.R_OK);
  await access(resolve(distDir, "asset-integrity.json"), constants.R_OK);
  await verifyWebArtifact(distDir);
}
if (config.tlsKeyFile || config.tlsCertFile) {
  if (!config.tlsKeyFile || !config.tlsCertFile) throw new Error("TLS key and certificate must be configured together.");
  await access(config.tlsKeyFile, constants.R_OK);
  await access(config.tlsCertFile, constants.R_OK);
}
if (["0.0.0.0", "::"].includes(config.bindHost) && !config.publicUrl) throw new Error("Wildcard bind requires an HTTPS publicUrl.");
if (config.publicUrl && !config.publicUrl.startsWith("https://")) throw new Error("Remote publicUrl must use HTTPS; HTTP is not an acceptable browser transport.");
if (config.dataDir) {
  const dataInfo = await lstat(config.dataDir).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (dataInfo?.isSymbolicLink() || (dataInfo && !dataInfo.isDirectory())) throw new Error("Server data directory must be a real directory, not a symlink or file.");
}
if (configFile) await access(resolve(configFile), constants.R_OK);
console.log(`사전 점검 통과: Node ${process.versions.node} · 모드 ${config.serveStatic === true || process.env.AD_SERVE_UI === "1" ? "relay+검증된 static UI" : "relay-only"} · bind ${config.bindHost || "127.0.0.1"}:${config.port || 1422}`);
console.log("다음 단계: 서버를 시작한 뒤 private UI URL을 별도 검증된 브라우저에서만 여세요. URL의 #local 값은 capability secret입니다.");

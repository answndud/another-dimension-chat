#!/usr/bin/env node
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { loadServerConfig } from "../apps/server/server.mjs";

const args = process.argv.slice(2);
const configIndex = args.indexOf("--config");
const configFile = configIndex >= 0 ? args[configIndex + 1] : "";
if (configIndex >= 0 && (!configFile || configFile.startsWith("--"))) throw new Error("--config requires a path.");
if (Number(process.versions.node.split(".")[0]) < 20) throw new Error(`Node.js 20 or newer is required (found ${process.version}).`);

const config = configFile ? await loadServerConfig(configFile) : {};
const distDir = resolve(config.distDir || new URL("../apps/web/dist", import.meta.url).pathname);
await access(resolve(distDir, "index.html"), constants.R_OK);
if (config.tlsKeyFile || config.tlsCertFile) {
  if (!config.tlsKeyFile || !config.tlsCertFile) throw new Error("TLS key and certificate must be configured together.");
  await access(config.tlsKeyFile, constants.R_OK);
  await access(config.tlsCertFile, constants.R_OK);
}
if (["0.0.0.0", "::"].includes(config.bindHost) && !config.publicUrl) throw new Error("Wildcard bind requires an HTTPS publicUrl.");
if (configFile) await access(resolve(configFile), constants.R_OK);
console.log(`preflight passed: Node ${process.versions.node}, web dist ${distDir}, bind ${config.bindHost || "127.0.0.1"}:${config.port || 1422}`);

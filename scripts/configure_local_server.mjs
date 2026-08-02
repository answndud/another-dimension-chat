#!/usr/bin/env node

import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const defaultConfigFile = resolve(projectDir, ".another-dimension-server/server-config.json");

function normalizedOrigin(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error("Public URL must be a valid HTTPS origin."); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Public URL must be an HTTPS origin without credentials, path, query, or fragment.");
  }
  return url.origin;
}

function normalizedPort(value) {
  const port = Number(value ?? 1422);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port must be an integer between 1 and 65535.");
  return port;
}

export function buildServerConfig({
  mode = "local",
  port = 1422,
  publicUrl = "",
  corsOrigins = [],
  tlsKeyFile = "",
  tlsCertFile = "",
  dataDir = resolve(projectDir, ".another-dimension-server"),
} = {}) {
  const normalizedMode = String(mode);
  const result = {
    bindHost: normalizedMode === "local" || normalizedMode === "reverse-proxy" ? "127.0.0.1" : "0.0.0.0",
    port: normalizedPort(port),
    dataDir: resolve(String(dataDir)),
  };
  if (corsOrigins.length) result.corsOrigins = corsOrigins.map(normalizedOrigin);
  if (normalizedMode === "local") return result;
  if (!["reverse-proxy", "direct-tls"].includes(normalizedMode)) {
    throw new Error("Mode must be local, reverse-proxy, or direct-tls.");
  }
  result.publicUrl = normalizedOrigin(publicUrl);
  if (normalizedMode === "direct-tls") {
    if (!tlsKeyFile || !tlsCertFile) throw new Error("Direct TLS mode requires both key and certificate files.");
    result.tlsKeyFile = resolve(String(tlsKeyFile));
    result.tlsCertFile = resolve(String(tlsCertFile));
  }
  return result;
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return "";
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} requires a value.`);
  return args[index + 1];
}

async function interactiveAnswers() {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("상대방이 이 서버에 접근하는 방식을 선택하세요:");
    console.log("  1. 이 기기에서만 사용 (안전한 기본값, 자동 전달은 같은 기기 fixture용)");
    console.log("  2. 이미 운영 중인 HTTPS reverse proxy 또는 Tailscale Serve 뒤에 연결");
    console.log("  3. 보유한 PEM 인증서와 key로 직접 HTTPS 제공");
    const choice = (await terminal.question("방식 [1]: ")).trim() || "1";
    const mode = { 1: "local", 2: "reverse-proxy", 3: "direct-tls" }[choice];
    if (!mode) throw new Error("1, 2, 3 중 하나를 선택하세요.");
    const port = (await terminal.question("로컬 서버 포트 [1422]: ")).trim() || "1422";
    if (mode === "local") return { mode, port };
    const publicUrl = (await terminal.question("상대가 접근할 HTTPS origin (예: https://chat.example.com): ")).trim();
    if (mode === "reverse-proxy") return { mode, port, publicUrl };
    const tlsKeyFile = (await terminal.question("TLS private key PEM 경로: ")).trim();
    const tlsCertFile = (await terminal.question("TLS certificate PEM 경로: ")).trim();
    return { mode, port, publicUrl, tlsKeyFile, tlsCertFile };
  } finally {
    terminal.close();
  }
}

export async function saveServerConfig(configFile, config) {
  if (config.tlsKeyFile) await access(config.tlsKeyFile, constants.R_OK);
  if (config.tlsCertFile) await access(config.tlsCertFile, constants.R_OK);
  await mkdir(dirname(configFile), { recursive: true, mode: 0o700 });
  await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(configFile, 0o600);
}

async function main() {
  const args = process.argv.slice(2);
  const allowedArguments = new Set(["--config", "--mode", "--port", "--public-url", "--cors-origin", "--tls-key", "--tls-cert", "--data-dir"]);
  for (let index = 0; index < args.length; index += 2) {
    if (!allowedArguments.has(args[index])) throw new Error(`Unknown option: ${args[index]}`);
    if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${args[index]} requires a value.`);
  }
  const configFile = resolve(argumentValue(args, "--config") || defaultConfigFile);
  const mode = argumentValue(args, "--mode");
  const answers = mode
    ? {
        mode,
        port: argumentValue(args, "--port") || 1422,
        publicUrl: argumentValue(args, "--public-url"),
        corsOrigins: argumentValue(args, "--cors-origin") ? argumentValue(args, "--cors-origin").split(",") : [],
        tlsKeyFile: argumentValue(args, "--tls-key"),
        tlsCertFile: argumentValue(args, "--tls-cert"),
        dataDir: argumentValue(args, "--data-dir") || dirname(configFile),
      }
    : { ...(await interactiveAnswers()), dataDir: dirname(configFile) };
  const config = buildServerConfig(answers);
  await saveServerConfig(configFile, config);
  console.log(`서버 설정 저장 완료: ${configFile}`);
  console.log(`모드: ${answers.mode} · bind ${config.bindHost}:${config.port}${config.publicUrl ? ` · advertise ${config.publicUrl}` : ""}`);
  console.log("다음부터는 ./scripts/start_local_server.sh만 실행하면 이 설정을 다시 사용합니다.");
  if (config.publicUrl) {
    console.log(`서버와 HTTPS route를 시작한 뒤 다음 명령으로 endpoint를 확인하세요: node scripts/check_https_endpoint.mjs ${config.publicUrl}`);
  }
}

const launchedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (launchedDirectly) {
  main().catch((error) => {
    console.error(`Configuration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

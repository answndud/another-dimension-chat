#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const bridge = await readFile("apps/daemon/src/bridge.rs", "utf8");
const bridgeHttp = await readFile("apps/daemon/src/bridge_http.rs", "utf8");
const httpServer = await readFile("apps/daemon/src/http_server.rs", "utf8");
const failures = [];
for (const marker of [
  "TcpListener",
  "is_loopback",
  "#ad_bootstrap=",
  "self.bootstrap_hash = None",
  "HttpOnly",
  "SameSite=Strict",
  "constant_time_equal",
  "InvalidRequestOrigin",
  "InvalidHost",
  "CsrfRequired",
  "invalidate_session",
  "ui_version",
]) {
  if (!bridge.includes(marker)) failures.push(`local bridge marker missing: ${marker}`);
}
for (const forbidden of ["localStorage", "IndexedDB", "private_key", "plaintext"]) {
  if (bridge.includes(forbidden)) failures.push(`local bridge must not own browser/private-state surface: ${forbidden}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
for (const marker of [
  "axum::serve",
  "tokio::net::TcpListener",
  "to_bytes(body, MAX_REQUEST_BYTES)",
  "Duration::from_secs(10)",
]) {
  if (!httpServer.includes(marker)) failures.push(`HTTP server marker missing: ${marker}`);
}
if (httpServer.includes("fn serve_connection")) failures.push("manual TCP connection parser is still live");
for (const marker of [
  "exchange_status_and_lock_are_authenticated",
  "chromium_same_origin_get_may_omit_origin_but_wrong_origin_is_rejected",
  "authenticated_session_routes_to_daemon_owned_mls_catalog",
]) {
  if (!bridgeHttp.includes(marker)) failures.push(`bridge negative contract test missing: ${marker}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("local bridge boundary passed: loopback, one-time bootstrap, origin/host, CSRF, cookie, version, request bounds, and focused negative tests present");

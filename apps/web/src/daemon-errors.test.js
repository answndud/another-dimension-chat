import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { daemonErrorCode, daemonErrorMessage, hasDaemonErrorGuidance } from "./daemon-errors.js";

test("daemon errors map stable codes to recovery guidance", () => {
  assert.equal(daemonErrorCode({ code: "relay_unavailable" }), "relay_unavailable");
  assert.match(daemonErrorMessage({ code: "relay_unavailable" }), /재시도/);
  assert.match(daemonErrorMessage({ code: "pairing_not_ready" }), /안전 번호/);
  assert.equal(daemonErrorMessage(new Error("원인")), "원인");
  assert.equal(daemonErrorCode({}), "unknown");
});

test("every directly returned daemon error code has user recovery guidance", () => {
  const sourceRoot = resolve(import.meta.dirname, "../../daemon/src");
  const files = [
    "bridge_http.rs",
    "session_routes.rs",
    "mls_routes.rs",
    "attachment_routes.rs",
    "http_errors.rs",
    "http_server.rs",
  ];
  const codes = new Set();
  for (const file of files) {
    const source = readFileSync(resolve(sourceRoot, file), "utf8");
    for (const match of source.matchAll(/response\(\s*\d+\s*,\s*"([a-z0-9_-]+)"/g)) {
      codes.add(match[1]);
    }
  }
  const missing = [...codes].filter((code) => !hasDaemonErrorGuidance(code)).sort();
  assert.deepEqual(missing, []);
});

test("unknown coded failures never expose internal identifiers as UI copy", () => {
  assert.doesNotMatch(daemonErrorMessage({ code: "future_internal_code", message: "future_internal_code" }), /future_internal_code/);
});

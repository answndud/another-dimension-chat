import assert from "node:assert/strict";
import { test } from "node:test";
import { daemonErrorCode, daemonErrorMessage } from "./daemon-errors.js";

test("daemon errors map stable codes to recovery guidance", () => {
  assert.equal(daemonErrorCode({ code: "relay_unavailable" }), "relay_unavailable");
  assert.match(daemonErrorMessage({ code: "relay_unavailable" }), /재시도/);
  assert.match(daemonErrorMessage({ code: "pairing_not_ready" }), /안전 번호/);
  assert.equal(daemonErrorMessage(new Error("원인")), "원인");
  assert.equal(daemonErrorCode({}), "unknown");
});

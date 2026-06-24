import test from "node:test";
import assert from "node:assert/strict";

import {
  manualEnvelopeFailureClassForError,
  manualEnvelopePanelItems,
} from "./manual-envelope-panel-state.js";

test("manualEnvelopeFailureClassForError classifies replay failures first", () => {
  assert.equal(
    manualEnvelopeFailureClassForError("Payload replay detected", {
      redactedUiErrorClass: () => "fallback",
    }),
    "replay-rejected",
  );
});

test("manualEnvelopeFailureClassForError classifies malformed envelope payloads", () => {
  for (const sample of [
    "Malformed envelope",
    "payload decode failed",
    "bad payload bytes",
    "invalid envelope format",
  ]) {
    assert.equal(
      manualEnvelopeFailureClassForError(sample, {
        redactedUiErrorClass: () => "fallback",
      }),
      "malformed-envelope",
    );
  }
});

test("manualEnvelopeFailureClassForError falls back to the redacted UI error class", () => {
  assert.equal(
    manualEnvelopeFailureClassForError("session expired", {
      redactedUiErrorClass: () => "session-expired",
    }),
    "session-expired",
  );
});

test("manualEnvelopePanelItems returns the manual panel sections in render order", () => {
  const view = {
    current: { state: "ready" },
    export: { state: "complete" },
    import: { state: "ready" },
    reply: { state: "idle" },
    recovery: { state: "ready" },
    failure: { state: "none" },
  };
  assert.deepEqual(
    manualEnvelopePanelItems(view),
    [
      ["current", view.current],
      ["export", view.export],
      ["import", view.import],
      ["reply", view.reply],
      ["recovery", view.recovery],
      ["failure", view.failure],
    ],
  );
});

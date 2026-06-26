import assert from "node:assert/strict";
import test from "node:test";
import { createProductionMessageReadiness } from "./production-message-readiness.js";

test("createProductionMessageReadiness derives message-only readiness flags", () => {
  const readiness = createProductionMessageReadiness({
    fields: { productionReceivedMessage: { value: "received" } },
    hasProfileUnlockInput: true,
    message: { message: "hello", envelopePayload: "envelope" },
    selectedManualExportProfileMatches: true,
    selectedManualImportProfileMatches: true,
    twoProfile: {
      profileA: "alice",
      profileB: "bob",
      passphrase: "pair",
      messageTtlSeconds: "60",
      message: "hello",
    },
    productionMessageUsesAutoNumber: () => false,
    validProductionMessageNumber: () => 12,
    sessionReadyForMessages: true,
    latestProductionMessageImportMatches: (message) => message.message === "hello",
  });

  assert.equal(readiness.hasMessageNumberForExport, true);
  assert.equal(readiness.hasMessageNumberForImport, true);
  assert.equal(readiness.hasOutboundMessageInput, true);
  assert.equal(readiness.hasInboundEnvelopeInput, true);
  assert.equal(readiness.hasImportedMessage, true);
  assert.equal(readiness.hasReceivedExportInput, true);
  assert.equal(readiness.hasReceivedMessage, true);
  assert.equal(readiness.hasTwoProfileInput, true);
  assert.equal(readiness.hasTwoProfileSetupInput, true);
  assert.equal(readiness.hasTwoProfileSessionStatusInput, true);
});

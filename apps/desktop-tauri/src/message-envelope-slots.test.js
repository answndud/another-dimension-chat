import test from "node:test";
import assert from "node:assert/strict";

import {
  createMessageEnvelopeSlot,
  messageEnvelopePayloadImportDecision,
  messageEnvelopeSlotCreatedByExplicitUserAction,
  messageEnvelopeSlotImportReadyForEntry,
  messageEnvelopeSlotMatchesEntry,
  messageEnvelopeSlotMismatchReason,
  messageEnvelopeSlotPayload,
  messageEnvelopeSlotReadyForEntry,
  messageEnvelopeSlotRecoveryHint,
} from "./message-envelope-slots.js";

function pendingEntry(overrides = {}) {
  return {
    sender: "alice",
    receiver: "bob",
    roomFingerprint: "room-1",
    messageNumber: 9,
    message: "hello",
    statuses: new Set(["sent"]),
    outboundDeliveryState: "sent",
    ...overrides,
  };
}

function explicitSlot(overrides = {}) {
  return createMessageEnvelopeSlot("alice", "ADENV1|1|chan|9|data|00", {
    explicitUserAction: true,
    manualAction: "export-envelope",
    receiver: "bob",
    roomFingerprint: "room-1",
    messageNumber: 9,
    message: "hello",
    ...overrides,
  });
}

test("message envelope import decision fails closed for payload shape and replay errors", () => {
  assert.equal(messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|00").accepted, true);
  assert.equal(messageEnvelopePayloadImportDecision("").kind, "malformed");
  assert.equal(messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|0z").kind, "corrupted");
  assert.equal(messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|control|00").kind, "wrong_type");
  assert.equal(
    messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|00", {
      duplicatePayloads: new Set(["ADENV1|1|chan|9|data|00"]),
    }).kind,
    "duplicate",
  );
  assert.equal(
    messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|00", {
      replayedMessageNumbers: new Set([9]),
    }).kind,
    "replay_rejected",
  );
});

test("message envelope slots require explicit manual export metadata", () => {
  const slot = explicitSlot();
  assert.equal(messageEnvelopeSlotCreatedByExplicitUserAction(slot), true);
  assert.equal(
    createMessageEnvelopeSlot("alice", "ADENV1|1|chan|9|data|00", {
      receiver: "bob",
      roomFingerprint: "room-1",
      messageNumber: 9,
      message: "hello",
    }),
    null,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(
      {
        payload: "ADENV1|1|chan|9|data|00",
        sender: "alice",
        receiver: "bob",
        roomFingerprint: "room-1",
        messageNumber: 9,
        message: "hello",
      },
      pendingEntry(),
    ),
    "missing-explicit-user-action",
  );
});

test("message envelope slot readiness only accepts the matching active pending row", () => {
  const slot = explicitSlot();
  const entry = pendingEntry();
  assert.equal(messageEnvelopeSlotPayload(slot), "ADENV1|1|chan|9|data|00");
  assert.equal(messageEnvelopeSlotMatchesEntry(slot, entry), true);
  assert.equal(messageEnvelopeSlotReadyForEntry(slot, entry), true);
  assert.equal(messageEnvelopeSlotImportReadyForEntry(slot, entry), true);

  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, pendingEntry({ messageNumber: 10 })),
    "payload-wrong_type",
  );
  assert.match(
    messageEnvelopeSlotRecoveryHint(slot, pendingEntry({ messageNumber: 10 })),
    /valid data envelope/,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, pendingEntry({ sender: "carol" })),
    "sender-mismatch",
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, pendingEntry({ receiver: "dave" })),
    "receiver-mismatch",
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, pendingEntry({ roomFingerprint: "room-2" })),
    "room-fingerprint-mismatch",
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, pendingEntry({ message: "updated" })),
    "message-mismatch",
  );
});

test("message envelope slot import readiness blocks canceled and already received entries", () => {
  const slot = explicitSlot();
  assert.equal(
    messageEnvelopeSlotImportReadyForEntry(slot, pendingEntry({ outboundDeliveryState: "canceled" })),
    false,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, pendingEntry({ outboundDeliveryState: "canceled" })),
    "canceled-entry",
  );
  assert.equal(
    messageEnvelopeSlotImportReadyForEntry(slot, pendingEntry({ statuses: new Set(["sent", "received"]) })),
    false,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, pendingEntry({ statuses: new Set(["sent", "received"]) })),
    "already-received-entry",
  );
});

test("message envelope slot recovery hints stay specific for stale and mismatched cases", () => {
  const legacy = "ADENV1LEGACY";
  const slot = explicitSlot();
  assert.match(messageEnvelopeSlotRecoveryHint(legacy, pendingEntry()), /unscoped/);
  assert.match(
    messageEnvelopeSlotRecoveryHint(slot, pendingEntry({ message: "updated" })),
    /stale/,
  );
  assert.match(
    messageEnvelopeSlotRecoveryHint(slot, pendingEntry({ sender: "carol" })),
    /another sender or receiver/,
  );
  assert.match(
    messageEnvelopeSlotRecoveryHint(slot, pendingEntry({ roomFingerprint: "room-2" })),
    /another room/,
  );
  assert.match(
    messageEnvelopeSlotRecoveryHint(null, pendingEntry()),
    /matching scoped envelope/,
  );
});

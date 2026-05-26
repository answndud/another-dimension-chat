import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageEnvelopeSlot,
  messageEnvelopeSlotMatchesEntry,
  messageEnvelopeSlotPayload,
  messageEnvelopeSlotReadyForEntry,
} from "./message-envelope-slots.js";

const selectedEntry = {
  sender: "alice",
  receiver: "bob",
  messageNumber: 7,
  message: "confirm rendezvous window",
};

test("message envelope slots normalize selected conversation metadata", () => {
  const slot = createMessageEnvelopeSlot(" Alice ", " ADENV1.payload ", {
    receiver: " Bob ",
    messageNumber: "7",
    message: " confirm rendezvous window ",
  });

  assert.deepEqual(slot, {
    payload: "ADENV1.payload",
    sender: "alice",
    receiver: "bob",
    messageNumber: 7,
    message: "confirm rendezvous window",
  });
  assert.equal(messageEnvelopeSlotPayload(slot), "ADENV1.payload");
  assert.equal(messageEnvelopeSlotMatchesEntry(slot, selectedEntry), true);
  assert.equal(messageEnvelopeSlotReadyForEntry(slot, selectedEntry), true);
});

test("message envelope slots reject stale selected conversation metadata", () => {
  const slot = createMessageEnvelopeSlot("alice", "ADENV1.payload", {
    receiver: "bob",
    messageNumber: 7,
    message: "confirm rendezvous window",
  });

  assert.equal(messageEnvelopeSlotReadyForEntry(slot, { ...selectedEntry, messageNumber: 8 }), false);
  assert.equal(messageEnvelopeSlotReadyForEntry(slot, { ...selectedEntry, receiver: "carol" }), false);
  assert.equal(messageEnvelopeSlotReadyForEntry(slot, { ...selectedEntry, message: "different message" }), false);
});

test("legacy payload-only envelope slot strings remain compatible", () => {
  assert.equal(messageEnvelopeSlotReadyForEntry("ADENV1.payload", selectedEntry), true);
  assert.equal(messageEnvelopeSlotReadyForEntry("", selectedEntry), false);
});

test("empty profile or payload cannot create a message envelope slot", () => {
  assert.equal(createMessageEnvelopeSlot("", "ADENV1.payload", selectedEntry), null);
  assert.equal(createMessageEnvelopeSlot("alice", " ", selectedEntry), null);
});

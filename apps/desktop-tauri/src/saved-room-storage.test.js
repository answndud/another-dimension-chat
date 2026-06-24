import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeStoredRealOnionRecovery,
  readSavedInviteRooms,
  readStoredLifecycleMap,
  readStoredStringMap,
  roomListStoragePayload,
} from "./saved-room-storage.js";

test("readSavedInviteRooms normalizes retryable and manual rebuild metadata", () => {
  const rooms = readSavedInviteRooms(
    JSON.stringify([
      {
        code: "code-1",
        role: "inviter",
        updatedAt: 50,
        retryableOutboundCount: 1,
        retryableOutboundMessageNumber: "9",
        retryableOutboundMessage: "hello",
        retryableOutboundAction: "retry-network",
        manualRebuildFlow: true,
        manualRebuildDeliveryScope: "retry",
        manualRebuildDeliveryAction: "refresh-and-retry",
        manualRebuildMessageNumber: "3",
        manualRebuildUpdatedAt: 100,
      },
    ]),
    "null",
    {
      now: 200,
      normalizeRetryableAction: (value) => String(value ?? "").trim().toLowerCase(),
    },
  );
  assert.equal(rooms.length, 1);
  assert.deepEqual(rooms[0], {
    code: "code-1",
    role: "inviter",
    updatedAt: 50,
    lastMessagePreview: "",
    lastMessageAt: 0,
    messageCount: 0,
    retryableOutboundCount: 1,
    retryableOutboundMessageNumber: 9,
    retryableOutboundMessage: "hello",
    retryableOutboundAction: "retry-network",
    manualRebuildFlow: true,
    manualRebuildDeliveryScope: "retry",
    manualRebuildDeliveryAction: "refresh-and-retry",
    manualRebuildMessageNumber: 3,
    manualRebuildUpdatedAt: 100,
  });
});

test("readSavedInviteRooms falls back to last invite room when list is empty", () => {
  const rooms = readSavedInviteRooms("[]", JSON.stringify({ code: "fallback-room", role: "joiner" }));
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].code, "fallback-room");
  assert.equal(rooms[0].role, "joiner");
});

test("roomListStoragePayload strips retry metadata when count is zero", () => {
  const payload = roomListStoragePayload(
    [
      {
        code: "room-a",
        role: "inviter",
        updatedAt: 1,
        retryableOutboundCount: 0,
        retryableOutboundMessageNumber: 99,
        retryableOutboundMessage: "keep out",
        retryableOutboundAction: "retry-network",
        manualRebuildFlow: false,
      },
    ],
    {
      normalizeRetryableAction: (value) => String(value ?? "").trim(),
    },
  );
  assert.equal(payload[0].retryableOutboundMessageNumber, 0);
  assert.equal(payload[0].retryableOutboundMessage, "");
  assert.equal(payload[0].retryableOutboundAction, "");
});

test("normalizeStoredRealOnionRecovery rejects expired records", () => {
  const normalized = normalizeStoredRealOnionRecovery(
    { action: "retry-bootstrap", updatedAt: 1 },
    { now: 24 * 60 * 60 * 1000 * 2 },
  );
  assert.equal(normalized, null);
});

test("stored route readers keep only valid normalized entries", () => {
  const stringMap = readStoredStringMap(JSON.stringify({ " room-a ": " code-a ", bad: "" }));
  const lifecycleMap = readStoredLifecycleMap(
    JSON.stringify({
      roomA: { endpoint: "onion-endpoint", state: "listening", updatedAt: "4", generation: "9" },
      roomB: { endpoint: "", state: "stopped" },
    }),
  );
  assert.equal(stringMap.get("room-a"), "code-a");
  assert.equal(lifecycleMap.get("roomA")?.state, "stopped");
  assert.equal(lifecycleMap.get("roomA")?.generation, 9);
  assert.equal(lifecycleMap.has("roomB"), false);
});

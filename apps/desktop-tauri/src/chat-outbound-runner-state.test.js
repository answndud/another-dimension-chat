import test from "node:test";
import assert from "node:assert/strict";

import { resolveOutboundEntryForAction } from "./chat-outbound-runner-state.js";

test("resolveOutboundEntryForAction stops when room restore fails", async () => {
  const result = await resolveOutboundEntryForAction(
    { messageNumber: 7 },
    {
      restoreInviteRoomForConversationEntry: async () => false,
      currentTwoProfileRetryableOutboundEntry: () => ({ messageNumber: 7 }),
      showCurrentRetryableOutboundMissing: () => {
        throw new Error("should not be called");
      },
    },
  );
  assert.deepEqual(result, { ok: false, reason: "room-restore-failed", entry: null });
});

test("resolveOutboundEntryForAction reports missing retryable entry after restore", async () => {
  let missing = null;
  const original = { messageNumber: 8 };
  const result = await resolveOutboundEntryForAction(original, {
    restoreInviteRoomForConversationEntry: async () => true,
    currentTwoProfileRetryableOutboundEntry: () => null,
    showCurrentRetryableOutboundMissing: (entry) => {
      missing = entry;
    },
  });
  assert.deepEqual(result, { ok: false, reason: "missing-current-entry", entry: null });
  assert.equal(missing, original);
});

test("resolveOutboundEntryForAction returns the refreshed entry when available", async () => {
  const currentEntry = { messageNumber: 9, message: "retry me" };
  const result = await resolveOutboundEntryForAction(
    { messageNumber: 9 },
    {
      restoreInviteRoomForConversationEntry: async () => true,
      currentTwoProfileRetryableOutboundEntry: () => currentEntry,
      showCurrentRetryableOutboundMissing: () => {
        throw new Error("should not be called");
      },
    },
  );
  assert.deepEqual(result, { ok: true, reason: "resolved", entry: currentEntry });
});

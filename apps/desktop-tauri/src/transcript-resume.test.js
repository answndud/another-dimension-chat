import test from "node:test";
import assert from "node:assert/strict";

import {
  currentRoomConversationMetadata,
  reconcileCurrentInviteRoomMetadataFromTranscriptEntries,
  savedInviteRoomMetadataSyncCandidates,
} from "./transcript-resume.js";

test("currentRoomConversationMetadata applies preferred retryable and session status hooks", () => {
  const result = currentRoomConversationMetadata({
    currentTranscriptMetadata: { retryableOutboundCount: 1, retryableOutboundMessageNumber: 3 },
    existingRoom: { retryableOutboundMessageNumber: 3 },
    roomInput: { profileA: "a", profileB: "b" },
    conversationEntries: [],
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => ({ ...metadata, trimmed: true }),
    savedInviteRoomMetadataWithPreferredRetryable: (metadata) => ({ ...metadata, preferred: true }),
    savedInviteRoomMetadataWithSessionStatus: (metadata) => ({ ...metadata, session: true }),
    sessionStatus: { state: "ok" },
  });
  assert.deepEqual(result, { retryableOutboundCount: 1, retryableOutboundMessageNumber: 3, preferred: true, session: true });
});

test("reconcileCurrentInviteRoomMetadataFromTranscriptEntries stores transcript metadata", () => {
  let remembered = null;
  const ok = reconcileCurrentInviteRoomMetadataFromTranscriptEntries({
    code: "code-1",
    role: "inviter",
    entries: [],
    roomInput: { profileA: "a", profileB: "b" },
    productionInviteRoomConversationMetadata: () => ({ messageCount: 2 }),
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => metadata,
    savedInviteRoomMetadataWithPreferredRetryable: (metadata) => metadata,
    savedInviteRoomMetadataWithSessionStatus: (metadata) => metadata,
    rememberInviteRoom: (code, role, metadata) => {
      remembered = { code, role, metadata };
    },
  });
  assert.equal(ok, true);
  assert.deepEqual(remembered, { code: "code-1", role: "inviter", metadata: { messageCount: 2 } });
});

test("savedInviteRoomMetadataSyncCandidates sorts by priority then recency", () => {
  const result = savedInviteRoomMetadataSyncCandidates(
    [
      { code: "a", role: "inviter", updatedAt: 10 },
      { code: "b", role: "inviter", updatedAt: 20 },
    ],
    {
      savedInviteRoomPriorityEntries: (rooms) => rooms.map((room, index) => ({
        index,
        room,
        priority: room.code === "a" ? 2 : 2,
        updatedAt: room.updatedAt,
      })),
      savedRoomMetadataStartupSyncLimit: 1,
    },
  );
  assert.equal(result[0].code, "b");
});

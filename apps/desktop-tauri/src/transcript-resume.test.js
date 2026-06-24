import test from "node:test";
import assert from "node:assert/strict";

import {
  currentRoomConversationMetadata,
  reconcileCurrentInviteRoomMetadataFromTranscriptEntries,
  savedInviteRoomMetadataSyncCandidates,
  transcriptResumeWarningText,
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

test("transcriptResumeWarningText returns localized pending review guidance", () => {
  assert.equal(
    transcriptResumeWarningText({
      target: "pending-review",
      selectedMessageNumber: 7,
      currentLanguage: "ko",
      baseWarning: "base",
    }),
    "메시지 #7가 아직 완료되지 않았습니다. 대화는 저장되어 있으며 필요한 작업을 이어갈 수 있습니다.",
  );
  assert.equal(
    transcriptResumeWarningText({
      target: "pending-review",
      selectedMessageNumber: 7,
      currentLanguage: "en",
      baseWarning: "base",
    }),
    "Message #7 is still pending. The conversation is saved and ready to continue.",
  );
});

test("transcriptResumeWarningText appends recovery details for latest reply resume", () => {
  const result = transcriptResumeWarningText({
    target: "reply-latest",
    staleMessageEnvelopeSlotsPruned: 2,
    expiredMessagesPurged: 1,
    appendStaleMessageEnvelopeSlotsPruned: (text, count) => `${text} [stale:${count}]`,
    appendExpiredMessagesPurged: (text, count) => `${text} [expired:${count}]`,
  });
  assert.equal(
    result,
    "Stored conversation recovered. Latest delivered message is selected as the reply target. [stale:2] [expired:1]",
  );
});

test("transcriptResumeWarningText falls back to base warning when no specialized branch applies", () => {
  assert.equal(
    transcriptResumeWarningText({
      target: null,
      baseWarning: "base",
    }),
    "base",
  );
});

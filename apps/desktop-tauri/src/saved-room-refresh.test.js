import test from "node:test";
import assert from "node:assert/strict";

import {
  refreshCurrentRoomAfterReceiveImport,
  refreshSavedInviteRoomMetadataForFingerprint,
  rememberCurrentInviteRoomMetadata,
  savedInviteRoomMetadataFromLocalStores,
  syncSavedInviteRoomMetadataFromLocalStores,
} from "./saved-room-refresh.js";

test("savedInviteRoomMetadataFromLocalStores prefers the stored retryable outbound message", async () => {
  const result = await savedInviteRoomMetadataFromLocalStores({
    room: { retryableOutboundMessageNumber: 7 },
    roomInput: { profileA: "alice", profileB: "bob" },
    invokeRoomTranscriptExport: async () => ({
      entries: [{ messageNumber: 7 }],
      metadata: { retryableOutboundCount: 1, retryableOutboundMessageNumber: 9 },
    }),
    savedInviteRoomMetadataWithPreferredRetryable: (metadata, roomInput, entries, preferredMessageNumber) => ({
      ...metadata,
      preferredMessageNumber,
      pairedProfiles: `${roomInput.profileA}-${roomInput.profileB}`,
      entryCount: entries.length,
    }),
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => ({ ...metadata, cleared: true }),
  });

  assert.deepEqual(result, {
    retryableOutboundCount: 1,
    retryableOutboundMessageNumber: 9,
    preferredMessageNumber: 7,
    pairedProfiles: "alice-bob",
    entryCount: 1,
  });
});

test("savedInviteRoomMetadataFromLocalStores clears retryable metadata when no preferred message exists", async () => {
  const result = await savedInviteRoomMetadataFromLocalStores({
    room: { retryableOutboundMessageNumber: 0 },
    invokeRoomTranscriptExport: async () => ({
      entries: [],
      metadata: { retryableOutboundCount: 1, retryableOutboundMessageNumber: 4 },
    }),
    savedInviteRoomMetadataWithPreferredRetryable: (metadata) => metadata,
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => ({ ...metadata, retryableOutboundCount: 0, cleared: true }),
  });

  assert.deepEqual(result, {
    retryableOutboundCount: 0,
    retryableOutboundMessageNumber: 4,
    cleared: true,
  });
});

test("refreshSavedInviteRoomMetadataForFingerprint refreshes session status after retryable outbound is cleared", async () => {
  const remembered = [];
  const forgotten = [];
  let rendered = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 1,
      retryableOutboundMessageNumber: 8,
    },
    roomFingerprint: "fp-a",
    options: { preserveUpdatedAt: true },
    savedInviteRoomInput: (room) => ({ profileA: room.code, profileB: room.role }),
    savedInviteRoomMetadataFromLocalStores: async () => ({
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    }),
    savedInviteRoomMetadataWithSessionStatus: (metadata, roomInput, sessionStatus) => ({
      ...metadata,
      sessionAction: sessionStatus.action,
      sessionFor: roomInput.profileA,
    }),
    savedInviteRoomHasRetryableOutbound: (room) =>
      Number.parseInt(room?.retryableOutboundCount ?? 0, 10) > 0,
    latestTwoProfileSessionStatusForCurrentInput: () => null,
    invokeInviteRoomSessionStatus: async () => ({ action: "retry" }),
    rememberTwoProfileSessionStatus: (roomInput, status) => remembered.push({ roomInput, status }),
    forgetTwoProfileSessionStatusForInput: (roomInput) => forgotten.push(roomInput),
    rememberInviteRoom: (code, role, metadata, options) => remembered.push({ code, role, metadata, options }),
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, true);
  assert.equal(forgotten.length, 0);
  assert.equal(rendered, 1);
  assert.deepEqual(remembered[0], {
    roomInput: { profileA: "room-a", profileB: "inviter" },
    status: { action: "retry" },
  });
  assert.deepEqual(remembered[1], {
    code: "room-a",
    role: "inviter",
    metadata: {
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      sessionAction: "retry",
      sessionFor: "room-a",
      updatedAt: 17,
    },
    options: { render: false },
  });
});

test("refreshSavedInviteRoomMetadataForFingerprint skips refresh when the saved room fingerprint does not match", async () => {
  let rendered = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    },
    roomFingerprint: "fp-a",
    roomFingerprintForRoom: () => "fp-b",
    savedInviteRoomInput: () => ({ profileA: "room-a", profileB: "inviter" }),
    savedInviteRoomMetadataFromLocalStores: async () => {
      throw new Error("should not refresh a mismatched room");
    },
    savedInviteRoomMetadataWithSessionStatus: (metadata) => metadata,
    savedInviteRoomHasRetryableOutbound: () => false,
    latestTwoProfileSessionStatusForCurrentInput: () => null,
    invokeInviteRoomSessionStatus: async () => ({ action: "retry" }),
    rememberTwoProfileSessionStatus: () => {
      throw new Error("should not cache mismatched room status");
    },
    forgetTwoProfileSessionStatusForInput: () => {
      throw new Error("should not forget mismatched room status");
    },
    rememberInviteRoom: () => {
      throw new Error("should not persist mismatched room metadata");
    },
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, false);
  assert.equal(rendered, 1);
});

test("refreshSavedInviteRoomMetadataForFingerprint forgets stale session cache when session refresh fails", async () => {
  const forgotten = [];
  const remembered = [];
  let rendered = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    },
    roomFingerprint: "fp-a",
    options: { refreshSessionStatus: true },
    savedInviteRoomInput: (room) => ({ profileA: room.code, profileB: room.role }),
    savedInviteRoomMetadataFromLocalStores: async () => ({
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      messageCount: 2,
    }),
    savedInviteRoomMetadataWithSessionStatus: (metadata) => metadata,
    savedInviteRoomHasRetryableOutbound: () => false,
    latestTwoProfileSessionStatusForCurrentInput: () => ({ action: "cached" }),
    invokeInviteRoomSessionStatus: async () => {
      throw new Error("refresh failed");
    },
    rememberTwoProfileSessionStatus: () => {
      throw new Error("should not remember failed refresh");
    },
    forgetTwoProfileSessionStatusForInput: (roomInput) => forgotten.push(roomInput),
    rememberInviteRoom: (code, role, metadata, options) => remembered.push({ code, role, metadata, options }),
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, true);
  assert.deepEqual(forgotten, [{ profileA: "room-a", profileB: "inviter" }]);
  assert.deepEqual(remembered, [
    {
      code: "room-a",
      role: "inviter",
      metadata: {
        retryableOutboundCount: 0,
        retryableOutboundMessageNumber: 0,
        messageCount: 2,
      },
      options: { render: false },
    },
  ]);
  assert.equal(rendered, 1);
});

test("refreshSavedInviteRoomMetadataForFingerprint drops stale async results after the room fingerprint changes", async () => {
  const remembered = [];
  let rendered = 0;
  let fingerprintChecks = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    },
    roomFingerprint: "fp-a",
    roomFingerprintForRoom: () => {
      fingerprintChecks += 1;
      return fingerprintChecks === 1 ? "fp-a" : "fp-b";
    },
    options: { refreshSessionStatus: true },
    savedInviteRoomInput: () => ({ profileA: "room-a", profileB: "inviter" }),
    savedInviteRoomMetadataFromLocalStores: async () => ({
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      messageCount: 2,
    }),
    savedInviteRoomMetadataWithSessionStatus: (metadata, _roomInput, sessionStatus) => ({
      ...metadata,
      sessionAction: sessionStatus.action,
    }),
    savedInviteRoomHasRetryableOutbound: () => false,
    latestTwoProfileSessionStatusForCurrentInput: () => null,
    invokeInviteRoomSessionStatus: async () => ({ action: "retry" }),
    rememberTwoProfileSessionStatus: (roomInput, status) => remembered.push({ roomInput, status }),
    forgetTwoProfileSessionStatusForInput: () => {
      throw new Error("should not forget session status for a stale result");
    },
    rememberInviteRoom: () => {
      throw new Error("should not persist stale room metadata");
    },
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, false);
  assert.equal(rendered, 1);
  assert.deepEqual(remembered, [
    {
      roomInput: { profileA: "room-a", profileB: "inviter" },
      status: { action: "retry" },
    },
  ]);
});

test("syncSavedInviteRoomMetadataFromLocalStores records partial sync status when one room refresh fails", async () => {
  let inFlight = false;
  const statuses = [];
  const remembered = [];
  let rendered = 0;
  const ok = await syncSavedInviteRoomMetadataFromLocalStores({
    savedRoomMetadataSyncInFlight: () => inFlight,
    setSavedRoomMetadataSyncInFlight: (value) => {
      inFlight = value;
    },
    savedRoomMetadataSyncInFlightSet: (value) => {
      inFlight = value;
    },
    savedInviteRoomMetadataSyncCandidates: () => [
      { code: "room-a", role: "inviter", updatedAt: 1 },
      { code: "room-b", role: "joiner", updatedAt: 2 },
    ],
    savedInviteRoomMetadataFromLocalStores: async (room) => {
      if (room.code === "room-b") {
        throw new Error("broken transcript");
      }
      return { messageCount: 1 };
    },
    savedInviteRoomInput: (room) => ({ profileA: room.code, profileB: room.role }),
    invokeInviteRoomSessionStatus: async () => ({ state: "ready" }),
    rememberTwoProfileSessionStatus: () => {},
    forgetTwoProfileSessionStatusForInput: () => {},
    savedInviteRoomMetadataWithSessionStatus: (metadata) => ({ ...metadata, session: true }),
    rememberInviteRoom: (code, role, metadata, options) => remembered.push({ code, role, metadata, options }),
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
    setSavedRoomMetadataSyncStatus: (key, tone, values) => {
      statuses.push({ key, tone, values });
    },
  });

  assert.equal(ok, true);
  assert.equal(inFlight, false);
  assert.equal(rendered, 1);
  assert.deepEqual(remembered, [
    {
      code: "room-a",
      role: "inviter",
      metadata: { messageCount: 1, session: true, updatedAt: 1 },
      options: { render: false },
    },
  ]);
  assert.deepEqual(statuses, [
    { key: "roomListSyncRunning", tone: "progress", values: { count: 2 } },
    { key: "roomListSyncPartial", tone: "warning", values: { count: 1 } },
  ]);
});

test("syncSavedInviteRoomMetadataFromLocalStores clears status and exits when there is nothing to sync", async () => {
  const statuses = [];
  const ok = await syncSavedInviteRoomMetadataFromLocalStores({
    savedRoomMetadataSyncInFlight: () => false,
    savedInviteRoomMetadataSyncCandidates: () => [],
    setSavedRoomMetadataSyncStatus: (key, tone, values) => {
      statuses.push({ key, tone, values });
    },
  });

  assert.equal(ok, false);
  assert.deepEqual(statuses, [{ key: "", tone: undefined, values: undefined }]);
});

test("rememberCurrentInviteRoomMetadata consumes the retryable fallback flag once", () => {
  const fallbackValues = [];
  const remembered = [];
  rememberCurrentInviteRoomMetadata({
    currentInviteRoomCode: () => "room-a",
    connectionCodeRoleFor: () => "inviter",
    allowCurrentRoomRetryableMetadataFallbackOnce: true,
    allowCurrentRoomRetryableMetadataFallbackOnceSet: (value) => {
      fallbackValues.push(value);
    },
    rememberInviteRoom: (code, role, metadata) => remembered.push({ code, role, metadata }),
    currentRoomConversationMetadata: ({ allowRetryableFallback }) => ({
      allowRetryableFallback,
      messageCount: 3,
    }),
  });

  assert.deepEqual(fallbackValues, [false]);
  assert.deepEqual(remembered, [
    {
      code: "room-a",
      role: "inviter",
      metadata: { allowRetryableFallback: true, messageCount: 3 },
    },
  ]);
});

test("refreshCurrentRoomAfterReceiveImport updates memory only when an import completed", () => {
  const calls = [];
  refreshCurrentRoomAfterReceiveImport({
    refreshPlan: { messageImported: false },
    roomInput: { profileA: "alice", profileB: "bob" },
    twoProfileSessionsReadyForInput: () => true,
    rememberCurrentInviteRoomMetadata: () => calls.push("remember"),
    renderSavedInviteRooms: () => calls.push("render-list"),
    renderRoomStatusSummary: (roomInput, ready) => calls.push(["status", roomInput, ready]),
    renderRoomIdentityBar: (roomInput, ready) => calls.push(["identity", roomInput, ready]),
    renderProductionTwoProfileMemory: () => calls.push("memory"),
  });

  assert.deepEqual(calls, [
    "remember",
    "render-list",
    ["status", { profileA: "alice", profileB: "bob" }, true],
    ["identity", { profileA: "alice", profileB: "bob" }, true],
  ]);
});

test("refreshCurrentRoomAfterReceiveImport refreshes memory when an import completed", () => {
  const calls = [];
  refreshCurrentRoomAfterReceiveImport({
    refreshPlan: { messageImported: true },
    roomInput: { profileA: "alice", profileB: "bob" },
    twoProfileSessionsReadyForInput: () => false,
    rememberCurrentInviteRoomMetadata: () => calls.push("remember"),
    renderSavedInviteRooms: () => calls.push("render-list"),
    renderRoomStatusSummary: (roomInput, ready) => calls.push(["status", roomInput, ready]),
    renderRoomIdentityBar: (roomInput, ready) => calls.push(["identity", roomInput, ready]),
    renderProductionTwoProfileMemory: (roomInput) => calls.push(["memory", roomInput]),
  });

  assert.deepEqual(calls, [
    "remember",
    "render-list",
    ["status", { profileA: "alice", profileB: "bob" }, false],
    ["identity", { profileA: "alice", profileB: "bob" }, false],
    ["memory", { profileA: "alice", profileB: "bob" }],
  ]);
});

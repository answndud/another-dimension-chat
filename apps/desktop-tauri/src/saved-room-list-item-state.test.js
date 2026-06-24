import assert from "node:assert/strict";
import test from "node:test";

import {
  savedInviteRoomListItemContext,
  savedInviteRoomListItemDisplayState,
  savedInviteRoomListItemDerivedState,
  savedInviteRoomListItemViewRoom,
  savedInviteRoomRecoveryCandidates,
} from "./saved-room-list-item-state.js";

test("savedInviteRoomRecoveryCandidates suppresses real-onion recovery when retry or route blockers exist", () => {
  const recovery = { action: "real-onion-retry" };
  const route = { action: "refresh-endpoint" };

  assert.deepEqual(
    savedInviteRoomRecoveryCandidates({
      hasRetryableSend: true,
      receiveOwnershipBlocksRecovery: false,
      routeReadinessViewCandidate: route,
      realOnionRecoveryViewCandidate: recovery,
    }),
    {
      realOnionRecoveryView: null,
      routeReadinessBlocksRecovery: true,
      routeReadinessView: null,
    },
  );

  assert.deepEqual(
    savedInviteRoomRecoveryCandidates({
      hasRetryableSend: false,
      receiveOwnershipBlocksRecovery: false,
      routeReadinessViewCandidate: null,
      realOnionRecoveryViewCandidate: recovery,
    }),
    {
      realOnionRecoveryView: recovery,
      routeReadinessBlocksRecovery: false,
      routeReadinessView: null,
    },
  );

  assert.deepEqual(
    savedInviteRoomRecoveryCandidates({
      hasRetryableSend: false,
      receiveOwnershipBlocksRecovery: false,
      routeReadinessViewCandidate: route,
      realOnionRecoveryViewCandidate: null,
    }),
    {
      realOnionRecoveryView: null,
      routeReadinessBlocksRecovery: true,
      routeReadinessView: route,
    },
  );
});

test("savedInviteRoomListItemDerivedState prefers fingerprint and resume-room matches", () => {
  assert.deepEqual(
    savedInviteRoomListItemDerivedState({
      currentCode: "other",
      currentRole: "joiner",
      currentRoomFingerprint: "room-1",
      roomFingerprint: "room-1",
      resumeRoom: { code: "alpha", role: "inviter" },
      viewRoom: { code: "alpha", role: "inviter" },
    }),
    {
      current: true,
      resumeRecommended: true,
    },
  );

  assert.deepEqual(
    savedInviteRoomListItemDerivedState({
      currentCode: "alpha",
      currentRole: "inviter",
      currentRoomFingerprint: "",
      roomFingerprint: "room-2",
      resumeRoom: null,
      viewRoom: { code: "alpha", role: "joiner" },
    }),
    {
      current: false,
      resumeRecommended: false,
    },
  );
});

test("savedInviteRoomListItemContext trims code and fingerprint while constraining role", () => {
  assert.deepEqual(
    savedInviteRoomListItemContext({
      currentCode: " alpha ",
      currentRole: "observer",
      currentRoomFingerprint: " room-1 ",
      resumeRoom: { code: "beta", role: "joiner" },
    }),
    {
      currentCode: "alpha",
      currentRole: "",
      currentRoomFingerprint: "room-1",
      resumeRoom: { code: "beta", role: "joiner" },
    },
  );
});

test("savedInviteRoomListItemViewRoom applies stale-retry cleanup before manual rebuild cleanup", () => {
  const calls = [];
  const room = { code: "alpha" };

  const viewRoom = savedInviteRoomListItemViewRoom({
    persist: true,
    room,
    savedInviteRoomWithoutLoadedStaleRetryable(value, options) {
      calls.push(["stale", value, options]);
      return { ...value, staleCleared: options.persist };
    },
    savedInviteRoomWithoutResolvedManualRebuild(value, options) {
      calls.push(["manual", value, options]);
      return { ...value, manualCleared: options.persist };
    },
  });

  assert.deepEqual(calls, [
    ["stale", room, { persist: true }],
    ["manual", { code: "alpha", staleCleared: true }, { persist: true }],
  ]);
  assert.deepEqual(viewRoom, {
    code: "alpha",
    staleCleared: true,
    manualCleared: true,
  });
});

test("savedInviteRoomListItemDisplayState composes next action, state, and readiness review from shared inputs", () => {
  const calls = [];
  const viewRoom = { code: "alpha" };
  const nextAction = { action: "resume" };

  const displayState = savedInviteRoomListItemDisplayState({
    current: true,
    hasRetryableSend: false,
    realOnionRecoveryView: { action: "retry" },
    receiveState: "paused",
    resumeRecommended: true,
    routeReadinessView: { action: "start-receiving" },
    savedInviteRoomListAction(room, options) {
      calls.push(["action", room, options]);
      return nextAction;
    },
    savedInviteRoomReadinessReview(view) {
      calls.push(["review", view]);
      return { blockerKey: "none", nextAction: view.nextAction.action };
    },
    savedInviteRoomState(room, options) {
      calls.push(["state", room, options]);
      return `state:${options.receiveState}:${options.resumeRecommended}`;
    },
    viewRoom,
    waitingPeerCode: false,
  });

  assert.deepEqual(displayState, {
    nextAction,
    readinessReview: { blockerKey: "none", nextAction: "resume" },
    state: "state:paused:true",
  });
  assert.deepEqual(calls, [
    [
      "action",
      viewRoom,
      {
        realOnionRecoveryView: { action: "retry" },
        receiveState: "paused",
        routeReadinessView: { action: "start-receiving" },
        waitingPeerCode: false,
      },
    ],
    [
      "state",
      viewRoom,
      {
        realOnionRecoveryView: { action: "retry" },
        receiveState: "paused",
        resumeRecommended: true,
        routeReadinessView: { action: "start-receiving" },
        waitingPeerCode: false,
      },
    ],
    [
      "review",
      {
        current: true,
        hasRetryableSend: false,
        nextAction,
        receiveState: "paused",
        resumeRecommended: true,
        state: "state:paused:true",
        waitingPeerCode: false,
      },
    ],
  ]);
});

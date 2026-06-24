import assert from "node:assert/strict";
import test from "node:test";

import {
  savedInviteRoomBaseStateView,
  savedInviteRoomNormalizedRecoveryView,
  savedInviteRoomResumeStateView,
} from "./saved-room-state-view.js";

test("savedInviteRoomNormalizedRecoveryView clears blocked real onion recovery", () => {
  const recovery = { state: { key: "recovery", label: "Recovery" } };
  assert.equal(
    savedInviteRoomNormalizedRecoveryView({
      receiveState: "paused",
      routeReadinessView: { action: "refresh-endpoint" },
      realOnionRecoveryView: recovery,
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => true,
    }),
    null,
  );
  assert.equal(
    savedInviteRoomNormalizedRecoveryView({
      receiveState: "idle",
      routeReadinessView: { action: "refresh-endpoint" },
      realOnionRecoveryView: recovery,
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => false,
    }),
    recovery,
  );
});

test("savedInviteRoomResumeStateView only formats labels when resume is recommended", () => {
  const view = { key: "ready", label: "Ready" };
  assert.equal(savedInviteRoomResumeStateView(view, { resumeRecommended: false }), view);
  assert.deepEqual(
    savedInviteRoomResumeStateView(view, {
      resumeRecommended: true,
      formatTemplate: (_key, value) => `Resume ${value.state}`,
    }),
    { key: "ready", label: "Resume Ready" },
  );
});

test("savedInviteRoomBaseStateView prioritizes receive, retry, recovery, and ready states", () => {
  assert.deepEqual(
    savedInviteRoomBaseStateView({
      receiveState: "paused",
      t: (key) => key,
    }),
    { key: "receive-paused", label: "roomStateReceivePaused" },
  );

  assert.deepEqual(
    savedInviteRoomBaseStateView({
      hasRetryableOutbound: true,
      retryableState: { key: "retry", label: "Retry" },
      t: (key) => key,
    }),
    { key: "retry", label: "Retry" },
  );

  assert.deepEqual(
    savedInviteRoomBaseStateView({
      currentCode: "alpha",
      room: { code: "alpha", messageCount: 0 },
      roomDetailOpen: true,
      t: (key) => key,
    }),
    { key: "active", label: "roomStateActive" },
  );

  assert.deepEqual(
    savedInviteRoomBaseStateView({
      room: { code: "beta", messageCount: 2 },
      t: (key) => key,
    }),
    { key: "ready", label: "roomStateReady" },
  );
});

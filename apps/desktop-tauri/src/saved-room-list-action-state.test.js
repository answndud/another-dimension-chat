import assert from "node:assert/strict";
import test from "node:test";

import {
  savedInviteRoomImmediateListAction,
  savedInviteRoomRecoveryListAction,
  savedInviteRoomRetryableListAction,
} from "./saved-room-list-action-state.js";

test("savedInviteRoomRetryableListAction keeps retryable labels and fallback retry action", () => {
  const savedRoomActionLabelKey = (value) => `label:${value}`;
  assert.deepEqual(
    savedInviteRoomRetryableListAction("enable-private-delivery", { savedRoomActionLabelKey }),
    {
      action: "enable-private-delivery",
      labelKey: "label:enable-private-delivery",
      origin: "retryable-outbound",
    },
  );
  assert.deepEqual(
    savedInviteRoomRetryableListAction("start-receiving", { savedRoomActionLabelKey }),
    {
      action: "start-receiving",
      labelKey: "savedRoomActionStartReceivingForRetry",
      origin: "retryable-outbound",
    },
  );
  assert.deepEqual(
    savedInviteRoomRetryableListAction("verify-safety", { savedRoomActionLabelKey }),
    {
      action: "verify-safety",
      labelKey: "label:verify-safety",
      origin: "retryable-outbound",
    },
  );
  assert.deepEqual(
    savedInviteRoomRetryableListAction("unexpected", { savedRoomActionLabelKey }),
    {
      action: "retry",
      labelKey: "label:retry",
      origin: "retryable-outbound",
    },
  );
});

test("savedInviteRoomRecoveryListAction clears blocked real-onion recovery and falls back to route readiness", () => {
  const savedRoomActionLabelKey = (value, fallback) => fallback ?? `label:${value}`;
  assert.deepEqual(
    savedInviteRoomRecoveryListAction({
      receiveState: "paused",
      routeReadinessView: { action: "refresh-endpoint", labelKey: "refreshEndpoint" },
      realOnionRecovery: { action: "real-onion-retry", labelKey: "savedRoomActionRetryDelivery" },
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => true,
      savedRoomActionLabelKey,
    }),
    {
      action: "refresh-endpoint",
      labelKey: "refreshEndpoint",
      origin: "route-readiness",
    },
  );
  assert.deepEqual(
    savedInviteRoomRecoveryListAction({
      receiveState: "idle",
      routeReadinessView: { action: "refresh-endpoint", labelKey: "refreshEndpoint" },
      realOnionRecovery: { action: "real-onion-retry", labelKey: "savedRoomActionRetryDelivery" },
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => false,
      savedRoomActionLabelKey,
    }),
    {
      action: "real-onion-retry",
      labelKey: "savedRoomActionRetryDelivery",
      origin: "real-onion-recovery",
    },
  );
  assert.equal(
    savedInviteRoomRecoveryListAction({
      receiveState: "idle",
      routeReadinessView: null,
      realOnionRecovery: null,
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => false,
      savedRoomActionLabelKey,
    }),
    null,
  );
});

test("savedInviteRoomImmediateListAction prioritizes receive wait peer code and route readiness actions", () => {
  const savedRoomActionLabelKey = (value, fallback) => fallback ?? `label:${value}`;
  assert.deepEqual(
    savedInviteRoomImmediateListAction({
      receiveState: "stopping",
      waitingPeerCode: true,
      routeReadinessView: { action: "start-receiving", labelKey: "savedRoomActionStartReceiving" },
      savedRoomActionLabelKey,
    }),
    {
      action: "wait-receive-stop",
      labelKey: "label:wait-receive-stop",
      origin: "receive-state",
    },
  );
  assert.deepEqual(
    savedInviteRoomImmediateListAction({
      receiveState: "idle",
      waitingPeerCode: true,
      routeReadinessView: null,
      savedRoomActionLabelKey,
    }),
    {
      action: "paste-peer-code",
      labelKey: "label:paste-peer-code",
      origin: "peer-code",
    },
  );
  assert.deepEqual(
    savedInviteRoomImmediateListAction({
      receiveState: "idle",
      waitingPeerCode: false,
      routeReadinessView: { action: "start-receiving", labelKey: "savedRoomActionStartReceiving" },
      savedRoomActionLabelKey,
    }),
    {
      action: "start-receiving",
      labelKey: "savedRoomActionStartReceiving",
      origin: "route-readiness",
    },
  );
});

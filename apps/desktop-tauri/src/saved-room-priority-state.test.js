import test from "node:test";
import assert from "node:assert/strict";

import {
  savedInviteRoomResumePriorityValue,
  savedRoomActionLabelKeyValue,
} from "./saved-room-priority-state.js";

test("savedInviteRoomResumePriorityValue keeps retryable and recovery priorities ahead of passive states", () => {
  assert.equal(savedInviteRoomResumePriorityValue({ hasRetryableOutbound: true }), 30);
  assert.equal(savedInviteRoomResumePriorityValue({ hasRealOnionRecovery: true }), 25);
  assert.equal(savedInviteRoomResumePriorityValue({ routeReadinessAction: "prepare-private-route" }), 24);
  assert.equal(savedInviteRoomResumePriorityValue({ receiveState: "stopping" }), 22);
  assert.equal(savedInviteRoomResumePriorityValue({ receiveState: "paused" }), 20);
  assert.equal(savedInviteRoomResumePriorityValue({ routeReadinessAction: "wait-receive-stop" }), 19);
  assert.equal(savedInviteRoomResumePriorityValue({ waitingPeerCode: true }), 18);
  assert.equal(savedInviteRoomResumePriorityValue({}), 0);
});

test("savedRoomActionLabelKeyValue maps saved room actions to user-facing labels", () => {
  assert.equal(savedRoomActionLabelKeyValue("enable-private-delivery"), "savedRoomActionEnableDelivery");
  assert.equal(savedRoomActionLabelKeyValue("refresh-endpoint"), "savedRoomActionUpdateDeliveryCode");
  assert.equal(savedRoomActionLabelKeyValue("retry"), "savedRoomActionRetrySavedMessage");
  assert.equal(savedRoomActionLabelKeyValue("real-onion-retry"), "savedRoomActionRetryDelivery");
  assert.equal(savedRoomActionLabelKeyValue("unknown-action", "fallback"), "fallback");
});

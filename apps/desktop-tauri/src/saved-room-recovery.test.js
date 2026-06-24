import test from "node:test";
import assert from "node:assert/strict";

import {
  savedInviteRoomActionRechecksAfterOpen,
  savedInviteRoomManualRebuildRecoveryCandidate,
  savedInviteRoomRecheckedRouteReadinessAction,
} from "./saved-room-recovery.js";

test("saved invite room actions recheck only known recovery paths", () => {
  assert.equal(savedInviteRoomActionRechecksAfterOpen("verify-safety"), true);
  assert.equal(savedInviteRoomActionRechecksAfterOpen("real-onion-retry"), true);
  assert.equal(savedInviteRoomActionRechecksAfterOpen("open-room"), false);
});

test("saved invite room route readiness recheck preserves ready state", () => {
  assert.deepEqual(savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "route-readiness", {}, null), {
    ready: true,
  });
  assert.deepEqual(savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "route-readiness", {}, { action: "refresh-endpoint" }), {
    ready: false,
    action: "refresh-endpoint",
  });
});

test("saved invite room manual rebuild recovery candidate prioritizes waiting peer code and paused receive state", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 4,
    },
    view: {
      waitingPeerCode: true,
      receiveState: "paused",
      routeReadinessView: { action: "refresh-endpoint" },
    },
  });
  assert.deepEqual(candidate, {
    action: "paste-peer-code",
    actionOrigin: "route-readiness",
    messageNumber: 4,
  });
});

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
  assert.equal(
    savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "retryable-outbound", {}, { action: "retry" }),
    null,
  );
  assert.deepEqual(savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "route-readiness", {}, { action: "refresh-endpoint" }), {
    ready: false,
    action: "refresh-endpoint",
  });
  assert.deepEqual(savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "route-readiness", {}, { action: "paste-peer-code" }), {
    ready: false,
    action: "paste-peer-code",
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

test("saved invite room manual rebuild recovery candidate prefers retryable outbound before route or receive recovery", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      retryableOutboundCount: 1,
      retryableOutboundMessageNumber: 9,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 4,
    },
    action: "retry",
    actionOrigin: "retryable-outbound",
    view: {
      waitingPeerCode: true,
      receiveState: "paused",
      routeReadinessView: { action: "paste-peer-code" },
    },
  });
  assert.deepEqual(candidate, {
    action: "retry",
    actionOrigin: "retryable-outbound",
    messageNumber: 9,
  });
});

test("saved invite room manual rebuild recovery candidate falls back to current non-real-onion action before metadata action", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 6,
    },
    action: "verify-safety",
    actionOrigin: "saved-room",
    view: {
      waitingPeerCode: false,
      receiveState: "idle",
      routeReadinessView: null,
    },
  });
  assert.deepEqual(candidate, {
    action: "verify-safety",
    actionOrigin: "saved-room",
    messageNumber: 6,
  });
});

test("saved invite room manual rebuild recovery candidate ignores current real-onion action and uses stored metadata action", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 11,
    },
    action: "real-onion-retry",
    actionOrigin: "saved-room",
    view: {
      waitingPeerCode: false,
      receiveState: "idle",
      routeReadinessView: null,
    },
  });
  assert.deepEqual(candidate, {
    action: "refresh-endpoint",
    actionOrigin: "manual-rebuild-metadata",
    messageNumber: 11,
  });
});

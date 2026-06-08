import assert from "node:assert/strict";
import test from "node:test";
import {
  fieldTestReportNextActionValue,
  fieldTestReportRoomListAction,
  fieldTestReportSummary,
  parseFieldTestReport,
  savedInviteRoomActionCanUseRetryableOutbound,
  savedInviteRoomReceiveOwnershipBlocksRecovery,
  savedInviteRoomRetryOnlyWithoutRetryableOrigin,
} from "./private-delivery-state.js";

test("saved room retryable actions require retryable outbound origin", () => {
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("retry", "retryable-outbound"), true);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("start-receiving", "retryable-outbound"), true);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("retry", "route-readiness"), false);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("start-receiving", "receive-state"), false);
  assert.equal(savedInviteRoomRetryOnlyWithoutRetryableOrigin("retry-network", "route-readiness"), true);
});

test("receive ownership blocks stale real onion recovery actions", () => {
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ receiveState: "stopping" }), true);
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ receiveState: "paused" }), true);
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ routeReadinessAction: "wait-receive-stop" }), true);
  assert.equal(
    savedInviteRoomReceiveOwnershipBlocksRecovery({
      routeReadinessAction: "start-receiving",
      routeReadinessFailureKind: "LocalOnionEndpointNotReady",
    }),
    true,
  );
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ routeReadinessAction: "refresh-endpoint" }), false);
});

test("field test summary reports receive recovery before stale real onion room action", () => {
  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "room_list_next_action=real-onion-retry",
    "room_list_next_origin=real-onion-recovery",
    "route_readiness_ready=false",
    "route_readiness_next_action=start-receiving",
    "route_readiness_failure_kind=LocalOnionEndpointNotReady",
    "receive_enabled=false",
    "receive_stop_requested=false",
    "real_onion_recovery_action=retry-bootstrap",
  ].join("\n");
  const parsed = parseFieldTestReport(report);

  assert.equal(fieldTestReportRoomListAction(parsed), "real-onion-retry");
  assert.equal(fieldTestReportNextActionValue(parsed), "start-receiving");
  assert.match(fieldTestReportSummary(report), /next=start-receiving/);
});


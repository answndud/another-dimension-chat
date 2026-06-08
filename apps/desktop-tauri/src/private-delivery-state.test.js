import assert from "node:assert/strict";
import test from "node:test";
import {
  fieldTestReportComposerAction,
  fieldTestReportNextActionValue,
  fieldTestReportRoomListAction,
  fieldTestReportSummary,
  fieldTestReportTriageState,
  parseFieldTestReport,
  realOnionResultConfirmsExternalPeerDelivery,
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

test("local dev roundtrip never counts as external onion delivery", () => {
  assert.equal(
    realOnionResultConfirmsExternalPeerDelivery({
      external_peer_delivery_confirmed: true,
      local_dev_roundtrip_result: true,
    }),
    false,
  );
  assert.equal(
    realOnionResultConfirmsExternalPeerDelivery({
      external_peer_delivery_confirmed: true,
      local_dev_roundtrip_result: false,
    }),
    true,
  );

  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "real_onion_external_peer_delivery_confirmed=true",
    "real_onion_local_dev_roundtrip_result=true",
  ].join("\n");

  assert.match(fieldTestReportSummary(report), /local-dev-roundtrip/);
  assert.equal(fieldTestReportTriageState(report).delivery, "local-dev-roundtrip");
});

test("route-ready compose state stays separate from recovery next action", () => {
  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "room_list_next_action=none",
    "outbound_recovery_action=none",
    "real_onion_recovery_action=none",
    "composer_next_action=send-message",
  ].join("\n");

  assert.equal(fieldTestReportNextActionValue(parseFieldTestReport(report)), "none");
  assert.equal(fieldTestReportComposerAction(report), "send-message");
  assert.match(fieldTestReportSummary(report), /next=none/);
});

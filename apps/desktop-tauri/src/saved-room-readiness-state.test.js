import assert from "node:assert/strict";
import test from "node:test";

import {
  savedInviteRoomReadinessBlockerKeyValue,
  savedInviteRoomReadinessSummaryKeyValue,
  savedInviteRoomReadinessNextDetailKeyValue,
  savedInviteRoomReadinessReviewValue,
} from "./saved-room-readiness-state.js";

test("savedInviteRoomReadinessBlockerKeyValue prioritizes retry receive and route blockers", () => {
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ receiveState: "stopping" }), "receive-stopping");
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ hasRetryableSend: true }), "retryable-outbound");
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ waitingPeerCode: true }), "peer-delivery-code");
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ receiveState: "paused" }), "receive-paused");
  assert.equal(
    savedInviteRoomReadinessBlockerKeyValue({ nextAction: { action: "verify-safety" } }),
    "safety-unverified",
  );
  assert.equal(
    savedInviteRoomReadinessBlockerKeyValue({ nextAction: { action: "refresh-endpoint" } }),
    "delivery-code-needed",
  );
  assert.equal(
    savedInviteRoomReadinessBlockerKeyValue({ nextAction: { action: "real-onion-retry" } }),
    "delivery-retry-needed",
  );
});

test("savedInviteRoomReadinessSummaryKeyValue keeps listening action and resume summaries distinct", () => {
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ receiveState: "listening" }), "roomReadinessListening");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ nextAction: { action: "retry" } }), "roomReadinessNeedsAction");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ current: true }), "roomReadinessCurrent");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ resumeRecommended: true }), "roomReadinessResume");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({}), "roomReadinessOpen");
});

test("savedInviteRoomReadinessNextDetailKeyValue maps retryable and passive branches", () => {
  const retryableAction = (value) => value;
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { hasRetryableSend: true, nextAction: { action: "retry-network" } },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextRetryNetwork",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { waitingPeerCode: true },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextPastePeerCode",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { receiveState: "paused" },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextStartReceive",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { nextAction: { action: "real-onion-inspect-diagnostics" } },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextInspectDiagnostics",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { resumeRecommended: true },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextResumeRoom",
  );
});

test("savedInviteRoomReadinessReviewValue combines delegated readiness fields", () => {
  const view = {
    nextAction: { action: "retry", labelKey: "savedRoomActionRetrySavedMessage" },
  };
  assert.deepEqual(
    savedInviteRoomReadinessReviewValue(view, {
      savedInviteRoomReadinessBlockerKey: () => "retryable-outbound",
      savedInviteRoomReadinessSummaryKey: () => "roomReadinessNeedsAction",
      savedInviteRoomReadinessNextDetailKey: () => "roomReadinessNextRetrySavedMessage",
    }),
    {
      boundaryKey: "roomReadinessBoundary",
      blockerKey: "retryable-outbound",
      nextDetailKey: "roomReadinessNextRetrySavedMessage",
      nextLabelKey: "savedRoomActionRetrySavedMessage",
      statusKey: "roomReadinessNeedsAction",
      titleKey: "roomReadinessReview",
    },
  );
});

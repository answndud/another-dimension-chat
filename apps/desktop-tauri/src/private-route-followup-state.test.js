import test from "node:test";
import assert from "node:assert/strict";

import {
  privateRouteFollowupContinuationPlan,
  privateRouteFollowupCanResumeDraftSend,
  privateRouteFollowupMatchesRetryableEntry,
} from "./private-route-followup-state.js";

test("privateRouteFollowupMatchesRetryableEntry requires exact room direction and retryable state", () => {
  const followup = {
    retrySender: "Alice",
    retryReceiver: "Bob",
    retryMessageNumber: 3,
    retryMessage: "hello",
  };
  const entry = {
    roomFingerprint: "room-1",
    sender: "alice",
    receiver: "bob",
    messageNumber: 3,
    message: "hello",
  };
  assert.equal(
    privateRouteFollowupMatchesRetryableEntry(followup, entry, {
      roomFingerprint: "room-1",
      isRetryable: () => true,
    }),
    true,
  );
  assert.equal(
    privateRouteFollowupMatchesRetryableEntry(followup, { ...entry, message: "changed" }, {
      roomFingerprint: "room-1",
      isRetryable: () => true,
    }),
    false,
  );
  assert.equal(
    privateRouteFollowupMatchesRetryableEntry(followup, entry, {
      roomFingerprint: "room-1",
      isRetryable: () => false,
    }),
    false,
  );
});

test("privateRouteFollowupCanResumeDraftSend only resumes exact current draft", () => {
  const followup = { messageFingerprint: "draft-1" };
  assert.equal(
    privateRouteFollowupCanResumeDraftSend(followup, { message: "hi" }, {
      inputFingerprint: () => "draft-1",
    }),
    true,
  );
  assert.equal(
    privateRouteFollowupCanResumeDraftSend(followup, { message: "" }, {
      inputFingerprint: () => "draft-1",
    }),
    false,
  );
  assert.equal(
    privateRouteFollowupCanResumeDraftSend(followup, { message: "hi" }, {
      inputFingerprint: () => "draft-2",
    }),
    false,
  );
});

test("privateRouteFollowupContinuationPlan resolves manual rebuild followups before normal runtime actions", () => {
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "retry-outbound", manualRebuild: true, hasPendingRetry: true }),
    { kind: "manual-retry-outbound", handled: true },
  );
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "receive", manualRebuild: true }),
    { kind: "manual-receive", handled: true },
  );
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "send-draft", manualRebuild: true, canResumeDraftSend: true }),
    { kind: "manual-send-draft", handled: true },
  );
});

test("privateRouteFollowupContinuationPlan distinguishes retry, receive, and draft review outcomes", () => {
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "retry-outbound", hasPendingRetry: true }),
    { kind: "retry-outbound-run", handled: true },
  );
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "retry-outbound", hasPendingRetry: false }),
    { kind: "retry-outbound-missing", handled: true },
  );
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "receive" }),
    { kind: "receive-run", handled: true },
  );
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "send-draft", canResumeDraftSend: true }),
    { kind: "send-draft-run", handled: true },
  );
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "send-draft", canResumeDraftSend: false }),
    { kind: "send-draft-review", handled: true },
  );
  assert.deepEqual(
    privateRouteFollowupContinuationPlan({ action: "unknown" }),
    { kind: "none", handled: false },
  );
});

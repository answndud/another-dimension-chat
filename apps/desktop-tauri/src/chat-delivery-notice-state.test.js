import assert from "node:assert/strict";
import test from "node:test";
import {
  localizedSendAttemptMessage,
  localizedSendFailureMessage,
  sendAttemptFailureText,
  sendFailureNeedsEndpointRefresh,
  sendFailureNeedsNetworkRetry,
  sendFailureNeedsRouteSetup,
  sendFailureNeedsStartReceiving,
  sendRuntimeOwnerMismatch,
} from "./chat-delivery-notice-state.js";

const t = (key) => key;

test("send failure helpers classify route, receive, endpoint, and network retries", () => {
  assert.equal(sendRuntimeOwnerMismatch({ owner_profile_bound: true, owner_matches_send_profile: false }), true);
  assert.equal(sendAttemptFailureText({ next_blocker: "a", warning: "b", blockers: ["c"] }), "a b c");
  assert.equal(sendFailureNeedsRouteSetup("peer-endpoint-missing"), true);
  assert.equal(sendFailureNeedsStartReceiving("message listening stopped"), true);
  assert.equal(sendFailureNeedsEndpointRefresh("stale endpoint"), true);
  assert.equal(sendFailureNeedsNetworkRetry("persistentclientnotready"), true);
});

test("localized send messages prefer the most specific failure", () => {
  assert.equal(
    localizedSendFailureMessage({
      error: "message listening stopped",
      t,
      sendFailureNeedsStartReceiving,
      sendFailureNeedsRouteSetup,
      sendFailureNeedsEndpointRefresh,
      sendFailureNeedsNetworkRetry,
    }),
    "externalSendNeedsReceive",
  );
  assert.equal(
    localizedSendAttemptMessage({
      result: { send_attempt_succeeded: true },
      t,
      sendAttemptFailureText,
      sendRuntimeOwnerMismatch,
      sendFailureNeedsStartReceiving,
      sendFailureNeedsRouteSetup,
      sendFailureNeedsNetworkRetry,
      localizedSendFailureMessage,
      sendFailureNeedsEndpointRefresh,
    }),
    "chatNoticeExternalSendWritten",
  );
});

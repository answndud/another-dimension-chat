import assert from "node:assert/strict";
import test from "node:test";
import {
  productionInviteCodeProfiles,
  productionOnionReceiveRuntimeView,
  productionTwoProfileCurrentAction,
  productionTwoProfileLatestRetryableOutbound,
  productionTwoProfileOutboundActionState,
  productionTwoProfileOutboundPrimaryAction,
  productionTwoProfileResumeTarget,
  productionTwoProfileShouldShowOutboundRecovery,
} from "./action-state.js";

test("invite code creates opposite local and peer roles", () => {
  assert.deepEqual(productionInviteCodeProfiles("ABCD-2345", "inviter"), {
    connectionCode: "ABCD-2345",
    role: "inviter",
    slug: "abcd-2345-1ufszcs",
    localProfile: "inviter-abcd-2345-1ufszcs",
    peerProfile: "joiner-abcd-2345-1ufszcs",
  });
  assert.deepEqual(productionInviteCodeProfiles("ABCD-2345", "joiner"), {
    connectionCode: "ABCD-2345",
    role: "joiner",
    slug: "abcd-2345-1ufszcs",
    localProfile: "joiner-abcd-2345-1ufszcs",
    peerProfile: "inviter-abcd-2345-1ufszcs",
  });
});

test("chat action moves from setup to compose to stored send", () => {
  const input = {
    profileA: "alice",
    profileB: "bob",
    passphrase: "connection-code",
    messageTtlSeconds: 86400,
    message: "",
  };

  assert.equal(
    productionTwoProfileCurrentAction({
      input,
      hasMessageRetentionPolicy: true,
      sessionsReady: false,
      hasKnownSessionStatus: true,
    }),
    "full-setup",
  );
  assert.equal(
    productionTwoProfileCurrentAction({
      input,
      hasMessageRetentionPolicy: true,
      sessionsReady: true,
    }),
    "compose",
  );
  assert.equal(
    productionTwoProfileCurrentAction({
      input: { ...input, message: "hello" },
      hasMessageRetentionPolicy: true,
      sessionsReady: true,
    }),
    "stored-message",
  );
});

test("resume target prioritizes retryable sends before normal replies", () => {
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: true,
      hasRetryableOutbound: true,
      hasPendingConversation: true,
      hasDeliveredConversation: true,
    }),
    "retry-send",
  );
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: true,
      hasPendingConversation: true,
      hasDeliveredConversation: true,
    }),
    "pending-review",
  );
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: true,
      hasDeliveredConversation: true,
    }),
    "reply-latest",
  );
});

test("failed outbound messages stay retryable or cancelable from the active device", () => {
  const entry = {
    sender: "alice",
    receiver: "bob",
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "ManualNetworkPermissionMissing",
    outboundRetryable: true,
  };

  assert.deepEqual(productionTwoProfileOutboundActionState(entry, { profileA: "alice", profileB: "bob" }), {
    showActions: true,
    sameDirection: true,
    canApplyDirection: true,
    canRunNow: true,
    disabledReason: "",
  });
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(entry), {
    action: "enable-private-delivery",
    labelKey: "enablePrivateDelivery",
    noticeKey: "messageSavedPrivateDeliveryOff",
    recoveryKey: "sendRecoveryPermissionOff",
  });
});

test("latest retryable outbound only selects active-device failed sends", () => {
  const input = { profileA: "alice", profileB: "bob" };
  const entries = [
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 1,
      createdAtMs: 100,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
    {
      sender: "bob",
      receiver: "alice",
      messageNumber: 2,
      createdAtMs: 400,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 3,
      createdAtMs: 300,
      statuses: new Set(["sent", "received"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 4,
      createdAtMs: 500,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "canceled",
      outboundRetryable: false,
    },
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 5,
      createdAtMs: 250,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
  ];

  assert.equal(productionTwoProfileLatestRetryableOutbound(entries, input)?.messageNumber, 5);
});

test("send recovery notice waits until the room is ready", () => {
  assert.equal(
    productionTwoProfileShouldShowOutboundRecovery({
      sessionsReady: false,
      hasRetryableOutbound: true,
    }),
    false,
  );
  assert.equal(
    productionTwoProfileShouldShowOutboundRecovery({
      sessionsReady: true,
      hasRetryableOutbound: true,
    }),
    true,
  );
});

test("receive runtime exposes stopped, waiting, connected, and imported states", () => {
  assert.equal(productionOnionReceiveRuntimeView({ enabled: false }).state, "stopped");
  assert.equal(productionOnionReceiveRuntimeView({ enabled: true, inFlight: true }).state, "receiving");
  assert.equal(
    productionOnionReceiveRuntimeView({ enabled: true }, { stream_request_accepted: true }).state,
    "peer-connected",
  );
  assert.equal(
    productionOnionReceiveRuntimeView({ enabled: true }, { receive_attempt_succeeded: true }).state,
    "message-imported",
  );
});

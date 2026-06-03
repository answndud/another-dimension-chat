import assert from "node:assert/strict";
import test from "node:test";
import {
  productionInviteCodeProfiles,
  productionInviteRoomConversationMetadata,
  productionOnionReceiveLoopRefreshPlan,
  productionOnionReceiveRuntimeView,
  productionTwoProfileCurrentAction,
  productionTwoProfileLatestRetryableOutbound,
  productionTwoProfileOutboundActionState,
  productionTwoProfileOutboundNeedsEndpointRefresh,
  productionTwoProfileOutboundPrimaryAction,
  productionTwoProfileOutboundStatusLabel,
  productionTwoProfileRealOnionRecoveryPlan,
  productionTwoProfileRealOnionUserView,
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

test("outbound failure classes keep missing route separate from stale endpoint", () => {
  const missingRoute = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "peer-endpoint-missing",
    outboundRetryable: true,
  };
  const staleEndpoint = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "stored remote endpoint refresh required",
    outboundRetryable: true,
  };
  const timeout = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "receive-timeout",
    outboundRetryable: true,
  };

  assert.equal(productionTwoProfileOutboundStatusLabel(missingRoute), "route missing");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(missingRoute), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(missingRoute), {
    action: "prepare-private-route",
    labelKey: "preparePrivateRoute",
    noticeKey: "privateDeliveryRouteNeeded",
    recoveryKey: "sendRecoveryRouteMissing",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(staleEndpoint), "stale endpoint");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(staleEndpoint), true);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(staleEndpoint), {
    action: "refresh-and-retry",
    labelKey: "refreshAndRetry",
    noticeKey: "chatNoticeRefreshAddress",
    recoveryKey: "sendRecoveryStaleEndpoint",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(timeout), "send timeout");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(timeout), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(timeout), {
    action: "retry",
    labelKey: "retrySend",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryTimeout",
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

test("real onion bootstrap timeout remains retryable and cancellable", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "retry-bootstrap",
    retryable: true,
    waitCancellable: true,
    reason: "network-bootstrap",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery waiting for network",
    profiles: "Room is saved.",
    session: "Delivery network did not finish starting.",
    message: "Wait a moment, then retry private delivery or turn it off.",
    boundary: "No message was sent and the wait can be cancelled.",
  });
});

test("receive loop refresh plan reloads transcript for new imports and endpoint updates", () => {
  const mode = {
    lastProcessedImportSequence: 2,
    lastProcessedMessageImportCount: 1,
    lastProcessedEndpointUpdateCount: 0,
  };

  assert.deepEqual(
    productionOnionReceiveLoopRefreshPlan(mode, {
      import_sequence: 2,
      message_import_count: 1,
      endpoint_update_count: 0,
    }),
    {
      transcriptChanged: false,
      messageImported: false,
      endpointUpdated: false,
      newImportCount: 0,
      newMessageImportCount: 0,
      newEndpointUpdateCount: 0,
      importSequence: 2,
      messageImportCount: 1,
      endpointUpdateCount: 0,
    },
  );

  assert.deepEqual(
    productionOnionReceiveLoopRefreshPlan(mode, {
      import_sequence: 4,
      message_import_count: 2,
      endpoint_update_count: 1,
    }),
    {
      transcriptChanged: true,
      messageImported: true,
      endpointUpdated: true,
      newImportCount: 2,
      newMessageImportCount: 1,
      newEndpointUpdateCount: 1,
      importSequence: 4,
      messageImportCount: 2,
      endpointUpdateCount: 1,
    },
  );
});

test("room list metadata follows latest imported conversation entry", () => {
  const entries = [
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 1,
      message: "older outbound",
      createdAtMs: 100,
    },
    {
      sender: "bob",
      receiver: "alice",
      messageNumber: 2,
      message: "latest   receive\nimport",
      createdAtMs: 300,
    },
  ];

  assert.deepEqual(productionInviteRoomConversationMetadata(entries), {
    lastMessagePreview: "latest receive import",
    lastMessageAt: 300,
    messageCount: 2,
  });
  assert.equal(entries[0].messageNumber, 1);
});

test("room list metadata truncates long previews without losing message count", () => {
  const longMessage = "a".repeat(80);

  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 1,
        message: longMessage,
        createdAtMs: 200,
      },
    ]),
    {
      lastMessagePreview: `${"a".repeat(72)}...`,
      lastMessageAt: 200,
      messageCount: 1,
    },
  );
});

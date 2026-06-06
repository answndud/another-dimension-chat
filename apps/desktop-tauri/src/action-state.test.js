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
    canCancelNow: true,
    disabledReason: "",
    cancelDisabledReason: "",
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
  const bootstrap = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "PersistentClientNotReady",
    outboundRetryable: true,
  };
  const missingMessage = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "StoredOutboundEnvelopeRequired",
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

  const runtimeMismatch = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "RuntimeOwnerProfileMismatch",
    outboundRetryable: true,
  };
  assert.equal(productionTwoProfileOutboundStatusLabel(runtimeMismatch), "route missing");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(runtimeMismatch), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(runtimeMismatch), {
    action: "prepare-private-route",
    labelKey: "preparePrivateRoute",
    noticeKey: "privateDeliveryRouteNeeded",
    recoveryKey: "sendRecoveryRuntimeMismatch",
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

  assert.equal(productionTwoProfileOutboundStatusLabel(bootstrap), "Tor bootstrap");
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(bootstrap), {
    action: "start-receiving",
    labelKey: "retryNetwork",
    noticeKey: "chatNoticeReceiveStopped",
    recoveryKey: "sendRecoveryTorBootstrap",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(missingMessage), "message missing");
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(missingMessage), {
    action: "retry",
    labelKey: "retrySend",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryGeneric",
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

test("real onion exhausted bootstrap with bridge-capable build but no config points to bridge config", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 3,
    profile_b_bootstrap_attempts: 0,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: false,
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-config",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery needs network change",
    profiles: "Room is saved.",
    session: "Delivery network did not finish starting.",
    message: "Change network or add private bridge config, then retry private delivery.",
    boundary: "No message was sent and no bridge config was used.",
  });
});

test("real onion exhausted managed bridge bootstrap points to bridge or transport refresh", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 3,
    profile_b_bootstrap_attempts: 0,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: true,
    event_summary: [
      "bootstrap_diagnostic phase=timeout profile=redacted bridge_mode=managed_transport_bridge bridge_lines=2 managed_transport_count=1 pt_binary_configured=true timeout_seconds=120 next_action=retry-different-network-or-refresh-bridge-pt",
    ],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-refresh-transport",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery needs network change",
    profiles: "Room is saved.",
    session: "Delivery network did not finish starting.",
    message:
      "Refresh the private bridge config or replace the pluggable transport binary, then retry private delivery.",
    boundary:
      "No message was sent after bridge bootstrap exhausted retries with pluggable transport configured.",
  });
});

test("real onion exhausted direct bridge bootstrap points to bridge refresh", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 3,
    profile_b_bootstrap_attempts: 0,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: true,
    event_summary: [
      "bootstrap_diagnostic phase=timeout profile=redacted bridge_mode=direct_bridge bridge_lines=1 managed_transport_count=0 pt_binary_configured=false timeout_seconds=12 next_action=retry-different-network-or-refresh-bridge",
    ],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-refresh-config",
  });
});

test("real onion managed bridge bootstrap error points to bridge or transport refresh", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileAResumeBootstrapUnsupported",
    blockers: ["BootstrapUnsupported"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 1,
    profile_b_bootstrap_attempts: 1,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: true,
    event_summary: [
      "bootstrap_diagnostic phase=error profile=redacted bridge_mode=managed_transport_bridge bridge_lines=2 managed_transport_count=1 pt_binary_configured=true timeout_seconds=120 next_action=inspect-pt-or-bridge-diagnostics",
    ],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-refresh-transport",
  });
});

test("real onion bootstrap cancel remains retryable without an active wait", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapCancelled",
    blockers: ["BootstrapCancelled"],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "bootstrap-cancelled",
    retryable: true,
    waitCancellable: false,
    reason: "network-bootstrap-cancelled",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery wait canceled",
    profiles: "Room is saved.",
    session: "Network wait canceled",
    message: "Retry private delivery when you are ready.",
    boundary: "No message was sent and the network wait was closed.",
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
    retryableOutboundCount: 0,
    retryableOutboundMessageNumber: null,
    retryableOutboundAction: "",
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
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: null,
      retryableOutboundAction: "",
    },
  );
});

test("room list metadata carries retryable outbound state", () => {
  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 3,
        message: "still saved",
        createdAtMs: 400,
        outboundDeliveryState: "failed",
        outboundFailureKind: "stored remote endpoint refresh required",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 2,
        message: "sent",
        createdAtMs: 300,
        outboundDeliveryState: "sent",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        kind: "received",
        messageNumber: 1,
        message: "received copy",
        createdAtMs: 200,
        outboundDeliveryState: "failed",
        outboundRetryable: true,
      },
    ]),
    {
      lastMessagePreview: "still saved",
      lastMessageAt: 400,
      messageCount: 3,
      retryableOutboundCount: 1,
      retryableOutboundMessageNumber: 3,
      retryableOutboundAction: "refresh-and-retry",
    },
  );
});

test("room list metadata collapses retried copies before counting retryable sends", () => {
  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        kind: "sent",
        messageNumber: 1,
        message: "retried",
        createdAtMs: 400,
        outboundDeliveryState: "pending",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        kind: "sent",
        messageNumber: 1,
        message: "retried",
        createdAtMs: 400,
        outboundDeliveryState: "failed",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        kind: "sent",
        messageNumber: 1,
        message: "retried",
        createdAtMs: 400,
        outboundDeliveryState: "sent",
        outboundRetryable: false,
      },
    ]),
    {
      lastMessagePreview: "retried",
      lastMessageAt: 400,
      messageCount: 1,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: null,
      retryableOutboundAction: "",
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  chatNoticeForSendReceiveText,
  productionActionAvailability,
  productionLocalLifecycleBoundaryView,
  productionBridgeCensorshipBoundaryView,
  productionHighRiskThreatModelBoundaryView,
  productionHighRiskThreatModelClaimMatrix,
  productionInviteCodeProfiles,
  productionInviteIdentityBoundaryView,
  productionLocalDataRecoveryView,
  productionPairwiseInviteCreateView,
  productionPairwiseInviteImportFailureView,
  productionPairwiseInviteGuidanceView,
  productionPairwiseSafetyVerificationFlowView,
  productionProfileUnlockRecoveryView,
  productionInviteRoomConversationMetadata,
  productionManualCurrentFocusTarget,
  productionManualCurrentStepView,
  productionManualMessageCheckView,
  productionManualNextActions,
  productionManualTransferStepLabel,
  productionOnionReceiveLoopRefreshPlan,
  productionOnionReceiveRuntimeView,
  productionTwoProfileCurrentAction,
  productionTwoProfileLatestRetryableOutbound,
  productionTwoProfileManualLifecycleView,
  productionTwoProfileOutboundActionState,
  productionTwoProfileOutboundNeedsEndpointRefresh,
  productionTwoProfileOutboundPrimaryAction,
  productionTwoProfileOutboundStatusLabel,
  productionTwoProfileRealOnionRecoveryPlan,
  productionTwoProfileRealOnionUserView,
  productionTwoProfileResumeTarget,
  productionSessionLifecycleView,
  productionTwoProfileSendAttemptUserView,
  productionTwoProfileShouldClearPendingOutboundNotice,
  productionTwoProfileShouldShowOutboundRecovery,
} from "./action-state.js";

test("bridge censorship boundary keeps support and delivery claims explicit", () => {
  assert.equal(
    productionBridgeCensorshipBoundaryView({
      bridge_capable_build: true,
      bridge_configured_for_bootstrap: true,
    }),
    [
      "bridge_lines_local_sensitive=true",
      "bridge_support=configuration_specific",
      "audited_censorship_circumvention_claim=false",
      "reliable_onion_delivery_claim=false",
      "external_peer_evidence_required=true",
      "bridge_configured=true",
      "bridge_capable=true",
    ].join(" "),
  );
});

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

test("invite identity boundary stays accountless and redacted", () => {
  const boundary = productionInviteIdentityBoundaryView({
    profileA: "inviter-abcd-2345-1ufszcs",
    profileB: "joiner-abcd-2345-1ufszcs",
    passphrase: "ABCD-2345",
  });

  assert.match(boundary, /accountless=true/);
  assert.match(boundary, /phone_number_required=false/);
  assert.match(boundary, /email_required=false/);
  assert.match(boundary, /global_account_required=false/);
  assert.match(boundary, /searchable_username=false/);
  assert.match(boundary, /central_contact_discovery=false/);
  assert.match(boundary, /central_message_server=false/);
  assert.match(boundary, /pairwise_identity=true/);
  assert.match(boundary, /pairwise_profiles_derived=true/);
  assert.match(boundary, /invite_code_sensitive=true/);
  assert.match(boundary, /invite_code_in_diagnostics=false/);
  assert.match(boundary, /qr_required=false/);
  assert.doesNotMatch(boundary, /ABCD-2345|inviter-abcd|joiner-abcd/);
});

test("high-risk threat model matrix keeps public claims bounded", () => {
  const matrix = productionHighRiskThreatModelClaimMatrix();
  const boundary = productionHighRiskThreatModelBoundaryView();
  const statusFor = (attackerClass) =>
    matrix.find((entry) => entry.attackerClass === attackerClass)?.status;

  assert.equal(matrix.length, 8);
  assert.equal(statusFor("remote_passive_observer"), "mitigated");
  assert.equal(statusFor("remote_active_attacker"), "mitigated");
  assert.equal(statusFor("malicious_peer"), "mitigated");
  assert.equal(statusFor("local_at_rest_attacker"), "mitigated");
  assert.equal(statusFor("supply_chain_update_attacker"), "mitigated");
  assert.equal(statusFor("compromised_endpoint"), "not_protected");
  assert.equal(statusFor("direct_coercion"), "not_protected");
  assert.equal(statusFor("global_traffic_correlation"), "not_protected");
  assert.deepEqual(boundary.notProtected, [
    "compromised_endpoint",
    "direct_coercion",
    "global_traffic_correlation",
  ]);
  assert.match(boundary.boundary, /ordinary_use_claim=no-phone#no-email#no-global-account/);
  assert.match(boundary.boundary, /claimable_statuses=protected,mitigated/);
  assert.match(boundary.boundary, /compromised_endpoint:not_protected/);
  assert.match(boundary.boundary, /direct_coercion:not_protected/);
  assert.match(boundary.boundary, /global_traffic_correlation:not_protected/);
  assert.match(boundary.boundary, /audited_security_claim=false/);
  assert.match(boundary.boundary, /briar_cwtch_equivalence_claim=false/);
  assert.match(boundary.boundary, /coercion_safe_claim=false/);
  assert.match(boundary.boundary, /full_global_traffic_correlation_safe_claim=false/);
});

test("pairwise invite guidance keeps discovery and messaging gates explicit", () => {
  const create = productionPairwiseInviteGuidanceView({
    step: "create",
    role: "inviter",
    roomPresent: true,
  });
  assert.equal(create.nextKey, "pairwiseInviteNextShareCode");
  assert.match(create.boundary, /pairwise_invite_flow=true/);
  assert.match(create.boundary, /step=create-code/);
  assert.match(create.boundary, /role=inviter/);
  assert.match(create.boundary, /send_code_over_existing_channel=true/);
  assert.match(create.boundary, /verify_phrase_before_messaging=true/);
  assert.match(create.boundary, /searchable_username=false/);
  assert.match(create.boundary, /address_book=false/);
  assert.match(create.boundary, /central_contact_discovery=false/);
  assert.match(create.boundary, /central_message_server=false/);
  assert.match(create.boundary, /invite_code_in_diagnostics=false/);
  assert.match(create.boundary, /room_present=true/);

  const remove = productionPairwiseInviteGuidanceView({ step: "delete", role: "joiner" });
  assert.equal(remove.nextKey, "pairwiseInviteNextCreateOrPasteAgain");
  assert.match(remove.boundary, /step=remove-list-entry/);
  assert.match(remove.boundary, /room_present=false/);
});

test("pairwise invite create view exposes local peer labels without diagnostic payload claims", () => {
  const view = productionPairwiseInviteCreateView({
    code: "ABCD-2345",
    role: "inviter",
  });

  assert.equal(view.localProfile, "inviter-abcd-2345-1ufszcs");
  assert.equal(view.intendedPeerLabel, "joiner device");
  assert.equal(view.intendedPeerProfile, "joiner-abcd-2345-1ufszcs");
  assert.equal(view.payload, "ABCD-2345");
  assert.match(view.manualSendInstruction, /Send this invite code/);
  assert.match(view.boundary, /local_profile_visible=true/);
  assert.match(view.boundary, /intended_peer_label_visible=true/);
  assert.match(view.boundary, /payload_visible_to_user=true/);
  assert.match(view.boundary, /payload_in_diagnostics=false/);
});

test("pairwise invite import failure view splits non-generic recovery kinds", () => {
  const malformed = productionPairwiseInviteImportFailureView({
    error: "pairwise_invite_import_failure=malformed",
  });
  const duplicate = productionPairwiseInviteImportFailureView({
    error: "CoreError::PairingAlreadyPending",
  });
  const paired = productionPairwiseInviteImportFailureView({
    error: "CoreError::ContactAlreadyActive",
  });
  const mismatch = productionPairwiseInviteImportFailureView({
    error: "ProductionSessionError::LocalPairingPayloadMismatch",
  });
  const unsupported = productionPairwiseInviteImportFailureView({
    error: "ProductionSessionError::NonProductionPairingPayload",
  });
  const revoked = productionPairwiseInviteImportFailureView({
    error: "pairwise_invite_import_failure=revoked_re_pair_required",
  });

  assert.equal(malformed.kind, "malformed");
  assert.equal(duplicate.kind, "duplicate");
  assert.equal(paired.kind, "already_paired");
  assert.equal(mismatch.kind, "identity_mismatch");
  assert.equal(unsupported.kind, "unsupported");
  assert.equal(revoked.kind, "revoked_re_pair_required");
  for (const view of [malformed, duplicate, paired, mismatch, unsupported, revoked]) {
    assert.match(view.boundary, /generic_error=false/);
    assert.doesNotMatch(view.message, /ADPAIR2|\/tmp|passphrase|private key/i);
  }
});

test("pairwise safety verification flow routes mismatch and revoked to re-pair", () => {
  const compare = productionPairwiseSafetyVerificationFlowView({
    safetyTranscriptBound: true,
  });
  const confirmed = productionPairwiseSafetyVerificationFlowView({
    safetyTranscriptBound: true,
    confirmedMatch: true,
  });
  const mismatch = productionPairwiseSafetyVerificationFlowView({
    safetyTranscriptBound: true,
    failure_kind: "identity_mismatch",
  });
  const revoked = productionPairwiseSafetyVerificationFlowView({
    failure_kind: "revoked_re_pair_required",
  });

  assert.equal(compare.state, "compare");
  assert.equal(compare.confirmMatchAllowed, true);
  assert.equal(confirmed.state, "confirmed_match");
  assert.match(confirmed.boundary, /compare_required=false/);
  assert.equal(mismatch.state, "marked_mismatch");
  assert.equal(mismatch.rePairRequired, true);
  assert.equal(revoked.state, "revoked_re_pair_required");
  assert.equal(revoked.rePairRequired, true);
  assert.match(revoked.boundary, /generic_error=false/);
});

test("profile unlock recovery view splits passphrase store and migration failures", () => {
  const wrong = productionProfileUnlockRecoveryView({ redacted_reason: "wrong-passphrase" });
  const missing = productionProfileUnlockRecoveryView({ kind: "missing_store" });
  const corrupt = productionProfileUnlockRecoveryView({ error: "corrupt local store" });
  const migration = productionProfileUnlockRecoveryView({ failure_kind: "migration_needed" });
  const unsupported = productionProfileUnlockRecoveryView({ error: "os-keystore-only rejected" });

  assert.equal(wrong.kind, "wrong_passphrase");
  assert.equal(wrong.retryWithPassphraseAllowed, true);
  assert.equal(missing.kind, "missing_store");
  assert.equal(missing.createNewProfileAllowed, true);
  assert.equal(corrupt.kind, "corrupt_store");
  assert.equal(corrupt.createNewProfileAllowed, true);
  assert.equal(migration.kind, "migration_needed");
  assert.equal(migration.migrationRequired, true);
  assert.equal(unsupported.kind, "unsupported_unlock_factor");
  assert.match(unsupported.boundary, /os_keychain_only_supported=false/);
  for (const view of [wrong, missing, corrupt, migration, unsupported]) {
    assert.match(view.boundary, /generic_error=false/);
    assert.match(view.boundary, /raw_path_returned=false/);
    assert.match(view.boundary, /passphrase_returned=false/);
    assert.match(view.boundary, /key_material=false/);
    assert.match(view.boundary, /secure_media_deletion_claim=false/);
    assert.match(view.boundary, /not_protected_device_compromise=true/);
    assert.doesNotMatch(view.warning, /\/tmp|profiles\/|correct horse|private key/i);
  }
});

test("local data recovery view keeps backup migration and corrupt store limits explicit", () => {
  const passphraseLoss = productionLocalDataRecoveryView({ kind: "passphrase_loss" });
  const corrupt = productionLocalDataRecoveryView({ kind: "corrupt_store" });
  const migration = productionLocalDataRecoveryView({ kind: "migration_failure" });

  assert.equal(passphraseLoss.kind, "passphrase_loss");
  assert.equal(passphraseLoss.createNewProfileAllowed, true);
  assert.equal(corrupt.kind, "corrupt_store");
  assert.equal(corrupt.createNewProfileAllowed, true);
  assert.equal(migration.kind, "migration_failure");
  assert.equal(migration.migrationRequired, true);
  assert.equal(migration.migrationRetryAllowed, true);
  assert.equal(migration.createNewProfileAllowed, false);
  for (const view of [passphraseLoss, corrupt, migration]) {
    assert.match(view.boundary, /local_export_backup=encrypted_only/);
    assert.match(view.boundary, /restore_requires_profile_passphrase=true/);
    assert.match(view.boundary, /cloud_backup_sync=false/);
    assert.match(view.boundary, /backup_recovery_claim=false/);
    assert.match(view.boundary, /destructive_migration=false/);
    assert.match(view.boundary, /silent_data_loss=false/);
    assert.match(view.boundary, /rollback_prevention_claim=false/);
    assert.match(view.boundary, /secure_media_deletion_claim=false/);
    assert.doesNotMatch(view.warning, /\/tmp|profiles\/|correct horse|private key/i);
  }

  const unlockMigration = productionProfileUnlockRecoveryView({ kind: "migration_needed" });
  assert.match(unlockMigration.boundary, /local_data_recovery=true/);
  assert.match(unlockMigration.boundary, /failure=migration_failure/);
  assert.match(unlockMigration.boundary, /silent_data_loss=false/);
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

test("local lifecycle boundary keeps backup recovery and secure delete as non-claims", () => {
  const boundary = productionLocalLifecycleBoundaryView({
    store_path_returned: false,
    passphrase_retained: false,
    plaintext_exposed: false,
    key_material_exposed: false,
    network_io_attempted: false,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
    rollback_prevention_claimed: false,
    secure_deletion_from_media_claimed: false,
  });

  assert.match(boundary, /local_only=true/);
  assert.match(boundary, /cloud_backup_sync=false/);
  assert.match(boundary, /backup_recovery=false/);
  assert.match(boundary, /marker_only_rollback=true/);
  assert.match(boundary, /rollback_prevention=false/);
  assert.match(boundary, /secure_delete_claim=false/);
  assert.match(boundary, /path_returned=false/);
  assert.match(boundary, /key_material=false/);
});

test("session lifecycle view exposes local-only lifecycle non-claims", () => {
  const view = productionSessionLifecycleView({
    session_draft_present: true,
    remote_endpoint_state_present: true,
    remote_endpoint_status_present: true,
    replay_window_present: true,
    pending_handshake_state_present: false,
    session_transport_state_present: true,
    session_resume_ready: true,
    session_deleted: false,
    session_resume_closed: false,
    message_records_preserved: true,
    store_path_returned: false,
    passphrase_retained: false,
    key_material_exposed: false,
    network_io_attempted: false,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  });

  assert.match(view.lifecycle, /resume=true/);
  assert.match(view.boundary, /message_records_preserved=true/);
  assert.match(view.boundary, /local_only=true/);
  assert.match(view.boundary, /backup_recovery=false/);
  assert.match(view.boundary, /cloud_backup_sync=false/);
  assert.match(view.boundary, /secure_delete_claim=false/);
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
  assert.deepEqual(productionTwoProfileOutboundActionState(entry, { profileA: "bob", profileB: "alice" }, true), {
    showActions: true,
    sameDirection: false,
    canApplyDirection: true,
    canRunNow: false,
    canCancelNow: false,
    disabledReason: "Only pending messages sent from this device can be retried or canceled here.",
    cancelDisabledReason: "Only pending messages sent from this device can be retried or canceled here.",
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
  const localEndpointNotReady = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "LocalOnionEndpointNotReady",
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
    action: "retry-network",
    labelKey: "retryNetwork",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryTorBootstrap",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(localEndpointNotReady), "receive stopped");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(localEndpointNotReady), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(localEndpointNotReady), {
    action: "start-receiving",
    labelKey: "startReceiving",
    noticeKey: "chatNoticeReceiveStopped",
    recoveryKey: "sendRecoveryStartReceiving",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(missingMessage), "message missing");
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(missingMessage), {
    action: "retry",
    labelKey: "retrySend",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryGeneric",
  });
});

test("manual lifecycle view summarizes envelope state without sensitive payloads", () => {
  const base = {
    messageNumber: 7,
    message: "secret text",
    sender: "alice-profile",
    receiver: "bob-profile",
    roomFingerprint: "room-secret",
  };

  const exportNeeded = productionTwoProfileManualLifecycleView({
    ...base,
    statuses: new Set(),
    outboundDeliveryState: "pending",
  });
  assert.equal(exportNeeded.phase, "export-needed");
  assert.equal(exportNeeded.step, productionManualTransferStepLabel("export-envelope"));
  assert.match(exportNeeded.boundary, /network_io=false/);

  const importReady = productionTwoProfileManualLifecycleView(
    {
      ...base,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "sent",
    },
    true,
  );
  assert.equal(importReady.phase, "import-ready");
  assert.equal(importReady.step, productionManualTransferStepLabel("import-envelope"));

  const retryable = productionTwoProfileManualLifecycleView({
    ...base,
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundRetryable: true,
  });
  assert.equal(retryable.phase, "retryable");
  assert.equal(retryable.step, "retry or cancel");

  const complete = productionTwoProfileManualLifecycleView({
    ...base,
    statuses: new Set(["sent", "received"]),
    outboundDeliveryState: "sent",
  });
  assert.equal(complete.phase, "complete");
  assert.equal(complete.step, productionManualTransferStepLabel("write-reply"));

  const rendered = [exportNeeded, importReady, retryable, complete]
    .map((view) => Object.values(view).join(" "))
    .join("\n");
  assert.doesNotMatch(rendered, /secret text|alice-profile|bob-profile|room-secret|passphrase|payload|endpoint|path/);
});

test("send receive notices separate bootstrap retry from route setup", () => {
  assert.deepEqual(chatNoticeForSendReceiveText("PersistentClientNotReady"), {
    key: "retryNetwork",
    tone: "warning",
  });
  assert.deepEqual(chatNoticeForSendReceiveText("bootstrap timeout"), {
    key: "retryNetwork",
    tone: "warning",
  });
  assert.deepEqual(chatNoticeForSendReceiveText("private route is not ready"), {
    key: "torBootstrap",
    tone: "warning",
  });
});

test("send attempt view separates route setup from endpoint refresh", () => {
  assert.deepEqual(
    productionTwoProfileSendAttemptUserView(
      {
        send_attempt_started: false,
        send_attempt_succeeded: false,
        peer_endpoint_refresh_recommended: false,
        next_blocker: "stored remote endpoint unavailable",
        blockers: ["stored remote endpoint unavailable"],
      },
      7,
    ),
    {
      state: "Private route needed",
      profiles: "Room is saved.",
      session: "Peer delivery route is not ready.",
      message: "Message #7 is still saved. Set up the delivery route, then retry or cancel.",
      boundary: "No private delivery was attempted.",
    },
  );

  assert.deepEqual(
    productionTwoProfileSendAttemptUserView(
      {
        send_attempt_started: false,
        send_attempt_succeeded: false,
        peer_endpoint_refresh_recommended: true,
        next_blocker: "stored remote endpoint refresh required",
        blockers: ["stored remote endpoint refresh required"],
      },
      7,
    ),
    {
      state: "Peer address refresh needed",
      profiles: "Room is saved.",
      session: "Peer address needs to be refreshed.",
      message: "Message #7 is still saved. Refresh the address, then retry or cancel.",
      boundary: "No message was deleted.",
    },
  );

  assert.deepEqual(
    productionTwoProfileSendAttemptUserView(
      {
        send_attempt_started: true,
        send_attempt_succeeded: false,
        peer_endpoint_refresh_recommended: false,
        next_blocker: "SendFailed",
        blockers: ["SendFailed"],
      },
      7,
    ),
    {
      state: "Private delivery failed",
      profiles: "Room is saved.",
      session: "The other device may be offline.",
      message: "Message #7 is still saved. Retry or cancel it from the conversation.",
      boundary: "The failed send stayed retryable.",
    },
  );
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

test("stale pending outbound notice clears even when another pending row remains", () => {
  assert.equal(
    productionTwoProfileShouldClearPendingOutboundNotice({
      busy: false,
      hasPendingOutboundNotice: true,
      noticeMatchesCurrentRoom: true,
      noticePendingOutboundRetryable: false,
      hasPendingConversation: true,
    }),
    true,
  );
  assert.equal(
    productionTwoProfileShouldClearPendingOutboundNotice({
      busy: false,
      hasPendingOutboundNotice: true,
      noticeMatchesCurrentRoom: true,
      noticePendingOutboundRetryable: true,
      hasPendingConversation: true,
    }),
    false,
  );
  assert.equal(
    productionTwoProfileShouldClearPendingOutboundNotice({
      busy: true,
      hasPendingOutboundNotice: true,
      noticeMatchesCurrentRoom: true,
      noticePendingOutboundRetryable: false,
    }),
    false,
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
    boundary:
      "No message was sent and no bridge config was used. " +
      "bridge_lines_local_sensitive=true bridge_support=configuration_specific " +
      "audited_censorship_circumvention_claim=false reliable_onion_delivery_claim=false " +
      "external_peer_evidence_required=true bridge_configured=false bridge_capable=true",
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
      "No message was sent after bridge bootstrap exhausted retries with pluggable transport configured. " +
      "bridge_lines_local_sensitive=true bridge_support=configuration_specific " +
      "audited_censorship_circumvention_claim=false reliable_onion_delivery_claim=false " +
      "external_peer_evidence_required=true bridge_configured=true bridge_capable=true",
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
    retryableOutboundMessage: "",
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
      retryableOutboundMessage: "",
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
      retryableOutboundMessage: "still saved",
      retryableOutboundAction: "refresh-and-retry",
    },
  );
});

test("room list metadata waits for failed state before saved retry", () => {
  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 3,
        message: "still pending",
        createdAtMs: 400,
        outboundDeliveryState: "pending",
        outboundRetryable: true,
      },
    ]),
    {
      lastMessagePreview: "still pending",
      lastMessageAt: 400,
      messageCount: 1,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: null,
      retryableOutboundMessage: "",
      retryableOutboundAction: "",
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
      retryableOutboundMessage: "",
      retryableOutboundAction: "",
    },
  );
});

test("manual received review stays tied to the selected pending row", () => {
  assert.equal(
    productionActionAvailability({
      busy: false,
      hasReceivedExportInput: true,
      selectedMessageInputMatches: false,
    }).exportReceivedMessage,
    false,
  );
  assert.equal(
    productionActionAvailability({
      busy: false,
      hasReceivedExportInput: true,
      selectedMessageInputMatches: true,
    }).exportReceivedMessage,
    true,
  );
});

test("manual check keeps imported message review before reply writing", () => {
  assert.equal(
    productionManualMessageCheckView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      messageNumber: 1,
      selectedMessageInputMatches: true,
      hasImportedMessage: true,
      hasReceivedMessage: false,
      hasTwoProfileReplySelected: true,
    }),
    "Manual check: imported envelope is decrypted; click Show plaintext before writing the reply.",
  );
});

test("manual current action keeps pairing artifacts before message compose", () => {
  const relayPairingState = {
    hasProfileUnlockInput: true,
    hasLocalPairingPayload: true,
    counterpartProfile: "bob",
    sessionReadyForMessages: true,
  };
  assert.equal(productionManualNextActions(relayPairingState).pairing, "Next: click Relay pairing to peer.");
  assert.equal(
    productionManualCurrentStepView(relayPairingState),
    "Pairing | Next: click Relay pairing to peer.",
  );
  assert.equal(productionManualCurrentFocusTarget(relayPairingState), "relay-pairing");

  const finishSlotState = {
    hasProfileUnlockInput: true,
    hasRemoteHandshakeFinishSlot: true,
    sessionReadyForMessages: true,
  };
  assert.equal(productionManualNextActions(finishSlotState).pairing, "Next: click Fill remote finish.");
  assert.equal(
    productionManualCurrentStepView(finishSlotState),
    "Pairing | Next: click Fill remote finish.",
  );
  assert.equal(productionManualCurrentFocusTarget(finishSlotState), "load-handshake-finish");
});

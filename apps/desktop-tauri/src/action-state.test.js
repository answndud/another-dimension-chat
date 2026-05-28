import assert from "node:assert/strict";
import test from "node:test";
import {
  productionActionAvailability,
  productionCounterpartProfile,
  productionHandshakeFinishImportView,
  productionHandshakePayloadView,
  productionManualMessageCheckView,
  productionManualCurrentFocusTarget,
  productionManualCurrentStepView,
  productionManualNextActions,
  productionManualPrimaryActions,
  productionManualRelayCurrentActions,
  productionManualRelayDisabledReasons,
  productionManualRelayAvailability,
  productionManualRelaySuccessWarning,
  productionManualMessageStatusView,
  productionManualStatusView,
  productionMessageEnvelopeExportView,
  productionMessageEnvelopeImportView,
  productionMessageTtlInputValue,
  productionOnionReceiveFailureMessage,
  productionOnionReceiveLoopRefreshPlan,
  productionOnionReceiveRuntimeView,
  productionPairingPayloadView,
  productionProfileMessageReadiness,
  productionProfilePreset,
  productionProfileUnlockView,
  productionReceivedMessageExportView,
  productionSessionDraftView,
  productionSessionStateView,
  productionTwoProfilePairFromProfiles,
  productionTwoProfileConversationActionView,
  productionTwoProfileConversationCompare,
  productionTwoProfileCurrentAction,
  productionTwoProfileMessageResultView,
  productionTwoProfileReplySelectionView,
  productionTwoProfileResultView,
  productionTwoProfileReadiness,
  productionTwoProfileResumeTarget,
  productionTwoProfileSessionSummaryView,
  productionTwoProfileSessionStatusView,
} from "./action-state.js";

const baseState = {
  busy: false,
  hasProfileUnlockInput: false,
  hasPairingInput: false,
  hasSessionDraftInput: false,
  hasHandshakeReplyInput: false,
  hasHandshakeFinishInput: false,
  hasFinishImportInput: false,
  hasLocalPairingPayload: false,
  hasHandshakeInitPayload: false,
  hasHandshakeReplyPayload: false,
  hasHandshakeFinishPayload: false,
  hasLocalMessageEnvelope: false,
  sessionReadyForMessages: false,
  hasOutboundMessageInput: false,
  hasInboundEnvelopeInput: false,
  hasImportedMessage: false,
  hasReceivedExportInput: false,
  hasReceivedMessage: false,
  hasTwoProfileInput: false,
};

const completeTwoProfileResult = {
  profile_a_unlocked: true,
  profile_b_unlocked: true,
  pairing_payloads_exported: true,
  session_drafts_saved: true,
  handshake_completed: true,
  sender_session_ready: true,
  receiver_session_ready: true,
  message_number_reserved: true,
  encrypted_envelope_exported: true,
  inbound_message_stored: true,
  received_status_verified: true,
  received_export_matches_input: true,
  plaintext_returned_to_frontend: false,
  store_path_returned: false,
  passphrase_retained: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const completeTwoProfileMessageResult = {
  sender_profile: "alice",
  receiver_profile: "bob",
  message_number: 3,
  sender_session_ready: true,
  receiver_session_ready: true,
  message_number_reserved: true,
  encrypted_envelope_exported: true,
  inbound_message_stored: true,
  received_status_verified: true,
  received_export_matches_input: true,
  plaintext_returned_to_frontend: false,
  store_path_returned: false,
  passphrase_retained: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeProfileUnlockResult = {
  storage_opened: true,
  app_data_profile_store: true,
  profile_initialized: true,
  profile_marker_present: true,
  identity_created: true,
  identity_private_key_present: true,
  identity_public_key_derivable: true,
  store_path_returned: false,
  passphrase_retained: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safePairingPayloadResult = {
  storage_opened: true,
  identity_private_key_loaded: true,
  noise_static_private_key_written: true,
  pairing_payload_exported: true,
  payload_format: "ADPAIR2",
  store_path_returned: false,
  passphrase_retained: false,
  private_key_material_returned: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeSessionDraftResult = {
  session_plan_created: true,
  session_draft_written: true,
  session_draft_present: true,
  remote_endpoint_state_present: true,
  replay_window_present: true,
  channel_id_derivable: true,
  storage_opened: true,
  local_noise_static_private_key_loaded: true,
  local_noise_static_matches_payload: true,
  remote_contact_present: true,
  payloads_returned: false,
  store_path_returned: false,
  passphrase_retained: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeSessionStateResult = {
  session_draft_present: true,
  channel_id_derivable: true,
  local_role_available: true,
  remote_endpoint_state_present: true,
  replay_window_present: true,
  session_transport_state_present: true,
  runtime_material_reconstructable: true,
  ready_for_message_envelope: true,
  outbound_envelope_io_ready: false,
  store_path_returned: false,
  passphrase_retained: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeTwoProfileSessionStatusResult = {
  profile_a: "alice",
  profile_b: "bob",
  profile_a_ready_for_message_envelope: true,
  profile_b_ready_for_message_envelope: false,
  both_ready_for_message_envelope: false,
  profile_a_remote_endpoint_state_present: true,
  profile_b_remote_endpoint_state_present: true,
  profile_a_session_transport_state_present: true,
  profile_b_session_transport_state_present: false,
  profile_a_runtime_material_reconstructable: true,
  profile_b_runtime_material_reconstructable: true,
  profile_a_outbound_envelope_io_ready: true,
  profile_b_outbound_envelope_io_ready: true,
  store_path_returned: false,
  passphrase_retained: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeHandshakePayloadResult = {
  role_allowed: true,
  input_payload_read: true,
  input_payload_decodable: true,
  output_payload_created: true,
  state_written: true,
  transport_state_persisted: true,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeHandshakeFinishImportResult = {
  role_allowed: true,
  finish_payload_read: true,
  finish_payload_decodable: true,
  remote_static_verified: true,
  transport_state_persisted: true,
  payloads_returned: false,
  key_material_exposed: false,
  network_io_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeMessageEnvelopeExportResult = {
  selected_message_number: 7,
  auto_message_number: true,
  auto_counter_written: true,
  existing_message_slot_skipped: false,
  expired_outbound_messages_purged: 1,
  message_number_reserved: true,
  pending_message_record_written: true,
  local_message_index_written: true,
  session_transport_ready: true,
  encrypted_envelope_written: true,
  encrypted_envelope_present: true,
  plaintext_returned: false,
  key_material_exposed: false,
  network_send_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeMessageEnvelopeImportResult = {
  envelope_read: true,
  envelope_decodable: true,
  session_transport_ready: true,
  replay_accepted: true,
  plaintext_decrypted: true,
  received_message_written: true,
  received_message_matches_session: true,
  expired_received_message_purged: true,
  plaintext_returned: false,
  key_material_exposed: false,
  network_receive_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

const safeReceivedMessageExportResult = {
  received_message_record_present: true,
  received_message_record_decodable: true,
  received_message_matches_session: true,
  expired_received_message_purged: false,
  message_ttl_seconds: 604800,
  expires_at_ms: 123456789,
  expired: false,
  plaintext_returned_after_unlock: true,
  key_material_exposed: false,
  network_receive_attempted: false,
  transport_io_opened: false,
  runtime_messaging_enabled: false,
};

test("productionTwoProfileReadiness blocks incomplete inputs in priority order", () => {
  assert.equal(
    productionTwoProfileReadiness({ profileA: "", profileB: "", passphrase: "", message: "" }, false),
    "Blocked: Profile A required",
  );
  assert.equal(
    productionTwoProfileReadiness({ profileA: "alice", profileB: "alice", passphrase: "p", message: "m" }, false),
    "Blocked: profiles must be distinct",
  );
  assert.equal(
    productionTwoProfileReadiness({ profileA: "alice", profileB: "bob", passphrase: "", message: "m" }, false),
    "Blocked: passphrase required",
  );
  assert.equal(
    productionTwoProfileReadiness({ profileA: "alice", profileB: "bob", passphrase: "p", message: "m" }, true),
    "Running: production action in progress",
  );
});

test("productionTwoProfileCurrentAction selects the next top-level control", () => {
  const input = {
    profileA: "alice",
    profileB: "bob",
    passphrase: "p",
    messageTtlSeconds: 86400,
    message: "",
  };
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
  assert.equal(
    productionTwoProfileCurrentAction({
      input: { ...input, message: "hello" },
      hasMessageRetentionPolicy: true,
      sessionsReady: false,
      hasRecoveredConversation: true,
    }),
    "check-session",
  );
  assert.equal(
    productionTwoProfileCurrentAction({
      input: { ...input, message: "hello" },
      hasMessageRetentionPolicy: true,
      sessionsReady: false,
      hasKnownSessionStatus: true,
    }),
    "full-setup",
  );
});

test("productionTwoProfileResumeTarget prefers pending review then latest reply", () => {
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: false,
      hasPendingConversation: true,
      hasDeliveredConversation: true,
    }),
    null,
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
      hasPendingConversation: false,
      hasDeliveredConversation: true,
      hasMessageDraft: false,
    }),
    "reply-latest",
  );
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: true,
      hasPendingConversation: false,
      hasDeliveredConversation: true,
      hasMessageDraft: true,
    }),
    "compose",
  );
});

test("productionProfilePreset maps known manual peers to profile and endpoint defaults", () => {
  assert.deepEqual(productionProfilePreset(" Alice "), {
    profile: "alice",
    rendezvousEndpoint: "alice.onion",
  });
  assert.deepEqual(productionProfilePreset("bob"), {
    profile: "bob",
    rendezvousEndpoint: "bob.onion",
  });
  assert.equal(productionProfilePreset("mallory"), null);
});

test("productionCounterpartProfile maps only known manual peers", () => {
  assert.equal(productionCounterpartProfile(" Alice "), "bob");
  assert.equal(productionCounterpartProfile("bob"), "alice");
  assert.equal(productionCounterpartProfile("carol"), null);
});

test("productionTwoProfilePairFromProfiles keeps saved current pair", () => {
  assert.deepEqual(
    productionTwoProfilePairFromProfiles(["alice", "bob", "carol"], "bob", "carol"),
    { profileA: "bob", profileB: "carol", changed: false },
  );
});

test("productionTwoProfilePairFromProfiles resumes from saved profiles when defaults are stale", () => {
  assert.deepEqual(
    productionTwoProfilePairFromProfiles(["me", "peer"], "alice", "bob"),
    { profileA: "me", profileB: "peer", changed: true },
  );
  assert.deepEqual(
    productionTwoProfilePairFromProfiles(["alice", "bob"], "me", "peer"),
    { profileA: "alice", profileB: "bob", changed: true },
  );
});

test("productionTwoProfilePairFromProfiles preserves one saved side when choosing peer", () => {
  assert.deepEqual(
    productionTwoProfilePairFromProfiles(["me", "peer", "third"], "peer", "bob"),
    { profileA: "peer", profileB: "me", changed: true },
  );
  assert.deepEqual(
    productionTwoProfilePairFromProfiles(["me", "peer", "third"], "alice", "peer"),
    { profileA: "me", profileB: "peer", changed: true },
  );
});

test("productionActionAvailability disables every action while busy", () => {
  const availability = productionActionAvailability({
    ...baseState,
    busy: true,
    hasProfileUnlockInput: true,
    hasPairingInput: true,
    hasTwoProfileInput: true,
  });

  assert.equal(Object.values(availability).every((enabled) => enabled === false), true);
});

test("productionActionAvailability enables only actions whose inputs are ready", () => {
  assert.deepEqual(
    productionActionAvailability({
      ...baseState,
      hasProfileUnlockInput: true,
      hasPairingInput: true,
      hasLocalPairingPayload: true,
    }),
    {
      unlockProfile: true,
      exportPairing: true,
      saveSessionDraft: false,
      checkSessionState: true,
      exportHandshakeInit: true,
      exportHandshakeReply: false,
      exportHandshakeFinish: false,
      importHandshakeFinish: false,
      exportMessageEnvelope: false,
      importMessageEnvelope: false,
      exportReceivedMessage: false,
      runTwoProfileRoundtrip: false,
      runTwoProfileMessageRoundtrip: false,
      usePairingPayload: true,
      useHandshakeInit: false,
      useHandshakeReply: false,
      useHandshakeFinish: false,
      useMessageEnvelope: false,
    },
  );
});

test("productionActionAvailability routes two-profile send by stored session readiness", () => {
  assert.deepEqual(
    {
      setup: productionActionAvailability({
        ...baseState,
        hasTwoProfileInput: true,
        hasTwoProfileSessionsReady: false,
      }).runTwoProfileRoundtrip,
      storedSend: productionActionAvailability({
        ...baseState,
        hasTwoProfileInput: true,
        hasTwoProfileSessionsReady: false,
      }).runTwoProfileMessageRoundtrip,
    },
    {
      setup: true,
      storedSend: false,
    },
  );

  assert.deepEqual(
    {
      setup: productionActionAvailability({
        ...baseState,
        hasTwoProfileInput: true,
        hasTwoProfileSessionsReady: true,
      }).runTwoProfileRoundtrip,
      storedSend: productionActionAvailability({
        ...baseState,
        hasTwoProfileInput: true,
        hasTwoProfileSessionsReady: true,
      }).runTwoProfileMessageRoundtrip,
    },
    {
      setup: false,
      storedSend: true,
    },
  );
});

test("productionActionAvailability blocks stale selected message export and import", () => {
  assert.deepEqual(
    {
      exportReady: productionActionAvailability({
        ...baseState,
        hasOutboundMessageInput: true,
        selectedMessageInputMatches: true,
      }).exportMessageEnvelope,
      exportStale: productionActionAvailability({
        ...baseState,
        hasOutboundMessageInput: true,
        selectedMessageInputMatches: false,
      }).exportMessageEnvelope,
      importReady: productionActionAvailability({
        ...baseState,
        hasInboundEnvelopeInput: true,
        selectedMessageInputMatches: true,
      }).importMessageEnvelope,
      importStale: productionActionAvailability({
        ...baseState,
        hasInboundEnvelopeInput: true,
        selectedMessageInputMatches: false,
      }).importMessageEnvelope,
    },
    {
      exportReady: true,
      exportStale: false,
      importReady: true,
      importStale: false,
    },
  );
});

test("productionActionAvailability blocks message actions until retention policy is ready", () => {
  assert.deepEqual(
    {
      exportMessageEnvelope: productionActionAvailability({
        ...baseState,
        hasMessageRetentionPolicy: false,
        hasOutboundMessageInput: true,
      }).exportMessageEnvelope,
      importMessageEnvelope: productionActionAvailability({
        ...baseState,
        hasMessageRetentionPolicy: false,
        hasInboundEnvelopeInput: true,
      }).importMessageEnvelope,
      setup: productionActionAvailability({
        ...baseState,
        hasMessageRetentionPolicy: false,
        hasTwoProfileInput: true,
        hasTwoProfileSessionsReady: false,
      }).runTwoProfileRoundtrip,
      storedSend: productionActionAvailability({
        ...baseState,
        hasMessageRetentionPolicy: false,
        hasTwoProfileInput: true,
        hasTwoProfileSessionsReady: true,
      }).runTwoProfileMessageRoundtrip,
    },
    {
      exportMessageEnvelope: false,
      importMessageEnvelope: false,
      setup: false,
      storedSend: false,
    },
  );
});

test("productionMessageTtlInputValue accepts only explicit policy values", () => {
  assert.equal(productionMessageTtlInputValue("86400", [3600, 86400, 604800], 604800), 86400);
  assert.equal(productionMessageTtlInputValue("", [3600, 86400, 604800], 604800), 604800);
  assert.equal(productionMessageTtlInputValue("999", [3600, 86400, 604800], 604800), null);
  assert.equal(productionMessageTtlInputValue("86400", [], 604800), null);
  assert.equal(productionMessageTtlInputValue("86400", [3600], 604800), null);
});

test("productionOnionReceiveRuntimeView maps receive loop states", () => {
  assert.deepEqual(productionOnionReceiveRuntimeView({ enabled: false }), {
    state: "stopped",
    label: "Receive mode stopped",
    retryable: false,
    duplicateBlocked: false,
  });
  assert.equal(
    productionOnionReceiveRuntimeView({ enabled: true, inFlight: true, runtimeState: "receiving" }).state,
    "receiving",
  );
  assert.deepEqual(
    productionOnionReceiveRuntimeView({ enabled: true, stopRequested: true, runtimeState: "stopped" }),
    {
      state: "stopped",
      label: "Receive mode stopping",
      retryable: false,
      duplicateBlocked: true,
    },
  );
  assert.deepEqual(
    productionOnionReceiveRuntimeView({
      enabled: true,
      runtimeState: "bootstrapping",
      runtimeLabel: "Receive mode waiting for Tor bootstrap",
    }),
    {
      state: "bootstrapping",
      label: "Receive mode waiting for Tor bootstrap",
      retryable: false,
      duplicateBlocked: false,
    },
  );
  assert.equal(
    productionOnionReceiveRuntimeView(
      { enabled: true },
      { persistent_client_ready: false },
    ).state,
    "bootstrapping",
  );
  assert.equal(
    productionOnionReceiveRuntimeView(
      { enabled: true },
      { persistent_client_ready: true, inbound_stream_preparation_ready: false },
    ).state,
    "launching-service",
  );
  assert.equal(
    productionOnionReceiveRuntimeView(
      { enabled: true },
      {
        persistent_client_ready: true,
        inbound_stream_preparation_ready: true,
        inbound_rend_request_accepted: true,
      },
    ).state,
    "peer-connected",
  );
  assert.equal(
    productionOnionReceiveRuntimeView(
      { enabled: true },
      { receive_attempt_succeeded: true },
    ).state,
    "message-imported",
  );
  assert.equal(
    productionOnionReceiveRuntimeView(
      { enabled: true },
      { persistent_client_ready: true, inbound_stream_preparation_ready: true, receive_attempt_started: true },
    ).state,
    "failed-retryable",
  );
});

test("productionOnionReceiveLoopRefreshPlan uses cumulative counters", () => {
  assert.deepEqual(
    productionOnionReceiveLoopRefreshPlan(
      {
        lastProcessedImportSequence: 2,
        lastProcessedMessageImportCount: 1,
        lastProcessedEndpointUpdateCount: 1,
      },
      {
        import_sequence: 3,
        message_import_count: 2,
        endpoint_update_count: 1,
        last_attempt_succeeded: false,
        last_endpoint_update_applied: false,
      },
    ),
    {
      transcriptChanged: true,
      messageImported: true,
      endpointUpdated: false,
      newImportCount: 1,
      newMessageImportCount: 1,
      newEndpointUpdateCount: 0,
      importSequence: 3,
      messageImportCount: 2,
      endpointUpdateCount: 1,
    },
  );
  assert.deepEqual(
    productionOnionReceiveLoopRefreshPlan(
      {
        lastProcessedImportSequence: 2,
        lastProcessedMessageImportCount: 1,
        lastProcessedEndpointUpdateCount: 1,
      },
      {
        import_sequence: 3,
        message_import_count: 1,
        endpoint_update_count: 2,
        last_attempt_succeeded: false,
        last_endpoint_update_applied: false,
      },
    ),
    {
      transcriptChanged: true,
      messageImported: false,
      endpointUpdated: true,
      newImportCount: 1,
      newMessageImportCount: 0,
      newEndpointUpdateCount: 1,
      importSequence: 3,
      messageImportCount: 1,
      endpointUpdateCount: 2,
    },
  );
  assert.equal(
    productionOnionReceiveLoopRefreshPlan(
      { lastProcessedImportSequence: 3, lastProcessedMessageImportCount: 2 },
      { import_sequence: 3, message_import_count: 2, endpoint_update_count: 0 },
    ).transcriptChanged,
    false,
  );
  const afterRetryFailure = productionOnionReceiveLoopRefreshPlan(
    {
      lastProcessedImportSequence: 3,
      lastProcessedMessageImportCount: 2,
      lastProcessedEndpointUpdateCount: 1,
    },
    {
      import_sequence: 4,
      message_import_count: 3,
      endpoint_update_count: 1,
      runtime_state: "failed-retryable",
      last_attempt_succeeded: false,
      last_endpoint_update_applied: false,
    },
  );
  assert.equal(afterRetryFailure.transcriptChanged, true);
  assert.equal(afterRetryFailure.messageImported, true);
  assert.equal(afterRetryFailure.endpointUpdated, false);
  assert.equal(afterRetryFailure.newImportCount, 1);
  assert.equal(afterRetryFailure.newMessageImportCount, 1);
  assert.equal(afterRetryFailure.newEndpointUpdateCount, 0);
  const multiImportPoll = productionOnionReceiveLoopRefreshPlan(
    {
      lastProcessedImportSequence: 4,
      lastProcessedMessageImportCount: 3,
      lastProcessedEndpointUpdateCount: 1,
    },
    {
      import_sequence: 7,
      message_import_count: 5,
      endpoint_update_count: 2,
    },
  );
  assert.equal(multiImportPoll.transcriptChanged, true);
  assert.equal(multiImportPoll.messageImported, true);
  assert.equal(multiImportPoll.endpointUpdated, true);
  assert.equal(multiImportPoll.newImportCount, 3);
  assert.equal(multiImportPoll.newMessageImportCount, 2);
  assert.equal(multiImportPoll.newEndpointUpdateCount, 1);
  const staleCounterPoll = productionOnionReceiveLoopRefreshPlan(
    {
      lastProcessedImportSequence: 7,
      lastProcessedMessageImportCount: 5,
      lastProcessedEndpointUpdateCount: 2,
    },
    {
      import_sequence: 6,
      message_import_count: 4,
      endpoint_update_count: 1,
    },
  );
  assert.equal(staleCounterPoll.transcriptChanged, false);
  assert.equal(staleCounterPoll.newImportCount, 0);
  assert.equal(staleCounterPoll.newMessageImportCount, 0);
  assert.equal(staleCounterPoll.newEndpointUpdateCount, 0);
});

test("productionOnionReceiveFailureMessage maps retry states", () => {
  assert.equal(
    productionOnionReceiveFailureMessage({ last_failure_kind: "manual-permission" }),
    "Receive mode is paused until manual onion network permission is enabled again.",
  );
  assert.equal(
    productionOnionReceiveFailureMessage({ last_failure_kind: "persistent-client" }),
    "Receive mode needs the persistent Tor client to be started again.",
  );
  assert.equal(
    productionOnionReceiveFailureMessage({ last_failure_kind: "peer-offline" }),
    "No inbound peer stream is available yet; receive mode will keep retrying.",
  );
  assert.equal(
    productionOnionReceiveFailureMessage({ last_failure_kind: "receive-timeout" }),
    "Receive attempt timed out; receive mode will retry while enabled.",
  );
  assert.equal(
    productionOnionReceiveFailureMessage({ last_failure_kind: "feature-disabled" }),
    "This build does not include the manual onion client attempt feature.",
  );
  assert.equal(
    productionOnionReceiveFailureMessage({ last_failure_kind: "unexpected" }),
    "Receive mode hit a retryable backend boundary and will keep polling.",
  );
});

test("productionManualNextActions follows pairing and message readiness", () => {
  assert.deepEqual(productionManualNextActions(baseState), {
    profile: "Next: enter profile and passphrase.",
    pairing: "Next: enter profile and passphrase.",
    message: "Next: check both sessions, or complete active profile session state.",
  });
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasFinishImportInput: true }).pairing,
    "Next: click Import finish.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true }).pairing,
    "Next: click Unlock profile.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasPairingInput: true }).pairing,
    "Next: click Export pairing.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasLocalPairingPayload: true,
      counterpartProfile: null,
    }).pairing,
    "Next: click Store pairing.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasLocalPairingPayload: true,
      counterpartProfile: "bob",
    }).pairing,
    "Next: click Relay pairing to peer.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasRemotePairingSlot: true }).pairing,
    "Next: click Fill remote pairing.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasPairingInput: true,
      hasRemotePairingSlot: true,
      hasRemotePairingInput: true,
    }).pairing,
    "Next: click Export pairing.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasSessionDraftInput: true }).pairing,
    "Next: click Save draft.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasSessionDraftInput: true,
      hasSessionDraftSaved: true,
    }).pairing,
    "Next: click Export init.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasHandshakeInitPayload: true,
      counterpartProfile: "bob",
    }).pairing,
    "Next: click Relay init to peer.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasHandshakeInitPayload: true,
      counterpartProfile: null,
    }).pairing,
    "Next: click Store init.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasRemoteHandshakeInitSlot: true }).pairing,
    "Next: click Fill remote init.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasRemoteHandshakeInitSlot: true,
      hasHandshakeReplyInput: true,
    }).pairing,
    "Next: click Export reply.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasHandshakeReplyInput: true }).pairing,
    "Next: click Export reply.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasHandshakeReplyPayload: true,
      counterpartProfile: "bob",
    }).pairing,
    "Next: click Relay reply to peer.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasHandshakeReplyPayload: true,
      counterpartProfile: null,
    }).pairing,
    "Next: click Store reply.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasRemoteHandshakeReplySlot: true }).pairing,
    "Next: click Fill remote reply.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasRemoteHandshakeReplySlot: true,
      hasHandshakeFinishInput: true,
    }).pairing,
    "Next: click Export finish.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasHandshakeFinishInput: true }).pairing,
    "Next: click Export finish.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasHandshakeFinishPayload: true,
      counterpartProfile: "bob",
    }).pairing,
    "Next: click Relay finish to peer.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasHandshakeFinishPayload: true,
      counterpartProfile: null,
    }).pairing,
    "Next: click Store finish.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasRemoteHandshakeFinishSlot: true }).pairing,
    "Next: click Fill remote finish.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      hasProfileUnlockInput: true,
      hasRemoteHandshakeFinishSlot: true,
      hasFinishImportInput: true,
    }).pairing,
    "Next: click Import finish.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "alice",
      counterpartProfile: "bob",
      sessionReadyForMessages: true,
      hasOutboundMessageInput: true,
    }).message,
    "Next: export envelope from alice.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "alice",
      counterpartProfile: "bob",
      sessionReadyForMessages: true,
      hasLocalMessageEnvelope: true,
    }).message,
    "Next: click Relay to peer for bob.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "bob",
      counterpartProfile: "alice",
      sessionReadyForMessages: true,
      hasRemoteMessageEnvelopeSlot: true,
    }).message,
    "Next: click Fill remote for bob.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "bob",
      counterpartProfile: "alice",
      sessionReadyForMessages: true,
      hasInboundEnvelopeInput: true,
      hasImportedMessage: true,
      hasTwoProfileReplySelected: true,
    }).message,
    "Next: click Show plaintext for bob.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, activeProfile: "bob", hasReceivedMessage: true }).message,
    "Next: review received message for bob.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "bob",
      counterpartProfile: "alice",
      hasTwoProfileReplySelected: true,
    }).message,
    "Next: write reply from bob to alice.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "bob",
      counterpartProfile: "alice",
      hasTwoProfileReplyDraftInput: true,
      hasTwoProfileReplySelected: true,
    }).message,
    "Next: send stored-session reply from bob to alice.",
  );
});

test("productionManualCurrentStepView summarizes the active manual phase", () => {
  assert.equal(
    productionManualCurrentStepView(baseState),
    "Profile | Next: enter profile and passphrase.",
  );
  assert.equal(
    productionManualCurrentStepView({ ...baseState, busy: true }),
    "Running | wait for the active production action.",
  );
  assert.equal(
    productionManualCurrentStepView({
      ...baseState,
      hasProfileUnlockInput: true,
      hasRemoteHandshakeInitSlot: true,
      hasHandshakeReplyInput: true,
    }),
    "Pairing | Next: click Export reply.",
  );
  assert.equal(
    productionManualCurrentStepView({
      ...baseState,
      activeProfile: "alice",
      counterpartProfile: "bob",
      hasProfileUnlockInput: true,
      sessionReadyForMessages: true,
      hasLocalMessageEnvelope: true,
    }),
    "Message | Next: click Relay to peer for bob.",
  );
  assert.equal(
    productionManualCurrentStepView({
      ...baseState,
      activeProfile: "bob",
      counterpartProfile: "alice",
      hasProfileUnlockInput: true,
      hasImportedMessage: true,
      hasTwoProfileReplySelected: true,
    }),
    "Message | Next: click Show plaintext for bob.",
  );
  assert.equal(
    productionManualCurrentStepView({
      ...baseState,
      activeProfile: "bob",
      counterpartProfile: "alice",
      hasProfileUnlockInput: true,
      hasTwoProfileReplySelected: true,
    }),
    "Reply | Next: write reply from bob to alice.",
  );
});

test("productionManualCurrentFocusTarget resolves the next manual control", () => {
  assert.equal(productionManualCurrentFocusTarget(baseState), "profile-name");
  assert.equal(
    productionManualCurrentFocusTarget({ ...baseState, activeProfile: "alice" }),
    "profile-passphrase",
  );
  assert.equal(productionManualCurrentFocusTarget({ ...baseState, busy: true }), null);
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      hasSessionDraftInput: true,
    }),
    "save-draft",
  );
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      hasSessionDraftInput: true,
      hasSessionDraftSaved: true,
    }),
    "export-init",
  );
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      hasImportedMessage: true,
      hasTwoProfileReplySelected: true,
    }),
    "show-received",
  );
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      hasTwoProfileReplySelected: true,
    }),
    "two-profile-message",
  );
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      hasTwoProfileReplyDraftInput: true,
      hasTwoProfileReplySelected: true,
    }),
    "send-two-profile-message",
  );
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      hasRemoteHandshakeInitSlot: true,
      hasHandshakeReplyInput: true,
    }),
    "export-reply",
  );
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      hasHandshakeFinishPayload: true,
      counterpartProfile: "alice",
    }),
    "relay-handshake-finish",
  );
  assert.equal(
    productionManualCurrentFocusTarget({
      ...baseState,
      hasProfileUnlockInput: true,
      sessionReadyForMessages: true,
      hasRemoteMessageEnvelopeSlot: true,
    }),
    "load-message-envelope",
  );
});

test("productionManualPrimaryActions keeps received review ahead of reply compose", () => {
  assert.deepEqual(
    productionManualPrimaryActions({
      ...baseState,
      hasImportedMessage: true,
      hasReceivedMessage: false,
    }),
    {
      showReceived: true,
      selectReply: false,
      sendReply: false,
    },
  );
  assert.deepEqual(
    productionManualPrimaryActions({
      ...baseState,
      hasImportedMessage: true,
      hasReceivedMessage: false,
      hasTwoProfileReplySelected: true,
    }),
    {
      showReceived: true,
      selectReply: false,
      sendReply: false,
    },
  );
  assert.deepEqual(
    productionManualPrimaryActions({
      ...baseState,
      hasImportedMessage: true,
      hasReceivedMessage: false,
      hasTwoProfileReplySelected: true,
      hasTwoProfileReplyDraftInput: true,
    }),
    {
      showReceived: false,
      selectReply: false,
      sendReply: true,
    },
  );
  assert.deepEqual(
    productionManualPrimaryActions({
      ...baseState,
      busy: true,
      hasTwoProfileReplySelected: true,
      hasTwoProfileReplyDraftInput: true,
    }),
    {
      showReceived: false,
      selectReply: false,
      sendReply: false,
    },
  );
});

test("productionManualStatusView summarizes active manual relay slots", () => {
  assert.deepEqual(
    productionManualStatusView(
      { profile: "alice" },
      {
        pairing: { local: true, remote: false },
        handshakeInit: { local: false, remote: true },
        handshakeReply: { local: false, remote: false },
        handshakeFinish: { local: true, remote: true },
        messageEnvelope: { local: false, remote: true },
      },
    ),
    {
      route: "Active=alice Remote=bob",
      direction:
        "Fill local copies the active output field into the matching local input; " +
        "Fill remote copies the stored counterpart payload into the matching remote input.",
      payloads:
        "pairing: active_slot(alice)=stored counterpart_slot(bob)=empty | init: active_slot(alice)=empty counterpart_slot(bob)=ready | " +
        "reply: active_slot(alice)=empty counterpart_slot(bob)=empty | finish: active_slot(alice)=stored counterpart_slot(bob)=ready | envelope: active_slot(alice)=empty counterpart_slot(bob)=ready",
      mode:
        "Manual relay uses local memory slots only; manually select the counterpart profile to fill remote payloads.",
      policy:
        "manual_only=true auto_send=false auto_import=false " +
        "button_confirmed_profile_switch=true background_profile_switch=false network_io=false",
    },
  );

  assert.equal(
    productionManualStatusView({ profile: "carol" }, {}).mode,
    "Manual relay needs a supported active profile; manually select Alice or Bob before filling remote payloads.",
  );
  assert.equal(
    productionManualStatusView({ profile: "carol" }, {}).route,
    "Active=carol Remote=No counterpart; manually select Alice or Bob",
  );
});

test("productionManualRelayAvailability keeps manual copy store and load actions explicit", () => {
  assert.deepEqual(
    productionManualRelayAvailability({
      ...baseState,
      hasLocalPairingPayload: true,
      hasRemotePairingSlot: true,
      hasHandshakeInitPayload: true,
      hasRemoteHandshakeInitSlot: false,
      hasHandshakeReplyPayload: false,
      hasRemoteHandshakeReplySlot: true,
      hasHandshakeFinishPayload: true,
      hasRemoteHandshakeFinishSlot: true,
      hasLocalMessageEnvelope: false,
      hasRemoteMessageEnvelopeSlot: true,
      counterpartProfile: "bob",
    }),
    {
      usePairingPayload: true,
      storePairingPayload: true,
      loadPairingPayload: true,
      relayPairingPayload: true,
      useHandshakeInit: true,
      storeHandshakeInit: true,
      loadHandshakeInit: false,
      relayHandshakeInit: true,
      useHandshakeReply: false,
      storeHandshakeReply: false,
      loadHandshakeReply: true,
      relayHandshakeReply: false,
      useHandshakeFinish: true,
      storeHandshakeFinish: true,
      loadHandshakeFinish: true,
      relayHandshakeFinish: true,
      useMessageEnvelope: false,
      storeMessageEnvelope: false,
      loadMessageEnvelope: true,
      relayMessageEnvelope: false,
    },
  );

  assert.equal(
    productionManualRelayAvailability({
      ...baseState,
      hasLocalMessageEnvelope: true,
      counterpartProfile: "bob",
    }).relayMessageEnvelope,
    true,
  );

  assert.equal(
    productionManualRelayAvailability({
      ...baseState,
      hasLocalMessageEnvelope: true,
      counterpartProfile: null,
    }).relayMessageEnvelope,
    false,
  );

  assert.equal(
    Object.values(
      productionManualRelayAvailability({
        ...baseState,
        busy: true,
        hasLocalPairingPayload: true,
        hasRemotePairingSlot: true,
        hasHandshakeInitPayload: true,
        hasRemoteHandshakeInitSlot: true,
        hasHandshakeReplyPayload: true,
        hasRemoteHandshakeReplySlot: true,
        hasHandshakeFinishPayload: true,
        hasRemoteHandshakeFinishSlot: true,
        hasLocalMessageEnvelope: true,
        hasRemoteMessageEnvelopeSlot: true,
        counterpartProfile: "bob",
      }),
    ).every((enabled) => enabled === false),
    true,
  );
});

test("productionManualRelayCurrentActions prefer one relay action for the manual path", () => {
  const aliceToBobPairing = productionManualRelayAvailability({
    ...baseState,
    hasLocalPairingPayload: true,
    counterpartProfile: "bob",
  });
  assert.deepEqual(
    {
      store: productionManualRelayCurrentActions(aliceToBobPairing).storePairingPayload,
      relay: productionManualRelayCurrentActions(aliceToBobPairing).relayPairingPayload,
    },
    { store: false, relay: true },
  );

  const unsupportedPairing = productionManualRelayAvailability({
    ...baseState,
    hasLocalPairingPayload: true,
    counterpartProfile: null,
  });
  assert.deepEqual(
    {
      store: productionManualRelayCurrentActions(unsupportedPairing).storePairingPayload,
      relay: productionManualRelayCurrentActions(unsupportedPairing).relayPairingPayload,
    },
    { store: true, relay: false },
  );

  const bobReply = productionManualRelayAvailability({
    ...baseState,
    hasHandshakeReplyPayload: true,
    counterpartProfile: "alice",
  });
  assert.deepEqual(
    {
      store: productionManualRelayCurrentActions(bobReply).storeHandshakeReply,
      relay: productionManualRelayCurrentActions(bobReply).relayHandshakeReply,
    },
    { store: false, relay: true },
  );

  const pendingImport = productionManualRelayAvailability({
    ...baseState,
    hasRemoteMessageEnvelopeSlot: true,
  });
  const loadedPairing = productionManualRelayAvailability({
    ...baseState,
    hasRemotePairingSlot: true,
  });
  const loadedInit = productionManualRelayAvailability({
    ...baseState,
    hasRemoteHandshakeInitSlot: true,
  });
  const loadedReply = productionManualRelayAvailability({
    ...baseState,
    hasRemoteHandshakeReplySlot: true,
  });
  const loadedFinish = productionManualRelayAvailability({
    ...baseState,
    hasRemoteHandshakeFinishSlot: true,
  });
  assert.equal(
    productionManualRelayCurrentActions(loadedPairing, { hasRemotePairingInput: false }).loadPairingPayload,
    true,
  );
  assert.equal(
    productionManualRelayCurrentActions(loadedPairing, { hasRemotePairingInput: true }).loadPairingPayload,
    false,
  );
  assert.equal(
    productionManualRelayCurrentActions(loadedInit, { hasHandshakeReplyInput: false }).loadHandshakeInit,
    true,
  );
  assert.equal(
    productionManualRelayCurrentActions(loadedInit, { hasHandshakeReplyInput: true }).loadHandshakeInit,
    false,
  );
  assert.equal(
    productionManualRelayCurrentActions(loadedReply, { hasHandshakeFinishInput: false }).loadHandshakeReply,
    true,
  );
  assert.equal(
    productionManualRelayCurrentActions(loadedReply, { hasHandshakeFinishInput: true }).loadHandshakeReply,
    false,
  );
  assert.equal(
    productionManualRelayCurrentActions(loadedFinish, { hasFinishImportInput: false }).loadHandshakeFinish,
    true,
  );
  assert.equal(
    productionManualRelayCurrentActions(loadedFinish, { hasFinishImportInput: true }).loadHandshakeFinish,
    false,
  );
  assert.equal(
    productionManualRelayCurrentActions(pendingImport, {
      selectedNeedsPeerImport: true,
      hasInboundEnvelopeInput: false,
    }).loadMessageEnvelope,
    true,
  );
  assert.equal(
    productionManualRelayCurrentActions(pendingImport, {
      selectedNeedsPeerImport: true,
      hasInboundEnvelopeInput: true,
    }).loadMessageEnvelope,
    false,
  );
});

test("productionManualRelaySuccessWarning explains cleared output and retained slot", () => {
  assert.equal(
    productionManualRelaySuccessWarning("alice", "bob", "Pairing payload"),
    "Stored alice pairing payload slot, selected bob, and loaded pairing payload into the remote field. " +
      "The local output field was cleared; the stored relay slot remains available.",
  );
});

test("productionManualRelayDisabledReasons explain the missing payload or route", () => {
  assert.deepEqual(
    productionManualRelayDisabledReasons({ busy: true }),
    {
      usePairingPayload: "Wait for the active production action.",
      storePairingPayload: "Wait for the active production action.",
      loadPairingPayload: "Wait for the active production action.",
      relayPairingPayload: "Wait for the active production action.",
      useHandshakeInit: "Wait for the active production action.",
      storeHandshakeInit: "Wait for the active production action.",
      loadHandshakeInit: "Wait for the active production action.",
      relayHandshakeInit: "Wait for the active production action.",
      useHandshakeReply: "Wait for the active production action.",
      storeHandshakeReply: "Wait for the active production action.",
      loadHandshakeReply: "Wait for the active production action.",
      relayHandshakeReply: "Wait for the active production action.",
      useHandshakeFinish: "Wait for the active production action.",
      storeHandshakeFinish: "Wait for the active production action.",
      loadHandshakeFinish: "Wait for the active production action.",
      relayHandshakeFinish: "Wait for the active production action.",
      useMessageEnvelope: "Wait for the active production action.",
      storeMessageEnvelope: "Wait for the active production action.",
      loadMessageEnvelope: "Wait for the active production action.",
      relayMessageEnvelope: "Wait for the active production action.",
    },
  );
  assert.equal(
    productionManualRelayDisabledReasons({ counterpartProfile: "bob" }).loadPairingPayload,
    "Store bob pairing first.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({ counterpartProfile: "bob" }).loadMessageEnvelope,
    "Store bob envelope first.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({ counterpartProfile: "" }).loadHandshakeInit,
    "Select Alice or Bob before filling remote payloads.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({ counterpartProfile: "" }).relayMessageEnvelope,
    "Select Alice or Bob before relaying.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({ counterpartProfile: "" }).relayPairingPayload,
    "Select Alice or Bob before relaying.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({ counterpartProfile: "bob" }).relayHandshakeReply,
    "Export reply first.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({ counterpartProfile: "alice" }).relayMessageEnvelope,
    "Export envelope first.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({
      activeProfile: "bob",
      selectedManualExportProfile: "alice",
    }).storeMessageEnvelope,
    "Select alice in the manual profile panel before exporting this selected message envelope.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({
      activeProfile: "alice",
      selectedManualExportProfile: "alice",
    }).relayMessageEnvelope,
    "Export selected message envelope from alice first.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({
      activeProfile: "alice",
      selectedManualImportProfile: "bob",
    }).loadMessageEnvelope,
    "Select bob in the manual profile panel before loading this selected message envelope.",
  );
  assert.equal(
    productionManualRelayDisabledReasons({
      activeProfile: "bob",
      selectedManualImportProfile: "bob",
    }).loadMessageEnvelope,
    "Load or paste sender envelope for bob first.",
  );
});

test("productionManualMessageStatusView summarizes active message path", () => {
  assert.equal(
    productionManualMessageStatusView({
      activeProfile: "alice",
      counterpartProfile: "bob",
      messageNumber: 7,
      autoMessageNumber: true,
      sessionReadyForMessages: true,
      hasLocalMessageEnvelope: true,
      hasRemoteMessageEnvelopeSlot: false,
      hasInboundEnvelopeInput: false,
      hasReceivedMessage: false,
    }),
    "selected=none selected_input=matched active=alice remote=bob number=7 mode=auto session=ready local_envelope=present remote_slot=empty remote_envelope=empty received=empty reply=none",
  );
  assert.match(
    productionManualMessageStatusView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      selectedMessageLabel: "alice->bob#7",
      messageNumber: Number.NaN,
      selectedMessageInputMatches: false,
      sessionReadyForMessages: false,
      hasRemoteMessageEnvelopeSlot: true,
      hasInboundEnvelopeInput: true,
      hasReceivedMessage: true,
      hasTwoProfileReplySelected: true,
    }),
    /selected=alice->bob#7 selected_input=stale active=bob remote=alice number=invalid mode=manual session=not-ready .*remote_slot=ready remote_envelope=loaded received=present reply=selected/,
  );
  assert.match(
    productionManualMessageStatusView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      messageNumber: 7,
      hasTwoProfileReplyDraftInput: true,
    }),
    /reply=draft/,
  );
});

test("productionManualMessageCheckView separates manual verification guidance", () => {
  assert.equal(
    productionManualMessageCheckView({
      activeProfile: "alice",
      counterpartProfile: "bob",
      messageNumber: 7,
      sessionReadyForMessages: true,
      hasLocalMessageEnvelope: true,
      hasRemoteMessageEnvelopeSlot: false,
      hasInboundEnvelopeInput: false,
      hasReceivedMessage: false,
    }),
    "Manual check: store the local envelope before switching profile.",
  );
  assert.equal(
    productionManualMessageCheckView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      messageNumber: Number.NaN,
      sessionReadyForMessages: false,
      hasRemoteMessageEnvelopeSlot: true,
      hasInboundEnvelopeInput: true,
      hasReceivedMessage: true,
    }),
    "Manual check: enter the message number before export or import.",
  );
  assert.match(
    productionManualMessageCheckView({
      activeProfile: "alice",
      counterpartProfile: "bob",
      messageNumber: 1,
      selectedMessageInputMatches: false,
      sessionReadyForMessages: true,
    }),
    /selected message and manual number\/body differ/,
  );
  assert.match(
    productionManualMessageCheckView({
      activeProfile: "alice",
      counterpartProfile: "bob",
      messageNumber: 1,
      sessionReadyForMessages: true,
      hasRemoteMessageEnvelopeSlot: false,
      hasInboundEnvelopeInput: true,
    }),
    /pasted envelope is not from the stored remote slot/,
  );
  assert.match(
    productionManualMessageCheckView({
      activeProfile: "alice",
      counterpartProfile: "bob",
      messageNumber: 1,
      sessionReadyForMessages: true,
      hasRemoteMessageEnvelopeSlot: true,
      hasInboundEnvelopeInput: false,
    }),
    /load the remote envelope manually before import/,
  );
  assert.equal(
    productionManualMessageCheckView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      messageNumber: 7,
      hasInboundEnvelopeInput: true,
      hasTwoProfileReplySelected: true,
    }),
    "Manual check: reply target is selected; write the reply or show plaintext for local review.",
  );
  assert.equal(
    productionManualMessageCheckView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      messageNumber: 7,
      hasTwoProfileReplyDraftInput: true,
      hasTwoProfileReplySelected: true,
    }),
    "Manual check: reply draft is ready; send the stored-session reply.",
  );
});

test("productionTwoProfileResultView unlocks followups only for complete contained results", () => {
  const view = productionTwoProfileResultView(completeTwoProfileResult);

  assert.equal(view.canContinue, true);
  assert.match(view.profiles, /^Complete:/);
  assert.match(view.session, /^Complete:/);
  assert.match(view.message, /^Complete:/);
  assert.match(view.boundary, /^Contained:/);
  assert.equal(
    view.nextStep,
    "Next: reply direction is selected; write a stored-session reply.",
  );
});

test("productionTwoProfileResultView blocks followups when result flags need review", () => {
  const view = productionTwoProfileResultView({
    ...completeTwoProfileResult,
    received_export_matches_input: false,
    key_material_exposed: true,
  });

  assert.equal(view.canContinue, false);
  assert.match(view.message, /^Review:/);
  assert.match(view.boundary, /^Review:/);
  assert.match(view.boundary, /key_material=true/);
  assert.equal(view.nextStep, "Review result rows before continuing.");
});

test("productionTwoProfileMessageResultView formats stored-session message roundtrip", () => {
  const view = productionTwoProfileMessageResultView(completeTwoProfileMessageResult);

  assert.equal(view.canContinue, true);
  assert.match(view.profiles, /existing encrypted profile stores/);
  assert.match(view.profiles, /sender=alice receiver=bob/);
  assert.match(view.session, /^Complete:/);
  assert.match(view.message, /^Complete:/);
  assert.match(view.message, /number=3 reserved=true/);
  assert.match(view.boundary, /^Contained:/);
  assert.equal(
    view.nextStep,
    "Next: continue from the delivered message and write a stored-session reply.",
  );

  const blocked = productionTwoProfileMessageResultView({
    ...completeTwoProfileMessageResult,
    receiver_session_ready: false,
    network_io_attempted: true,
  });
  assert.equal(blocked.canContinue, false);
  assert.match(blocked.session, /^Review:/);
  assert.match(blocked.boundary, /^Review:/);
});

test("productionProfileUnlockView formats storage identity and boundary flags", () => {
  const view = productionProfileUnlockView(safeProfileUnlockResult);

  assert.equal(
    view.storage,
    "opened=true app_data=true initialized=true marker=true",
  );
  assert.equal(
    view.identity,
    "created=true present=true public_derivable=true",
  );
  assert.match(view.boundary, /path_returned=false/);
  assert.match(view.boundary, /key_material=false/);
  assert.match(view.boundary, /runtime=false/);
});

test("productionPairingPayloadView formats payload export and private key boundary flags", () => {
  const view = productionPairingPayloadView({
    ...safePairingPayloadResult,
    private_key_material_returned: true,
  });

  assert.match(view.storage, /identity_loaded=true/);
  assert.match(view.storage, /format=ADPAIR2/);
  assert.match(view.boundary, /private_key_returned=true/);
  assert.match(view.boundary, /key_material=false/);
});

test("productionSessionDraftView formats session draft storage and boundary flags", () => {
  const view = productionSessionDraftView({
    ...safeSessionDraftResult,
    payloads_returned: true,
  });

  assert.match(view.session, /draft=true/);
  assert.match(view.session, /channel=true/);
  assert.match(view.storage, /local_noise_match=true/);
  assert.match(view.boundary, /payloads_returned=true/);
  assert.match(view.boundary, /network_io=false/);
});

test("productionSessionStateView formats pairing and message readiness boundaries", () => {
  const view = productionSessionStateView(safeSessionStateResult);

  assert.match(view.session, /message=true/);
  assert.match(view.pairingBoundary, /path_returned=false/);
  assert.match(view.messageBoundary, /session_ready=true/);
  assert.match(view.messageBoundary, /outbound_io=false/);
});

test("productionTwoProfileSessionStatusView formats both profile readiness", () => {
  const view = productionTwoProfileSessionStatusView(safeTwoProfileSessionStatusResult);

  assert.equal(view.state, "Two-profile session needs work");
  assert.match(view.status, /alice: ready=true endpoint=true transport=true/);
  assert.match(view.status, /bob: ready=false endpoint=true transport=false/);
  assert.match(view.boundary, /network_io=false/);

  assert.equal(
    productionTwoProfileSessionStatusView({
      ...safeTwoProfileSessionStatusResult,
      profile_b_ready_for_message_envelope: true,
      profile_b_session_transport_state_present: true,
      both_ready_for_message_envelope: true,
    }).state,
    "Both profiles message-ready",
  );
});

test("productionTwoProfileSessionSummaryView maps stored session status to top-level rows", () => {
  const view = productionTwoProfileSessionSummaryView(safeTwoProfileSessionStatusResult);

  assert.equal(view.profiles, "Existing profile stores checked: alice -> bob");
  assert.match(view.session, /^Two-profile session needs work:/);
  assert.match(view.session, /bob: ready=false/);
  assert.match(view.boundary, /passphrase_retained=false/);
});

test("productionProfileMessageReadiness prefers matching two-profile status", () => {
  assert.equal(
    productionProfileMessageReadiness(
      "alice",
      { ready_for_message_envelope: false },
      safeTwoProfileSessionStatusResult,
    ),
    true,
  );
  assert.equal(
    productionProfileMessageReadiness(
      "bob",
      { ready_for_message_envelope: true },
      safeTwoProfileSessionStatusResult,
    ),
    false,
  );
  assert.equal(
    productionProfileMessageReadiness(
      "carol",
      { ready_for_message_envelope: true },
      safeTwoProfileSessionStatusResult,
    ),
    true,
  );
});

test("productionTwoProfileConversationActionView maps row status to next action", () => {
  assert.deepEqual(
    productionTwoProfileConversationActionView(null),
    {
      nextAction: "Next actions unlock after a completed local roundtrip.",
      rowLabel: "action: unavailable",
      state: "is-waiting",
      focusTarget: null,
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    },
  );

  const entry = {
    sender: "alice",
    receiver: "bob",
    messageNumber: 9,
    statuses: new Set(),
  };

  assert.deepEqual(
    productionTwoProfileConversationActionView(entry),
    {
      nextAction: "Next: export sender envelope for message #9 from alice.",
      rowLabel: "action: export sender copy from alice",
      state: "is-ready",
      focusTarget: "export-envelope",
      manualTarget: "outbound",
      manualButtonLabel: "Open export tools",
    },
  );

  entry.statuses.add("sent");
  assert.deepEqual(
    productionTwoProfileConversationActionView(entry),
    {
      nextAction: "Next: load or paste alice's envelope for message #9 into bob.",
      rowLabel: "action: load envelope for bob",
      state: "is-waiting",
      focusTarget: "remote-envelope",
      manualTarget: "inbound",
      manualButtonLabel: "Open envelope input",
    },
  );

  assert.deepEqual(
    productionTwoProfileConversationActionView(entry, true),
    {
      nextAction: "Next: import envelope for message #9 into bob.",
      rowLabel: "action: import envelope into bob",
      state: "is-ready",
      focusTarget: "import-envelope",
      manualTarget: "inbound",
      manualButtonLabel: "Open import tools",
    },
  );

  const inboundOnly = {
    sender: "alice",
    receiver: "bob",
    messageNumber: 10,
    statuses: new Set(["received"]),
  };
  assert.deepEqual(
    productionTwoProfileConversationActionView(inboundOnly),
    {
      nextAction: "Received: message #10 is ready. Next: write reply from bob to alice.",
      rowLabel: "action: reply from bob",
      state: "is-reply",
      focusTarget: "reply-message",
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    },
  );

  entry.statuses.add("received");
  assert.deepEqual(
    productionTwoProfileConversationActionView(entry, true),
    {
      nextAction: "Complete: message #9 delivered. Next: write reply from bob to alice.",
      rowLabel: "action: reply from bob",
      state: "is-reply",
      focusTarget: "reply-message",
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    },
  );
});

test("productionTwoProfileConversationCompare prefers persisted time when available", () => {
  const olderHighNumber = {
    sender: "alice",
    receiver: "bob",
    messageNumber: 9,
    createdAtMs: 1000,
  };
  const newerLowNumber = {
    sender: "bob",
    receiver: "alice",
    messageNumber: 8,
    createdAtMs: 2000,
  };
  assert.equal(
    [olderHighNumber, newerLowNumber].sort(productionTwoProfileConversationCompare)[0],
    olderHighNumber,
  );
  assert.equal(
    [olderHighNumber, newerLowNumber].sort((left, right) =>
      productionTwoProfileConversationCompare(left, right, "desc"),
    )[0],
    newerLowNumber,
  );
});

test("productionTwoProfileConversationCompare falls back to message number without time", () => {
  const first = { sender: "alice", receiver: "bob", messageNumber: 1 };
  const second = { sender: "bob", receiver: "alice", messageNumber: 2 };

  assert.equal([second, first].sort(productionTwoProfileConversationCompare)[0], first);
  assert.equal(
    [first, second].sort((left, right) =>
      productionTwoProfileConversationCompare(left, right, "desc"),
    )[0],
    second,
  );
});

test("productionTwoProfileReplySelectionView keeps selected delivered rows replyable", () => {
  assert.deepEqual(
    productionTwoProfileReplySelectionView({
      latestConversationDelivered: false,
      selectedConversationDelivered: false,
      selectedDeliveredReplyReady: false,
    }),
    {
      canSelect: false,
      label: "Reply to latest",
      disabledReason: "Load a delivered conversation first.",
    },
  );

  assert.deepEqual(
    productionTwoProfileReplySelectionView({
      latestConversationDelivered: false,
      selectedConversationDelivered: true,
      selectedDeliveredReplyReady: false,
    }),
    {
      canSelect: true,
      label: "Use selected reply",
      disabledReason: "",
    },
  );

  assert.deepEqual(
    productionTwoProfileReplySelectionView({
      latestConversationDelivered: true,
      selectedConversationDelivered: true,
      selectedDeliveredReplyReady: true,
      hasTwoProfileReplyDraftInput: false,
    }),
    {
      canSelect: false,
      label: "Reply target set",
      disabledReason: "Reply target is already selected; write the reply.",
    },
  );

  assert.deepEqual(
    productionTwoProfileReplySelectionView({
      latestConversationDelivered: true,
      selectedConversationDelivered: true,
      selectedDeliveredReplyReady: true,
      hasTwoProfileReplyDraftInput: true,
    }),
    {
      canSelect: false,
      label: "Reply target set",
      disabledReason: "Reply draft is active; send it or select another delivered row.",
    },
  );

  assert.deepEqual(
    productionTwoProfileReplySelectionView({
      latestConversationDelivered: true,
      selectedConversationDelivered: false,
      selectedDeliveredReplyReady: false,
    }),
    {
      canSelect: true,
      label: "Reply to latest",
      disabledReason: "",
    },
  );
});

test("productionHandshakePayloadView formats shared handshake export results", () => {
  const view = productionHandshakePayloadView(safeHandshakePayloadResult);

  assert.match(view.state, /input_decodable=true/);
  assert.match(view.state, /transport=true/);
  assert.match(view.boundary, /key_material=false/);
});

test("productionHandshakeFinishImportView formats finish import result", () => {
  const view = productionHandshakeFinishImportView({
    ...safeHandshakeFinishImportResult,
    payloads_returned: true,
  });

  assert.match(view.state, /remote_static=true/);
  assert.match(view.boundary, /payloads_returned=true/);
  assert.match(view.boundary, /runtime=false/);
});

test("productionMessageEnvelopeExportView formats outbound message result", () => {
  const view = productionMessageEnvelopeExportView(safeMessageEnvelopeExportResult);

  assert.match(view.outbound, /reserved=true/);
  assert.match(view.outbound, /number=7/);
  assert.match(view.outbound, /auto=true/);
  assert.match(view.outbound, /expired_purged=1/);
  assert.match(view.outbound, /encrypted=true/);
  assert.match(view.boundary, /network_send=false/);
});

test("productionMessageEnvelopeImportView formats inbound message result", () => {
  const view = productionMessageEnvelopeImportView(safeMessageEnvelopeImportResult);

  assert.match(view.inbound, /replay=true/);
  assert.match(view.inbound, /stored=true/);
  assert.match(view.inbound, /expired_purged=true/);
  assert.match(view.boundary, /network_receive=false/);
});

test("productionReceivedMessageExportView formats received export result", () => {
  const view = productionReceivedMessageExportView(safeReceivedMessageExportResult);

  assert.match(view.inbound, /present=true/);
  assert.match(view.inbound, /expired_purged=false/);
  assert.match(view.inbound, /ttl=604800/);
  assert.match(view.inbound, /expired=false/);
  assert.match(view.inbound, /displayed=true/);
  assert.match(view.boundary, /plaintext_after_unlock=true/);
  assert.match(view.boundary, /key_material=false/);
});

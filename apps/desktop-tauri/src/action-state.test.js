import assert from "node:assert/strict";
import test from "node:test";
import {
  productionActionAvailability,
  productionCounterpartProfile,
  productionHandshakeFinishImportView,
  productionHandshakePayloadView,
  productionManualMessageCheckView,
  productionManualNextActions,
  productionManualRelayAvailability,
  productionManualMessageStatusView,
  productionManualStatusView,
  productionMessageEnvelopeExportView,
  productionMessageEnvelopeImportView,
  productionPairingPayloadView,
  productionProfileMessageReadiness,
  productionProfilePreset,
  productionProfileUnlockView,
  productionReceivedMessageExportView,
  productionSessionDraftView,
  productionSessionStateView,
  productionTwoProfileResultView,
  productionTwoProfileReadiness,
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
      usePairingPayload: true,
      useHandshakeInit: false,
      useHandshakeReply: false,
      useHandshakeFinish: false,
      useMessageEnvelope: false,
    },
  );
});

test("productionManualNextActions follows pairing and message readiness", () => {
  assert.deepEqual(productionManualNextActions(baseState), {
    profile: "Next: enter profile and passphrase.",
    pairing: "Next: unlock profile, then export pairing.",
    message: "Next: check both sessions, or complete active profile session state.",
  });
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasFinishImportInput: true }).pairing,
    "Next: import finish, then check session.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "alice",
      counterpartProfile: "bob",
      sessionReadyForMessages: true,
      hasOutboundMessageInput: true,
    }).message,
    "Next: export envelope from alice, store it, then manually select bob.",
  );
  assert.equal(
    productionManualNextActions({
      ...baseState,
      activeProfile: "bob",
      counterpartProfile: "alice",
      sessionReadyForMessages: true,
      hasRemoteMessageEnvelopeSlot: true,
    }).message,
    "Next: load alice envelope, then import for bob.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, activeProfile: "bob", hasReceivedMessage: true }).message,
    "Next: review received message for bob.",
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
        "manual_only=true auto_send=false auto_import=false auto_profile_switch=false network_io=false",
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
    }),
    {
      usePairingPayload: true,
      storePairingPayload: true,
      loadPairingPayload: true,
      useHandshakeInit: true,
      storeHandshakeInit: true,
      loadHandshakeInit: false,
      useHandshakeReply: false,
      storeHandshakeReply: false,
      loadHandshakeReply: true,
      useHandshakeFinish: true,
      storeHandshakeFinish: true,
      loadHandshakeFinish: true,
      useMessageEnvelope: false,
      storeMessageEnvelope: false,
      loadMessageEnvelope: true,
    },
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
      }),
    ).every((enabled) => enabled === false),
    true,
  );
});

test("productionManualMessageStatusView summarizes active message path", () => {
  assert.equal(
    productionManualMessageStatusView({
      activeProfile: "alice",
      counterpartProfile: "bob",
      messageNumber: 7,
      sessionReadyForMessages: true,
      hasLocalMessageEnvelope: true,
      hasRemoteMessageEnvelopeSlot: false,
      hasInboundEnvelopeInput: false,
      hasReceivedMessage: false,
    }),
    "active=alice remote=bob number=7 session=ready local_envelope=present remote_slot=empty remote_envelope=empty received=empty",
  );
  assert.match(
    productionManualMessageStatusView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      messageNumber: Number.NaN,
      sessionReadyForMessages: false,
      hasRemoteMessageEnvelopeSlot: true,
      hasInboundEnvelopeInput: true,
      hasReceivedMessage: true,
    }),
    /active=bob remote=alice number=invalid session=not-ready .*remote_slot=ready remote_envelope=loaded received=present/,
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
    "Next: inspect manual payload tools, run local diagnostic, or edit the message and run again.",
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
  assert.match(view.status, /alice: ready=true transport=true/);
  assert.match(view.status, /bob: ready=false transport=false/);
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
  assert.match(view.outbound, /encrypted=true/);
  assert.match(view.boundary, /network_send=false/);
});

test("productionMessageEnvelopeImportView formats inbound message result", () => {
  const view = productionMessageEnvelopeImportView(safeMessageEnvelopeImportResult);

  assert.match(view.inbound, /replay=true/);
  assert.match(view.inbound, /stored=true/);
  assert.match(view.boundary, /network_receive=false/);
});

test("productionReceivedMessageExportView formats received export result", () => {
  const view = productionReceivedMessageExportView(safeReceivedMessageExportResult);

  assert.match(view.inbound, /present=true/);
  assert.match(view.inbound, /displayed=true/);
  assert.match(view.boundary, /plaintext_after_unlock=true/);
  assert.match(view.boundary, /key_material=false/);
});

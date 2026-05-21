import assert from "node:assert/strict";
import test from "node:test";
import {
  productionActionAvailability,
  productionManualNextActions,
  productionPairingPayloadView,
  productionProfileUnlockView,
  productionSessionDraftView,
  productionTwoProfileResultView,
  productionTwoProfileReadiness,
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
    message: "Next: complete session state, then export envelope.",
  });
  assert.equal(
    productionManualNextActions({ ...baseState, hasProfileUnlockInput: true, hasFinishImportInput: true }).pairing,
    "Next: import finish, then check session.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, sessionReadyForMessages: true, hasOutboundMessageInput: true })
      .message,
    "Next: export envelope.",
  );
  assert.equal(
    productionManualNextActions({ ...baseState, hasReceivedMessage: true }).message,
    "Next: review received message.",
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

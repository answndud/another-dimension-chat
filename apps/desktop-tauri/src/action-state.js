export function productionTwoProfileReadiness(input, busy) {
  if (busy) {
    return "Running: production action in progress";
  }
  if (!input.profileA) {
    return "Blocked: Profile A required";
  }
  if (!input.profileB) {
    return "Blocked: Profile B required";
  }
  if (input.profileA === input.profileB) {
    return "Blocked: profiles must be distinct";
  }
  if (!input.passphrase) {
    return "Blocked: passphrase required";
  }
  if (!input.message) {
    return "Blocked: message required";
  }
  return "Ready: local encrypted roundtrip can run";
}

export function productionManualNextActions(state) {
  const {
    busy,
    hasProfileUnlockInput,
    hasPairingInput,
    hasSessionDraftInput,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    sessionReadyForMessages,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasReceivedMessage,
  } = state;

  if (busy) {
    return {
      profile: "Next: wait for the active production action.",
      pairing: "Next: wait for the active production action.",
      message: "Next: wait for the active production action.",
    };
  }

  const profile = hasProfileUnlockInput
    ? "Next: unlock profile."
    : "Next: enter profile and passphrase.";

  let pairing = "Next: unlock profile, then export pairing.";
  if (hasPairingInput) {
    pairing = "Next: export pairing.";
  }
  if (hasSessionDraftInput) {
    pairing = "Next: save draft.";
  }
  if (hasHandshakeReplyInput) {
    pairing = "Next: export reply.";
  }
  if (hasHandshakeFinishInput) {
    pairing = "Next: export finish.";
  }
  if (hasFinishImportInput) {
    pairing = "Next: import finish, then check session.";
  }

  let message = sessionReadyForMessages
    ? "Next: enter message and export envelope."
    : "Next: complete session state, then export envelope.";
  if (hasOutboundMessageInput) {
    message = "Next: export envelope.";
  }
  if (hasInboundEnvelopeInput) {
    message = "Next: import envelope.";
  }
  if (hasReceivedMessage) {
    message = "Next: review received message.";
  }

  return { profile, pairing, message };
}

export function productionActionAvailability(state) {
  const {
    busy,
    hasProfileUnlockInput,
    hasPairingInput,
    hasSessionDraftInput,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasHandshakeInitPayload,
    hasHandshakeReplyPayload,
    hasHandshakeFinishPayload,
    hasLocalMessageEnvelope,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasReceivedExportInput,
    hasTwoProfileInput,
  } = state;

  return {
    unlockProfile: !busy && hasProfileUnlockInput,
    exportPairing: !busy && hasPairingInput,
    saveSessionDraft: !busy && hasSessionDraftInput,
    checkSessionState: !busy && hasProfileUnlockInput,
    exportHandshakeInit: !busy && hasProfileUnlockInput,
    exportHandshakeReply: !busy && hasHandshakeReplyInput,
    exportHandshakeFinish: !busy && hasHandshakeFinishInput,
    importHandshakeFinish: !busy && hasFinishImportInput,
    exportMessageEnvelope: !busy && hasOutboundMessageInput,
    importMessageEnvelope: !busy && hasInboundEnvelopeInput,
    exportReceivedMessage: !busy && hasReceivedExportInput,
    runTwoProfileRoundtrip: !busy && hasTwoProfileInput,
    usePairingPayload: !busy && hasLocalPairingPayload,
    useHandshakeInit: !busy && hasHandshakeInitPayload,
    useHandshakeReply: !busy && hasHandshakeReplyPayload,
    useHandshakeFinish: !busy && hasHandshakeFinishPayload,
    useMessageEnvelope: !busy && hasLocalMessageEnvelope,
  };
}

export function productionTwoProfileResultView(result) {
  const profilesReady =
    result.profile_a_unlocked &&
    result.profile_b_unlocked &&
    result.pairing_payloads_exported;
  const sessionReady =
    result.session_drafts_saved &&
    result.handshake_completed &&
    result.sender_session_ready &&
    result.receiver_session_ready;
  const messageReady =
    result.message_number_reserved &&
    result.encrypted_envelope_exported &&
    result.inbound_message_stored &&
    result.received_status_verified &&
    result.received_export_matches_input;
  const boundaryContained =
    !result.plaintext_returned_to_frontend &&
    !result.store_path_returned &&
    !result.passphrase_retained &&
    !result.key_material_exposed &&
    !result.network_io_attempted &&
    !result.transport_io_opened &&
    !result.runtime_messaging_enabled;
  const canContinue = profilesReady && sessionReady && messageReady && boundaryContained;

  return {
    canContinue,
    profiles:
      `${profilesReady ? "Complete" : "Review"}: profiles unlocked and pairing payloads exported | ` +
      `a=${result.profile_a_unlocked} b=${result.profile_b_unlocked} payloads=${result.pairing_payloads_exported}`,
    session:
      `${sessionReady ? "Complete" : "Review"}: drafts saved, handshake complete, sender and receiver ready | ` +
      `drafts=${result.session_drafts_saved} handshake=${result.handshake_completed} sender=${result.sender_session_ready} receiver=${result.receiver_session_ready}`,
    message:
      `${messageReady ? "Complete" : "Review"}: encrypted envelope stored and received message verified | ` +
      `reserved=${result.message_number_reserved} envelope=${result.encrypted_envelope_exported} inbound=${result.inbound_message_stored} status=${result.received_status_verified} match=${result.received_export_matches_input}`,
    boundary:
      `${boundaryContained ? "Contained" : "Review"}: no plaintext, key material, store path, network I/O, transport I/O, or runtime messaging exposure | ` +
      `plaintext_returned=${result.plaintext_returned_to_frontend} path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    nextStep: canContinue
      ? "Next: inspect manual payload tools, run local diagnostic, or edit the message and run again."
      : "Review result rows before continuing.",
  };
}

export function productionProfileUnlockView(result) {
  return {
    storage:
      `opened=${result.storage_opened} app_data=${result.app_data_profile_store} ` +
      `initialized=${result.profile_initialized} marker=${result.profile_marker_present}`,
    identity:
      `created=${result.identity_created} present=${result.identity_private_key_present} ` +
      `public_derivable=${result.identity_public_key_derivable}`,
    boundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionPairingPayloadView(result) {
  return {
    storage:
      `opened=${result.storage_opened} identity_loaded=${result.identity_private_key_loaded} ` +
      `noise_static_written=${result.noise_static_private_key_written} ` +
      `exported=${result.pairing_payload_exported} format=${result.payload_format}`,
    boundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `private_key_returned=${result.private_key_material_returned} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionSessionDraftView(result) {
  return {
    session:
      `plan=${result.session_plan_created} draft=${result.session_draft_written} ` +
      `present=${result.session_draft_present} endpoint=${result.remote_endpoint_state_present} ` +
      `replay=${result.replay_window_present} channel=${result.channel_id_derivable}`,
    storage:
      `opened=${result.storage_opened} local_noise_loaded=${result.local_noise_static_private_key_loaded} ` +
      `local_noise_match=${result.local_noise_static_matches_payload} remote_contact=${result.remote_contact_present}`,
    boundary:
      `payloads_returned=${result.payloads_returned} path_returned=${result.store_path_returned} ` +
      `passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} ` +
      `network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

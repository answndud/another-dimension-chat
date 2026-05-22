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

export function productionProfilePreset(peer) {
  const normalizedPeer = String(peer ?? "").trim().toLowerCase();
  if (normalizedPeer === "alice") {
    return { profile: "alice", rendezvousEndpoint: "alice.onion" };
  }
  if (normalizedPeer === "bob") {
    return { profile: "bob", rendezvousEndpoint: "bob.onion" };
  }
  return null;
}

export function productionCounterpartProfile(profile) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  if (normalizedProfile === "alice") {
    return "bob";
  }
  if (normalizedProfile === "bob") {
    return "alice";
  }
  return null;
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
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
    hasReceivedMessage,
    activeProfile,
    counterpartProfile,
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

  const active = activeProfile ? String(activeProfile).trim().toLowerCase() : "";
  const counterpart = counterpartProfile ? String(counterpartProfile).trim().toLowerCase() : "";
  const activeLabel = active || "active profile";
  const counterpartLabel = counterpart || "counterpart";

  let message = sessionReadyForMessages
    ? `Next: enter message for ${activeLabel} and export envelope.`
    : `Next: check both sessions, or complete ${activeLabel} session state.`;
  if (hasOutboundMessageInput) {
    message = `Next: export envelope from ${activeLabel}, then store it and switch to ${counterpartLabel}.`;
  }
  if (hasLocalMessageEnvelope) {
    message = `Next: store ${activeLabel} envelope, switch to ${counterpartLabel}, then load envelope.`;
  }
  if (hasRemoteMessageEnvelopeSlot) {
    message = `Next: load ${counterpartLabel} envelope, then import for ${activeLabel}.`;
  }
  if (hasInboundEnvelopeInput) {
    message = `Next: import envelope for ${activeLabel}.`;
  }
  if (hasReceivedMessage) {
    message = `Next: review received message for ${activeLabel}.`;
  }

  return { profile, pairing, message };
}

export function productionManualStatusView(input, slots) {
  const profile = String(input?.profile ?? "").trim() || "No profile";
  const counterpart = productionCounterpartProfile(profile);
  const remoteProfile = counterpart ?? "Manual counterpart unavailable";
  const formatSlot = (kind, label) => {
    const localReady = Boolean(slots?.[kind]?.local);
    const remoteReady = Boolean(slots?.[kind]?.remote);
    return `${label}: local=${localReady ? "stored" : "empty"} remote=${remoteReady ? "ready" : "empty"}`;
  };

  return {
    route: `Active=${profile} Remote=${remoteProfile}`,
    payloads: [
      formatSlot("pairing", "pairing"),
      formatSlot("handshakeInit", "init"),
      formatSlot("handshakeReply", "reply"),
      formatSlot("handshakeFinish", "finish"),
      formatSlot("messageEnvelope", "envelope"),
    ].join(" | "),
    policy: "manual_only=true auto_send=false auto_import=false auto_profile_switch=false network_io=false",
    mode: counterpart
      ? "Manual relay uses local memory slots only; switch profile to load remote payloads."
      : "Use Alice or Bob preset for explicit remote slot lookup.",
  };
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

export function productionSessionStateView(result) {
  return {
    session:
      `draft=${result.session_draft_present} channel=${result.channel_id_derivable} ` +
      `role=${result.local_role_available} endpoint=${result.remote_endpoint_state_present} ` +
      `replay=${result.replay_window_present} transport=${result.session_transport_state_present} ` +
      `runtime=${result.runtime_material_reconstructable} message=${result.ready_for_message_envelope}`,
    pairingBoundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    messageBoundary:
      `session_ready=${result.ready_for_message_envelope} outbound_io=${result.outbound_envelope_io_ready} ` +
      `network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionTwoProfileSessionStatusView(result) {
  const bothReady = result.both_ready_for_message_envelope;
  return {
    state: bothReady ? "Both profiles message-ready" : "Two-profile session needs work",
    status:
      `${result.profile_a}: ready=${result.profile_a_ready_for_message_envelope} ` +
      `transport=${result.profile_a_session_transport_state_present} ` +
      `runtime=${result.profile_a_runtime_material_reconstructable} ` +
      `outbound=${result.profile_a_outbound_envelope_io_ready} | ` +
      `${result.profile_b}: ready=${result.profile_b_ready_for_message_envelope} ` +
      `transport=${result.profile_b_session_transport_state_present} ` +
      `runtime=${result.profile_b_runtime_material_reconstructable} ` +
      `outbound=${result.profile_b_outbound_envelope_io_ready}`,
    boundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionProfileMessageReadiness(profile, singleProfileState, twoProfileStatus) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  if (!normalizedProfile) {
    return false;
  }
  if (twoProfileStatus?.profile_a === normalizedProfile) {
    return twoProfileStatus.profile_a_ready_for_message_envelope === true;
  }
  if (twoProfileStatus?.profile_b === normalizedProfile) {
    return twoProfileStatus.profile_b_ready_for_message_envelope === true;
  }
  return singleProfileState?.ready_for_message_envelope === true;
}

export function productionManualMessageStatusView(state) {
  const active = state?.activeProfile || "active profile";
  const counterpart = state?.counterpartProfile || "counterpart";
  const messageNumber = Number.isInteger(state?.messageNumber) ? state.messageNumber : "invalid";
  const session = state?.sessionReadyForMessages ? "ready" : "not-ready";
  const localEnvelope = state?.hasLocalMessageEnvelope ? "present" : "empty";
  const remoteSlot = state?.hasRemoteMessageEnvelopeSlot ? "ready" : "empty";
  const remoteEnvelope = state?.hasInboundEnvelopeInput ? "loaded" : "empty";
  const received = state?.hasReceivedMessage ? "present" : "empty";
  return (
    `active=${active} remote=${counterpart} number=${messageNumber} session=${session} ` +
    `local_envelope=${localEnvelope} remote_slot=${remoteSlot} remote_envelope=${remoteEnvelope} received=${received}`
  );
}

export function productionHandshakePayloadView(result) {
  return {
    state:
      `role=${result.role_allowed} input_read=${result.input_payload_read} ` +
      `input_decodable=${result.input_payload_decodable} output=${result.output_payload_created} ` +
      `state=${result.state_written} transport=${result.transport_state_persisted}`,
    boundary:
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionHandshakeFinishImportView(result) {
  return {
    state:
      `role=${result.role_allowed} finish_read=${result.finish_payload_read} ` +
      `decodable=${result.finish_payload_decodable} remote_static=${result.remote_static_verified} ` +
      `transport=${result.transport_state_persisted}`,
    boundary:
      `payloads_returned=${result.payloads_returned} key_material=${result.key_material_exposed} ` +
      `network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionMessageEnvelopeExportView(result) {
  return {
    outbound:
      `reserved=${result.message_number_reserved} pending=${result.pending_message_record_written} ` +
      `indexed=${result.local_message_index_written} transport=${result.session_transport_ready} ` +
      `encrypted=${result.encrypted_envelope_written} export=${result.encrypted_envelope_present}`,
    boundary:
      `plaintext_returned=${result.plaintext_returned} key_material=${result.key_material_exposed} ` +
      `network_send=${result.network_send_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionMessageEnvelopeImportView(result) {
  return {
    inbound:
      `read=${result.envelope_read} decodable=${result.envelope_decodable} ` +
      `transport=${result.session_transport_ready} replay=${result.replay_accepted} ` +
      `decrypted=${result.plaintext_decrypted} stored=${result.received_message_written} ` +
      `status=${result.received_message_matches_session}`,
    boundary:
      `plaintext_returned=${result.plaintext_returned} key_material=${result.key_material_exposed} ` +
      `network_receive=${result.network_receive_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionReceivedMessageExportView(result) {
  return {
    inbound:
      `present=${result.received_message_record_present} ` +
      `decodable=${result.received_message_record_decodable} ` +
      `session=${result.received_message_matches_session} ` +
      `displayed=${result.plaintext_returned_after_unlock}`,
    boundary:
      `plaintext_after_unlock=${result.plaintext_returned_after_unlock} ` +
      `key_material=${result.key_material_exposed} network_receive=${result.network_receive_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

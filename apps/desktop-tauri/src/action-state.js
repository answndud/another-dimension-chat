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

export function productionMessageTtlInputValue(value, allowedTtlSeconds, fallbackTtlSeconds) {
  const allowed = Array.isArray(allowedTtlSeconds)
    ? allowedTtlSeconds.filter((ttlSeconds) => Number.isFinite(ttlSeconds) && ttlSeconds > 0)
    : [];
  if (allowed.length === 0) {
    return null;
  }
  const fallback = Number.parseInt(fallbackTtlSeconds, 10);
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return Number.isFinite(fallback) && allowed.includes(fallback) ? fallback : null;
  }
  const selected = Number.parseInt(rawValue, 10);
  if (Number.isFinite(selected) && allowed.includes(selected)) {
    return selected;
  }
  return null;
}

export function productionTwoProfileConversationActionView(entry, senderEnvelopeSlotPresent = false) {
  if (!entry) {
    return {
      nextAction: "Next actions unlock after a completed local roundtrip.",
      rowLabel: "action: unavailable",
      state: "is-waiting",
      focusTarget: null,
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    };
  }
  const sentCopyPresent = entry.statuses?.has("sent") ?? false;
  const receivedCopyPresent = entry.statuses?.has("received") ?? false;
  if (sentCopyPresent && receivedCopyPresent) {
    return {
      nextAction: `Complete: message #${entry.messageNumber} delivered. Next: write reply from ${entry.receiver} to ${entry.sender}.`,
      rowLabel: `action: reply from ${entry.receiver}`,
      state: "is-reply",
      focusTarget: "reply-message",
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    };
  }
  if (sentCopyPresent && senderEnvelopeSlotPresent) {
    return {
      nextAction: `Next: import envelope for message #${entry.messageNumber} into ${entry.receiver}.`,
      rowLabel: `action: import envelope into ${entry.receiver}`,
      state: "is-ready",
      focusTarget: "import-envelope",
      manualTarget: "inbound",
      manualButtonLabel: "Open import tools",
    };
  }
  if (sentCopyPresent) {
    return {
      nextAction: `Next: load or paste sender envelope for message #${entry.messageNumber}.`,
      rowLabel: `action: load envelope for ${entry.receiver}`,
      state: "is-waiting",
      focusTarget: "remote-envelope",
      manualTarget: "inbound",
      manualButtonLabel: "Open envelope input",
    };
  }
  return {
    nextAction: `Next: review missing local sent copy for message #${entry.messageNumber}.`,
    rowLabel: `action: export sender copy from ${entry.sender}`,
    state: "is-ready",
    focusTarget: "export-envelope",
    manualTarget: "outbound",
    manualButtonLabel: "Open export tools",
  };
}

export function productionTwoProfileReplySelectionView(state) {
  const selectedDelivered = Boolean(state?.selectedConversationDelivered);
  const latestDelivered = Boolean(state?.latestConversationDelivered);
  const selectedReplyReady = Boolean(state?.selectedDeliveredReplyReady);
  const canSelect = selectedDelivered || latestDelivered;
  return {
    canSelect,
    label: selectedDelivered || selectedReplyReady ? "Reply selected" : "Reply to latest",
    disabledReason: canSelect ? "" : "Load a delivered conversation first.",
  };
}

export function productionManualNextActions(state) {
  const {
    busy,
    hasProfileUnlockInput,
    hasPairingInput,
    hasSessionDraftInput,
    hasSessionDraftSaved,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasRemotePairingSlot,
    hasRemotePairingInput,
    hasHandshakeInitPayload,
    hasRemoteHandshakeInitSlot,
    hasHandshakeReplyPayload,
    hasRemoteHandshakeReplySlot,
    hasHandshakeFinishPayload,
    hasRemoteHandshakeFinishSlot,
    sessionReadyForMessages,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
    hasImportedMessage,
    hasReceivedMessage,
    hasTwoProfileReplyDraftInput,
    hasTwoProfileReplySelected,
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

  let pairing = hasProfileUnlockInput ? "Next: click Unlock profile." : "Next: enter profile and passphrase.";
  if (hasPairingInput) {
    pairing = "Next: click Export pairing.";
  }
  if (hasLocalPairingPayload) {
    pairing = counterpartProfile ? "Next: click Relay pairing to peer." : "Next: click Store pairing.";
  }
  if (hasRemotePairingSlot && !hasRemotePairingInput) {
    pairing = "Next: click Fill remote pairing.";
  }
  if (hasSessionDraftInput && !hasSessionDraftSaved) {
    pairing = "Next: click Save draft.";
  }
  if (hasSessionDraftSaved) {
    pairing = "Next: click Export init.";
  }
  if (hasHandshakeInitPayload) {
    pairing = counterpartProfile ? "Next: click Relay init to peer." : "Next: click Store init.";
  }
  if (hasRemoteHandshakeInitSlot) {
    pairing = "Next: click Fill remote init.";
  }
  if (hasHandshakeReplyInput) {
    pairing = "Next: click Export reply.";
  }
  if (hasHandshakeReplyPayload) {
    pairing = counterpartProfile ? "Next: click Relay reply to peer." : "Next: click Store reply.";
  }
  if (hasRemoteHandshakeReplySlot) {
    pairing = "Next: click Fill remote reply.";
  }
  if (hasHandshakeFinishInput) {
    pairing = "Next: click Export finish.";
  }
  if (hasHandshakeFinishPayload) {
    pairing = counterpartProfile ? "Next: click Relay finish to peer." : "Next: click Store finish.";
  }
  if (hasRemoteHandshakeFinishSlot) {
    pairing = "Next: click Fill remote finish.";
  }
  if (hasFinishImportInput) {
    pairing = "Next: click Import finish.";
  }

  const active = activeProfile ? String(activeProfile).trim().toLowerCase() : "";
  const counterpart = counterpartProfile ? String(counterpartProfile).trim().toLowerCase() : "";
  const activeLabel = active || "active profile";
  const counterpartLabel = counterpart || "counterpart";

  let message = sessionReadyForMessages
    ? `Next: enter message for ${activeLabel} and export envelope.`
    : `Next: check both sessions, or complete ${activeLabel} session state.`;
  if (hasOutboundMessageInput) {
    message = `Next: export envelope from ${activeLabel}.`;
  }
  if (hasLocalMessageEnvelope) {
    message = `Next: click Relay to peer for ${counterpartLabel}.`;
  }
  if (hasRemoteMessageEnvelopeSlot) {
    message = `Next: click Fill remote for ${activeLabel}.`;
  }
  if (hasInboundEnvelopeInput) {
    message = `Next: import envelope for ${activeLabel}.`;
  }
  if (hasImportedMessage && !hasReceivedMessage) {
    message = `Next: click Show received for ${activeLabel}.`;
  }
  if (hasReceivedMessage) {
    message = `Next: review received message for ${activeLabel}.`;
  }
  if (hasTwoProfileReplySelected && (!hasImportedMessage || hasReceivedMessage)) {
    message = `Next: write reply from ${activeLabel} to ${counterpartLabel}.`;
  }
  if (hasTwoProfileReplyDraftInput) {
    message = `Next: send stored-session reply from ${activeLabel} to ${counterpartLabel}.`;
  }

  return { profile, pairing, message };
}

export function productionManualCurrentStepView(state) {
  const nextActions = productionManualNextActions(state ?? {});
  if (state?.busy) {
    return "Running | wait for the active production action.";
  }
  if (!state?.hasProfileUnlockInput) {
    return `Profile | ${nextActions.profile}`;
  }
  const needsReceivedReview = Boolean(state.hasImportedMessage && !state.hasReceivedMessage);
  if (state.hasTwoProfileReplyDraftInput || (state.hasTwoProfileReplySelected && !needsReceivedReview)) {
    return `Reply | ${nextActions.message}`;
  }

  const messageActive = Boolean(
    state.sessionReadyForMessages ||
      state.hasOutboundMessageInput ||
      state.hasLocalMessageEnvelope ||
      state.hasRemoteMessageEnvelopeSlot ||
      state.hasInboundEnvelopeInput ||
      state.hasImportedMessage ||
      state.hasReceivedMessage,
  );
  if (messageActive) {
    return `Message | ${nextActions.message}`;
  }

  return `Pairing | ${nextActions.pairing}`;
}

export function productionManualCurrentFocusTarget(state) {
  if (state?.busy) {
    return null;
  }
  if (!state?.hasProfileUnlockInput) {
    return state?.activeProfile ? "profile-passphrase" : "profile-name";
  }

  const needsReceivedReview = Boolean(state.hasImportedMessage && !state.hasReceivedMessage);
  if (state.hasTwoProfileReplyDraftInput) {
    return "send-two-profile-message";
  }
  if (needsReceivedReview) {
    return "show-received";
  }
  if (state.hasTwoProfileReplySelected) {
    return "two-profile-message";
  }
  if (state.hasReceivedMessage) {
    return "received-message";
  }
  if (state.hasInboundEnvelopeInput) {
    return "import-envelope";
  }
  if (state.hasRemoteMessageEnvelopeSlot) {
    return "load-message-envelope";
  }
  if (state.hasLocalMessageEnvelope) {
    return state.counterpartProfile ? "relay-message-envelope" : "store-message-envelope";
  }
  if (state.hasOutboundMessageInput) {
    return "export-message-envelope";
  }
  if (state.sessionReadyForMessages) {
    return "message-body";
  }

  if (state.hasFinishImportInput) {
    return "import-finish";
  }
  if (state.hasRemoteHandshakeFinishSlot) {
    return state.hasFinishImportInput ? "import-finish" : "load-handshake-finish";
  }
  if (state.hasHandshakeFinishPayload) {
    return state.counterpartProfile ? "relay-handshake-finish" : "store-handshake-finish";
  }
  if (state.hasHandshakeFinishInput) {
    return "export-finish";
  }
  if (state.hasRemoteHandshakeReplySlot) {
    return state.hasHandshakeFinishInput ? "export-finish" : "load-handshake-reply";
  }
  if (state.hasHandshakeReplyPayload) {
    return state.counterpartProfile ? "relay-handshake-reply" : "store-handshake-reply";
  }
  if (state.hasHandshakeReplyInput) {
    return "export-reply";
  }
  if (state.hasRemoteHandshakeInitSlot) {
    return state.hasHandshakeReplyInput ? "export-reply" : "load-handshake-init";
  }
  if (state.hasHandshakeInitPayload) {
    return state.counterpartProfile ? "relay-handshake-init" : "store-handshake-init";
  }
  if (state.hasSessionDraftSaved) {
    return "export-init";
  }
  if (state.hasSessionDraftInput) {
    return "save-draft";
  }
  if (state.hasRemotePairingSlot) {
    return state.hasRemotePairingInput ? "save-draft" : "load-pairing";
  }
  if (state.hasLocalPairingPayload) {
    return state.counterpartProfile ? "relay-pairing" : "store-pairing";
  }
  if (state.hasPairingInput) {
    return "export-pairing";
  }

  return "unlock-profile";
}

export function productionManualPrimaryActions(state) {
  if (state?.busy) {
    return {
      showReceived: false,
      selectReply: false,
      sendReply: false,
    };
  }
  const replyDraft = Boolean(state?.hasTwoProfileReplyDraftInput);
  const replySelected = Boolean(state?.hasTwoProfileReplySelected);
  const needsReceivedReview = Boolean(state?.hasImportedMessage && !state?.hasReceivedMessage);
  return {
    showReceived: Boolean(needsReceivedReview && !replyDraft),
    selectReply: Boolean(replySelected && !replyDraft && !needsReceivedReview),
    sendReply: replyDraft,
  };
}

export function productionManualStatusView(input, slots) {
  const profile = String(input?.profile ?? "").trim() || "No profile";
  const counterpart = productionCounterpartProfile(profile);
  const remoteProfile = counterpart ?? "No counterpart; manually select Alice or Bob";
  const formatSlot = (kind, label) => {
    const localReady = Boolean(slots?.[kind]?.local);
    const remoteReady = Boolean(slots?.[kind]?.remote);
    return (
      `${label}: active_slot(${profile})=${localReady ? "stored" : "empty"} ` +
      `counterpart_slot(${remoteProfile})=${remoteReady ? "ready" : "empty"}`
    );
  };

  return {
    route: `Active=${profile} Remote=${remoteProfile}`,
    direction:
      "Fill local copies the active output field into the matching local input; " +
      "Fill remote copies the stored counterpart payload into the matching remote input.",
    payloads: [
      formatSlot("pairing", "pairing"),
      formatSlot("handshakeInit", "init"),
      formatSlot("handshakeReply", "reply"),
      formatSlot("handshakeFinish", "finish"),
      formatSlot("messageEnvelope", "envelope"),
    ].join(" | "),
    policy:
      "manual_only=true auto_send=false auto_import=false " +
      "button_confirmed_profile_switch=true background_profile_switch=false network_io=false",
    mode: counterpart
      ? "Manual relay uses local memory slots only; manually select the counterpart profile to fill remote payloads."
      : "Manual relay needs a supported active profile; manually select Alice or Bob before filling remote payloads.",
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
    hasTwoProfileSessionsReady,
    hasMessageRetentionPolicy = true,
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
    exportMessageEnvelope: !busy && hasMessageRetentionPolicy && hasOutboundMessageInput,
    importMessageEnvelope: !busy && hasMessageRetentionPolicy && hasInboundEnvelopeInput,
    exportReceivedMessage: !busy && hasReceivedExportInput,
    runTwoProfileRoundtrip:
      !busy && hasMessageRetentionPolicy && hasTwoProfileInput && !hasTwoProfileSessionsReady,
    runTwoProfileMessageRoundtrip:
      !busy && hasMessageRetentionPolicy && hasTwoProfileInput && hasTwoProfileSessionsReady,
    usePairingPayload: !busy && hasLocalPairingPayload,
    useHandshakeInit: !busy && hasHandshakeInitPayload,
    useHandshakeReply: !busy && hasHandshakeReplyPayload,
    useHandshakeFinish: !busy && hasHandshakeFinishPayload,
    useMessageEnvelope: !busy && hasLocalMessageEnvelope,
  };
}

export function productionManualRelayAvailability(state) {
  const {
    busy,
    hasLocalPairingPayload,
    hasRemotePairingSlot,
    hasHandshakeInitPayload,
    hasRemoteHandshakeInitSlot,
    hasHandshakeReplyPayload,
    hasRemoteHandshakeReplySlot,
    hasHandshakeFinishPayload,
    hasRemoteHandshakeFinishSlot,
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
    counterpartProfile,
  } = state;
  const enabled = (ready) => !busy && Boolean(ready);

  return {
    usePairingPayload: enabled(hasLocalPairingPayload),
    storePairingPayload: enabled(hasLocalPairingPayload),
    loadPairingPayload: enabled(hasRemotePairingSlot),
    relayPairingPayload: enabled(hasLocalPairingPayload && counterpartProfile),
    useHandshakeInit: enabled(hasHandshakeInitPayload),
    storeHandshakeInit: enabled(hasHandshakeInitPayload),
    loadHandshakeInit: enabled(hasRemoteHandshakeInitSlot),
    relayHandshakeInit: enabled(hasHandshakeInitPayload && counterpartProfile),
    useHandshakeReply: enabled(hasHandshakeReplyPayload),
    storeHandshakeReply: enabled(hasHandshakeReplyPayload),
    loadHandshakeReply: enabled(hasRemoteHandshakeReplySlot),
    relayHandshakeReply: enabled(hasHandshakeReplyPayload && counterpartProfile),
    useHandshakeFinish: enabled(hasHandshakeFinishPayload),
    storeHandshakeFinish: enabled(hasHandshakeFinishPayload),
    loadHandshakeFinish: enabled(hasRemoteHandshakeFinishSlot),
    relayHandshakeFinish: enabled(hasHandshakeFinishPayload && counterpartProfile),
    useMessageEnvelope: enabled(hasLocalMessageEnvelope),
    storeMessageEnvelope: enabled(hasLocalMessageEnvelope),
    loadMessageEnvelope: enabled(hasRemoteMessageEnvelopeSlot),
    relayMessageEnvelope: enabled(hasLocalMessageEnvelope && counterpartProfile),
  };
}

export function productionManualRelayCurrentActions(availability, context = {}) {
  const relayPreferred = (storeKey, relayKey) =>
    Boolean(availability?.[storeKey]) && !availability?.[relayKey];

  return {
    storePairingPayload: relayPreferred("storePairingPayload", "relayPairingPayload"),
    loadPairingPayload: Boolean(availability?.loadPairingPayload && !context.hasRemotePairingInput),
    relayPairingPayload: Boolean(availability?.relayPairingPayload),
    storeHandshakeInit: relayPreferred("storeHandshakeInit", "relayHandshakeInit"),
    loadHandshakeInit: Boolean(availability?.loadHandshakeInit && !context.hasHandshakeReplyInput),
    relayHandshakeInit: Boolean(availability?.relayHandshakeInit),
    storeHandshakeReply: relayPreferred("storeHandshakeReply", "relayHandshakeReply"),
    loadHandshakeReply: Boolean(availability?.loadHandshakeReply && !context.hasHandshakeFinishInput),
    relayHandshakeReply: Boolean(availability?.relayHandshakeReply),
    storeHandshakeFinish: relayPreferred("storeHandshakeFinish", "relayHandshakeFinish"),
    loadHandshakeFinish: Boolean(availability?.loadHandshakeFinish && !context.hasFinishImportInput),
    relayHandshakeFinish: Boolean(availability?.relayHandshakeFinish),
    storeMessageEnvelope: relayPreferred("storeMessageEnvelope", "relayMessageEnvelope"),
    loadMessageEnvelope: Boolean(
      availability?.loadMessageEnvelope &&
        context.selectedNeedsPeerImport &&
        !context.hasInboundEnvelopeInput,
    ),
    relayMessageEnvelope: Boolean(availability?.relayMessageEnvelope),
  };
}

export function productionManualRelaySuccessWarning(profile, counterpart, label) {
  const source = String(profile ?? "").trim().toLowerCase() || "active profile";
  const target = String(counterpart ?? "").trim().toLowerCase() || "peer";
  const payload = String(label ?? "payload").trim().toLowerCase();
  return (
    `Stored ${source} ${payload} slot, selected ${target}, and loaded ${payload} into the remote field. ` +
    "The local output field was cleared; the stored relay slot remains available."
  );
}

export function productionManualRelayDisabledReasons(state) {
  if (state?.busy) {
    return {
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
    };
  }

  const counterpart = String(state?.counterpartProfile ?? "").trim().toLowerCase();
  const remoteReason = (label) =>
    counterpart ? `Store ${counterpart} ${label} first.` : "Select Alice or Bob before filling remote payloads.";

  return {
    usePairingPayload: "Export pairing first.",
    storePairingPayload: "Export pairing first.",
    loadPairingPayload: remoteReason("pairing"),
    relayPairingPayload: counterpart ? "Export pairing first." : "Select Alice or Bob before relaying.",
    useHandshakeInit: "Export init first.",
    storeHandshakeInit: "Export init first.",
    loadHandshakeInit: remoteReason("init"),
    relayHandshakeInit: counterpart ? "Export init first." : "Select Alice or Bob before relaying.",
    useHandshakeReply: "Export reply first.",
    storeHandshakeReply: "Export reply first.",
    loadHandshakeReply: remoteReason("reply"),
    relayHandshakeReply: counterpart ? "Export reply first." : "Select Alice or Bob before relaying.",
    useHandshakeFinish: "Export finish first.",
    storeHandshakeFinish: "Export finish first.",
    loadHandshakeFinish: remoteReason("finish"),
    relayHandshakeFinish: counterpart ? "Export finish first." : "Select Alice or Bob before relaying.",
    useMessageEnvelope: "Export envelope first.",
    storeMessageEnvelope: "Export envelope first.",
    loadMessageEnvelope: remoteReason("envelope"),
    relayMessageEnvelope: counterpart ? "Export envelope first." : "Select Alice or Bob before relaying.",
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
      ? "Next: reply direction is selected; write a stored-session reply."
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

export function productionTwoProfileMessageResultView(result) {
  const sessionReady = result.sender_session_ready && result.receiver_session_ready;
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
  const canContinue = sessionReady && messageReady && boundaryContained;

  return {
    canContinue,
    profiles:
      `Using existing encrypted profile stores; no pairing payloads exported in this action. ` +
      `sender=${result.sender_profile ?? "unknown"} receiver=${result.receiver_profile ?? "unknown"}`,
    session:
      `${sessionReady ? "Complete" : "Review"}: stored sender and receiver sessions are message-ready | ` +
      `sender=${result.sender_session_ready} receiver=${result.receiver_session_ready}`,
    message:
      `${messageReady ? "Complete" : "Review"}: stored-session envelope imported and received message verified | ` +
      `number=${result.message_number ?? "unknown"} reserved=${result.message_number_reserved} ttl=${result.message_ttl_seconds ?? "unknown"} envelope=${result.encrypted_envelope_exported} inbound=${result.inbound_message_stored} status=${result.received_status_verified} match=${result.received_export_matches_input}`,
    boundary:
      `${boundaryContained ? "Contained" : "Review"}: no plaintext, key material, store path, network I/O, transport I/O, or runtime messaging exposure | ` +
      `plaintext_returned=${result.plaintext_returned_to_frontend} path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    nextStep: canContinue
      ? "Next: reply direction is selected; write a stored-session reply."
      : "Review stored-session result rows before continuing.",
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
  const numberMode = state?.autoMessageNumber ? "auto" : "manual";
  const session = state?.sessionReadyForMessages ? "ready" : "not-ready";
  const localEnvelope = state?.hasLocalMessageEnvelope ? "present" : "empty";
  const remoteSlot = state?.hasRemoteMessageEnvelopeSlot ? "ready" : "empty";
  const remoteEnvelope = state?.hasInboundEnvelopeInput ? "loaded" : "empty";
  const received = state?.hasReceivedMessage ? "present" : "empty";
  const reply = state?.hasTwoProfileReplyDraftInput
    ? "draft"
    : state?.hasTwoProfileReplySelected
      ? "selected"
      : "none";
  return (
    `active=${active} remote=${counterpart} number=${messageNumber} mode=${numberMode} session=${session} ` +
    `local_envelope=${localEnvelope} remote_slot=${remoteSlot} remote_envelope=${remoteEnvelope} ` +
    `received=${received} reply=${reply}`
  );
}

export function productionManualMessageCheckView(state) {
  let check = "Manual check: verify active profile, message number, and envelope source.";
  if (!state?.counterpartProfile) {
    check = "Manual check: select Alice or Bob before using stored remote payloads.";
  } else if (!Number.isInteger(state?.messageNumber)) {
    check = "Manual check: enter the message number before export or import.";
  } else if (state?.hasTwoProfileReplyDraftInput) {
    check = "Manual check: reply draft is ready; send the stored-session reply.";
  } else if (state?.hasTwoProfileReplySelected) {
    check = "Manual check: reply target is selected; write the reply or show received for local review.";
  } else if (state?.hasInboundEnvelopeInput && !state?.hasRemoteMessageEnvelopeSlot) {
    check = "Manual check: pasted envelope is not from the stored remote slot; verify source.";
  } else if (state?.hasLocalMessageEnvelope && !state?.hasRemoteMessageEnvelopeSlot) {
    check = "Manual check: store the local envelope before switching profile.";
  } else if (state?.hasRemoteMessageEnvelopeSlot && !state?.hasInboundEnvelopeInput) {
    check = "Manual check: load the remote envelope manually before import.";
  }
  return check;
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
      `number=${result.selected_message_number} auto=${result.auto_message_number} ` +
      `ttl=${result.message_ttl_seconds ?? "unknown"} ` +
      `counter=${result.auto_counter_written} skipped=${result.existing_message_slot_skipped} ` +
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

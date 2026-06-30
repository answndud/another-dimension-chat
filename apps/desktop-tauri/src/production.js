export function createProductionActionStateController(input) {
  const {
    fields,
    setActionButtonState,
    setText,
    setTwoProfileComposeLocked,
    setTwoProfileComposeCurrent,
    setProductionTwoProfileReadiness,
    setProductionMessageManualCurrent,
    setOpenManualProductionToolsLabel,
    setProductionManualFocusCurrent,
    setProductionTwoProfileState,
    setProductionMessageState,
    setProductionPairingState,
    setProductionProfileState,
    renderFirstRunDesktopSummary,
    renderHighRiskReadinessStatus,
    renderProductionTwoProfileDirection,
    renderProductionTwoProfileFlow,
    updateConnectionWizard,
    renderRoomIdentityBar,
    renderRoomStatusSummary,
    renderRoomSetupProgress,
    renderTwoProfileSafetyConfirm,
    updateMinimalChatMode,
    renderManualNextActions,
    renderProductionPairingFlow,
    renderManualMessageStatus,
    renderManualStatus,
    renderManualEnvelopePanel,
    productionManualPrimaryActions,
    productionManualRelayCurrentActions,
    productionManualRelayAvailability,
    productionManualCurrentStepView,
    productionTwoProfileReplySelectionView,
    twoProfilePrimaryReadiness,
    productionProfileInput,
  } = input;

  function renderProductionActionStateControls(state) {
    const manualPrimaryActions = productionManualPrimaryActions(state);
    const manualAvailability = productionManualRelayAvailability(state);
    const manualCurrentActions = productionManualRelayCurrentActions(manualAvailability, {
      hasFinishImportInput: state.hasFinishImportInput,
      hasHandshakeFinishInput: state.hasHandshakeFinishInput,
      hasHandshakeReplyInput: state.hasHandshakeReplyInput,
      hasInboundEnvelopeInput: state.hasInboundEnvelopeInput,
      hasRemotePairingInput: state.hasRemotePairingInput,
      selectedNeedsPeerImport: state.selectedNeedsPeerImport,
    });
    const replySelection = productionTwoProfileReplySelectionView({
      latestConversationDelivered: state.latestConversationDelivered,
      selectedConversationDelivered: state.selectedConversationDelivered,
      selectedDeliveredReplyReady: state.selectedDeliveredReplyReady,
      hasTwoProfileReplyDraftInput: state.hasTwoProfileReplyDraftInput,
    });

    setActionButtonState(
      fields.unlockProductionProfile,
      !state.availability.unlockProfile,
      state.busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
      state.latestProductionManualFocusTarget === "unlock-profile",
    );
    setActionButtonState(fields.checkProductionDataLifecycle, state.busy, "Wait for the active production action.", false);
    setActionButtonState(fields.prepareProductionDataLifecycle, state.busy, "Wait for the active production action.", false);
    setActionButtonState(
      fields.deleteProductionProfile,
      state.busy ||
        !productionProfileInput().profile ||
        (fields.productionProfileDeleteConfirmation?.value ?? "").trim() !==
          productionProfileInput().profile,
      state.busy
        ? "Wait for the active production action."
        : "Type the exact profile name before deleting the profile store.",
      false,
    );
    setActionButtonState(
      fields.wipeProductionLocalData,
      state.busy || (fields.productionFullWipeConfirmation?.value ?? "").trim() !== "WIPE LOCAL DATA",
      state.busy ? "Wait for the active production action." : "Type WIPE LOCAL DATA before wiping local app data.",
      false,
    );
    setActionButtonState(fields.panicLockProductionProfile, false, "", false);
    setActionButtonState(
      fields.emergencyWipeProductionLocalData,
      state.busy ||
        (fields.productionEmergencyWipeConfirmation?.value ?? "").trim() !== "EMERGENCY WIPE LOCAL DATA",
      state.busy
        ? "Wait for the active production action."
        : "Type EMERGENCY WIPE LOCAL DATA before emergency local wipe.",
      false,
    );
    setActionButtonState(
      fields.exportProductionPairing,
      !state.availability.exportPairing,
      state.busy ? "Wait for the active production action." : "Enter profile, passphrase, and onion endpoint first.",
      state.latestProductionManualFocusTarget === "export-pairing",
    );
    setActionButtonState(
      fields.saveProductionSessionDraft,
      !state.availability.saveSessionDraft,
      state.busy
        ? "Wait for the active production action."
        : state.pairing.localPayload && state.pairing.remotePayload
          ? "Check and confirm the safety number first."
          : "Load or paste both local and remote pairing payloads first.",
      state.latestProductionManualFocusTarget === "save-draft",
    );
    setActionButtonState(fields.checkProductionSessionState, !state.availability.checkSessionState, state.busy ? "Wait for the active production action." : "Enter profile and passphrase first.", false);
    setActionButtonState(fields.checkProductionSessionLifecycle, !state.availability.checkSessionState, state.busy ? "Wait for the active production action." : "Enter profile and passphrase first.", false);
    setActionButtonState(
      fields.deleteProductionSessionLifecycle,
      !state.availability.checkSessionState || !state.sessionDeleteConfirmed,
      state.busy
        ? "Wait for the active production action."
        : !state.availability.checkSessionState
          ? "Enter profile and passphrase first."
          : "Type DELETE SESSION before deleting local session resume records.",
      false,
    );
    setActionButtonState(
      fields.exportProductionHandshakeInit,
      !state.availability.exportHandshakeInit,
      state.busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
      state.latestProductionManualFocusTarget === "export-init",
    );
    setActionButtonState(
      fields.exportProductionHandshakeReply,
      !state.availability.exportHandshakeReply,
      state.busy ? "Wait for the active production action." : "Load or paste remote handshake init first.",
      state.latestProductionManualFocusTarget === "export-reply",
    );
    setActionButtonState(
      fields.exportProductionHandshakeFinish,
      !state.availability.exportHandshakeFinish,
      state.busy ? "Wait for the active production action." : "Load or paste remote handshake reply first.",
      state.latestProductionManualFocusTarget === "export-finish",
    );
    setActionButtonState(
      fields.importProductionHandshakeFinish,
      !state.availability.importHandshakeFinish,
      state.busy ? "Wait for the active production action." : "Load or paste remote handshake finish first.",
      state.latestProductionManualFocusTarget === "import-finish",
    );
    setActionButtonState(
      fields.exportProductionMessageEnvelope,
      !state.availability.exportMessageEnvelope,
      state.busy
        ? "Wait for the active production action."
        : !state.hasMessageRetentionPolicy
          ? state.retentionPolicyBlocker
          : !state.selectedManualExportProfileMatches
            ? `Select ${state.selectedManualExportProfile} in the manual profile panel before exporting this selected message.`
            : !state.selectedMessageInputMatches
              ? "Reapply the pending row before exporting; manual number/body or auto-number mode no longer matches the selected message."
              : "Complete session state, then enter message number and message.",
      state.latestProductionManualFocusTarget === "export-message-envelope",
    );
    setActionButtonState(
      fields.deleteProductionConversation,
      !state.availability.checkSessionState || !state.conversationDeleteConfirmed,
      state.busy
        ? "Wait for the active production action."
        : !state.availability.checkSessionState
          ? "Enter profile and passphrase first."
          : "Type DELETE CONVERSATION before deleting local message records.",
      false,
    );
    setActionButtonState(
      fields.importProductionMessageEnvelope,
      !state.availability.importMessageEnvelope,
      state.busy
        ? "Wait for the active production action."
        : !state.hasMessageRetentionPolicy
          ? state.retentionPolicyBlocker
          : !state.selectedManualImportProfileMatches
            ? `Select ${state.selectedManualImportProfile} in the manual profile panel before importing this selected message.`
            : !state.selectedMessageInputMatches
              ? "Reapply the pending row before importing; manual number/body no longer matches the selected message."
              : "Complete session state, then load or paste a remote envelope.",
      state.latestProductionManualFocusTarget === "import-envelope",
    );
    setActionButtonState(
      fields.exportProductionReceivedMessage,
      !state.availability.exportReceivedMessage,
      state.busy ? "Wait for the active production action." : "Enter profile, passphrase, and message number first.",
      manualPrimaryActions.showReceived,
    );
    setActionButtonState(fields.loadProductionMessageTranscript, !state.hasProfileUnlockInput || state.busy, state.busy ? "Wait for the active production action." : "Enter profile and passphrase first.");
    setActionButtonState(fields.checkProductionTwoProfileSessionStatus, state.busy || !state.hasTwoProfileSessionStatusInput, state.busy ? "Wait for the active production action." : "Create or paste an invite code first.", state.twoProfileCurrentAction === "check-session");
    setActionButtonState(fields.checkProductionTwoProfileSessionStatusInline, state.busy || !state.hasTwoProfileSessionStatusInput, state.busy ? "Wait for the active production action." : "Create or paste an invite code first.", state.twoProfileCurrentAction === "check-session");
    setActionButtonState(fields.loadProductionTwoProfileTranscript, state.busy || !state.hasTwoProfileSessionStatusInput, state.busy ? "Wait for the active production action." : "Create or paste an invite code first.");

    fields.chatTranscriptToolbar?.classList.toggle("has-pending-action", Boolean(state.pendingConversation));
    fields.chatTranscriptToolbar?.classList.toggle("has-selected-pending-action", Boolean(state.pendingSelected));
    fields.chatTranscriptToolbar?.classList.toggle("has-reply-action", Boolean(replySelection.canSelect));
    fields.chatTranscriptToolbar?.classList.toggle("has-conversation-action", Boolean(state.pendingConversation || replySelection.canSelect));

    const twoProfileReadiness = twoProfilePrimaryReadiness(
      state.twoProfile,
      state.busy,
      state.twoProfileSessionsReady,
      state.hasMessageRetentionPolicy,
    );
    setProductionTwoProfileReadiness(twoProfileReadiness.message, twoProfileReadiness.state);
    renderFirstRunDesktopSummary({
      profileInputPresent: state.hasProfileUnlockInput,
      profileUnlocked: state.latestProductionProfileUnlocked || state.sessionReadyForMessages || state.twoProfileSessionsReady,
      roomPresent: Boolean(
        state.hasLocalPairingPayload ||
          state.hasRemotePairingInput ||
          state.hasSessionDraftSaved ||
          state.twoProfileSessionsReady ||
          (state.twoProfile.profileA && state.twoProfile.profileB && state.twoProfile.profileA !== state.twoProfile.profileB),
      ),
      safetyVerified: Boolean(state.pairingSafetyVerified || state.twoProfileSafetyConfirmed),
      messageFlowReady: Boolean(
        state.hasLocalMessageEnvelope ||
          state.hasInboundEnvelopeInput ||
          state.hasImportedMessage ||
          state.hasReceivedMessage ||
          state.twoProfileReplyDraftReady,
      ),
    });
    renderHighRiskReadinessStatus();
    renderProductionTwoProfileDirection(state.twoProfile);
    renderProductionTwoProfileFlow(state.twoProfile);
    updateConnectionWizard(state.twoProfile);
    renderRoomIdentityBar(state.twoProfile, state.twoProfileSessionsReady);
    renderRoomStatusSummary(state.twoProfile, state.twoProfileSessionsReady);
    renderRoomSetupProgress(state.twoProfile, state.twoProfileSessionsReady);
    renderTwoProfileSafetyConfirm(state.twoProfile, state.twoProfileSessionsReady);
    updateMinimalChatMode(state.twoProfile, state.twoProfileSessionsReady);
    renderProductionTwoProfileMemory(state.twoProfile);
    renderManualNextActions(state);
    renderProductionPairingFlow(state.pairing);
    setTwoProfileComposeCurrent(Boolean(state.twoProfileCurrentAction === "compose" || (state.hasTwoProfileReplySelected && !state.hasTwoProfileReplyDraftInput && !state.plaintextReviewPending)));
    renderManualMessageStatus(state);
    renderManualStatus();
    renderManualEnvelopePanel({
      currentStep: fields.productionManualCurrent?.textContent || productionManualCurrentStepView(state),
      sessionReady: Boolean(state.twoProfileSessionsReady || state.sessionReadyForMessages),
      safetyVerified: Boolean(state.twoProfileSafetyConfirmed || state.pairingSafetyVerified),
      hasOutboundMessageInput: state.hasOutboundMessageInput,
      hasLocalMessageEnvelope: state.hasLocalMessageEnvelope,
      senderEnvelopeSlotPresent: state.latestConversationHasSenderEnvelopeSlot || state.selectedConversationHasSenderEnvelopeSlot,
      outboundExported: Boolean(state.latestConversation?.statuses?.has("sent") || state.selectedConversation?.statuses?.has("sent")),
      hasRemoteMessageEnvelopeSlot: state.hasRemoteMessageEnvelopeSlot,
      hasInboundEnvelopeInput: state.hasInboundEnvelopeInput,
      hasImportedMessage: state.hasImportedMessage,
      hasReceivedMessage: state.hasReceivedMessage,
      inboundImported: Boolean(state.latestConversation?.statuses?.has("received") || state.selectedConversation?.statuses?.has("received")),
      hasTwoProfileReplySelected: state.hasTwoProfileReplySelected,
      hasTwoProfileReplyDraftInput: state.hasTwoProfileReplyDraftInput,
      plaintextReviewPending: state.plaintextReviewPending,
      selectedNeedsSenderExport: state.selectedNeedsSenderExport,
      selectedNeedsPeerImport: state.selectedNeedsPeerImport,
      selectedMessageInputMatches: state.selectedMessageInputMatches,
      selectedMessageLabel: state.selectedMessageLabel,
      currentActionView: manualCurrentActions.currentActionView,
      nextAction: manualCurrentActions.nextAction,
      currentStepLabel: manualCurrentActions.currentStepLabel,
    });
    return twoProfileReadiness;
  }

  return { renderProductionActionStateControls };
}

export function createProductionPairingMessageReadiness(input) {
  const {
    fields,
    hasProfileUnlockInput,
    pairing,
  } = input;

  const hasPairingInput = Boolean(hasProfileUnlockInput && pairing.rendezvousEndpoint);
  const pairingSafetyVerified = Boolean(input.currentPairingSafetyVerified?.(pairing));
  const hasSessionDraftInput = Boolean(
    hasProfileUnlockInput && pairing.localPayload && pairing.remotePayload && pairingSafetyVerified,
  );
  const hasSessionDraftSaved = Boolean(input.latestProductionSessionStateForInput?.(pairing)?.session_draft_present);
  const hasHandshakeReplyInput = Boolean(hasProfileUnlockInput && pairing.initPayload);
  const hasHandshakeFinishInput = Boolean(hasProfileUnlockInput && pairing.replyPayload);
  const hasFinishImportInput = Boolean(hasProfileUnlockInput && pairing.finishPayload);
  const hasLocalPairingPayload = Boolean(fields.productionPairingPayload?.value.trim());
  const hasRemotePairingInput = Boolean(pairing.remotePayload);
  const counterpartProfile = input.productionCounterpartProfile(input.activeProductionProfileName());
  const hasRemotePairingSlot = Boolean(input.productionPayloadSlotReady?.("pairing", counterpartProfile));
  const hasHandshakeInitPayload = Boolean(fields.productionHandshakeInitPayload?.value.trim());
  const hasHandshakeReplyPayload = Boolean(fields.productionHandshakeReplyPayload?.value.trim());
  const hasHandshakeFinishPayload = Boolean(fields.productionHandshakeFinishPayload?.value.trim());
  const hasRemoteHandshakeInitSlot = Boolean(input.productionPayloadSlotReady?.("handshakeInit", counterpartProfile));
  const hasRemoteHandshakeReplySlot = Boolean(input.productionPayloadSlotReady?.("handshakeReply", counterpartProfile));
  const hasRemoteHandshakeFinishSlot = Boolean(input.productionPayloadSlotReady?.("handshakeFinish", counterpartProfile));
  const hasLocalMessageEnvelope = Boolean(fields.productionMessageEnvelope?.value.trim());
  const hasRemoteMessageEnvelopeSlot = Boolean(
    input.activeMessageEnvelopeSlotReady?.(input.activeProductionProfileName()),
  );
  return {
    hasPairingInput,
    pairingSafetyVerified,
    hasSessionDraftInput,
    hasSessionDraftSaved,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasRemotePairingInput,
    counterpartProfile,
    hasRemotePairingSlot,
    hasHandshakeInitPayload,
    hasHandshakeReplyPayload,
    hasHandshakeFinishPayload,
    hasRemoteHandshakeInitSlot,
    hasRemoteHandshakeReplySlot,
    hasRemoteHandshakeFinishSlot,
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
  };
}

export function createProductionSelectedConversationState(input) {
  const {
    activeProductionProfileName,
    messageNumber,
    message,
    selectedConversation,
  } = input;

  const selectedHasSentCopy = Boolean(selectedConversation?.statuses?.has("sent"));
  const selectedHasReceivedCopy = Boolean(selectedConversation?.statuses?.has("received"));
  const selectedNeedsSenderExport = Boolean(selectedConversation && !selectedHasSentCopy);
  const selectedNeedsPeerImport = Boolean(selectedConversation && selectedHasSentCopy && !selectedHasReceivedCopy);
  const selectedMessageInputMatches = selectedConversation
    ? Number.parseInt(selectedConversation.messageNumber, 10) === messageNumber &&
      String(selectedConversation.message ?? "").trim() === message &&
      !(selectedNeedsSenderExport && input.autoMessageNumber)
    : true;
  const selectedMessageInputStale = !selectedMessageInputMatches;
  const selectedManualExportProfile = selectedNeedsSenderExport
    ? String(selectedConversation?.sender ?? "").trim().toLowerCase()
    : "";
  const selectedManualImportProfile = selectedNeedsPeerImport
    ? String(selectedConversation?.receiver ?? "").trim().toLowerCase()
    : "";
  const selectedManualExportProfileMatches = Boolean(
    !selectedManualExportProfile || activeProductionProfileName() === selectedManualExportProfile,
  );
  const selectedManualImportProfileMatches = Boolean(
    !selectedManualImportProfile || activeProductionProfileName() === selectedManualImportProfile,
  );
  const selectedMessageLabel = selectedConversation
    ? `${selectedConversation.sender}->${selectedConversation.receiver}#${selectedConversation.messageNumber}`
    : "";

  return {
    selectedConversation,
    selectedHasSentCopy,
    selectedHasReceivedCopy,
    selectedNeedsSenderExport,
    selectedNeedsPeerImport,
    selectedMessageInputMatches,
    selectedMessageInputStale,
    selectedManualExportProfile,
    selectedManualImportProfile,
    selectedManualExportProfileMatches,
    selectedManualImportProfileMatches,
    selectedMessageLabel,
  };
}

export function createProductionBusyActionState(input) {
  const { getAction, setAction, fingerprintForInput, realOnionRoundtripActiveForInput } = input;
  const active = {
    inviteRoomOpenFingerprint: "",
    inviteRoomPrivateRouteCodeFingerprint: "",
    inviteRoomPeerRouteCodeFingerprint: "",
    twoProfileRoundtripFingerprint: "",
    twoProfileMessageRoundtripFingerprint: "",
    twoProfileOnionEnvelopeSendKey: "",
    twoProfilePeerEndpointRefreshFingerprint: "",
    twoProfileOutboundCancelFingerprint: "",
    twoProfileSessionStatusFingerprint: "",
  };

  function clearAction(action) {
    if (getAction() === action) {
      setAction(null);
    }
  }

  function fingerprint(inputValue) {
    return fingerprintForInput(inputValue);
  }

  function setFingerprintAction(action, key, inputValue) {
    setAction(action);
    active[key] = fingerprint(inputValue);
  }

  function clearFingerprintAction(action, key, inputValue) {
    if (getAction() === action && active[key] === fingerprint(inputValue)) {
      active[key] = "";
      clearAction(action);
    }
  }

  function onionEnvelopeSendKey(inputValue, messageNumber) {
    const normalizedNumber = Number.parseInt(messageNumber, 10) || 0;
    return `${fingerprint(inputValue)}\n${normalizedNumber}`;
  }

  function onionEnvelopeSendBusyMatches(inputValue) {
    const inputFingerprint = fingerprint(inputValue);
    return Boolean(
      getAction() === "two-profile-onion-envelope-send" &&
        inputFingerprint &&
        active.twoProfileOnionEnvelopeSendKey.startsWith(`${inputFingerprint}\n`),
    );
  }

  function matchesInput(inputValue) {
    const action = getAction();
    if (action === null) {
      return false;
    }
    if (action === "invite-room-open") {
      return active.inviteRoomOpenFingerprint === fingerprint(inputValue);
    }
    if (action === "invite-room-private-route-code") {
      return active.inviteRoomPrivateRouteCodeFingerprint === fingerprint(inputValue);
    }
    if (action === "invite-room-peer-route-code") {
      return active.inviteRoomPeerRouteCodeFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-roundtrip") {
      return active.twoProfileRoundtripFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-message-roundtrip") {
      return active.twoProfileMessageRoundtripFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-onion-envelope-send") {
      return onionEnvelopeSendBusyMatches(inputValue);
    }
    if (action === "two-profile-peer-endpoint-refresh") {
      return active.twoProfilePeerEndpointRefreshFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-outbound-cancel") {
      return active.twoProfileOutboundCancelFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-real-onion-roundtrip") {
      return realOnionRoundtripActiveForInput(inputValue);
    }
    if (action === "two-profile-session-status") {
      return active.twoProfileSessionStatusFingerprint === fingerprint(inputValue);
    }
    return true;
  }

  return {
    clearAction,
    setInviteRoomOpenBusy: (inputValue) =>
      setFingerprintAction("invite-room-open", "inviteRoomOpenFingerprint", inputValue),
    inviteRoomOpenBusyMatches: (inputValue) =>
      getAction() === "invite-room-open" && active.inviteRoomOpenFingerprint === fingerprint(inputValue),
    clearInviteRoomOpenBusy: (inputValue) =>
      clearFingerprintAction("invite-room-open", "inviteRoomOpenFingerprint", inputValue),
    setInviteRoomPrivateRouteCodeBusy: (inputValue) =>
      setFingerprintAction("invite-room-private-route-code", "inviteRoomPrivateRouteCodeFingerprint", inputValue),
    clearInviteRoomPrivateRouteCodeBusy: (inputValue) =>
      clearFingerprintAction("invite-room-private-route-code", "inviteRoomPrivateRouteCodeFingerprint", inputValue),
    setInviteRoomPeerRouteCodeBusy: (inputValue) =>
      setFingerprintAction("invite-room-peer-route-code", "inviteRoomPeerRouteCodeFingerprint", inputValue),
    clearInviteRoomPeerRouteCodeBusy: (inputValue) =>
      clearFingerprintAction("invite-room-peer-route-code", "inviteRoomPeerRouteCodeFingerprint", inputValue),
    setTwoProfileRoundtripBusy: (inputValue) =>
      setFingerprintAction("two-profile-roundtrip", "twoProfileRoundtripFingerprint", inputValue),
    clearTwoProfileRoundtripBusy: (inputValue) =>
      clearFingerprintAction("two-profile-roundtrip", "twoProfileRoundtripFingerprint", inputValue),
    setTwoProfileMessageRoundtripBusy: (inputValue) =>
      setFingerprintAction("two-profile-message-roundtrip", "twoProfileMessageRoundtripFingerprint", inputValue),
    clearTwoProfileMessageRoundtripBusy: (inputValue) =>
      clearFingerprintAction("two-profile-message-roundtrip", "twoProfileMessageRoundtripFingerprint", inputValue),
    twoProfileOnionEnvelopeSendKey: onionEnvelopeSendKey,
    setTwoProfileOnionEnvelopeSendBusy(inputValue, messageNumber) {
      setAction("two-profile-onion-envelope-send");
      active.twoProfileOnionEnvelopeSendKey = onionEnvelopeSendKey(inputValue, messageNumber);
    },
    clearTwoProfileOnionEnvelopeSendBusy(inputValue, messageNumber) {
      if (
        getAction() === "two-profile-onion-envelope-send" &&
        active.twoProfileOnionEnvelopeSendKey === onionEnvelopeSendKey(inputValue, messageNumber)
      ) {
        active.twoProfileOnionEnvelopeSendKey = "";
        clearAction("two-profile-onion-envelope-send");
      }
    },
    twoProfileOnionEnvelopeSendBusyMatches: onionEnvelopeSendBusyMatches,
    setTwoProfilePeerEndpointRefreshBusy: (inputValue) =>
      setFingerprintAction("two-profile-peer-endpoint-refresh", "twoProfilePeerEndpointRefreshFingerprint", inputValue),
    clearTwoProfilePeerEndpointRefreshBusy: (inputValue) =>
      clearFingerprintAction("two-profile-peer-endpoint-refresh", "twoProfilePeerEndpointRefreshFingerprint", inputValue),
    setTwoProfileOutboundCancelBusy: (inputValue) =>
      setFingerprintAction("two-profile-outbound-cancel", "twoProfileOutboundCancelFingerprint", inputValue),
    clearTwoProfileOutboundCancelBusy: (inputValue) =>
      clearFingerprintAction("two-profile-outbound-cancel", "twoProfileOutboundCancelFingerprint", inputValue),
    setTwoProfileSessionStatusBusy: (inputValue) =>
      setFingerprintAction("two-profile-session-status", "twoProfileSessionStatusFingerprint", inputValue),
    clearTwoProfileSessionStatusBusy: (inputValue) =>
      clearFingerprintAction("two-profile-session-status", "twoProfileSessionStatusFingerprint", inputValue),
    matchesInput,
    blocksInput: (inputValue) => Boolean(getAction() && matchesInput(inputValue)),
    isForInput: (action, inputValue) => getAction() === action && matchesInput(inputValue),
  };
}

export function createProductionMessageReadiness(input) {
  const {
    fields,
    hasProfileUnlockInput,
    message,
    selectedManualExportProfileMatches,
    selectedManualImportProfileMatches,
    twoProfile,
  } = input;

  const hasMessageNumberForExport =
    Boolean(input.productionMessageUsesAutoNumber?.()) || Boolean(input.validProductionMessageNumber?.());
  const hasMessageNumberForImport = Boolean(input.validProductionMessageNumber?.());
  const hasOutboundMessageInput = Boolean(
    hasProfileUnlockInput &&
      hasMessageNumberForExport &&
      message.message &&
      input.sessionReadyForMessages &&
      selectedManualExportProfileMatches,
  );
  const hasInboundEnvelopeInput = Boolean(
    hasProfileUnlockInput &&
      hasMessageNumberForImport &&
      message.envelopePayload &&
      input.sessionReadyForMessages &&
      selectedManualImportProfileMatches,
  );
  const hasImportedMessage = Boolean(input.latestProductionMessageImportMatches?.(message));
  const hasReceivedExportInput = Boolean(hasProfileUnlockInput && hasMessageNumberForImport);
  const hasReceivedMessage = Boolean(fields.productionReceivedMessage?.value.trim());
  const hasTwoProfileInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase &&
      twoProfile.messageTtlSeconds &&
      twoProfile.message,
  );
  const hasTwoProfileSetupInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase &&
      twoProfile.messageTtlSeconds,
  );
  const hasTwoProfileSessionStatusInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase,
  );

  return {
    hasMessageNumberForExport,
    hasMessageNumberForImport,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasImportedMessage,
    hasReceivedExportInput,
    hasReceivedMessage,
    hasTwoProfileInput,
    hasTwoProfileSetupInput,
    hasTwoProfileSessionStatusInput,
  };
}

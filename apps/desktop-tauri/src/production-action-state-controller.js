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

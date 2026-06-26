import {
  messageEnvelopeSlotMismatchReason,
  messageEnvelopeSlotReadyForEntry,
} from "./message-envelope-slots.js";

export function updateProductionMessageSurface(input) {
  const {
    fields,
    state,
    twoProfile,
    latestConversation,
    selectedConversation,
    latestConversationDelivered,
    selectedConversationDelivered,
    selectedMessageInputStale,
    sessionReadyForMessages,
    twoProfileSessionsReady,
    twoProfileSafetyConfirmed,
    latestProductionProfileUnlocked,
    hasTwoProfileSessionStatusInput,
    hasTwoProfileSetupInput,
    hasMessageRetentionPolicy,
    sessionDeleteConfirmed,
    conversationDeleteConfirmed,
    selectedManualExportProfileMatches,
    selectedManualImportProfileMatches,
    selectedManualExportProfile,
    selectedManualImportProfile,
    selectedNeedsSenderExport,
    selectedNeedsPeerImport,
    selectedMessageInputMatches,
    latestProductionManualFocusTarget,
    currentPairingSafetyVerified,
    pairingSafetyVerified,
    productionMessageDeliveryProductizationView,
    productionStorageKeyManagementHardeningView,
    localizedBoundaryStatus,
    setText,
    clearMismatchedChatDeliveryNotice,
    clearMismatchedPrivateRouteFollowup,
    chatDeliveryNoticeMatchesInput,
    restoreLatestChatDeliveryPendingOutbound,
    latestChatDeliveryNoticePendingOutbound,
    latestChatDeliveryNoticeKey,
    productionTwoProfileShouldShowOutboundRecovery,
    productionTwoProfileShouldClearPendingOutboundNotice,
    setChatDeliveryNoticeForPendingOutbound,
    setChatDeliveryNoticeByKey,
    productionTwoProfileOnionReceiveMode,
    productionTwoProfileReplySelectionView,
    chatReviewButtonLabel,
    setReplyLatestTwoProfileLabel,
    setReviewPendingTwoProfileLabel,
    setActionButtonState,
    setProductionManualFocusCurrent,
    setProductionMessageManualCurrent,
    setOpenManualProductionToolsLabel,
    revealManualProductionTools,
    latestTwoProfilePendingConversationEntry,
    selectedTwoProfilePendingConversationEntry,
    automaticVisibleTwoProfileRetryableOutboundEntry,
    pendingMessageEnvelopeSlotForActiveProfile,
    productionManualCurrentStepView,
    renderManualEnvelopePanel,
    twoProfileConversationActionView,
  } = input;

  const pendingConversation = latestTwoProfilePendingConversationEntry();
  const selectedPendingConversation = selectedTwoProfilePendingConversationEntry();
  const pendingSelected = Boolean(selectedPendingConversation);
  const reviewPendingCurrent = Boolean(pendingSelected && selectedMessageInputStale);
  let selectedPendingActionView = null;
  if (!state.plaintextReviewPending && selectedConversation && !selectedConversationDelivered) {
    selectedPendingActionView = twoProfileConversationActionView(selectedConversation);
    const selectedNextAction = selectedMessageInputStale
      ? `Stale: click Reapply selected to restore ${state.selectedMessageLabel}.`
      : selectedPendingActionView.nextAction;
    const latestProductionManualFocusTarget = selectedMessageInputStale
      ? "review-pending"
      : selectedPendingActionView.focusTargetKey;
    setProductionManualFocusCurrent(latestProductionManualFocusTarget);
    setText(fields.productionMessageNextAction, selectedNextAction);
    setText(fields.productionManualCurrent, selectedNextAction);
    setOpenManualProductionToolsLabel(selectedPendingActionView.manualButtonLabel);
    setActionButtonState(fields.openManualProductionTools, false, "", false);
    setProductionMessageManualCurrent(selectedPendingActionView.manualTarget);
    if (selectedPendingActionView.manualTarget) {
      revealManualProductionTools();
    }
  }
  const replySelection = productionTwoProfileReplySelectionView({
    latestConversationDelivered,
    selectedConversationDelivered,
    selectedDeliveredReplyReady: input.selectedDeliveredReplyReady,
    hasTwoProfileReplyDraftInput: state.hasTwoProfileReplyDraftInput,
  });
  fields.chatTranscriptToolbar?.classList.toggle("has-pending-action", Boolean(pendingConversation));
  fields.chatTranscriptToolbar?.classList.toggle("has-selected-pending-action", pendingSelected);
  fields.chatTranscriptToolbar?.classList.toggle("has-reply-action", Boolean(replySelection.canSelect));
  fields.chatTranscriptToolbar?.classList.toggle("has-conversation-action", Boolean(pendingConversation || replySelection.canSelect));

  const receiveIntent = input.receiveIntentForRoom(twoProfile);
  const receivingCurrentRoom = input.productionTwoProfileReceiveMatchesInput(twoProfile);
  const receivingOtherRoom = input.productionTwoProfileReceiveActiveInOtherRoom(twoProfile);
  const receivingRuntimeMismatch = input.productionTwoProfileReceiveRuntimeMismatched(twoProfile);
  const retryableOutboundConversation = automaticVisibleTwoProfileRetryableOutboundEntry(twoProfile);
  const roomFingerprint = input.twoProfileSessionStatusFingerprint(twoProfile);
  const selectedRoomOwnsState = Boolean(
    !selectedConversation ||
      String(selectedConversation.roomFingerprint ?? "").trim() === roomFingerprint,
  );
  const selectedProfilesOwnState = Boolean(
    !selectedConversation ||
      (String(selectedConversation.sender ?? "").trim().toLowerCase() ===
        String(twoProfile.profileA ?? "").trim().toLowerCase() &&
        String(selectedConversation.receiver ?? "").trim().toLowerCase() ===
          String(twoProfile.profileB ?? "").trim().toLowerCase()) ||
      (String(selectedConversation.sender ?? "").trim().toLowerCase() ===
        String(twoProfile.profileB ?? "").trim().toLowerCase() &&
        String(selectedConversation.receiver ?? "").trim().toLowerCase() ===
          String(twoProfile.profileA ?? "").trim().toLowerCase()),
  );
  const latestConversationHasSenderEnvelopeSlot = Boolean(
    latestConversation && messageEnvelopeSlotReadyForEntry(latestConversation.sender, latestConversation),
  );
  const selectedConversationHasSenderEnvelopeSlot = Boolean(
    selectedConversation && messageEnvelopeSlotReadyForEntry(selectedConversation.sender, selectedConversation),
  );
  const activePeerEnvelopeSlot = pendingMessageEnvelopeSlotForActiveProfile(input.activeProductionProfileName());
  const activePeerEnvelopeSlotMismatchReason = activePeerEnvelopeSlot.entry
    ? messageEnvelopeSlotMismatchReason(activePeerEnvelopeSlot.slot, activePeerEnvelopeSlot.entry)
    : selectedNeedsPeerImport
      ? "empty-slot"
      : "none";

  renderManualEnvelopePanel({
    currentStep: fields.productionManualCurrent?.textContent || productionManualCurrentStepView(state),
    sessionReady: Boolean(twoProfileSessionsReady || sessionReadyForMessages),
    safetyVerified: Boolean(twoProfileSafetyConfirmed || pairingSafetyVerified || currentPairingSafetyVerified),
    hasOutboundMessageInput: state.hasOutboundMessageInput,
    hasLocalMessageEnvelope: state.hasLocalMessageEnvelope,
    senderEnvelopeSlotPresent: latestConversationHasSenderEnvelopeSlot || selectedConversationHasSenderEnvelopeSlot,
    outboundExported: Boolean(latestConversation?.statuses?.has("sent") || selectedConversation?.statuses?.has("sent")),
    hasRemoteMessageEnvelopeSlot: state.hasRemoteMessageEnvelopeSlot,
    hasInboundEnvelopeInput: state.hasInboundEnvelopeInput,
    hasImportedMessage: state.hasImportedMessage,
    hasReceivedMessage: state.hasReceivedMessage,
    inboundImported: Boolean(latestConversation?.statuses?.has("received") || selectedConversation?.statuses?.has("received")),
    hasTwoProfileReplySelected: state.hasTwoProfileReplySelected,
    hasTwoProfileReplyDraftInput: state.hasTwoProfileReplyDraftInput,
    plaintextReviewPending: state.plaintextReviewPending,
    selectedNeedsSenderExport,
    selectedNeedsPeerImport,
    selectedMessageInputMatches,
    selectedMessageInputStale,
    retryAvailable: Boolean(retryableOutboundConversation),
    cancelAvailable: Boolean(pendingConversation || retryableOutboundConversation),
    slotMismatchReason: activePeerEnvelopeSlotMismatchReason,
    latestFailureClass: input.latestManualEnvelopePanelFailure?.failureClass,
    latestRecoveryNextAction: input.latestManualEnvelopePanelFailure?.recoveryNextAction,
  });

  const deliveryProductization = productionMessageDeliveryProductizationView({
    profileUnlocked: latestProductionProfileUnlocked || sessionReadyForMessages || twoProfileSessionsReady,
    pairwiseInviteReady: hasTwoProfileSessionStatusInput || hasTwoProfileSetupInput,
    mandatorySafetyVerified: twoProfileSafetyConfirmed,
    composeReady: Boolean(twoProfile.message || state.hasTwoProfileReplyDraftInput),
    outboundExported: Boolean(
      state.hasLocalMessageEnvelope ||
        latestConversationHasSenderEnvelopeSlot ||
        latestConversation?.statuses?.has("sent"),
    ),
    inboundImported: Boolean(state.hasImportedMessage || latestConversation?.statuses?.has("received")),
    replyReady: Boolean(state.twoProfileReplyDraftReady || latestConversationDelivered),
    retryAvailable: Boolean(retryableOutboundConversation),
    cancelAvailable: Boolean(pendingConversation || retryableOutboundConversation),
    localDeleteAvailable: Boolean(conversationDeleteConfirmed || sessionDeleteConfirmed),
    currentRoomOwnsState: selectedRoomOwnsState && selectedMessageInputMatches,
    currentProfileOwnsState:
      selectedProfilesOwnState && selectedManualExportProfileMatches && selectedManualImportProfileMatches,
    duplicateOrReplayRejected: true,
    peerMismatchBlocksVerified: !twoProfileSessionsReady || twoProfileSafetyConfirmed,
    supportRedacted: true,
  });
  document.body.dataset.deliveryPrimaryAction = deliveryProductization.primaryAction;
  document.body.dataset.deliveryBoundaryClosed = String(deliveryProductization.boundaryClosed);
  const storageKeyManagement = productionStorageKeyManagementHardeningView();
  document.body.dataset.storageKeyManagementReady = String(storageKeyManagement.productionKeyManagementReady);
  document.body.dataset.storageKeyManagementBoundaryClosed = String(storageKeyManagement.boundaryClosed);
  setText(fields.messaging, localizedBoundaryStatus(`message_delivery_productization ${deliveryProductization.boundary}`));
  clearMismatchedChatDeliveryNotice(twoProfile);
  clearMismatchedPrivateRouteFollowup(twoProfile);
  const currentRoomDeliveryNotice = chatDeliveryNoticeMatchesInput(twoProfile);
  const pendingOutboundNoticeRetryable = latestChatDeliveryNoticePendingOutbound
    ? restoreLatestChatDeliveryPendingOutbound(twoProfile)
    : null;
  if (
    productionTwoProfileShouldShowOutboundRecovery({
      busy: state.busy,
      sessionsReady: twoProfileSessionsReady,
      hasRetryableOutbound: Boolean(retryableOutboundConversation),
    })
  ) {
    setChatDeliveryNoticeForPendingOutbound(retryableOutboundConversation, twoProfile);
  } else if (
    productionTwoProfileShouldClearPendingOutboundNotice({
      busy: state.busy,
      hasPendingOutboundNotice: Boolean(latestChatDeliveryNoticePendingOutbound),
      noticeMatchesCurrentRoom: currentRoomDeliveryNotice,
      noticePendingOutboundRetryable: Boolean(pendingOutboundNoticeRetryable),
    })
  ) {
    setChatDeliveryNoticeByKey("", "neutral", twoProfile);
  } else if (!state.busy && twoProfileSessionsReady && !twoProfileSafetyConfirmed) {
    setChatDeliveryNoticeByKey("sendLockedUntilVerified", "warning", twoProfile);
  } else if (!state.busy && twoProfileSessionsReady && twoProfileSafetyConfirmed && !input.manualNetworkPermission) {
    setChatDeliveryNoticeByKey("chatNoticeNetworkPermission", "warning", twoProfile);
  } else if (
    !state.busy &&
    twoProfileSessionsReady &&
    twoProfileSafetyConfirmed &&
    !input.twoProfilePeerEndpointState(twoProfile).ready
  ) {
    setChatDeliveryNoticeByKey(
      input.manualNetworkPermission ? "privateDeliveryRouteNeeded" : "chatNoticeNetworkPermission",
      input.manualNetworkPermission ? "muted" : "warning",
      twoProfile,
    );
  } else if (
    !state.busy &&
    twoProfileSessionsReady &&
    twoProfileSafetyConfirmed &&
    input.manualNetworkPermission &&
    input.twoProfilePeerEndpointState(twoProfile).ready &&
    !input.productionTwoProfileOnionReceiveMode.enabled &&
    !input.productionTwoProfileOnionReceiveMode.stopRequested
  ) {
    setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "muted", twoProfile);
  } else if (
    !state.busy &&
    twoProfileSafetyConfirmed &&
    currentRoomDeliveryNotice &&
    latestChatDeliveryNoticeKey === "sendLockedUntilVerified"
  ) {
    setChatDeliveryNoticeByKey("", "neutral", twoProfile);
  } else if (
    !state.busy &&
    !pendingConversation &&
    currentRoomDeliveryNotice &&
    (latestChatDeliveryNoticeKey === "messageSavedPrivateDeliveryOff" ||
      latestChatDeliveryNoticeKey === "privateDeliveryRouteNeeded" ||
      latestChatDeliveryNoticeKey === "chatNoticeNetworkPermission" ||
      latestChatDeliveryNoticeKey === "chatNoticeReceiveStopped")
  ) {
    setChatDeliveryNoticeByKey("", "neutral", twoProfile);
  }

  setReplyLatestTwoProfileLabel(replySelection.label);
  setReviewPendingTwoProfileLabel(
    chatReviewButtonLabel(
      pendingSelected && selectedMessageInputStale
        ? "Reapply"
        : pendingSelected && input.selectedPendingActionView
          ? input.selectedPendingActionView.manualButtonLabel
          : "Review",
    ),
  );
  setActionButtonState(
    fields.replyLatestTwoProfileMessage,
    state.busy || !replySelection.canSelect,
    state.busy ? "Wait for the active production action." : replySelection.disabledReason,
    input.manualPrimaryActions.selectReply && !input.replyComposerCurrent,
  );
  setActionButtonState(
    fields.reviewPendingTwoProfileMessage,
    state.busy || !pendingConversation,
    state.busy ? "Wait for the active production action." : "No pending sent/received gap in loaded conversation.",
    reviewPendingCurrent,
  );

  return {
    pendingConversation,
    selectedPendingConversation,
    pendingSelected,
    reviewPendingCurrent,
    replySelection,
    selectedPendingActionView,
    receiveIntent,
    receivingCurrentRoom,
    receivingOtherRoom,
    receivingRuntimeMismatch,
    retryableOutboundConversation,
    selectedRoomOwnsState,
    selectedProfilesOwnState,
    latestConversationHasSenderEnvelopeSlot,
    selectedConversationHasSenderEnvelopeSlot,
    activePeerEnvelopeSlotMismatchReason,
  };
}

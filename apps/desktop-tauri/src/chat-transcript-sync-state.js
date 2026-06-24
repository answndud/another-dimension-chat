export function manualImportConversationReloadResult(input = {}) {
  const importedProfile = String(input.importedProfile ?? "").trim().toLowerCase();
  if (!importedProfile) {
    return {
      conversationReloaded: true,
      replySelected: false,
      warning: "Manual import completed; conversation transcript was reloaded from encrypted local stores.",
    };
  }
  if (input.replySelected) {
    return {
      conversationReloaded: true,
      replySelected: true,
      warning: "",
    };
  }
  return {
    conversationReloaded: true,
    replySelected: false,
    warning: `Manual import for ${importedProfile} completed; conversation transcript was reloaded from encrypted local stores.`,
  };
}

export function manualExportConversationSyncView(input = {}) {
  const {
    refreshedEntry = null,
    exportedNumber = 0,
    envelope = "",
    importStep = "",
    loadStep = "",
    relayTargetSelected = false,
  } = input;
  const hasEnvelope = String(envelope ?? "").trim().length > 0;
  const entryAwaitingPeerImport =
    refreshedEntry &&
    refreshedEntry.statuses?.has?.("sent") &&
    !refreshedEntry.statuses?.has?.("received");

  if (entryAwaitingPeerImport && hasEnvelope && relayTargetSelected) {
    return {
      conversationUpdated: true,
      peerImportReady: true,
      preloadRemoteEnvelope: true,
      clearLocalEnvelope: true,
      messageState: "Manual import ready",
      messageWarning: `Export envelope complete for message #${exportedNumber}. Next: ${importStep} into ${refreshedEntry.receiver}.`,
      conversationWarning: `Export envelope complete. Next: ${importStep} into ${refreshedEntry.receiver}.`,
    };
  }

  return {
    conversationUpdated: true,
    peerImportReady: false,
    preloadRemoteEnvelope: false,
    clearLocalEnvelope: false,
    messageState: "",
    messageWarning: "",
    conversationWarning: `Export envelope complete for message #${exportedNumber}. Next: ${loadStep} on the receiving device, then ${importStep}.`,
  };
}

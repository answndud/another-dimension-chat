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

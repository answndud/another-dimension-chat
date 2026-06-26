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

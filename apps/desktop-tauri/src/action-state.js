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

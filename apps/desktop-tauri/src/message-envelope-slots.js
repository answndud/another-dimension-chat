const MANUAL_COURIER_TRANSPORT_MODE = "local-manual-courier-envelope-exchange";
const MANUAL_ENVELOPE_EXPORT_ACTION = "export-envelope";
export const MAX_MANUAL_MESSAGE_ENVELOPE_PAYLOAD_SIZE = 17_000;
export const MAX_MANUAL_MESSAGE_ENVELOPE_CIPHERTEXT_HEX_SIZE = 16_384;

function messageEnvelopeImportFailure(kind, nextAction) {
  return {
    accepted: false,
    kind,
    nextAction,
    imported: false,
    delivered: false,
    plaintextReturned: false,
    pathReturned: false,
    keyMaterialExposed: false,
    genericError: false,
    boundary: [
      "message_envelope_import=true",
      `failure=${kind}`,
      "accepted=false",
      "imported=false",
      "delivered=false",
      "plaintext_returned=false",
      "path_returned=false",
      "key_material=false",
      "generic_error=false",
    ].join(" "),
  };
}

export function messageEnvelopePayloadImportDecision(payload, input = {}) {
  const value = String(payload ?? "").trim();
  if (!value) {
    return messageEnvelopeImportFailure("malformed", "Paste a fresh message envelope.");
  }
  if (value.length > MAX_MANUAL_MESSAGE_ENVELOPE_PAYLOAD_SIZE) {
    return messageEnvelopeImportFailure("oversized", "Reject this envelope and ask for a smaller fresh one.");
  }
  if (/\s/.test(value)) {
    return messageEnvelopeImportFailure("malformed", "Paste one complete envelope value without extra text.");
  }
  const parts = value.split("|");
  if (parts.length !== 6 || parts[0] !== "ADENV1") {
    return messageEnvelopeImportFailure("malformed", "Paste a fresh ADENV1 message envelope.");
  }
  if (parts[5].length > MAX_MANUAL_MESSAGE_ENVELOPE_CIPHERTEXT_HEX_SIZE) {
    return messageEnvelopeImportFailure("oversized", "Reject this envelope and ask for a smaller fresh one.");
  }
  if (!/^[0-9a-fA-F]*$/.test(parts[5]) || parts[5].length % 2 !== 0) {
    return messageEnvelopeImportFailure("corrupted", "Discard this envelope and ask for a fresh one.");
  }
  const protocolVersion = Number.parseInt(parts[1], 10);
  const messageNumber = Number.parseInt(parts[3], 10);
  if (protocolVersion !== 1 || !Number.isInteger(messageNumber) || messageNumber <= 0) {
    return messageEnvelopeImportFailure("wrong_type", "Load a supported message envelope.");
  }
  if (parts[4] !== "data") {
    return messageEnvelopeImportFailure("wrong_type", "Load a data message envelope, not a control envelope.");
  }
  if (input.expectedMessageNumber && Number.parseInt(input.expectedMessageNumber, 10) !== messageNumber) {
    return messageEnvelopeImportFailure("wrong_type", "Load the envelope for the selected message number.");
  }
  if (input.duplicatePayloads?.has?.(value)) {
    return messageEnvelopeImportFailure("duplicate", "Ignore the duplicate envelope.");
  }
  if (input.replayedMessageNumbers?.has?.(messageNumber)) {
    return messageEnvelopeImportFailure("replay_rejected", "Ignore the replayed envelope.");
  }
  return {
    accepted: true,
    kind: "accepted",
    nextAction: "Import this message envelope.",
    imported: true,
    delivered: true,
    plaintextReturned: false,
    pathReturned: false,
    keyMaterialExposed: false,
    genericError: false,
    messageNumber,
    boundary: [
      "message_envelope_import=true",
      "failure=none",
      "accepted=true",
      "imported=true",
      "delivered=true",
      "plaintext_returned=false",
      "path_returned=false",
      "key_material=false",
      "generic_error=false",
    ].join(" "),
  };
}

export function messageEnvelopeSlotPayload(slot) {
  return typeof slot === "string" ? slot : String(slot?.payload ?? "").trim();
}

export function messageEnvelopeSlotCreatedByExplicitUserAction(slot) {
  return Boolean(
    slot &&
      typeof slot !== "string" &&
      slot.createdByExplicitUserAction === true &&
      slot.manualAction === MANUAL_ENVELOPE_EXPORT_ACTION &&
      slot.transportMode === MANUAL_COURIER_TRANSPORT_MODE &&
      slot.defaultTransportNetworkIo === false &&
      slot.defaultTransportAutomaticDelivery === false &&
      slot.automaticNetworkOnLaunch === false,
  );
}

export function messageEnvelopeSlotMismatchReason(slot, entry) {
  if (!slot) {
    return "empty-slot";
  }
  if (!entry) {
    return "missing-entry";
  }
  if (typeof slot === "string") {
    return "legacy-unscoped-slot";
  }
  if (!messageEnvelopeSlotCreatedByExplicitUserAction(slot)) {
    return "missing-explicit-user-action";
  }
  const payloadDecision = messageEnvelopePayloadImportDecision(messageEnvelopeSlotPayload(slot), {
    expectedMessageNumber: entry.messageNumber,
  });
  if (!payloadDecision.accepted) {
    return `payload-${payloadDecision.kind}`;
  }
  if (entry?.outboundDeliveryState === "canceled") {
    return "canceled-entry";
  }
  if (entry?.statuses?.has?.("received")) {
    return "already-received-entry";
  }
  if (Number.parseInt(slot.messageNumber, 10) !== Number.parseInt(entry.messageNumber, 10)) {
    return "message-number-mismatch";
  }
  if (String(slot.sender ?? "").trim().toLowerCase() !== String(entry.sender ?? "").trim().toLowerCase()) {
    return "sender-mismatch";
  }
  if (String(slot.receiver ?? "").trim().toLowerCase() !== String(entry.receiver ?? "").trim().toLowerCase()) {
    return "receiver-mismatch";
  }
  if (String(slot.roomFingerprint ?? "").trim() !== String(entry.roomFingerprint ?? "").trim()) {
    return "room-fingerprint-mismatch";
  }
  if (String(slot.message ?? "").trim() !== String(entry.message ?? "").trim()) {
    return "message-mismatch";
  }
  return "matched";
}

export function messageEnvelopeSlotRecoveryHint(slot, entry) {
  switch (messageEnvelopeSlotMismatchReason(slot, entry)) {
    case "matched":
      return "Envelope slot matches the selected pending message.";
    case "legacy-unscoped-slot":
      return "Stored envelope is unscoped. Export this pending message again before importing.";
    case "missing-explicit-user-action":
      return "Stored envelope is not tied to an explicit manual export. Export the selected pending message again.";
    case "canceled-entry":
      return "Selected pending message was canceled. Write and export a new message before importing.";
    case "already-received-entry":
      return "Selected pending message was already received. Choose a different pending row before importing.";
    case "payload-malformed":
      return "Stored envelope is malformed. Export the selected pending message again.";
    case "payload-oversized":
      return "Stored envelope is oversized. Reject it and export a fresh smaller envelope.";
    case "payload-corrupted":
      return "Stored envelope is corrupted. Discard it and export a fresh envelope.";
    case "payload-wrong_type":
      return "Stored envelope is not a valid data envelope for this pending row.";
    case "payload-replay_rejected":
      return "Stored envelope is replayed. Ignore it and wait for a fresh message.";
    case "payload-duplicate":
      return "Stored envelope is a duplicate. Ignore it and continue with the current row.";
    case "room-fingerprint-mismatch":
      return "Stored envelope belongs to another room. Reopen the matching room or export this pending message again.";
    case "message-number-mismatch":
    case "message-mismatch":
      return "Stored envelope is stale for this pending message. Export the selected message again before importing.";
    case "sender-mismatch":
    case "receiver-mismatch":
      return "Stored envelope is for another sender or receiver. Select the matching pending row before importing.";
    default:
      return "Select a pending message with a matching scoped envelope before importing.";
  }
}

export function messageEnvelopeSlotMatchesEntry(slot, entry) {
  return messageEnvelopeSlotMismatchReason(slot, entry) === "matched";
}

export function messageEnvelopeSlotReadyForEntry(slot, entry) {
  return Boolean(messageEnvelopeSlotPayload(slot) && messageEnvelopeSlotMatchesEntry(slot, entry));
}

export function messageEnvelopeSlotImportReadyForEntry(slot, entry) {
  if (entry?.outboundDeliveryState === "canceled" || entry?.statuses?.has?.("received")) {
    return false;
  }
  return messageEnvelopeSlotReadyForEntry(slot, entry);
}

export function createMessageEnvelopeSlot(profile, payload, metadata = {}) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  const envelope = String(payload ?? "").trim();
  const explicitUserExport =
    metadata.explicitUserAction === true && metadata.manualAction === MANUAL_ENVELOPE_EXPORT_ACTION;
  if (!normalizedProfile || !envelope || !explicitUserExport) {
    return null;
  }
  return {
    payload: envelope,
    createdByExplicitUserAction: true,
    manualAction: MANUAL_ENVELOPE_EXPORT_ACTION,
    transportMode: MANUAL_COURIER_TRANSPORT_MODE,
    defaultTransportNetworkIo: false,
    defaultTransportAutomaticDelivery: false,
    automaticNetworkOnLaunch: false,
    sender: normalizedProfile,
    receiver: String(metadata.receiver ?? "").trim().toLowerCase(),
    roomFingerprint: String(metadata.roomFingerprint ?? "").trim(),
    messageNumber: Number.parseInt(metadata.messageNumber, 10),
    message: String(metadata.message ?? "").trim(),
  };
}

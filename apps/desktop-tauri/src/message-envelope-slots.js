export function messageEnvelopeSlotPayload(slot) {
  return typeof slot === "string" ? slot : String(slot?.payload ?? "").trim();
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
  if (!normalizedProfile || !envelope) {
    return null;
  }
  return {
    payload: envelope,
    sender: normalizedProfile,
    receiver: String(metadata.receiver ?? "").trim().toLowerCase(),
    roomFingerprint: String(metadata.roomFingerprint ?? "").trim(),
    messageNumber: Number.parseInt(metadata.messageNumber, 10),
    message: String(metadata.message ?? "").trim(),
  };
}

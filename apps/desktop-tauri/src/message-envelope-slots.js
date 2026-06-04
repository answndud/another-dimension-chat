export function messageEnvelopeSlotPayload(slot) {
  return typeof slot === "string" ? slot : String(slot?.payload ?? "").trim();
}

export function messageEnvelopeSlotMatchesEntry(slot, entry) {
  if (!slot || !entry) {
    return false;
  }
  if (typeof slot === "string") {
    return true;
  }
  return (
    Number.parseInt(slot.messageNumber, 10) === Number.parseInt(entry.messageNumber, 10) &&
    String(slot.sender ?? "").trim().toLowerCase() === String(entry.sender ?? "").trim().toLowerCase() &&
    String(slot.receiver ?? "").trim().toLowerCase() === String(entry.receiver ?? "").trim().toLowerCase() &&
    String(slot.roomFingerprint ?? "").trim() === String(entry.roomFingerprint ?? "").trim() &&
    String(slot.message ?? "").trim() === String(entry.message ?? "").trim()
  );
}

export function messageEnvelopeSlotReadyForEntry(slot, entry) {
  return Boolean(messageEnvelopeSlotPayload(slot) && messageEnvelopeSlotMatchesEntry(slot, entry));
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

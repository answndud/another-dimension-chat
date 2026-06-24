export async function resolveOutboundEntryForAction(entry, input = {}) {
  const restored = await input.restoreInviteRoomForConversationEntry(entry);
  if (!restored) {
    return { ok: false, reason: "room-restore-failed", entry: null };
  }
  const currentEntry = input.currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    input.showCurrentRetryableOutboundMissing(entry);
    return { ok: false, reason: "missing-current-entry", entry: null };
  }
  return { ok: true, reason: "resolved", entry: currentEntry };
}

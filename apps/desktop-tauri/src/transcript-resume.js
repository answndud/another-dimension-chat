export function currentRoomConversationMetadata(input) {
  const {
    currentTranscriptMetadata,
    existingRoom,
    allowRetryableFallback = false,
    inviteRoomMetadataWithoutRetryableOutbound,
    savedInviteRoomMetadataWithPreferredRetryable,
    sessionStatus = null,
    savedInviteRoomMetadataWithSessionStatus,
  } = input;
  let metadata = currentTranscriptMetadata;
  const preferredMessageNumber = Number.parseInt(existingRoom?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (preferredMessageNumber > 0) {
    metadata = savedInviteRoomMetadataWithPreferredRetryable(
      metadata,
      input.roomInput,
      input.conversationEntries,
      preferredMessageNumber,
    );
  } else if (allowRetryableFallback !== true) {
    metadata = inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  if (sessionStatus) {
    metadata = savedInviteRoomMetadataWithSessionStatus(metadata, input.roomInput, sessionStatus);
  }
  return metadata;
}

export function reconcileCurrentInviteRoomMetadataFromTranscriptEntries(input) {
  const {
    code,
    role,
    entries,
    existingRoom,
    allowRetryableFallback = false,
    sessionStatus = null,
    productionInviteRoomConversationMetadata,
    inviteRoomMetadataWithoutRetryableOutbound,
    savedInviteRoomMetadataWithPreferredRetryable,
    savedInviteRoomMetadataWithSessionStatus,
    rememberInviteRoom,
    roomInput,
  } = input;
  if (!code || !role) {
    return false;
  }
  let metadata = productionInviteRoomConversationMetadata(entries ?? []);
  const preferredMessageNumber = Number.parseInt(existingRoom?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (preferredMessageNumber > 0) {
    metadata = savedInviteRoomMetadataWithPreferredRetryable(metadata, roomInput, entries ?? [], preferredMessageNumber);
  } else if (allowRetryableFallback === false) {
    metadata = inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  if (sessionStatus) {
    metadata = savedInviteRoomMetadataWithSessionStatus(metadata, roomInput, sessionStatus);
  }
  rememberInviteRoom(code, role, metadata);
  return true;
}

export function savedInviteRoomMetadataSyncCandidates(rooms, dependency) {
  const list = dependency.savedInviteRoomPriorityEntries(rooms);
  return list
    .sort((left, right) => {
      const priority = right.priority - left.priority;
      return priority || right.updatedAt - left.updatedAt || left.index - right.index;
    })
    .map(({ room }) => room)
    .slice(0, dependency.savedRoomMetadataStartupSyncLimit);
}

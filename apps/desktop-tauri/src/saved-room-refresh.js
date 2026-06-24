export async function savedInviteRoomMetadataFromLocalStores(input) {
  const { room, invokeRoomTranscriptExport, savedInviteRoomMetadataWithPreferredRetryable, inviteRoomMetadataWithoutRetryableOutbound } = input;
  const transcript = await invokeRoomTranscriptExport(room);
  if (!transcript) {
    return null;
  }
  let metadata = transcript.metadata ?? null;
  if (!metadata) {
    return null;
  }
  const preferredMessageNumber = Number.parseInt(room?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (preferredMessageNumber > 0) {
    metadata = savedInviteRoomMetadataWithPreferredRetryable(
      metadata,
      input.roomInput,
      transcript.entries ?? [],
      preferredMessageNumber,
    );
  } else {
    metadata = inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  return metadata;
}

export async function refreshSavedInviteRoomMetadataForFingerprint(input) {
  const {
    room,
    roomFingerprint,
    savedInviteRoomMetadataFromLocalStores,
    savedInviteRoomMetadataWithSessionStatus,
    invokeInviteRoomSessionStatus,
    rememberTwoProfileSessionStatus,
    forgetTwoProfileSessionStatusForInput,
    rememberInviteRoom,
    renderSavedInviteRooms,
  } = input;
  const fingerprintMatchesRoom = () => {
    const expectedFingerprint = String(roomFingerprint ?? "").trim();
    if (!expectedFingerprint || !room || typeof input.roomFingerprintForRoom !== "function") {
      return true;
    }
    return String(input.roomFingerprintForRoom(room) ?? "").trim() === expectedFingerprint;
  };
  if (!room) {
    renderSavedInviteRooms();
    return false;
  }
  if (!fingerprintMatchesRoom()) {
    renderSavedInviteRooms();
    return false;
  }
  try {
    const roomInput = input.savedInviteRoomInput(room);
    let metadata = await savedInviteRoomMetadataFromLocalStores(room);
    if (!metadata) {
      renderSavedInviteRooms();
      return false;
    }
    const retryableMetadataCleared =
      input.savedInviteRoomHasRetryableOutbound(room) && !input.savedInviteRoomHasRetryableOutbound(metadata);
    const refreshSessionStatus =
      input.options?.refreshSessionStatus === true ||
      (retryableMetadataCleared && !input.latestTwoProfileSessionStatusForCurrentInput(roomInput));
    if (refreshSessionStatus) {
      try {
        const sessionStatus = await invokeInviteRoomSessionStatus(roomInput);
        rememberTwoProfileSessionStatus(roomInput, sessionStatus);
        metadata = savedInviteRoomMetadataWithSessionStatus(metadata, roomInput, sessionStatus);
      } catch {
        forgetTwoProfileSessionStatusForInput(roomInput);
      }
    }
    if (!fingerprintMatchesRoom()) {
      renderSavedInviteRooms();
      return false;
    }
    rememberInviteRoom(room.code, room.role, input.options?.preserveUpdatedAt ? { ...metadata, updatedAt: room.updatedAt } : metadata, {
      render: false,
    });
    renderSavedInviteRooms();
    return true;
  } catch {
    renderSavedInviteRooms();
    return false;
  }
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

export async function syncSavedInviteRoomMetadataFromLocalStores(input) {
  if (input.savedRoomMetadataSyncInFlight()) {
    return false;
  }
  const candidates = input.savedInviteRoomMetadataSyncCandidates();
  if (!candidates.length) {
    input.setSavedRoomMetadataSyncStatus("");
    return false;
  }
  input.setSavedRoomMetadataSyncInFlight(true);
  input.setSavedRoomMetadataSyncStatus("roomListSyncRunning", "progress", { count: candidates.length });
  let refreshed = 0;
  let failed = 0;
  try {
    for (const room of candidates) {
      try {
        let metadata = await input.savedInviteRoomMetadataFromLocalStores(room);
        if (metadata) {
          try {
            const roomInput = input.savedInviteRoomInput(room);
            const sessionStatus = await input.invokeInviteRoomSessionStatus(roomInput);
            input.rememberTwoProfileSessionStatus(roomInput, sessionStatus);
            metadata = input.savedInviteRoomMetadataWithSessionStatus(metadata, roomInput, sessionStatus);
          } catch {
            input.forgetTwoProfileSessionStatusForInput(input.savedInviteRoomInput(room));
          }
          input.rememberInviteRoom(room.code, room.role, { ...metadata, updatedAt: room.updatedAt }, { render: false });
          refreshed += 1;
        }
      } catch {
        failed += 1;
      }
    }
    input.renderSavedInviteRooms();
    input.setSavedRoomMetadataSyncStatus(failed ? "roomListSyncPartial" : "roomListSyncComplete", failed ? "warning" : "muted", { count: refreshed });
    return true;
  } finally {
    input.savedRoomMetadataSyncInFlightSet(false);
  }
}

export function rememberCurrentInviteRoomMetadata(input) {
  const code = input.currentInviteRoomCode();
  const role = input.connectionCodeRoleFor(code);
  if (!code || !role) {
    return;
  }
  const allowRetryableFallback = input.allowCurrentRoomRetryableMetadataFallbackOnce === true;
  input.allowCurrentRoomRetryableMetadataFallbackOnceSet(false);
  input.rememberInviteRoom(code, role, input.currentRoomConversationMetadata({ allowRetryableFallback }));
}

export function refreshCurrentRoomAfterReceiveImport(input) {
  const sessionsReady = input.twoProfileSessionsReadyForInput(input.roomInput);
  input.rememberCurrentInviteRoomMetadata();
  input.renderSavedInviteRooms();
  input.renderRoomStatusSummary(input.roomInput, sessionsReady);
  input.renderRoomIdentityBar(input.roomInput, sessionsReady);
  if (input.refreshPlan.messageImported) {
    input.renderProductionTwoProfileMemory(input.roomInput);
  }
}

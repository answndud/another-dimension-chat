export function combinedTwoProfileTranscriptTsv(profileA, profileAResult, profileB, profileBResult) {
  const header = "source_profile\tdirection\tmessage_number\tcreated_at_ms\tttl_seconds\texpires_at_ms\tmessage";
  const rows = [
    ...prefixedTranscriptRows(profileA, profileAResult?.transcript_tsv),
    ...prefixedTranscriptRows(profileB, profileBResult?.transcript_tsv),
  ]
    .sort((left, right) => (
      left.createdAtMs - right.createdAtMs ||
      left.messageNumber - right.messageNumber ||
      left.sourceProfile.localeCompare(right.sourceProfile) ||
      left.direction.localeCompare(right.direction)
    ))
    .map((row) => row.line);
  return `${[header, ...rows].join("\n")}\n`;
}

function prefixedTranscriptRows(profile, transcriptTsv) {
  return String(transcriptTsv ?? "")
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const columns = line.split("\t");
      return {
        sourceProfile: profile,
        direction: columns[0] ?? "",
        messageNumber: Number.parseInt(columns[1] ?? "0", 10) || 0,
        createdAtMs: Number.parseInt(columns[2] ?? "0", 10) || 0,
        line: `${profile}\t${line}`,
      };
    });
}

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

export function transcriptResumeWarningText(input = {}) {
  const {
    target = null,
    baseWarning = "",
    selectedMessageNumber = null,
    staleMessageEnvelopeSlotsPruned = 0,
    expiredMessagesPurged = 0,
    currentLanguage = "en",
    appendExpiredMessagesPurged = (text) => text,
    appendStaleMessageEnvelopeSlotsPruned = (text) => text,
  } = input;
  if (target === "pending-review") {
    return selectedMessageNumber
      ? currentLanguage === "ko"
        ? `메시지 #${selectedMessageNumber}가 아직 완료되지 않았습니다. 대화는 저장되어 있으며 필요한 작업을 이어갈 수 있습니다.`
        : `Message #${selectedMessageNumber} is still pending. The conversation is saved and ready to continue.`
      : baseWarning;
  }
  if (target === "reply-latest") {
    return appendExpiredMessagesPurged(
      appendStaleMessageEnvelopeSlotsPruned(
        "Stored conversation recovered. Latest delivered message is selected as the reply target.",
        staleMessageEnvelopeSlotsPruned,
      ),
      expiredMessagesPurged,
    );
  }
  return baseWarning;
}

export function transcriptRetentionView(entry) {
  const ttlSeconds = Number.parseInt(entry?.ttlSeconds ?? entry?.ttl_seconds ?? 0, 10);
  if (entry?.expired === true) {
    return {
      label: "retention: expired",
      state: "is-expired",
    };
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    return {
      label: "retention: legacy",
      state: "is-unknown",
    };
  }
  return {
    label: `retention: ${retentionDurationLabel(ttlSeconds)} active`,
    state: "is-active",
  };
}

function retentionDurationLabel(ttlSeconds) {
  if (ttlSeconds % 86400 === 0) {
    return `${ttlSeconds / 86400}d`;
  }
  if (ttlSeconds % 3600 === 0) {
    return `${ttlSeconds / 3600}h`;
  }
  if (ttlSeconds % 60 === 0) {
    return `${ttlSeconds / 60}m`;
  }
  return `${ttlSeconds}s`;
}

export function transcriptLoadWarnings(input = {}) {
  const {
    appendExpiredMessagesPurged,
    appendStaleMessageEnvelopeSlotsPruned,
    expiredMessagesPurged = 0,
    staleMessageEnvelopeSlotsPruned = 0,
  } = input;

  const resumeWarning = appendStaleMessageEnvelopeSlotsPruned(
    appendExpiredMessagesPurged(
      "Local stored conversation and message-ready sessions loaded after local unlock.",
      expiredMessagesPurged,
    ),
    staleMessageEnvelopeSlotsPruned,
  );
  const loadedWarning = appendStaleMessageEnvelopeSlotsPruned(
    appendExpiredMessagesPurged(
      "Stored conversation loaded, but sessions are not ready for stored-message send.",
      expiredMessagesPurged,
    ),
    staleMessageEnvelopeSlotsPruned,
  );
  const autoResumeBaseWarning = appendExpiredMessagesPurged(
    appendStaleMessageEnvelopeSlotsPruned(
      "Local stored conversation and message-ready sessions loaded after local unlock. Compare the verification phrase before messaging.",
      staleMessageEnvelopeSlotsPruned,
    ),
    expiredMessagesPurged,
  );
  return {
    resumeWarning,
    loadedWarning,
    autoResumeBaseWarning,
  };
}

export function transcriptLoadUiState(input = {}) {
  const ready = Boolean(input.sessionStatus?.both_ready_for_message_envelope);
  const autoResume = input.autoResume === true;
  const quiet = input.quiet === true;

  if (!quiet) {
    return {
      ready,
      state: ready ? "Conversation resumed" : "Conversation loaded",
      shouldStartRefresh: ready,
      shouldStopRefresh: !ready,
      shouldRenderMemory: ready && input.resumeTarget !== "pending-review",
      shouldAutoSelectPending: !ready,
      warning: ready ? input.resumeWarningText : input.loadedWarning,
      flowKey: ready ? "conversation-loaded" : "session-check",
    };
  }

  if (autoResume && ready) {
    return {
      ready: true,
      state: "Conversation resumed",
      shouldStartRefresh: true,
      shouldStopRefresh: false,
      shouldRenderMemory: input.resumeTarget !== "pending-review",
      shouldAutoSelectPending: false,
      warning: input.autoResumeWarningText,
      flowKey: null,
    };
  }

  if (autoResume) {
    return {
      ready: false,
      state: "Resume needs session check",
      shouldStartRefresh: false,
      shouldStopRefresh: true,
      shouldRenderMemory: false,
      shouldAutoSelectPending: false,
      warning: "Stored conversation was found, but message-ready sessions were not confirmed. Check sessions or run full setup.",
      flowKey: null,
    };
  }

  return {
    ready,
    state: "",
    shouldStartRefresh: false,
    shouldStopRefresh: false,
    shouldRenderMemory: false,
    shouldAutoSelectPending: false,
    warning: "",
    flowKey: null,
  };
}

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

export function createTranscriptController(input) {
  const {
    currentLanguage,
    productionTwoProfileInput,
    twoProfileRoomIdentityInput,
    setProductionTwoProfileState,
    setText,
    fields,
    setProductionBusyAction,
    clearProductionBusyAction,
    applyProductionActionState,
    redactedUiErrorMessage,
    invokeTwoProfileRuntimeResumeStatus,
    runtimeResumeRollbackBlocked,
    applyRuntimeResumeRollbackRecovery,
    invoke,
    twoProfileTranscriptEntriesFromProfile,
    twoProfileTranscriptInputStillCurrent,
    latestTwoProfileSessionStatusForCurrentInput,
    rememberTwoProfileSessionStatus,
    renderProductionTwoProfileSessionStatusResult,
    combinedTwoProfileTranscriptTsv,
    renderProductionTwoProfileTranscriptEntries,
    reconcileCurrentInviteRoomMetadataFromTranscriptEntries,
    refreshRouteReadinessNoticeAfterSessionRefresh,
    clearStaleSendRecoveryNotice,
    appendExpiredMessagesPurged,
    appendStaleMessageEnvelopeSlotsPruned,
    transcriptLoadWarnings,
    autoSelectTwoProfileResumeTarget,
    transcriptLoadUiState,
    twoProfileResumeWarningForTarget,
    renderManualInviteRoomRebuildFlow,
    renderProductionTwoProfileMemory,
    autoSelectPendingTwoProfileConversation,
    invokeInviteRoomSessionStatus,
    twoProfileInviteCodeModeActive,
    twoProfileSessionStatusFingerprint,
    getProductionBusyAction,
    clearLatestTwoProfileSessionStatus,
    twoProfileRecoveryMessage,
    window,
  } = input;

  let inviteRoomTranscriptRefreshTimer = null;
  let inviteRoomTranscriptRefreshFingerprint = "";
  let inviteRoomTranscriptRefreshInFlight = false;

  function stopInviteRoomTranscriptRefresh() {
    if (inviteRoomTranscriptRefreshTimer !== null) {
      window.clearInterval(inviteRoomTranscriptRefreshTimer);
      inviteRoomTranscriptRefreshTimer = null;
    }
    inviteRoomTranscriptRefreshFingerprint = "";
  }

  async function loadProductionTwoProfileTranscript(options = {}) {
    const currentInput = options.input ?? productionTwoProfileInput();
    const { profileA, profileB, passphrase } = currentInput;
    const transcriptInput = twoProfileRoomIdentityInput(currentInput);
    const quiet = options.quiet === true;
    const refreshSessionStatus = options.refreshSessionStatus !== false;
    const autoResume = options.autoResume === true;
    if (!profileA || !profileB || profileA === profileB || !passphrase) {
      if (!quiet) {
        setProductionTwoProfileState("Conversation load needs profiles");
        setText(
          fields.productionTwoProfileWarning,
          currentLanguage === "ko"
            ? "대화를 불러오려면 초대 코드를 먼저 만들거나 붙여넣으세요."
            : "Create or paste an invite code before loading the conversation.",
        );
      }
      return;
    }

    if (!quiet) {
      setProductionTwoProfileState("Conversation loading");
      setText(fields.productionTwoProfileWarning, "Reading stored conversation after local unlock.");
      setProductionBusyAction("two-profile-transcript-load");
      applyProductionActionState();
    }

    try {
      const runtimeResumeResult = options.runtimeResumeResult ?? (
        refreshSessionStatus
          ? await invokeTwoProfileRuntimeResumeStatus({ profileA, profileB, passphrase })
          : null
      );
      if (runtimeResumeRollbackBlocked(runtimeResumeResult)) {
        applyRuntimeResumeRollbackRecovery(runtimeResumeResult, { source: "transcript-load" });
        return false;
      }
      const [profileAResult, profileBResult] = runtimeResumeResult
        ? [runtimeResumeResult.profile_a_transcript, runtimeResumeResult.profile_b_transcript]
        : await Promise.all([
            invoke("production_message_transcript_export", { profile: profileA, passphrase }),
            invoke("production_message_transcript_export", { profile: profileB, passphrase }),
          ]);
      const entries = [
        ...twoProfileTranscriptEntriesFromProfile(profileA, profileB, profileAResult.entries),
        ...twoProfileTranscriptEntriesFromProfile(profileB, profileA, profileBResult.entries),
      ];
      if (!twoProfileTranscriptInputStillCurrent(transcriptInput)) {
        return false;
      }
      const expiredMessagesPurged =
        Number.parseInt(profileAResult.expired_messages_purged ?? 0, 10) +
        Number.parseInt(profileBResult.expired_messages_purged ?? 0, 10);
      let sessionStatus =
        options.sessionStatus ??
        runtimeResumeResult?.session_status ??
        latestTwoProfileSessionStatusForCurrentInput(transcriptInput);
      if (runtimeResumeResult?.session_status) {
        sessionStatus = runtimeResumeResult.session_status;
        rememberTwoProfileSessionStatus(transcriptInput, sessionStatus);
        renderProductionTwoProfileSessionStatusResult(sessionStatus);
        setText(fields.productionPairingWarning, sessionStatus.warning);
      } else if (refreshSessionStatus) {
        sessionStatus = await invokeInviteRoomSessionStatus({
          profileA,
          profileB,
          passphrase,
        });
        if (!twoProfileTranscriptInputStillCurrent(transcriptInput)) {
          return false;
        }
        rememberTwoProfileSessionStatus(transcriptInput, sessionStatus);
        renderProductionTwoProfileSessionStatusResult(sessionStatus);
        setText(fields.productionPairingWarning, sessionStatus.warning);
      }
      if (fields.productionTwoProfileTranscriptExport) {
        fields.productionTwoProfileTranscriptExport.value = combinedTwoProfileTranscriptTsv(
          profileA,
          profileAResult,
          profileB,
          profileBResult,
        );
      }
      const staleMessageEnvelopeSlotsPruned = renderProductionTwoProfileTranscriptEntries(entries, transcriptInput);
      reconcileCurrentInviteRoomMetadataFromTranscriptEntries(entries, {
        input: transcriptInput,
        sessionStatus,
        allowRetryableFallback: options.allowRetryableMetadataFallback,
      });
      if (
        options.suppressRouteReadinessNoticeRefresh !== true &&
        !refreshRouteReadinessNoticeAfterSessionRefresh(transcriptInput)
      ) {
        clearStaleSendRecoveryNotice(transcriptInput);
      }
      const warnings = transcriptLoadWarnings({
        appendExpiredMessagesPurged,
        appendStaleMessageEnvelopeSlotsPruned,
        expiredMessagesPurged,
        staleMessageEnvelopeSlotsPruned,
      });
      if (!quiet) {
        const ready = Boolean(sessionStatus?.both_ready_for_message_envelope);
        const resumeTarget = sessionStatus?.both_ready_for_message_envelope
          ? autoSelectTwoProfileResumeTarget(sessionStatus)
          : null;
        const uiState = transcriptLoadUiState({
          quiet,
          autoResume,
          sessionStatus,
          resumeTarget,
          resumeWarningText: twoProfileResumeWarningForTarget(
            resumeTarget,
            warnings.resumeWarning,
            staleMessageEnvelopeSlotsPruned,
            expiredMessagesPurged,
          ),
          loadedWarning: warnings.loadedWarning,
        });
        setProductionTwoProfileState(uiState.state);
        if (!renderManualInviteRoomRebuildFlow(ready ? "conversation-loaded" : "session-check")) {
          setText(fields.productionTwoProfileWarning, uiState.warning);
        }
        if (uiState.shouldRenderMemory) {
          renderProductionTwoProfileMemory();
        }
        if (uiState.shouldAutoSelectPending) {
          autoSelectPendingTwoProfileConversation();
        }
        if (uiState.shouldStartRefresh) {
          startInviteRoomTranscriptRefresh(transcriptInput);
        } else if (uiState.shouldStopRefresh) {
          stopInviteRoomTranscriptRefresh();
        }
      } else if (autoResume && sessionStatus?.both_ready_for_message_envelope) {
        const resumeTarget = autoSelectTwoProfileResumeTarget(sessionStatus);
        const uiState = transcriptLoadUiState({
          quiet,
          autoResume,
          sessionStatus,
          resumeTarget,
          autoResumeWarningText: twoProfileResumeWarningForTarget(
            resumeTarget,
            warnings.autoResumeBaseWarning,
            staleMessageEnvelopeSlotsPruned,
            expiredMessagesPurged,
          ),
        });
        setProductionTwoProfileState(uiState.state);
        setText(fields.productionTwoProfileWarning, uiState.warning);
        if (uiState.shouldRenderMemory) {
          renderProductionTwoProfileMemory();
        }
        if (uiState.shouldStartRefresh) {
          startInviteRoomTranscriptRefresh(transcriptInput);
        }
      } else if (autoResume) {
        const uiState = transcriptLoadUiState({
          quiet,
          autoResume,
          sessionStatus,
        });
        if (uiState.shouldStopRefresh) {
          stopInviteRoomTranscriptRefresh();
        }
        setProductionTwoProfileState(uiState.state || "Resume needs session check");
        setText(fields.productionTwoProfileWarning, uiState.warning);
      }
      return true;
    } catch (error) {
      if (!quiet) {
        setProductionTwoProfileState("Conversation load failed");
        setText(fields.productionTwoProfileWarning, redactedUiErrorMessage("conversation-load", error));
      } else if (autoResume) {
        clearLatestTwoProfileSessionStatus();
        setProductionTwoProfileState("Resume needs review");
        setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("session-status", error));
      }
      return false;
    } finally {
      if (!quiet) {
        clearProductionBusyAction("two-profile-transcript-load");
        applyProductionActionState();
      }
    }
  }

  function startInviteRoomTranscriptRefresh(currentInput = productionTwoProfileInput()) {
    if (
      !twoProfileInviteCodeModeActive() ||
      !currentInput.profileA ||
      !currentInput.profileB ||
      currentInput.profileA === currentInput.profileB ||
      !currentInput.passphrase
    ) {
      stopInviteRoomTranscriptRefresh();
      return;
    }
    const status = latestTwoProfileSessionStatusForCurrentInput(currentInput);
    if (!status?.both_ready_for_message_envelope) {
      stopInviteRoomTranscriptRefresh();
      return;
    }
    const fingerprint = twoProfileSessionStatusFingerprint(currentInput);
    if (inviteRoomTranscriptRefreshTimer !== null && inviteRoomTranscriptRefreshFingerprint === fingerprint) {
      return;
    }
    stopInviteRoomTranscriptRefresh();
    inviteRoomTranscriptRefreshFingerprint = fingerprint;
    const refresh = async () => {
      if (getProductionBusyAction() !== null || inviteRoomTranscriptRefreshInFlight) {
        return;
      }
      const latestInput = productionTwoProfileInput();
      if (
        twoProfileSessionStatusFingerprint(latestInput) !== fingerprint ||
        !latestTwoProfileSessionStatusForCurrentInput(latestInput)?.both_ready_for_message_envelope
      ) {
        stopInviteRoomTranscriptRefresh();
        return;
      }
      inviteRoomTranscriptRefreshInFlight = true;
      try {
        await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input: currentInput });
      } finally {
        inviteRoomTranscriptRefreshInFlight = false;
      }
    };
    inviteRoomTranscriptRefreshTimer = window.setInterval(() => {
      refresh().catch(() => {
        if (inviteRoomTranscriptRefreshFingerprint === fingerprint) {
          stopInviteRoomTranscriptRefresh();
        }
      });
    }, 1500);
  }

  return {
    loadProductionTwoProfileTranscript,
    startInviteRoomTranscriptRefresh,
    stopInviteRoomTranscriptRefresh,
  };
}

export function createMessageTranscriptController(input) {
  const {
    productionProfileInput,
    setProductionMessageState,
    setText,
    fields,
    setProductionBusyAction,
    clearProductionBusyAction,
    applyProductionActionState,
    redactedUiErrorMessage,
    invoke,
    productionProfileInputStillCurrent,
    renderProductionTranscriptEntries,
    transcriptRetentionWarning,
    transcriptBoundarySummary,
  } = input;

  async function loadProductionMessageTranscript() {
    const currentInput = productionProfileInput();
    const { profile, passphrase } = currentInput;
    if (!profile || !passphrase) {
      setProductionMessageState("Transcript load needs profile");
      setText(fields.productionMessageWarning, "Enter profile and passphrase before loading transcript.");
      return;
    }

    setProductionMessageState("Transcript loading");
    setText(fields.productionMessageWarning, "Reading stored transcript after local unlock.");
    setProductionBusyAction("transcript-load");
    applyProductionActionState();
    if (fields.loadProductionMessageTranscript) {
      fields.loadProductionMessageTranscript.disabled = true;
    }
    try {
      const result = await invoke("production_message_transcript_export", {
        profile,
        passphrase,
      });
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      renderProductionTranscriptEntries(profile, result.entries);
      if (fields.productionMessageTranscriptExport) {
        fields.productionMessageTranscriptExport.value = result.transcript_tsv ?? "";
      }
      setProductionMessageState("Transcript loaded");
      setText(fields.productionMessageWarning, transcriptRetentionWarning(result));
      setText(fields.productionMessageBoundary, transcriptBoundarySummary(result));
    } catch (error) {
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      setProductionMessageState("Transcript load failed");
      setText(fields.productionMessageWarning, redactedUiErrorMessage("transcript-load", error));
    } finally {
      clearProductionBusyAction("transcript-load");
      if (fields.loadProductionMessageTranscript) {
        fields.loadProductionMessageTranscript.disabled = false;
      }
      applyProductionActionState();
    }
  }

  return { loadProductionMessageTranscript };
}

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

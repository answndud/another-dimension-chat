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

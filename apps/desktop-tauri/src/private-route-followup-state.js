export function privateRouteFollowupMatchesRetryableEntry(followup, entry, dependency = {}) {
  const roomFingerprint = String(dependency.roomFingerprint ?? "").trim();
  const sender = String(followup?.retrySender ?? "").trim().toLowerCase();
  const receiver = String(followup?.retryReceiver ?? "").trim().toLowerCase();
  const messageNumber = Number.parseInt(followup?.retryMessageNumber, 10);
  const message = String(followup?.retryMessage ?? "").trim();
  if (!roomFingerprint || !sender || !receiver || !Number.isInteger(messageNumber) || messageNumber < 1) {
    return false;
  }
  return (
    String(entry?.roomFingerprint ?? "").trim() === roomFingerprint &&
    String(entry?.sender ?? "").trim().toLowerCase() === sender &&
    String(entry?.receiver ?? "").trim().toLowerCase() === receiver &&
    Number.parseInt(entry?.messageNumber, 10) === messageNumber &&
    (!message || String(entry?.message ?? "").trim() === message) &&
    dependency.isRetryable?.(entry) === true
  );
}

export function privateRouteFollowupCanResumeDraftSend(followup, input, dependency = {}) {
  const followupFingerprint = String(followup?.messageFingerprint ?? "").trim();
  return (
    followupFingerprint !== "" &&
    followupFingerprint === String(dependency.inputFingerprint?.(input) ?? "").trim() &&
    String(input?.message ?? "").trim() !== ""
  );
}

export function privateRouteFollowupContinuationPlan(input = {}) {
  const action = String(input.action ?? "").trim();
  const manualRebuild = input.manualRebuild === true;
  const hasPendingRetry = input.hasPendingRetry === true;
  const canResumeDraftSend = input.canResumeDraftSend === true;

  if (manualRebuild) {
    if (action === "retry-outbound") {
      return { kind: "manual-retry-outbound", handled: true };
    }
    if (action === "receive") {
      return { kind: "manual-receive", handled: true };
    }
    if (action === "send-draft") {
      return { kind: "manual-send-draft", handled: true };
    }
  }

  if (action === "retry-outbound") {
    return hasPendingRetry
      ? { kind: "retry-outbound-run", handled: true }
      : { kind: "retry-outbound-missing", handled: true };
  }
  if (action === "receive") {
    return { kind: "receive-run", handled: true };
  }
  if (action === "send-draft") {
    return canResumeDraftSend
      ? { kind: "send-draft-run", handled: true }
      : { kind: "send-draft-review", handled: true };
  }
  return { kind: "none", handled: false };
}

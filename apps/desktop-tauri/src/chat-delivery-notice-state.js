export function sendRuntimeOwnerMismatch(result) {
  return Boolean(result?.owner_profile_bound === true && result?.owner_matches_send_profile === false);
}

export function sendAttemptFailureText(result) {
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  return [result?.next_blocker, result?.warning, ...blockers].join(" ").toLowerCase();
}

export function sendFailureNeedsRouteSetup(text) {
  return (
    text.includes("peer-endpoint-missing") ||
    text.includes("endpoint-missing") ||
    text.includes("endpointunavailable") ||
    text.includes("stored remote endpoint unavailable") ||
    text.includes("runtimeownerprofilemismatch")
  );
}

export function sendFailureNeedsStartReceiving(text) {
  return (
    text.includes("localonionendpointnotready") ||
    text.includes("local onion endpoint not ready") ||
    text.includes("receive stopped") ||
    text.includes("receive mode stopped") ||
    text.includes("message listening stopped") ||
    text.includes("message listening is off")
  );
}

export function sendFailureNeedsEndpointRefresh(text) {
  return !sendFailureNeedsRouteSetup(text) && (text.includes("stale") || text.includes("refresh"));
}

export function sendFailureNeedsNetworkRetry(text) {
  const normalized = String(text ?? "").toLowerCase();
  return normalized.includes("persistentclientnotready") || normalized.includes("bootstrap");
}

export function localizedSendFailureMessage(input) {
  const { error, t, sendFailureNeedsStartReceiving, sendFailureNeedsRouteSetup, sendFailureNeedsEndpointRefresh, sendFailureNeedsNetworkRetry } = input;
  const text = String(error ?? "").toLowerCase();
  if (sendFailureNeedsStartReceiving(text)) {
    return t("externalSendNeedsReceive");
  }
  if (text.includes("timeout")) {
    return t("sendTimeout");
  }
  if (sendFailureNeedsRouteSetup(text)) {
    return t("privateDeliveryRouteNeeded");
  }
  if (sendFailureNeedsEndpointRefresh(text)) {
    return t("staleEndpoint");
  }
  if (sendFailureNeedsNetworkRetry(text)) {
    return t("retryNetwork");
  }
  if (text.includes("manualnetworkpermission") || text.includes("permission")) {
    return t("permissionOff");
  }
  if (text.includes("offline") || text.includes("peer")) {
    return t("peerOffline");
  }
  return t("sendFailedGeneric");
}

export function localizedSendAttemptMessage(input) {
  const { result, t, sendAttemptFailureText, sendRuntimeOwnerMismatch, sendFailureNeedsStartReceiving, sendFailureNeedsRouteSetup, sendFailureNeedsNetworkRetry, localizedSendFailureMessage } = input;
  const failureText = sendAttemptFailureText(result);
  if (result?.send_attempt_succeeded) {
    return t("chatNoticeExternalSendWritten");
  }
  if (sendRuntimeOwnerMismatch(result)) {
    return t("sendRuntimeMismatch");
  }
  if (sendFailureNeedsStartReceiving(failureText)) {
    return t("externalSendNeedsReceive");
  }
  if (sendFailureNeedsRouteSetup(failureText)) {
    return t("privateDeliveryRouteNeeded");
  }
  if (result?.peer_endpoint_refresh_recommended || result?.retry_recommended_after_endpoint_refresh) {
    return t("chatNoticeRefreshAddress");
  }
  if (sendFailureNeedsNetworkRetry(failureText)) {
    return t("retryNetwork");
  }
  return localizedSendFailureMessage({ error: failureText, t, sendFailureNeedsStartReceiving, sendFailureNeedsRouteSetup, sendFailureNeedsEndpointRefresh: input.sendFailureNeedsEndpointRefresh, sendFailureNeedsNetworkRetry });
}

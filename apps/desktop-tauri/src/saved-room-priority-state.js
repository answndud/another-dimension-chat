export function savedInviteRoomResumePriorityValue(input = {}) {
  if (input.hasRetryableOutbound === true) {
    return 30;
  }
  if (input.receiveState === "stopping") {
    return 22;
  }
  if (input.routeReadinessAction) {
    if (input.routeReadinessAction === "wait-receive-stop") {
      return 19;
    }
    return 24;
  }
  if (input.hasRealOnionRecovery === true) {
    return 25;
  }
  if (input.receiveState === "paused") {
    return 20;
  }
  if (input.waitingPeerCode === true) {
    return 18;
  }
  return 0;
}

export function savedRoomActionLabelKeyValue(action, fallbackLabelKey = "openRoom") {
  const normalized = String(action ?? "").trim();
  if (normalized === "enable-private-delivery" || normalized === "real-onion-enable-private-delivery") {
    return "savedRoomActionEnableDelivery";
  }
  if (normalized === "prepare-private-route") {
    return "savedRoomActionShareDeliveryCode";
  }
  if (normalized === "refresh-endpoint") {
    return "savedRoomActionUpdateDeliveryCode";
  }
  if (normalized === "refresh-and-retry") {
    return "savedRoomActionUpdateCodeAndRetry";
  }
  if (normalized === "start-receiving") {
    return "savedRoomActionStartReceiving";
  }
  if (normalized === "wait-receive-stop") {
    return "savedRoomActionWaitReceivingStop";
  }
  if (normalized === "retry-network") {
    return "savedRoomActionRetryNetwork";
  }
  if (normalized === "verify-safety") {
    return "savedRoomActionComparePhrase";
  }
  if (normalized === "retry") {
    return "savedRoomActionRetrySavedMessage";
  }
  if (normalized === "paste-peer-code") {
    return "savedRoomActionPastePeerCode";
  }
  if (normalized === "real-onion-retry") {
    return "savedRoomActionRetryDelivery";
  }
  return fallbackLabelKey;
}

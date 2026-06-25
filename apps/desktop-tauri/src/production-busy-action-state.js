export function createProductionBusyActionState(input) {
  const { getAction, setAction, fingerprintForInput, realOnionRoundtripActiveForInput } = input;
  const active = {
    inviteRoomOpenFingerprint: "",
    inviteRoomPrivateRouteCodeFingerprint: "",
    inviteRoomPeerRouteCodeFingerprint: "",
    twoProfileRoundtripFingerprint: "",
    twoProfileMessageRoundtripFingerprint: "",
    twoProfileOnionEnvelopeSendKey: "",
    twoProfilePeerEndpointRefreshFingerprint: "",
    twoProfileOutboundCancelFingerprint: "",
    twoProfileSessionStatusFingerprint: "",
  };

  function clearAction(action) {
    if (getAction() === action) {
      setAction(null);
    }
  }

  function fingerprint(inputValue) {
    return fingerprintForInput(inputValue);
  }

  function setFingerprintAction(action, key, inputValue) {
    setAction(action);
    active[key] = fingerprint(inputValue);
  }

  function clearFingerprintAction(action, key, inputValue) {
    if (getAction() === action && active[key] === fingerprint(inputValue)) {
      active[key] = "";
      clearAction(action);
    }
  }

  function onionEnvelopeSendKey(inputValue, messageNumber) {
    const normalizedNumber = Number.parseInt(messageNumber, 10) || 0;
    return `${fingerprint(inputValue)}\n${normalizedNumber}`;
  }

  function onionEnvelopeSendBusyMatches(inputValue) {
    const inputFingerprint = fingerprint(inputValue);
    return Boolean(
      getAction() === "two-profile-onion-envelope-send" &&
        inputFingerprint &&
        active.twoProfileOnionEnvelopeSendKey.startsWith(`${inputFingerprint}\n`),
    );
  }

  function matchesInput(inputValue) {
    const action = getAction();
    if (action === null) {
      return false;
    }
    if (action === "invite-room-open") {
      return active.inviteRoomOpenFingerprint === fingerprint(inputValue);
    }
    if (action === "invite-room-private-route-code") {
      return active.inviteRoomPrivateRouteCodeFingerprint === fingerprint(inputValue);
    }
    if (action === "invite-room-peer-route-code") {
      return active.inviteRoomPeerRouteCodeFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-roundtrip") {
      return active.twoProfileRoundtripFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-message-roundtrip") {
      return active.twoProfileMessageRoundtripFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-onion-envelope-send") {
      return onionEnvelopeSendBusyMatches(inputValue);
    }
    if (action === "two-profile-peer-endpoint-refresh") {
      return active.twoProfilePeerEndpointRefreshFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-outbound-cancel") {
      return active.twoProfileOutboundCancelFingerprint === fingerprint(inputValue);
    }
    if (action === "two-profile-real-onion-roundtrip") {
      return realOnionRoundtripActiveForInput(inputValue);
    }
    if (action === "two-profile-session-status") {
      return active.twoProfileSessionStatusFingerprint === fingerprint(inputValue);
    }
    return true;
  }

  return {
    clearAction,
    setInviteRoomOpenBusy: (inputValue) =>
      setFingerprintAction("invite-room-open", "inviteRoomOpenFingerprint", inputValue),
    inviteRoomOpenBusyMatches: (inputValue) =>
      getAction() === "invite-room-open" && active.inviteRoomOpenFingerprint === fingerprint(inputValue),
    clearInviteRoomOpenBusy: (inputValue) =>
      clearFingerprintAction("invite-room-open", "inviteRoomOpenFingerprint", inputValue),
    setInviteRoomPrivateRouteCodeBusy: (inputValue) =>
      setFingerprintAction("invite-room-private-route-code", "inviteRoomPrivateRouteCodeFingerprint", inputValue),
    clearInviteRoomPrivateRouteCodeBusy: (inputValue) =>
      clearFingerprintAction("invite-room-private-route-code", "inviteRoomPrivateRouteCodeFingerprint", inputValue),
    setInviteRoomPeerRouteCodeBusy: (inputValue) =>
      setFingerprintAction("invite-room-peer-route-code", "inviteRoomPeerRouteCodeFingerprint", inputValue),
    clearInviteRoomPeerRouteCodeBusy: (inputValue) =>
      clearFingerprintAction("invite-room-peer-route-code", "inviteRoomPeerRouteCodeFingerprint", inputValue),
    setTwoProfileRoundtripBusy: (inputValue) =>
      setFingerprintAction("two-profile-roundtrip", "twoProfileRoundtripFingerprint", inputValue),
    clearTwoProfileRoundtripBusy: (inputValue) =>
      clearFingerprintAction("two-profile-roundtrip", "twoProfileRoundtripFingerprint", inputValue),
    setTwoProfileMessageRoundtripBusy: (inputValue) =>
      setFingerprintAction("two-profile-message-roundtrip", "twoProfileMessageRoundtripFingerprint", inputValue),
    clearTwoProfileMessageRoundtripBusy: (inputValue) =>
      clearFingerprintAction("two-profile-message-roundtrip", "twoProfileMessageRoundtripFingerprint", inputValue),
    twoProfileOnionEnvelopeSendKey: onionEnvelopeSendKey,
    setTwoProfileOnionEnvelopeSendBusy(inputValue, messageNumber) {
      setAction("two-profile-onion-envelope-send");
      active.twoProfileOnionEnvelopeSendKey = onionEnvelopeSendKey(inputValue, messageNumber);
    },
    clearTwoProfileOnionEnvelopeSendBusy(inputValue, messageNumber) {
      if (
        getAction() === "two-profile-onion-envelope-send" &&
        active.twoProfileOnionEnvelopeSendKey === onionEnvelopeSendKey(inputValue, messageNumber)
      ) {
        active.twoProfileOnionEnvelopeSendKey = "";
        clearAction("two-profile-onion-envelope-send");
      }
    },
    twoProfileOnionEnvelopeSendBusyMatches: onionEnvelopeSendBusyMatches,
    setTwoProfilePeerEndpointRefreshBusy: (inputValue) =>
      setFingerprintAction("two-profile-peer-endpoint-refresh", "twoProfilePeerEndpointRefreshFingerprint", inputValue),
    clearTwoProfilePeerEndpointRefreshBusy: (inputValue) =>
      clearFingerprintAction("two-profile-peer-endpoint-refresh", "twoProfilePeerEndpointRefreshFingerprint", inputValue),
    setTwoProfileOutboundCancelBusy: (inputValue) =>
      setFingerprintAction("two-profile-outbound-cancel", "twoProfileOutboundCancelFingerprint", inputValue),
    clearTwoProfileOutboundCancelBusy: (inputValue) =>
      clearFingerprintAction("two-profile-outbound-cancel", "twoProfileOutboundCancelFingerprint", inputValue),
    setTwoProfileSessionStatusBusy: (inputValue) =>
      setFingerprintAction("two-profile-session-status", "twoProfileSessionStatusFingerprint", inputValue),
    clearTwoProfileSessionStatusBusy: (inputValue) =>
      clearFingerprintAction("two-profile-session-status", "twoProfileSessionStatusFingerprint", inputValue),
    matchesInput,
    blocksInput: (inputValue) => Boolean(getAction() && matchesInput(inputValue)),
    isForInput: (action, inputValue) => getAction() === action && matchesInput(inputValue),
  };
}

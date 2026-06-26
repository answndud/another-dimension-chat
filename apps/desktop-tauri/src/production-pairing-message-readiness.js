export function createProductionPairingMessageReadiness(input) {
  const {
    fields,
    hasProfileUnlockInput,
    pairing,
  } = input;

  const hasPairingInput = Boolean(hasProfileUnlockInput && pairing.rendezvousEndpoint);
  const pairingSafetyVerified = Boolean(input.currentPairingSafetyVerified?.(pairing));
  const hasSessionDraftInput = Boolean(
    hasProfileUnlockInput && pairing.localPayload && pairing.remotePayload && pairingSafetyVerified,
  );
  const hasSessionDraftSaved = Boolean(input.latestProductionSessionStateForInput?.(pairing)?.session_draft_present);
  const hasHandshakeReplyInput = Boolean(hasProfileUnlockInput && pairing.initPayload);
  const hasHandshakeFinishInput = Boolean(hasProfileUnlockInput && pairing.replyPayload);
  const hasFinishImportInput = Boolean(hasProfileUnlockInput && pairing.finishPayload);
  const hasLocalPairingPayload = Boolean(fields.productionPairingPayload?.value.trim());
  const hasRemotePairingInput = Boolean(pairing.remotePayload);
  const counterpartProfile = input.productionCounterpartProfile(input.activeProductionProfileName());
  const hasRemotePairingSlot = Boolean(input.productionPayloadSlotReady?.("pairing", counterpartProfile));
  const hasHandshakeInitPayload = Boolean(fields.productionHandshakeInitPayload?.value.trim());
  const hasHandshakeReplyPayload = Boolean(fields.productionHandshakeReplyPayload?.value.trim());
  const hasHandshakeFinishPayload = Boolean(fields.productionHandshakeFinishPayload?.value.trim());
  const hasRemoteHandshakeInitSlot = Boolean(input.productionPayloadSlotReady?.("handshakeInit", counterpartProfile));
  const hasRemoteHandshakeReplySlot = Boolean(input.productionPayloadSlotReady?.("handshakeReply", counterpartProfile));
  const hasRemoteHandshakeFinishSlot = Boolean(input.productionPayloadSlotReady?.("handshakeFinish", counterpartProfile));
  const hasLocalMessageEnvelope = Boolean(fields.productionMessageEnvelope?.value.trim());
  const hasRemoteMessageEnvelopeSlot = Boolean(
    input.activeMessageEnvelopeSlotReady?.(input.activeProductionProfileName()),
  );
  return {
    hasPairingInput,
    pairingSafetyVerified,
    hasSessionDraftInput,
    hasSessionDraftSaved,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasRemotePairingInput,
    counterpartProfile,
    hasRemotePairingSlot,
    hasHandshakeInitPayload,
    hasHandshakeReplyPayload,
    hasHandshakeFinishPayload,
    hasRemoteHandshakeInitSlot,
    hasRemoteHandshakeReplySlot,
    hasRemoteHandshakeFinishSlot,
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
  };
}

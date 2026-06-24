export const lastInviteRoomStorageKey = "ad.lastInviteRoom.v1";
export const inviteRoomsStorageKey = "ad.inviteRooms.v1";
export const receiveIntentRoomsStorageKey = "ad.receiveIntentRooms.v1";
export const localPrivateRouteCodesStorageKey = "ad.localPrivateRouteCodes.v1";
export const localPrivateRouteLifecycleStorageKey = "ad.localPrivateRouteLifecycle.v1";
export const peerPrivateRouteDraftsStorageKey = "ad.peerPrivateRouteDrafts.v1";
export const realOnionRecoveriesStorageKey = "ad.realOnionRecoveries.v1";
export const savedInviteRoomStorageLimit = 24;
export const savedRoomMetadataStartupSyncLimit = 8;
export const realOnionRecoveryPersistenceTtlMs = 24 * 60 * 60 * 1000;
export const manualRebuildRecoveryPersistenceTtlMs = 7 * 24 * 60 * 60 * 1000;
export const privateRouteMapStorageLimit = 48;

export function connectionCodeRoleStorageKey(code, slugify) {
  const slug = slugify(code);
  return `ad.connectionCodeRole.v1.${encodeURIComponent(slug)}`;
}

export function normalizeStoredRealOnionRecovery(record, options = {}) {
  const action = String(record?.action ?? "").trim();
  const reason = String(record?.reason ?? "").trim();
  const now = Number.parseInt(options.now ?? Date.now(), 10) || Date.now();
  const updatedAt = Number.parseInt(record?.updatedAt ?? 0, 10) || now;
  if (
    !new Set([
      "bootstrap-cancelled",
      "enable-private-delivery",
      "inspect-diagnostics",
      "prepare-network-or-bridge",
      "retry-bootstrap",
      "retry-private-delivery",
    ]).has(action)
  ) {
    return null;
  }
  if (updatedAt + realOnionRecoveryPersistenceTtlMs < now) {
    return null;
  }
  return {
    action,
    retryable: record?.retryable === true,
    waitCancellable: false,
    reason: /^[a-z0-9-]{1,96}$/.test(reason) ? reason : "persisted-recovery",
    updatedAt,
  };
}

export function readStoredStringMap(raw, limit = privateRouteMapStorageLimit) {
  const target = new Map();
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const entries = Object.entries(parsed && typeof parsed === "object" ? parsed : {});
    for (const [roomKey, routeCode] of entries.slice(-limit)) {
      const key = String(roomKey ?? "").trim();
      const value = String(routeCode ?? "").trim();
      if (key && value) {
        target.set(key, value);
      }
    }
  } catch {
    target.clear();
  }
  return target;
}

export function serializeStoredStringMap(source, limit = privateRouteMapStorageLimit) {
  return [...source.entries()]
    .map(([roomKey, routeCode]) => [String(roomKey ?? "").trim(), String(routeCode ?? "").trim()])
    .filter(([roomKey, routeCode]) => roomKey && routeCode)
    .slice(-limit);
}

export function readStoredLifecycleMap(raw, limit = privateRouteMapStorageLimit) {
  const target = new Map();
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const entries = Object.entries(parsed && typeof parsed === "object" ? parsed : {});
    for (const [roomKey, record] of entries.slice(-limit)) {
      const key = String(roomKey ?? "").trim();
      const endpoint = String(record?.endpoint ?? "").trim();
      const state = String(record?.state ?? "").trim() === "listening"
        ? "stopped"
        : String(record?.state ?? "").trim();
      if (key && endpoint && state) {
        target.set(key, {
          endpoint,
          state,
          updatedAt: Number.parseInt(record?.updatedAt ?? 0, 10) || 0,
          generation: Number.parseInt(record?.generation ?? 0, 10) || 0,
        });
      }
    }
  } catch {
    target.clear();
  }
  return target;
}

export function serializeStoredLifecycleMap(source, limit = privateRouteMapStorageLimit) {
  return [...source.entries()]
    .map(([roomKey, record]) => [
      String(roomKey ?? "").trim(),
      {
        endpoint: String(record?.endpoint ?? "").trim(),
        state: String(record?.state ?? "").trim(),
        updatedAt: Number.parseInt(record?.updatedAt ?? 0, 10) || 0,
        generation: Number.parseInt(record?.generation ?? 0, 10) || 0,
      },
    ])
    .filter(([roomKey, record]) => roomKey && record.endpoint && record.state)
    .slice(-limit);
}

export function normalizedSavedRoomManualRebuildFlow(value) {
  return value === true || value === "true";
}

export function normalizedSavedRoomManualRebuildDeliveryScope(value) {
  const normalized = String(value ?? "").trim();
  return new Set(["retry", "receive", "delivery-code", "explicit-delivery"]).has(normalized)
    ? normalized
    : "";
}

export function normalizedSavedRoomManualRebuildDeliveryAction(value) {
  const normalized = String(value ?? "").trim();
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : "";
}

export function normalizedSavedRoomManualRebuildMessageNumber(value) {
  return Math.max(0, Number.parseInt(value ?? 0, 10) || 0);
}

export function savedRoomManualRebuildUpdatedAtValue(value) {
  return Number(value ?? 0) || 0;
}

export function savedRoomManualRebuildExpired(updatedAt, now = Date.now()) {
  const timestamp = savedRoomManualRebuildUpdatedAtValue(updatedAt);
  return Boolean(timestamp && now - timestamp > manualRebuildRecoveryPersistenceTtlMs);
}

export function normalizeSavedRoomManualRebuildMetadata(room, now = Date.now()) {
  const manualRebuildUpdatedAt = savedRoomManualRebuildUpdatedAtValue(room?.manualRebuildUpdatedAt);
  const manualRebuildFlow =
    normalizedSavedRoomManualRebuildFlow(room?.manualRebuildFlow) &&
    !savedRoomManualRebuildExpired(manualRebuildUpdatedAt, now);
  return {
    manualRebuildFlow,
    manualRebuildDeliveryScope: manualRebuildFlow
      ? normalizedSavedRoomManualRebuildDeliveryScope(room?.manualRebuildDeliveryScope)
      : "",
    manualRebuildDeliveryAction: manualRebuildFlow
      ? normalizedSavedRoomManualRebuildDeliveryAction(room?.manualRebuildDeliveryAction)
      : "",
    manualRebuildMessageNumber: manualRebuildFlow
      ? normalizedSavedRoomManualRebuildMessageNumber(room?.manualRebuildMessageNumber)
      : 0,
    manualRebuildUpdatedAt: manualRebuildFlow ? manualRebuildUpdatedAt : 0,
  };
}

export function inviteRoomMetadataWithoutManualRebuild(room) {
  return {
    ...room,
    manualRebuildFlow: false,
    manualRebuildDeliveryScope: "",
    manualRebuildDeliveryAction: "",
    manualRebuildMessageNumber: 0,
    manualRebuildUpdatedAt: 0,
  };
}

export function normalizedSavedRoomRetryableMessageNumber(count, value) {
  return count > 0 ? Number.parseInt(value ?? 0, 10) || 0 : 0;
}

export function normalizedSavedRoomRetryableAction(count, value, normalizeAction) {
  return count > 0 ? normalizeAction(value) : "";
}

export function normalizedSavedRoomRetryableMessage(count, value) {
  return count > 0 ? String(value ?? "").trim() : "";
}

export function readSavedInviteRooms(inviteRoomsRaw, lastInviteRoomRaw, options = {}) {
  const normalizeAction = options.normalizeRetryableAction ?? ((value) => String(value ?? "").trim());
  const now = options.now ?? Date.now();
  let rooms = [];
  try {
    const parsed = JSON.parse(inviteRoomsRaw ?? "[]");
    if (Array.isArray(parsed)) {
      rooms = parsed
        .map((room) => {
          const retryableOutboundCount = Math.max(0, Number.parseInt(room?.retryableOutboundCount ?? 0, 10) || 0);
          const manualRebuildMetadata = normalizeSavedRoomManualRebuildMetadata(room, now);
          return {
            code: String(room?.code ?? "").trim(),
            role: room?.role === "inviter" ? "inviter" : room?.role === "joiner" ? "joiner" : "",
            updatedAt: Number(room?.updatedAt ?? 0),
            lastMessagePreview: String(room?.lastMessagePreview ?? "").trim(),
            lastMessageAt: Number(room?.lastMessageAt ?? 0),
            messageCount: Math.max(0, Number.parseInt(room?.messageCount ?? 0, 10) || 0),
            retryableOutboundCount,
            retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
              retryableOutboundCount,
              room?.retryableOutboundMessageNumber,
            ),
            retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
              retryableOutboundCount,
              room?.retryableOutboundMessage,
            ),
            retryableOutboundAction: normalizedSavedRoomRetryableAction(
              retryableOutboundCount,
              room?.retryableOutboundAction,
              normalizeAction,
            ),
            ...manualRebuildMetadata,
          };
        })
        .filter((room) => room.code && room.role);
    }
  } catch {
    rooms = [];
  }
  try {
    const saved = JSON.parse(lastInviteRoomRaw ?? "null");
    const code = String(saved?.code ?? "").trim();
    const role = saved?.role === "inviter" ? "inviter" : saved?.role === "joiner" ? "joiner" : "";
    if (code && role && !rooms.some((room) => room.code === code)) {
      rooms.push({
        code,
        role,
        updatedAt: 0,
        lastMessagePreview: "",
        lastMessageAt: 0,
        messageCount: 0,
        retryableOutboundCount: 0,
        retryableOutboundMessageNumber: 0,
        retryableOutboundMessage: "",
        retryableOutboundAction: "",
        manualRebuildFlow: false,
        manualRebuildDeliveryScope: "",
        manualRebuildDeliveryAction: "",
        manualRebuildMessageNumber: 0,
        manualRebuildUpdatedAt: 0,
      });
    }
  } catch {
    // Ignore legacy room migration failures.
  }
  return rooms.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function roomListStoragePayload(rooms, options = {}) {
  const normalizeAction = options.normalizeRetryableAction ?? ((value) => String(value ?? "").trim());
  const now = options.now ?? Date.now();
  return rooms.slice(0, savedInviteRoomStorageLimit).map((room) => {
    const retryableOutboundCount = Math.max(0, Number.parseInt(room.retryableOutboundCount ?? 0, 10) || 0);
    const manualRebuildMetadata = normalizeSavedRoomManualRebuildMetadata(room, now);
    return {
      code: room.code,
      role: room.role,
      updatedAt: Number(room.updatedAt ?? 0),
      lastMessagePreview: String(room.lastMessagePreview ?? "").trim(),
      lastMessageAt: Number(room.lastMessageAt ?? 0),
      messageCount: Math.max(0, Number.parseInt(room.messageCount ?? 0, 10) || 0),
      retryableOutboundCount,
      retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
        retryableOutboundCount,
        room.retryableOutboundMessageNumber,
      ),
      retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
        retryableOutboundCount,
        room.retryableOutboundMessage,
      ),
      retryableOutboundAction: normalizedSavedRoomRetryableAction(
        retryableOutboundCount,
        room.retryableOutboundAction,
        normalizeAction,
      ),
      ...manualRebuildMetadata,
    };
  });
}

export function inviteRoomMetadataValue(metadata, existing, key) {
  return Object.prototype.hasOwnProperty.call(metadata ?? {}, key) ? metadata[key] : existing?.[key];
}

export function inviteRoomUpdatedAtValue(metadata, existing) {
  if (Object.prototype.hasOwnProperty.call(metadata ?? {}, "updatedAt")) {
    return Number(metadata.updatedAt ?? 0);
  }
  if (Object.keys(metadata ?? {}).length > 0) {
    return Date.now();
  }
  return Number(existing?.updatedAt ?? Date.now());
}

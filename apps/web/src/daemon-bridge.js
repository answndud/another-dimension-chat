/**
 * Narrow browser client for the local security daemon bridge.
 *
 * This module deliberately does not expose cryptography, IndexedDB, or
 * message state. The fragment token is consumed before the first network
 * request and is never sent as a query parameter.
 */
export const DAEMON_UI_VERSION = "web-v1";
export const BOOTSTRAP_PARAM = "ad_bootstrap";
export const SESSION_EXCHANGE_PATH = "/local-session/exchange";

export class DaemonBridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DaemonBridgeError";
    this.code = code;
  }
}

function clearFragment(location, history) {
  const cleanUrl = `${location.pathname || "/"}${location.search || ""}`;
  history?.replaceState?.(null, "Another Dimension", cleanUrl);
}

function readBootstrap(location) {
  const fragment = String(location?.hash || "").replace(/^#/, "");
  if (!fragment) return "";
  const params = new URLSearchParams(fragment);
  const token = params.get(BOOTSTRAP_PARAM) || "";
  if (!token || [...params.keys()].some((key) => key !== BOOTSTRAP_PARAM)) {
    throw new DaemonBridgeError("invalid-bootstrap", "데몬 시작 토큰 형식이 올바르지 않습니다.");
  }
  return token;
}

async function jsonResponse(response) {
  let body = null;
  try { body = await response.json(); } catch { /* preserve generic network error */ }
  if (!response.ok) {
    const error = new DaemonBridgeError(body?.error || "exchange-failed", body?.error || "로컬 보안 데몬 세션을 열 수 없습니다.");
    if (body && typeof body === "object") Object.assign(error, body);
    throw error;
  }
  return body || {};
}

/**
 * Connect once to a daemon bootstrap URL. Returns null when the page was not
 * opened by a daemon-issued one-time URL; the caller must keep the product
 * locked in that case rather than falling back to browser-owned state.
 */
export async function connectDaemonBridge({
  location = globalThis.location,
  history = globalThis.history,
  fetchImpl = globalThis.fetch,
  uiVersion = DAEMON_UI_VERSION,
} = {}) {
  const token = readBootstrap(location);
  if (!token) return null;
  // Remove the secret before fetch: it must not remain in history, screenshots,
  // referrers, or a later retry after a daemon failure.
  clearFragment(location, history);
  if (typeof fetchImpl !== "function") {
    throw new DaemonBridgeError("unavailable", "이 브라우저에서는 로컬 데몬 연결을 사용할 수 없습니다.");
  }
  const origin = String(location?.origin || "");
  if (!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(origin)) {
    throw new DaemonBridgeError("unsafe-origin", "로컬 데몬은 정확한 loopback HTTP 주소에서만 연결할 수 있습니다.");
  }
  let response;
  try {
    response = await fetchImpl(`${origin}${SESSION_EXCHANGE_PATH}`, {
      method: "POST",
      credentials: "include",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-ad-ui-version": uiVersion,
      },
      body: JSON.stringify({ token, ui_version: uiVersion }),
    });
  } catch {
    throw new DaemonBridgeError("unavailable", "로컬 보안 데몬에 연결할 수 없습니다. 데몬을 실행한 뒤 다시 여세요.");
  }
  const credentials = await jsonResponse(response);
  if (typeof credentials.csrf_token !== "string" || credentials.csrf_token.length < 32) {
    throw new DaemonBridgeError("invalid-session", "데몬이 유효한 브라우저 세션을 반환하지 않았습니다.");
  }
  let csrfToken = credentials.csrf_token;
  let renewInFlight = null;
  const renewSession = async () => {
    if (renewInFlight) return renewInFlight;
    renewInFlight = (async () => {
      const result = await fetchImpl(`${origin}/local-session/renew`, {
        method: "POST",
        credentials: "include",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-ad-ui-version": uiVersion,
          "x-ad-csrf": csrfToken,
        },
        body: "{}",
      });
      const renewed = await jsonResponse(result);
      if (typeof renewed.csrf_token !== "string" || renewed.csrf_token.length < 32) {
        throw new DaemonBridgeError("invalid-session", "데몬이 새 브라우저 세션을 반환하지 않았습니다.");
      }
      csrfToken = renewed.csrf_token;
      return renewed;
    })().finally(() => { renewInFlight = null; });
    return renewInFlight;
  };
  const request = async (path, options = {}, retried = false) => {
    const method = options.method || "GET";
    const headers = new Headers(options.headers || {});
    headers.set("accept", "application/json");
    headers.set("x-ad-ui-version", uiVersion);
    if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) headers.set("x-ad-csrf", csrfToken);
    const result = await fetchImpl(`${origin}${path}`, { ...options, method, credentials: "include", headers });
    try {
      return await jsonResponse(result);
    } catch (error) {
      if (!retried && error.code === "session_invalid" && path !== "/local-session/renew") {
        await renewSession();
        return request(path, options, true);
      }
      throw error;
    }
  };
  return Object.freeze({
    origin,
    uiVersion,
    get csrfToken() { return csrfToken; },
    request,
    renewSession,
    relayTrust: () => request("/local-api/relay/trust"),
    saveRelayTlsPin: (tlsPin, retrust = false) => request("/local-api/relay/trust", {
      method: "POST",
      body: JSON.stringify({ tls_pin: tlsPin, retrust }),
    }),
    lock: () => request("/local-api/session/lock", { method: "POST" }),
    wipe: () => request("/local-api/session/wipe", { method: "POST" }),
    recoveryExport: () => request("/local-api/recovery/export", { method: "POST" }),
    recoveryStage: (artifactHex) => request("/local-api/recovery/stage", {
      method: "POST",
      body: JSON.stringify({ artifact_hex: artifactHex }),
    }),
    createConversation: (conversationId) => request("/local-api/session/create", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId }),
    }),
    prepareConversation: (conversationId) => request("/local-api/session/prepare", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId }),
    }),
    joinConversation: (conversationId, welcome) => request("/local-api/session/join", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, welcome }),
    }),
    addMember: (conversationId, keyPackage) => request("/local-api/session/add-member", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, key_package: keyPackage }),
    }),
    sendMessage: (conversationId, plaintext, expiresAt = 0) => request("/local-api/session/send", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, plaintext, ...(expiresAt ? { expires_at: expiresAt } : {}) }),
    }),
    receiveMessage: (conversationId, ciphertext) => request("/local-api/session/receive", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, ciphertext }),
    }),
    sendAttachment: (conversationId, descriptor) => request("/local-api/session/send-attachment", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, descriptor: JSON.stringify(descriptor) }),
    }),
    receiveAttachment: (conversationId, ciphertext) => request("/local-api/session/receive-attachment", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, ciphertext }),
    }),
    startAttachment: (blobId, total, fileName = "", mediaType = "") => request("/local-api/attachment/start", {
      method: "POST",
      body: JSON.stringify({ blob_id: blobId, total, ...(fileName ? { file_name: fileName } : {}), ...(mediaType ? { media_type: mediaType } : {}) }),
    }),
    appendAttachment: (blobId, index, plaintext) => request("/local-api/attachment/append", {
      method: "POST",
      body: JSON.stringify({ blob_id: blobId, index, plaintext }),
    }),
    finishAttachment: (blobId) => request("/local-api/attachment/finish", {
      method: "POST",
      body: JSON.stringify({ blob_id: blobId }),
    }),
    sendCompletedAttachment: (conversationId, inboxUrl, blobId) => request("/local-api/attachment/send", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, inbox_url: inboxUrl, blob_id: blobId }),
    }),
    uploadCompletedAttachment: (inboxUrl, blobId) => request("/local-api/attachment/upload-completed", {
      method: "POST",
      body: JSON.stringify({ inbox_url: inboxUrl, blob_id: blobId }),
    }),
    downloadAttachmentChunk: (attachmentId, inboxUrl, index) => request("/local-api/attachment/download-chunk", {
      method: "POST",
      body: JSON.stringify({ attachment_id: attachmentId, inbox_url: inboxUrl, index }),
    }),
    cancelAttachment: (blobId) => request("/local-api/attachment/cancel", {
      method: "POST",
      body: JSON.stringify({ blob_id: blobId }),
    }),
    postDelivery: (inboxUrl, ciphertext, expiresAt) => request("/local-api/delivery/post", {
      method: "POST",
      body: JSON.stringify({ inbox_url: inboxUrl, ciphertext, expires_at: expiresAt }),
    }),
    deliveryStatus: (digest) => request("/local-api/delivery/status", {
      method: "POST",
      body: JSON.stringify({ digest }),
    }),
    cancelDelivery: (digest) => request("/local-api/delivery/cancel", {
      method: "POST",
      body: JSON.stringify({ digest }),
    }),
    retryDelivery: (inboxUrl, digest) => request("/local-api/delivery/retry", {
      method: "POST",
      body: JSON.stringify({ inbox_url: inboxUrl, digest }),
    }),
    syncDelivery: (conversationId, inboxUrl, background = false) => request("/local-api/delivery/sync", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, inbox_url: inboxUrl, ...(background ? { background: true } : {}) }),
    }),
    ackDelivery: (inboxUrl, ids) => request("/local-api/delivery/ack", {
      method: "POST",
      body: JSON.stringify({ inbox_url: inboxUrl, ids }),
    }),
    pairingStatus: () => request("/local-api/pairing/status"),
    contacts: () => request("/local-api/contacts"),
    devices: () => request("/local-api/devices"),
    revokeDevice: (deviceId) => request("/local-api/devices/revoke", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId }),
    }),
    approveDeviceLink: (linkRequest, code) => request("/local-api/devices/link/approve", {
      method: "POST",
      body: JSON.stringify({ link_request: linkRequest, code }),
    }),
    removeDeviceFromSessions: (accountId, deviceId) => request("/local-api/session/remove-device", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId, device_id: deviceId }),
    }),
    setContactAlias: (accountId, alias) => request("/local-api/contacts/alias", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId, alias }),
    }),
    blockContact: (accountId) => request("/local-api/contacts/block", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }),
    unblockContact: (accountId) => request("/local-api/contacts/unblock", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }),
    deleteContact: (accountId) => request("/local-api/contacts/delete", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }),
    bindContactConversation: (accountId, conversationId) => request("/local-api/contacts/bind-conversation", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId, conversation_id: conversationId }),
    }),
    markContactRead: (accountId) => request("/local-api/contacts/read", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }),
    conversations: () => request("/local-api/conversations"),
    messages: (conversationId, limit = 200, offset = 0) => request("/local-api/messages/list", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, limit, offset }),
    }),
    verifySafety: (safetyNumber) => request("/local-api/pairing/verify-safety", {
      method: "POST",
      body: JSON.stringify({ safety_number: safetyNumber }),
    }),
    unverifySafety: () => request("/local-api/pairing/unverify-safety", { method: "POST" }),
    approvePairing: () => request("/local-api/pairing/approve", { method: "POST" }),
    rejectPairing: () => request("/local-api/pairing/reject", { method: "POST" }),
    createInvite: () => request("/local-api/invites", { method: "POST" }),
    consumeInvite: (relayOrigin, inviteCode) => request("/local-api/invites/consume", {
      method: "POST",
      body: JSON.stringify({ relay_origin: relayOrigin, invite_code: inviteCode }),
    }),
    revokeInvite: (inviteCode) => request("/local-api/invites/revoke", {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode }),
    }),
  });
}

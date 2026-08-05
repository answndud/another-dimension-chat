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
    throw new DaemonBridgeError("exchange-failed", body?.error || "로컬 보안 데몬 세션을 열 수 없습니다.");
  }
  return body || {};
}

/**
 * Connect once to a daemon bootstrap URL. Returns null for an ordinary
 * prototype page, so the existing low-risk web path can remain visibly
 * separated until the daemon HTTP server is implemented.
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
  const csrfToken = credentials.csrf_token;
  const request = async (path, options = {}) => {
    const method = options.method || "GET";
    const headers = new Headers(options.headers || {});
    headers.set("accept", "application/json");
    headers.set("x-ad-ui-version", uiVersion);
    if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) headers.set("x-ad-csrf", csrfToken);
    const result = await fetchImpl(`${origin}${path}`, { ...options, method, credentials: "include", headers });
    return jsonResponse(result);
  };
  return Object.freeze({
    origin,
    uiVersion,
    csrfToken,
    request,
    lock: () => request("/local-api/session/lock", { method: "POST" }),
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
    sendMessage: (conversationId, plaintext) => request("/local-api/session/send", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, plaintext }),
    }),
    receiveMessage: (conversationId, ciphertext) => request("/local-api/session/receive", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, ciphertext }),
    }),
    pairingStatus: () => request("/local-api/pairing/status"),
    verifySafety: (safetyNumber) => request("/local-api/pairing/verify-safety", {
      method: "POST",
      body: JSON.stringify({ safety_number: safetyNumber }),
    }),
    approvePairing: () => request("/local-api/pairing/approve", { method: "POST" }),
    rejectPairing: () => request("/local-api/pairing/reject", { method: "POST" }),
  });
}

export async function consumeRelayInvite(relayOrigin, code, { fetchImpl = globalThis.fetch } = {}) {
  let origin;
  try { origin = new URL(String(relayOrigin)).origin; } catch { throw new DaemonBridgeError("invalid-relay", "relay 주소가 올바르지 않습니다."); }
  const url = new URL(origin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback) throw new DaemonBridgeError("unsafe-relay", "원격 relay는 HTTPS에서만 사용할 수 있습니다.");
  if (typeof fetchImpl !== "function") throw new DaemonBridgeError("unavailable", "relay에 연결할 수 없습니다.");
  let response;
  try {
    response = await fetchImpl(`${origin}/api/v1/invite-codes/consume`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ code: String(code || "") }),
    });
  } catch { throw new DaemonBridgeError("relay-unavailable", "relay에 연결할 수 없습니다."); }
  const body = await jsonResponse(response);
  if (body.consumed !== true || typeof body.invite !== "string" || typeof body.receipt !== "string") throw new DaemonBridgeError("invite-consume-failed", "초대코드가 유효하지 않거나 이미 사용되었습니다.");
  return body;
}

export async function createRelayInviteCode(relayOrigin, signedInvite, { fetchImpl = globalThis.fetch } = {}) {
  let origin;
  try { origin = new URL(String(relayOrigin)).origin; } catch { throw new DaemonBridgeError("invalid-relay", "relay 주소가 올바르지 않습니다."); }
  const url = new URL(origin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback) throw new DaemonBridgeError("unsafe-relay", "원격 relay는 HTTPS에서만 사용할 수 있습니다.");
  if (typeof fetchImpl !== "function") throw new DaemonBridgeError("unavailable", "relay에 연결할 수 없습니다.");
  let response;
  try {
    response = await fetchImpl(`${origin}/api/v1/invite-codes/public`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ invite: String(signedInvite || "") }),
    });
  } catch { throw new DaemonBridgeError("relay-unavailable", "relay에 연결할 수 없습니다."); }
  const body = await jsonResponse(response);
  if (body.created !== true || typeof body.code !== "string" || typeof body.inviteDigest !== "string") throw new DaemonBridgeError("invite-create-failed", "relay가 초대코드를 발급하지 않았습니다.");
  return body;
}

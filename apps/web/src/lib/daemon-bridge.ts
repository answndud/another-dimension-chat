export const DAEMON_UI_VERSION = "web-v1";
export const BOOTSTRAP_PARAM = "ad_bootstrap";
export const SESSION_EXCHANGE_PATH = "/local-session/exchange";

export interface DaemonBridgeError extends Error {
  code: string;
}

export function makeDaemonBridgeError(code: string, message: string): DaemonBridgeError {
  const error = new Error(message) as DaemonBridgeError;
  error.code = code;
  return error;
}

function clearFragment(location: Location, history: History): void {
  const cleanUrl = `${location.pathname || "/"}${location.search || ""}`;
  history?.replaceState?.(null, "Another Dimension", cleanUrl);
}

function readBootstrap(location: Location): string {
  const fragment = String(location?.hash || "").replace(/^#/, "");
  if (!fragment) return "";
  const params = new URLSearchParams(fragment);
  const token = params.get(BOOTSTRAP_PARAM) || "";
  if (!token || [...params.keys()].some((key) => key !== BOOTSTRAP_PARAM)) {
    throw makeDaemonBridgeError("invalid-bootstrap", "보안 서비스 시작 토큰 형식이 올바르지 않습니다.");
  }
  return token;
}

async function jsonResponse<T>(response: Response): Promise<T> {
  let body: Record<string, unknown> | null = null;
  try { body = await response.json(); } catch { /* generic network error */ }
  if (!response.ok) {
    const code = (body?.error as string) || "exchange-failed";
    const error = makeDaemonBridgeError(code, body?.error ? String(body.error) : "로컬 보안 서비스 세션을 열 수 없습니다.");
    if (body && typeof body === "object") Object.assign(error, body);
    throw error;
  }
  return (body || {}) as T;
}

export interface IdentityView {
  account_id: string;
  device_id: string;
  display_name: string;
}

export interface PairingStatus {
  state: string;
  safety_number?: string;
  safety_verified?: boolean;
  inbox_url?: string;
  conversation_id?: string;
  account_id?: string;
}

export interface Contact {
  account_id: string;
  alias?: string;
  state: string;
  conversation_id?: string;
  peer_inbox_url?: string;
}

export interface DeviceInfo {
  device_id: string;
  state: string;
}

export interface DeviceEvent {
  kind: "registered" | "revoked";
  device_id: string;
  at: number;
}

export interface RelayTrustInfo {
  relay_origin: string;
  tls_pin?: string;
}

export function hexToText(hex: string): string {
  const clean = String(hex || "");
  if (!clean || clean.length % 2 || !/^[0-9a-f]+$/i.test(clean)) return "";
  const bytes = Uint8Array.from(clean.match(/.{2}/g)!, (pair) => Number.parseInt(pair, 16));
  return new TextDecoder().decode(bytes);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = String(hex || "");
  if (!clean || clean.length % 2 || !/^[0-9a-f]+$/i.test(clean)) return new Uint8Array(0);
  return Uint8Array.from(clean.match(/.{2}/g)!, (pair) => Number.parseInt(pair, 16));
}

export interface DaemonBridge {
  request<T = Record<string, unknown>>(path: string, options?: RequestInit): Promise<T>;
  status(): Promise<Record<string, unknown>>;
  identity(): Promise<IdentityView>;
  setupProfile(displayName: string): Promise<{ status: string; account_id: string }>;
  lockSession(): Promise<void>;
  wipeSession(): Promise<void>;
  exportRecovery(): Promise<void>;
  relayTrust(): Promise<RelayTrustInfo>;
  createInvite(): Promise<{ invite_code: string }>;
  consumeInvite(relayOrigin: string, inviteCode: string): Promise<PairingStatus>;
  revokeInvite(inviteCode: string): Promise<void>;
  pairingStatus(): Promise<PairingStatus>;
  verifySafety(safetyNumber: string): Promise<PairingStatus>;
  unverifySafety(): Promise<PairingStatus>;
  approvePairing(): Promise<PairingStatus>;
  rejectPairing(): Promise<PairingStatus>;
  autoSyncPairing(inviteCode: string): Promise<PairingStatus>;
  completePairingSession(inviteCode: string): Promise<{ state: string }>;
  contacts(): Promise<{ contacts: Contact[] }>;
  conversations(): Promise<{ conversations: Array<string | { id: string }> }>;
  messages(conversationId: string, limit?: number, offset?: number): Promise<{
    messages: Array<{ message_id?: string; plaintext?: string; direction?: string; created_at?: number }>;
    next_offset?: number;
  }>;
  sendMessage(conversationId: string, text: string, expirySeconds?: number): Promise<{ digest: string }>;
  receiveMessages(conversationId: string): Promise<{ messages: unknown[] }>;
  syncDelivery(conversationId: string, inboxUrl: string): Promise<{ messages?: unknown[] }>;
  addGroupMember(conversationId: string, accountId: string): Promise<void>;
  removeGroupMember(conversationId: string, deviceCredential: string): Promise<void>;
  devices(): Promise<{ devices: DeviceInfo[]; events: DeviceEvent[] }>;
  revokeDevice(deviceId: string): Promise<void>;
  deviceLinkRequest(): Promise<{ request: string; code: string }>;
  deviceLinkApprove(request: string, code: string): Promise<{ approval: string }>;
  createAttestation(subjectAccountId: string, subjectDeviceKey: string): Promise<unknown>;
  listAttestations(): Promise<unknown[]>;
  setContactAlias(accountId: string, alias: string): Promise<void>;
  blockContact(accountId: string): Promise<void>;
  unblockContact(accountId: string): Promise<void>;
  deleteContact(accountId: string): Promise<void>;
  markContactRead(accountId: string): Promise<void>;
}

export async function connectDaemonBridge({
  location = globalThis.location,
  history = globalThis.history,
  fetchImpl = globalThis.fetch,
  uiVersion = DAEMON_UI_VERSION,
}: {
  location?: Location;
  history?: History;
  fetchImpl?: typeof fetch;
  uiVersion?: string;
} = {}): Promise<DaemonBridge | null> {
  const token = readBootstrap(location);
  if (!token) return null;
  clearFragment(location, history);
  if (typeof fetchImpl !== "function") {
    throw makeDaemonBridgeError("unavailable", "이 브라우저에서는 로컬 보안 서비스 연결을 사용할 수 없습니다.");
  }
  const origin = String(location?.origin || "");
  if (!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(origin)) {
    throw makeDaemonBridgeError("unsafe-origin", "로컬 보안 서비스는 정확한 loopback HTTP 주소에서만 연결할 수 있습니다.");
  }

  let response: Response;
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
    throw makeDaemonBridgeError("unavailable", "보안 서비스를 찾을 수 없습니다. Another Dimension 앱을 다시 열어 보세요.");
  }
  const credentials = await jsonResponse<{ csrf_token: string }>(response);
  if (typeof credentials.csrf_token !== "string" || credentials.csrf_token.length < 32) {
    throw makeDaemonBridgeError("invalid-session", "보안 서비스가 유효한 브라우저 세션을 반환하지 않았습니다.");
  }
  let csrfToken = credentials.csrf_token;
  let renewInFlight: Promise<{ csrf_token: string }> | null = null;

  const renewSession = async (): Promise<{ csrf_token: string }> => {
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
      const renewed = await jsonResponse<{ csrf_token: string }>(result);
      if (typeof renewed.csrf_token !== "string" || renewed.csrf_token.length < 32) {
        throw makeDaemonBridgeError("invalid-session", "보안 서비스가 새 브라우저 세션을 반환하지 않았습니다.");
      }
      csrfToken = renewed.csrf_token;
      return renewed;
    })().finally(() => { renewInFlight = null; });
    return renewInFlight;
  };

  const request = async <T = Record<string, unknown>>(path: string, options: RequestInit = {}, retried = false): Promise<T> => {
    const method = options.method || "GET";
    const headers = new Headers(options.headers || {});
    headers.set("accept", "application/json");
    headers.set("x-ad-ui-version", uiVersion);
    if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) headers.set("x-ad-csrf", csrfToken);
    let result: Response;
    try {
      result = await fetchImpl(`${origin}${path}`, { ...options, method, credentials: "include", headers });
    } catch {
      throw makeDaemonBridgeError("unavailable", "보안 서비스에 연결할 수 없습니다. 앱이 실행 중인지 확인하세요.");
    }
    if (result.status === 401 && !retried) {
      await renewSession();
      return request<T>(path, options, true);
    }
    return jsonResponse<T>(result);
  };

  return {
    request,
    status: () => request("/local-api/status"),
    identity: () => request("/local-api/identity"),
    setupProfile: (displayName) =>
      request("/local-api/setup/profile", { method: "POST", body: JSON.stringify({ display_name: displayName }) }),
    lockSession: async () => { await request("/local-api/session/lock", { method: "POST" }); },
    wipeSession: async () => { await request("/local-api/session/wipe", { method: "POST" }); },
    exportRecovery: async () => {
      const blob = await request<Blob>("/local-api/recovery/export");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "another-dimension-recovery.adbackup";
      anchor.click();
      URL.revokeObjectURL(url);
    },
    relayTrust: () => request("/local-api/relay/trust"),
    createInvite: () => request("/local-api/invites", { method: "POST" }),
    consumeInvite: (relayOrigin, inviteCode) =>
      request("/local-api/invites/consume", { method: "POST", body: JSON.stringify({ relay_origin: relayOrigin, invite_code: inviteCode }) }),
    revokeInvite: async (inviteCode) => {
      await request("/local-api/invites/revoke", { method: "POST", body: JSON.stringify({ invite_code: inviteCode }) });
    },
    pairingStatus: () => request("/local-api/pairing/status"),
    verifySafety: (safetyNumber) =>
      request("/local-api/pairing/verify-safety", { method: "POST", body: JSON.stringify({ safety_number: safetyNumber }) }),
    unverifySafety: async () => {
      return await request("/local-api/pairing/unverify-safety", { method: "POST" }) as PairingStatus;
    },
    approvePairing: async () => {
      return await request("/local-api/pairing/approve", { method: "POST" }) as PairingStatus;
    },
    rejectPairing: async () => {
      return await request("/local-api/pairing/reject", { method: "POST" }) as PairingStatus;
    },
    autoSyncPairing: (inviteCode) =>
      request("/local-api/pairing/auto-sync", { method: "POST", body: JSON.stringify({ invite_code: inviteCode }) }),
    completePairingSession: (inviteCode) =>
      request("/local-api/pairing/complete-session", { method: "POST", body: JSON.stringify({ invite_code: inviteCode }) }),
    contacts: () => request("/local-api/contacts"),
    conversations: () => request("/local-api/conversations"),
    messages: (conversationId, limit = 200, offset = 0) =>
      request("/local-api/messages/list", { method: "POST", body: JSON.stringify({ conversation_id: conversationId, limit, offset }) }),
    sendMessage: (conversationId, text, expirySeconds = 0) =>
      request("/local-api/session/send", { method: "POST", body: JSON.stringify({ conversation_id: conversationId, text, expiry_seconds: expirySeconds }) }),
    receiveMessages: async (conversationId) => {
      return await request("/local-api/session/receive", { method: "POST", body: JSON.stringify({ conversation_id: conversationId }) }) as { messages: unknown[] };
    },
    syncDelivery: (conversationId, inboxUrl) =>
      request("/local-api/delivery/sync", { method: "POST", body: JSON.stringify({ conversation_id: conversationId, inbox_url: inboxUrl }) }),
    addGroupMember: async (conversationId) => {
      const keyPackage = await request<{ key_package?: string }>("/local-api/session/prepare", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId }),
      });
      if (!keyPackage.key_package) throw new Error("멤버 key package를 가져올 수 없습니다.");
      await request("/local-api/session/add-member", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId, key_packages: [keyPackage.key_package] }),
      });
    },
    removeGroupMember: (conversationId, deviceCredential) =>
      request("/local-api/session/remove-member", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId, device_credential: deviceCredential }),
      }),
    devices: () => request("/local-api/devices"),
    revokeDevice: async (deviceId) => {
      await request("/local-api/devices/revoke", { method: "POST", body: JSON.stringify({ device_id: deviceId }) });
    },
    deviceLinkRequest: async () => {
      return await request("/local-api/devices/link-request", { method: "POST" }) as { request: string; code: string };
    },
    deviceLinkApprove: async (linkRequest, code) => {
      return await request("/local-api/devices/link/approve", {
        method: "POST",
        body: JSON.stringify({ link_request: linkRequest, code }),
      }) as { approval: string };
    },
    createAttestation: (subjectAccountId, subjectDeviceKey) =>
      request("/local-api/attestations/create", {
        method: "POST",
        body: JSON.stringify({ subject_account_id: subjectAccountId, subject_device_public_key: subjectDeviceKey }),
      }),
    listAttestations: () => request("/local-api/attestations/list"),
    setContactAlias: async (accountId, alias) => {
      await request("/local-api/contacts/alias", { method: "POST", body: JSON.stringify({ account_id: accountId, alias }) });
    },
    blockContact: async (accountId) => {
      await request("/local-api/contacts/block", { method: "POST", body: JSON.stringify({ account_id: accountId }) });
    },
    unblockContact: async (accountId) => {
      await request("/local-api/contacts/unblock", { method: "POST", body: JSON.stringify({ account_id: accountId }) });
    },
    deleteContact: async (accountId) => {
      await request("/local-api/contacts/delete", { method: "POST", body: JSON.stringify({ account_id: accountId }) });
    },
    markContactRead: async (accountId) => {
      await request("/local-api/contacts/read", { method: "POST", body: JSON.stringify({ account_id: accountId }) });
    },
  };
}

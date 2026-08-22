import { useState, useEffect, useCallback, useRef } from "react";
import {
  connectDaemonBridge,
  hexToText,
  type DaemonBridge,
  type IdentityView,
  type PairingStatus,
  type Contact,
  type DeviceInfo,
  type DeviceEvent,
} from "../lib/daemon-bridge";
import { useWebSocket } from "./useWebSocket";

export type DaemonScreen =
  | "loading" | "unsupported-browser" | "disconnected"
  | "setup" | "initializing" | "corrupt" | "unsupported-environment"
  | "locked" | "recovery" | "relay" | "ready" | "error";

export interface ChatMessage {
  id: string;
  text: string;
  direction: string;
  createdAt: number;
  attachmentId?: string;
}

export interface DaemonState {
  bridge: DaemonBridge | null;
  screen: DaemonScreen;
  identity: IdentityView | null;
  pairing: PairingStatus | null;
  contacts: Contact[];
  conversationIds: string[];
  selectedContact: string;
  messages: ChatMessage[];
  devices: DeviceInfo[];
  deviceEvents: DeviceEvent[];
  relayOrigin: string;
  inboxUrl: string;
  invite: { invite_code: string } | null;
  busy: boolean;
  error: string;
  notice: string;
}

function screenForStatus(status: unknown, connected: boolean, browserSupported = true): DaemonScreen {
  if (!browserSupported) return "unsupported-browser";
  if (!connected) return "disconnected";
  const s = typeof status === "string" ? status : "";
  switch (s) {
    case "not_initialized":
    case "setup-required": return "setup";
    case "initializing": return "initializing";
    case "corrupt": return "corrupt";
    case "unsupported": return "unsupported-environment";
    case "locked": return "locked";
    case "recovery_required": return "recovery";
    case "relay_unconfigured": return "relay";
    case "ready":
    case "daemon-session-active": return "ready";
    default: return s ? "error" : "loading";
  }
}

export function useDaemon() {
  const [state, setState] = useState<DaemonState>({
    bridge: null,
    screen: "loading",
    identity: null,
    pairing: null,
    contacts: [],
    conversationIds: [],
    selectedContact: "",
    messages: [],
    devices: [],
    deviceEvents: [],
    relayOrigin: "",
    inboxUrl: "",
    invite: null,
    busy: false,
    error: "",
    notice: "",
  });
  const bridgeRef = useRef<DaemonBridge | null>(null);
  const [initialized, setInitialized] = useState(false);
  const contactsRef = useRef<Contact[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "online" | "reconnecting" | "offline">("connecting");

  const handleIncoming = useCallback((conversationId: string, incoming: Array<{ id?: string; attachment_id?: string; expired?: boolean; plaintext?: string; created_at?: number }>) => {
    const selected = contactsRef.current.find((contact) => contact.conversation_id === conversationId);
    if (!selected || selected.account_id !== state.selectedContact) return;
    const mapped = incoming.map((message): ChatMessage => ({
      id: message.id || "",
      text: message.attachment_id ? "암호화 첨부파일" : message.expired ? "만료된 메시지" : message.plaintext ? hexToText(message.plaintext) : "",
      direction: "incoming",
      createdAt: Number(message.created_at) || 0,
      attachmentId: message.attachment_id,
    }));
    setState((current) => {
      const known = new Set(current.messages.map((message) => message.id));
      const fresh = mapped.filter((message) => message.id && !known.has(message.id));
      return fresh.length ? { ...current, messages: [...current.messages, ...fresh] } : current;
    });
  }, [state.selectedContact]);

  const status = useWebSocket(state.bridge, state.contacts, state.selectedContact, state.inboxUrl, handleIncoming);
  useEffect(() => { setRealtimeStatus(status); }, [status]);

  const inviteToGroup = useCallback(async (accountIds: string[]) => {
    const bridge = bridgeRef.current;
    const selected = state.selectedContact;
    const selectedContact = contactsRef.current.find((contact) => contact.account_id === selected);
    if (!bridge || !selectedContact?.conversation_id) return;
    try {
      for (const accountId of accountIds) {
        await bridge.addGroupMember(selectedContact.conversation_id, accountId);
      }
      setState((current) => ({
        ...current,
        notice: `${accountIds.length}명을 그룹에 초대했습니다.`,
      }));
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "그룹 초대 실패" }));
    }
  }, [state.selectedContact]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const ua = navigator.userAgent || "";
        const isFirefox = /Firefox\//.test(ua);
        const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/CriOS/.test(ua) && !/EdgiOS/.test(ua);
        const supported = !isFirefox && !isSafari;
        const bridge = await connectDaemonBridge();
        if (!bridge) {
          if (!cancelled) setState((s) => ({ ...s, screen: "disconnected", notice: "Another Dimension 앱이 실행 중인지 확인한 뒤 앱을 다시 열어 보안 화면을 여세요." }));
          setInitialized(true);
          return;
        }
        if (!cancelled) setState((s) => ({ ...s, bridge, screen: "loading" }));
        bridgeRef.current = bridge;
        const statusResult = await bridge.status();
        const daemonStatus = String((statusResult as Record<string, unknown>).status || "");
        const screen = screenForStatus(daemonStatus, true, supported);
        if (!cancelled) setState((s) => ({ ...s, screen }));
        if (screen === "ready") {
          const identity = await bridge.identity();
          const pairing = await bridge.pairingStatus();
          const trust = await bridge.relayTrust();
          let contacts: Contact[] = [];
          let conversationIds: string[] = [];
          let devices: DeviceInfo[] = [];
          let deviceEvents: DeviceEvent[] = [];
          try {
            contacts = (await bridge.contacts()).contacts || [];
            contactsRef.current = contacts;
            const convos = await bridge.conversations();
            conversationIds = (convos.conversations || []).map((c: unknown) =>
              typeof c === "string" ? c : (c as { id?: string }).id || ""
            );
            const dev = await bridge.devices();
            devices = dev.devices || [];
            deviceEvents = dev.events || [];
          } catch { /* older daemon */ }
          const trustRecord = trust as unknown as Record<string, unknown>;
          if (!cancelled) {
            setState((s) => ({
              ...s,
              identity,
              pairing,
              contacts,
              conversationIds,
              devices,
              deviceEvents,
              relayOrigin: String(trustRecord.relay_origin || ""),
              inboxUrl: String(pairing.inbox_url || ""),
              notice: "브라우저 보안 경계를 확인했습니다.",
            }));
          }
        }
        setInitialized(true);
      } catch (error) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            screen: "error",
            error: error instanceof Error ? error.message : "보안 서비스 연결 실패",
          }));
        }
        setInitialized(true);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  const selectContact = useCallback(async (accountId: string) => {
    setState((s) => ({ ...s, selectedContact: accountId, messages: [] }));
    const bridge = bridgeRef.current;
    if (!bridge) return;
    const contact = contactsRef.current.find((c) => c.account_id === accountId);
    const conversationId = contact?.conversation_id || "";
    if (!conversationId) return;
    try {
      const result = await bridge.messages(conversationId, 200, 0);
      const messages = (result.messages || []).map((m): ChatMessage => ({
        id: m.message_id || "",
        text: m.plaintext ? hexToText(m.plaintext) : "",
        direction: m.direction === "outgoing" ? "outgoing" : "incoming",
        createdAt: Number(m.created_at) || 0,
      }));
      setState((s) => ({ ...s, messages }));
    } catch { /* silent */ }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const bridge = bridgeRef.current;
    const selected = state.selectedContact;
    if (!bridge || !selected) return;
    const contact = contactsRef.current.find((c) => c.account_id === selected);
    const conversationId = contact?.conversation_id || "";
    if (!conversationId || !text.trim()) return;
    setState((s) => ({ ...s, busy: true }));
    try {
      await bridge.sendMessage(conversationId, text);
      await selectContact(selected);
    } catch (error) {
      setState((s) => ({ ...s, error: error instanceof Error ? error.message : "" }));
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }, [state.selectedContact, selectContact]);

  return { state, initialized, realtimeStatus, selectContact, sendMessage, inviteToGroup };
}

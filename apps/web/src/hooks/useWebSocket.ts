import { useEffect, useRef, useCallback, useState } from "react";
import type { DaemonBridge } from "../lib/daemon-bridge";
import type { Contact } from "../lib/daemon-bridge";

export type RealtimeStatus = "connecting" | "online" | "reconnecting" | "offline";

type IncomingMessage = {
  id?: string;
  attachment_id?: string;
  expired?: boolean;
  plaintext?: string;
  created_at?: number;
};

export function useWebSocket(
  bridge: DaemonBridge | null,
  contacts: Contact[],
  selectedContact: string,
  inboxUrl: string,
  onMessages: (conversationId: string, messages: IncomingMessage[]) => void
) {
  const allContactsRef = useRef<Contact[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const selectedRef = useRef(selectedContact);
  const contactsRef = useRef(contacts);
  selectedRef.current = selectedContact;
  contactsRef.current = contacts;
  allContactsRef.current = contacts;

  const syncConversation = useCallback(async (conversationId: string) => {
    if (!bridge || !inboxUrl || !conversationId) return;
    try {
      const result = await bridge.syncDelivery(conversationId, inboxUrl);
      const messages = (Array.isArray(result.messages) ? result.messages : []) as IncomingMessage[];
      if (messages.length) onMessages(conversationId, messages);
    } catch { /* reconnect or next event retries */ }
  }, [bridge, inboxUrl, onMessages]);

  const syncAllConversations = useCallback(async () => {
    if (!bridge || !inboxUrl) return;
    for (const contact of contactsRef.current) {
      if (contact.conversation_id) {
        await syncConversation(contact.conversation_id);
      }
    }
  }, [bridge, inboxUrl, syncConversation]);

  useEffect(() => {
    if (!bridge) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    const connect = () => {
      if (closed) return;
      setStatus((current) => (current === "online" ? "reconnecting" : "connecting"));
      const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/local-api/events`);
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        setStatus("online");
        void syncAllConversations();
      });
      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; conversation_ids?: string[] };
          if (payload.type !== "messages_updated") return;
          const contact = contactsRef.current.find((item) => item.account_id === selectedRef.current);
          const conversationId = contact?.conversation_id;
          if (conversationId && (!payload.conversation_ids || payload.conversation_ids.includes(conversationId))) {
            void syncConversation(conversationId);
          }
        } catch { /* malformed event */ }
      });
      socket.addEventListener("close", () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (!closed) {
          setStatus("reconnecting");
          retry = setTimeout(connect, 3000);
        }
      });
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socketRef.current?.close();
    };
  }, [bridge, syncConversation]);

  useEffect(() => {
    if (status === "online" && bridge && inboxUrl) {
      const contact = contactsRef.current.find((item) => item.account_id === selectedContact);
      if (contact?.conversation_id) void syncConversation(contact.conversation_id);
    }
  }, [status, bridge, inboxUrl, selectedContact, syncConversation]);

  return status;
}

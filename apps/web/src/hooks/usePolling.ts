import { useEffect, useRef, useCallback } from "react";
import type { DaemonBridge } from "../lib/daemon-bridge";

const DEFAULT_INTERVAL_MS = 5000;

export function usePolling(
  bridge: DaemonBridge | null,
  conversationId: string | null,
  onNewMessages: (messages: Array<{ message_id?: string; plaintext?: string; direction?: string; created_at?: number }>) => void
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const poll = useCallback(async () => {
    if (!bridge || !conversationId || !activeRef.current) return;
    try {
      const result = await bridge.receiveMessages(conversationId);
      if (Array.isArray(result.messages) && result.messages.length > 0) {
        onNewMessages(result.messages as Array<{ message_id?: string; plaintext?: string; direction?: string; created_at?: number }>);
      }
    } catch { /* silent retry */ }
  }, [bridge, conversationId, onNewMessages]);

  const start = useCallback(() => {
    if (timerRef.current) return;
    activeRef.current = true;
    timerRef.current = setInterval(() => { void poll(); }, DEFAULT_INTERVAL_MS);
  }, [poll]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (bridge && conversationId) start();
    else stop();
    return stop;
  }, [bridge, conversationId, start, stop]);

  return { start, stop };
}

import { useState, useRef, useEffect } from "react";
import type { Contact } from "../lib/daemon-bridge";
import type { DaemonState } from "../hooks/useDaemon";

interface Props {
  contact: Contact | null;
  messages: DaemonState["messages"];
  busy: boolean;
  onSend: (text: string) => void;
}

export function Conversation({ contact, messages, busy, onSend }: Props) {
  const [text, setText] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || busy) return;
    onSend(text.trim());
    setText("");
  };

  const title = contact?.alias || contact?.account_id?.slice(0, 18) || "연락처를 선택하세요";
  const conversationReady = Boolean(contact?.conversation_id);

  return (
    <section className="daemon-session-tools daemon-conversation-panel">
      <header className="daemon-conversation-heading">
        <div>
          <span className="eyebrow">암호화 대화</span>
          <h2>{title}</h2>
          <p className="field-note">브라우저는 입력과 표시만 담당하고, 암호화 키와 대화 상태는 로컬 보안 서비스가 보관합니다.</p>
        </div>
        {contact && (
          <span className="pill">{contact.state}{contact.conversation_id ? " · 연결됨" : " · 준비 필요"}</span>
        )}
      </header>

      {!contact ? (
        <section className="daemon-session-setup">
          <strong>왼쪽 연락처에서 대화 상대를 선택하세요.</strong>
        </section>
      ) : !conversationReady ? (
        <section className="daemon-session-setup">
          <strong>암호화 연결을 준비하는 중입니다.</strong>
        </section>
      ) : (
        <>
          <div ref={messageListRef} className="daemon-message-list" aria-live="polite" aria-label="대화 메시지">
            {messages.length === 0 ? (
              <p className="field-note">아직 메시지가 없습니다.</p>
            ) : (
              messages.map((msg, i) => (
                <article key={msg.id || i} className={`daemon-message ${msg.direction}`}>
                  {msg.text && <p dir="auto">{msg.text}</p>}
                  <small>{msg.direction === "outgoing" ? "내 메시지" : "상대 메시지"} · {new Date(msg.createdAt * 1000).toLocaleString("ko-KR")}</small>
                </article>
              ))
            )}
          </div>
          <label>
            메시지
            <textarea
              dir="auto"
              rows={3}
              placeholder="메시지를 입력하세요"
              disabled={!conversationReady || busy}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
          </label>
          <button className="primary" type="button" onClick={handleSend} disabled={!conversationReady || busy || !text.trim()}>
            보내기
          </button>
        </>
      )}
    </section>
  );
}

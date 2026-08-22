import { useState } from "react";
import type { DaemonState } from "../hooks/useDaemon";
import type { RealtimeStatus } from "../hooks/useWebSocket";
import { ContactList } from "../components/ContactList";
import { Conversation } from "../components/Conversation";
import { GroupInvite } from "../components/GroupInvite";

type View = "conversation" | "devices" | "security" | "status";

interface Props {
  state: DaemonState;
  realtimeStatus: RealtimeStatus;
  onSelectContact: (accountId: string) => void;
  onSendMessage: (text: string) => void;
  onGroupInvite?: (accountIds: string[]) => void;
}

export function Ready({
  state,
  realtimeStatus,
  onSelectContact,
  onSendMessage,
  onGroupInvite,
}: Props) {
  const [view, setView] = useState<View>("conversation");
  const selected = state.contacts.find((c) => c.account_id === state.selectedContact) || null;

  const navItems: Array<[View, string]> = [
    ["conversation", "대화"],
    ["devices", "기기"],
    ["security", "보안과 복구"],
    ["status", "상태"],
  ];

  return (
    <div className="app-shell">
      <nav className="app-rail">
        <div className="app-brand">
          <span className="brand-mark">⊡</span>
          <strong>Another Dimension</strong>
        </div>
        <div className="workspace-nav">
          {navItems.map(([v, label]) => (
            <button key={v} type="button" className={`nav-item${view === v ? " active" : ""}`} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        {state.identity && (
          <div className="rail-footer">
            <span>{state.identity.display_name}</span>
            <small>{state.identity.account_id.slice(0, 16)}…</small>
          </div>
        )}
      </nav>

      <div className={`connection-banner ${realtimeStatus === "online" ? "online" : "offline"}`} role="status">
        {realtimeStatus === "online"
          ? <><strong>실시간 수신 대기 중</strong><span>새 메시지가 도착하면 자동으로 표시됩니다.</span></>
          : <><strong>{realtimeStatus === "reconnecting" ? "실시간 연결 재시도 중" : "실시간 연결 준비 중"}</strong><span>연결이 지연되면 기존 동기화로 복구됩니다.</span></>}
      </div>

      {view === "conversation" && (
        <>
          <ContactList contacts={state.contacts} selectedContact={state.selectedContact} onSelect={onSelectContact} />
          <div className="conversation-column">
            <Conversation contact={selected} messages={state.messages} busy={state.busy} onSend={onSendMessage} />
            {selected && onGroupInvite && (
              <GroupInvite
                contacts={state.contacts}
                selected={selected.account_id}
                busy={state.busy}
                onInvite={onGroupInvite}
              />
            )}
          </div>
        </>
      )}
      {view === "devices" && (
        <section className="panel">
          <h2>연결된 기기 ({state.devices.length}대)</h2>
          {state.devices.map((d) => (
            <div key={d.device_id}><span>{d.device_id.slice(0, 20)}</span> · {d.state}</div>
          ))}
        </section>
      )}
      {view === "security" && (
        <section className="panel">
          <h2>보안 상태</h2>
          <p className="field-note">암호화 키는 이 Mac의 보안 서비스가 관리합니다.</p>
        </section>
      )}
      {view === "status" && (
        <section className="panel">
          <h2>시스템</h2>
          {state.notice && <p>{state.notice}</p>}
        </section>
      )}
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </div>
  );
}

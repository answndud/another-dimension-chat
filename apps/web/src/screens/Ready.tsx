import { useState } from "react";
import type { DaemonState } from "../hooks/useDaemon";
import type { RealtimeStatus } from "../hooks/useWebSocket";
import { ContactList } from "../components/ContactList";
import { Conversation } from "../components/Conversation";
import { GroupInvite } from "../components/GroupInvite";
import { InvitePanel } from "../components/InvitePanel";
import { PairingApproval } from "../components/PairingApproval";

type View = "conversation" | "devices" | "security" | "status";

interface Props {
  state: DaemonState;
  realtimeStatus: RealtimeStatus;
  onSelectContact: (accountId: string) => void;
  onSendMessage: (text: string) => void;
  onGroupInvite?: (accountIds: string[]) => void;
  onCreateInvite: () => void;
  onConsumeInvite: (code: string) => void;
  onConfirmSafety: (safetyNumber: string) => void;
  onRejectPairing: () => void;
  onSaveRecovery: () => void;
  onLockSession: () => void;
  onRevokeDevice: (deviceId: string) => void;
  onSetAlias?: (accountId: string, alias: string) => void;
  onBlock?: (accountId: string) => void;
  onUnblock?: (accountId: string) => void;
  onRemoveMember?: (conversationId: string, deviceCredential: string) => void;
}

export function Ready({
  state,
  realtimeStatus,
  onSelectContact,
  onSendMessage,
  onGroupInvite,
  onCreateInvite,
  onConsumeInvite,
  onConfirmSafety,
  onRejectPairing,
  onSaveRecovery,
  onLockSession,
  onRevokeDevice,
  onSetAlias,
  onBlock,
  onUnblock,
  onRemoveMember,
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
        <button
          type="button"
          className="nav-item lock-button"
          onClick={() => { void onLockSession(); }}
          style={{ marginTop: "8px", width: "100%", textAlign: "center" }}
        >
          🔒 잠그기
        </button>
      </nav>

      <div className={`connection-banner ${realtimeStatus === "online" ? "online" : "offline"}`} role="status">
        {realtimeStatus === "online"
          ? <><strong>실시간 수신 대기 중</strong><span>새 메시지가 도착하면 자동으로 표시됩니다.</span></>
          : <><strong>{realtimeStatus === "reconnecting" ? "실시간 연결 재시도 중" : "실시간 연결 준비 중"}</strong><span>연결이 지연되면 기존 동기화로 복구됩니다.</span></>}
      </div>

      {view === "conversation" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "240px", maxWidth: "300px" }}>
            <InvitePanel
              invite={state.invite}
              busy={state.busy}
              hasContacts={state.contacts.length > 0}
              onCreateInvite={onCreateInvite}
              onConsumeInvite={onConsumeInvite}
            />
            {state.pairingStatus?.safety_number && (
              <PairingApproval
                safetyNumber={state.pairingStatus.safety_number}
                peerAccountId={state.pairingStatus.account_id || ""}
                busy={state.busy}
                onConfirm={onConfirmSafety}
                onReject={onRejectPairing}
              />
            )}
            <ContactList
              contacts={state.contacts}
              selectedContact={state.selectedContact}
              onSelect={onSelectContact}
              onSetAlias={onSetAlias}
              onBlock={onBlock}
              onUnblock={onUnblock}
            />
          </div>
          <div className="conversation-column" style={{ flex: 1 }}>
            <Conversation contact={selected} messages={state.messages} busy={state.busy} onSend={onSendMessage} />
            {selected && onGroupInvite && (
              <GroupInvite
                contacts={state.contacts}
                selected={selected.account_id}
                busy={state.busy}
                onInvite={onGroupInvite}
                onRemoveMember={onRemoveMember}
              />
            )}
          </div>
        </>
      )}
      {view === "devices" && (
        <section className="panel" style={{ flex: 1 }}>
          <h2>연결된 기기 ({state.devices.length}대)</h2>
          {state.devices.map((d) => (
            <div key={d.device_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <span><code style={{ fontSize: ".78rem" }}>{d.device_id.slice(0, 24)}</code> · {d.state}</span>
              {d.state === "active" && (
                <button
                  type="button"
                  className="danger"
                  style={{ fontSize: ".78rem", padding: "4px 10px" }}
                  disabled={state.busy}
                  onClick={() => { void onRevokeDevice(d.device_id); }}
                >
                  폐기
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {view === "security" && (
        <section className="panel" style={{ flex: 1 }}>
          <h2>보안과 복구</h2>
          <p className="field-note">암호화 키는 이 Mac의 보안 서비스가 관리합니다.</p>
          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="primary"
              disabled={state.busy}
              onClick={() => { void onSaveRecovery(); }}
            >
              📁 복구 파일 다운로드
            </button>
            <p className="field-note" style={{ marginTop: "10px", lineHeight: "1.6" }}>
              이 파일 없이는 데이터 손상 시 계정을 복구할 수 없습니다.<br/>
              암호화된 오프라인 매체(USB 등)에 보관하세요.<br/>
              클라우드(Dropbox, Google Drive 등)에는 저장하지 마세요.
            </p>
          </div>
          <div style={{ marginTop: "24px", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "16px" }}>
            <button
              type="button"
              className="danger"
              disabled={state.busy}
              onClick={() => {
                if (confirm("이 기기의 모든 로컬 데이터를 삭제합니다. 되돌릴 수 없습니다. 계속하시겠습니까?")) {
                  state.bridge?.wipeSession().then(() => window.location.reload());
                }
              }}
            >
              🗑️ 이 기기의 모든 데이터 삭제
            </button>
          </div>
        </section>
      )}

      {view === "status" && (
        <section className="panel" style={{ flex: 1 }}>
          <h2>현재 상태</h2>
          {state.notice && <p>{state.notice}</p>}
          <dl style={{ marginTop: "12px", display: "grid", gap: "6px", fontSize: ".82rem" }}>
            {state.identity && (
              <>
                <div><dt><strong>계정 ID:</strong></dt><dd><code style={{ fontSize: ".75rem" }}>{state.identity.account_id}</code></dd></div>
                <div><dt><strong>기기 ID:</strong></dt><dd><code style={{ fontSize: ".75rem" }}>{state.identity.device_id || "—"}</code></dd></div>
              </>
            )}
            <div><dt><strong>전달 경로:</strong></dt><dd>{state.relayOrigin || "미설정"}</dd></div>
            <div><dt><strong>Inbox URL:</strong></dt><dd style={{ wordBreak: "break-all", fontSize: ".72rem" }}>{state.inboxUrl ? state.inboxUrl.slice(0, 50) + "…" : "—"}</dd></div>
          </dl>
        </section>
      )}
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </div>
  );
}

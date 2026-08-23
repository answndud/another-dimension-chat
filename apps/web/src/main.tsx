import React from "react";
import ReactDOM from "react-dom/client";
import { useDaemon } from "./hooks/useDaemon";
import { Setup } from "./screens/Setup";
import { Ready } from "./screens/Ready";

function App() {
  const {
    state,
    realtimeStatus,
    selectContact,
    sendMessage,
    inviteToGroup,
    createInvite,
    consumeInviteCode,
    confirmSafetyAndApprove,
    rejectPairing,
    saveRecoveryFile,
    lockSession,
    revokeDeviceById,
    setContactAliasById,
    blockContactById,
    unblockContactById,
  } = useDaemon();

  if (state.screen === "loading" || state.screen === "disconnected") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">⊡</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>{state.screen === "disconnected" ? "연결 대기" : "확인 중"}</h1>
        <p className="lede">{state.notice || "Another Dimension 앱이 발급한 주소를 기다리고 있습니다."}</p>
      </main>
    );
  }

  if (state.screen === "setup") {
    return <Setup bridge={state.bridge} busy={state.busy} error={state.error} notice={state.notice} />;
  }

  if (state.screen === "error") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">!</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>오류</h1>
        <p className="lede">{state.error}</p>
      </main>
    );
  }

  if (state.screen === "recovery") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">📁</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>복구 파일 저장 필요</h1>
        <p className="lede">
          이 기기의 데이터가 손상되었을 때 계정을 복구하려면 복구 파일이 필요합니다.
          지금 복구 파일을 다운로드해 암호화된 오프라인 매체(USB 등)에 보관하세요.
        </p>
        {state.bridge && (
          <button
            type="button"
            className="primary"
            style={{ marginTop: "16px", padding: "12px 24px" }}
            onClick={() => {
              state.bridge?.exportRecovery().then(() => window.location.reload());
            }}
          >
            📁 복구 파일 다운로드
          </button>
        )}
      </main>
    );
  }

  if (state.screen === "locked") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">🔒</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>잠김</h1>
        <p className="lede">
          보안 세션이 잠겼습니다. 앱을 다시 실행하거나 launcher에서 start를 누르세요.
        </p>
      </main>
    );
  }

  if (state.screen === "corrupt") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">⚠️</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>저장소 손상</h1>
        <p className="lede">
          로컬 저장소가 손상되었습니다. 원본 데이터를 덮어쓰지 마시고,
          복구 파일이 있다면 recovery import로 복구하세요.
        </p>
      </main>
    );
  }

  if (state.screen === "relay") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">🌐</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>전달 경로 미설정</h1>
        <p className="lede">
          relay origin과 inbox URL이 설정되지 않았습니다.
          launcher에서 --relay-origin 및 --inbox-url을 지정해 daemon을 시작하세요.
        </p>
      </main>
    );
  }

  if (state.screen === "unsupported-browser" || state.screen === "unsupported-environment") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">🚫</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>지원되지 않는 환경</h1>
        <p className="lede">
          Chromium 계열 브라우저(Chrome, Edge, Brave)를 사용하세요.
          Safari와 Firefox는 지원되지 않습니다.
        </p>
      </main>
    );
  }

  if (state.screen === "initializing") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">⏳</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>초기화 중…</h1>
        <p className="lede">보안 프로필을 준비하고 있습니다. 잠시만 기다려 주세요.</p>
      </main>
    );
  }

  if (state.screen !== "ready") {
    return (
      <main className="daemon-gate">
        <div className="daemon-gate-mark" aria-hidden="true">⊡</div>
        <p className="eyebrow">ANOTHER DIMENSION</p>
        <h1>보안 서비스 연결 필요</h1>
        <p className="lede">{state.notice}</p>
      </main>
    );
  }

  return (
    <Ready
      state={state}
      realtimeStatus={realtimeStatus}
      onSelectContact={selectContact}
      onSendMessage={sendMessage}
      onGroupInvite={inviteToGroup}
      onCreateInvite={() => { void createInvite(); }}
      onConsumeInvite={(code) => { void consumeInviteCode(code); }}
      onConfirmSafety={(sn) => { void confirmSafetyAndApprove(sn); }}
      onRejectPairing={() => { void rejectPairing(); }}
      onSaveRecovery={() => { void saveRecoveryFile(); }}
      onLockSession={() => { void lockSession(); }}
      onRevokeDevice={(id) => { void revokeDeviceById(id); }}
      onSetAlias={(id, alias) => { void setContactAliasById(id, alias); }}
      onBlock={(id) => { void blockContactById(id); }}
      onUnblock={(id) => { void unblockContactById(id); }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("app")!).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);

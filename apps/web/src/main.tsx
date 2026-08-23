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
    />
  );
}

ReactDOM.createRoot(document.getElementById("app")!).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);

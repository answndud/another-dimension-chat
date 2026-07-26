import {
  createProfile,
  unlockProfile,
  listProfiles,
  exportInvite,
  revokeInvite,
  importInvite,
  safetyPhrase,
  exportEnvelope,
  sendEnvelope,
  importEnvelope,
  syncInbox,
  listMessages,
  lockProfile,
  getLocalServerInfo,
  confirmPendingEnvelopeDelivered,
  confirmSafetyVerification,
  isSafetyVerified,
  getPendingEnvelope,
  getSessionStatus,
  deleteProfile,
  exportProfileBackup,
  importProfileBackup,
  touchActivity,
  checkAutoLock,
  ready,
} from "./web-runtime.js";
import "./styles.css";

const app = document.querySelector("#app");
let state = { profile: null, peer: null, serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", messages: [], error: "", notice: "", riskAcknowledged: false };
let syncInFlight = false;

if (window.isSecureContext && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function endpointOrigin(info) {
  if (!info?.inboxUrl) return "";
  try { return new URL(info.inboxUrl).origin; } catch { return ""; }
}

function endpointWarning(info) {
  const origin = endpointOrigin(info);
  if (!origin || !origin.startsWith("http://") || /localhost|127\.0\.0\.1/.test(origin)) return "";
  // TM-03/TM-07: do not let an unsafe transport look like an anonymous secure route.
  return "보안 경고: 이 HTTP endpoint에서는 capability와 통신 metadata가 네트워크에 노출될 수 있습니다. 익명성이 제공되지 않으며 자동 전달을 사용할 수 없습니다.";
}

function canAutoDeliver(info) {
  const origin = endpointOrigin(info);
  return Boolean(origin && (origin.startsWith("https://") || /localhost|127\.0\.0\.1/.test(origin)));
}

function localServerStatus(info) {
  if (!info) return "수동 봉투 모드";
  const transport = info.externalSecure ? "HTTPS endpoint" : info.networkScope === "loopback" ? "이 기기에서만" : "개발용 HTTP";
  return `로컬 relay 연결됨 · ${endpointOrigin(info)} · ${transport} · 고위험 통신 사용 불가`;
}

function browserStatus() {
  if (!window.isSecureContext || !window.crypto?.subtle) return "브라우저 보안: 암호화를 사용하려면 localhost 또는 HTTPS로 접속하세요.";
  return "브라우저 보안: Web Crypto가 활성화되었습니다.";
}

function explainError(value) {
  const message = String(value || "알 수 없는 오류");
  const lower = message.toLowerCase();
  let action = "입력을 확인하고 같은 작업을 한 번만 다시 시도하세요.";
  if (lower.includes("passphrase") || lower.includes("profile")) action = "프로필 이름과 암호 문구를 확인하세요. 계속 실패하면 새 프로필 또는 오프라인 백업 복구를 사용하세요.";
  else if (lower.includes("server") || lower.includes("endpoint") || lower.includes("inbox")) action = "서버가 실행 중인지 확인하고, 실패하면 준비된 봉투를 수동으로 전달하세요.";
  else if (lower.includes("safety") || lower.includes("identity") || lower.includes("invite")) action = "전송을 멈추고 초대와 안전 문구를 신뢰할 수 있는 별도 채널에서 다시 비교하세요.";
  else if (lower.includes("storage") || lower.includes("database")) action = "브라우저 저장소를 지우거나 새 프로필을 만들지 말고, 먼저 필요한 백업을 보존하세요.";
  return `원인: ${message} 조치: ${action} 보안 영향: 이 작업은 완료되지 않았습니다. 확인 전에는 메시지를 보내지 마세요.`;
}

function render() {
  if (!state.profile) {
    app.innerHTML = `
      <section class="shell narrow">
        <div class="eyebrow">ANOTHER DIMENSION</div>
        <h1>브라우저 안의 개인 암호화 방</h1>
        <p class="lede">계정과 중앙 메시지 서버가 없습니다. 로컬 프로필을 만들고 공개 초대를 교환한 뒤, 암호화 봉투를 원하는 경로로 전달합니다.</p>
        <div class="notice">${escapeHtml(browserStatus())}</div>
        <div class="card grid-two">
          <form id="create-form" class="stack">
            <h2>1. 로컬 프로필 만들기</h2>
            <label>프로필 이름<input name="name" required pattern="[A-Za-z0-9_-]+" autocomplete="off" /></label>
            <label>암호 문구(12자 이상)<input name="passphrase" required minlength="12" type="password" autocomplete="new-password" /></label>
            <label class="consent"><input name="risk-ack" type="checkbox" required /> 현재 실험용 버전이며 민감한 정보·실명·취재원 정보를 입력하지 않겠습니다.</label>
            <button>프로필 만들기</button>
          </form>
          <form id="unlock-form" class="stack">
            <h2>기존 프로필 잠금 해제</h2>
            <label>프로필<select name="profile">${listProfiles().map((name) => `<option>${escapeHtml(name)}</option>`).join("") || "<option disabled>로컬 프로필 없음</option>"}</select></label>
            <label>암호 문구<input name="passphrase" required type="password" autocomplete="current-password" /></label>
            <label class="consent"><input name="risk-ack" type="checkbox" required /> 현재 실험용 버전이며 민감한 정보·실명·취재원 정보를 입력하지 않겠습니다.</label>
            <button class="secondary">잠금 해제</button>
          </form>
          <div class="card stack">
            <h2>암호화된 프로필 백업</h2>
            <p class="small">백업은 암호 문구로 감싼 로컬 자료입니다. 암호 문구와 백업을 따로 보관하고, 클립보드 기록과 공개 서비스 사용을 피하세요.</p>
            <textarea id="backup-import" rows="4" placeholder="ADBACKUP1 백업을 붙여 넣으세요"></textarea>
            <button id="import-backup" class="secondary">암호화 백업 가져오기</button>
          </div>
        </div>
        <p class="disclaimer">실험용 beta입니다. 독립 감사 전에는 production-ready가 아니며 민감한 통신에 사용할 수 없습니다.</p>
        ${state.error ? `<p class="error">${escapeHtml(explainError(state.error))}</p>` : ""}
      </section>`;
    bindAuth();
    return;
  }

  const phrase = state.safety || "상대방과 페어링하면 안전 문구가 표시됩니다.";
  app.innerHTML = `
    <section class="shell">
      <header class="topbar"><div><div class="eyebrow">ANOTHER DIMENSION</div><h1>로컬 암호화 방</h1></div><div class="row-between"><button id="export-backup" class="ghost">암호화 백업 복사</button><button id="panic-wipe" class="ghost">긴급 삭제</button><button id="lock" class="ghost">${escapeHtml(state.profile.name)} 잠그기</button></div></header>
      <div class="notice">${escapeHtml(state.notice || (state.serverInfo ? "로컬 relay가 연결되었습니다. 서버는 암호화된 봉투만 처리합니다." : "수동 봉투 모드입니다. 민감한 정보는 입력하지 마세요."))}</div>
      <div class="layout">
        <aside class="card stack">
          <div><span class="label">로컬 프로필</span><strong>${escapeHtml(state.profile.name)}</strong><p class="small">${escapeHtml(localServerStatus(state.serverInfo))}</p></div>
          ${state.serverInfo && endpointWarning(state.serverInfo) ? `<p class="warning">${escapeHtml(endpointWarning(state.serverInfo))}</p>` : ""}
          ${state.serverInfo && state.serverInfo.highRiskAllowed === false && state.serverInfo.externalSecure ? '<p class="warning">HTTPS protects the connection but does not hide IP, timing, endpoint, or traffic size. This is low-risk transport only; do not use it for journalist or life-safety communications.</p>' : ""}
          <div class="divider"></div>
          <h2>1. 초대 공유</h2>
          <p class="small">공개 설정 자료만 포함됩니다. 그래도 의도한 상대에게만 보내세요. 클립보드와 QR은 신뢰 채널이 아닙니다.</p>
          <textarea id="invite" readonly rows="5">${escapeHtml(state.invite)}</textarea>
          <button id="copy-invite" class="secondary">초대 복사</button>
          ${!state.peer ? '<button id="revoke-invite" class="ghost">초대 폐기 후 새로 발급</button>' : ""}
          <p class="small">이 페이지가 서버에서 제공되면 초대에 서버 capability가 포함될 수 있습니다. 의도한 상대에게만 공유하세요.</p>
          <h2>2. 상대 초대 추가</h2>
          <textarea id="peer-invite" rows="5" placeholder="상대방의 초대를 붙여 넣으세요">${escapeHtml(state.peerInvite)}</textarea>
          <button id="pair" ${state.peer ? "disabled" : ""}>${state.peer ? "이미 페어링됨" : "초대 확인 후 페어링"}</button>
        </aside>
        <section class="stack">
          <div class="card safety"><span class="label">안전 문구</span><strong>${escapeHtml(phrase)}</strong><p class="small">메시지를 보내기 전에 신뢰할 수 있는 별도 채널로 상대방과 전체 문구를 비교하세요. 화면·QR·클립보드만 믿지 마세요.</p>${state.peer && !isSafetyVerified() ? '<input id="safety-confirmation" placeholder="비교한 전체 문구를 붙여 넣으세요" autocomplete="off" /><button id="confirm-safety" class="secondary">비교 완료 및 확인</button>' : state.peer ? '<p class="verified">이 세션의 안전 문구가 확인되었습니다.</p>' : ""}</div>
          <div class="card stack">
            <div class="row-between"><h2>암호화 봉투 교환</h2><span class="pill">${state.peer ? `${escapeHtml(state.sessionStatus)} · ${escapeHtml(endpointOrigin(state.peer.server)) || "수동"}` : "페어링 전"}</span></div>
            ${state.peer && endpointWarning(state.peer.server) ? `<p class="warning">${escapeHtml(endpointWarning(state.peer.server))}</p>` : ""}
            ${state.peer && state.sessionStatus !== "ready" ? '<p class="warning">Olm ratchet session is establishing. Keep both rooms open, or move the pending handshake envelope manually.</p>' : ""}
            ${state.pendingHandshake && state.sessionStatus === "ready" ? '<p class="warning">Deliver the final ready envelope to the peer, then confirm delivery before messaging.</p><button id="confirm-handshake" class="secondary">I delivered the handshake envelope</button>' : ""}
            <label>메시지<textarea id="message" rows="4" placeholder="로컬에서 작성한 뒤 암호화 봉투로 전송하세요"></textarea></label>
            <div class="row-between"><button id="send-envelope" ${state.peer?.server?.inboxUrl && canAutoDeliver(state.peer.server) && state.sessionStatus === "ready" && isSafetyVerified() && !state.pendingHandshake ? "" : "disabled"}>암호화 후 상대 서버로 전송</button><button id="sync-inbox" ${state.serverInfo?.inboxUrl ? "" : "disabled"} class="secondary">내 inbox 동기화</button></div>
            <button id="export-envelope" ${state.peer && state.sessionStatus === "ready" && isSafetyVerified() && !state.pendingHandshake ? "" : "disabled"}>암호화 봉투 내보내기</button>
            <label>보낼 봉투<textarea id="envelope" rows="5" placeholder="암호화된 봉투가 여기에 표시됩니다">${escapeHtml(state.envelope)}</textarea></label>
            <label>받은 봉투<textarea id="incoming" rows="5" placeholder="상대방의 암호화 봉투를 붙여 넣으세요"></textarea></label>
            <button id="import-envelope" ${state.peer ? "" : "disabled"} class="secondary">가져와 복호화</button>
            ${state.envelope ? '<p class="small">An outgoing envelope is ready for manual delivery if the peer server is unavailable.</p>' : ""}
          </div>
          <div class="card stack"><div class="row-between"><h2>대화</h2><span class="small">로컬 암호화 기록</span></div>${renderMessages()}</div>
        </section>
      </div>
      <p class="disclaimer">실험용 beta: 익명성·안전한 삭제·확실한 전달·장악된 기기 보호를 제공하지 않습니다. 민감한 통신을 금지합니다.</p>
    </section>`;
    bindRoom();
}

function renderMessages() {
  if (!state.messages.length) return '<p class="muted">No messages yet.</p>';
  return `<div class="transcript">${state.messages.map((message) => `<article class="message ${message.direction === "sent" ? "sent" : "received"}"><span>${message.direction === "sent" ? "You" : "Peer"}</span><p>${escapeHtml(message.text)}</p><time>${new Date(message.createdAt).toLocaleString()}</time></article>`).join("")}</div>`;
}

function bindAuth() {
  document.querySelector("#create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try { state = { ...state, profile: await createProfile(data.get("name"), data.get("passphrase")), riskAcknowledged: true, error: "" }; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#unlock-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try { state = { ...state, profile: await unlockProfile(data.get("profile"), data.get("passphrase")), riskAcknowledged: true, error: "" }; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#import-backup")?.addEventListener("click", async () => {
    try { const name = await importProfileBackup(document.querySelector("#backup-import").value); state.notice = `Encrypted backup for ${name} imported. Unlock it with its original passphrase.`; render(); } catch (error) { state.error = error.message; render(); }
  });
}

function bindRoom() {
  document.querySelector("#lock")?.addEventListener("click", () => { lockProfile(); state = { profile: null, peer: null, serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", messages: [], error: "", notice: "", riskAcknowledged: false }; render(); });
  document.querySelector("#panic-wipe")?.addEventListener("click", async () => {
    const passphrase = window.prompt("로컬 데이터를 영구 삭제하려면 이 프로필의 암호 문구를 입력하세요:");
    if (passphrase === null) return;
    try { await deleteProfile(state.profile.name, passphrase); state = { profile: null, peer: null, serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", messages: [], error: "", notice: "로컬 프로필 데이터가 삭제되었습니다." }; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#export-backup")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(await exportProfileBackup()); state.notice = "암호화 백업을 복사했습니다. 클립보드 기록에 남을 수 있으니 오프라인 저장소로 옮기고 암호 문구는 따로 보관하세요."; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#peer-invite")?.addEventListener("input", (event) => { state.peerInvite = event.currentTarget.value; });
  document.querySelector("#copy-invite")?.addEventListener("click", async () => { await navigator.clipboard.writeText(state.invite); state.notice = "초대를 복사했습니다. 상대방에게만 공유하세요."; render(); });
  document.querySelector("#revoke-invite")?.addEventListener("click", async () => {
    try { await revokeInvite(); state.notice = "이전 초대를 폐기했습니다. 새로 발급된 초대를 공유하세요."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#pair")?.addEventListener("click", async () => {
    try { state.peer = await importInvite(state.peerInvite); state.safety = safetyPhrase(state.profile, state.peer); state.notice = "초대를 검증했습니다. Olm 세션을 시작했으니 지금 안전 문구를 비교하세요."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#confirm-safety")?.addEventListener("click", async () => {
    try { await confirmSafetyVerification(document.querySelector("#safety-confirmation").value); state.notice = "안전 문구를 확인했습니다. 이 세션의 메시지 기능이 열렸습니다."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#export-envelope")?.addEventListener("click", async () => {
    try { state.envelope = await exportEnvelope(document.querySelector("#message").value); state.notice = "Envelope encrypted. Move it to the other browser, then paste it into Incoming envelope."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#send-envelope")?.addEventListener("click", async () => {
    try { state.envelope = await sendEnvelope(document.querySelector("#message").value); state.notice = "Envelope encrypted and delivered. The peer receives it automatically while their room is open."; await refresh(); } catch (error) { state.envelope = error.envelope || state.envelope; state.notice = error.envelope ? "Peer server unavailable. The prepared envelope is ready below for manual delivery." : "Delivery failed. Check the server and try again."; state.error = error.message; render(); }
  });
  document.querySelector("#sync-inbox")?.addEventListener("click", () => receiveMessages(true));
  document.querySelector("#confirm-handshake")?.addEventListener("click", async () => {
    try { await confirmPendingEnvelopeDelivered(); state.notice = "Manual Olm handshake delivery confirmed. Messaging is enabled."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#import-envelope")?.addEventListener("click", async () => {
    try { const message = await importEnvelope(document.querySelector("#incoming").value); state.notice = message === null ? "Olm handshake advanced. Move any pending response envelope back to the peer." : "Envelope decrypted locally and added to the transcript."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
}

async function receiveMessages(manual = false) {
  if (syncInFlight || !state.profile || !state.peer || !state.serverInfo?.inboxUrl) return;
  syncInFlight = true;
  try {
    const previousStatus = getSessionStatus();
    const count = await syncInbox();
    const sessionChanged = previousStatus !== getSessionStatus();
    if (count || sessionChanged) {
      state.notice = count
        ? `${count} sealed envelope${count === 1 ? "" : "s"} received and acknowledged.`
        : `Olm session advanced to ${getSessionStatus()}.`;
      await refresh();
    } else if (manual) {
      state.notice = "Peer inbox is empty.";
      render();
    }
  } catch (error) {
    if (manual) {
      state.notice = "Inbox sync failed. Keep the server running and try Sync again.";
      state.error = error.message;
      render();
    }
  } finally {
    syncInFlight = false;
  }
}

async function refresh() {
  state.invite = await exportInvite();
  state.serverInfo = await getLocalServerInfo();
  state.peer = state.profile?.peer || state.peer;
  state.sessionStatus = getSessionStatus();
  state.safety = state.peer ? safetyPhrase(state.profile, state.peer) : "";
  const pendingHandshake = getPendingEnvelope();
  if (pendingHandshake) state.envelope = pendingHandshake;
  else if (state.pendingHandshake && state.envelope === state.pendingHandshake) state.envelope = "";
  state.pendingHandshake = pendingHandshake;
  state.messages = await listMessages();
  state.error = "";
  render();
}

for (const eventName of ["pointerdown", "keydown", "touchstart"]) document.addEventListener(eventName, touchActivity, { passive: true });
window.setInterval(() => {
  if (checkAutoLock()) {
    state = { profile: null, peer: null, serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", messages: [], error: "", notice: "Session auto-locked after inactivity." };
    render();
  } else if (!document.hidden) receiveMessages(false);
}, 5_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) receiveMessages(false);
});

ready.then(render).catch((error) => {
  state.error = error.message;
  render();
});

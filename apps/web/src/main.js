import {
  createProfile,
  unlockProfile,
  listProfiles,
  exportInvite,
  revokeInvite,
  importInvite,
  safetyPhrase,
  getSafetyPhrase,
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
  exportSessionBackup,
  importSessionBackup,
  exportTranscript,
  importTranscript,
  touchActivity,
  checkAutoLock,
  onSessionEvent,
  ready,
} from "./web-runtime.js";
import "./styles.css";

const app = document.querySelector("#app");
let state = { profile: null, peer: null, activeView: "connect", generatedPassphrase: "", serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", profileBackup: "", sessionBackup: "", transcriptExport: "", messages: [], error: "", notice: "", riskAcknowledged: false, wipeConfirmOpen: false };
let serviceWorkerStatus = "확인 중";
let syncInFlight = false;
const PASSPHRASE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassphrase() {
  if (!window.crypto?.getRandomValues) throw new Error("이 브라우저는 안전한 암호 문구 생성을 지원하지 않습니다.");
  const limit = Math.floor(256 / PASSPHRASE_ALPHABET.length) * PASSPHRASE_ALPHABET.length;
  const bytes = new Uint8Array(48);
  const chars = [];
  while (chars.length < 32) {
    window.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      chars.push(PASSPHRASE_ALPHABET[byte % PASSPHRASE_ALPHABET.length]);
      if (chars.length === 32) break;
    }
  }
  return chars.join("").match(/.{1,8}/g).join("-");
}

function downloadPassphrase(value) {
  const blob = new Blob([`${value}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "local-profile-passphrase.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

function lockedState(message) {
  state = { profile: null, peer: null, activeView: "connect", generatedPassphrase: "", serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", profileBackup: "", sessionBackup: "", transcriptExport: "", messages: [], error: "", notice: message, riskAcknowledged: false, wipeConfirmOpen: false };
  render();
}

onSessionEvent(({ message }) => {
  if (message) lockedState(message);
});

function registerServiceWorker() {
  if (!window.isSecureContext) {
    serviceWorkerStatus = "보안 context 필요";
    return;
  }
  if (!("serviceWorker" in navigator)) {
    serviceWorkerStatus = "미지원";
    return;
  }
  navigator.serviceWorker.register("/sw.js", { scope: "/" })
    .then((registration) => {
      serviceWorkerStatus = registration.active ? "활성" : "설치 중";
      render();
      registration.addEventListener("updatefound", () => {
        serviceWorkerStatus = "업데이트 중";
        render();
      });
      return navigator.serviceWorker.ready;
    })
    .then(() => {
      serviceWorkerStatus = "활성";
      render();
    })
    .catch(() => {
      serviceWorkerStatus = "등록 실패";
      render();
    });
}

registerServiceWorker();

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
  const capabilities = [
    ["Web Crypto", Boolean(window.isSecureContext && window.crypto?.subtle)],
    ["IndexedDB", typeof window.indexedDB === "object"],
    ["WebAssembly", typeof window.WebAssembly === "object"],
    ["Worker", typeof window.Worker === "function"],
  ];
  const summary = capabilities.map(([name, available]) => `${name} ${available ? "✓" : "✗"}`).join(" · ");
  return `${!window.isSecureContext || !window.crypto?.subtle ? "브라우저 보안: localhost 또는 HTTPS가 필요합니다." : "브라우저 보안 상태"} · ${summary} · Service Worker ${serviceWorkerStatus}`;
}

async function copyToClipboard(value) {
  if (!window.isSecureContext || typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
    throw new Error("Clipboard is unavailable. Copy the displayed encrypted material manually and clear clipboard history after delivery.");
  }
  await navigator.clipboard.writeText(value);
}

function explainError(value) {
  const message = String(value || "알 수 없는 오류");
  const lower = message.toLowerCase();
  const matched = [
    [/(wrong passphrase|damaged local profile|passphrase)/, "암호 문구가 틀렸거나 프로필 자료를 열 수 없습니다.", "암호 문구를 다시 확인하세요. 계속 실패하면 기존 자료를 덮어쓰지 말고 프로필 전용 백업을 사용하세요.", "현재 프로필은 잠금 해제되지 않았습니다.", "한 번만 다시 시도할 수 있습니다."],
    [/(storage|database|indexeddb|quota|private browsing)/, "브라우저 저장소를 열거나 기록할 수 없습니다.", "site data를 지우지 말고 필요한 백업을 먼저 보존한 뒤 일반 브라우저 창과 충분한 저장 공간에서 다시 여세요.", "현재 세션과 전송은 잠금 상태로 유지됩니다.", "저장소 상태를 확인한 뒤 다시 시도하세요."],
    [/(clipboard|copy)/, "클립보드를 사용할 수 없습니다.", "화면에 표시된 암호화 자료를 수동으로 복사하고 전송 후 clipboard history와 동기화 기록을 삭제하세요.", "암호화 자료는 화면의 수동 저장 영역에 남아 있습니다.", "브라우저 권한을 바꾸기 전까지 자동 복사를 반복하지 마세요."],
    [/(safety material|safety|identity changed|peer identity)/, "상대 identity 또는 안전 문구를 신뢰할 수 없습니다.", "전송을 중단하고 별도 신뢰 채널에서 초대와 전체 안전 문구를 다시 비교하세요. identity 변경이면 새 프로필로 다시 pairing해야 합니다.", "메시지 전송은 허용되지 않습니다.", "확인 전 재시도하지 마세요."],
    [/(endpoint or capability|server endpoint|inbox|peer server|could not be reached|timeout)/, "상대 relay endpoint에 도달하지 못했거나 capability가 바뀌었습니다.", "서버 상태와 HTTPS 설정을 확인하세요. 실패하면 화면에 준비된 sealed envelope를 수동 전달하세요. capability 변경이면 새 초대를 교환하세요.", "자동 전달 완료로 기록되지 않습니다.", "서버 확인 후 재시도할 수 있습니다."],
    [/(already imported|already paired|revoked|expired|invite)/, "초대·봉투가 만료되었거나 이미 사용되었거나 현재 방과 맞지 않습니다.", "오래된 값을 다시 붙여 넣지 말고 새 초대 또는 새 봉투를 안전한 채널로 교환하세요.", "검증되지 않은 값은 처리되지 않습니다.", "새 값을 받은 뒤에만 재시도하세요."],
    [/(backup|transcript|session.*revision|rollback|integrity)/, "백업의 목적·무결성·revision이 현재 프로필과 맞지 않습니다.", "profile/session/transcript 백업을 구분하고, 변조되었거나 오래된 백업은 사용하지 마세요. 기존 데이터를 덮어쓰지 않습니다.", "복구는 완료되지 않았고 기존 자료는 보존됩니다.", "원본 백업을 별도 보관한 뒤에만 다시 시도하세요."],
    [/(wasm|webassembly|instantiate|module|failed to fetch)/, "브라우저 암호화 모듈을 초기화하지 못했습니다.", "페이지를 새로고침하지 말고 다른 탭을 닫은 뒤, production bundle의 WASM 파일과 브라우저 WebAssembly 지원 상태를 확인하세요.", "프로필 생성·잠금 해제·메시지 전송은 잠금 상태입니다.", "원인을 확인하기 전 반복 입력하지 마세요."],
  ].find(([pattern]) => pattern.test(lower));
  const [, cause, action, impact, retry] = matched || [null, "입력 또는 브라우저 환경을 확인할 수 없습니다.", "입력을 확인하고 서버·브라우저 상태를 점검하세요.", "작업은 완료되지 않았으며 메시지 전송은 열리지 않습니다.", "원인을 확인한 뒤 한 번만 다시 시도하세요."];
  return `원인: ${cause} 조치: ${action} 보안 영향: ${impact} 재시도: ${retry}`;
}

function onboardingGuide() {
  return `<ol class="onboarding-list"><li>서버를 실행하고 preflight 결과와 공개 release fingerprint를 확인합니다.</li><li>localhost 또는 HTTPS에서 브라우저 보안 상태를 확인합니다.</li><li>로컬 프로필을 만들고 암호 문구를 password manager에만 보관합니다.</li><li>초대를 별도 신뢰 채널로 교환하고 상대 identity·안전 문구 전체를 비교합니다.</li><li>Olm handshake 봉투 전달을 완료한 뒤에만 첫 메시지를 보냅니다.</li><li>잠금·profile/session/transcript 백업·긴급 삭제의 한계를 확인합니다.</li></ol>`;
}

function onboardingStep() {
  if (!state.profile) return "1/6 · 프로필을 만들거나 잠금 해제하세요.";
  if (!state.peer) return "2/6 · 상대방의 초대를 안전하게 추가하세요.";
  if (!isSafetyVerified()) return "3/6 · 별도 신뢰 채널에서 안전 문구 전체를 비교하세요.";
  if (state.sessionStatus !== "ready" || state.pendingHandshake) return "4/6 · Olm handshake 봉투를 전달하고 완료를 확인하세요.";
  if (!state.messages.length) return "5/6 · 첫 메시지를 암호화해 보내세요.";
  return "6/6 · 대화 중입니다. 잠금·백업·긴급 삭제 한계를 확인하세요.";
}

function renderStart() {
  if (!state.generatedPassphrase) {
    try { state.generatedPassphrase = generatePassphrase(); } catch (error) { state.error = error.message; }
  }
  return `
    <section class="start-shell">
      <div class="start-brand"><span class="brand-mark" aria-hidden="true">⊡</span><span>Another Dimension</span></div>
      <div class="start-card">
        <div class="start-kicker">LOCAL ENCRYPTED WORKSPACE</div>
        <h1>프로필을 잠금 해제하세요</h1>
        <p class="lede">이 브라우저에 저장된 로컬 프로필로 암호화된 1:1 연결을 시작합니다.</p>
        <div class="notice" role="status">${escapeHtml(state.notice || browserStatus())}</div>
        <div class="start-grid">
          <form id="unlock-form" class="form-panel">
            <div class="panel-heading"><span class="step-number">01</span><div><h2>기존 프로필</h2><p>저장된 프로필을 잠금 해제합니다.</p></div></div>
            <label>프로필<select name="profile">${listProfiles().map((name) => `<option>${escapeHtml(name)}</option>`).join("") || "<option disabled>로컬 프로필 없음</option>"}</select></label>
            <label>암호 문구<input name="passphrase" required type="password" autocomplete="current-password" /></label>
            <label class="consent"><input name="risk-ack" type="checkbox" required /> 현재 버전은 독립 감사 전 고위험 통신에 사용할 수 없음을 확인했습니다.</label>
            <button class="primary">잠금 해제</button>
          </form>
          <form id="create-form" class="form-panel">
            <div class="panel-heading"><span class="step-number">02</span><div><h2>새 프로필</h2><p>이 기기에 새 로컬 identity를 만듭니다.</p></div></div>
            <label>프로필 이름<input name="name" required pattern="[A-Za-z0-9_-]+" autocomplete="off" /></label>
            <label>암호 문구 <span class="field-hint">브라우저가 안전하게 생성합니다</span><input id="generated-passphrase" name="passphrase" required minlength="12" type="text" readonly autocomplete="new-password" spellcheck="false" value="${escapeHtml(state.generatedPassphrase)}" /></label>
            <div class="passphrase-actions"><button id="regenerate-passphrase" type="button" class="secondary">새 암호 문구 생성</button><button id="copy-passphrase" type="button" class="secondary">복사</button><button id="download-passphrase" type="button" class="quiet">텍스트 파일 다운로드</button></div>
            <p class="field-note passphrase-warning">암호 문구는 로컬 프로필 잠금 해제에 필요합니다. password manager에 저장하는 것을 권장합니다. 평문 파일은 백업·동기화·Downloads 폴더에 남을 수 있습니다.</p>
            <label class="consent"><input name="risk-ack" type="checkbox" required /> 실명·취재원 정보·민감한 내용을 입력하지 않겠습니다.</label>
            <button class="primary">프로필 만들기</button>
          </form>
        </div>
        <details class="start-secondary"><summary>프로필 백업 가져오기</summary><p>프로필 identity와 private material만 복구합니다. 대화 기록과 session은 포함하지 않습니다.</p><textarea id="backup-import" autocomplete="off" rows="4" placeholder="ADBACKUP1 백업을 붙여 넣으세요"></textarea><button id="import-backup" class="secondary">암호화 백업 가져오기</button></details>
        <p class="disclaimer">현재 제품은 prototype / non-high-risk 상태입니다. 익명성, 안전한 삭제, 장악된 기기 보호를 보장하지 않습니다.</p>
        ${state.error ? `<p class="error" role="alert">${escapeHtml(explainError(state.error))}</p>` : ""}
      </div>
    </section>`;
}

function renderWorkspaceNav(currentView) {
  const items = [["connect", "연결", "새 연결"], ["conversation", "대화", state.peer ? state.peer.name || "암호화 대화" : "대화 없음"], ["delivery", "전송 방법", "relay 및 수동 봉투"], ["security", "보안·복구", "백업과 긴급 조치"], ["settings", "설정", "로컬 환경"]];
  return `<nav class="workspace-nav" aria-label="주요 메뉴">${items.map(([view, label, detail]) => `<button type="button" class="nav-item ${currentView === view ? "active" : ""}" data-view="${view}" aria-current="${currentView === view ? "page" : "false"}"><span>${escapeHtml(label)}</span><small>${escapeHtml(detail)}</small></button>`).join("")}</nav>`;
}

function renderConnectView() {
  return `<section class="workspace-view stack" data-workspace-view="connect"><div class="view-heading"><div><span class="eyebrow">CONNECTION</span><h1>새 연결</h1><p>전화번호나 username 없이 일회성 초대로 상대방과 연결합니다.</p></div></div><div class="split-panels"><article class="panel stack"><div class="panel-heading"><span class="step-number">01</span><div><h2>내 초대</h2><p>초대에는 공개 설정 자료와 relay 정보만 포함됩니다.</p></div></div><button id="show-invite" type="button" class="secondary">공유 자료 보기</button><textarea id="invite" readonly autocomplete="off" rows="5" hidden>${escapeHtml(state.invite)}</textarea><button id="copy-invite" class="secondary">초대 복사</button>${!state.peer ? '<button id="revoke-invite" class="quiet">초대 폐기 후 새로 발급</button>' : ""}<p class="field-note">복사한 자료는 별도 신뢰 채널로 전달하고, 전송 후 클립보드 기록을 삭제하세요.</p></article><article class="panel stack"><div class="panel-heading"><span class="step-number">02</span><div><h2>상대 초대</h2><p>받은 초대를 검증한 뒤에만 연결됩니다.</p></div></div><textarea id="peer-invite" autocomplete="off" rows="6" placeholder="상대방의 초대를 붙여 넣으세요">${escapeHtml(state.peerInvite)}</textarea><button id="pair" class="primary" ${state.peer ? "disabled" : ""}>${state.peer ? "이미 연결됨" : "초대 확인 후 연결"}</button><p class="field-note">초대 검증은 identity 확인을 대신하지 않습니다. 연결 후 안전 문구를 별도 채널로 대조해야 합니다.</p></article></div>${state.peer ? renderSafetyPanel() : renderEmptyConnection()}</section>`;
}

function renderSafetyPanel() {
  const phrase = state.safety || "상대방과 연결하면 표시됩니다.";
  return `<article class="security-panel stack"><div class="status-line"><span class="status-dot ${isSafetyVerified() ? "ok" : "warning-dot"}" aria-hidden="true"></span><strong>${isSafetyVerified() ? "안전 문구 확인 완료" : "안전 문구 확인 필요"}</strong></div><p>별도 신뢰 채널에서 아래 전체 문구를 비교하세요.</p><strong class="safety-phrase">${escapeHtml(phrase)}</strong>${!isSafetyVerified() ? '<input id="safety-confirmation" placeholder="비교한 전체 문구를 입력하세요" autocomplete="off" /><button id="confirm-safety" class="secondary">비교 완료 및 확인</button>' : '<p class="verified">외부 채널 대조가 완료된 연결입니다.</p>'}</article>`;
}

function renderEmptyConnection() {
  return `<article class="empty-state"><span class="empty-icon" aria-hidden="true">＋</span><h2>아직 연결된 상대가 없습니다</h2><p>내 초대를 전달하거나 상대방에게 받은 초대를 붙여 넣어 연결을 시작하세요.</p></article>`;
}

function renderConversationView() {
  const phrase = state.safety || "안전 문구가 아직 없습니다.";
  return `<section class="workspace-view conversation-view stack" data-workspace-view="conversation"><header class="conversation-header"><div><span class="eyebrow">ENCRYPTED CONVERSATION</span><h1>${escapeHtml(state.peer?.name || "대화 상대 없음")}</h1><p>${escapeHtml(state.peer ? "상대 identity가 연결에 저장되어 있습니다." : "먼저 새 연결을 완료하세요.")}</p></div><div class="identity-summary"><span class="status-dot ${isSafetyVerified() ? "ok" : "warning-dot"}" aria-hidden="true"></span><span>${isSafetyVerified() ? "검증됨" : "검증 필요"}</span><small>${escapeHtml(state.sessionStatus)}</small></div></header>${state.peer ? `<details class="security-disclosure"><summary>identity 및 안전 상태</summary><p>안전 문구: <strong>${escapeHtml(phrase)}</strong></p><p>상대 relay: ${escapeHtml(endpointOrigin(state.peer.server) || "수동 전달")}</p></details>` : renderEmptyConnection()}<div class="panel conversation-panel stack"><div class="conversation-toolbar"><h2>메시지</h2><span class="field-note">로컬 암호화 기록</span></div><div class="message-area">${renderMessages()}</div><label>메시지<textarea id="message" rows="3" placeholder="메시지를 입력하세요" ${state.peer && state.sessionStatus === "ready" && isSafetyVerified() && !state.pendingHandshake ? "" : "disabled"}></textarea></label><div class="composer-actions"><button id="send-envelope" class="primary" ${state.peer?.server?.inboxUrl && canAutoDeliver(state.peer.server) && state.sessionStatus === "ready" && isSafetyVerified() && !state.pendingHandshake ? "" : "disabled"}>암호화 후 전송</button><button type="button" class="secondary" data-view="delivery">전송 방법</button></div></div></section>`;
}

function renderDeliveryView() {
  return `<section class="workspace-view stack" data-workspace-view="delivery"><div class="view-heading"><div><span class="eyebrow">DELIVERY</span><h1>전송 방법</h1><p>자동 relay가 불가능할 때도 평문 없이 암호화 봉투를 전달합니다.</p></div></div><article class="panel stack"><div class="status-line"><span class="status-dot ${state.serverInfo?.inboxUrl ? "ok" : "warning-dot"}" aria-hidden="true"></span><strong>${escapeHtml(state.serverInfo ? localServerStatus(state.serverInfo) : "수동 봉투 모드")}</strong></div>${state.pendingHandshake && state.sessionStatus === "ready" ? '<p class="warning">최종 핸드셰이크 봉투를 상대에게 전달한 뒤 완료를 확인하세요.</p><button id="confirm-handshake" class="secondary">핸드셰이크 전달 확인</button>' : ""}<div class="action-row"><button id="sync-inbox" class="secondary" ${state.serverInfo?.inboxUrl ? "" : "disabled"}>내 inbox 동기화</button><button id="export-envelope" class="secondary" ${state.peer && state.sessionStatus === "ready" && isSafetyVerified() && !state.pendingHandshake ? "" : "disabled"}>암호화 봉투 만들기</button></div><label>보낼 봉투<textarea id="envelope" autocomplete="off" rows="5" placeholder="암호화된 봉투가 여기에 표시됩니다">${escapeHtml(state.envelope)}</textarea></label><label>받은 봉투<textarea id="incoming" autocomplete="off" rows="5" placeholder="상대방의 암호화 봉투를 붙여 넣으세요"></textarea></label><button id="import-envelope" class="secondary" ${state.peer ? "" : "disabled"}>가져와 복호화</button></article></section>`;
}

function renderSecurityView() {
  return `<section class="workspace-view stack" data-workspace-view="security"><div class="view-heading"><div><span class="eyebrow">SECURITY & RECOVERY</span><h1>보안·복구</h1><p>서로 다른 복구 자료를 구분하고, 삭제의 한계를 확인합니다.</p></div></div><article class="panel stack"><h2>프로필 백업</h2><p class="field-note">identity와 private material만 복구합니다. 대화 기록과 session은 포함하지 않습니다.</p><button id="export-backup" class="secondary">프로필 백업 복사</button>${state.profileBackup ? `<label>수동 저장용 암호화 백업<textarea id="profile-backup-output" readonly rows="4">${escapeHtml(state.profileBackup)}</textarea></label>` : ""}</article><article class="panel stack"><h2>Session / replay 백업</h2><p class="field-note">대화 세션 상태를 복구하는 자료입니다. profile backup과 섞지 마세요.</p><button id="make-session-backup" class="secondary">Session 백업 생성</button><textarea id="session-backup" rows="4" placeholder="ADSESSION1 백업을 붙여 넣으세요">${escapeHtml(state.sessionBackup)}</textarea><button id="load-session-backup" class="secondary">Session 백업 가져오기</button></article><article class="panel stack"><h2>대화 기록 export</h2><button id="make-transcript-export" class="secondary">대화 기록 export 생성</button><textarea id="transcript-export" rows="4" placeholder="ADTRANSCRIPT1 export를 붙여 넣으세요">${escapeHtml(state.transcriptExport)}</textarea><button id="load-transcript-export" class="secondary">대화 기록 export 가져오기</button></article><article class="danger-panel stack"><h2>긴급 삭제</h2><p>브라우저 저장소 삭제만 시도합니다. 백업, swap, crash dump, SSD 영역까지 지운다고 보장하지 않습니다.</p><button id="panic-wipe" class="danger">긴급 삭제</button></article>${state.wipeConfirmOpen ? `<div class="dialog-panel" role="alertdialog" aria-labelledby="wipe-title"><h2 id="wipe-title">로컬 프로필과 기록 삭제</h2><p class="warning">되돌릴 수 없습니다. 브라우저·OS 백업과 저장장치 영역은 삭제되지 않을 수 있습니다.</p><form id="wipe-confirm-form" class="stack"><label>계속하려면 현재 프로필 암호 문구를 입력하세요<input id="wipe-passphrase" name="passphrase" type="password" autocomplete="current-password" required /></label><div class="action-row"><button type="submit" class="danger">프로필 삭제 실행</button><button id="cancel-wipe" type="button" class="secondary">취소</button></div></form></div>` : ""}</section>`;
}

function renderSettingsView() {
  return `<section class="workspace-view stack" data-workspace-view="settings"><div class="view-heading"><div><span class="eyebrow">LOCAL SETTINGS</span><h1>설정</h1><p>현재 브라우저와 relay 연결 상태를 확인합니다.</p></div></div><article class="panel stack"><h2>현재 프로필</h2><p class="identity-name">${escapeHtml(state.profile.name)}</p><p class="field-note">${escapeHtml(localServerStatus(state.serverInfo))}</p><button id="lock" class="quiet">프로필 잠그기</button></article><article class="panel stack"><h2>브라우저 보안 상태</h2><p class="field-note">${escapeHtml(browserStatus())}</p><p class="field-note">고위험 통신에 필요한 독립 감사·실제 OS/browser matrix 검증은 아직 완료되지 않았습니다.</p></article></section>`;
}

function renderWorkspace() {
  const currentView = state.activeView || (state.peer ? "conversation" : "connect");
  return `<section class="app-shell"><aside class="app-rail"><div class="app-brand"><span class="brand-mark" aria-hidden="true">⊡</span><strong>Another Dimension</strong><small>로컬 보안 작업공간</small></div>${renderWorkspaceNav(currentView)}<div class="rail-footer"><span class="status-dot ${state.serverInfo ? "ok" : "warning-dot"}" aria-hidden="true"></span><span>${state.serverInfo ? "로컬 연결됨" : "수동 전달"}</span><button id="lock" type="button" class="quiet">잠그기</button></div></aside><aside class="local-list"><div class="list-heading"><span class="eyebrow">LOCAL CONNECTIONS</span><h2>연결 목록</h2></div><label class="search-field"><span class="sr-only">로컬 연결 검색</span><input placeholder="이 기기 안에서 검색" disabled /></label>${state.peer ? `<button type="button" class="local-contact active" data-view="conversation"><span class="status-dot ${isSafetyVerified() ? "ok" : "warning-dot"}"></span><span><strong>${escapeHtml(state.peer.name || "암호화 연결")}</strong><small>${isSafetyVerified() ? "검증됨" : "검증 필요"}</small></span></button>` : '<div class="list-empty">저장된 연결 없음<br><small>새 연결에서 초대를 교환하세요.</small></div>'}<button type="button" class="new-connection" data-view="connect">＋ 새 연결</button></aside><main class="workspace-main"><div class="global-status" role="status">${escapeHtml(state.notice || (state.serverInfo ? "로컬 relay가 연결되었습니다." : "수동 봉투 모드입니다."))}</div>${state.error ? `<p class="error" role="alert">${escapeHtml(explainError(state.error))}</p>` : ""}<div class="view-stack">${renderConnectView()}${renderConversationView()}${renderDeliveryView()}${renderSecurityView()}${renderSettingsView()}</div><p class="disclaimer">prototype / non-high-risk · 익명성·안전한 삭제·장악된 기기 보호를 보장하지 않습니다.</p></main></section>`;
}

function render() {
  if (!state.profile) {
    app.innerHTML = renderStart();
    bindAuth();
    return;
  }
  app.innerHTML = renderWorkspace();
  const currentView = state.activeView || (state.peer ? "conversation" : "connect");
  app.querySelectorAll("[data-workspace-view]").forEach((view) => { view.hidden = view.dataset.workspaceView !== currentView; });
  bindRoom();
}

function renderLegacy() {
  if (!state.profile) {
    app.innerHTML = `
      <section class="shell narrow">
        <div class="eyebrow">ANOTHER DIMENSION</div>
        <h1>브라우저 안의 개인 암호화 방</h1>
        <p class="step">${escapeHtml(onboardingStep())}</p>
        <p class="lede">계정과 중앙 메시지 서버가 없습니다. 로컬 프로필을 만들고 공개 초대를 교환한 뒤, 암호화 봉투를 원하는 경로로 전달합니다.</p>
        <div class="notice">${escapeHtml(state.notice || browserStatus())}</div>
        <div class="card stack"><h2>안전한 시작 순서</h2>${onboardingGuide()}</div>
        <div class="card grid-two">
          <form id="create-form" class="stack">
            <h2>1. 로컬 프로필 만들기</h2>
            <label>프로필 이름<input name="name" required pattern="[A-Za-z0-9_-]+" autocomplete="off" /></label>
            <label>암호 문구(자동 생성)<input name="passphrase" required minlength="12" type="text" readonly autocomplete="new-password" value="${escapeHtml(state.generatedPassphrase)}" /></label>
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
            <h2>프로필 전용 백업</h2>
            <p class="small">프로필 공개키·암호화 private material만 복구합니다. 대화 기록·Olm session·replay 상태는 포함하지 않습니다.</p>
          <textarea id="backup-import" autocomplete="off" rows="4" placeholder="ADBACKUP1 백업을 붙여 넣으세요"></textarea>
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
      <header class="topbar"><div><div class="eyebrow">ANOTHER DIMENSION</div><h1>로컬 암호화 방</h1></div><div class="row-between"><button id="export-backup" class="ghost">프로필 백업 복사</button><button id="panic-wipe" class="ghost">긴급 삭제</button><button id="lock" class="ghost">${escapeHtml(state.profile.name)} 잠그기</button></div></header>
      <p class="step">${escapeHtml(onboardingStep())}</p>
      <div class="notice">${escapeHtml(state.notice || (state.serverInfo ? "로컬 relay가 연결되었습니다. 서버는 암호화된 봉투만 처리합니다." : "수동 봉투 모드입니다. 민감한 정보는 입력하지 마세요."))}</div>
      ${state.error ? `<p class="error" role="alert">${escapeHtml(explainError(state.error))}</p>` : ""}
      ${state.wipeConfirmOpen ? `<div class="card wipe-confirm" role="alertdialog" aria-labelledby="wipe-title"><h2 id="wipe-title">로컬 프로필과 기록 삭제</h2><p class="warning">현재 프로필·대화 기록·replay 표시를 삭제합니다. 브라우저/OS 백업, swap, crash dump, SSD 영역까지 지운다고 보장하지 않습니다. 되돌릴 수 없습니다.</p><form id="wipe-confirm-form" class="stack"><label>계속하려면 현재 프로필의 암호 문구를 입력하세요<input id="wipe-passphrase" name="passphrase" type="password" autocomplete="current-password" required /></label><div class="row-between"><button type="submit">프로필 삭제 실행</button><button id="cancel-wipe" type="button" class="secondary">취소</button></div></form></div>` : ""}
      <div class="layout">
        <aside class="card stack">
          <div><span class="label">로컬 프로필</span><strong>${escapeHtml(state.profile.name)}</strong><p class="small">${escapeHtml(localServerStatus(state.serverInfo))}</p></div>
          ${state.serverInfo && endpointWarning(state.serverInfo) ? `<p class="warning">${escapeHtml(endpointWarning(state.serverInfo))}</p>` : ""}
          ${state.serverInfo && state.serverInfo.highRiskAllowed === false && state.serverInfo.externalSecure ? '<p class="warning">HTTPS protects the connection but does not hide IP, timing, endpoint, or traffic size. This is low-risk transport only; do not use it for journalist or life-safety communications.</p>' : ""}
          <div class="divider"></div>
          <h2>1. 초대 공유</h2>
          <p class="small">공개 설정 자료만 포함됩니다. 그래도 의도한 상대에게만 보내세요. 클립보드와 QR은 신뢰 채널이 아닙니다.</p>
          <textarea id="invite" readonly autocomplete="off" rows="5">${escapeHtml(state.invite)}</textarea>
          <button id="copy-invite" class="secondary">초대 복사</button>
          ${!state.peer ? '<button id="revoke-invite" class="ghost">초대 폐기 후 새로 발급</button>' : ""}
          <p class="small">이 페이지가 서버에서 제공되면 초대에 서버 capability가 포함될 수 있습니다. 의도한 상대에게만 공유하세요.</p>
          <h2>2. 상대 초대 추가</h2>
          <textarea id="peer-invite" autocomplete="off" rows="5" placeholder="상대방의 초대를 붙여 넣으세요">${escapeHtml(state.peerInvite)}</textarea>
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
            <label>보낼 봉투<textarea id="envelope" autocomplete="off" rows="5" placeholder="암호화된 봉투가 여기에 표시됩니다">${escapeHtml(state.envelope)}</textarea></label>
            <label>받은 봉투<textarea id="incoming" autocomplete="off" rows="5" placeholder="상대방의 암호화 봉투를 붙여 넣으세요"></textarea></label>
            <button id="import-envelope" ${state.peer ? "" : "disabled"} class="secondary">가져와 복호화</button>
            ${state.envelope ? '<p class="small">An outgoing envelope is ready for manual delivery if the peer server is unavailable.</p>' : ""}
          </div>
          <div class="card stack"><div class="row-between"><h2>대화</h2><span class="small">로컬 암호화 기록</span></div>${renderMessages()}</div>
          <div class="card stack"><h2>복구 자료 구분</h2><p class="small">프로필 백업은 대화와 session을 복구하지 않습니다. 아래 자료는 모두 현재 프로필의 암호 문구로 인증된 별도 파일이며, 클립보드·공개 채널·스크린샷에 남기지 마세요.</p>${state.profileBackup ? '<label>클립보드 실패 시 수동 저장용 암호화 프로필 백업<textarea id="profile-backup-output" readonly autocomplete="off" rows="4">' + escapeHtml(state.profileBackup) + '</textarea></label><p class="warning">이 자료를 신뢰할 수 있는 오프라인 저장소에 옮긴 뒤 화면·clipboard history·동기화 기록에서 삭제하세요.</p>' : ""}<button id="make-session-backup" class="secondary">Olm session/replay 백업 생성</button><textarea id="session-backup" autocomplete="off" rows="4" placeholder="ADSESSION1 백업을 여기에 붙여 넣으세요">${escapeHtml(state.sessionBackup)}</textarea><button id="load-session-backup" class="secondary">Olm session/replay 백업 가져오기</button><button id="make-transcript-export" class="secondary">대화 기록 export 생성</button><textarea id="transcript-export" autocomplete="off" rows="4" placeholder="ADTRANSCRIPT1 export를 여기에 붙여 넣으세요">${escapeHtml(state.transcriptExport)}</textarea><button id="load-transcript-export" class="secondary">대화 기록 export 가져오기</button><p class="warning">긴급 삭제는 브라우저 저장소의 삭제를 시도할 뿐이며 브라우저/OS 백업, swap, crash dump, SSD wear-leveling까지 지운다는 보장이 없습니다.</p></div>
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
  document.querySelector("#regenerate-passphrase")?.addEventListener("click", () => {
    try { state.generatedPassphrase = generatePassphrase(); state.error = ""; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#copy-passphrase")?.addEventListener("click", async () => {
    const value = document.querySelector("#generated-passphrase")?.value || "";
    try { await copyToClipboard(value); state.notice = "암호 문구를 복사했습니다. password manager에 저장한 뒤 클립보드 기록과 동기화 기록을 삭제하세요."; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#download-passphrase")?.addEventListener("click", () => {
    const value = document.querySelector("#generated-passphrase")?.value || "";
    if (!value || !window.confirm("암호 문구가 암호화되지 않은 텍스트 파일로 저장됩니다. Downloads 폴더·백업·동기화에 남을 수 있습니다. 계속할까요?")) return;
    downloadPassphrase(value);
    state.notice = "평문 암호 파일을 다운로드했습니다. 안전한 위치로 옮긴 뒤 Downloads와 동기화 기록에서 삭제하세요.";
    render();
  });
  document.querySelector("#create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try { state = { ...state, profile: await createProfile(data.get("name"), data.get("passphrase")), generatedPassphrase: "", riskAcknowledged: true, error: "" }; await refresh(); } catch (error) { state.error = error.message; render(); }
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
  document.querySelectorAll("#lock").forEach((button) => button.addEventListener("click", () => { lockProfile(); lockedState("프로필을 잠갔습니다. 메모리의 세션 자료를 폐기했습니다."); }));
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { state.activeView = button.dataset.view; render(); }));
  document.querySelector("#show-invite")?.addEventListener("click", () => { const invite = document.querySelector("#invite"); if (invite) { invite.hidden = !invite.hidden; if (!invite.hidden) invite.focus(); } });
  document.querySelector("#panic-wipe")?.addEventListener("click", () => { state.wipeConfirmOpen = true; state.error = ""; render(); });
  document.querySelector("#cancel-wipe")?.addEventListener("click", () => { state.wipeConfirmOpen = false; state.error = ""; render(); });
  document.querySelector("#wipe-confirm-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const passphrase = new FormData(event.currentTarget).get("passphrase");
    try { await deleteProfile(state.profile.name, passphrase); lockedState("로컬 프로필과 해당 transcript/replay 기록의 삭제를 시도했습니다. 브라우저·OS 백업이나 SSD 영역의 삭제까지 보장하지 않습니다."); } catch (error) { state.error = error.message; state.wipeConfirmOpen = true; render(); }
  });
  document.querySelector("#export-backup")?.addEventListener("click", async () => {
    if (!window.confirm("암호화 백업을 클립보드에 복사합니다. 클립보드 기록·동기화에 남을 수 있습니다. 계속할까요?")) return;
    let backup = "";
    try { backup = await exportProfileBackup(); await copyToClipboard(backup); state.profileBackup = ""; state.notice = "암호화 백업을 복사했습니다. 클립보드에서 즉시 지우고 오프라인 저장소로 옮기세요."; render(); } catch (error) { if (backup) state.profileBackup = backup; state.error = error.message; render(); }
  });
  document.querySelector("#peer-invite")?.addEventListener("input", (event) => { state.peerInvite = event.currentTarget.value; });
  document.querySelector("#copy-invite")?.addEventListener("click", async () => {
    if (!window.confirm("초대에는 상대방 서버 접속 정보가 포함될 수 있습니다. 클립보드에 복사할까요?")) return;
    try { await copyToClipboard(state.invite); state.notice = "초대를 복사했습니다. 전송 후 클립보드와 기록에서 삭제하세요."; render(); } catch (error) { state.error = error.message; render(); }
  });
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
  document.querySelector("#make-session-backup")?.addEventListener("click", async () => {
    try { state.sessionBackup = await exportSessionBackup(); state.notice = "Olm session/replay 백업을 생성했습니다. profile backup과 별도로 보관하세요."; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#load-session-backup")?.addEventListener("click", async () => {
    try { await importSessionBackup(document.querySelector("#session-backup").value); state.notice = "Olm session/replay 백업을 인증하고 복구했습니다."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#make-transcript-export")?.addEventListener("click", async () => {
    try { state.transcriptExport = await exportTranscript(); state.notice = "암호화된 대화 기록 export를 생성했습니다. profile/session backup과 별도로 보관하세요."; render(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#load-transcript-export")?.addEventListener("click", async () => {
    try { const result = await importTranscript(document.querySelector("#transcript-export").value); state.notice = `${result.count}개의 대화 기록을 기존 기록을 덮어쓰지 않고 복구했습니다.`; await refresh(); } catch (error) { state.error = error.message; render(); }
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
  state.safety = getSafetyPhrase();
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
    state = { profile: null, peer: null, serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", profileBackup: "", messages: [], error: "", notice: "Session auto-locked after inactivity." };
    render();
  } else if (!document.hidden) receiveMessages(false);
}, 5_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) receiveMessages(false);
});
window.addEventListener("pagehide", () => lockProfile({ reason: "pagehide" }), { once: true });

ready.then(render).catch((error) => {
  state.error = error.message;
  render();
});

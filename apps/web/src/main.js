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
import { connectDaemonBridge, consumeRelayInvite, createRelayInviteCode, revokeRelayInviteCode, DaemonBridgeError } from "./daemon-bridge.js";
import "./styles.css";

const app = document.querySelector("#app");
let state = { profile: null, peer: null, activeView: "connect", generatedPassphrase: "", daemonReceivedInvite: null, daemonConsumedInvite: "", daemonInviteReceipt: "", daemonRelayOrigin: "", serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", profileBackup: "", sessionBackup: "", transcriptExport: "", messages: [], error: "", notice: "", riskAcknowledged: false, wipeConfirmOpen: false, daemonBridge: null, daemonBridgeMode: false, daemonStatus: "확인 중", daemonIdentity: null, daemonInvite: null, daemonPairing: null, daemonRelayTrust: null, daemonDevices: [], daemonLinkApproval: "", daemonContacts: [], daemonContactSearch: "", daemonConversationIds: [], daemonSelectedContact: "", daemonLocked: false, daemonConversationId: "", daemonKeyPackage: "", daemonWelcome: "", daemonCiphertext: "", daemonPlaintext: "", daemonInboxUrl: "", daemonPeerInboxUrl: "", daemonMessages: [], daemonOutgoingMessages: [], daemonDeliveryDigest: "", daemonDeliveryState: "", daemonAttachmentState: "", daemonAttachmentProgress: 0, daemonAttachmentBlobId: "" };
let serviceWorkerStatus = "확인 중";
let syncInFlight = false;
let daemonSyncInFlight = false;
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
  state = { profile: null, peer: null, activeView: "connect", generatedPassphrase: "", serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", profileBackup: "", sessionBackup: "", transcriptExport: "", messages: [], error: "", notice: message, riskAcknowledged: false, wipeConfirmOpen: false, daemonMessages: [], daemonOutgoingMessages: [], daemonDeliveryDigest: "", daemonDeliveryState: "" };
  render();
}

function renderDaemonBridgeState() {
  const connected = Boolean(state.daemonBridge) && !state.daemonLocked;
  if (connected && !state.daemonConversationId) state.daemonConversationId = newDaemonConversationId();
  const title = connected ? "보안 데몬 세션이 연결되었습니다" : "보안 데몬 연결이 필요합니다";
  const detail = connected
    ? "이 화면은 암호화 키·로컬 저장소·메시지 상태를 보관하지 않습니다. 실제 작업은 로컬 보안 데몬의 인증된 API를 통해서만 열립니다."
    : "브라우저 프로토타입 경로는 고위험 통신에 사용할 수 없습니다. CLI 데몬을 실행하고 데몬이 발급한 주소로 다시 여세요.";
  const pairingReset = state.daemonPairing?.state === "rejected" ? '<p class="warning">relay capability가 폐기되어 기존 연결을 중단했습니다. 새 초대를 다시 교환하고 안전 번호를 재확인하세요.</p>' : "";
  return `<main class="daemon-gate" aria-labelledby="daemon-gate-title"><div class="daemon-gate-mark" aria-hidden="true">⊡</div><p class="eyebrow">LOCAL SECURITY DAEMON</p><h1 id="daemon-gate-title">${title}</h1><p class="lede">${detail}</p><div class="notice" role="status">${escapeHtml(state.notice || "키와 메시지 상태는 로컬 daemon이 소유합니다.")}</div><dl class="daemon-facts"><div><dt>세션 상태</dt><dd>${escapeHtml(state.daemonStatus)}</dd></div><div><dt>브라우저 저장소</dt><dd>daemon 모드에서 사용하지 않음</dd></div><div><dt>현재 identity</dt><dd>${escapeHtml(state.daemonIdentity ? `${state.daemonIdentity.display_name} · ${state.daemonIdentity.account_id}` : "daemon에서만 확인")}</dd></div><div><dt>보안 상태</dt><dd>고위험 출시 전까지 차단</dd></div></dl>${connected ? `${pairingReset}<button id="daemon-create-invite" class="primary" type="button">${state.daemonPairing?.state === "rejected" ? "새 연결 시작" : "일회성 초대 생성"}</button><button id="daemon-lock" class="quiet" type="button">데몬 세션 잠그기</button>${renderDaemonDevices()}${renderDaemonContacts()}` : '<p class="field-note">다시 연결하려면 daemon이 발급한 새 주소를 사용하세요.</p>'}${state.daemonInvite ? `<section class="daemon-invite"><h2>초대 공유 자료</h2><p>코드와 signed invite를 별도 신뢰 채널로 전달하세요. 10분 후 만료되며 새 초대 생성 시 이전 초대는 더 이상 UI에서 재사용하지 마세요.</p><label>초대 코드<textarea readonly rows="2">${escapeHtml(state.daemonInvite.invite_code)}</textarea></label><button id="daemon-revoke-invite" class="quiet" type="button">초대 폐기</button><p class="field-note">서명 자료는 daemon과 relay 사이에서만 처리됩니다. 상대에게는 코드만 전달하세요.</p></section>` : ""}${connected ? `<section class="daemon-invite"><h2>받은 초대 검증</h2><label>상대 relay 주소<input id="received-relay-origin" value="${escapeHtml(state.daemonRelayOrigin)}" placeholder="https://relay.example"></label><label>초대 코드<textarea id="received-invite-code" rows="2" placeholder="상대방의 초대 코드"></textarea></label><button id="daemon-consume-invite" class="secondary" type="button">relay에서 초대 가져오기</button><p class="field-note">signed invite와 relay receipt는 relay 소비 직후 daemon에 자동 전달되어 검증됩니다.</p>${state.daemonReceivedInvite ? `<p class="field-note">검증됨: ${escapeHtml(state.daemonReceivedInvite.account_id)} · device ${escapeHtml(state.daemonReceivedInvite.device_id)}</p>${state.daemonPairing?.state === "verified" ? '<button id="daemon-approve-pairing" class="primary" type="button">연락처 승인</button><button id="daemon-reject-pairing" class="quiet" type="button">거절</button>' : state.daemonPairing?.state === "established" ? '<p class="verified">연락처 승인이 완료되었습니다.</p>' : ""}` : ""}</section>` : ""}${renderDaemonSessionPanel()}${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ""}<p class="disclaimer">prototype / non-high-risk · 독립 보안 검토와 지원 matrix가 완료되기 전 민감한 통신을 입력하지 마세요.</p></main>`;
}

function renderDaemonRelayTrust() {
  const trust = state.daemonRelayTrust || {};
  const pin = trust.tls_pin || "";
  return '<section class="daemon-invite daemon-relay-trust"><h2>원격 relay TLS 신뢰</h2><p>pin은 브라우저에 저장하지 않고 daemon의 암호화 저장소에 저장됩니다. 운영 relay의 인증서 지문을 별도 신뢰 채널로 확인한 뒤 입력하세요.</p><label>인증서 pin<input id="daemon-tls-pin" value="' + escapeHtml(pin) + '" placeholder="sha256:64자리 hex" autocomplete="off" spellcheck="false"></label><label class="checkbox-line"><input id="daemon-tls-retrust" type="checkbox"> 기존 pin 변경을 명시적으로 재신뢰</label><button id="daemon-save-relay-pin" class="secondary" type="button">relay 신뢰 저장</button><p class="field-note">현재 상태: ' + (pin ? "pin 등록됨" : "pin 미등록") + ' · pin 변경은 기존 자동 연결을 중단할 수 있습니다.</p></section>';
}

function renderDaemonContacts() {
  const query = state.daemonContactSearch.trim().toLowerCase();
  const contacts = state.daemonContacts.filter((contact) => [contact.alias, contact.account_id, contact.device_id].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  const rows = contacts.length
    ? contacts.map((contact) => `<article class="daemon-contact ${state.daemonSelectedContact === contact.account_id ? "selected" : ""}"><button type="button" class="daemon-contact-select" data-contact-account="${escapeHtml(contact.account_id)}"><strong>${escapeHtml(contact.alias || contact.account_id.slice(0, 18))}${contact.unread_count ? ` <span class="unread-badge">${contact.unread_count}</span>` : ""}</strong><small>${escapeHtml(contact.state)} · ${escapeHtml(contact.device_id)}${contact.conversation_id ? ` · ${escapeHtml(contact.conversation_id)}` : " · 대화 미연결"}</small>${contact.last_message_preview ? `<span class="contact-preview">${escapeHtml(contact.last_message_preview)}</span>` : ""}</button><label class="daemon-contact-alias">별칭<input data-contact-alias="${escapeHtml(contact.account_id)}" value="${escapeHtml(contact.alias || "")}" maxlength="128"></label><div class="contact-actions"><button type="button" class="quiet daemon-contact-save" data-contact-save="${escapeHtml(contact.account_id)}">저장</button><button type="button" class="quiet daemon-contact-block" data-contact-block="${escapeHtml(contact.account_id)}">${contact.state === "blocked" ? "차단 해제" : "차단"}</button><button type="button" class="quiet daemon-contact-delete" data-contact-delete="${escapeHtml(contact.account_id)}">삭제</button></div></article>`).join("")
    : '<p class="field-note">저장된 연락처가 없습니다. 안전 번호 확인 후 승인하면 여기에 표시됩니다.</p>';
  return `<section class="daemon-directory"><div class="row-between"><div><h2>연락처</h2><p class="field-note">연락처와 별칭은 daemon의 암호화 저장소에서만 관리됩니다.</p></div><span class="pill">${state.daemonContacts.length}명 · ${state.daemonConversationIds.length}개 대화</span></div><label>이 기기에서 검색<input id="daemon-contact-search" value="${escapeHtml(state.daemonContactSearch)}" placeholder="별칭·account ID·device ID"></label><div class="daemon-contact-list">${rows}</div></section>`;
}

function renderDaemonDevices() {
  const rows = state.daemonDevices.length
    ? state.daemonDevices.map((device) => {
      const current = device.device_id === state.daemonIdentity?.device_id;
      return `<article class="daemon-contact"><strong>${escapeHtml(device.device_id)}${current ? " · 현재 기기" : ""}</strong><small>${escapeHtml(device.state)} · 만료 ${escapeHtml(String(device.expires_at))}</small><code>${escapeHtml(device.public_key)}</code>${device.state === "active" ? `<button type="button" class="quiet daemon-device-revoke" data-device-revoke="${escapeHtml(device.device_id)}" ${current ? "disabled" : ""}>${current ? "현재 기기" : "기기 폐기"}</button>` : '<span class="field-note">폐기됨</span>'}</article>`;
    }).join("")
    : '<p class="field-note">등록된 기기 정보를 불러오지 못했습니다.</p>';
  return `<section class="daemon-directory"><div class="row-between"><div><h2>연결된 기기</h2><p class="field-note">기기 인증서와 폐기 상태는 daemon 암호화 저장소에서 관리됩니다.</p></div><span class="pill">${state.daemonDevices.length}대</span></div><div class="daemon-contact-list">${rows}</div><div class="daemon-device-link"><h3>새 기기 승인</h3><p class="field-note">새 기기에서 생성한 요청 payload와 별도 채널로 확인한 일회성 코드를 입력하세요. 승인 결과에는 새 기기의 개인키가 포함되지 않습니다.</p><label>기기 연결 요청<textarea id="daemon-link-request" rows="4" placeholder="ADDLINKREQ1...."></textarea></label><label>일회성 승인 코드<input id="daemon-link-code" autocomplete="off" placeholder="ABCD-EFGH-...."></label><button id="daemon-link-approve" type="button" class="secondary">기기 승인 및 인증서 발급</button>${state.daemonLinkApproval ? `<label>새 기기로 전달할 승인 자료<textarea readonly rows="4">${escapeHtml(state.daemonLinkApproval)}</textarea></label>` : ""}</div></section>`;
}

function renderDaemonSafetyControls(pairing) {
  if (!pairing?.safety_number) return "";
  if (pairing.safety_verified) return `<div class="daemon-safety"><strong>안전 번호</strong><code>${escapeHtml(pairing.safety_number)}</code><p class="verified">안전 번호 확인 완료</p></div>`;
  return `<div class="daemon-safety"><strong>안전 번호</strong><code>${escapeHtml(pairing.safety_number)}</code><p class="field-note">상대방에게 별도 신뢰 채널로 전체 번호를 읽어 확인하세요.</p><label>확인한 안전 번호<input id="daemon-safety-confirmation" autocomplete="off" /></label><button id="daemon-verify-safety" class="secondary" type="button">안전 번호 확인</button></div>`;
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

function newDaemonConversationId() {
  if (window.crypto?.randomUUID) return `conversation-${window.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  window.crypto?.getRandomValues?.(bytes);
  return `conversation-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") || Date.now()}`;
}

function decodeHexText(value) {
  const hex = String(value || "");
  if (!hex || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) throw new Error("데몬이 반환한 평문 형식이 올바르지 않습니다.");
  const bytes = Uint8Array.from(hex.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
  return new TextDecoder().decode(bytes);
}

function decodeHexBytes(value) {
  const hex = String(value || "");
  if (!hex || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) throw new Error("데몬이 반환한 파일 청크 형식이 올바르지 않습니다.");
  return Uint8Array.from(hex.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
}

function encodeHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newAttachmentBlobId() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return encodeHex(bytes);
}

function renderDaemonSessionPanel() {
  const connected = Boolean(state.daemonBridge) && !state.daemonLocked;
  if (!connected) return "";
  if (state.daemonPairing?.state !== "established" || state.daemonPairing?.safety_verified !== true) {
    return '<section class="daemon-session-tools" aria-live="polite"><h2>대화 세션</h2><p class="field-note">안전 번호를 확인하고 연락처를 승인한 뒤에만 대화 세션을 열 수 있습니다.</p></section>';
  }
  const conversationId = state.daemonConversationId || "";
  const timeline = [...state.daemonOutgoingMessages, ...state.daemonMessages];
  const receivedMessages = timeline.length
    ? timeline.map((message) => `<article class="daemon-message ${message.direction === "outgoing" ? "outgoing" : "incoming"}">${message.attachmentId ? `<p>암호화 첨부파일</p><button class="quiet daemon-attachment-download" data-daemon-attachment="${escapeHtml(message.attachmentId)}" type="button">파일 복호화·다운로드</button><button class="quiet daemon-attachment-delete" data-daemon-attachment-delete="${escapeHtml(message.attachmentId)}" type="button">로컬 첨부 상태 삭제</button>` : `<p>${escapeHtml(message.text)}</p><button class="quiet daemon-message-copy" data-daemon-copy="${escapeHtml(message.text)}" type="button">내용 복사</button>`}<small>${message.direction === "outgoing" ? "내 메시지" : "상대 메시지 · daemon 복호화 완료"} · ${escapeHtml(message.state || "decrypted")} · ${escapeHtml(message.id.slice(0, 12))}</small></article>`).join("")
    : '<p class="field-note">아직 받은 메시지가 없습니다.</p>';
  const retryButton = state.daemonDeliveryState === "retryable" ? '<button id="daemon-delivery-retry" class="secondary" type="button">전달 다시 시도</button>' : "";
  const attachmentRetry = state.daemonAttachmentBlobId && /실패|retry/i.test(state.daemonAttachmentState) ? '<button id="daemon-attachment-retry" class="secondary" type="button">첨부파일 전송 다시 시도</button><button id="daemon-attachment-cancel" class="quiet" type="button">첨부파일 작업 취소</button>' : "";
  return `<details class="daemon-session-tools"><summary>대화 세션 연결 및 메시지</summary><p class="field-note">브라우저는 평문 입력·출력만 담당하고 OpenMLS 키와 세션 상태는 데몬이 보관합니다.</p><label>대화 식별자<input id="daemon-conversation-id" value="${escapeHtml(conversationId)}" autocomplete="off" placeholder="새 대화 식별자"></label><div class="daemon-action-row"><button id="daemon-session-create" class="secondary" type="button">대화 만들기</button><button id="daemon-session-prepare" class="secondary" type="button">내 연결 자료 만들기</button></div><label>내 KeyPackage (상대 장치에 전달)<textarea id="daemon-key-package" readonly rows="3" placeholder="대화 만들기 후 생성됩니다">${escapeHtml(state.daemonKeyPackage)}</textarea></label><label>상대 장치의 Welcome<textarea id="daemon-welcome" rows="3" placeholder="상대 장치가 만든 Welcome을 붙여 넣으세요">${escapeHtml(state.daemonWelcome)}</textarea></label><button id="daemon-session-join" class="secondary" type="button">Welcome으로 참여</button><label>상대 장치의 KeyPackage<textarea id="daemon-peer-key-package" rows="3" placeholder="상대 장치의 KeyPackage를 붙여 넣으세요"></textarea></label><button id="daemon-session-add-member" class="secondary" type="button">상대 장치 추가</button><div class="daemon-divider"></div><label>메시지<textarea id="daemon-message" rows="3" placeholder="데몬이 암호화할 메시지"></textarea></label><label>상대방 inbox 주소<input id="daemon-peer-inbox-url" value="${escapeHtml(state.daemonPeerInboxUrl)}" autocomplete="off" placeholder="http://127.0.0.1:1421/api/v1/inbox/..."></label><button id="daemon-message-send" class="primary" type="button">암호화 후 릴레이로 보내기</button><section class="daemon-attachment"><h3>암호화 첨부파일</h3><p class="field-note">파일은 daemon에서 청크별 암호화됩니다. 브라우저와 relay에는 평문 파일이 저장되지 않습니다.</p><input id="daemon-attachment-file" type="file"><button id="daemon-attachment-send" class="secondary" type="button">파일 암호화·전송</button>${state.daemonAttachmentState ? `<p class="delivery-state" role="status">${escapeHtml(state.daemonAttachmentState)} · ${state.daemonAttachmentProgress}%</p><progress max="100" value="${state.daemonAttachmentProgress}">${state.daemonAttachmentProgress}%</progress>` : ""}${attachmentRetry}</section>${state.daemonDeliveryState ? `<p class="delivery-state">전달 상태: <strong>${escapeHtml(state.daemonDeliveryState)}</strong>${state.daemonDeliveryDigest ? ` · ${escapeHtml(state.daemonDeliveryDigest.slice(0, 12))}` : ""}</p><button id="daemon-delivery-status" class="quiet" type="button">전달 상태 새로고침</button>${retryButton}` : ""}<label>생성된 암호문<textarea id="daemon-ciphertext" readonly rows="3" placeholder="daemon이 생성한 암호문">${escapeHtml(state.daemonCiphertext)}</textarea></label><section class="daemon-delivery"><h3>받은 메시지 동기화</h3><p class="field-note">릴레이에서 가져온 봉투는 daemon이 검증·복호화·저장한 뒤에만 이 목록에 표시됩니다.</p><label>내 inbox 주소<input id="daemon-inbox-url" value="${escapeHtml(state.daemonInboxUrl)}" autocomplete="off" placeholder="http://127.0.0.1:1421/api/v1/inbox/..."></label><button id="daemon-delivery-sync" class="secondary" type="button">받은 메시지 동기화</button><div class="daemon-message-list" aria-live="polite">${receivedMessages}</div></section><label>받은 암호문<textarea id="daemon-incoming-ciphertext" rows="3" placeholder="수동 복구용 암호문"></textarea></label><button id="daemon-message-receive" class="secondary" type="button">복호화하여 보기</button><label>복호화된 메시지<textarea id="daemon-plaintext" readonly rows="3" placeholder="복호화 결과">${escapeHtml(state.daemonPlaintext)}</textarea></label></details>`;
}

function bindDaemonSession() {
  const bridge = state.daemonBridge;
  const expiry = document.createElement("select");
  expiry.id = "daemon-message-expiry";
  expiry.innerHTML = '<option value="0">메시지 만료 없음</option><option value="3600">1시간 후 만료</option><option value="86400">24시간 후 만료</option><option value="604800">7일 후 만료</option>';
  const expiryLabel = document.createElement("label");
  expiryLabel.textContent = "메시지 보존 기간";
  expiryLabel.append(expiry);
  document.querySelector("#daemon-message")?.parentElement?.insertAdjacentElement("afterend", expiryLabel);
  const historyButton = document.createElement("button");
  historyButton.type = "button";
  historyButton.className = "quiet";
  historyButton.textContent = "로컬 대화 기록 불러오기";
  historyButton.addEventListener("click", async () => {
    try {
      const conversationId = document.querySelector("#daemon-conversation-id")?.value.trim() || state.daemonConversationId;
      if (!conversationId) throw new Error("대화 식별자를 입력하세요.");
      const result = await bridge.messages(conversationId);
      const restored = (result.messages || []).map((message) => ({
        id: message.message_id || "복구된 메시지",
        text: decodeHexText(message.plaintext),
        state: message.direction === "outgoing" ? "내 기록" : "상대 기록",
        direction: message.direction === "outgoing" ? "outgoing" : "incoming",
      }));
      state.daemonOutgoingMessages = restored.filter((message) => message.direction === "outgoing");
      state.daemonMessages = restored.filter((message) => message.direction === "incoming");
      state.notice = "daemon 암호화 저장소에서 대화 기록을 복구했습니다.";
      state.error = "";
    } catch (error) { state.error = error.message; }
    render();
  });
  document.querySelector(".daemon-delivery")?.prepend(historyButton);
  const getConversationId = () => {
    const value = document.querySelector("#daemon-conversation-id")?.value.trim() || "";
    if (!value) throw new Error("대화 식별자를 입력하세요.");
    state.daemonConversationId = value;
    return value;
  };
  const run = async (action, success) => {
    try {
      await action();
      state.notice = success;
      state.error = "";
    } catch (error) {
      if (state.daemonAttachmentBlobId && state.daemonAttachmentProgress >= 60 && state.daemonAttachmentState !== "첨부파일 암호화·전송 완료") {
        state.daemonAttachmentState = "첨부파일 전송 실패 - 다시 시도할 수 있습니다";
      }
      if (error.code === "relay_capability_expired") {
        state.daemonPairing = { state: "rejected", safety_verified: false };
        state.daemonReceivedInvite = null;
        state.daemonPeerInboxUrl = "";
        state.daemonDeliveryDigest = "";
        state.daemonDeliveryState = "";
        state.notice = "relay capability가 폐기되어 기존 pairing을 중단했습니다. 새 연결을 시작하세요.";
      }
      state.error = error.message;
    }
    render();
  };
  document.querySelector("#daemon-session-create")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    await bridge.createConversation(conversationId);
    if (state.daemonSelectedContact) await bridge.bindContactConversation(state.daemonSelectedContact, conversationId);
    state.daemonConversationIds = [...new Set([...state.daemonConversationIds, conversationId])];
    if (state.daemonSelectedContact) state.daemonContacts = (await bridge.contacts()).contacts || state.daemonContacts;
  }, "대화 세션을 만들었습니다. 다음으로 연결 자료를 생성하세요."));
  document.querySelector("#daemon-session-prepare")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const result = await bridge.prepareConversation(conversationId);
    state.daemonKeyPackage = result.key_package || "";
    if (!state.daemonKeyPackage) throw new Error("데몬이 KeyPackage를 반환하지 않았습니다.");
  }, "내 연결 자료를 만들었습니다. 안전한 별도 채널로 상대 장치에 전달하세요."));
  document.querySelector("#daemon-session-join")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const welcome = document.querySelector("#daemon-welcome")?.value.trim() || "";
    if (!welcome) throw new Error("상대 장치의 Welcome을 입력하세요.");
    state.daemonWelcome = welcome;
    await bridge.joinConversation(conversationId, welcome);
  }, "상대 장치의 Welcome을 검증하고 대화에 참여했습니다."));
  document.querySelector("#daemon-session-add-member")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const keyPackage = document.querySelector("#daemon-peer-key-package")?.value.trim() || "";
    if (!keyPackage) throw new Error("상대 장치의 KeyPackage를 입력하세요.");
    const result = await bridge.addMember(conversationId, keyPackage);
    state.daemonWelcome = result.welcome || "";
    if (!state.daemonWelcome) throw new Error("데몬이 Welcome을 반환하지 않았습니다.");
  }, "상대 장치를 추가했습니다. 생성된 Welcome을 상대 장치에 전달하세요."));
  document.querySelector("#daemon-message-send")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const message = document.querySelector("#daemon-message")?.value || "";
    if (!message.trim()) throw new Error("메시지를 입력하세요.");
    const ttl = Number(document.querySelector("#daemon-message-expiry")?.value || 0);
    const messageExpiresAt = ttl ? Math.floor(Date.now() / 1000) + ttl : 0;
    const result = await bridge.sendMessage(conversationId, message, messageExpiresAt);
    state.daemonCiphertext = result.ciphertext || "";
    if (!state.daemonCiphertext) throw new Error("데몬이 암호문을 반환하지 않았습니다.");
    const peerInboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || "";
    if (!peerInboxUrl) throw new Error("상대방 inbox 주소를 입력하세요.");
    state.daemonPeerInboxUrl = peerInboxUrl;
    const accepted = await bridge.postDelivery(peerInboxUrl, state.daemonCiphertext, messageExpiresAt || Math.floor(Date.now() / 1000) + 3600);
    state.daemonDeliveryDigest = accepted.digest || "";
    state.daemonDeliveryState = accepted.state || "relay-accepted";
    state.daemonOutgoingMessages = [...state.daemonOutgoingMessages, {
      id: state.daemonDeliveryDigest || accepted.id || "outgoing",
      text: message,
      state: state.daemonDeliveryState,
      direction: "outgoing",
    }];
  }, "메시지를 daemon에서 암호화하고 relay에 접수했습니다."));
  document.querySelectorAll(".daemon-attachment-download").forEach((button) => button.addEventListener("click", () => run(async () => {
    const attachmentId = button.dataset.daemonAttachment || "";
    const inboxUrl = document.querySelector("#daemon-inbox-url")?.value.trim() || state.daemonInboxUrl;
    if (!attachmentId || !inboxUrl) throw new Error("첨부파일 다운로드 정보가 없습니다.");
    const chunks = [];
    let fileName = "encrypted-attachment.bin";
    let mediaType = "application/octet-stream";
    for (let index = 0; ; index += 1) {
      const result = await bridge.downloadAttachmentChunk(attachmentId, inboxUrl, index);
      if (index === 0) {
        fileName = typeof result.file_name === "string" && result.file_name ? result.file_name : fileName;
        mediaType = typeof result.media_type === "string" && result.media_type ? result.media_type : mediaType;
      }
      chunks.push(decodeHexBytes(result.plaintext));
      if (result.complete) break;
    }
    const blob = new Blob(chunks, { type: mediaType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "첨부파일을 daemon에서 검증·복호화해 다운로드했습니다.")));
  document.querySelectorAll(".daemon-attachment-delete").forEach((button) => button.addEventListener("click", () => run(async () => {
    const attachmentId = button.dataset.daemonAttachmentDelete || "";
    if (!attachmentId) throw new Error("삭제할 첨부파일 정보가 없습니다.");
    await bridge.cancelAttachment(attachmentId);
    state.daemonMessages = state.daemonMessages.filter((message) => message.attachmentId !== attachmentId);
  }, "daemon 암호화 저장소에서 첨부파일 상태를 삭제했습니다.")));
  document.querySelectorAll(".daemon-message-copy").forEach((button) => button.addEventListener("click", () => run(async () => {
    await copyToClipboard(button.dataset.daemonCopy || "");
  }, "메시지 내용을 클립보드에 복사했습니다. 공유 후 클립보드 기록을 정리하세요.")));
  document.querySelector("#daemon-attachment-send")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const file = document.querySelector("#daemon-attachment-file")?.files?.[0];
    const inboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || state.daemonPeerInboxUrl;
    if (!file) throw new Error("전송할 파일을 선택하세요.");
    if (!inboxUrl) throw new Error("상대방 inbox 주소를 입력하세요.");
    if (file.size === 0 || file.size > 32 * 1024 * 1024) throw new Error("첨부파일은 1바이트 이상 32MiB 이하여야 합니다.");
    const blobId = newAttachmentBlobId();
    state.daemonAttachmentBlobId = blobId;
    const chunkSize = 64 * 1024;
    state.daemonAttachmentState = "daemon에서 암호화 준비 중";
    state.daemonAttachmentProgress = 0;
    const progress = (message, value) => {
      state.daemonAttachmentState = message;
      state.daemonAttachmentProgress = value;
      const node = document.querySelector(".daemon-attachment .delivery-state");
      const bar = document.querySelector(".daemon-attachment progress");
      if (node) node.textContent = `${message} · ${value}%`;
      if (bar) bar.value = value;
    };
    await bridge.startAttachment(blobId, file.size, file.name, file.type);
    for (let index = 0, offset = 0; offset < file.size; index += 1, offset += chunkSize) {
      const bytes = new Uint8Array(await file.slice(offset, Math.min(offset + chunkSize, file.size)).arrayBuffer());
      await bridge.appendAttachment(blobId, index, encodeHex(bytes));
      progress(`파일 청크 ${index + 1} 암호화 중`, Math.floor((Math.min(offset + bytes.length, file.size) / file.size) * 60));
    }
    await bridge.finishAttachment(blobId);
    progress("daemon이 암호화 blob을 relay로 전송 중", 80);
    const accepted = await bridge.sendCompletedAttachment(conversationId, inboxUrl, blobId);
    state.daemonPeerInboxUrl = inboxUrl;
    state.daemonDeliveryDigest = accepted.digest || "";
    state.daemonDeliveryState = accepted.state || "relay-accepted";
    state.daemonAttachmentProgress = 100;
    state.daemonAttachmentState = "첨부파일 암호화·전송 완료";
    state.daemonOutgoingMessages = [...state.daemonOutgoingMessages, { id: state.daemonDeliveryDigest || "attachment", text: `첨부파일: ${file.name}`, state: state.daemonDeliveryState, direction: "outgoing" }];
  }, "첨부파일을 daemon에서 암호화하고 relay에 접수했습니다."));
  document.querySelector("#daemon-attachment-retry")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const inboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || state.daemonPeerInboxUrl;
    if (!state.daemonAttachmentBlobId || !inboxUrl) throw new Error("재시도할 첨부파일 정보가 없습니다.");
    const accepted = await bridge.sendCompletedAttachment(conversationId, inboxUrl, state.daemonAttachmentBlobId);
    state.daemonPeerInboxUrl = inboxUrl;
    state.daemonDeliveryDigest = accepted.digest || "";
    state.daemonDeliveryState = accepted.state || "relay-accepted";
    state.daemonAttachmentProgress = 100;
    state.daemonAttachmentState = "첨부파일 재전송 완료";
  }, "첨부파일을 암호화 blob 재사용으로 다시 전송했습니다."));
  document.querySelector("#daemon-attachment-cancel")?.addEventListener("click", () => run(async () => {
    if (state.daemonAttachmentBlobId) await bridge.cancelAttachment(state.daemonAttachmentBlobId);
    state.daemonAttachmentBlobId = "";
    state.daemonAttachmentProgress = 0;
    state.daemonAttachmentState = "첨부파일 작업을 취소했습니다";
  }, "첨부파일 암호화 상태를 daemon에서 폐기했습니다."));
  document.querySelector("#daemon-delivery-status")?.addEventListener("click", () => run(async () => {
    if (!state.daemonDeliveryDigest) throw new Error("조회할 전달 기록이 없습니다.");
    const result = await bridge.deliveryStatus(state.daemonDeliveryDigest);
    state.daemonDeliveryState = result.state || state.daemonDeliveryState;
    state.daemonOutgoingMessages = state.daemonOutgoingMessages.map((item) => item.id === state.daemonDeliveryDigest ? { ...item, state: state.daemonDeliveryState } : item);
  }, "전달 상태를 갱신했습니다."));
  document.querySelector("#daemon-delivery-retry")?.addEventListener("click", () => run(async () => {
    if (!state.daemonDeliveryDigest) throw new Error("재시도할 전달 기록이 없습니다.");
    const inboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || state.daemonPeerInboxUrl;
    if (!inboxUrl) throw new Error("상대방 inbox 주소를 입력하세요.");
    const result = await bridge.retryDelivery(inboxUrl, state.daemonDeliveryDigest);
    state.daemonDeliveryState = result.state || "relay-accepted";
    state.daemonOutgoingMessages = state.daemonOutgoingMessages.map((item) => item.id === state.daemonDeliveryDigest ? { ...item, state: state.daemonDeliveryState } : item);
  }, "암호화된 봉투를 relay로 다시 접수했습니다."));
  document.querySelector("#daemon-message-receive")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const ciphertext = document.querySelector("#daemon-incoming-ciphertext")?.value.trim() || "";
    if (!ciphertext) throw new Error("받은 암호문을 입력하세요.");
    const result = await bridge.receiveMessage(conversationId, ciphertext);
    state.daemonPlaintext = decodeHexText(result.plaintext);
  }, "암호문을 데몬에서 복호화했습니다."));
  document.querySelector("#daemon-delivery-sync")?.addEventListener("click", () => run(async () => {
    const conversationId = getConversationId();
    const inboxUrl = document.querySelector("#daemon-inbox-url")?.value.trim() || "";
    if (!inboxUrl) throw new Error("내 inbox 주소를 입력하세요.");
    state.daemonInboxUrl = inboxUrl;
    const result = await bridge.syncDelivery(conversationId, inboxUrl);
    const received = (result.messages || []).map((message) => ({
      id: message.id || "수신 메시지",
      text: message.attachment_id ? "암호화 첨부파일" : message.expired ? "만료된 메시지" : decodeHexText(message.plaintext),
      attachmentId: message.attachment_id || "",
      state: "decrypted",
      direction: "incoming",
    }));
    state.daemonMessages = [...state.daemonMessages, ...received];
    state.daemonPlaintext = received.at(-1)?.text || state.daemonPlaintext;
  }, "받은 봉투를 daemon에서 검증·복호화했습니다."));
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
    [/(safety material|safety|identity changed|peer identity|pairing_not_ready|pairing_binding_changed)/, "상대 identity 또는 안전 문구를 신뢰할 수 없습니다.", "전송을 중단하고 별도 신뢰 채널에서 초대와 전체 안전 문구를 다시 비교하세요. identity 변경이면 기존 연결을 폐기하고 새 pairing을 진행해야 합니다.", "메시지 전송은 허용되지 않습니다.", "확인 전 재시도하지 마세요."],
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
  if (state.daemonBridgeMode) {
    app.innerHTML = renderDaemonBridgeState();
    if (state.daemonBridge && !state.daemonLocked) {
      document.querySelector(".daemon-gate")?.insertAdjacentHTML("beforeend", renderDaemonRelayTrust());
      const wipeButton = document.createElement("button");
      wipeButton.type = "button";
      wipeButton.className = "danger";
      wipeButton.textContent = "이 기기의 daemon 데이터 긴급 삭제";
      wipeButton.addEventListener("click", async () => {
        if (!window.confirm("이 기기의 daemon store와 메모리 세션을 삭제할까요? relay·백업·SSD 잔존 데이터는 삭제되지 않습니다.")) return;
        try {
          const result = await state.daemonBridge.wipe();
          state.daemonBridge = null;
          state.daemonLocked = true;
          state.daemonStatus = "삭제됨 · daemon 재초기화 필요";
          state.notice = result.remote_data === "not_deleted"
            ? "이 기기의 daemon 데이터만 삭제했습니다. relay와 백업은 별도로 폐기해야 합니다."
            : "daemon 데이터를 삭제했습니다.";
          state.error = "";
        } catch (error) { state.error = error.message; }
        render();
      });
      document.querySelector(".daemon-gate")?.append(wipeButton);
    }
    document.querySelector("#daemon-save-relay-pin")?.addEventListener("click", async () => {
      try {
        const pin = document.querySelector("#daemon-tls-pin")?.value.trim() || "";
        const retrust = Boolean(document.querySelector("#daemon-tls-retrust")?.checked);
        state.daemonRelayTrust = await state.daemonBridge.saveRelayTlsPin(pin, retrust);
        state.notice = "relay TLS pin을 daemon 암호화 저장소에 저장했습니다.";
        state.error = "";
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
    document.querySelectorAll("[data-device-revoke]").forEach((button) => button.addEventListener("click", async () => {
      const deviceId = button.dataset.deviceRevoke || "";
      if (!deviceId || !window.confirm(`기기 ${deviceId}를 폐기할까요? 해당 기기는 이후 daemon 인증에 사용할 수 없습니다.`)) return;
      try {
        await state.daemonBridge.revokeDevice(deviceId);
        const sessionResult = await state.daemonBridge.removeDeviceFromSessions(state.daemonIdentity?.account_id || "", deviceId);
        state.daemonDevices = (await state.daemonBridge.devices()).devices || [];
        state.notice = `기기 ${deviceId}를 폐기했고 현재 기기의 MLS 세션에서 제거한 commit ${sessionResult.delivered || 0}개를 relay로 전달했습니다.`;
        state.error = "";
      } catch (error) { state.error = `기기 폐기 또는 로컬 MLS 제거에 실패했습니다: ${error.message}`; }
      render();
    }));
    document.querySelector("#daemon-link-approve")?.addEventListener("click", async () => {
      const linkRequest = document.querySelector("#daemon-link-request")?.value.trim() || "";
      const code = document.querySelector("#daemon-link-code")?.value.trim() || "";
      if (!linkRequest || !code) {
        state.error = "기기 연결 요청과 일회성 코드를 모두 입력하세요.";
        render();
        return;
      }
      try {
        const result = await state.daemonBridge.approveDeviceLink(linkRequest, code);
        state.daemonDevices = (await state.daemonBridge.devices()).devices || [];
        state.daemonLinkApproval = result.approval || "";
        state.notice = `기기 ${result.device_id}의 인증서를 발급했습니다. 승인 자료를 새 기기에만 전달하세요.`;
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    });
    document.querySelector("#daemon-contact-search")?.addEventListener("input", (event) => {
      state.daemonContactSearch = event.currentTarget.value;
      render();
    });
    document.querySelectorAll("[data-contact-account]").forEach((button) => button.addEventListener("click", () => {
      state.daemonSelectedContact = button.dataset.contactAccount || "";
      state.notice = "연락처를 선택했습니다. 해당 identity를 확인한 뒤 대화 세션을 연결하세요.";
      state.daemonBridge.markContactRead(state.daemonSelectedContact).then(async () => {
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || state.daemonContacts;
        render();
      }).catch(() => {});
      render();
    }));
    document.querySelectorAll("[data-contact-save]").forEach((button) => button.addEventListener("click", async () => {
      try {
        const accountId = button.dataset.contactSave || "";
        const alias = [...document.querySelectorAll("[data-contact-alias]")].find((input) => input.dataset.contactAlias === accountId)?.value || "";
        await state.daemonBridge.setContactAlias(accountId, alias);
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || [];
        state.notice = "연락처 별칭을 저장했습니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    }));
    document.querySelectorAll("[data-contact-block]").forEach((button) => button.addEventListener("click", async () => {
      try {
        const accountId = button.dataset.contactBlock || "";
        const contact = state.daemonContacts.find((item) => item.account_id === accountId);
        if (contact?.state !== "blocked" && !window.confirm("이 연락처의 메시지 송수신을 차단할까요?")) return;
        if (contact?.state === "blocked") await state.daemonBridge.unblockContact(accountId);
        else await state.daemonBridge.blockContact(accountId);
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || [];
        state.notice = contact?.state === "blocked" ? "연락처 차단을 해제했습니다." : "연락처를 차단했습니다. 해당 대화의 송수신이 중단됩니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    }));
    document.querySelectorAll("[data-contact-delete]").forEach((button) => button.addEventListener("click", async () => {
      try {
        const accountId = button.dataset.contactDelete || "";
        if (!window.confirm("연락처와 이 기기의 대화 세션을 삭제할까요? 복구할 수 없습니다.")) return;
        await state.daemonBridge.deleteContact(accountId);
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || [];
        if (state.daemonSelectedContact === accountId) state.daemonSelectedContact = "";
        state.notice = "연락처와 로컬 대화 세션을 삭제했습니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    }));
    if (state.daemonPairing?.safety_number) {
      const inviteSection = document.querySelector("#daemon-consume-invite")?.closest("section");
      inviteSection?.insertAdjacentHTML("beforeend", renderDaemonSafetyControls(state.daemonPairing));
      if (!state.daemonPairing.safety_verified) document.querySelector("#daemon-approve-pairing")?.remove();
    }
    document.querySelector("#daemon-lock")?.addEventListener("click", async () => {
      try {
        await state.daemonBridge.lock();
        state.daemonBridge = null;
        state.daemonLocked = true;
        state.daemonStatus = "잠김";
        state.notice = "데몬 세션을 잠갔습니다. 브라우저에는 키와 메시지 상태가 없습니다.";
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
    document.querySelector("#daemon-create-invite")?.addEventListener("click", async () => {
      try {
        const localInvite = await state.daemonBridge.request("/local-api/invites", { method: "POST" });
        if (!state.daemonRelayOrigin) throw new Error("daemon에 relay 주소가 설정되지 않았습니다.");
        const relayCode = await createRelayInviteCode(state.daemonRelayOrigin, localInvite.signed_invite);
        state.daemonInvite = { ...localInvite, invite_code: relayCode.code, expires_at: relayCode.expiresAt, invite_digest: relayCode.inviteDigest };
        state.notice = "relay가 일회성 초대코드를 발급했습니다. 코드만 별도 신뢰 채널로 전달하세요.";
        state.error = "";
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
    document.querySelector("#daemon-revoke-invite")?.addEventListener("click", async () => {
      try {
        if (!window.confirm("이 초대코드를 즉시 폐기할까요? 상대는 더 이상 사용할 수 없습니다.")) return;
        await revokeRelayInviteCode(state.daemonRelayOrigin, state.daemonInvite.invite_code);
        state.daemonInvite = null;
        state.notice = "초대코드를 relay에서 폐기했습니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    });
    document.querySelector("#daemon-approve-pairing")?.addEventListener("click", async () => {
      try {
        state.daemonPairing = { ...state.daemonPairing, ...(await state.daemonBridge.approvePairing()), safety_verified: true };
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || state.daemonContacts;
        state.notice = "상대 연락처를 승인했습니다. 이제 후속 세션 연결을 진행할 수 있습니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    });
    document.querySelector("#daemon-verify-safety")?.addEventListener("click", async () => {
      try {
        const verified = await state.daemonBridge.verifySafety(document.querySelector("#daemon-safety-confirmation").value);
        state.daemonPairing = { ...state.daemonPairing, ...verified, safety_verified: true };
        state.daemonReceivedInvite = { ...state.daemonReceivedInvite, safety_verified: true };
        state.notice = "안전 번호를 확인했습니다. 이제 연락처 승인을 진행할 수 있습니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    });
    document.querySelector("#daemon-reject-pairing")?.addEventListener("click", async () => {
      try {
        state.daemonPairing = await state.daemonBridge.rejectPairing();
        state.daemonReceivedInvite = null;
        state.notice = "상대 연락처 요청을 거절했습니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    });
    document.querySelector("#daemon-consume-invite")?.addEventListener("click", async () => {
      try {
        const result = await consumeRelayInvite(document.querySelector("#received-relay-origin").value, document.querySelector("#received-invite-code").value);
        state.daemonConsumedInvite = result.invite;
        state.daemonInviteReceipt = result.receipt;
        const staged = await state.daemonBridge.request("/local-api/invites/stage", { method: "POST", body: JSON.stringify({ invite_code: document.querySelector("#received-invite-code").value, signed_invite: result.invite, relay_receipt: result.receipt }) });
        state.daemonReceivedInvite = staged;
        state.daemonPairing = staged;
        state.daemonPeerInboxUrl = staged.inbox_url || "";
        state.daemonConsumedInvite = "";
        state.notice = "relay 초대코드를 소비하고 daemon에서 상대 identity를 검증했습니다. 승인 전에는 연결되지 않습니다.";
        state.error = "";
      } catch (error) { state.error = error.message; }
      render();
    });
    bindDaemonSession();
    return;
  }
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

async function receiveDaemonMessages(background = false) {
  const bridge = state.daemonBridge;
  if (daemonSyncInFlight || !bridge || state.daemonLocked || !state.daemonConversationId || !state.daemonInboxUrl) return;
  if (state.daemonPairing?.state !== "established" || state.daemonPairing?.safety_verified !== true) return;
  daemonSyncInFlight = true;
  try {
    const result = await bridge.syncDelivery(state.daemonConversationId, state.daemonInboxUrl, background);
    const received = (result.messages || []).map((message) => ({
      id: message.id || "수신 메시지",
      text: message.attachment_id ? "암호화 첨부파일" : decodeHexText(message.plaintext),
      attachmentId: message.attachment_id || "",
      state: "decrypted",
      direction: "incoming",
    }));
    if (received.length) {
      state.daemonMessages = [...state.daemonMessages, ...received];
      state.daemonContacts = (await bridge.contacts()).contacts || state.daemonContacts;
      state.notice = background ? `${received.length}개의 새 암호화 메시지를 받았습니다.` : "받은 암호화 메시지를 동기화했습니다.";
      state.error = "";
      render();
    }
  } catch (error) {
    if (error.code === "relay_capability_expired") {
      state.daemonPairing = { state: "rejected", safety_verified: false };
      state.daemonInboxUrl = "";
      state.notice = "relay capability가 폐기되어 새 연결이 필요합니다.";
      render();
    }
  } finally {
    daemonSyncInFlight = false;
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
window.setInterval(() => {
  if (!document.hidden) return;
  receiveDaemonMessages(true);
}, 15_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    receiveMessages(false);
    receiveDaemonMessages(false);
  }
});
window.addEventListener("pagehide", () => lockProfile({ reason: "pagehide" }), { once: true });

async function startApp() {
  try {
    const daemonBridge = await connectDaemonBridge();
    if (daemonBridge) {
      state.daemonBridge = daemonBridge;
      state.daemonBridgeMode = true;
      const daemonStatus = await daemonBridge.request("/local-api/status");
      state.daemonStatus = daemonStatus.status || "인증됨";
      state.daemonRelayOrigin = daemonStatus.relay_origin || "";
      state.daemonIdentity = await daemonBridge.request("/local-api/identity");
      state.daemonPairing = await daemonBridge.pairingStatus();
      state.daemonRelayTrust = await daemonBridge.relayTrust();
      try {
        state.daemonDevices = (await daemonBridge.devices()).devices || [];
        state.daemonContacts = (await daemonBridge.contacts()).contacts || [];
        state.daemonConversationIds = (await daemonBridge.conversations()).conversations || [];
      } catch {
        // Older daemon binaries may not expose the directory endpoints yet.
        state.daemonDevices = [];
        state.daemonContacts = [];
        state.daemonConversationIds = [];
      }
      state.notice = "브라우저 보안 경계를 확인했습니다. 암호화 키와 메시지 상태는 daemon이 소유합니다.";
      render();
      return;
    }
    await ready;
    render();
  } catch (error) {
    state.daemonBridgeMode = Boolean(error instanceof DaemonBridgeError || window.location?.hash);
    state.error = error.message;
    render();
  }
}

startApp();

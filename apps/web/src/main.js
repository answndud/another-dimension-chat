import { connectDaemonBridge, consumeRelayInvite, createRelayInviteCode, revokeRelayInviteCode } from "./daemon-bridge.js";
import "./styles.css";

const app = document.querySelector("#app");
let state = { profile: null, peer: null, activeView: "connect", generatedPassphrase: "", daemonReceivedInvite: null, daemonConsumedInvite: "", daemonInviteReceipt: "", daemonRelayOrigin: "", serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", profileBackup: "", sessionBackup: "", transcriptExport: "", messages: [], error: "", notice: "", riskAcknowledged: false, wipeConfirmOpen: false, daemonBridge: null, daemonBridgeMode: false, daemonStatus: "확인 중", daemonRelayState: "unknown", daemonStorage: null, daemonIdentity: null, daemonInvite: null, daemonPairing: null, daemonRelayTrust: null, daemonDevices: [], daemonDeviceEvents: [], daemonLinkApproval: "", daemonContacts: [], daemonContactSearch: "", daemonConversationIds: [], daemonSelectedContact: "", daemonLocked: false, daemonConversationId: "", daemonKeyPackage: "", daemonWelcome: "", daemonCiphertext: "", daemonPlaintext: "", daemonInboxUrl: "", daemonPeerInboxUrl: "", daemonMessages: [], daemonOutgoingMessages: [], daemonDeliveryDigest: "", daemonDeliveryState: "", daemonAttachmentState: "", daemonAttachmentProgress: 0, daemonAttachmentBlobId: "" };
let daemonSyncInFlight = false;
const PASSPHRASE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";


function renderDaemonBridgeState() {
  const connected = Boolean(state.daemonBridge) && !state.daemonLocked;
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
  const eventRows = state.daemonDeviceEvents.length
    ? state.daemonDeviceEvents.slice().reverse().slice(0, 8).map((event) => `<li><strong>${event.kind === "revoked" ? "기기 폐기" : "기기 등록"}</strong><span>${escapeHtml(event.device_id)} · ${escapeHtml(new Date(Number(event.at) * 1000).toLocaleString("ko-KR"))}</span></li>`).join("")
    : '<li class="field-note">아직 기기 변경 이력이 없습니다.</li>';
  return `<section class="daemon-directory"><div class="row-between"><div><h2>연결된 기기</h2><p class="field-note">기기 인증서와 폐기 상태는 daemon 암호화 저장소에서 관리됩니다.</p></div><span class="pill">${state.daemonDevices.length}대</span></div><div class="daemon-contact-list">${rows}</div><details class="daemon-device-events"><summary>기기 변경 이력</summary><ul>${eventRows}</ul></details><div class="daemon-device-link"><h3>새 기기 승인</h3><p class="field-note">새 기기에서 생성한 요청 payload와 별도 채널로 확인한 일회성 코드를 입력하세요. 승인 결과에는 새 기기의 개인키가 포함되지 않습니다.</p><label>기기 연결 요청<textarea id="daemon-link-request" rows="4" placeholder="ADDLINKREQ1...."></textarea></label><label>일회성 승인 코드<input id="daemon-link-code" autocomplete="off" placeholder="ABCD-EFGH-...."></label><button id="daemon-link-approve" type="button" class="secondary">기기 승인 및 인증서 발급</button>${state.daemonLinkApproval ? `<label>새 기기로 전달할 승인 자료<textarea readonly rows="4">${escapeHtml(state.daemonLinkApproval)}</textarea></label>` : ""}</div></section>`;
}

function renderDaemonSafetyControls(pairing) {
  if (!pairing?.safety_number) return "";
  if (pairing.safety_verified) return `<div class="daemon-safety" aria-live="polite"><strong>안전 번호</strong><code>${escapeHtml(pairing.safety_number)}</code><p class="verified">안전 번호 확인 완료 · 메시지 송신 허용</p><button id="daemon-unverify-safety" class="quiet" type="button">안전 번호 다시 확인</button></div>`;
  return `<div class="daemon-safety" aria-live="polite"><strong>안전 번호</strong><code>${escapeHtml(pairing.safety_number)}</code><p class="field-note">상대방에게 별도 신뢰 채널로 전체 번호를 읽어 확인하세요.</p><label>확인한 안전 번호<input id="daemon-safety-confirmation" autocomplete="off" inputmode="text" /></label><button id="daemon-verify-safety" class="secondary" type="button">안전 번호 확인</button></div>`;
}


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

function daemonDeliveryLabel(value) {
  return {
    draft: "작성 중",
    encrypted: "암호화 완료",
    queued: "전달 대기 중",
    "relay-accepted": "릴레이 접수됨 · 상대 수신 대기",
    "recipient-received": "상대 데몬 수신됨",
    decrypted: "상대 데몬에서 복호화됨",
    retryable: "전달 실패 · 다시 시도 가능",
    failed: "전달 실패 · 재시도 한도 초과",
    cancelled: "전달 취소됨",
  }[value] || String(value || "상태 확인 중");
}

function mergeDaemonMessages(existing, incoming) {
  const known = new Set(existing.map((message) => message.id));
  return [...existing, ...incoming.filter((message) => message.id && !known.has(message.id))];
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
  const selectedContact = state.daemonContacts.find((contact) => contact.account_id === state.daemonSelectedContact);
  const conversationId = state.daemonConversationId || "";
  const peerInboxUrl = state.daemonPeerInboxUrl || selectedContact?.inbox_url || "";
  const timeline = [...state.daemonOutgoingMessages, ...state.daemonMessages];
  const receivedMessages = timeline.length
    ? timeline.map((message) => `<article class="daemon-message ${message.direction === "outgoing" ? "outgoing" : "incoming"}">${message.attachmentId ? `<p>암호화 첨부파일</p><button class="quiet daemon-attachment-download" data-daemon-attachment="${escapeHtml(message.attachmentId)}" type="button">파일 복호화·다운로드</button><button class="quiet daemon-attachment-delete" data-daemon-attachment-delete="${escapeHtml(message.attachmentId)}" type="button">로컬 첨부 상태 삭제</button>` : `<p>${escapeHtml(message.text)}</p><button class="quiet daemon-message-copy" data-daemon-copy="${escapeHtml(message.text)}" type="button">내용 복사</button>`}<small>${message.direction === "outgoing" ? "내 메시지" : "상대 메시지 · 암호화 저장소에서 복호화됨"} · ${escapeHtml(daemonDeliveryLabel(message.state || "decrypted"))} · ${escapeHtml(message.id.slice(0, 12))}</small></article>`).join("")
    : '<p class="field-note">아직 받은 메시지가 없습니다.</p>';
  const retryButton = state.daemonDeliveryState === "retryable" ? '<button id="daemon-delivery-retry" class="secondary" type="button">전달 다시 시도</button>' : "";
  const attachmentRetry = state.daemonAttachmentBlobId && /실패|retry/i.test(state.daemonAttachmentState) ? '<button id="daemon-attachment-retry" class="secondary" type="button">첨부파일 전송 다시 시도</button><button id="daemon-attachment-cancel" class="quiet" type="button">첨부파일 작업 취소</button>' : "";
  const contactTitle = selectedContact?.alias || selectedContact?.account_id?.slice(0, 18) || "연락처를 선택하세요";
  const sessionSetup = selectedContact && !conversationId
    ? `<section class="daemon-session-setup"><strong>이 연락처와 대화를 시작할 준비가 필요합니다.</strong><p class="field-note">먼저 로컬 대화 상태를 만들고, 두 기기 사이의 연결 자료는 별도 신뢰 채널로 교환합니다.</p><button id="daemon-session-create" class="primary" type="button">이 연락처의 대화 준비</button></section>`
    : !selectedContact
      ? '<section class="daemon-session-setup"><strong>왼쪽 연락처에서 대화 상대를 선택하세요.</strong><p class="field-note">선택한 연락처의 대화 상태와 전달 경로가 자동으로 사용됩니다.</p></section>'
      : `<p class="field-note daemon-session-ready">이 연락처의 로컬 대화 상태가 준비되었습니다.</p>`;
  const deliveryState = state.daemonDeliveryState
    ? `<p class="delivery-state">전달 상태: <strong>${escapeHtml(daemonDeliveryLabel(state.daemonDeliveryState))}</strong>${state.daemonDeliveryDigest ? ` · ${escapeHtml(state.daemonDeliveryDigest.slice(0, 12))}` : ""}</p><button id="daemon-delivery-status" class="quiet" type="button">전달 상태 새로고침</button>${retryButton}`
    : "";
  return `<section class="daemon-session-tools daemon-conversation-panel"><header class="daemon-conversation-heading"><div><span class="eyebrow">LOCAL CONVERSATION</span><h2>${escapeHtml(contactTitle)}</h2><p class="field-note">브라우저는 입력과 표시만 담당하고, 암호화 키와 대화 상태는 daemon이 보관합니다.</p></div>${selectedContact ? `<span class="pill">${escapeHtml(selectedContact.state)}${selectedContact.conversation_id ? " · 연결됨" : " · 준비 필요"}</span>` : ""}</header>${sessionSetup}<input id="daemon-conversation-id" type="hidden" value="${escapeHtml(conversationId)}"><input id="daemon-peer-inbox-url" type="hidden" value="${escapeHtml(peerInboxUrl)}"><div class="daemon-message-list" aria-live="polite" aria-label="대화 메시지">${receivedMessages}</div><label>메시지<textarea id="daemon-message" rows="3" placeholder="메시지를 입력하세요" ${conversationId ? "" : "disabled"}></textarea></label><button id="daemon-message-send" class="primary" type="button" ${conversationId ? "" : "disabled"}>보내기</button><section class="daemon-attachment"><h3>파일 보내기</h3><p class="field-note">파일은 daemon에서 암호화한 뒤 전달됩니다. 상대방의 전달 경로는 선택한 연락처에서 사용합니다.</p><label>암호화할 파일<input id="daemon-attachment-file" type="file" ${conversationId ? "" : "disabled"}></label><button id="daemon-attachment-send" class="secondary" type="button" ${conversationId ? "" : "disabled"}>파일 암호화·전송</button>${state.daemonAttachmentState ? `<p class="delivery-state" role="status">${escapeHtml(state.daemonAttachmentState)} · ${state.daemonAttachmentProgress}%</p><progress max="100" value="${state.daemonAttachmentProgress}">${state.daemonAttachmentProgress}%</progress>` : ""}${attachmentRetry}</section>${deliveryState}<section class="daemon-delivery"><h3>받은 메시지</h3><p class="field-note">내 inbox가 설정된 경우 새 암호화 봉투를 확인하고 로컬 저장소에 반영합니다.</p><input id="daemon-inbox-url" type="hidden" value="${escapeHtml(state.daemonInboxUrl)}"><button id="daemon-delivery-sync" class="secondary" type="button" ${conversationId ? "" : "disabled"}>받은 메시지 동기화</button></section><details class="daemon-advanced-tools"><summary>고급 연결·복구 도구</summary><p class="field-note">아래 항목은 두 기기 간 연결 자료를 수동 교환하거나 장애를 복구할 때만 사용합니다. 일반 대화에서는 열지 마세요.</p><div class="daemon-advanced-grid"><label>내 연결 자료<textarea id="daemon-key-package" readonly rows="3" placeholder="대화 준비 후 생성됩니다">${escapeHtml(state.daemonKeyPackage)}</textarea></label><button id="daemon-session-prepare" class="secondary" type="button">연결 자료 생성</button><label>상대 기기의 참여 승인 자료<textarea id="daemon-welcome" rows="3" placeholder="별도 신뢰 채널로 받은 자료"></textarea></label><button id="daemon-session-join" class="secondary" type="button">참여 승인 자료 적용</button><label>상대 기기의 연결 자료<textarea id="daemon-peer-key-package" rows="3" placeholder="별도 신뢰 채널로 받은 자료"></textarea></label><button id="daemon-session-add-member" class="secondary" type="button">상대 기기 추가</button><label>생성된 암호화 봉투<textarea id="daemon-ciphertext" readonly rows="3" placeholder="daemon이 생성한 봉투">${escapeHtml(state.daemonCiphertext)}</textarea></label><label>받은 암호화 봉투<textarea id="daemon-incoming-ciphertext" rows="3" placeholder="수동 복구용"></textarea></label><button id="daemon-message-receive" class="secondary" type="button">복호화하여 보기</button><label>복호화 결과<textarea id="daemon-plaintext" readonly rows="3" placeholder="복호화 결과">${escapeHtml(state.daemonPlaintext)}</textarea></label></div></details></section>`;
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
      if (error.code === "relay_unavailable") {
        state.daemonRelayState = "offline";
        state.notice = "릴레이에 연결할 수 없습니다. 로컬 암호화 상태는 유지되며, 연결 후 다시 시도할 수 있습니다.";
        state.error = "";
      } else {
        state.error = error.message;
      }
    }
    render();
  };
  document.querySelector("#daemon-session-create")?.addEventListener("click", () => run(async () => {
    let conversationId = document.querySelector("#daemon-conversation-id")?.value.trim() || "";
    if (!conversationId && state.daemonSelectedContact) {
      conversationId = newDaemonConversationId();
      state.daemonConversationId = conversationId;
    }
    if (!conversationId) conversationId = getConversationId();
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
    let accepted;
    try {
      accepted = await bridge.postDelivery(peerInboxUrl, state.daemonCiphertext, messageExpiresAt || Math.floor(Date.now() / 1000) + 3600);
      state.daemonRelayState = "online";
    } catch (error) {
      if (error.code === "relay_unavailable") {
        state.daemonRelayState = "offline";
        state.daemonDeliveryDigest = error.digest || "";
        state.daemonDeliveryState = error.state || "retryable";
        state.daemonOutgoingMessages = [...state.daemonOutgoingMessages, {
          id: state.daemonDeliveryDigest || "queued-outgoing",
          text: message,
          state: state.daemonDeliveryState,
          direction: "outgoing",
        }];
      }
      throw error;
    }
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
    let accepted;
    try {
      accepted = await bridge.sendCompletedAttachment(conversationId, inboxUrl, blobId);
      state.daemonRelayState = "online";
    } catch (error) {
      if (error.code === "relay_unavailable") {
        state.daemonRelayState = "offline";
        state.daemonDeliveryDigest = error.digest || "";
        state.daemonDeliveryState = error.state || "retryable";
        state.daemonAttachmentState = "첨부파일 전달 대기 중 · 다시 시도할 수 있습니다";
      }
      throw error;
    }
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
    state.daemonRelayState = "online";
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
    state.daemonRelayState = "online";
    state.daemonDeliveryState = result.state || state.daemonDeliveryState;
    state.daemonOutgoingMessages = state.daemonOutgoingMessages.map((item) => item.id === state.daemonDeliveryDigest ? { ...item, state: state.daemonDeliveryState } : item);
  }, "전달 상태를 갱신했습니다."));
  document.querySelector("#daemon-delivery-retry")?.addEventListener("click", () => run(async () => {
    if (!state.daemonDeliveryDigest) throw new Error("재시도할 전달 기록이 없습니다.");
    const inboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || state.daemonPeerInboxUrl;
    if (!inboxUrl) throw new Error("상대방 inbox 주소를 입력하세요.");
    const result = await bridge.retryDelivery(inboxUrl, state.daemonDeliveryDigest);
    state.daemonRelayState = "online";
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
    state.daemonRelayState = "online";
    const received = (result.messages || []).map((message) => ({
      id: message.id || "수신 메시지",
      text: message.attachment_id ? "암호화 첨부파일" : message.expired ? "만료된 메시지" : decodeHexText(message.plaintext),
      attachmentId: message.attachment_id || "",
      state: "decrypted",
      direction: "incoming",
    }));
    state.daemonMessages = mergeDaemonMessages(state.daemonMessages, received);
    state.daemonPlaintext = received.at(-1)?.text || state.daemonPlaintext;
  }, "받은 봉투를 daemon에서 검증·복호화했습니다."));
}

async function copyToClipboard(value) {
  if (!window.isSecureContext || typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
    throw new Error("Clipboard is unavailable. Copy the displayed encrypted material manually and clear clipboard history after delivery.");
  }
  await navigator.clipboard.writeText(value);
}

function render() {
  if (state.daemonBridgeMode) {
    app.innerHTML = renderDaemonBridgeState();
    if (state.daemonRelayState === "offline") {
      document.querySelector(".daemon-gate .notice")?.insertAdjacentHTML("beforebegin", '<div class="daemon-connection-banner offline" role="status"><strong>릴레이 연결이 끊겼습니다.</strong><span>로컬 대화와 암호화 상태는 유지됩니다. 연결이 복구되면 전달 대기 항목을 다시 시도하세요.</span></div>');
    } else if (state.daemonRelayState === "online") {
      document.querySelector(".daemon-gate .notice")?.insertAdjacentHTML("beforebegin", '<div class="daemon-connection-banner online" role="status"><strong>릴레이 연결됨</strong><span>릴레이 접수는 상대방이 읽었다는 뜻이 아닙니다.</span></div>');
    }
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
      const recoveryButton = document.createElement("button");
      recoveryButton.type = "button";
      recoveryButton.className = "secondary";
      recoveryButton.textContent = "암호화 복구 백업 다운로드";
      recoveryButton.addEventListener("click", async () => {
        if (!window.confirm("현재 daemon 저장소의 암호화 복구 백업을 다운로드할까요? 원래 프로필 암호 문구가 있어야 복구할 수 있습니다.")) return;
        try {
          const result = await state.daemonBridge.recoveryExport();
          const bytes = decodeHexBytes(result.artifact_hex || "");
          const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "another-dimension-recovery.adbackup";
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          state.notice = "암호화 복구 백업을 다운로드했습니다. 원본 암호 문구와 별도 오프라인 저장소에 보관하세요.";
          state.error = "";
        } catch (error) { state.error = `복구 백업을 만들지 못했습니다: ${error.message}`; }
        render();
      });
      const recoveryInput = document.createElement("input");
      recoveryInput.type = "file";
      recoveryInput.accept = ".adbackup,application/octet-stream";
      recoveryInput.setAttribute("aria-label", "암호화 복구 백업 파일 선택");
      const restoreButton = document.createElement("button");
      restoreButton.type = "button";
      restoreButton.className = "secondary";
      restoreButton.textContent = "복구 백업 검증 후 적용 예약";
      restoreButton.disabled = true;
      recoveryInput.addEventListener("change", () => {
        restoreButton.disabled = !recoveryInput.files?.[0];
      });
      restoreButton.addEventListener("click", async () => {
        const file = recoveryInput.files?.[0];
        if (!file) return;
        if (!window.confirm("선택한 복구 백업을 daemon의 다음 시작 때 적용하도록 예약할까요? 현재 저장소는 지금 바뀌지 않습니다.")) return;
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await state.daemonBridge.recoveryStage(encodeHex(bytes));
          state.notice = result.restart_required
            ? "복구 백업을 검증하고 적용 예약했습니다. daemon을 정상 종료한 뒤 같은 data directory로 다시 시작하세요."
            : "복구 백업 적용을 예약했습니다.";
          state.error = "";
        } catch (error) { state.error = `복구 백업을 예약하지 못했습니다: ${error.message}`; }
        render();
      });
      const recoveryNote = document.createElement("p");
      recoveryNote.className = "field-note daemon-recovery-note";
      recoveryNote.textContent = "복구 백업에는 daemon 저장소와 revision marker가 암호화된 상태로 포함됩니다. relay 자료·OS/SSD 잔존 데이터는 포함되지 않습니다.";
      document.querySelector(".daemon-gate")?.append(recoveryNote, recoveryButton, recoveryInput, restoreButton, wipeButton);
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
        const result = await state.daemonBridge.revokeDevice(deviceId);
        const devices = await state.daemonBridge.devices();
        state.daemonDevices = devices.devices || [];
        state.daemonDeviceEvents = devices.events || [];
        state.notice = `기기 ${deviceId}를 폐기했고 MLS 세션 ${result.sessions_removed || 0}개에서 제거한 commit ${result.delivered || 0}개를 relay로 전달했습니다.`;
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
        const devices = await state.daemonBridge.devices();
        state.daemonDevices = devices.devices || [];
        state.daemonDeviceEvents = devices.events || [];
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
      const contact = state.daemonContacts.find((item) => item.account_id === state.daemonSelectedContact);
      state.daemonConversationId = contact?.conversation_id || "";
      state.daemonPeerInboxUrl = contact?.inbox_url || "";
      state.daemonOutgoingMessages = [];
      state.daemonMessages = [];
      state.daemonDeliveryDigest = "";
      state.daemonDeliveryState = "";
      state.notice = contact?.conversation_id
        ? "연락처의 로컬 대화를 열었습니다. 메시지 기록을 불러오거나 새 메시지를 작성하세요."
        : "연락처를 선택했습니다. 먼저 이 연락처의 대화를 준비하세요.";
      state.daemonBridge.markContactRead(state.daemonSelectedContact).then(async () => {
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || state.daemonContacts;
        if (contact?.conversation_id) {
          const result = await state.daemonBridge.messages(contact.conversation_id);
          const restored = (result.messages || []).map((message) => ({
            id: message.message_id || "복구된 메시지",
            text: decodeHexText(message.plaintext),
            state: message.direction === "outgoing" ? "내 기록" : "상대 기록",
            direction: message.direction === "outgoing" ? "outgoing" : "incoming",
          }));
          state.daemonOutgoingMessages = restored.filter((message) => message.direction === "outgoing");
          state.daemonMessages = restored.filter((message) => message.direction === "incoming");
          state.notice = restored.length ? `${restored.length}개의 로컬 대화 기록을 불러왔습니다.` : "새 대화를 시작할 수 있습니다.";
        }
        render();
      }).catch((error) => {
        state.error = `대화 기록을 불러오지 못했습니다: ${error.message}`;
        render();
      });
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
    document.querySelector("#daemon-unverify-safety")?.addEventListener("click", async () => {
      if (!window.confirm("안전 번호를 다시 확인할 때까지 이 연락처로 메시지를 보낼 수 없게 됩니다. 계속할까요?")) return;
      try {
        const result = await state.daemonBridge.unverifySafety();
        state.daemonPairing = { ...state.daemonPairing, ...result, safety_verified: false };
        state.daemonReceivedInvite = { ...state.daemonReceivedInvite, safety_verified: false };
        state.notice = "안전 번호를 다시 확인해야 합니다. 확인 전까지 메시지 송신이 차단됩니다.";
        state.error = "";
      } catch (error) { state.error = `안전 번호 재확인 준비에 실패했습니다: ${error.message}`; }
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
}

window.setInterval(() => {
  if (!state.daemonBridgeMode || !document.hidden) return;
  receiveDaemonMessages(true);
}, 15_000);
document.addEventListener("visibilitychange", () => {
  if (state.daemonBridgeMode && !document.hidden) receiveDaemonMessages(false);
});

async function startApp() {
  try {
    const daemonBridge = await connectDaemonBridge();
    if (daemonBridge) {
      state.daemonBridge = daemonBridge;
      state.daemonBridgeMode = true;
      const daemonStatus = await daemonBridge.request("/local-api/status");
      state.daemonStorage = { records: daemonStatus.storage_records || 0, limit: daemonStatus.storage_record_limit || 0 };
      state.daemonStatus = daemonStatus.status
        ? `${daemonStatus.status} · 저장 ${state.daemonStorage.records}/${state.daemonStorage.limit}`
        : "인증됨";
      state.daemonRelayOrigin = daemonStatus.relay_origin || "";
      state.daemonInboxUrl = daemonStatus.inbox_url || "";
      state.daemonIdentity = await daemonBridge.request("/local-api/identity");
      state.daemonPairing = await daemonBridge.pairingStatus();
      state.daemonRelayTrust = await daemonBridge.relayTrust();
      try {
        const devices = await daemonBridge.devices();
        state.daemonDevices = devices.devices || [];
        state.daemonDeviceEvents = devices.events || [];
        state.daemonContacts = (await daemonBridge.contacts()).contacts || [];
        state.daemonConversationIds = (await daemonBridge.conversations()).conversations || [];
      } catch {
        // Older daemon binaries may not expose the directory endpoints yet.
        state.daemonDevices = [];
        state.daemonDeviceEvents = [];
        state.daemonContacts = [];
        state.daemonConversationIds = [];
      }
      state.notice = "브라우저 보안 경계를 확인했습니다. 암호화 키와 메시지 상태는 daemon이 소유합니다.";
      render();
      return;
    }
    state.daemonBridgeMode = true;
    state.daemonStatus = "데몬 연결 대기";
    state.notice = "고위험 통신을 시작하려면 CLI 데몬이 발급한 일회성 주소로 이 화면을 여세요.";
    render();
  } catch (error) {
    state.daemonBridgeMode = true;
    state.daemonStatus = "데몬 연결 실패";
    state.error = error.message;
    render();
  }
}

startApp();

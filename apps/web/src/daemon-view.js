export function renderDaemonBridgeState(state) {
  const connected = Boolean(state.daemonBridge) && !state.daemonLocked;
  const title = connected ? "보안 대화" : "보안 데몬 연결이 필요합니다";
  const detail = connected
    ? "브라우저는 화면만 표시합니다. 신원, 암호화 키, 메시지와 파일은 이 기기의 보안 데몬이 관리합니다."
    : "터미널에서 앱을 시작한 뒤 표시되는 일회성 주소를 이 브라우저에서 여세요.";
  if (!connected) return `<main class="daemon-gate" aria-labelledby="daemon-gate-title"><div class="daemon-gate-mark" aria-hidden="true">⊡</div><p class="eyebrow">ANOTHER DIMENSION</p><h1 id="daemon-gate-title">${title}</h1><p class="lede">${detail}</p><div class="notice" role="status">${escapeHtml(state.notice || "보안 데몬이 발급한 주소를 기다리고 있습니다.")}</div>${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ""}</main>`;
  const connectionBanner = state.daemonRelayState === "offline"
    ? '<div class="daemon-connection-banner offline" role="status"><strong>릴레이 연결이 끊겼습니다.</strong><span>로컬 대화와 암호화 상태는 유지됩니다. 연결이 복구되면 전달 대기 항목을 다시 시도하세요.</span></div>'
    : state.daemonRelayState === "online"
      ? '<div class="daemon-connection-banner online" role="status"><strong>릴레이 연결됨</strong><span>릴레이 접수는 상대방이 읽었다는 뜻이 아닙니다.</span></div>'
      : "";
  const active = ["conversation", "devices", "security", "status"].includes(state.daemonActiveView) ? state.daemonActiveView : "conversation";
  const nav = [["conversation", "대화"], ["devices", "기기"], ["security", "보안과 복구"], ["status", "상태"]]
    .map(([view, label]) => `<button class="daemon-nav-item${active === view ? " active" : ""}" data-daemon-view="${view}" type="button" aria-current="${active === view ? "page" : "false"}">${label}</button>`).join("");
  const invite = state.daemonInvite ? `<section class="daemon-invite"><h2>1. 내 초대 코드 전달</h2><p>아래 코드만 상대방에게 별도 신뢰 채널로 전달하세요. 10분 뒤 만료되고 한 번만 사용할 수 있습니다.</p><label>일회성 초대 코드<textarea readonly rows="2">${escapeHtml(state.daemonInvite.invite_code)}</textarea></label><div class="daemon-action-row"><button id="daemon-copy-invite" class="secondary" type="button">코드 복사</button><button id="daemon-revoke-invite" class="quiet" type="button">초대 폐기</button></div></section>` : "";
  const received = renderDaemonReceivedInvite(state);
  const pairingReset = state.daemonPairing?.state === "rejected" ? '<p class="warning">기존 전달 권한이 폐기되어 연결을 중단했습니다. 새 초대를 교환하고 안전 번호를 다시 확인하세요.</p>' : "";
  return `<main class="daemon-app" aria-labelledby="daemon-gate-title"><aside class="daemon-nav" aria-label="주 메뉴"><div class="daemon-brand"><span aria-hidden="true">⊡</span><strong>Another Dimension</strong></div><nav>${nav}</nav><div class="daemon-nav-footer"><span>${escapeHtml(state.daemonIdentity?.display_name || "로컬 사용자")}</span><button id="daemon-lock" class="quiet" type="button">잠그기</button></div></aside><section class="daemon-workspace"><header class="daemon-workspace-header"><p class="eyebrow">로컬 보안 데몬</p><h1 id="daemon-gate-title">${title}</h1><p class="lede">${detail}</p></header><div class="notice" role="status">${escapeHtml(state.notice || "브라우저 보안 경계를 확인했습니다.")}</div>${connectionBanner}${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ""}<section class="daemon-view" ${active === "conversation" ? "" : "hidden"}>${pairingReset}<div class="daemon-view-heading"><div><h2>대화와 연락처</h2><p>초대 코드로 상대를 추가하고 안전 번호를 확인한 뒤 대화를 시작합니다.</p></div>${state.daemonInvite ? "" : `<button id="daemon-create-invite" class="primary" type="button">${state.daemonPairing?.state === "rejected" ? "새 연결 시작" : "일회성 초대 만들기"}</button>`}</div>${invite}${renderDaemonContacts(state)}${received}${renderDaemonSessionPanel(state)}</section><section class="daemon-view" ${active === "devices" ? "" : "hidden"}>${renderDaemonDevices(state)}</section><section id="daemon-security-content" class="daemon-view" ${active === "security" ? "" : "hidden"}><div class="daemon-view-heading"><div><h2>보안과 복구</h2><p>릴레이 신뢰, 암호화 백업과 이 기기의 데이터 삭제를 관리합니다.</p></div></div>${renderDaemonRelayTrust(state)}${renderDaemonSecurityControls(state)}</section><section class="daemon-view" ${active === "status" ? "" : "hidden"}><div class="daemon-view-heading"><div><h2>현재 상태</h2><p>브라우저와 로컬 데몬의 연결 경계를 확인합니다.</p></div></div><dl class="daemon-facts"><div><dt>세션</dt><dd>${escapeHtml(state.daemonStatus.replace("daemon-session-active", "연결됨"))}</dd></div><div><dt>브라우저 저장소</dt><dd>사용하지 않음</dd></div><div><dt>계정</dt><dd>${escapeHtml(`${state.daemonIdentity.display_name} · ${state.daemonIdentity.account_id}`)}</dd></div><div><dt>보안 판정</dt><dd>독립 검토 완료 전 고위험 사용 금지</dd></div></dl><p class="disclaimer">독립 보안 검토와 운영 배포 검증이 끝나기 전에는 민감한 통신에 사용하지 마세요.</p></section></section></main>`;
}

function renderDaemonReceivedInvite(state) {
  const pairing = state.daemonPairing || {};
  const verifiedPeer = state.daemonReceivedInvite
    ? `<div class="verified" role="status"><strong>상대 신원을 확인했습니다.</strong><span>이제 안전 번호를 별도 신뢰 채널로 비교하세요.</span></div>`
    : "";
  const approval = pairing.state === "verified" && pairing.safety_verified
    ? '<button id="daemon-approve-pairing" class="primary" type="button">안전 번호 확인 후 연락처 승인</button><button id="daemon-reject-pairing" class="quiet" type="button">거절</button>'
    : pairing.state === "verified"
      ? '<p class="field-note">안전 번호가 일치한다고 확인한 뒤 연락처 승인을 진행하세요.</p><button id="daemon-reject-pairing" class="quiet" type="button">거절</button>'
      : pairing.state === "established"
        ? '<p class="verified">연락처 승인이 완료되었습니다.</p>'
        : "";
  return `<section class="daemon-invite"><h2>2. 상대방 초대 코드 입력</h2><p>상대방에게 받은 일회성 코드를 붙여 넣으세요. 이 기기에 설정된 릴레이 주소는 자동으로 사용됩니다.</p><label>초대 코드<textarea id="received-invite-code" rows="2" placeholder="상대방에게 받은 코드" autocomplete="off" spellcheck="false"></textarea></label><button id="daemon-consume-invite" class="secondary" type="button">초대 코드 확인</button><p class="field-note">코드의 만료·재사용 여부와 상대 신원은 보안 데몬이 자동으로 검증합니다.</p>${verifiedPeer}${state.daemonPairing?.safety_number ? renderDaemonSafetyControls(state.daemonPairing) : ""}${approval}</section>`;
}

export function renderDaemonSecurityControls(state) {
  if (!state.daemonBridge || state.daemonLocked) return "";
  return '<section class="daemon-invite daemon-recovery-tools"><h2>복구와 긴급 삭제</h2><p class="field-note daemon-recovery-note">복구 백업에는 로컬 암호화 저장소와 복구 판정 정보가 포함됩니다. 릴레이 자료와 운영체제·디스크의 잔존 데이터는 포함되지 않습니다.</p><button id="daemon-recovery-export" class="secondary" type="button">암호화 복구 백업 다운로드</button><label>복구 백업 파일<input id="daemon-recovery-input" type="file" accept=".adbackup,application/octet-stream" aria-label="암호화 복구 백업 파일 선택"></label><button id="daemon-recovery-stage" class="secondary" type="button" disabled>복구 백업 검증 후 적용 예약</button><button id="daemon-wipe" class="danger" type="button">이 기기의 모든 로컬 데이터 삭제</button></section>';
}

export function renderDaemonRelayTrust(state) {
  const trust = state.daemonRelayTrust || {};
  const pin = trust.tls_pin || "";
  if (/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(trust.relay_origin || "")) {
    return '<section class="daemon-invite daemon-relay-trust"><h2>로컬 릴레이 신뢰</h2><p>이 릴레이는 같은 기기의 루프백 주소에서만 열립니다. 원격 운영 릴레이로 전환하면 인증서 지문 확인 항목이 표시됩니다.</p><p class="verified">로컬 전용 연결</p></section>';
  }
  return '<section class="daemon-invite daemon-relay-trust"><h2>원격 릴레이 인증서 신뢰</h2><p>인증서 지문은 브라우저가 아닌 보안 데몬의 암호화 저장소에 보관됩니다. 운영 릴레이의 지문을 별도 채널로 확인한 뒤 입력하세요.</p><label>인증서 지문<input id="daemon-tls-pin" value="' + escapeHtml(pin) + '" placeholder="sha256:64자리 16진수" autocomplete="off" spellcheck="false"></label><label class="checkbox-line"><input id="daemon-tls-retrust" type="checkbox"> 변경된 지문을 확인하고 다시 신뢰</label><button id="daemon-save-relay-pin" class="secondary" type="button">릴레이 신뢰 저장</button><p class="field-note">현재 상태: ' + (pin ? "지문 등록됨" : "지문 미등록") + ' · 지문이 바뀌면 확인 전까지 연결이 중단됩니다.</p></section>';
}

export function renderDaemonContacts(state) {
  const query = state.daemonContactSearch.trim().toLowerCase();
  const contacts = state.daemonContacts.filter((contact) => [contact.alias, contact.account_id, contact.device_id].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  const rows = contacts.length
    ? contacts.map((contact) => `<article class="daemon-contact ${state.daemonSelectedContact === contact.account_id ? "selected" : ""}"><button type="button" class="daemon-contact-select" data-contact-account="${escapeHtml(contact.account_id)}"><strong>${escapeHtml(contact.alias || contact.account_id.slice(0, 18))}${contact.unread_count ? ` <span class="unread-badge">${contact.unread_count}</span>` : ""}</strong><small>${escapeHtml(contact.state)} · ${escapeHtml(contact.device_id)}${contact.conversation_id ? ` · ${escapeHtml(contact.conversation_id)}` : " · 대화 미연결"}</small>${contact.last_message_preview ? `<span class="contact-preview">${escapeHtml(contact.last_message_preview)}</span>` : ""}</button><label class="daemon-contact-alias">별칭<input data-contact-alias="${escapeHtml(contact.account_id)}" value="${escapeHtml(contact.alias || "")}" maxlength="128"></label><div class="contact-actions"><button type="button" class="quiet daemon-contact-save" data-contact-save="${escapeHtml(contact.account_id)}">저장</button><button type="button" class="quiet daemon-contact-block" data-contact-block="${escapeHtml(contact.account_id)}">${contact.state === "blocked" ? "차단 해제" : "차단"}</button><button type="button" class="quiet daemon-contact-delete" data-contact-delete="${escapeHtml(contact.account_id)}">삭제</button></div></article>`).join("")
    : '<p class="field-note">저장된 연락처가 없습니다. 안전 번호 확인 후 승인하면 여기에 표시됩니다.</p>';
  return `<section class="daemon-directory"><div class="row-between"><div><h2>연락처</h2><p class="field-note">연락처와 별칭은 이 기기의 암호화 저장소에만 보관됩니다.</p></div><span class="pill">${state.daemonContacts.length}명 · ${state.daemonConversationIds.length}개 대화</span></div><label>이 기기에서 검색<input id="daemon-contact-search" value="${escapeHtml(state.daemonContactSearch)}" placeholder="별칭·계정 ID·기기 ID"></label><div class="daemon-contact-list">${rows}</div></section>`;
}

export function renderDaemonDevices(state) {
  const rows = state.daemonDevices.length
    ? state.daemonDevices.map((device) => {
      const current = device.device_id === state.daemonIdentity?.device_id;
      const expiry = Number(device.expires_at) >= Number.MAX_SAFE_INTEGER ? "만료 없음" : new Date(Number(device.expires_at) * 1000).toLocaleDateString("ko-KR");
      return `<article class="daemon-device"><div><strong>${escapeHtml(device.device_id)}${current ? " · 현재 기기" : ""}</strong><small>${device.state === "active" ? "사용 중" : "폐기됨"} · ${escapeHtml(expiry)}</small></div><code>${escapeHtml(device.public_key)}</code>${device.state === "active" ? `<button type="button" class="quiet daemon-device-revoke" data-device-revoke="${escapeHtml(device.device_id)}" ${current ? "disabled" : ""}>${current ? "현재 기기" : "기기 폐기"}</button>` : '<span class="field-note">폐기됨</span>'}</article>`;
    }).join("")
    : '<p class="field-note">등록된 기기 정보를 불러오지 못했습니다.</p>';
  const eventRows = state.daemonDeviceEvents.length
    ? state.daemonDeviceEvents.slice().reverse().slice(0, 8).map((event) => `<li><strong>${event.kind === "revoked" ? "기기 폐기" : "기기 등록"}</strong><span>${escapeHtml(event.device_id)} · ${escapeHtml(new Date(Number(event.at) * 1000).toLocaleString("ko-KR"))}</span></li>`).join("")
    : '<li class="field-note">아직 기기 변경 이력이 없습니다.</li>';
  return `<section class="daemon-directory"><div class="row-between"><div><h2>연결된 기기</h2><p class="field-note">기기 인증서와 폐기 상태는 보안 데몬의 암호화 저장소에서 관리됩니다.</p></div><span class="pill">${state.daemonDevices.length}대</span></div><div class="daemon-contact-list">${rows}</div><details class="daemon-device-events"><summary>기기 변경 이력</summary><ul>${eventRows}</ul></details><div class="daemon-device-link"><h3>새 기기 승인</h3><p class="field-note">새 기기에서 만든 연결 요청과 별도 채널로 확인한 일회성 코드를 입력하세요. 개인키는 기기 밖으로 전송되지 않습니다.</p><label>기기 연결 요청<textarea id="daemon-link-request" rows="4" placeholder="ADDLINKREQ1...."></textarea></label><label>일회성 승인 코드<input id="daemon-link-code" autocomplete="off" placeholder="ABCD-EFGH-...."></label><button id="daemon-link-approve" type="button" class="secondary">기기 승인</button>${state.daemonLinkApproval ? `<label>새 기기로 전달할 승인 자료<textarea readonly rows="4">${escapeHtml(state.daemonLinkApproval)}</textarea></label>` : ""}</div></section>`;
}

export function renderDaemonSafetyControls(pairing) {
  if (!pairing?.safety_number) return "";
  if (pairing.safety_verified) return `<div class="daemon-safety" aria-live="polite"><strong>안전 번호</strong><code>${escapeHtml(pairing.safety_number)}</code><p class="verified">안전 번호 확인 완료 · 메시지 송신 허용</p><button id="daemon-unverify-safety" class="quiet" type="button">안전 번호 다시 확인</button></div>`;
  return `<div class="daemon-safety" aria-live="polite"><strong>안전 번호</strong><code>${escapeHtml(pairing.safety_number)}</code><p class="field-note">상대방에게 별도 신뢰 채널로 전체 번호를 읽어 확인하세요.</p><label>확인한 안전 번호<input id="daemon-safety-confirmation" autocomplete="off" inputmode="text" /></label><button id="daemon-verify-safety" class="secondary" type="button">안전 번호 확인</button></div>`;
}


export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function newDaemonConversationId() {
  if (window.crypto?.randomUUID) return `conversation-${window.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  window.crypto?.getRandomValues?.(bytes);
  return `conversation-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") || Date.now()}`;
}

export function decodeHexText(value) {
  const hex = String(value || "");
  if (!hex || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) throw new Error("데몬이 반환한 평문 형식이 올바르지 않습니다.");
  const bytes = Uint8Array.from(hex.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
  return new TextDecoder().decode(bytes);
}

export function decodeHexBytes(value) {
  const hex = String(value || "");
  if (!hex || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) throw new Error("데몬이 반환한 파일 청크 형식이 올바르지 않습니다.");
  return Uint8Array.from(hex.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
}

export function encodeHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function daemonDeliveryLabel(value) {
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

export function mergeDaemonMessages(existing, incoming) {
  const known = new Set(existing.map((message) => message.id));
  return [...existing, ...incoming.filter((message) => message.id && !known.has(message.id))];
}

export function newAttachmentBlobId() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return encodeHex(bytes);
}

export function renderDaemonSessionPanel(state) {
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
    ? `<section class="daemon-session-setup"><strong>암호화 연결을 준비하는 중입니다.</strong><p class="field-note">초대 승인 후 데몬이 대화 상태를 자동으로 연결합니다. 연결이 끝나면 이 화면에서 메시지를 보낼 수 있습니다.</p></section>`
    : !selectedContact
      ? '<section class="daemon-session-setup"><strong>왼쪽 연락처에서 대화 상대를 선택하세요.</strong><p class="field-note">선택한 연락처의 대화 상태와 전달 경로가 자동으로 사용됩니다.</p></section>'
      : `<p class="field-note daemon-session-ready">이 연락처의 로컬 대화 상태가 준비되었습니다.</p>`;
  const deliveryState = state.daemonDeliveryState
    ? `<p class="delivery-state">전달 상태: <strong>${escapeHtml(daemonDeliveryLabel(state.daemonDeliveryState))}</strong>${state.daemonDeliveryDigest ? ` · ${escapeHtml(state.daemonDeliveryDigest.slice(0, 12))}` : ""}</p><button id="daemon-delivery-status" class="quiet" type="button">전달 상태 새로고침</button>${retryButton}`
    : "";
  return `<section class="daemon-session-tools daemon-conversation-panel"><header class="daemon-conversation-heading"><div><span class="eyebrow">LOCAL CONVERSATION</span><h2>${escapeHtml(contactTitle)}</h2><p class="field-note">브라우저는 입력과 표시만 담당하고, 암호화 키와 대화 상태는 daemon이 보관합니다.</p></div>${selectedContact ? `<span class="pill">${escapeHtml(selectedContact.state)}${selectedContact.conversation_id ? " · 연결됨" : " · 준비 필요"}</span>` : ""}</header>${sessionSetup}<input id="daemon-conversation-id" type="hidden" value="${escapeHtml(conversationId)}"><input id="daemon-peer-inbox-url" type="hidden" value="${escapeHtml(peerInboxUrl)}"><div class="daemon-message-list" aria-live="polite" aria-label="대화 메시지">${receivedMessages}</div><label>메시지<textarea id="daemon-message" rows="3" placeholder="메시지를 입력하세요" ${conversationId ? "" : "disabled"}></textarea><label>메시지 보존 기간<select id="daemon-message-expiry"><option value="0">메시지 만료 없음</option><option value="3600">1시간 후 만료</option><option value="86400">24시간 후 만료</option><option value="604800">7일 후 만료</option></select></label><button id="daemon-message-send" class="primary" type="button" ${conversationId ? "" : "disabled"}>보내기</button><section class="daemon-attachment"><h3>파일 보내기</h3><p class="field-note">파일은 daemon에서 암호화한 뒤 전달됩니다. 상대방의 전달 경로는 선택한 연락처에서 사용합니다.</p><label>암호화할 파일<input id="daemon-attachment-file" type="file" ${conversationId ? "" : "disabled"}></label><button id="daemon-attachment-send" class="secondary" type="button" ${conversationId ? "" : "disabled"}>파일 암호화·전송</button>${state.daemonAttachmentState ? `<p class="delivery-state" role="status">${escapeHtml(state.daemonAttachmentState)} · ${state.daemonAttachmentProgress}%</p><progress max="100" value="${state.daemonAttachmentProgress}">${state.daemonAttachmentProgress}%</progress>` : ""}${attachmentRetry}</section>${deliveryState}<section class="daemon-delivery"><h3>받은 메시지</h3><p class="field-note">내 inbox가 설정된 경우 새 암호화 봉투를 확인하고 로컬 저장소에 반영합니다.</p><input id="daemon-inbox-url" type="hidden" value="${escapeHtml(state.daemonInboxUrl)}"><button id="daemon-history-load" class="quiet" type="button">로컬 대화 기록 불러오기</button><button id="daemon-history-older" class="quiet" type="button" ${state.daemonMessagesHasMore ? "" : "hidden"}>이전 대화 기록 더 불러오기</button><button id="daemon-delivery-sync" class="secondary" type="button" ${conversationId ? "" : "disabled"}>받은 메시지 동기화</button></section></section>`;
}

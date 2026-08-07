export function renderDaemonBridgeState(state) {
  const connected = Boolean(state.daemonBridge) && !state.daemonLocked;
  const title = connected ? "보안 데몬 세션이 연결되었습니다" : "보안 데몬 연결이 필요합니다";
  const detail = connected
    ? "이 화면은 암호화 키·로컬 저장소·메시지 상태를 보관하지 않습니다. 실제 작업은 로컬 보안 데몬의 인증된 API를 통해서만 열립니다."
    : "브라우저 프로토타입 경로는 고위험 통신에 사용할 수 없습니다. CLI 데몬을 실행하고 데몬이 발급한 주소로 다시 여세요.";
  const pairingReset = state.daemonPairing?.state === "rejected" ? '<p class="warning">relay capability가 폐기되어 기존 연결을 중단했습니다. 새 초대를 다시 교환하고 안전 번호를 재확인하세요.</p>' : "";
  return `<main class="daemon-gate" aria-labelledby="daemon-gate-title"><div class="daemon-gate-mark" aria-hidden="true">⊡</div><p class="eyebrow">LOCAL SECURITY DAEMON</p><h1 id="daemon-gate-title">${title}</h1><p class="lede">${detail}</p><div class="notice" role="status">${escapeHtml(state.notice || "키와 메시지 상태는 로컬 daemon이 소유합니다.")}</div><dl class="daemon-facts"><div><dt>세션 상태</dt><dd>${escapeHtml(state.daemonStatus)}</dd></div><div><dt>브라우저 저장소</dt><dd>daemon 모드에서 사용하지 않음</dd></div><div><dt>현재 identity</dt><dd>${escapeHtml(state.daemonIdentity ? `${state.daemonIdentity.display_name} · ${state.daemonIdentity.account_id}` : "daemon에서만 확인")}</dd></div><div><dt>보안 상태</dt><dd>고위험 출시 전까지 차단</dd></div></dl>${connected ? `${pairingReset}<button id="daemon-create-invite" class="primary" type="button">${state.daemonPairing?.state === "rejected" ? "새 연결 시작" : "일회성 초대 생성"}</button><button id="daemon-lock" class="quiet" type="button">데몬 세션 잠그기</button>${renderDaemonDevices(state)}${renderDaemonContacts(state)}` : '<p class="field-note">다시 연결하려면 daemon이 발급한 새 주소를 사용하세요.</p>'}${state.daemonInvite ? `<section class="daemon-invite"><h2>초대 공유 자료</h2><p>코드와 signed invite를 별도 신뢰 채널로 전달하세요. 10분 후 만료되며 새 초대 생성 시 이전 초대는 더 이상 UI에서 재사용하지 마세요.</p><label>초대 코드<textarea readonly rows="2">${escapeHtml(state.daemonInvite.invite_code)}</textarea></label><button id="daemon-revoke-invite" class="quiet" type="button">초대 폐기</button><p class="field-note">서명 자료는 daemon과 relay 사이에서만 처리됩니다. 상대에게는 코드만 전달하세요.</p></section>` : ""}${connected ? `<section class="daemon-invite"><h2>받은 초대 검증</h2><label>상대 relay 주소<input id="received-relay-origin" value="${escapeHtml(state.daemonRelayOrigin)}" placeholder="https://relay.example"></label><label>초대 코드<textarea id="received-invite-code" rows="2" placeholder="상대방의 초대 코드"></textarea></label><button id="daemon-consume-invite" class="secondary" type="button">relay에서 초대 가져오기</button><p class="field-note">signed invite와 relay receipt는 relay 소비 직후 daemon에 자동 전달되어 검증됩니다.</p>${state.daemonReceivedInvite ? `<p class="field-note">검증됨: ${escapeHtml(state.daemonReceivedInvite.account_id)} · device ${escapeHtml(state.daemonReceivedInvite.device_id)}</p>${state.daemonPairing?.state === "verified" ? '<button id="daemon-approve-pairing" class="primary" type="button">연락처 승인</button><button id="daemon-reject-pairing" class="quiet" type="button">거절</button>' : state.daemonPairing?.state === "established" ? '<p class="verified">연락처 승인이 완료되었습니다.</p>' : ""}` : ""}</section>` : ""}${renderDaemonSessionPanel(state)}${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ""}<p class="disclaimer">prototype / non-high-risk · 독립 보안 검토와 지원 matrix가 완료되기 전 민감한 통신을 입력하지 마세요.</p></main>`;
}

export function renderDaemonRelayTrust(state) {
  const trust = state.daemonRelayTrust || {};
  const pin = trust.tls_pin || "";
  return '<section class="daemon-invite daemon-relay-trust"><h2>원격 relay TLS 신뢰</h2><p>pin은 브라우저에 저장하지 않고 daemon의 암호화 저장소에 저장됩니다. 운영 relay의 인증서 지문을 별도 신뢰 채널로 확인한 뒤 입력하세요.</p><label>인증서 pin<input id="daemon-tls-pin" value="' + escapeHtml(pin) + '" placeholder="sha256:64자리 hex" autocomplete="off" spellcheck="false"></label><label class="checkbox-line"><input id="daemon-tls-retrust" type="checkbox"> 기존 pin 변경을 명시적으로 재신뢰</label><button id="daemon-save-relay-pin" class="secondary" type="button">relay 신뢰 저장</button><p class="field-note">현재 상태: ' + (pin ? "pin 등록됨" : "pin 미등록") + ' · pin 변경은 기존 자동 연결을 중단할 수 있습니다.</p></section>';
}

export function renderDaemonContacts(state) {
  const query = state.daemonContactSearch.trim().toLowerCase();
  const contacts = state.daemonContacts.filter((contact) => [contact.alias, contact.account_id, contact.device_id].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  const rows = contacts.length
    ? contacts.map((contact) => `<article class="daemon-contact ${state.daemonSelectedContact === contact.account_id ? "selected" : ""}"><button type="button" class="daemon-contact-select" data-contact-account="${escapeHtml(contact.account_id)}"><strong>${escapeHtml(contact.alias || contact.account_id.slice(0, 18))}${contact.unread_count ? ` <span class="unread-badge">${contact.unread_count}</span>` : ""}</strong><small>${escapeHtml(contact.state)} · ${escapeHtml(contact.device_id)}${contact.conversation_id ? ` · ${escapeHtml(contact.conversation_id)}` : " · 대화 미연결"}</small>${contact.last_message_preview ? `<span class="contact-preview">${escapeHtml(contact.last_message_preview)}</span>` : ""}</button><label class="daemon-contact-alias">별칭<input data-contact-alias="${escapeHtml(contact.account_id)}" value="${escapeHtml(contact.alias || "")}" maxlength="128"></label><div class="contact-actions"><button type="button" class="quiet daemon-contact-save" data-contact-save="${escapeHtml(contact.account_id)}">저장</button><button type="button" class="quiet daemon-contact-block" data-contact-block="${escapeHtml(contact.account_id)}">${contact.state === "blocked" ? "차단 해제" : "차단"}</button><button type="button" class="quiet daemon-contact-delete" data-contact-delete="${escapeHtml(contact.account_id)}">삭제</button></div></article>`).join("")
    : '<p class="field-note">저장된 연락처가 없습니다. 안전 번호 확인 후 승인하면 여기에 표시됩니다.</p>';
  return `<section class="daemon-directory"><div class="row-between"><div><h2>연락처</h2><p class="field-note">연락처와 별칭은 daemon의 암호화 저장소에서만 관리됩니다.</p></div><span class="pill">${state.daemonContacts.length}명 · ${state.daemonConversationIds.length}개 대화</span></div><label>이 기기에서 검색<input id="daemon-contact-search" value="${escapeHtml(state.daemonContactSearch)}" placeholder="별칭·account ID·device ID"></label><div class="daemon-contact-list">${rows}</div></section>`;
}

export function renderDaemonDevices(state) {
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
    ? `<section class="daemon-session-setup"><strong>이 연락처와 대화를 시작할 준비가 필요합니다.</strong><p class="field-note">먼저 로컬 대화 상태를 만들고, 두 기기 사이의 연결 자료는 별도 신뢰 채널로 교환합니다.</p><button id="daemon-session-create" class="primary" type="button">이 연락처의 대화 준비</button></section>`
    : !selectedContact
      ? '<section class="daemon-session-setup"><strong>왼쪽 연락처에서 대화 상대를 선택하세요.</strong><p class="field-note">선택한 연락처의 대화 상태와 전달 경로가 자동으로 사용됩니다.</p></section>'
      : `<p class="field-note daemon-session-ready">이 연락처의 로컬 대화 상태가 준비되었습니다.</p>`;
  const deliveryState = state.daemonDeliveryState
    ? `<p class="delivery-state">전달 상태: <strong>${escapeHtml(daemonDeliveryLabel(state.daemonDeliveryState))}</strong>${state.daemonDeliveryDigest ? ` · ${escapeHtml(state.daemonDeliveryDigest.slice(0, 12))}` : ""}</p><button id="daemon-delivery-status" class="quiet" type="button">전달 상태 새로고침</button>${retryButton}`
    : "";
  return `<section class="daemon-session-tools daemon-conversation-panel"><header class="daemon-conversation-heading"><div><span class="eyebrow">LOCAL CONVERSATION</span><h2>${escapeHtml(contactTitle)}</h2><p class="field-note">브라우저는 입력과 표시만 담당하고, 암호화 키와 대화 상태는 daemon이 보관합니다.</p></div>${selectedContact ? `<span class="pill">${escapeHtml(selectedContact.state)}${selectedContact.conversation_id ? " · 연결됨" : " · 준비 필요"}</span>` : ""}</header>${sessionSetup}<input id="daemon-conversation-id" type="hidden" value="${escapeHtml(conversationId)}"><input id="daemon-peer-inbox-url" type="hidden" value="${escapeHtml(peerInboxUrl)}"><div class="daemon-message-list" aria-live="polite" aria-label="대화 메시지">${receivedMessages}</div><label>메시지<textarea id="daemon-message" rows="3" placeholder="메시지를 입력하세요" ${conversationId ? "" : "disabled"}></textarea></label><button id="daemon-message-send" class="primary" type="button" ${conversationId ? "" : "disabled"}>보내기</button><section class="daemon-attachment"><h3>파일 보내기</h3><p class="field-note">파일은 daemon에서 암호화한 뒤 전달됩니다. 상대방의 전달 경로는 선택한 연락처에서 사용합니다.</p><label>암호화할 파일<input id="daemon-attachment-file" type="file" ${conversationId ? "" : "disabled"}></label><button id="daemon-attachment-send" class="secondary" type="button" ${conversationId ? "" : "disabled"}>파일 암호화·전송</button>${state.daemonAttachmentState ? `<p class="delivery-state" role="status">${escapeHtml(state.daemonAttachmentState)} · ${state.daemonAttachmentProgress}%</p><progress max="100" value="${state.daemonAttachmentProgress}">${state.daemonAttachmentProgress}%</progress>` : ""}${attachmentRetry}</section>${deliveryState}<section class="daemon-delivery"><h3>받은 메시지</h3><p class="field-note">내 inbox가 설정된 경우 새 암호화 봉투를 확인하고 로컬 저장소에 반영합니다.</p><input id="daemon-inbox-url" type="hidden" value="${escapeHtml(state.daemonInboxUrl)}"><button id="daemon-delivery-sync" class="secondary" type="button" ${conversationId ? "" : "disabled"}>받은 메시지 동기화</button></section><details class="daemon-advanced-tools"><summary>고급 연결·복구 도구</summary><p class="field-note">아래 항목은 두 기기 간 연결 자료를 수동 교환하거나 장애를 복구할 때만 사용합니다. 일반 대화에서는 열지 마세요.</p><div class="daemon-advanced-grid"><label>내 연결 자료<textarea id="daemon-key-package" readonly rows="3" placeholder="대화 준비 후 생성됩니다">${escapeHtml(state.daemonKeyPackage)}</textarea></label><button id="daemon-session-prepare" class="secondary" type="button">연결 자료 생성</button><label>상대 기기의 참여 승인 자료<textarea id="daemon-welcome" rows="3" placeholder="별도 신뢰 채널로 받은 자료"></textarea></label><button id="daemon-session-join" class="secondary" type="button">참여 승인 자료 적용</button><label>상대 기기의 연결 자료<textarea id="daemon-peer-key-package" rows="3" placeholder="별도 신뢰 채널로 받은 자료"></textarea></label><button id="daemon-session-add-member" class="secondary" type="button">상대 기기 추가</button><label>생성된 암호화 봉투<textarea id="daemon-ciphertext" readonly rows="3" placeholder="daemon이 생성한 봉투">${escapeHtml(state.daemonCiphertext)}</textarea></label><label>받은 암호화 봉투<textarea id="daemon-incoming-ciphertext" rows="3" placeholder="수동 복구용"></textarea></label><button id="daemon-message-receive" class="secondary" type="button">복호화하여 보기</button><label>복호화 결과<textarea id="daemon-plaintext" readonly rows="3" placeholder="복호화 결과">${escapeHtml(state.daemonPlaintext)}</textarea></label></div></details></section>`;
}

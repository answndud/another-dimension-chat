import { connectDaemonBridge, consumeRelayInvite, createRelayInviteCode, revokeRelayInviteCode } from "./daemon-bridge.js";
import { renderDaemonBridgeState, renderDaemonRelayTrust, renderDaemonSafetyControls, renderDaemonSessionPanel, escapeHtml, newDaemonConversationId, decodeHexText, decodeHexBytes, encodeHex, mergeDaemonMessages, newAttachmentBlobId } from "./daemon-view.js";
import "./styles.css";

const app = document.querySelector("#app");
let state = { profile: null, peer: null, activeView: "connect", generatedPassphrase: "", daemonReceivedInvite: null, daemonConsumedInvite: "", daemonInviteReceipt: "", daemonRelayOrigin: "", serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", profileBackup: "", sessionBackup: "", transcriptExport: "", messages: [], error: "", notice: "", riskAcknowledged: false, wipeConfirmOpen: false, daemonBridge: null, daemonBridgeMode: false, daemonStatus: "확인 중", daemonRelayState: "unknown", daemonStorage: null, daemonIdentity: null, daemonInvite: null, daemonPairing: null, daemonRelayTrust: null, daemonDevices: [], daemonDeviceEvents: [], daemonLinkApproval: "", daemonContacts: [], daemonContactSearch: "", daemonConversationIds: [], daemonSelectedContact: "", daemonLocked: false, daemonConversationId: "", daemonKeyPackage: "", daemonWelcome: "", daemonCiphertext: "", daemonPlaintext: "", daemonInboxUrl: "", daemonPeerInboxUrl: "", daemonMessages: [], daemonOutgoingMessages: [], daemonDeliveryDigest: "", daemonDeliveryState: "", daemonAttachmentState: "", daemonAttachmentProgress: 0, daemonAttachmentBlobId: "" };
let daemonSyncInFlight = false;
const PASSPHRASE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";


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
    app.innerHTML = renderDaemonBridgeState(state);
    if (state.daemonRelayState === "offline") {
      document.querySelector(".daemon-gate .notice")?.insertAdjacentHTML("beforebegin", '<div class="daemon-connection-banner offline" role="status"><strong>릴레이 연결이 끊겼습니다.</strong><span>로컬 대화와 암호화 상태는 유지됩니다. 연결이 복구되면 전달 대기 항목을 다시 시도하세요.</span></div>');
    } else if (state.daemonRelayState === "online") {
      document.querySelector(".daemon-gate .notice")?.insertAdjacentHTML("beforebegin", '<div class="daemon-connection-banner online" role="status"><strong>릴레이 연결됨</strong><span>릴레이 접수는 상대방이 읽었다는 뜻이 아닙니다.</span></div>');
    }
    if (state.daemonBridge && !state.daemonLocked) {
      document.querySelector(".daemon-gate")?.insertAdjacentHTML("beforeend", renderDaemonRelayTrust(state));
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

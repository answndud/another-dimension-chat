import { state } from "./daemon-state.js";
import { decodeHexText, decodeHexBytes, encodeHex, mergeDaemonMessages, newAttachmentBlobId } from "./daemon-view.js";
import { daemonErrorMessage } from "./daemon-errors.js";

let activeBindingController;
let pairingSyncTimer;
let welcomeSyncTimer;
let listenerSequence = 0;
let sessionActionBusy = false;

function bindListener(target, eventName, handler) {
  if (!target) return;
  if (target.dataset.adListener) return;
  const app = document.querySelector("#app");
  if (!app) return;
  const marker = `ad-listener-${listenerSequence += 1}`;
  target.dataset.adListener = marker;
  app.addEventListener(eventName, (event) => {
    const matched = event.target instanceof Element
      ? event.target.closest(`[data-ad-listener="${marker}"]`)
      : null;
    if (!matched) return;
    handler(event);
  }, { signal: activeBindingController.signal });
}

function schedulePairingSync(render) {
  const inviteCode = state.daemonInvite?.invite_code || "";
  if (!inviteCode || state.daemonPairing?.state === "established" || state.daemonReceivedInvite?.account_id) {
    if (pairingSyncTimer) clearTimeout(pairingSyncTimer);
    pairingSyncTimer = undefined;
    return;
  }
  if (pairingSyncTimer) return;
  pairingSyncTimer = setTimeout(async () => {
    pairingSyncTimer = undefined;
    try {
      const result = await state.daemonBridge.autoSyncPairing(inviteCode);
      if (result.state === "verified") {
        state.daemonPairing = result;
        state.daemonReceivedInvite = result;
        state.daemonPeerInboxUrl = result.inbox_url || "";
        state.daemonConversationId = result.conversation_id || state.daemonConversationId;
        state.notice = "상대 기기가 연결 자료를 준비했습니다. 안전 번호를 비교한 뒤 승인하세요.";
        render();
        return;
      }
    } catch (error) {
      if (error.code !== "pairing_rendezvous_unknown") state.error = daemonErrorMessage(error);
    }
    schedulePairingSync(render);
  }, 15000);
}

function scheduleWelcomeSync(render) {
  const inviteCode = state.daemonConsumedInvite || "";
  if (!inviteCode || state.daemonPairing?.state !== "established") {
    if (welcomeSyncTimer) clearTimeout(welcomeSyncTimer);
    welcomeSyncTimer = undefined;
    return;
  }
  if (welcomeSyncTimer) return;
  welcomeSyncTimer = setTimeout(async () => {
    welcomeSyncTimer = undefined;
    try {
      const result = await state.daemonBridge.completePairingSession(inviteCode);
      if (result.state === "joined") {
        state.notice = "대화 연결이 완료되었습니다. 이제 메시지를 보낼 수 있습니다.";
        state.error = "";
        render();
        return;
      }
    } catch (error) {
      if (error.code !== "pairing_rendezvous_unknown") state.error = daemonErrorMessage(error);
    }
    scheduleWelcomeSync(render);
  }, 15000);
}

function applyMessagePage(result, replace) {
  const restored = (result.messages || []).map((message) => ({
    id: message.message_id || "복구된 메시지",
    text: decodeHexText(message.plaintext),
    state: message.direction === "outgoing" ? "내 기록" : "상대 기록",
    direction: message.direction === "outgoing" ? "outgoing" : "incoming",
    createdAt: Number(message.created_at) || 0,
  }));
  if (replace) {
    state.daemonOutgoingMessages = restored.filter((message) => message.direction === "outgoing");
    state.daemonMessages = restored.filter((message) => message.direction === "incoming");
  } else {
    state.daemonOutgoingMessages = mergeDaemonMessages(state.daemonOutgoingMessages, restored.filter((message) => message.direction === "outgoing"));
    state.daemonMessages = mergeDaemonMessages(state.daemonMessages, restored.filter((message) => message.direction === "incoming"));
  }
  state.daemonMessageOffset = Number.isInteger(result.next_offset) ? result.next_offset : 0;
  state.daemonMessagesHasMore = Number.isInteger(result.next_offset);
  return restored.length;
}

export function bindDaemonSession({ render }) {
  const bridge = state.daemonBridge;
  bindListener(document.querySelector("#daemon-history-load"), "click", async () => {
    try {
      const conversationId = document.querySelector("#daemon-conversation-id")?.value.trim() || state.daemonConversationId;
      if (!conversationId) throw new Error("대화 식별자를 입력하세요.");
      const result = await bridge.messages(conversationId, 200, 0);
      const restoredCount = applyMessagePage(result, true);
      state.notice = `로컬 암호화 저장소에서 대화 기록 ${restoredCount}개를 복구했습니다.`;
      state.error = "";
    } catch (error) { state.error = daemonErrorMessage(error); }
    render();
  });
  bindListener(document.querySelector("#daemon-history-older"), "click", async () => {
    try {
      const conversationId = document.querySelector("#daemon-conversation-id")?.value.trim() || state.daemonConversationId;
      if (!conversationId || !state.daemonMessagesHasMore) return;
      const result = await bridge.messages(conversationId, 200, state.daemonMessageOffset);
      const loaded = applyMessagePage(result, false);
      state.notice = `이전 대화 기록 ${loaded}개를 추가했습니다.`;
      state.error = "";
    } catch (error) { state.error = daemonErrorMessage(error); }
    render();
  });
  const messageInput = document.querySelector("#daemon-message");
  if (messageInput) messageInput.maxLength = 90000;
  const getConversationId = () => {
    const value = document.querySelector("#daemon-conversation-id")?.value.trim() || "";
    if (!value) throw new Error("대화 식별자를 입력하세요.");
    state.daemonConversationId = value;
    return value;
  };
  const run = async (action, success) => {
    if (sessionActionBusy) return;
    sessionActionBusy = true;
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
        state.notice = "전달 권한이 폐기되어 기존 연결을 중단했습니다. 새 연결을 시작하세요.";
      }
      if (error.code === "relay_unavailable") {
        state.daemonRelayState = "offline";
        state.notice = "전달 경로에 연결할 수 없습니다. 로컬 암호화 상태는 유지되며, 연결 후 다시 시도할 수 있습니다.";
        state.error = "";
      } else {
        state.error = daemonErrorMessage(error);
      }
    } finally {
      sessionActionBusy = false;
    }
    render();
  };
  bindListener(document.querySelector("#daemon-message-send"), "click", () => run(async () => {
    const conversationId = getConversationId();
    const message = document.querySelector("#daemon-message")?.value || "";
    if (!message.trim()) throw new Error("메시지를 입력하세요.");
    const ttl = Number(document.querySelector("#daemon-message-expiry")?.value || 0);
    const messageExpiresAt = ttl ? Math.floor(Date.now() / 1000) + ttl : 0;
    const result = await bridge.sendMessage(conversationId, message, messageExpiresAt);
    state.daemonCiphertext = result.ciphertext || "";
    if (!state.daemonCiphertext) throw new Error("보안 서비스가 암호문을 반환하지 않았습니다.");
    const peerInboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || "";
    if (!peerInboxUrl) throw new Error("상대방의 전달 경로를 아직 준비하지 못했습니다.");
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
          createdAt: Math.floor(Date.now() / 1000),
        }];
        if (messageInput) messageInput.value = "";
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
      createdAt: Math.floor(Date.now() / 1000),
    }];
    if (messageInput) messageInput.value = "";
  }, "메시지를 로컬 보안 서비스에서 암호화하고 전달 경로에 접수했습니다."));
  bindListener(messageInput, "keydown", (event) => {
    if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey) || event.shiftKey) return;
    event.preventDefault();
    document.querySelector("#daemon-message-send")?.click();
  });
  document.querySelectorAll(".daemon-attachment-download").forEach((button) => bindListener(button, "click", () => run(async () => {
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
  }, "첨부파일을 로컬 보안 서비스에서 검증·복호화해 다운로드했습니다.")));
  document.querySelectorAll(".daemon-attachment-delete").forEach((button) => bindListener(button, "click", () => run(async () => {
    const attachmentId = button.dataset.daemonAttachmentDelete || "";
    if (!attachmentId) throw new Error("삭제할 첨부파일 정보가 없습니다.");
    await bridge.cancelAttachment(attachmentId);
    state.daemonMessages = state.daemonMessages.filter((message) => message.attachmentId !== attachmentId);
  }, "로컬 암호화 저장소에서 첨부파일 상태를 삭제했습니다.")));
  document.querySelectorAll(".daemon-message-copy").forEach((button) => bindListener(button, "click", () => run(async () => {
    await copyToClipboard(button.dataset.daemonCopy || "");
  }, "메시지 내용을 클립보드에 복사했습니다. 공유 후 클립보드 기록을 정리하세요.")));
  bindListener(document.querySelector("#daemon-attachment-send"), "click", () => run(async () => {
    const conversationId = getConversationId();
    const file = document.querySelector("#daemon-attachment-file")?.files?.[0];
    const inboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || state.daemonPeerInboxUrl;
    if (!file) throw new Error("전송할 파일을 선택하세요.");
    if (!inboxUrl) throw new Error("상대방의 전달 경로를 아직 준비하지 못했습니다.");
    if (file.size === 0 || file.size > 32 * 1024 * 1024) throw new Error("첨부파일은 1바이트 이상 32MiB 이하여야 합니다.");
    const blobId = newAttachmentBlobId();
    state.daemonAttachmentBlobId = blobId;
    const chunkSize = 64 * 1024;
    state.daemonAttachmentState = "안전한 파일 전송을 준비하는 중";
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
    progress("암호화한 파일을 전달 경로로 보내는 중", 80);
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
    state.daemonOutgoingMessages = [...state.daemonOutgoingMessages, { id: state.daemonDeliveryDigest || "attachment", text: `첨부파일: ${file.name}`, state: state.daemonDeliveryState, direction: "outgoing", createdAt: Math.floor(Date.now() / 1000) }];
  }, "첨부파일을 암호화하고 전달 경로에 접수했습니다."));
  bindListener(document.querySelector("#daemon-attachment-retry"), "click", () => run(async () => {
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
  bindListener(document.querySelector("#daemon-attachment-cancel"), "click", () => run(async () => {
    if (state.daemonAttachmentBlobId) await bridge.cancelAttachment(state.daemonAttachmentBlobId);
    state.daemonAttachmentBlobId = "";
    state.daemonAttachmentProgress = 0;
    state.daemonAttachmentState = "첨부파일 작업을 취소했습니다";
  }, "첨부파일 암호화 상태를 폐기했습니다."));
  bindListener(document.querySelector("#daemon-delivery-status"), "click", () => run(async () => {
    if (!state.daemonDeliveryDigest) throw new Error("조회할 전달 기록이 없습니다.");
    const result = await bridge.deliveryStatus(state.daemonDeliveryDigest);
    state.daemonRelayState = "online";
    state.daemonDeliveryState = result.state || state.daemonDeliveryState;
    state.daemonOutgoingMessages = state.daemonOutgoingMessages.map((item) => item.id === state.daemonDeliveryDigest ? { ...item, state: state.daemonDeliveryState } : item);
  }, "전달 상태를 갱신했습니다."));
  bindListener(document.querySelector("#daemon-delivery-retry"), "click", () => run(async () => {
    if (!state.daemonDeliveryDigest) throw new Error("재시도할 전달 기록이 없습니다.");
    const inboxUrl = document.querySelector("#daemon-peer-inbox-url")?.value.trim() || state.daemonPeerInboxUrl;
    if (!inboxUrl) throw new Error("상대방의 전달 경로를 아직 준비하지 못했습니다.");
    const result = await bridge.retryDelivery(inboxUrl, state.daemonDeliveryDigest);
    state.daemonRelayState = "online";
    state.daemonDeliveryState = result.state || "relay-accepted";
    state.daemonOutgoingMessages = state.daemonOutgoingMessages.map((item) => item.id === state.daemonDeliveryDigest ? { ...item, state: state.daemonDeliveryState } : item);
  }, "암호화된 메시지를 전달 경로로 다시 보냈습니다."));
  bindListener(document.querySelector("#daemon-delivery-sync"), "click", () => run(async () => {
    const conversationId = getConversationId();
    const inboxUrl = document.querySelector("#daemon-inbox-url")?.value.trim() || "";
    if (!inboxUrl) throw new Error("내 전달 경로를 아직 준비하지 못했습니다.");
    state.daemonInboxUrl = inboxUrl;
    const result = await bridge.syncDelivery(conversationId, inboxUrl);
    state.daemonRelayState = "online";
    const received = (result.messages || []).map((message) => ({
      id: message.id || "수신 메시지",
      text: message.attachment_id ? "암호화 첨부파일" : message.expired ? "만료된 메시지" : decodeHexText(message.plaintext),
      attachmentId: message.attachment_id || "",
      state: "decrypted",
      direction: "incoming",
      createdAt: Number(message.created_at) || Math.floor(Date.now() / 1000),
    }));
    state.daemonMessages = mergeDaemonMessages(state.daemonMessages, received);
    state.daemonPlaintext = received.at(-1)?.text || state.daemonPlaintext;
  }, "받은 메시지를 검증·복호화했습니다."));
}




async function copyToClipboard(value) {
  if (!window.isSecureContext || typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
    throw new Error("클립보드를 사용할 수 없습니다. 표시된 내용을 직접 복사하고 전달 후 클립보드 기록을 지우세요.");
  }
  await navigator.clipboard.writeText(value);
}

export function bindDaemonWorkspace({ render }) {
  if (!state.daemonBridgeMode) return;
  if (!activeBindingController) activeBindingController = new AbortController();
    document.querySelectorAll("[data-daemon-view]").forEach((button) => bindListener(button, "click", () => {
      state.daemonActiveView = button.dataset.daemonView || "conversation";
      state.error = "";
      render();
    }));
    if (state.daemonBridge && !state.daemonLocked) {
      bindListener(document.querySelector("#daemon-wipe"), "click", async () => {
        if (!window.confirm("이 기기의 암호화 저장소와 현재 연결을 삭제할까요? 전달 경로 자료·별도 백업·디스크 잔존 데이터는 삭제되지 않습니다.")) return;
        try {
          const result = await state.daemonBridge.wipe();
          state.daemonBridge = null;
          state.daemonLocked = true;
          state.daemonStatus = "삭제됨 · 보안 서비스 재초기화 필요";
          state.notice = result.remote_data === "not_deleted"
            ? "이 기기의 로컬 데이터만 삭제했습니다. 전달 경로 자료와 별도 백업은 따로 폐기해야 합니다."
            : "이 기기의 로컬 데이터를 삭제했습니다.";
          state.error = "";
        } catch (error) { state.error = daemonErrorMessage(error); }
        render();
      });
      bindListener(document.querySelector("#daemon-recovery-export"), "click", async () => {
        if (!window.confirm("현재 암호화 저장소의 복구 백업을 다운로드할까요? 원래 프로필 암호 문구가 있어야 복구할 수 있습니다.")) return;
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
        } catch (error) { state.error = `복구 백업을 만들지 못했습니다: ${daemonErrorMessage(error)}`; }
        render();
      });
      const recoveryInput = document.querySelector("#daemon-recovery-input");
      const restoreButton = document.querySelector("#daemon-recovery-stage");
      bindListener(recoveryInput, "change", () => {
        if (restoreButton) restoreButton.disabled = !recoveryInput.files?.[0];
      });
      bindListener(restoreButton, "click", async () => {
        const file = recoveryInput.files?.[0];
        if (!file) return;
        if (!window.confirm("선택한 복구 백업을 보안 서비스의 다음 시작 때 적용하도록 예약할까요? 현재 저장소는 지금 바뀌지 않습니다.")) return;
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await state.daemonBridge.recoveryStage(encodeHex(bytes));
          state.notice = result.restart_required
            ? "복구 백업을 검증하고 적용 예약했습니다. 보안 서비스를 정상 종료한 뒤 같은 데이터 폴더로 다시 시작하세요."
            : "복구 백업 적용을 예약했습니다.";
          state.error = "";
        } catch (error) { state.error = `복구 백업을 예약하지 못했습니다: ${daemonErrorMessage(error)}`; }
        render();
      });
      if (restoreButton && recoveryInput) restoreButton.disabled = !recoveryInput.files?.[0];
    }
    bindListener(document.querySelector("#daemon-save-relay-pin"), "click", async () => {
      try {
        const pin = document.querySelector("#daemon-tls-pin")?.value.trim() || "";
        const retrust = Boolean(document.querySelector("#daemon-tls-retrust")?.checked);
        state.daemonRelayTrust = await state.daemonBridge.saveRelayTlsPin(pin, retrust);
        state.notice = "전달 경로 인증서 지문을 로컬 암호화 저장소에 저장했습니다.";
        state.error = "";
        render();
      } catch (error) {
        state.error = daemonErrorMessage(error);
        render();
      }
    });
    document.querySelectorAll("[data-device-revoke]").forEach((button) => bindListener(button, "click", async () => {
      const deviceId = button.dataset.deviceRevoke || "";
      if (!deviceId || !window.confirm(`기기 ${deviceId}를 폐기할까요? 해당 기기는 이후 이 계정에 연결할 수 없습니다.`)) return;
      try {
        const result = await state.daemonBridge.revokeDevice(deviceId);
        const devices = await state.daemonBridge.devices();
        state.daemonDevices = devices.devices || [];
        state.daemonDeviceEvents = devices.events || [];
        state.notice = `기기 ${deviceId}를 폐기했고 관련 암호화 연결 ${result.sessions_removed || 0}개를 정리했습니다. 변경 사항 ${result.delivered || 0}개를 전달했습니다.`;
        state.error = "";
      } catch (error) { state.error = `기기 폐기 또는 암호화 연결 정리에 실패했습니다: ${daemonErrorMessage(error)}`; }
      render();
    }));
    bindListener(document.querySelector("#daemon-link-approve"), "click", async () => {
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
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    });
    bindListener(document.querySelector("#daemon-contact-search"), "input", (event) => {
      state.daemonContactSearch = event.target.value;
      render();
    });
    document.querySelectorAll("[data-contact-account]").forEach((button) => bindListener(button, "click", () => {
      state.daemonSelectedContact = button.dataset.contactAccount || "";
      const contact = state.daemonContacts.find((item) => item.account_id === state.daemonSelectedContact);
      state.daemonConversationId = contact?.conversation_id || "";
      state.daemonPeerInboxUrl = contact?.inbox_url || "";
      state.daemonOutgoingMessages = [];
      state.daemonMessages = [];
      state.daemonMessageOffset = 0;
      state.daemonMessagesHasMore = false;
      state.daemonDeliveryDigest = "";
      state.daemonDeliveryState = "";
      state.notice = contact?.conversation_id
        ? "연락처의 로컬 대화를 열었습니다. 메시지 기록을 불러오거나 새 메시지를 작성하세요."
        : "연락처를 선택했습니다. 먼저 이 연락처의 대화를 준비하세요.";
      state.daemonBridge.markContactRead(state.daemonSelectedContact).then(async () => {
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || state.daemonContacts;
        if (contact?.conversation_id) {
          const result = await state.daemonBridge.messages(contact.conversation_id, 200, 0);
          const restoredCount = applyMessagePage(result, true);
          state.notice = restoredCount ? `${restoredCount}개의 로컬 대화 기록을 불러왔습니다.` : "새 대화를 시작할 수 있습니다.";
        }
        render();
      }).catch((error) => {
        state.error = `대화 기록을 불러오지 못했습니다: ${daemonErrorMessage(error)}`;
        render();
      });
      render();
    }));
    document.querySelectorAll("[data-contact-save]").forEach((button) => bindListener(button, "click", async () => {
      try {
        const accountId = button.dataset.contactSave || "";
        const alias = [...document.querySelectorAll("[data-contact-alias]")].find((input) => input.dataset.contactAlias === accountId)?.value || "";
        await state.daemonBridge.setContactAlias(accountId, alias);
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || [];
        state.notice = "연락처 별칭을 저장했습니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    }));
    document.querySelectorAll("[data-contact-block]").forEach((button) => bindListener(button, "click", async () => {
      try {
        const accountId = button.dataset.contactBlock || "";
        const contact = state.daemonContacts.find((item) => item.account_id === accountId);
        if (contact?.state !== "blocked" && !window.confirm("이 연락처의 메시지 송수신을 차단할까요?")) return;
        if (contact?.state === "blocked") await state.daemonBridge.unblockContact(accountId);
        else await state.daemonBridge.blockContact(accountId);
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || [];
        state.notice = contact?.state === "blocked" ? "연락처 차단을 해제했습니다." : "연락처를 차단했습니다. 해당 대화의 송수신이 중단됩니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    }));
    document.querySelectorAll("[data-contact-delete]").forEach((button) => bindListener(button, "click", async () => {
      try {
        const accountId = button.dataset.contactDelete || "";
        if (!window.confirm("연락처와 이 기기의 대화 세션을 삭제할까요? 복구할 수 없습니다.")) return;
        await state.daemonBridge.deleteContact(accountId);
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || [];
        if (state.daemonSelectedContact === accountId) state.daemonSelectedContact = "";
        state.notice = "연락처와 로컬 대화 세션을 삭제했습니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    }));
    bindListener(document.querySelector("#daemon-lock"), "click", async () => {
      try {
        await state.daemonBridge.lock();
        state.daemonBridge = null;
        state.daemonLocked = true;
        state.daemonStatus = "잠김";
        state.notice = "보안 서비스 연결을 잠갔습니다. 브라우저에는 키와 메시지 상태가 없습니다.";
        render();
      } catch (error) {
        state.error = daemonErrorMessage(error);
        render();
      }
    });
    bindListener(document.querySelector("#daemon-create-invite"), "click", async () => {
      try {
        const localInvite = await state.daemonBridge.createInvite();
        if (!state.daemonRelayOrigin) throw new Error("보안 서비스에 전달 경로가 설정되지 않았습니다.");
        state.daemonInvite = localInvite;
        state.notice = "일회성 초대 코드를 만들었습니다. 코드만 별도 신뢰 채널로 전달하세요.";
        state.error = "";
        render();
      } catch (error) {
        state.error = daemonErrorMessage(error);
        render();
      }
    });
    bindListener(document.querySelector("#daemon-revoke-invite"), "click", async () => {
      try {
        if (!window.confirm("이 초대코드를 즉시 폐기할까요? 상대는 더 이상 사용할 수 없습니다.")) return;
        await state.daemonBridge.revokeInvite(state.daemonInvite.invite_code);
        state.daemonInvite = null;
        state.notice = "초대 코드를 폐기했습니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    });
    bindListener(document.querySelector("#daemon-copy-invite"), "click", async () => {
      try {
        await copyToClipboard(state.daemonInvite?.invite_code || "");
        state.notice = "초대 코드를 복사했습니다. 전달한 뒤 클립보드 기록을 지우세요.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    });
    bindListener(document.querySelector("#daemon-approve-pairing"), "click", async () => {
      try {
        state.daemonPairing = { ...state.daemonPairing, ...(await state.daemonBridge.approvePairing()), safety_verified: true };
        state.daemonContacts = (await state.daemonBridge.contacts()).contacts || state.daemonContacts;
        state.notice = "상대 연락처를 승인했습니다. 이제 후속 세션 연결을 진행할 수 있습니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    });
    bindListener(document.querySelector("#daemon-verify-safety"), "click", async () => {
      try {
        const verified = await state.daemonBridge.verifySafety(document.querySelector("#daemon-safety-confirmation").value);
        state.daemonPairing = { ...state.daemonPairing, ...verified, safety_verified: true };
        state.daemonReceivedInvite = { ...state.daemonReceivedInvite, safety_verified: true };
        state.notice = "안전 번호를 확인했습니다. 이제 연락처 승인을 진행할 수 있습니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    });
    bindListener(document.querySelector("#daemon-unverify-safety"), "click", async () => {
      if (!window.confirm("안전 번호를 다시 확인할 때까지 이 연락처로 메시지를 보낼 수 없게 됩니다. 계속할까요?")) return;
      try {
        const result = await state.daemonBridge.unverifySafety();
        state.daemonPairing = { ...state.daemonPairing, ...result, safety_verified: false };
        state.daemonReceivedInvite = { ...state.daemonReceivedInvite, safety_verified: false };
        state.notice = "안전 번호를 다시 확인해야 합니다. 확인 전까지 메시지 송신이 차단됩니다.";
        state.error = "";
      } catch (error) { state.error = `안전 번호 재확인 준비에 실패했습니다: ${daemonErrorMessage(error)}`; }
      render();
    });
    bindListener(document.querySelector("#daemon-reject-pairing"), "click", async () => {
      try {
        state.daemonPairing = await state.daemonBridge.rejectPairing();
        state.daemonReceivedInvite = null;
        state.notice = "상대 연락처 요청을 거절했습니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    });
    bindListener(document.querySelector("#daemon-consume-invite"), "click", async () => {
      try {
        const relayOrigin = state.daemonRelayOrigin.trim();
        if (!relayOrigin) throw new Error("이 보안 서비스에 전달 경로가 설정되지 않았습니다.");
        const staged = await state.daemonBridge.consumeInvite(relayOrigin, document.querySelector("#received-invite-code").value);
        state.daemonReceivedInvite = staged;
        state.daemonPairing = staged;
        state.daemonPeerInboxUrl = staged.inbox_url || "";
        state.daemonConversationId = staged.conversation_id || state.daemonConversationId;
        state.daemonConsumedInvite = document.querySelector("#received-invite-code").value.trim();
        state.notice = "초대 코드를 한 번만 사용하도록 폐기하고 상대 신원을 확인했습니다. 승인 전에는 연결되지 않습니다.";
        state.error = "";
      } catch (error) { state.error = daemonErrorMessage(error); }
      render();
    });
    bindDaemonSession({ render });
    schedulePairingSync(render);
    scheduleWelcomeSync(render);
}

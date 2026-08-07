import { state } from "./daemon-state.js";
import { decodeHexText, decodeHexBytes, encodeHex, mergeDaemonMessages, newAttachmentBlobId, newDaemonConversationId } from "./daemon-view.js";

export function bindDaemonSession({ render }) {
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

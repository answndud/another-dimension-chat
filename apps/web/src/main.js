import { connectDaemonBridge, consumeRelayInvite, createRelayInviteCode, revokeRelayInviteCode } from "./daemon-bridge.js";
import { renderDaemonBridgeState, renderDaemonRelayTrust, renderDaemonSafetyControls, escapeHtml, decodeHexBytes, encodeHex } from "./daemon-view.js";
import { state } from "./daemon-state.js";
import { bindDaemonSession } from "./daemon-controller.js";
import "./styles.css";

const app = document.querySelector("#app");

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
    bindDaemonSession({ render });
    return;
  }
}

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

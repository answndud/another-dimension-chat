import { connectDaemonBridge } from "./daemon-bridge.js";
import { renderDaemonBridgeState } from "./daemon-view.js";
import { state } from "./daemon-state.js";
import { bindDaemonWorkspace } from "./daemon-controller.js";
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
    bindDaemonWorkspace({ render });
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

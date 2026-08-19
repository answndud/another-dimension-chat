import { connectDaemonBridge } from "./daemon-bridge.js";
import { renderDaemonBridgeState } from "./daemon-view.js";
import { daemonErrorMessage } from "./daemon-errors.js";
import { state } from "./daemon-state.js";
import { bindDaemonWorkspace } from "./daemon-controller.js";
import { DAEMON_SCREEN, daemonScreenForStatus } from "./daemon-flow.js";
const app = document.querySelector("#app");

// The current product deliberately does not use a service worker: the daemon
// owns all private state and serves a no-store UI shell. Older prototypes did
// register one on this origin, so remove those registrations when the current
// bundle gets a chance to run. This prevents a stale prototype shell from
// masking the daemon UI after an upgrade.
async function removeLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.map((registration) => registration.unregister()));
  } catch {
    // A browser policy can deny service-worker inspection. UI startup must not
    // fail because this compatibility cleanup was unavailable.
  }
}

function browserSupportStatus() {
  const ua = navigator.userAgent || "";
  if (/Firefox\//.test(ua)) return { supported: false, label: "Firefox" };
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/CriOS\//.test(ua) && !/EdgiOS/.test(ua);
  if (isSafari) return { supported: false, label: "Safari" };
  return { supported: true, label: /Edg\//.test(ua) ? "Microsoft Edge" : /OPR\//.test(ua) ? "Opera" : "Chromium" };
}

function captureInteractionState() {
  const active = document.activeElement;
  const focusAttribute = active && !active.id
    ? [...active.attributes].find((attribute) => attribute.name.startsWith("data-") && !attribute.name.startsWith("data-ad-listener"))
    : null;
  const focused = active?.id || focusAttribute ? {
    id: active.id || undefined,
    attributeName: focusAttribute?.name,
    attributeValue: focusAttribute?.value,
    value: "value" in active ? active.value : undefined,
    selectionStart: typeof active.selectionStart === "number" ? active.selectionStart : undefined,
    selectionEnd: typeof active.selectionEnd === "number" ? active.selectionEnd : undefined,
  } : null;
  const messageList = document.querySelector(".daemon-message-list");
  return { focused, messageScrollTop: messageList?.scrollTop ?? null };
}

function restoreInteractionState(snapshot) {
  if (snapshot.focused?.id || snapshot.focused?.attributeName) {
    const node = snapshot.focused.id
      ? document.getElementById(snapshot.focused.id)
      : [...document.querySelectorAll(`[${snapshot.focused.attributeName}]`)].find((candidate) => candidate.getAttribute(snapshot.focused.attributeName) === snapshot.focused.attributeValue);
    if (node && snapshot.focused.value !== undefined && node.type !== "file") node.value = snapshot.focused.value;
    if (node && document.activeElement !== node) node.focus({ preventScroll: true });
    if (node && typeof snapshot.focused.selectionStart === "number" && typeof node.setSelectionRange === "function") {
      node.setSelectionRange(snapshot.focused.selectionStart, snapshot.focused.selectionEnd);
    }
  }
  if (snapshot.messageScrollTop !== null) {
    const messageList = document.querySelector(".daemon-message-list");
    if (messageList) messageList.scrollTop = snapshot.messageScrollTop;
  }
}

function sameElement(left, right) {
  if (left.nodeType !== right.nodeType) return false;
  if (left.nodeType !== Node.ELEMENT_NODE || left.tagName !== right.tagName) return left.nodeType === Node.TEXT_NODE;
  const identity = (node) => {
    if (node.id) return `id:${node.id}`;
    const dataAttribute = [...node.attributes].find((attribute) => attribute.name.startsWith("data-"));
    return dataAttribute ? `${dataAttribute.name}:${dataAttribute.value}` : "";
  };
  const leftIdentity = identity(left);
  const rightIdentity = identity(right);
  return !leftIdentity || !rightIdentity || leftIdentity === rightIdentity;
}

function syncAttributes(current, next) {
  for (const attribute of [...current.attributes]) {
    if (attribute.name.startsWith("data-ad-listener")) continue;
    if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for (const attribute of [...next.attributes]) {
    if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
}

function syncChildren(currentParent, nextParent) {
  const currentChildren = [...currentParent.childNodes];
  const nextChildren = [...nextParent.childNodes];
  const commonLength = Math.min(currentChildren.length, nextChildren.length);
  for (let index = 0; index < commonLength; index += 1) {
    const current = currentChildren[index];
    const next = nextChildren[index];
    if (!sameElement(current, next)) {
      currentParent.replaceChild(next, current);
      continue;
    }
    if (current.nodeType === Node.TEXT_NODE) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      continue;
    }
    syncAttributes(current, next);
    syncChildren(current, next);
  }
  for (let index = commonLength; index < nextChildren.length; index += 1) currentParent.append(nextChildren[index]);
  for (let index = currentChildren.length - 1; index >= nextChildren.length; index -= 1) currentParent.removeChild(currentChildren[index]);
}

function patchApplication(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup;
  syncChildren(app, template.content);
}

function render() {
  if (state.daemonBridgeMode) {
    const interaction = captureInteractionState();
    patchApplication(renderDaemonBridgeState(state));
    restoreInteractionState(interaction);
    bindDaemonWorkspace({ render });
    return;
  }
}

async function startApp() {
  try {
    await removeLegacyServiceWorkers();
    const support = browserSupportStatus();
    if (!support.supported) {
      state.daemonBridgeMode = true;
      state.daemonScreen = DAEMON_SCREEN.unsupportedBrowser;
      state.daemonStatus = "지원 브라우저가 아닙니다";
      state.notice = `이 화면은 Chromium 기반 브라우저(Chrome·Edge·Brave 등)만 지원합니다. 현재 브라우저(${support.label})에서는 보안 서비스에 연결하지 않았습니다. Another Dimension 앱을 다시 열어 지원 브라우저에서 실행하세요.`;
      render();
      return;
    }
    const daemonBridge = await connectDaemonBridge();
    if (daemonBridge) {
      state.daemonBridge = daemonBridge;
      state.daemonBridgeMode = true;
      const daemonStatus = await daemonBridge.request("/local-api/status");
      state.daemonScreen = daemonScreenForStatus(daemonStatus.status);
      if (daemonStatus.status === "not_initialized" || daemonStatus.status === "setup-required") {
        state.daemonSetupRequired = true;
        state.daemonSetupStatus = daemonStatus.status;
        state.daemonStatus = "처음 설정 필요";
        state.notice = "이 기기에서 처음 설정을 시작하세요. 아직 계정·메시지·전달 경로 정보는 만들어지지 않았습니다.";
        render();
        return;
      }
      if (["initializing", "corrupt", "unsupported"].includes(daemonStatus.status)) {
        state.daemonSetupRequired = true;
        state.daemonSetupStatus = daemonStatus.status;
        state.daemonStatus = daemonStatus.status;
        state.notice = daemonStatus.status === "unsupported"
          ? "이 배포본은 Apple Silicon Mac에서만 사용할 수 있습니다."
          : daemonStatus.status === "initializing"
            ? "프로필 준비가 중단된 상태입니다. 새 계정으로 덮어쓰지 않고 운영자 확인이 필요합니다."
            : "프로필 파일 상태를 확인할 수 없습니다. 새 계정으로 덮어쓰지 않고 복구 절차가 필요합니다.";
        render();
        return;
      }
      if (state.daemonScreen === DAEMON_SCREEN.locked) {
        state.daemonLocked = true;
        state.daemonStatus = "잠김";
        state.notice = "보안 서비스가 잠겨 있습니다. Another Dimension 앱을 다시 열어 잠금을 해제하세요.";
        render();
        return;
      }
      if (state.daemonScreen === DAEMON_SCREEN.error || state.daemonScreen === DAEMON_SCREEN.loading) {
        state.daemonStatus = "보안 상태를 확인할 수 없습니다";
        state.error = "보안 서비스가 알 수 없는 상태를 반환했습니다. 기존 데이터를 덮어쓰지 말고 앱을 다시 열어 보세요.";
        render();
        return;
      }
      state.daemonSetupRequired = false;
      state.daemonRecoveryRequired = daemonStatus.status === "recovery_required";
      state.daemonRelayConfigured = daemonStatus.status !== "relay_unconfigured";
      if (state.daemonRecoveryRequired) state.daemonActiveView = "security";
      state.daemonStorage = { records: daemonStatus.storage_records || 0, limit: daemonStatus.storage_record_limit || 0 };
      state.daemonStatus = daemonStatus.status
        ? `연결됨 · 암호화 레코드 ${state.daemonStorage.records}/${state.daemonStorage.limit}`
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
      state.notice = state.daemonRelayConfigured
        ? "브라우저 보안 경계를 확인했습니다. 암호화 키와 메시지 상태는 로컬 보안 서비스가 소유합니다."
        : "이 배포본에는 전달 경로가 아직 연결되지 않았습니다. 운영자에게 통합 배포본 또는 연결 준비를 요청하세요.";
      render();
      return;
    }
    state.daemonBridgeMode = true;
    state.daemonScreen = DAEMON_SCREEN.disconnected;
    state.daemonStatus = "보안 서비스 연결 대기";
    state.notice = "Another Dimension 앱이 실행 중인지 확인한 뒤 앱을 다시 열어 보안 화면을 여세요.";
    render();
  } catch (error) {
    state.daemonBridgeMode = true;
    state.daemonScreen = DAEMON_SCREEN.error;
    state.daemonStatus = "보안 서비스 연결 실패";
    state.error = daemonErrorMessage(error);
    render();
  }
}

startApp();

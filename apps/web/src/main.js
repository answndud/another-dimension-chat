import { connectDaemonBridge } from "./daemon-bridge.js";
import { renderDaemonBridgeState } from "./daemon-view.js";
import { state } from "./daemon-state.js";
import { bindDaemonWorkspace } from "./daemon-controller.js";
import "./styles.css";

const app = document.querySelector("#app");

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
    const daemonBridge = await connectDaemonBridge();
    if (daemonBridge) {
      state.daemonBridge = daemonBridge;
      state.daemonBridgeMode = true;
      const daemonStatus = await daemonBridge.request("/local-api/status");
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
      state.notice = "브라우저 보안 경계를 확인했습니다. 암호화 키와 메시지 상태는 로컬 보안 데몬이 소유합니다.";
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

import assert from "node:assert/strict";
import test from "node:test";
import { createDesktopPanelController } from "./desktop-panel-controller.js";

function createButton() {
  return {
    listeners: new Map(),
    attrs: new Map(),
    focused: false,
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    setAttribute(name, value) {
      this.attrs.set(name, value);
    },
    focus() {
      this.focused = true;
    },
    contains(target) {
      return target === this;
    },
  };
}

function createPanel() {
  return {
    open: false,
    listeners: new Map(),
    insideTarget: null,
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    contains(target) {
      return target === this.insideTarget;
    },
  };
}

function createDocumentHarness() {
  const chatPanel = createPanel();
  const systemPanel = createPanel();
  const systemSummary = createButton();
  const body = {
    classes: new Set(),
    classList: {
      toggle(name, enabled) {
        if (enabled) {
          body.classes.add(name);
        } else {
          body.classes.delete(name);
        }
      },
    },
  };
  const keydownListeners = [];
  const pointerdownListeners = [];
  return {
    chatPanel,
    systemPanel,
    systemSummary,
    keydownListeners,
    pointerdownListeners,
    document: {
      body,
      querySelector(selector) {
        if (selector === ".chat-settings-panel") {
          return chatPanel;
        }
        if (selector === ".system-settings-panel") {
          return systemPanel;
        }
        if (selector === ".system-settings-panel > summary") {
          return systemSummary;
        }
        return null;
      },
      addEventListener(type, handler) {
        if (type === "keydown") {
          keydownListeners.push(handler);
        }
        if (type === "pointerdown") {
          pointerdownListeners.push(handler);
        }
      },
    },
  };
}

test("bindPanelControls wires toggle, close, and utility buttons", () => {
  const harness = createDocumentHarness();
  const fields = {
    toggleChatSettings: createButton(),
    closeChatSettings: createButton(),
    openPrivateDeliverySettings: createButton(),
    closeAppSettings: createButton(),
    openDeveloperTools: createButton(),
  };
  let enabledPrivateDelivery = 0;
  let openedManualTools = 0;
  const controller = createDesktopPanelController({
    document: harness.document,
    fields,
    openChatSettingsPanel: () => {
      harness.chatPanel.open = true;
    },
    closeChatSettingsPanel: () => {
      harness.chatPanel.open = false;
    },
    closeAppSettingsPanel: () => {
      harness.systemPanel.open = false;
    },
    enablePrivateDeliveryPermission: () => {
      enabledPrivateDelivery += 1;
    },
    openManualProductionTools: () => {
      openedManualTools += 1;
    },
  });

  controller.bindPanelControls();
  fields.toggleChatSettings.listeners.get("click")();
  fields.closeChatSettings.listeners.get("click")();
  fields.openPrivateDeliverySettings.listeners.get("click")();
  fields.closeAppSettings.listeners.get("click")();
  fields.openDeveloperTools.listeners.get("click")();

  assert.equal(fields.toggleChatSettings.attrs.get("aria-expanded"), "false");
  assert.equal(fields.toggleChatSettings.focused, true);
  assert.equal(enabledPrivateDelivery, 1);
  assert.equal(openedManualTools, 1);
  assert.equal(harness.systemSummary.focused, true);
});

test("Escape and outside pointer close open panels", () => {
  const harness = createDocumentHarness();
  const fields = {
    toggleChatSettings: createButton(),
  };
  let chatClosed = 0;
  let appClosed = 0;
  const controller = createDesktopPanelController({
    document: harness.document,
    fields,
    openChatSettingsPanel: () => {},
    closeChatSettingsPanel: () => {
      chatClosed += 1;
      harness.chatPanel.open = false;
    },
    closeAppSettingsPanel: () => {
      appClosed += 1;
      harness.systemPanel.open = false;
    },
    enablePrivateDeliveryPermission: () => {},
    openManualProductionTools: () => {},
  });

  controller.bindPanelControls();
  harness.chatPanel.open = true;
  harness.systemPanel.open = true;
  harness.keydownListeners[0]({ key: "Escape" });
  harness.chatPanel.open = true;
  harness.systemPanel.open = true;
  harness.pointerdownListeners[0]({ target: {} });

  assert.equal(chatClosed, 2);
  assert.equal(appClosed, 2);
  assert.equal(fields.toggleChatSettings.focused, true);
  assert.equal(harness.systemSummary.focused, true);
});

test("toggle listeners keep body state and aria-expanded in sync", () => {
  const harness = createDocumentHarness();
  const fields = {
    toggleChatSettings: createButton(),
  };
  let chatClosed = 0;
  const controller = createDesktopPanelController({
    document: harness.document,
    fields,
    openChatSettingsPanel: () => {},
    closeChatSettingsPanel: () => {
      chatClosed += 1;
    },
    closeAppSettingsPanel: () => {},
    enablePrivateDeliveryPermission: () => {},
    openManualProductionTools: () => {},
  });

  controller.bindPanelControls();
  harness.chatPanel.listeners.get("toggle")({ currentTarget: { open: true } });
  harness.systemPanel.listeners.get("toggle")({ currentTarget: { open: true } });

  assert.equal(fields.toggleChatSettings.attrs.get("aria-expanded"), "true");
  assert.equal(harness.document.body.classes.has("is-chat-settings-open"), true);
  assert.equal(harness.document.body.classes.has("is-app-settings-open"), true);
  assert.equal(chatClosed, 1);
});

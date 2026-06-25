import assert from "node:assert/strict";
import test from "node:test";

import { createInviteQrController } from "./invite-qr-controller.js";

function createFields() {
  return {
    inviteQrPanel: { hidden: true },
    inviteQrImage: { hidden: true, src: "" },
    productionTwoProfileB: { value: "" },
    productionTwoProfileWarning: { textContent: "" },
    receivedInviteCode: { value: "" },
    receivedInviteQrFile: {
      value: "",
      clickCalls: 0,
      listeners: new Map(),
      click() {
        this.clickCalls += 1;
      },
      addEventListener(type, handler) {
        this.listeners.set(type, handler);
      },
    },
    importReceivedInviteQr: {
      listeners: new Map(),
      addEventListener(type, handler) {
        this.listeners.set(type, handler);
      },
    },
    showCreatedInviteQr: {
      listeners: new Map(),
      addEventListener(type, handler) {
        this.listeners.set(type, handler);
      },
    },
    hideInviteQr: {
      listeners: new Map(),
      addEventListener(type, handler) {
        this.listeners.set(type, handler);
      },
    },
  };
}

test("invite qr controller shows inviter qr only when current invite sharing is visible", async () => {
  const fields = createFields();
  fields.productionTwoProfileB.value = " INVITE-123 ";
  const warnings = [];
  const controller = createInviteQrController({
    fields,
    t: (key) => key,
    normalizeInviteQrPayload: (value) => String(value).trim(),
    buildInviteQrSvgDataUrl: (value) => `svg:${value}`,
    canImportInviteQr: () => true,
    decodeInviteQrFile: async () => "unused",
    connectionCodeRoleFor: () => "inviter",
    getCurrentInviteCodeShareVisible: () => true,
    setProductionTwoProfileState() {},
    setText(node, value) {
      warnings.push(value);
      node.textContent = value;
    },
    renderReceivedInviteCodeActionState() {},
    createRoomFromReceivedInviteCode() {
      return true;
    },
  });

  assert.equal(await controller.showCurrentInviteQr(), true);
  assert.equal(controller.isInviteQrVisible(), true);
  assert.equal(fields.inviteQrPanel.hidden, false);
  assert.equal(fields.inviteQrImage.src, "svg:INVITE-123");
  assert.deepEqual(warnings, []);
});

test("invite qr controller fails closed for unsupported import runtime", async () => {
  const fields = createFields();
  const states = [];
  const controller = createInviteQrController({
    fields,
    t: (key) => key,
    normalizeInviteQrPayload: (value) => String(value).trim(),
    buildInviteQrSvgDataUrl: (value) => `svg:${value}`,
    canImportInviteQr: () => false,
    decodeInviteQrFile: async () => "unused",
    connectionCodeRoleFor: () => "joiner",
    getCurrentInviteCodeShareVisible: () => false,
    setProductionTwoProfileState(value) {
      states.push(value);
    },
    setText(node, value) {
      node.textContent = value;
    },
    renderReceivedInviteCodeActionState() {},
    createRoomFromReceivedInviteCode() {
      return true;
    },
  });

  assert.equal(await controller.importReceivedInviteQr(), false);
  assert.deepEqual(states, ["Invite QR import unavailable"]);
  assert.equal(fields.receivedInviteQrFile.clickCalls, 0);
});

test("invite qr controller imports decoded invite into existing join flow", async () => {
  const fields = createFields();
  const actionStates = [];
  let createCalls = 0;
  const controller = createInviteQrController({
    fields,
    t: (key) => key,
    normalizeInviteQrPayload: (value) => String(value).trim(),
    buildInviteQrSvgDataUrl: (value) => `svg:${value}`,
    canImportInviteQr: () => true,
    decodeInviteQrFile: async () => "  imported-code  ",
    connectionCodeRoleFor: () => "joiner",
    getCurrentInviteCodeShareVisible: () => false,
    setProductionTwoProfileState(value) {
      actionStates.push(value);
    },
    setText(node, value) {
      node.textContent = value;
    },
    renderReceivedInviteCodeActionState() {
      actionStates.push("action-state");
    },
    createRoomFromReceivedInviteCode() {
      createCalls += 1;
      return true;
    },
  });

  const result = await controller.handleReceivedInviteQrFileChange({
    target: { files: [{ name: "invite.png" }] },
  });
  assert.equal(result, true);
  assert.equal(fields.receivedInviteCode.value, "imported-code");
  assert.equal(fields.receivedInviteQrFile.value, "");
  assert.equal(createCalls, 1);
  assert.deepEqual(actionStates, ["action-state", "Invite QR imported"]);
});

test("invite qr controller binds expected qr controls", () => {
  const fields = createFields();
  const controller = createInviteQrController({
    fields,
    t: (key) => key,
    normalizeInviteQrPayload: (value) => String(value).trim(),
    buildInviteQrSvgDataUrl: (value) => `svg:${value}`,
    canImportInviteQr: () => true,
    decodeInviteQrFile: async () => "unused",
    connectionCodeRoleFor: () => "inviter",
    getCurrentInviteCodeShareVisible: () => true,
    setProductionTwoProfileState() {},
    setText() {},
    renderReceivedInviteCodeActionState() {},
    createRoomFromReceivedInviteCode() {
      return true;
    },
  });

  controller.bindInviteQrControls();
  assert.equal(typeof fields.importReceivedInviteQr.listeners.get("click"), "function");
  assert.equal(typeof fields.receivedInviteQrFile.listeners.get("change"), "function");
  assert.equal(typeof fields.showCreatedInviteQr.listeners.get("click"), "function");
  assert.equal(typeof fields.hideInviteQr.listeners.get("click"), "function");
});

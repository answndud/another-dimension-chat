import assert from "node:assert/strict";
import test from "node:test";
import { createChatDeliveryNoticeController } from "./chat-delivery-notice-controller.js";

function createFakeElement(tagName) {
  return {
    tagName,
    className: "",
    textContent: "",
    disabled: false,
    title: "",
    children: [],
    listeners: new Map(),
    replaceChildren(...children) {
      this.children = [...children];
    },
    append(...children) {
      this.children.push(...children);
    },
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    click() {
      this.listeners.get("click")?.();
    },
  };
}

function createController(overrides = {}) {
  const notice = createFakeElement("div");
  const state = {
    key: "",
    tone: "neutral",
    fingerprint: "",
    pending: null,
  };
  const fields = { chatDeliveryNotice: notice, productionTwoProfileMessage: createFakeElement("input") };
  return {
    controller: createChatDeliveryNoticeController({
      document: {
        createElement: (tagName) => createFakeElement(tagName),
      },
      fields,
      t: (key) => key,
      productionTwoProfileInput: () => ({ profileA: "alice", profileB: "bob", passphrase: "pass" }),
      twoProfileInviteCodeModeActive: () => false,
      twoProfileSessionStatusFingerprint: () => "fingerprint-1",
      currentActiveLocalPrivateRouteCode: () => "",
      currentTwoProfileRetryableOutboundEntry: (entry) => entry,
      currentTwoProfileOutboundPrimaryAction: () => ({ action: "retry", labelKey: "retrySend", noticeKey: "sendFailedGeneric", recoveryKey: "sendRecoveryGeneric" }),
      currentTwoProfileOutboundActionState: () => ({ canRunNow: true, canCancelNow: true, disabledReason: "", cancelDisabledReason: "" }),
      showCurrentRetryableOutboundMissing() {},
      runTwoProfileOutboundPrimaryAction() {},
      cancelTwoProfileOutboundEntry() {},
      startProductionTwoProfileOnionReceive() {},
      stopProductionTwoProfileOnionReceive() {},
      preparePrivateDeliveryRoute() {},
      copyLocalPrivateRouteCode() {},
      enablePrivateDeliveryPermission() {},
      focusSafetyConfirmation() {},
      productionTwoProfileOutboundStatusLabel: () => "ready",
      productionTwoProfileReceiveMatchesInput: () => false,
      setLatestChatDeliveryNoticeKey: (value) => {
        state.key = value;
      },
      setLatestChatDeliveryNoticeTone: (value) => {
        state.tone = value;
      },
      setLatestChatDeliveryNoticeRoomFingerprint: (value) => {
        state.fingerprint = value;
      },
      setLatestChatDeliveryNoticePendingOutbound: (value) => {
        state.pending = value;
      },
      latestChatDeliveryNoticeKey: () => state.key,
      latestChatDeliveryNoticeTone: () => state.tone,
      latestChatDeliveryNoticeRoomFingerprint: () => state.fingerprint,
      latestChatDeliveryNoticePendingOutbound: () => state.pending,
      ...overrides,
    }),
    notice,
    state,
    fields,
  };
}

test("chat delivery notice controller renders a room notice action", () => {
  const { controller, notice } = createController();
  controller.setChatDeliveryNoticeByKey("privateDeliveryRouteNeeded", "warning");
  assert.match(notice.className, /chat-delivery-notice/);
  assert.match(notice.className, /is-visible/);
  assert.equal(notice.children.length > 0, true);
});

test("chat delivery notice controller snapshots and restores pending outbound", () => {
  const { controller, state } = createController();
  const entry = {
    roomFingerprint: "fingerprint-1",
    sender: "alice",
    receiver: "bob",
    messageNumber: 7,
    message: "hello",
  };
  controller.setChatDeliveryNoticeForPendingOutbound(entry);
  const snapshot = controller.chatDeliveryPendingOutboundSnapshot();
  assert.deepEqual(snapshot, entry);
  controller.clearLatestChatDeliveryNoticeState();
  assert.equal(state.pending, null);
  assert.equal(controller.restoreChatDeliveryPendingOutboundSnapshot(snapshot), true);
  assert.deepEqual(state.pending, entry);
});

test("chat delivery notice retry and cancel dispatch only for the notice room", () => {
  let room = { profileA: "alice", profileB: "bob", passphrase: "pass" };
  const retried = [];
  const canceled = [];
  const { controller, notice } = createController({
    productionTwoProfileInput: () => room,
    twoProfileSessionStatusFingerprint: (input) => `${input.profileA}:${input.profileB}:${input.passphrase}`,
    runTwoProfileOutboundPrimaryAction: (entry, action) => retried.push({ entry, action }),
    cancelTwoProfileOutboundEntry: (entry) => canceled.push(entry),
  });
  const entry = {
    roomFingerprint: "alice:bob:pass",
    sender: "alice",
    receiver: "bob",
    messageNumber: 7,
    message: "hello",
  };

  controller.setChatDeliveryNoticeForPendingOutbound(entry, room);
  const actions = notice.children.at(-1);
  const [retry, cancel] = actions.children;
  retry.click();
  cancel.click();
  assert.equal(retried.length, 1);
  assert.equal(canceled.length, 1);

  room = { profileA: "alice", profileB: "carol", passphrase: "other" };
  retry.click();
  cancel.click();
  assert.equal(retried.length, 1);
  assert.equal(canceled.length, 1);
});

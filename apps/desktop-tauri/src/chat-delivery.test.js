import assert from "node:assert/strict";
import test from "node:test";
import * as chatDelivery from "./chat-delivery.js";
const {
  createChatDeliveryNoticeController,
  inviteModeEndpointRefreshAction,
  localizedSendAttemptMessage,
  localizedSendFailureMessage,
  outboundEntryMatchesCurrentDirection,
  resolveOutboundEntryForAction,
  sendAttemptFailureText,
  sendFailureNeedsEndpointRefresh,
  sendFailureNeedsNetworkRetry,
  sendFailureNeedsRouteSetup,
  sendFailureNeedsStartReceiving,
  sendRuntimeOwnerMismatch
} = chatDelivery;

(() => {
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
})();

(() => {
const t = (key) => key;

test("send failure helpers classify route, receive, endpoint, and network retries", () => {
  assert.equal(sendRuntimeOwnerMismatch({ owner_profile_bound: true, owner_matches_send_profile: false }), true);
  assert.equal(sendAttemptFailureText({ next_blocker: "a", warning: "b", blockers: ["c"] }), "a b c");
  assert.equal(sendFailureNeedsRouteSetup("peer-endpoint-missing"), true);
  assert.equal(sendFailureNeedsStartReceiving("message listening stopped"), true);
  assert.equal(sendFailureNeedsEndpointRefresh("stale endpoint"), true);
  assert.equal(sendFailureNeedsNetworkRetry("persistentclientnotready"), true);
});

test("localized send messages prefer the most specific failure", () => {
  assert.equal(
    localizedSendFailureMessage({
      error: "message listening stopped",
      t,
      sendFailureNeedsStartReceiving,
      sendFailureNeedsRouteSetup,
      sendFailureNeedsEndpointRefresh,
      sendFailureNeedsNetworkRetry,
    }),
    "externalSendNeedsReceive",
  );
  assert.equal(
    localizedSendAttemptMessage({
      result: { send_attempt_succeeded: true },
      t,
      sendAttemptFailureText,
      sendRuntimeOwnerMismatch,
      sendFailureNeedsStartReceiving,
      sendFailureNeedsRouteSetup,
      sendFailureNeedsNetworkRetry,
      localizedSendFailureMessage,
      sendFailureNeedsEndpointRefresh,
    }),
    "chatNoticeExternalSendWritten",
  );
});
})();

(() => {

test("outboundEntryMatchesCurrentDirection only accepts the active sender and receiver", () => {
  assert.equal(
    outboundEntryMatchesCurrentDirection(
      { sender: "alice", receiver: "bob" },
      { profileA: "alice", profileB: "bob" },
    ),
    true,
  );
  assert.equal(
    outboundEntryMatchesCurrentDirection(
      { sender: "bob", receiver: "alice" },
      { profileA: "alice", profileB: "bob" },
    ),
    false,
  );
});

test("inviteModeEndpointRefreshAction selects route preparation before warning", () => {
  assert.deepEqual(
    inviteModeEndpointRefreshAction({
      peerEndpointState: { ready: false, stale: false },
      nextRouteAction: "create-local",
    }),
    { kind: "prepare-local-route" },
  );
  assert.deepEqual(
    inviteModeEndpointRefreshAction({
      peerEndpointState: { ready: false, stale: false },
      nextRouteAction: "apply-peer",
    }),
    { kind: "apply-peer-route" },
  );
});

test("inviteModeEndpointRefreshAction maps stale and missing peer route warnings distinctly", () => {
  assert.deepEqual(
    inviteModeEndpointRefreshAction({
      peerEndpointState: { ready: false, stale: true },
      nextRouteAction: "focus-peer",
    }),
    {
      kind: "warn-stale-route",
      state: "Peer address refresh needed",
      noticeKey: "chatNoticeRefreshAddress",
      tone: "warning",
      warningKey: "chatNoticeRefreshAddress",
    },
  );
  assert.deepEqual(
    inviteModeEndpointRefreshAction({
      peerEndpointState: { ready: false, stale: false },
      nextRouteAction: "focus-peer",
    }),
    {
      kind: "warn-missing-peer-route",
      state: "Peer delivery code needed",
      noticeKey: "peerPrivateRouteCodeMissing",
      tone: "muted",
      warningKey: "peerPrivateRouteCodeMissing",
    },
  );
});
})();

(() => {

test("resolveOutboundEntryForAction stops when room restore fails", async () => {
  const result = await resolveOutboundEntryForAction(
    { messageNumber: 7 },
    {
      restoreInviteRoomForConversationEntry: async () => false,
      currentTwoProfileRetryableOutboundEntry: () => ({ messageNumber: 7 }),
      showCurrentRetryableOutboundMissing: () => {
        throw new Error("should not be called");
      },
    },
  );
  assert.deepEqual(result, { ok: false, reason: "room-restore-failed", entry: null });
});

test("resolveOutboundEntryForAction reports missing retryable entry after restore", async () => {
  let missing = null;
  const original = { messageNumber: 8 };
  const result = await resolveOutboundEntryForAction(original, {
    restoreInviteRoomForConversationEntry: async () => true,
    currentTwoProfileRetryableOutboundEntry: () => null,
    showCurrentRetryableOutboundMissing: (entry) => {
      missing = entry;
    },
  });
  assert.deepEqual(result, { ok: false, reason: "missing-current-entry", entry: null });
  assert.equal(missing, original);
});

test("resolveOutboundEntryForAction returns the refreshed entry when available", async () => {
  const currentEntry = { messageNumber: 9, message: "retry me" };
  const result = await resolveOutboundEntryForAction(
    { messageNumber: 9 },
    {
      restoreInviteRoomForConversationEntry: async () => true,
      currentTwoProfileRetryableOutboundEntry: () => currentEntry,
      showCurrentRetryableOutboundMissing: () => {
        throw new Error("should not be called");
      },
    },
  );
  assert.deepEqual(result, { ok: true, reason: "resolved", entry: currentEntry });
});
})();

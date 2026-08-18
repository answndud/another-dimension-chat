import assert from "node:assert/strict";
import { test } from "node:test";
import { renderDaemonReceivedInvite, renderDaemonSessionPanel } from "./daemon-view.js";

test("received invite shows the peer account, device, relay origin, and expiry before approval", () => {
  const staged = {
    state: "verified",
    safety_verified: false,
    safety_number: "1234-5678-9012-3456",
    account_id: "account-peer",
    device_id: "device-peer",
    expires_at: 1700000000,
    inbox_url: "http://127.0.0.1:1422/api/v1/inbox/" + "a".repeat(43),
  };
  const markup = renderDaemonReceivedInvite({
    daemonReceivedInvite: staged,
    daemonPairing: { ...staged, peer: { account_id: "account-peer", device_id: "device-peer", expires_at: 1700000000, relay_origin: "https://relay.example" } },
  });
  assert.match(markup, /상대 Account ID/);
  assert.match(markup, /account-peer/);
  assert.match(markup, /상대 Device ID/);
  assert.match(markup, /device-peer/);
  assert.match(markup, /전달 경로 origin/);
  assert.match(markup, /https:\/\/relay\.example/);
  assert.match(markup, /초대 만료/);
  assert.match(markup, /안전 번호는 상대 기기의 공개키 지문/);
});

test("received invite escapes peer values before HTML insertion", () => {
  const payload = '"><img src=x onerror=alert(1)>';
  const markup = renderDaemonReceivedInvite({
    daemonReceivedInvite: { account_id: payload, device_id: payload, expires_at: 1 },
    daemonPairing: { peer: { relay_origin: payload } },
  });
  assert.doesNotMatch(markup, /<img\b/);
  assert.match(markup, /&lt;img/);
});

test("safety number change after establishment blocks sending and offers re-verification", () => {
  const markup = renderDaemonSessionPanel({
    daemonBridge: {},
    daemonLocked: false,
    daemonPairing: { state: "established", safety_verified: false, safety_number: "9988-7766-5544-3322" },
    daemonContacts: [],
    daemonSelectedContact: "",
    daemonConversationId: "",
    daemonPeerInboxUrl: "",
    daemonOutgoingMessages: [],
    daemonMessages: [],
    daemonDeliveryState: "",
    daemonDeliveryDigest: "",
    daemonAttachmentBlobId: "",
    daemonAttachmentState: "",
    daemonAttachmentProgress: 0,
    daemonMessagesHasMore: false,
    daemonInboxUrl: "",
    daemonDeviceEvents: [],
  });
  assert.match(markup, /안전 번호가 변경되었습니다/);
  assert.match(markup, /재검증 전까지 메시지 송신이 차단됩니다/);
  assert.match(markup, /daemon-verify-safety/);
  assert.match(markup, /daemon-safety-confirmation/);
});

test("device change events render as distinct system rows, not messages", () => {
  const markup = renderDaemonSessionPanel({
    daemonBridge: {},
    daemonLocked: false,
    daemonPairing: { state: "established", safety_verified: true },
    daemonContacts: [{ account_id: "account-1", alias: "Peer", conversation_id: "conversation-1", inbox_url: "http://127.0.0.1:1422/api/v1/inbox/" + "a".repeat(43), state: "active" }],
    daemonSelectedContact: "account-1",
    daemonConversationId: "conversation-1",
    daemonPeerInboxUrl: "",
    daemonOutgoingMessages: [],
    daemonMessages: [],
    daemonDeliveryState: "",
    daemonDeliveryDigest: "",
    daemonAttachmentBlobId: "",
    daemonAttachmentState: "",
    daemonAttachmentProgress: 0,
    daemonMessagesHasMore: false,
    daemonInboxUrl: "",
    daemonDeviceEvents: [{ kind: "revoked", device_id: "device-old", at: 1700000000 }],
  });
  assert.match(markup, /기기 변경 · 기기 폐기/);
  assert.match(markup, /daemon-system-row/);
  assert.match(markup, /device-old/);
});

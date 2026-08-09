import assert from "node:assert/strict";
import { test } from "node:test";
import { renderDaemonContacts, renderDaemonSessionPanel } from "./daemon-view.js";

test("daemon view escapes daemon-owned contact and message values before HTML insertion", () => {
  const payload = '"><img src=x onerror=alert(1)>';
  const contacts = renderDaemonContacts({
    daemonContactSearch: "",
    daemonSelectedContact: "account-1",
    daemonContacts: [{
      account_id: "account-1",
      alias: payload,
      unread_count: payload,
      state: "active",
      device_id: payload,
      conversation_id: "conversation-1",
      last_message_preview: payload,
    }],
    daemonConversationIds: ["conversation-1"],
  });
  assert.doesNotMatch(contacts, /<img\b/);
  assert.match(contacts, /&lt;img/);

  const messages = renderDaemonSessionPanel({
    daemonBridge: {},
    daemonLocked: false,
    daemonPairing: { state: "established", safety_verified: true },
    daemonContacts: [{
      account_id: "account-1",
      alias: "Reporter",
      conversation_id: "conversation-1",
      inbox_url: "http://127.0.0.1:1422/api/v1/inbox/" + "a".repeat(43),
      state: "active",
    }],
    daemonSelectedContact: "account-1",
    daemonConversationId: "conversation-1",
    daemonPeerInboxUrl: "",
    daemonOutgoingMessages: [],
    daemonMessages: [{ id: payload, text: payload, direction: "incoming", state: "decrypted", createdAt: 1 }],
    daemonDeliveryState: "",
    daemonDeliveryDigest: "",
    daemonAttachmentBlobId: "",
    daemonAttachmentState: "",
    daemonAttachmentProgress: 0,
    daemonMessagesHasMore: false,
    daemonInboxUrl: "",
  });
  assert.doesNotMatch(messages, /<img\b/);
  assert.match(messages, /&lt;img/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { connectDaemonBridge } from "./daemon-bridge.js";

function location(hash = "#ad_bootstrap=secret") {
  return { origin: "http://127.0.0.1:1420", pathname: "/", search: "", hash };
}

test("daemon bootstrap is removed before exchange and never sent in the URL", async () => {
  const calls = [];
  const history = { replaceState: (_state, _title, url) => { history.url = url; } };
  const bridge = await connectDaemonBridge({
    location: location(),
    history,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ csrf_token: "c".repeat(32) }) };
    },
  });
  assert.equal(history.url, "/");
  assert.equal(calls[0].url, "http://127.0.0.1:1420/local-session/exchange");
  assert.match(calls[0].options.body, /"token":"secret"/);
  assert.equal(bridge.origin, "http://127.0.0.1:1420");
});

test("mutating daemon requests use the session cookie and CSRF header", async () => {
  const calls = [];
  const bridge = await connectDaemonBridge({
    location: location(),
    history: { replaceState() {} },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ csrf_token: "d".repeat(32) }) };
    },
  });
  await bridge.request("/local-api/session/lock", { method: "POST" });
  const request = calls[1].options;
  assert.equal(request.credentials, "include");
  assert.equal(request.headers.get("x-ad-csrf"), "d".repeat(32));
  assert.equal(request.headers.get("x-ad-ui-version"), "web-v1");
});

test("expired daemon UI sessions renew once and retry the original request", async () => {
  const calls = [];
  const bridge = await connectDaemonBridge({
    location: location(),
    history: { replaceState() {} },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 2) return { ok: false, json: async () => ({ error: "session_invalid" }) };
      if (calls.length === 3) return { ok: true, json: async () => ({ csrf_token: "n".repeat(32) }) };
      return { ok: true, json: async () => ({ csrf_token: "d".repeat(32), renewed: true }) };
    },
  });
  await bridge.request("/local-api/session/lock", { method: "POST" });
  assert.equal(calls[1].url, "http://127.0.0.1:1420/local-api/session/lock");
  assert.equal(calls[2].url, "http://127.0.0.1:1420/local-session/renew");
  assert.equal(calls[3].url, "http://127.0.0.1:1420/local-api/session/lock");
  assert.equal(calls[3].options.headers.get("x-ad-csrf"), "n".repeat(32));
});

test("daemon session helpers use typed routes and never put message material in URLs", async () => {
  const calls = [];
  const bridge = await connectDaemonBridge({
    location: location(),
    history: { replaceState() {} },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ csrf_token: "e".repeat(32), ciphertext: "aa", plaintext: "6869", key_package: "bb", welcome: "cc" }) };
    },
  });
  await bridge.createConversation("room-1");
  await bridge.prepareConversation("room-1");
  await bridge.joinConversation("room-1", "cc");
  await bridge.addMember("room-1", "bb");
  await bridge.sendMessage("room-1", "hello");
  await bridge.receiveMessage("room-1", "aa");
  assert.deepEqual(calls.slice(1).map(({ url, options }) => [url, JSON.parse(options.body)]), [
    ["http://127.0.0.1:1420/local-api/session/create", { conversation_id: "room-1" }],
    ["http://127.0.0.1:1420/local-api/session/prepare", { conversation_id: "room-1" }],
    ["http://127.0.0.1:1420/local-api/session/join", { conversation_id: "room-1", welcome: "cc" }],
    ["http://127.0.0.1:1420/local-api/session/add-member", { conversation_id: "room-1", key_package: "bb" }],
    ["http://127.0.0.1:1420/local-api/session/send", { conversation_id: "room-1", plaintext: "hello" }],
    ["http://127.0.0.1:1420/local-api/session/receive", { conversation_id: "room-1", ciphertext: "aa" }],
  ]);
  assert.ok(calls.slice(1).every(({ url }) => !url.includes("hello") && !url.includes("aa")));
});

test("pairing approval is an authenticated daemon mutation", async () => {
  const calls = [];
  const bridge = await connectDaemonBridge({
    location: location(),
    history: { replaceState() {} },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ csrf_token: "f".repeat(32), state: "established" }) };
    },
  });
  await bridge.pairingStatus();
  await bridge.verifySafety("sha256-example");
  await bridge.unverifySafety();
  await bridge.approvePairing();
  await bridge.rejectPairing();
  assert.equal(calls[2].url, "http://127.0.0.1:1420/local-api/pairing/verify-safety");
  assert.deepEqual(JSON.parse(calls[2].options.body), { safety_number: "sha256-example" });
  assert.equal(calls[3].url, "http://127.0.0.1:1420/local-api/pairing/unverify-safety");
  assert.equal(calls[4].url, "http://127.0.0.1:1420/local-api/pairing/approve");
  assert.equal(calls[4].options.headers.get("x-ad-csrf"), "f".repeat(32));
  assert.equal(calls[5].url, "http://127.0.0.1:1420/local-api/pairing/reject");
});

test("delivery helpers keep relay material in authenticated daemon request bodies", async () => {
  const calls = [];
  const bridge = await connectDaemonBridge({
    location: location(),
    history: { replaceState() {} },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ csrf_token: "g".repeat(32), accepted: true, items: [], acknowledged: 1 }) };
    },
  });
  await bridge.postDelivery("http://127.0.0.1:1421/api/v1/inbox/capability", "aa", 600);
  await bridge.syncDelivery("conversation-1", "http://127.0.0.1:1421/api/v1/inbox/capability");
  await bridge.ackDelivery("http://127.0.0.1:1421/api/v1/inbox/capability", ["id-1"]);
  assert.deepEqual(calls.slice(1).map(({ url, options }) => [url, JSON.parse(options.body)]), [
    ["http://127.0.0.1:1420/local-api/delivery/post", { inbox_url: "http://127.0.0.1:1421/api/v1/inbox/capability", ciphertext: "aa", expires_at: 600 }],
    ["http://127.0.0.1:1420/local-api/delivery/sync", { conversation_id: "conversation-1", inbox_url: "http://127.0.0.1:1421/api/v1/inbox/capability" }],
    ["http://127.0.0.1:1420/local-api/delivery/ack", { inbox_url: "http://127.0.0.1:1421/api/v1/inbox/capability", ids: ["id-1"] }],
  ]);
});

test("ordinary prototype pages do not create a daemon session", async () => {
  let called = false;
  assert.equal(await connectDaemonBridge({ location: location(""), fetchImpl: () => { called = true; } }), null);
  assert.equal(called, false);
});

test("invite rendezvous stays behind authenticated daemon routes", async () => {
  const calls = [];
  const bridge = await connectDaemonBridge({
    location: location(),
    history: { replaceState() {} },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ csrf_token: "i".repeat(32) }) };
    },
  });
  await bridge.createInvite();
  await bridge.consumeInvite("https://relay.example", "CODE");
  await bridge.revokeInvite("CODE");
  assert.deepEqual(calls.slice(1).map(({ url, options }) => [url, JSON.parse(options.body || "{}")]), [
    ["http://127.0.0.1:1420/local-api/invites", {}],
    ["http://127.0.0.1:1420/local-api/invites/consume", { relay_origin: "https://relay.example", invite_code: "CODE" }],
    ["http://127.0.0.1:1420/local-api/invites/revoke", { invite_code: "CODE" }],
  ]);
});

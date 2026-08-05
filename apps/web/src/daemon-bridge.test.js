import test from "node:test";
import assert from "node:assert/strict";
import { connectDaemonBridge, consumeRelayInvite, createRelayInviteCode } from "./daemon-bridge.js";

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
  await bridge.approvePairing();
  await bridge.rejectPairing();
  assert.equal(calls[2].url, "http://127.0.0.1:1420/local-api/pairing/verify-safety");
  assert.deepEqual(JSON.parse(calls[2].options.body), { safety_number: "sha256-example" });
  assert.equal(calls[3].url, "http://127.0.0.1:1420/local-api/pairing/approve");
  assert.equal(calls[3].options.headers.get("x-ad-csrf"), "f".repeat(32));
  assert.equal(calls[4].url, "http://127.0.0.1:1420/local-api/pairing/reject");
});

test("ordinary prototype pages do not create a daemon session", async () => {
  let called = false;
  assert.equal(await connectDaemonBridge({ location: location(""), fetchImpl: () => { called = true; } }), null);
  assert.equal(called, false);
});

test("relay invite consumption rejects remote HTTP and returns only relay payload", async () => {
  await assert.rejects(() => consumeRelayInvite("http://relay.example", "CODE"), /HTTPS/);
  const result = await consumeRelayInvite("http://127.0.0.1:37421", "CODE", {
    fetchImpl: async (url, options) => {
      assert.equal(url, "http://127.0.0.1:37421/api/v1/invite-codes/consume");
      assert.equal(options.method, "POST");
      return { ok: true, json: async () => ({ consumed: true, invite: "ADWEB3.signed", inviteDigest: "digest", receipt: "ADRECEIPT1.keyid.http://127.0.0.1:37421.hash.digest.1" }) };
    },
  });
  assert.deepEqual(result, { consumed: true, invite: "ADWEB3.signed", inviteDigest: "digest", receipt: "ADRECEIPT1.keyid.http://127.0.0.1:37421.hash.digest.1" });
});

test("relay invite creation accepts HTTPS only and returns a short code without exposing a receipt", async () => {
  await assert.rejects(() => createRelayInviteCode("http://relay.example", "ADDAINV1.x.y"), /HTTPS/);
  const result = await createRelayInviteCode("http://127.0.0.1:37421", "ADDAINV1.x.y", {
    fetchImpl: async (url, options) => {
      assert.equal(url, "http://127.0.0.1:37421/api/v1/invite-codes/public");
      assert.equal(options.method, "POST");
      return { ok: true, json: async () => ({ created: true, code: "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-23", expiresAt: 1, inviteDigest: "digest" }) };
    },
  });
  assert.equal(result.code, "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-23");
  assert.equal(result.receipt, undefined);
});

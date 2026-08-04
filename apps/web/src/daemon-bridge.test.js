import test from "node:test";
import assert from "node:assert/strict";
import { connectDaemonBridge, consumeRelayInvite } from "./daemon-bridge.js";

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

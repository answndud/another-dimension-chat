import test from "node:test";
import assert from "node:assert/strict";

import {
  inviteModeEndpointRefreshAction,
  outboundEntryMatchesCurrentDirection,
} from "./chat-outbound-action-state.js";

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

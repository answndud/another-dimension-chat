import assert from "node:assert/strict";
import test from "node:test";
import { createProductionBusyActionState } from "./production-busy-action-state.js";

function createHarness() {
  let action = null;
  const realOnionInputs = new Set();
  const state = createProductionBusyActionState({
    getAction: () => action,
    setAction: (value) => {
      action = value;
    },
    fingerprintForInput: (input) => `${input.profileA}|${input.profileB}|${input.passphrase}`,
    realOnionRoundtripActiveForInput: (input) =>
      realOnionInputs.has(`${input.profileA}|${input.profileB}|${input.passphrase}`),
  });
  return {
    state,
    realOnionInputs,
    get action() {
      return action;
    },
    set action(value) {
      action = value;
    },
  };
}

const roomA = { profileA: "alice", profileB: "bob", passphrase: "room-a" };
const roomB = { profileA: "alice", profileB: "bob", passphrase: "room-b" };

test("invite-room busy action only clears the matching room fingerprint", () => {
  const harness = createHarness();

  harness.state.setInviteRoomOpenBusy(roomA);

  assert.equal(harness.action, "invite-room-open");
  assert.equal(harness.state.inviteRoomOpenBusyMatches(roomA), true);
  assert.equal(harness.state.inviteRoomOpenBusyMatches(roomB), false);
  assert.equal(harness.state.blocksInput(roomA), true);
  assert.equal(harness.state.blocksInput(roomB), false);

  harness.state.clearInviteRoomOpenBusy(roomB);
  assert.equal(harness.action, "invite-room-open");

  harness.state.clearInviteRoomOpenBusy(roomA);
  assert.equal(harness.action, null);
});

test("two-profile action helpers keep message roundtrip scoped to the active input", () => {
  const harness = createHarness();

  harness.state.setTwoProfileMessageRoundtripBusy(roomA);

  assert.equal(harness.state.isForInput("two-profile-message-roundtrip", roomA), true);
  assert.equal(harness.state.isForInput("two-profile-message-roundtrip", roomB), false);

  harness.state.clearTwoProfileMessageRoundtripBusy(roomB);
  assert.equal(harness.action, "two-profile-message-roundtrip");

  harness.state.clearTwoProfileMessageRoundtripBusy(roomA);
  assert.equal(harness.action, null);
});

test("onion envelope send key includes room fingerprint and normalized message number", () => {
  const harness = createHarness();

  assert.equal(harness.state.twoProfileOnionEnvelopeSendKey(roomA, "7"), "alice|bob|room-a\n7");
  assert.equal(harness.state.twoProfileOnionEnvelopeSendKey(roomA, "not-a-number"), "alice|bob|room-a\n0");

  harness.state.setTwoProfileOnionEnvelopeSendBusy(roomA, "7");
  assert.equal(harness.action, "two-profile-onion-envelope-send");
  assert.equal(harness.state.twoProfileOnionEnvelopeSendBusyMatches(roomA), true);
  assert.equal(harness.state.twoProfileOnionEnvelopeSendBusyMatches(roomB), false);

  harness.state.clearTwoProfileOnionEnvelopeSendBusy(roomA, "8");
  assert.equal(harness.action, "two-profile-onion-envelope-send");

  harness.state.clearTwoProfileOnionEnvelopeSendBusy(roomA, "7");
  assert.equal(harness.action, null);
});

test("unknown direct actions remain globally blocking while real-onion stays input scoped", () => {
  const harness = createHarness();

  harness.action = "profile-unlock";
  assert.equal(harness.state.matchesInput(roomB), true);
  assert.equal(harness.state.blocksInput(roomB), true);

  harness.action = "two-profile-real-onion-roundtrip";
  harness.realOnionInputs.add("alice|bob|room-a");

  assert.equal(harness.state.matchesInput(roomA), true);
  assert.equal(harness.state.matchesInput(roomB), false);
  assert.equal(harness.state.blocksInput(roomA), true);
  assert.equal(harness.state.blocksInput(roomB), false);
});

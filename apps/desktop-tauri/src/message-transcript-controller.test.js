import assert from "node:assert/strict";
import test from "node:test";
import { createMessageTranscriptController } from "./message-transcript-controller.js";

test("loadProductionMessageTranscript keeps profile-gated transcript loading and redacted failures", async () => {
  const calls = {
    state: [],
    text: [],
    busy: [],
    apply: 0,
    invoke: [],
  };
  const fields = {
    productionMessageWarning: {},
    productionMessageBoundary: {},
    productionMessageTranscriptExport: { value: "" },
    loadProductionMessageTranscript: { disabled: false },
  };
  const controller = createMessageTranscriptController({
    productionProfileInput: () => ({ profile: "alice", passphrase: "room" }),
    setProductionMessageState: (value) => calls.state.push(value),
    setText: (field, value) => calls.text.push({ field, value }),
    fields,
    setProductionBusyAction: (value) => calls.busy.push(["set", value]),
    clearProductionBusyAction: (value) => calls.busy.push(["clear", value]),
    applyProductionActionState: () => {
      calls.apply += 1;
    },
    redactedUiErrorMessage: (scope) => `redacted:${scope}`,
    invoke: async (command, payload) => {
      calls.invoke.push({ command, payload });
      return { transcript_tsv: "tsv", warning: "ok" };
    },
    productionProfileInputStillCurrent: () => true,
    renderProductionTranscriptEntries: (profile, entries) => {
      calls.render = { profile, entries };
    },
    transcriptRetentionWarning: () => "retained",
    transcriptBoundarySummary: () => "boundary",
  });

  await controller.loadProductionMessageTranscript();

  assert.deepEqual(calls.invoke[0], {
    command: "production_message_transcript_export",
    payload: { profile: "alice", passphrase: "room" },
  });
  assert.deepEqual(calls.render, { profile: "alice", entries: undefined });
  assert.equal(fields.productionMessageTranscriptExport.value, "tsv");
  assert.deepEqual(calls.busy, [["set", "transcript-load"], ["clear", "transcript-load"]]);
  assert.equal(calls.apply, 2);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  transcriptLoadUiState,
  transcriptLoadWarnings,
} from "./chat-transcript-load-state.js";

test("transcriptLoadWarnings builds resumed, loaded, and auto-resume variants", () => {
  const warnings = transcriptLoadWarnings({
    expiredMessagesPurged: 2,
    staleMessageEnvelopeSlotsPruned: 1,
    appendExpiredMessagesPurged: (text, count) => `${text} [expired:${count}]`,
    appendStaleMessageEnvelopeSlotsPruned: (text, count) => `${text} [stale:${count}]`,
  });
  assert.deepEqual(warnings, {
    resumeWarning: "Local stored conversation and message-ready sessions loaded after local unlock. [expired:2] [stale:1]",
    loadedWarning: "Stored conversation loaded, but sessions are not ready for stored-message send. [expired:2] [stale:1]",
    autoResumeBaseWarning:
      "Local stored conversation and message-ready sessions loaded after local unlock. Compare the verification phrase before messaging. [stale:1] [expired:2]",
  });
});

test("transcriptLoadUiState returns resumed foreground behavior", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: false,
      sessionStatus: { both_ready_for_message_envelope: true },
      resumeTarget: "reply",
      resumeWarningText: "resume",
      loadedWarning: "loaded",
    }),
    {
      ready: true,
      state: "Conversation resumed",
      shouldStartRefresh: true,
      shouldStopRefresh: false,
      shouldRenderMemory: true,
      shouldAutoSelectPending: false,
      warning: "resume",
      flowKey: "conversation-loaded",
    },
  );
});

test("transcriptLoadUiState returns non-ready foreground behavior", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: false,
      sessionStatus: { both_ready_for_message_envelope: false },
      resumeTarget: null,
      resumeWarningText: "resume",
      loadedWarning: "loaded",
    }),
    {
      ready: false,
      state: "Conversation loaded",
      shouldStartRefresh: false,
      shouldStopRefresh: true,
      shouldRenderMemory: false,
      shouldAutoSelectPending: true,
      warning: "loaded",
      flowKey: "session-check",
    },
  );
});

test("transcriptLoadUiState returns auto-resume review behavior when sessions are not ready", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: true,
      autoResume: true,
      sessionStatus: { both_ready_for_message_envelope: false },
      autoResumeWarningText: "auto-resume",
    }),
    {
      ready: false,
      state: "Resume needs session check",
      shouldStartRefresh: false,
      shouldStopRefresh: true,
      shouldRenderMemory: false,
      shouldAutoSelectPending: false,
      warning:
        "Stored conversation was found, but message-ready sessions were not confirmed. Check sessions or run full setup.",
      flowKey: null,
    },
  );
});

test("transcriptLoadUiState returns auto-resume ready behavior without forcing pending review rendering", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: true,
      autoResume: true,
      sessionStatus: { both_ready_for_message_envelope: true },
      resumeTarget: "pending-review",
      autoResumeWarningText: "auto-ready",
    }),
    {
      ready: true,
      state: "Conversation resumed",
      shouldStartRefresh: true,
      shouldStopRefresh: false,
      shouldRenderMemory: false,
      shouldAutoSelectPending: false,
      warning: "auto-ready",
      flowKey: null,
    },
  );
});

test("transcriptLoadUiState returns inert quiet behavior when auto-resume is off", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: true,
      autoResume: false,
      sessionStatus: { both_ready_for_message_envelope: true },
      resumeTarget: "reply",
      autoResumeWarningText: "ignored",
    }),
    {
      ready: true,
      state: "",
      shouldStartRefresh: false,
      shouldStopRefresh: false,
      shouldRenderMemory: false,
      shouldAutoSelectPending: false,
      warning: "",
      flowKey: null,
    },
  );
});

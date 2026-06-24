import test from "node:test";
import assert from "node:assert/strict";

import {
  manualExportConversationSyncView,
  manualImportConversationReloadResult,
} from "./chat-transcript-sync-state.js";

test("manual import reload result keeps the conversation reload summary when reply is not auto-selected", () => {
  assert.deepEqual(
    manualImportConversationReloadResult({
      importedProfile: "Alice",
      replySelected: false,
    }),
    {
      conversationReloaded: true,
      replySelected: false,
      warning: "Manual import for alice completed; conversation transcript was reloaded from encrypted local stores.",
    },
  );
});

test("manual import reload result suppresses the warning when reply selection already took over", () => {
  assert.deepEqual(
    manualImportConversationReloadResult({
      importedProfile: "bob",
      replySelected: true,
    }),
    {
      conversationReloaded: true,
      replySelected: true,
      warning: "",
    },
  );
});

test("manual export sync view promotes peer import when the sent row is still awaiting receipt", () => {
  const view = manualExportConversationSyncView({
    refreshedEntry: {
      receiver: "bob",
      statuses: new Set(["sent"]),
    },
    exportedNumber: 7,
    envelope: "ciphertext",
    importStep: "Import envelope",
    loadStep: "Load envelope",
    relayTargetSelected: true,
  });
  assert.deepEqual(view, {
    conversationUpdated: true,
    peerImportReady: true,
    preloadRemoteEnvelope: true,
    clearLocalEnvelope: true,
    messageState: "Manual import ready",
    messageWarning: "Export envelope complete for message #7. Next: Import envelope into bob.",
    conversationWarning: "Export envelope complete. Next: Import envelope into bob.",
  });
});

test("manual export sync view falls back to device-to-device instructions when peer import is not primed", () => {
  const view = manualExportConversationSyncView({
    refreshedEntry: {
      receiver: "bob",
      statuses: new Set(["sent", "received"]),
    },
    exportedNumber: 8,
    envelope: "",
    importStep: "Import envelope",
    loadStep: "Load envelope",
    relayTargetSelected: false,
  });
  assert.deepEqual(view, {
    conversationUpdated: true,
    peerImportReady: false,
    preloadRemoteEnvelope: false,
    clearLocalEnvelope: false,
    messageState: "",
    messageWarning: "",
    conversationWarning: "Export envelope complete for message #8. Next: Load envelope on the receiving device, then Import envelope.",
  });
});

export function createMessageTranscriptController(input) {
  const {
    productionProfileInput,
    setProductionMessageState,
    setText,
    fields,
    setProductionBusyAction,
    clearProductionBusyAction,
    applyProductionActionState,
    redactedUiErrorMessage,
    invoke,
    productionProfileInputStillCurrent,
    renderProductionTranscriptEntries,
    transcriptRetentionWarning,
    transcriptBoundarySummary,
  } = input;

  async function loadProductionMessageTranscript() {
    const currentInput = productionProfileInput();
    const { profile, passphrase } = currentInput;
    if (!profile || !passphrase) {
      setProductionMessageState("Transcript load needs profile");
      setText(fields.productionMessageWarning, "Enter profile and passphrase before loading transcript.");
      return;
    }

    setProductionMessageState("Transcript loading");
    setText(fields.productionMessageWarning, "Reading stored transcript after local unlock.");
    setProductionBusyAction("transcript-load");
    applyProductionActionState();
    if (fields.loadProductionMessageTranscript) {
      fields.loadProductionMessageTranscript.disabled = true;
    }
    try {
      const result = await invoke("production_message_transcript_export", {
        profile,
        passphrase,
      });
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      renderProductionTranscriptEntries(profile, result.entries);
      if (fields.productionMessageTranscriptExport) {
        fields.productionMessageTranscriptExport.value = result.transcript_tsv ?? "";
      }
      setProductionMessageState("Transcript loaded");
      setText(fields.productionMessageWarning, transcriptRetentionWarning(result));
      setText(fields.productionMessageBoundary, transcriptBoundarySummary(result));
    } catch (error) {
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      setProductionMessageState("Transcript load failed");
      setText(fields.productionMessageWarning, redactedUiErrorMessage("transcript-load", error));
    } finally {
      clearProductionBusyAction("transcript-load");
      if (fields.loadProductionMessageTranscript) {
        fields.loadProductionMessageTranscript.disabled = false;
      }
      applyProductionActionState();
    }
  }

  return { loadProductionMessageTranscript };
}

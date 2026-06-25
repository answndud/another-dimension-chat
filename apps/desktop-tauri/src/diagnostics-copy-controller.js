export function createDiagnosticsCopyController(input) {
  const {
    fields,
    t,
    updateEngineSidecarDiagnostics,
    refreshFieldTestReport,
    refreshPublicBetaDiagnostics,
    renderRedactedSupportReport,
    fieldTestReportCopyPayload,
    writeClipboardWithTtl,
    setProductionTwoProfileState,
    setText,
    renderFieldTestReportComparison,
  } = input;

  function selectFieldTestReportCopyPayload(payload) {
    if (!fields.fieldTestReport) {
      return false;
    }
    fields.fieldTestReport.value = payload;
    fields.fieldTestReport.focus?.();
    fields.fieldTestReport.select?.();
    return true;
  }

  function selectPublicBetaDiagnosticsPayload(payload) {
    if (!fields.publicBetaDiagnostics) {
      return false;
    }
    fields.publicBetaDiagnostics.value = payload;
    fields.publicBetaDiagnostics.focus?.();
    fields.publicBetaDiagnostics.select?.();
    return true;
  }

  function selectRedactedSupportReportPayload(payload) {
    if (!fields.redactedSupportReport) {
      return false;
    }
    fields.redactedSupportReport.value = payload;
    fields.redactedSupportReport.focus?.();
    fields.redactedSupportReport.select?.();
    return true;
  }

  async function refreshFieldTestReportWithRuntimeDiagnostics() {
    await updateEngineSidecarDiagnostics();
    return refreshFieldTestReport();
  }

  async function refreshPublicBetaDiagnosticsWithRuntimeDiagnostics() {
    await updateEngineSidecarDiagnostics();
    return refreshPublicBetaDiagnostics();
  }

  async function copyPublicBetaDiagnostics() {
    await updateEngineSidecarDiagnostics();
    const payload = refreshPublicBetaDiagnostics();
    if (!payload) {
      return false;
    }
    try {
      await writeClipboardWithTtl(payload);
      setProductionTwoProfileState("Public diagnostics copied");
      setText(fields.productionTwoProfileWarning, t("publicBetaDiagnosticsCopied"));
      return true;
    } catch {
      selectPublicBetaDiagnosticsPayload(payload);
      setProductionTwoProfileState("Public diagnostics selected");
      setText(fields.productionTwoProfileWarning, t("publicBetaDiagnosticsCopyFallback"));
      return false;
    }
  }

  async function copyRedactedSupportReport() {
    const payload = fields.redactedSupportReport?.value || renderRedactedSupportReport().payload;
    if (!payload) {
      return false;
    }
    try {
      await writeClipboardWithTtl(payload);
      setProductionTwoProfileState("Redacted support report copied");
      setText(fields.productionTwoProfileWarning, t("redactedSupportReportCopied"));
      return true;
    } catch {
      selectRedactedSupportReportPayload(payload);
      setProductionTwoProfileState("Redacted support report selected");
      setText(fields.productionTwoProfileWarning, t("redactedSupportReportCopyFallback"));
      return false;
    }
  }

  async function copyFieldTestReport() {
    const report = refreshFieldTestReport();
    if (!report) {
      return false;
    }
    const payload = fieldTestReportCopyPayload(report);
    try {
      await writeClipboardWithTtl(payload);
      setProductionTwoProfileState("Field test report copied");
      setText(fields.productionTwoProfileWarning, t("fieldTestReportCopied"));
      return true;
    } catch {
      selectFieldTestReportCopyPayload(payload);
      setProductionTwoProfileState("Field test report selected");
      setText(fields.productionTwoProfileWarning, t("fieldTestReportCopyFallback"));
      return false;
    }
  }

  function bindDiagnosticsCopyControls() {
    if (fields.refreshFieldTestReport) {
      fields.refreshFieldTestReport.addEventListener("click", refreshFieldTestReportWithRuntimeDiagnostics);
    }
    if (fields.copyFieldTestReport) {
      fields.copyFieldTestReport.addEventListener("click", copyFieldTestReport);
    }
    if (fields.refreshPublicBetaDiagnostics) {
      fields.refreshPublicBetaDiagnostics.addEventListener("click", refreshPublicBetaDiagnosticsWithRuntimeDiagnostics);
    }
    if (fields.copyPublicBetaDiagnostics) {
      fields.copyPublicBetaDiagnostics.addEventListener("click", copyPublicBetaDiagnostics);
    }
    if (fields.copyRedactedSupportReport) {
      fields.copyRedactedSupportReport.addEventListener("click", copyRedactedSupportReport);
    }
    if (fields.peerFieldTestReport) {
      fields.peerFieldTestReport.addEventListener("input", renderFieldTestReportComparison);
    }
  }

  return {
    bindDiagnosticsCopyControls,
    copyFieldTestReport,
    copyPublicBetaDiagnostics,
    copyRedactedSupportReport,
    refreshFieldTestReportWithRuntimeDiagnostics,
    refreshPublicBetaDiagnosticsWithRuntimeDiagnostics,
  };
}

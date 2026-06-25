import assert from "node:assert/strict";
import test from "node:test";
import { createDiagnosticsCopyController } from "./diagnostics-copy-controller.js";

function createButton() {
  return {
    listeners: new Map(),
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
  };
}

function createField() {
  return {
    value: "",
    focused: false,
    selected: false,
    focus() {
      this.focused = true;
    },
    select() {
      this.selected = true;
    },
  };
}

test("copyFieldTestReport falls back to selecting the payload", async () => {
  const fields = {
    fieldTestReport: createField(),
    productionTwoProfileWarning: {},
  };
  let state = "";
  let warning = "";
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {},
    refreshFieldTestReport: () => "field-report",
    refreshPublicBetaDiagnostics: () => "",
    renderRedactedSupportReport: () => ({ payload: "" }),
    fieldTestReportCopyPayload: (report) => `${report}\ncopy-boundary`,
    writeClipboardWithTtl: async () => {
      throw new Error("clipboard denied");
    },
    setProductionTwoProfileState: (value) => {
      state = value;
    },
    setText: (_node, value) => {
      warning = value;
    },
    renderFieldTestReportComparison: () => {},
  });

  const copied = await controller.copyFieldTestReport();

  assert.equal(copied, false);
  assert.equal(fields.fieldTestReport.value, "field-report\ncopy-boundary");
  assert.equal(fields.fieldTestReport.focused, true);
  assert.equal(fields.fieldTestReport.selected, true);
  assert.equal(state, "Field test report selected");
  assert.equal(warning, "fieldTestReportCopyFallback");
});

test("copyPublicBetaDiagnostics refreshes runtime diagnostics before copying", async () => {
  const fields = {
    publicBetaDiagnostics: createField(),
    productionTwoProfileWarning: {},
  };
  const calls = [];
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {
      calls.push("updateEngineSidecarDiagnostics");
    },
    refreshFieldTestReport: () => "",
    refreshPublicBetaDiagnostics: () => {
      calls.push("refreshPublicBetaDiagnostics");
      return "public-diagnostics";
    },
    renderRedactedSupportReport: () => ({ payload: "" }),
    fieldTestReportCopyPayload: (report) => report,
    writeClipboardWithTtl: async (value) => {
      calls.push(`writeClipboardWithTtl:${value}`);
    },
    setProductionTwoProfileState: (value) => {
      calls.push(`state:${value}`);
    },
    setText: (_node, value) => {
      calls.push(`warning:${value}`);
    },
    renderFieldTestReportComparison: () => {},
  });

  const copied = await controller.copyPublicBetaDiagnostics();

  assert.equal(copied, true);
  assert.deepEqual(calls, [
    "updateEngineSidecarDiagnostics",
    "refreshPublicBetaDiagnostics",
    "writeClipboardWithTtl:public-diagnostics",
    "state:Public diagnostics copied",
    "warning:publicBetaDiagnosticsCopied",
  ]);
});

test("copyRedactedSupportReport renders a report when the field is empty", async () => {
  const fields = {
    redactedSupportReport: createField(),
    productionTwoProfileWarning: {},
  };
  let rendered = 0;
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {},
    refreshFieldTestReport: () => "",
    refreshPublicBetaDiagnostics: () => "",
    renderRedactedSupportReport: () => {
      rendered += 1;
      return { payload: "redacted-payload" };
    },
    fieldTestReportCopyPayload: (report) => report,
    writeClipboardWithTtl: async () => {},
    setProductionTwoProfileState: () => {},
    setText: () => {},
    renderFieldTestReportComparison: () => {},
  });

  const copied = await controller.copyRedactedSupportReport();

  assert.equal(copied, true);
  assert.equal(rendered, 1);
});

test("bindDiagnosticsCopyControls wires refresh, copy, and peer comparison handlers", () => {
  const fields = {
    refreshFieldTestReport: createButton(),
    copyFieldTestReport: createButton(),
    refreshPublicBetaDiagnostics: createButton(),
    copyPublicBetaDiagnostics: createButton(),
    copyRedactedSupportReport: createButton(),
    peerFieldTestReport: createButton(),
    productionTwoProfileWarning: {},
  };
  const renderFieldTestReportComparison = () => {};
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {},
    refreshFieldTestReport: () => "",
    refreshPublicBetaDiagnostics: () => "",
    renderRedactedSupportReport: () => ({ payload: "" }),
    fieldTestReportCopyPayload: (report) => report,
    writeClipboardWithTtl: async () => {},
    setProductionTwoProfileState: () => {},
    setText: () => {},
    renderFieldTestReportComparison,
  });

  controller.bindDiagnosticsCopyControls();

  assert.equal(fields.refreshFieldTestReport.listeners.get("click"), controller.refreshFieldTestReportWithRuntimeDiagnostics);
  assert.equal(fields.copyFieldTestReport.listeners.get("click"), controller.copyFieldTestReport);
  assert.equal(
    fields.refreshPublicBetaDiagnostics.listeners.get("click"),
    controller.refreshPublicBetaDiagnosticsWithRuntimeDiagnostics,
  );
  assert.equal(fields.copyPublicBetaDiagnostics.listeners.get("click"), controller.copyPublicBetaDiagnostics);
  assert.equal(fields.copyRedactedSupportReport.listeners.get("click"), controller.copyRedactedSupportReport);
  assert.equal(fields.peerFieldTestReport.listeners.get("input"), renderFieldTestReportComparison);
});

export function manualEnvelopeFailureClassForError(error, dependency = {}) {
  const text = String(error ?? "").toLowerCase();
  if (text.includes("replay")) {
    return "replay-rejected";
  }
  if (
    text.includes("malformed") ||
    text.includes("decode") ||
    text.includes("payload") ||
    text.includes("envelope")
  ) {
    return "malformed-envelope";
  }
  return typeof dependency.redactedUiErrorClass === "function"
    ? dependency.redactedUiErrorClass(error)
    : "unknown";
}

export function manualEnvelopePanelItems(view = {}) {
  return [
    ["current", view.current],
    ["export", view.export],
    ["import", view.import],
    ["reply", view.reply],
    ["recovery", view.recovery],
    ["failure", view.failure],
  ];
}

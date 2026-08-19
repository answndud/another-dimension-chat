export const DAEMON_SCREEN = Object.freeze({
  loading: "loading",
  unsupportedBrowser: "unsupported-browser",
  disconnected: "disconnected",
  setup: "setup",
  initializing: "initializing",
  corrupt: "corrupt",
  unsupportedEnvironment: "unsupported-environment",
  locked: "locked",
  recovery: "recovery",
  relay: "relay",
  ready: "ready",
  error: "error",
});

export const DAEMON_VIEWS = Object.freeze(["conversation", "devices", "security", "status"]);

export function daemonScreenForStatus(status, { browserSupported = true, connected = true } = {}) {
  if (!browserSupported) return DAEMON_SCREEN.unsupportedBrowser;
  if (!connected) return DAEMON_SCREEN.disconnected;
  switch (status) {
    case "not_initialized":
    case "setup-required":
      return DAEMON_SCREEN.setup;
    case "initializing":
      return DAEMON_SCREEN.initializing;
    case "corrupt":
      return DAEMON_SCREEN.corrupt;
    case "unsupported":
      return DAEMON_SCREEN.unsupportedEnvironment;
    case "locked":
      return DAEMON_SCREEN.locked;
    case "recovery_required":
      return DAEMON_SCREEN.recovery;
    case "relay_unconfigured":
      return DAEMON_SCREEN.relay;
    case "ready":
    case "daemon-session-active":
      return DAEMON_SCREEN.ready;
    default:
      return status ? DAEMON_SCREEN.error : DAEMON_SCREEN.loading;
  }
}
export function canNavigateToView(screen, view) {
  if (!DAEMON_VIEWS.includes(view)) return false;
  if (screen === DAEMON_SCREEN.recovery) return view === "security";
  return [DAEMON_SCREEN.ready, DAEMON_SCREEN.relay].includes(screen);
}

export function isSetupScreen(screen) {
  return [
    DAEMON_SCREEN.setup,
    DAEMON_SCREEN.initializing,
    DAEMON_SCREEN.corrupt,
    DAEMON_SCREEN.unsupportedEnvironment,
  ].includes(screen);
}

import {
  createProfile,
  unlockProfile,
  listProfiles,
  exportInvite,
  importInvite,
  safetyPhrase,
  exportEnvelope,
  sendEnvelope,
  importEnvelope,
  syncInbox,
  listMessages,
  lockProfile,
  getLocalServerInfo,
  confirmPendingEnvelopeDelivered,
  getPendingEnvelope,
  getSessionStatus,
  ready,
} from "./web-runtime.js";
import "./styles.css";

const app = document.querySelector("#app");
let state = { profile: null, peer: null, serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", messages: [], error: "", notice: "" };
let syncInFlight = false;

if (window.isSecureContext && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function endpointOrigin(info) {
  if (!info?.inboxUrl) return "";
  try { return new URL(info.inboxUrl).origin; } catch { return ""; }
}

function endpointWarning(info) {
  const origin = endpointOrigin(info);
  if (!origin || !origin.startsWith("http://") || /localhost|127\.0\.0\.1/.test(origin)) return "";
  return "Development HTTP endpoint: capability and network metadata are exposed on the LAN. Use HTTPS for production.";
}

function localServerStatus(info) {
  if (!info) return "Manual envelope mode";
  const transport = info.externalSecure ? "HTTPS endpoint advertised" : info.networkScope === "loopback" ? "loopback only" : "development HTTP";
  return `Local server connected · ${endpointOrigin(info)} · ${transport}`;
}

function browserStatus() {
  if (!window.isSecureContext || !window.crypto?.subtle) return "Browser security: use localhost or HTTPS to enable encryption.";
  return "Browser security: Web Crypto enabled.";
}

function render() {
  if (!state.profile) {
    app.innerHTML = `
      <section class="shell narrow">
        <div class="eyebrow">ANOTHER DIMENSION</div>
        <h1>A private room in your browser.</h1>
        <p class="lede">No account. No message server. Create a local profile, exchange a public invite, and move sealed messages through a channel you choose.</p>
        <div class="notice">${escapeHtml(browserStatus())}</div>
        <div class="card grid-two">
          <form id="create-form" class="stack">
            <h2>Create local profile</h2>
            <label>Profile name<input name="name" required pattern="[A-Za-z0-9_-]+" autocomplete="off" /></label>
            <label>Passphrase<input name="passphrase" required minlength="10" type="password" autocomplete="new-password" /></label>
            <button>Create profile</button>
          </form>
          <form id="unlock-form" class="stack">
            <h2>Unlock existing profile</h2>
            <label>Profile<select name="profile">${listProfiles().map((name) => `<option>${escapeHtml(name)}</option>`).join("") || "<option disabled>No local profiles</option>"}</select></label>
            <label>Passphrase<input name="passphrase" required type="password" autocomplete="current-password" /></label>
            <button class="secondary">Unlock</button>
          </form>
        </div>
        <p class="disclaimer">Experimental beta. Not audited, not production-ready, and not for sensitive communication.</p>
        ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
      </section>`;
    bindAuth();
    return;
  }

  const phrase = state.safety || "Pair with the other person to reveal safety material.";
  app.innerHTML = `
    <section class="shell">
      <header class="topbar"><div><div class="eyebrow">ANOTHER DIMENSION</div><h1>Local encrypted room</h1></div><button id="lock" class="ghost">Lock ${escapeHtml(state.profile.name)}</button></header>
      <div class="notice">${escapeHtml(state.notice || (state.serverInfo ? "Your local server is connected. Sealed envelopes can be delivered directly to a peer server." : "Manual mode: run this app from your local server for direct sealed-envelope delivery."))}</div>
      <div class="layout">
        <aside class="card stack">
          <div><span class="label">LOCAL PROFILE</span><strong>${escapeHtml(state.profile.name)}</strong><p class="small">${escapeHtml(localServerStatus(state.serverInfo))}</p></div>
          ${state.serverInfo && endpointWarning(state.serverInfo) ? `<p class="warning">${escapeHtml(endpointWarning(state.serverInfo))}</p>` : ""}
          <div class="divider"></div>
          <h2>1. Share your invite</h2>
          <p class="small">This code contains public setup material only. Send it through any channel.</p>
          <textarea id="invite" readonly rows="5">${escapeHtml(state.invite)}</textarea>
          <button id="copy-invite" class="secondary">Copy invite</button>
          <p class="small">Your invite includes a server capability when this page is served by it. Share the invite only with the intended peer.</p>
          <h2>2. Add peer invite</h2>
          <textarea id="peer-invite" rows="5" placeholder="Paste the other person's invite here">${escapeHtml(state.peerInvite)}</textarea>
          <button id="pair">Pair and verify</button>
        </aside>
        <section class="stack">
          <div class="card safety"><span class="label">SAFETY MATERIAL</span><strong>${escapeHtml(phrase)}</strong><p class="small">Compare this phrase with the other person over a trusted channel before sending messages.</p></div>
          <div class="card stack">
            <div class="row-between"><h2>Sealed message exchange</h2><span class="pill">${state.peer ? `${escapeHtml(state.sessionStatus)} · ${escapeHtml(endpointOrigin(state.peer.server)) || "manual"}` : "not paired"}</span></div>
            ${state.peer && endpointWarning(state.peer.server) ? `<p class="warning">${escapeHtml(endpointWarning(state.peer.server))}</p>` : ""}
            ${state.peer && state.sessionStatus !== "ready" ? '<p class="warning">Noise session is establishing. Keep both rooms open, or move the pending handshake envelope manually.</p>' : ""}
            ${state.pendingHandshake && state.sessionStatus === "ready" ? '<p class="warning">Deliver the final ready envelope to the peer, then confirm delivery before messaging.</p><button id="confirm-handshake" class="secondary">I delivered the handshake envelope</button>' : ""}
            <label>Message<textarea id="message" rows="4" placeholder="Write locally, then send or export a sealed envelope"></textarea></label>
            <div class="row-between"><button id="send-envelope" ${state.peer?.server?.inboxUrl && state.sessionStatus === "ready" && !state.pendingHandshake ? "" : "disabled"}>Encrypt and send to peer server</button><button id="sync-inbox" ${state.serverInfo?.inboxUrl ? "" : "disabled"} class="secondary">Sync my inbox</button></div>
            <button id="export-envelope" ${state.peer && state.sessionStatus === "ready" && !state.pendingHandshake ? "" : "disabled"}>Encrypt and export envelope</button>
            <label>Outgoing envelope<textarea id="envelope" rows="5" placeholder="Your sealed envelope appears here">${escapeHtml(state.envelope)}</textarea></label>
            <label>Incoming envelope<textarea id="incoming" rows="5" placeholder="Paste the peer's sealed envelope here"></textarea></label>
            <button id="import-envelope" ${state.peer ? "" : "disabled"} class="secondary">Import and decrypt</button>
            ${state.envelope ? '<p class="small">An outgoing envelope is ready for manual delivery if the peer server is unavailable.</p>' : ""}
          </div>
          <div class="card stack"><div class="row-between"><h2>Conversation</h2><span class="small">Encrypted local transcript</span></div>${renderMessages()}</div>
        </section>
      </div>
      <p class="disclaimer">Browser-local experimental beta. This app does not provide reliable network delivery, anonymity, backup recovery, or protection from compromised devices.</p>
    </section>`;
    bindRoom();
}

function renderMessages() {
  if (!state.messages.length) return '<p class="muted">No messages yet.</p>';
  return `<div class="transcript">${state.messages.map((message) => `<article class="message ${message.direction === "sent" ? "sent" : "received"}"><span>${message.direction === "sent" ? "You" : "Peer"}</span><p>${escapeHtml(message.text)}</p><time>${new Date(message.createdAt).toLocaleString()}</time></article>`).join("")}</div>`;
}

function bindAuth() {
  document.querySelector("#create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try { state = { ...state, profile: await createProfile(data.get("name"), data.get("passphrase")), error: "" }; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#unlock-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try { state = { ...state, profile: await unlockProfile(data.get("profile"), data.get("passphrase")), error: "" }; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
}

function bindRoom() {
  document.querySelector("#lock")?.addEventListener("click", () => { lockProfile(); state = { profile: null, peer: null, serverInfo: null, sessionStatus: "not-paired", pendingHandshake: "", safety: "", invite: "", peerInvite: "", envelope: "", messages: [], error: "", notice: "" }; render(); });
  document.querySelector("#peer-invite")?.addEventListener("input", (event) => { state.peerInvite = event.currentTarget.value; });
  document.querySelector("#copy-invite")?.addEventListener("click", async () => { await navigator.clipboard.writeText(state.invite); state.notice = "Invite copied. Share it with the other person."; render(); });
  document.querySelector("#pair")?.addEventListener("click", async () => {
    try { state.peer = await importInvite(state.peerInvite); state.safety = safetyPhrase(state.profile, state.peer); state.notice = "Invite verified. Noise session establishment started; compare the safety material now."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#export-envelope")?.addEventListener("click", async () => {
    try { state.envelope = await exportEnvelope(document.querySelector("#message").value); state.notice = "Envelope encrypted. Move it to the other browser, then paste it into Incoming envelope."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#send-envelope")?.addEventListener("click", async () => {
    try { state.envelope = await sendEnvelope(document.querySelector("#message").value); state.notice = "Envelope encrypted and delivered. The peer receives it automatically while their room is open."; await refresh(); } catch (error) { state.envelope = error.envelope || state.envelope; state.notice = error.envelope ? "Peer server unavailable. The prepared envelope is ready below for manual delivery." : "Delivery failed. Check the server and try again."; state.error = error.message; render(); }
  });
  document.querySelector("#sync-inbox")?.addEventListener("click", () => receiveMessages(true));
  document.querySelector("#confirm-handshake")?.addEventListener("click", async () => {
    try { await confirmPendingEnvelopeDelivered(); state.notice = "Manual Noise handshake delivery confirmed. Messaging is enabled."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
  document.querySelector("#import-envelope")?.addEventListener("click", async () => {
    try { const message = await importEnvelope(document.querySelector("#incoming").value); state.notice = message === null ? "Noise handshake advanced. Move any pending response envelope back to the peer." : "Envelope decrypted locally and added to the transcript."; await refresh(); } catch (error) { state.error = error.message; render(); }
  });
}

async function receiveMessages(manual = false) {
  if (syncInFlight || !state.profile || !state.peer || !state.serverInfo?.inboxUrl) return;
  syncInFlight = true;
  try {
    const previousStatus = getSessionStatus();
    const count = await syncInbox();
    const sessionChanged = previousStatus !== getSessionStatus();
    if (count || sessionChanged) {
      state.notice = count
        ? `${count} sealed envelope${count === 1 ? "" : "s"} received and acknowledged.`
        : `Noise session advanced to ${getSessionStatus()}.`;
      await refresh();
    } else if (manual) {
      state.notice = "Peer inbox is empty.";
      render();
    }
  } catch (error) {
    if (manual) {
      state.notice = "Inbox sync failed. Keep the server running and try Sync again.";
      state.error = error.message;
      render();
    }
  } finally {
    syncInFlight = false;
  }
}

async function refresh() {
  state.invite = await exportInvite();
  state.serverInfo = await getLocalServerInfo();
  state.peer = state.profile?.peer || state.peer;
  state.sessionStatus = getSessionStatus();
  state.safety = state.peer ? safetyPhrase(state.profile, state.peer) : "";
  const pendingHandshake = getPendingEnvelope();
  if (pendingHandshake) state.envelope = pendingHandshake;
  else if (state.pendingHandshake && state.envelope === state.pendingHandshake) state.envelope = "";
  state.pendingHandshake = pendingHandshake;
  state.messages = await listMessages();
  state.error = "";
  render();
}

window.setInterval(() => {
  if (!document.hidden) receiveMessages(false);
}, 5_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) receiveMessages(false);
});

ready.then(render).catch((error) => {
  state.error = error.message;
  render();
});

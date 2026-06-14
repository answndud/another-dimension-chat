import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  productionInviteRoomConversationMetadata,
  productionTwoProfileLatestRetryableOutbound,
} from "./action-state.js";

const here = dirname(fileURLToPath(import.meta.url));
const previewSource = readFileSync(join(here, "browser-preview-tauri.js"), "utf8");

function createPreviewRuntime(options = {}) {
  const source = previewSource.replaceAll("import.meta.env", "importMetaEnv");
  const storage = options.storage ?? new Map();
  const peer = options.peer === "peer-b" ? "peer-b" : "peer-a";
  const window = {
    __TAURI_INTERNALS__: {},
    location: {
      hostname: "127.0.0.1",
      search: `?peer=${peer}`,
      pathname: "/",
      hash: "",
    },
    history: {
      replaceState() {},
    },
    navigator: {},
    localStorage: {
      clear: () => storage.clear(),
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      removeItem: (key) => storage.delete(key),
      setItem: (key, value) => storage.set(key, String(value)),
    },
    setInterval() {
      return 1;
    },
    addEventListener() {},
  };
  const context = {
    Buffer,
    Date,
    Error,
    JSON,
    Math,
    Object,
    Promise,
    Set,
    String,
    URLSearchParams,
    btoa: (value) => Buffer.from(String(value), "binary").toString("base64"),
    console,
    document: {},
    encodeURIComponent,
    fetch: options.fetch ?? (async () => ({ ok: false })),
    importMetaEnv: { VITE_AD_PREVIEW_PEER: peer },
    unescape,
    window,
  };
  vm.runInNewContext(source, context, { filename: "browser-preview-tauri.js" });
  return window.__TAURI_INTERNALS__.invoke;
}

function createPreviewApiFetch() {
  const invites = new Map();
  const transcripts = new Map();
  return async (url, request = {}) => {
    const body = JSON.parse(request.body || "{}");
    if (url === "/__ad_preview/reset") {
      invites.clear();
      transcripts.clear();
      return { ok: true, json: async () => ({ ok: true }) };
    }
    if (url === "/__ad_preview/invite/get") {
      return { ok: true, json: async () => ({ ok: true, record: invites.get(body.token) ?? null }) };
    }
    if (url === "/__ad_preview/invite/put") {
      invites.set(body.token, body.record ?? null);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    if (url === "/__ad_preview/transcript/get") {
      return { ok: true, json: async () => ({ ok: true, entries: transcripts.get(body.profile) ?? [] }) };
    }
    if (url === "/__ad_preview/transcript/append") {
      const entries = transcripts.get(body.profile) ?? [];
      entries.push(body.entry);
      transcripts.set(body.profile, entries);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: false, json: async () => ({ ok: false }) };
  };
}

async function setupPreviewInviteRoom(invoke, sender, receiver, passphrase) {
  await invoke("production_invite_room_setup", {
    localProfile: sender,
    peerProfile: receiver,
    passphrase,
  });
  await invoke("production_invite_room_setup", {
    localProfile: receiver,
    peerProfile: sender,
    passphrase,
  });
}

function previewConversationEntriesFromTranscript(profile, counterpartProfile, entries = []) {
  return entries.map((entry) => {
    const sent = entry.direction !== "received";
    return {
      sender: sent ? profile : counterpartProfile,
      receiver: sent ? counterpartProfile : profile,
      kind: sent ? "sent" : "received",
      messageNumber: entry.message_number,
      message: entry.message,
      createdAtMs: entry.created_at_ms,
      ttlSeconds: entry.ttl_seconds,
      expiresAtMs: entry.expires_at_ms,
      expired: entry.expired === true,
      outboundDeliveryState: entry.outbound_delivery_state,
      outboundFailureKind: entry.outbound_failure_kind,
      outboundRetryable: entry.outbound_retryable === true,
      statuses: new Set([sent ? "sent" : "received"]),
    };
  });
}

function previewRoomMetadataFromTranscripts(localProfile, peerProfile, localEntries = [], peerEntries = []) {
  return productionInviteRoomConversationMetadata([
    ...previewConversationEntriesFromTranscript(localProfile, peerProfile, localEntries),
    ...previewConversationEntriesFromTranscript(peerProfile, localProfile, peerEntries),
  ]);
}

test("browser preview keeps invite codes open long enough for manual join", () => {
  assert.match(previewSource, /const invitePresenceTtlMs = 120_000;/);
});

test("browser preview supports passphrase-first product unlock mock", async () => {
  const invoke = createPreviewRuntime();
  const unlocked = await invoke("production_product_unlock", {
    profile: "alice",
    passphrase: "browser-preview-passphrase",
  });
  assert.equal(unlocked.profile, "alice");
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.passphrase_first, true);
  assert.equal(unlocked.store_path_returned, false);
  assert.equal(unlocked.passphrase_retained, false);
  assert.equal(unlocked.key_material_exposed, false);
  assert.equal(unlocked.network_io_attempted, false);

  const locked = await invoke("production_product_unlock_status");
  assert.equal(locked.unlocked, false);
  assert.equal(locked.passphrase_first, true);
  assert.equal(locked.raw_storage_error_exposed, false);
});

test("browser preview verifies peer A/B invite join, route exchange, and transcript delivery", async () => {
  const sharedPreviewApi = createPreviewApiFetch();
  const peerA = createPreviewRuntime({ storage: new Map(), peer: "peer-a", fetch: sharedPreviewApi });
  const peerB = createPreviewRuntime({ storage: new Map(), peer: "peer-b", fetch: sharedPreviewApi });
  const passphrase = "peer-ab-preview-code";
  const inviter = "inviter-peer-ab";
  const joiner = "joiner-peer-ab";

  const created = await peerA("production_invite_room_setup", {
    localProfile: inviter,
    peerProfile: joiner,
    passphrase,
  });
  assert.equal(created.both_ready_for_message_envelope, true);
  assert.equal(created.network_io_attempted, false);

  const joined = await peerB("production_invite_room_setup", {
    localProfile: joiner,
    peerProfile: inviter,
    passphrase,
  });
  assert.equal(joined.both_ready_for_message_envelope, true);
  assert.equal(joined.network_io_attempted, false);

  const beforeRoute = await peerA("production_invite_room_session_status", {
    localProfile: inviter,
    peerProfile: joiner,
    passphrase,
  });
  assert.equal(beforeRoute.profile_a_remote_endpoint_invite_placeholder, true);

  const draft = await peerA("production_message_envelope_export", {
    profile: inviter,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message: "peer ab route draft",
    messageTtlSeconds: 86400,
  });
  assert.equal(draft.selected_message_number, 1);

  const blocked = await peerA("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: inviter,
    passphrase,
    messageNumber: draft.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(blocked.send_attempt_succeeded, false);
  assert.equal(blocked.peer_endpoint_failure_recorded, true);
  assert.equal(blocked.next_blocker, "peer-endpoint-missing");

  await peerA("production_onion_persistent_client_start", { manualNetworkPermission: true });
  await peerB("production_onion_persistent_client_start", { manualNetworkPermission: true });
  const routeA = await peerA("production_onion_service_launch_attempt", {
    profile: inviter,
    passphrase,
    manualNetworkPermission: true,
  });
  const routeB = await peerB("production_onion_service_launch_attempt", {
    profile: joiner,
    passphrase,
    manualNetworkPermission: true,
  });
  assert.match(routeA.local_onion_endpoint, /inviter-peer-ab-delivery-preview\.onion/);
  assert.match(routeB.local_onion_endpoint, /joiner-peer-ab-delivery-preview\.onion/);

  const updateA = await peerA("production_pairing_session_remote_endpoint_update", {
    profile: inviter,
    passphrase,
    rendezvousEndpoint: routeB.local_onion_endpoint,
  });
  const updateB = await peerB("production_pairing_session_remote_endpoint_update", {
    profile: joiner,
    passphrase,
    rendezvousEndpoint: routeA.local_onion_endpoint,
  });
  assert.equal(updateA.remote_endpoint_state_written, true);
  assert.equal(updateB.remote_endpoint_state_written, true);

  const retried = await peerA("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: inviter,
    passphrase,
    messageNumber: draft.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(retried.send_attempt_succeeded, true);
  assert.equal(retried.envelope_payload_returned, false);
  assert.equal(retried.key_material_exposed, false);

  const reply = await peerB("production_message_envelope_export", {
    profile: joiner,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message: "peer ab reply",
    messageTtlSeconds: 86400,
  });
  const replySent = await peerB("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: joiner,
    passphrase,
    messageNumber: reply.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(replySent.send_attempt_succeeded, true);

  const inviterTranscript = await peerA("production_message_transcript_export", {
    profile: inviter,
    passphrase,
  });
  const joinerTranscript = await peerB("production_message_transcript_export", {
    profile: joiner,
    passphrase,
  });
  assert.equal(
    inviterTranscript.entries.some(
      (entry) =>
        entry.direction === "sent" &&
        entry.message === "peer ab route draft" &&
        entry.outbound_delivery_state === "sent",
    ),
    true,
  );
  assert.equal(
    inviterTranscript.entries.some((entry) => entry.direction === "received" && entry.message === "peer ab reply"),
    true,
  );
  assert.equal(
    joinerTranscript.entries.some(
      (entry) => entry.direction === "received" && entry.message === "peer ab route draft",
    ),
    true,
  );
  assert.equal(
    joinerTranscript.entries.some(
      (entry) =>
        entry.direction === "sent" &&
        entry.message === "peer ab reply" &&
        entry.outbound_delivery_state === "sent",
    ),
    true,
  );
});

test("browser preview route save retries the latest active-device outbound", async () => {
  const sharedPreviewApi = createPreviewApiFetch();
  const peerA = createPreviewRuntime({ storage: new Map(), peer: "peer-a", fetch: sharedPreviewApi });
  const peerB = createPreviewRuntime({ storage: new Map(), peer: "peer-b", fetch: sharedPreviewApi });
  const passphrase = "peer-ab-route-save-retry-code";
  const inviter = "inviter-route-save-retry";
  const joiner = "joiner-route-save-retry";

  await peerA("production_invite_room_setup", {
    localProfile: inviter,
    peerProfile: joiner,
    passphrase,
  });
  await peerB("production_invite_room_setup", {
    localProfile: joiner,
    peerProfile: inviter,
    passphrase,
  });

  const failedFromInviter = await peerA("production_message_envelope_export", {
    profile: inviter,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message: "retry this after route save",
    messageTtlSeconds: 86400,
  });
  await peerA("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: inviter,
    passphrase,
    messageNumber: failedFromInviter.selected_message_number,
    manualNetworkPermission: true,
  });

  const newerOppositeDirection = await peerB("production_message_envelope_export", {
    profile: joiner,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message: "do not retry from inviter device",
    messageTtlSeconds: 86400,
  });
  await peerB("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: joiner,
    passphrase,
    messageNumber: newerOppositeDirection.selected_message_number,
    manualNetworkPermission: true,
  });

  const joinerRoute = await peerB("production_onion_service_launch_attempt", {
    profile: joiner,
    passphrase,
    manualNetworkPermission: true,
  });
  await peerA("production_pairing_session_remote_endpoint_update", {
    profile: inviter,
    passphrase,
    rendezvousEndpoint: joinerRoute.local_onion_endpoint,
  });

  const inviterTranscriptBeforeRetry = await peerA("production_message_transcript_export", {
    profile: inviter,
    passphrase,
  });
  const joinerTranscriptBeforeRetry = await peerA("production_message_transcript_export", {
    profile: joiner,
    passphrase,
  });
  const retryCandidate = productionTwoProfileLatestRetryableOutbound(
    [
      ...previewConversationEntriesFromTranscript(inviter, joiner, inviterTranscriptBeforeRetry.entries),
      ...previewConversationEntriesFromTranscript(joiner, inviter, joinerTranscriptBeforeRetry.entries),
    ],
    { profileA: inviter, profileB: joiner },
  );
  assert.equal(retryCandidate?.message, "retry this after route save");
  assert.equal(retryCandidate?.messageNumber, failedFromInviter.selected_message_number);

  const retried = await peerA("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: inviter,
    passphrase,
    messageNumber: retryCandidate.messageNumber,
    manualNetworkPermission: true,
  });
  assert.equal(retried.send_attempt_succeeded, true);

  const inviterTranscriptAfterRetry = await peerA("production_message_transcript_export", {
    profile: inviter,
    passphrase,
  });
  const joinerTranscriptAfterRetry = await peerA("production_message_transcript_export", {
    profile: joiner,
    passphrase,
  });
  assert.equal(
    inviterTranscriptAfterRetry.entries.some(
      (entry) =>
        entry.direction === "sent" &&
        entry.message === "retry this after route save" &&
        entry.outbound_delivery_state === "sent",
    ),
    true,
  );
  assert.equal(
    joinerTranscriptAfterRetry.entries.some(
      (entry) => entry.direction === "received" && entry.message === "retry this after route save",
    ),
    true,
  );
  assert.equal(
    joinerTranscriptAfterRetry.entries.some(
      (entry) =>
        entry.direction === "sent" &&
        entry.message === "do not retry from inviter device" &&
        entry.outbound_delivery_state === "failed",
    ),
    true,
  );
});

test("browser preview supports invite route exchange and private delivery send", async () => {
  const invoke = createPreviewRuntime();
  const passphrase = "preview-code";
  const sender = "inviter-preview";
  const receiver = "joiner-preview";

  await setupPreviewInviteRoom(invoke, sender, receiver, passphrase);

  const beforeRoute = await invoke("production_invite_room_session_status", {
    localProfile: sender,
    peerProfile: receiver,
    passphrase,
  });
  assert.equal(beforeRoute.both_ready_for_message_envelope, true);
  assert.equal(beforeRoute.profile_a_remote_endpoint_invite_placeholder, true);

  const client = await invoke("production_onion_persistent_client_start", {
    manualNetworkPermission: true,
  });
  assert.equal(client.persistent_client_ready, true);

  const launch = await invoke("production_onion_service_launch_attempt", {
    profile: sender,
    passphrase,
    manualNetworkPermission: true,
  });
  assert.match(launch.local_onion_endpoint, /inviter-preview-delivery-preview\.onion/);

  const route = await invoke("production_pairing_session_remote_endpoint_update", {
    profile: sender,
    passphrase,
    rendezvousEndpoint: `${receiver}-delivery-preview.onion`,
  });
  assert.equal(route.remote_endpoint_state_written, true);

  const afterRoute = await invoke("production_invite_room_session_status", {
    localProfile: sender,
    peerProfile: receiver,
    passphrase,
  });
  assert.equal(afterRoute.profile_a_remote_endpoint_state_present, true);
  assert.equal(afterRoute.profile_a_remote_endpoint_invite_placeholder, false);

  const exported = await invoke("production_message_envelope_export", {
    profile: sender,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message: "hello over preview route",
    messageTtlSeconds: 86400,
  });
  assert.equal(exported.selected_message_number, 1);
  assert.match(exported.envelope_payload, /^ADENV1\|/);

  const sent = await invoke("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: sender,
    passphrase,
    messageNumber: exported.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(sent.send_attempt_succeeded, true);
  assert.equal(sent.envelope_payload_returned, false);
  assert.equal(sent.key_material_exposed, false);

  const senderTranscript = await invoke("production_message_transcript_export", {
    profile: sender,
    passphrase,
  });
  const receiverTranscript = await invoke("production_message_transcript_export", {
    profile: receiver,
    passphrase,
  });
  assert.equal(
    senderTranscript.entries.some(
      (entry) => entry.direction === "sent" && entry.outbound_delivery_state === "sent",
    ),
    true,
  );
  assert.equal(
    receiverTranscript.entries.some(
      (entry) => entry.direction === "received" && entry.message === "hello over preview route",
    ),
    true,
  );
});

test("browser preview retries a saved message after delivery code is applied", async () => {
  const invoke = createPreviewRuntime();
  const passphrase = "preview-retry-code";
  const sender = "inviter-retry";
  const receiver = "joiner-retry";

  await setupPreviewInviteRoom(invoke, sender, receiver, passphrase);

  const exported = await invoke("production_message_envelope_export", {
    profile: sender,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message: "retry after route",
    messageTtlSeconds: 86400,
  });
  assert.equal(exported.selected_message_number, 1);

  const blocked = await invoke("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: sender,
    passphrase,
    messageNumber: exported.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(blocked.send_attempt_succeeded, false);
  assert.equal(blocked.peer_endpoint_failure_recorded, true);
  assert.equal(blocked.next_blocker, "peer-endpoint-missing");

  const failedTranscript = await invoke("production_message_transcript_export", {
    profile: sender,
    passphrase,
  });
  assert.equal(
    failedTranscript.entries.some(
      (entry) =>
        entry.message_number === 1 &&
        entry.outbound_delivery_state === "failed" &&
        entry.outbound_retryable === true,
    ),
    true,
  );

  await invoke("production_pairing_session_remote_endpoint_update", {
    profile: sender,
    passphrase,
    rendezvousEndpoint: `${receiver}-delivery-preview.onion`,
  });

  const retried = await invoke("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: sender,
    passphrase,
    messageNumber: exported.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(retried.send_attempt_succeeded, true);
  assert.equal(retried.envelope_payload_returned, false);
  assert.equal(retried.key_material_exposed, false);

  const senderTranscript = await invoke("production_message_transcript_export", {
    profile: sender,
    passphrase,
  });
  const receiverTranscript = await invoke("production_message_transcript_export", {
    profile: receiver,
    passphrase,
  });
  assert.equal(
    senderTranscript.entries.some(
      (entry) =>
        entry.message_number === 1 &&
        entry.outbound_delivery_state === "sent" &&
        entry.outbound_retryable === false,
    ),
    true,
  );
  assert.equal(
    receiverTranscript.entries.some(
      (entry) => entry.direction === "received" && entry.message === "retry after route",
    ),
    true,
  );
});

test("browser preview keeps room transcript, retryable send, and receive state after reload", async () => {
  const storage = new Map();
  const sharedPreviewApi = createPreviewApiFetch();
  const passphrase = "preview-reload-code";
  const sender = "inviter-reload";
  const receiver = "joiner-reload";
  const beforeReload = createPreviewRuntime({ storage, peer: "peer-a", fetch: sharedPreviewApi });

  await setupPreviewInviteRoom(beforeReload, sender, receiver, passphrase);
  const exported = await beforeReload("production_message_envelope_export", {
    profile: sender,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message: "survives preview reload",
    messageTtlSeconds: 86400,
  });
  assert.equal(exported.selected_message_number, 1);

  const blocked = await beforeReload("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: sender,
    passphrase,
    messageNumber: exported.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(blocked.send_attempt_succeeded, false);
  assert.equal(blocked.next_blocker, "peer-endpoint-missing");

  await beforeReload("production_pairing_session_remote_endpoint_update", {
    profile: receiver,
    passphrase,
    rendezvousEndpoint: `${sender}-delivery-preview.onion`,
  });
  const receiveStarted = await beforeReload("production_onion_receive_loop_start", {
    profile: receiver,
    passphrase,
    manualNetworkPermission: true,
  });
  assert.equal(receiveStarted.enabled, true);
  assert.equal(receiveStarted.starts_network_on_app_launch, false);

  const afterReload = createPreviewRuntime({ storage, peer: "peer-a", fetch: sharedPreviewApi });
  const reloadedSenderTranscript = await afterReload("production_message_transcript_export", {
    profile: sender,
    passphrase,
  });
  const reloadedReceiverTranscript = await afterReload("production_message_transcript_export", {
    profile: receiver,
    passphrase,
  });
  const resumedRuntime = await afterReload("production_two_profile_runtime_resume_status", {
    localProfile: sender,
    peerProfile: receiver,
    passphrase,
  });
  assert.equal(resumedRuntime.runtime_resume_ready, true);
  assert.equal(resumedRuntime.retry_review_required, true);
  assert.equal(resumedRuntime.retryable_outbound_count, 1);
  assert.equal(resumedRuntime.latest_retryable_profile, sender);
  assert.equal(resumedRuntime.latest_retryable_message_number, 1);
  assert.equal(resumedRuntime.passphrase_retained, false);
  assert.equal(resumedRuntime.key_material_exposed, false);
  assert.equal(resumedRuntime.network_io_attempted, false);
  assert.equal(
    reloadedSenderTranscript.entries.some(
      (entry) =>
        entry.direction === "sent" &&
        entry.message === "survives preview reload" &&
        entry.message_number === 1 &&
        entry.outbound_delivery_state === "failed" &&
        entry.outbound_retryable === true,
    ),
    true,
  );
  const reloadedRoomMetadata = previewRoomMetadataFromTranscripts(
    sender,
    receiver,
    reloadedSenderTranscript.entries,
    reloadedReceiverTranscript.entries,
  );
  assert.equal(reloadedRoomMetadata.retryableOutboundCount > 0, true);
  assert.equal(reloadedRoomMetadata.retryableOutboundMessageNumber, 1);

  const reloadedReceiveStatus = await afterReload("production_onion_receive_loop_status");
  assert.equal(reloadedReceiveStatus.enabled, true);
  assert.equal(reloadedReceiveStatus.profile_selected, true);
  assert.equal(reloadedReceiveStatus.runtime_state, "receiving");
  assert.equal(reloadedReceiveStatus.starts_network_on_app_launch, false);
  assert.equal(reloadedReceiveStatus.passphrase_retained, false);

  await afterReload("production_pairing_session_remote_endpoint_update", {
    profile: sender,
    passphrase,
    rendezvousEndpoint: `${receiver}-delivery-preview.onion`,
  });
  const retried = await afterReload("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
    profile: sender,
    passphrase,
    messageNumber: exported.selected_message_number,
    manualNetworkPermission: true,
  });
  assert.equal(retried.send_attempt_succeeded, true);
  assert.equal(retried.envelope_payload_returned, false);
  assert.equal(retried.key_material_exposed, false);

  const finalSenderTranscript = await afterReload("production_message_transcript_export", {
    profile: sender,
    passphrase,
  });
  const finalReceiverTranscript = await afterReload("production_message_transcript_export", {
    profile: receiver,
    passphrase,
  });
  const finalRoomMetadata = previewRoomMetadataFromTranscripts(
    sender,
    receiver,
    finalSenderTranscript.entries,
    finalReceiverTranscript.entries,
  );
  assert.equal(finalRoomMetadata.retryableOutboundCount, 0);
  assert.equal(finalRoomMetadata.retryableOutboundMessageNumber, null);
  assert.equal(
    finalSenderTranscript.entries.some(
      (entry) =>
        entry.direction === "sent" &&
        entry.message_number === 1 &&
        entry.outbound_delivery_state === "sent" &&
        entry.outbound_retryable === false,
    ),
    true,
  );
  assert.equal(
    finalReceiverTranscript.entries.some(
      (entry) => entry.direction === "received" && entry.message === "survives preview reload",
    ),
    true,
  );
});

test("browser preview receive loop starts and stops after delivery code is applied", async () => {
  const invoke = createPreviewRuntime();
  const passphrase = "preview-receive-code";
  const receiver = "inviter-receive";
  const sender = "joiner-receive";

  await setupPreviewInviteRoom(invoke, receiver, sender, passphrase);
  await invoke("production_pairing_session_remote_endpoint_update", {
    profile: receiver,
    passphrase,
    rendezvousEndpoint: `${sender}-delivery-preview.onion`,
  });

  const status = await invoke("production_invite_room_session_status", {
    localProfile: receiver,
    peerProfile: sender,
    passphrase,
  });
  assert.equal(status.profile_a_remote_endpoint_invite_placeholder, false);

  const started = await invoke("production_onion_receive_loop_start", {
    profile: receiver,
    passphrase,
    manualNetworkPermission: true,
  });
  assert.equal(started.enabled, true);
  assert.equal(started.runtime_state, "receiving");
  assert.equal(started.starts_network_on_app_launch, false);
  assert.equal(started.passphrase_retained, false);
  assert.equal(started.key_material_exposed, false);

  const running = await invoke("production_onion_receive_loop_status");
  assert.equal(running.enabled, true);
  assert.equal(running.profile_selected, true);
  assert.equal(running.runtime_state, "receiving");

  const stopped = await invoke("production_onion_receive_loop_stop");
  assert.equal(stopped.enabled, false);
  assert.equal(stopped.stop_confirmed, true);

  const afterStop = await invoke("production_onion_receive_loop_status");
  assert.equal(afterStop.enabled, false);
  assert.equal(afterStop.runtime_state, "stopped");
});

const previewHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
const hasUsableTauriInvoke = typeof window.__TAURI_INTERNALS__?.invoke === "function";
const forcedBrowserPreviewPeer =
  import.meta.env?.VITE_AD_PREVIEW_PEER === "peer-a" || import.meta.env?.VITE_AD_PREVIEW_PEER === "peer-b";

if (previewHost && (forcedBrowserPreviewPeer || !hasUsableTauriInvoke)) {
  const params = new URLSearchParams(window.location.search);
  const envPeer = import.meta.env?.VITE_AD_PREVIEW_PEER;
  const peerParam = params.get("peer");
  const peerLabel =
    peerParam === "peer-a" || peerParam === "peer-b"
      ? peerParam
      : envPeer === "peer-a" || envPeer === "peer-b"
        ? envPeer
        : "";
  const storePrefix = "ad.browserPreview.";
  const previewClipboard = { text: "" };
  const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const activeInviteTokens = new Set();
  const invitePresenceTtlMs = 120_000;
  const fallbackStorage = new Map();
  const browserStorage = (() => {
    try {
      const storage = window.localStorage;
      const probe = `${storePrefix}probe`;
      storage.setItem(probe, "1");
      storage.removeItem(probe);
      return storage;
    } catch {
      return null;
    }
  })();
  const previewStorage = {
    clear: () => {
      if (browserStorage) {
        browserStorage.clear();
      }
      fallbackStorage.clear();
    },
    getItem: (key) => {
      if (browserStorage) {
        return browserStorage.getItem(key);
      }
      return fallbackStorage.has(key) ? fallbackStorage.get(key) : null;
    },
    setItem: (key, value) => {
      if (browserStorage) {
        browserStorage.setItem(key, value);
        return;
      }
      fallbackStorage.set(key, String(value));
    },
  };

  const resetPreviewRequested = params.get("reset-preview") === "1";

  if (resetPreviewRequested) {
    previewStorage.clear();
    params.delete("reset-preview");
    const nextQuery = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`,
    );
  }

  try {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        readText: async () => previewClipboard.text,
        writeText: async (value) => {
          previewClipboard.text = String(value ?? "");
        },
      },
    });
  } catch {
    // Browser preview can still run without clipboard support.
  }

  const storageKey = (name) => `${storePrefix}${name}`;
  const codeFor = (prefix, value) => `${prefix}|${btoa(unescape(encodeURIComponent(String(value)))).slice(0, 32)}`;
  const sessionReadyKey = (profile) => storageKey(`ready.${profile}`);
  const persistentClientReadyKey = storageKey("persistentClientReady");
  const localEndpointKey = (profile) => storageKey(`localEndpoint.${profile}`);
  const remoteEndpointReadyKey = (profile) => storageKey(`remoteEndpointReady.${profile}`);
  const remoteEndpointKey = (profile) => storageKey(`remoteEndpoint.${profile}`);
  const receiveLoopActiveKey = storageKey("receiveLoop.active");
  const receiveLoopProfileKey = storageKey("receiveLoop.profile");
  const transcriptKey = (profile) => storageKey(`transcript.${profile}`);
  const openInviteKey = (token) => storageKey(`openInvite.${encodeURIComponent(String(token ?? ""))}`);

  const previewApi = async (path, body = {}) => {
    try {
      const response = await fetch(`/__ad_preview/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch {
      return null;
    }
  };

  const previewResetReady = resetPreviewRequested ? previewApi("reset") : Promise.resolve(null);

  const openInviteRecord = async (token) => {
    await previewResetReady;
    const remote = await previewApi("invite/get", { token });
    if (remote?.ok) {
      return remote.record ?? null;
    }
    try {
      return JSON.parse(previewStorage.getItem(openInviteKey(token)) ?? "null");
    } catch {
      return null;
    }
  };

  const storeOpenInviteRecord = async (token, record) => {
    await previewResetReady;
    const remote = await previewApi("invite/put", { token, record });
    if (remote?.ok) {
      return;
    }
    previewStorage.setItem(openInviteKey(token), JSON.stringify(record));
  };

  const refreshOpenInvitePresence = async (token) => {
    const record = await openInviteRecord(token);
    if (!record || record.consumed || record.tabId !== tabId) {
      activeInviteTokens.delete(token);
      return;
    }
    await storeOpenInviteRecord(token, {
      ...record,
      lastSeenAtMs: Date.now(),
      expiresAtMs: Date.now() + invitePresenceTtlMs,
    });
  };

  const inviteIsOpen = (record) => {
    return Boolean(record && Number(record.expiresAtMs ?? 0) > Date.now());
  };

  window.setInterval(() => {
    for (const token of [...activeInviteTokens]) {
      refreshOpenInvitePresence(token);
    }
  }, 1000);

  window.addEventListener("pagehide", () => {
    for (const token of [...activeInviteTokens]) {
      openInviteRecord(token).then((record) => {
        if (record?.tabId === tabId && !record.consumed) {
          storeOpenInviteRecord(token, { ...record, expiresAtMs: Date.now() - 1 });
        }
      });
    }
  });

  const transcriptEntries = async (profile) => {
    await previewResetReady;
    const remote = await previewApi("transcript/get", { profile });
    if (remote?.ok) {
      return remote.entries ?? [];
    }
    try {
      return JSON.parse(previewStorage.getItem(transcriptKey(profile)) ?? "[]");
    } catch {
      return [];
    }
  };

  const storeTranscriptEntry = async (profile, entry) => {
    await previewResetReady;
    const remote = await previewApi("transcript/append", { profile, entry });
    if (remote?.ok) {
      return;
    }
    const entries = await transcriptEntries(profile);
    entries.push(entry);
    previewStorage.setItem(transcriptKey(profile), JSON.stringify(entries));
  };

  const peerProfileFor = (profile) => {
    const value = String(profile ?? "").trim();
    if (value.startsWith("inviter-")) {
      return value.replace(/^inviter-/, "joiner-");
    }
    if (value.startsWith("joiner-")) {
      return value.replace(/^joiner-/, "inviter-");
    }
    if (value === "alice") {
      return "bob";
    }
    if (value === "bob") {
      return "alice";
    }
    return "";
  };

  const nextMessageNumberFor = async (profile) => {
    const entries = await transcriptEntries(profile);
    return (
      (entries
        .filter((entry) => entry.direction === "sent")
        .map((entry) => Number.parseInt(entry.message_number, 10))
        .filter((number) => Number.isInteger(number) && number > 0)
        .sort((left, right) => right - left)[0] ?? 0) + 1
    );
  };

  const transcriptEntryFor = async (profile, messageNumber) => {
    const targetNumber = Number.parseInt(messageNumber, 10);
    const entries = await transcriptEntries(profile);
    return (
      [...entries]
        .reverse()
        .find(
          (entry) =>
            entry.direction === "sent" &&
            Number.parseInt(entry.message_number, 10) === targetNumber,
        ) ?? null
    );
  };

  const appendOutboundState = async (profile, messageNumber, state, failureKind = null, retryable = false) => {
    const base = await transcriptEntryFor(profile, messageNumber);
    if (!base) {
      return false;
    }
    await storeTranscriptEntry(profile, {
      ...base,
      outbound_delivery_state: state,
      outbound_failure_kind: failureKind,
      outbound_retryable: retryable,
    });
    return true;
  };

  const exportedTranscriptEntries = async (profile) => {
    const now = Date.now();
    const entries = await transcriptEntries(profile);
    const activeEntries = entries.filter(
      (entry) => !(Number(entry.expires_at_ms ?? 0) > 0 && Number(entry.expires_at_ms) <= now),
    );
    return {
      entries: activeEntries,
      expiredMessagesPurged: entries.length - activeEntries.length,
    };
  };

  const sessionState = (profile) => {
    const ready = previewStorage.getItem(sessionReadyKey(profile)) === "true";
    const remoteReady = previewStorage.getItem(remoteEndpointReadyKey(profile)) === "true";
    return {
      session_draft_present: ready,
      channel_id_derivable: ready,
      local_role_available: ready,
      remote_endpoint_state_present: ready,
      remote_endpoint_invite_placeholder: ready && !remoteReady,
      remote_endpoint_marked_stale: false,
      remote_endpoint_refresh_recommended: false,
      remote_endpoint_last_failed_message_number: null,
      replay_window_present: ready,
      session_transport_state_present: ready,
      runtime_material_reconstructable: ready,
      ready_for_message_envelope: ready,
      outbound_envelope_io_ready: ready,
      store_path_returned: false,
      passphrase_retained: false,
      key_material_exposed: false,
      network_io_attempted: false,
      transport_io_opened: false,
      runtime_messaging_enabled: false,
    };
  };

  const twoProfileStatus = ({ localProfile, peerProfile, profileA, profileB }) => {
    localProfile = localProfile ?? profileA;
    peerProfile = peerProfile ?? profileB;
    const local = sessionState(localProfile);
    const peer = sessionState(peerProfile);
    return {
      profile_a: localProfile,
      profile_b: peerProfile,
      profile_a_ready_for_message_envelope: local.ready_for_message_envelope,
      profile_b_ready_for_message_envelope: peer.ready_for_message_envelope,
      both_ready_for_message_envelope: local.ready_for_message_envelope && peer.ready_for_message_envelope,
      profile_a_remote_endpoint_state_present: local.remote_endpoint_state_present,
      profile_b_remote_endpoint_state_present: peer.remote_endpoint_state_present,
      profile_a_remote_endpoint_invite_placeholder: local.remote_endpoint_invite_placeholder,
      profile_b_remote_endpoint_invite_placeholder: peer.remote_endpoint_invite_placeholder,
      profile_a_remote_endpoint_marked_stale: false,
      profile_b_remote_endpoint_marked_stale: false,
      profile_a_remote_endpoint_refresh_recommended: false,
      profile_b_remote_endpoint_refresh_recommended: false,
      profile_a_remote_endpoint_last_failed_message_number: null,
      profile_b_remote_endpoint_last_failed_message_number: null,
      profile_a_session_transport_state_present: local.session_transport_state_present,
      profile_b_session_transport_state_present: peer.session_transport_state_present,
      profile_a_runtime_material_reconstructable: local.runtime_material_reconstructable,
      profile_b_runtime_material_reconstructable: peer.runtime_material_reconstructable,
      profile_a_outbound_envelope_io_ready: local.outbound_envelope_io_ready,
      profile_b_outbound_envelope_io_ready: peer.outbound_envelope_io_ready,
      store_path_returned: false,
      passphrase_retained: false,
      key_material_exposed: false,
      network_io_attempted: false,
      transport_io_opened: false,
      runtime_messaging_enabled: false,
    };
  };

  const prototypeStatus = () => ({
    secure_release: false,
    usable_messaging: false,
    core_status: "browser preview boundary only",
    profile_status: "browser preview boundary only",
    pairing_status: "browser preview boundary only",
    production_session_status: "browser preview mock only",
    production_self_test_status: "browser preview mock only",
    production_session_non_readiness: "browser preview does not verify production security",
    production_preflight_status: "browser preview mock",
    production_preflight_blockers: "browser_preview=true production_security=false",
    session_durable_state_status: "browser localStorage preview only",
    session_unlock_policy_status: "browser preview passphrase placeholder",
    session_unlock_non_readiness: "browser preview does not unlock product storage",
    session_unlock_cli_rejection_status: "browser preview no CLI",
    session_unlock_cli_rejection_flags: "storage_opened=false key_material_exposed=false runtime_messaging=false",
    transport_status: "browser preview no transport",
    network_execution_status: "network execution disabled in browser preview",
    experimental_transport_status: "browser preview mock only",
    bootstrap_status_classification: "network-disabled",
    transport_io_status: "transport_io=false runtime=false",
    storage_status: "browser localStorage preview only",
    verification_status: "browser UI preview only",
    local_dev_peer_label: peerLabel,
  });

  window.__TAURI_INTERNALS__ = {
    transformCallback: () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    invoke: async (cmd, args = {}) => {
      switch (cmd) {
        case "prototype_status":
          return prototypeStatus();
        case "production_message_retention_policy":
          return { default_ttl_seconds: 86400, allowed_ttl_seconds: [3600, 86400, 604800] };
        case "production_message_retention_preference_set":
          return { saved: true };
        case "production_message_retention_preference_get":
          return { ttl_seconds: 86400 };
        case "production_profile_list":
          return { profiles: [], profile_count: 0 };
        case "production_profile_unlock":
          return { profile: args.profile, unlocked: true };
        case "production_onion_backup_exclusion_prepare":
          return {
            backup_exclusion_verified: true,
            raw_path_returned: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        case "production_onion_key_record_prepare":
          return {
            key_material_ready: true,
            key_record_present: true,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        case "production_onion_persistent_client_status":
          return {
            persistent_client_ready: previewStorage.getItem(persistentClientReadyKey) === "true",
            manual_network_permission_enabled: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        case "production_onion_persistent_client_start": {
          const permitted = args.manualNetworkPermission === true;
          if (permitted) {
            previewStorage.setItem(persistentClientReadyKey, "true");
          }
          return {
            persistent_client_ready: permitted,
            manual_network_permission_enabled: permitted,
            next_blocker: permitted ? "none" : "manual-permission",
            raw_path_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_onion_service_launch_attempt": {
          const permitted = args.manualNetworkPermission === true;
          const profile = String(args.profile ?? "").trim();
          const endpoint = `${profile || "preview"}-delivery-preview.onion`;
          if (permitted && profile) {
            previewStorage.setItem(localEndpointKey(profile), endpoint);
          }
          return {
            warning: permitted
              ? "browser preview delivery code created; no network was opened"
              : "manual network permission required",
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: permitted,
            profile_transport_unlock_ready: Boolean(profile),
            backup_exclusion_verified: true,
            key_record_present: true,
            key_material_ready: true,
            persistent_client_ready: permitted,
            launch_preflight_ready: permitted,
            launch_adapter_ready: permitted,
            launch_attempt_started: false,
            launch_attempt_succeeded: permitted,
            onion_service_retained: permitted,
            inbound_rend_request_stream_retained: permitted,
            onion_endpoint_returned: permitted,
            local_onion_endpoint: permitted ? endpoint : "",
            event_summary: permitted ? ["browser-preview-route-code"] : ["manual-permission-required"],
            next_blocker: permitted ? "none" : "manual-permission",
            blockers: permitted ? [] : ["manual-permission"],
            raw_path_returned: false,
            onion_secret_returned: false,
            descriptor_body_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            descriptor_publish_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_pairing_payload_export":
          return { pairing_payload: codeFor("ADPAIRPREVIEW1", `${args.profile}|${args.rendezvousEndpoint}`) };
        case "production_pairing_safety_preview":
          return {
            safety_number: "00000 11111 22222 33333",
            safety_phrase: "browser preview phrase",
            warning: "Browser preview only. Not a security check.",
            safety_confirmed: false,
            payloads_decodable: true,
            safety_transcript_bound: true,
            payloads_returned: false,
            safety_transcript_returned: false,
            store_path_returned: false,
            passphrase_retained: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        case "production_pairing_session_draft_save":
          return {
            session_draft_present: true,
            session_draft_written: true,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        case "production_handshake_init_export":
          return { output_payload_created: true, output_payload: codeFor("ADNOISEXXINIT1", args.profile) };
        case "production_handshake_reply_export":
          return { output_payload_created: true, output_payload: codeFor("ADNOISEXXREPLY1", args.profile) };
        case "production_handshake_finish_export":
          previewStorage.setItem(sessionReadyKey(args.profile), "true");
          return { output_payload_created: true, output_payload: codeFor("ADNOISEXXFINISH1", args.profile) };
        case "production_handshake_finish_import":
          previewStorage.setItem(sessionReadyKey(args.profile), "true");
          return {
            transport_state_persisted: true,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        case "production_invite_room_setup":
        case "production_two_profile_room_setup": {
          const inviteToken = String(args.passphrase ?? "").trim();
          const localProfile = args.localProfile ?? args.profileA;
          const peerProfile = args.peerProfile ?? args.profileB;
          const role = String(localProfile ?? "").startsWith("inviter-") ? "inviter" : "joiner";
          if (cmd === "production_invite_room_setup" && role === "inviter" && inviteToken) {
            activeInviteTokens.add(inviteToken);
            await storeOpenInviteRecord(inviteToken, {
              inviterProfile: localProfile,
              peerProfile,
              tabId,
              createdAtMs: Date.now(),
              lastSeenAtMs: Date.now(),
              expiresAtMs: Date.now() + invitePresenceTtlMs,
              consumed: false,
            });
          }
          if (cmd === "production_invite_room_setup" && role === "joiner") {
            const record = await openInviteRecord(inviteToken);
            if (!inviteIsOpen(record)) {
              throw new Error("Invite code is not open. Ask the room creator to keep the app open and create a fresh code.");
            }
            await storeOpenInviteRecord(inviteToken, {
              ...record,
              consumed: false,
              joinedAtMs: Date.now(),
              lastSeenAtMs: Date.now(),
            });
          }
          previewStorage.setItem(sessionReadyKey(args.localProfile ?? args.profileA), "true");
          previewStorage.setItem(sessionReadyKey(args.peerProfile ?? args.profileB), "true");
          return {
            warning: "browser preview room setup only; no production security claim",
            profile_a: args.localProfile ?? args.profileA,
            profile_b: args.peerProfile ?? args.profileB,
            safety_number: "00000 11111 22222 33333",
            safety_phrase: "browser preview phrase",
            safety_confirmed: false,
            profile_a_unlocked: true,
            profile_b_unlocked: true,
            pairing_payloads_exported: true,
            session_drafts_saved: true,
            handshake_completed: true,
            profile_a_ready_for_message_envelope: true,
            profile_b_ready_for_message_envelope: true,
            both_ready_for_message_envelope: true,
            plaintext_returned_to_frontend: false,
            store_path_returned: false,
            passphrase_retained: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_invite_room_message_send": {
          const sender = args.localProfile;
          const receiver = args.peerProfile;
          const senderEntries = await transcriptEntries(sender);
          const lastSentNumber = senderEntries
            .filter((entry) => entry.direction === "sent")
            .map((entry) => Number.parseInt(entry.message_number, 10))
            .filter((number) => Number.isInteger(number) && number > 0)
            .sort((left, right) => right - left)[0] ?? 0;
          const messageNumber = lastSentNumber + 1;
          const ttlSeconds = Number(args.messageTtlSeconds || 86400);
          const createdAtMs = Date.now();
          const base = {
            message_number: messageNumber,
            message: String(args.message ?? ""),
            created_at_ms: createdAtMs,
            ttl_seconds: ttlSeconds,
            expires_at_ms: createdAtMs + ttlSeconds * 1000,
            expired: false,
            outbound_delivery_state: "sent",
            outbound_failure_kind: null,
            outbound_retryable: false,
          };
          await storeTranscriptEntry(sender, { ...base, direction: "sent" });
          await storeTranscriptEntry(receiver, { ...base, direction: "received" });
          return {
            warning: "browser preview message stored locally; no production security claim",
            sender_profile: sender,
            receiver_profile: receiver,
            message_number: messageNumber,
            message_ttl_seconds: ttlSeconds,
            sender_session_ready: true,
            receiver_session_ready: true,
            both_ready_for_message_envelope: true,
            message_number_reserved: true,
            encrypted_envelope_exported: true,
            inbound_message_stored: true,
            received_status_verified: true,
            received_export_matches_input: true,
            plaintext_returned_to_frontend: false,
            store_path_returned: false,
            passphrase_retained: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_pairing_session_remote_endpoint_update": {
          const profile = String(args.profile ?? "").trim();
          const endpoint = String(args.rendezvousEndpoint ?? "").trim();
          if (profile && endpoint) {
            previewStorage.setItem(remoteEndpointReadyKey(profile), "true");
            previewStorage.setItem(remoteEndpointKey(profile), endpoint);
          }
          return {
            warning: "browser preview peer delivery code saved",
            previous_remote_endpoint_present: false,
            remote_endpoint_changed: true,
            remote_endpoint_state_written: Boolean(profile && endpoint),
            update_channel_existing_encrypted_session: true,
            remote_endpoint_returned: false,
            store_path_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_message_envelope_export": {
          const sender = String(args.profile ?? "").trim();
          const receiver = peerProfileFor(sender);
          const messageNumber = await nextMessageNumberFor(sender);
          const ttlSeconds = Number(args.messageTtlSeconds || 86400);
          const createdAtMs = Date.now();
          const message = String(args.message ?? "");
          await storeTranscriptEntry(sender, {
            direction: "sent",
            counterpart_profile: receiver,
            message_number: messageNumber,
            message,
            created_at_ms: createdAtMs,
            ttl_seconds: ttlSeconds,
            expires_at_ms: createdAtMs + ttlSeconds * 1000,
            expired: false,
            outbound_delivery_state: "pending",
            outbound_failure_kind: null,
            outbound_retryable: true,
          });
          return {
            warning: "browser preview message saved for private delivery",
            selected_message_number: messageNumber,
            auto_message_number: true,
            message_ttl_seconds: ttlSeconds,
            auto_counter_written: true,
            existing_message_slot_skipped: false,
            expired_outbound_messages_purged: 0,
            message_number_reserved: true,
            pending_message_record_written: true,
            local_message_index_written: true,
            session_transport_ready: true,
            encrypted_envelope_written: true,
            encrypted_envelope_present: true,
            envelope_payload: codeFor("ADENV1", `${sender}|${receiver}|${messageNumber}|${message}`),
            plaintext_returned: false,
            key_material_exposed: false,
            network_send_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_onion_outbound_envelope_send_attempt":
        case "production_onion_outbound_envelope_send_stored_endpoint_attempt": {
          const sender = String(args.profile ?? "").trim();
          const receiver = peerProfileFor(sender);
          const messageNumber = Number.parseInt(args.messageNumber, 10);
          const permitted = args.manualNetworkPermission === true;
          const routeReady = previewStorage.getItem(remoteEndpointReadyKey(sender)) === "true";
          const base = await transcriptEntryFor(sender, messageNumber);
          const succeeded = Boolean(permitted && routeReady && base);
          if (succeeded) {
            await appendOutboundState(sender, messageNumber, "sent", null, false);
            await storeTranscriptEntry(receiver, {
              ...base,
              direction: "received",
              outbound_delivery_state: null,
              outbound_failure_kind: null,
              outbound_retryable: false,
            });
          } else if (base) {
            await appendOutboundState(
              sender,
              messageNumber,
              "failed",
              permitted ? "peer-endpoint-missing" : "ManualNetworkPermissionMissing",
              true,
            );
          }
          return {
            warning: succeeded
              ? "browser preview private delivery completed"
              : "browser preview private delivery blocked",
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: permitted,
            persistent_client_ready: permitted,
            send_intent_prepared: Boolean(base),
            send_attempt_started: succeeded,
            send_attempt_succeeded: succeeded,
            ack_wait_registered: false,
            redacted_send_result_event_recorded: true,
            event_summary: [succeeded ? "browser-preview-send" : "browser-preview-send-blocked"],
            next_blocker: succeeded ? "none" : permitted ? "peer-endpoint-missing" : "manual-permission",
            blockers: succeeded ? [] : [permitted ? "peer-endpoint-missing" : "manual-permission"],
            peer_endpoint_failure_recorded: !succeeded && permitted,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            peer_proof_returned: false,
            session_transcript_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            stream_accept_attempted: false,
            stream_dial_attempted: false,
            stream_read_write_attempted: false,
            stream_send_attempted: false,
            envelope_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_message_outbound_mark_send_failed": {
          await appendOutboundState(
            args.profile,
            args.messageNumber,
            "failed",
            args.failureKind ?? "peer offline",
            true,
          );
          return { failed_record_written: true };
        }
        case "production_message_outbound_cancel_pending": {
          await appendOutboundState(args.profile, args.messageNumber, "canceled", null, false);
          return { canceled_record_written: true };
        }
        case "production_onion_receive_loop_start": {
          const profile = String(args.profile ?? "").trim();
          const permitted = args.manualNetworkPermission === true;
          if (profile && permitted) {
            previewStorage.setItem(receiveLoopActiveKey, "true");
            previewStorage.setItem(receiveLoopProfileKey, profile);
          }
          return {
            enabled: Boolean(profile && permitted),
            worker_running: Boolean(profile && permitted),
            stop_requested: false,
            stop_confirmed: false,
            profile_selected: Boolean(profile),
            receive_attempt_in_flight: false,
            attempt_count: 0,
            generation: 1,
            worker_start_count: Boolean(profile && permitted) ? 1 : 0,
            duplicate_start_block_count: 0,
            import_sequence: 0,
            message_import_count: 0,
            endpoint_update_count: 0,
            active_after_import: true,
            continues_after_import: true,
            multi_message_receive_ready: true,
            restart_generation_isolated: true,
            retry_wait_cancellable: true,
            runtime_state: permitted ? "receiving" : "stopped",
            runtime_label: permitted ? "Listening for new messages" : "Network permission is off",
            last_attempt_started: false,
            last_attempt_succeeded: false,
            last_endpoint_update_applied: false,
            last_network_io_attempted: false,
            last_stream_accept_attempted: false,
            last_stream_read_write_attempted: false,
            last_envelope_io_opened: false,
            last_runtime_messaging_enabled: false,
            last_failure_kind: permitted ? "none" : "manual-permission",
            last_failure_retryable: !permitted,
            last_next_blocker: permitted ? "none" : "manual-permission",
            explicit_user_start_required: true,
            duplicate_loop_blocked: false,
            starts_network_on_app_launch: false,
            raw_profile_returned: false,
            passphrase_retained: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_onion_receive_loop_status": {
          const profile = previewStorage.getItem(receiveLoopProfileKey) ?? "";
          const enabled = previewStorage.getItem(receiveLoopActiveKey) === "true";
          return {
            enabled,
            worker_running: enabled,
            stop_requested: false,
            stop_confirmed: !enabled,
            profile_selected: Boolean(profile),
            receive_attempt_in_flight: false,
            attempt_count: enabled ? 1 : 0,
            generation: 1,
            worker_start_count: enabled ? 1 : 0,
            duplicate_start_block_count: 0,
            import_sequence: 0,
            message_import_count: 0,
            endpoint_update_count: 0,
            active_after_import: enabled,
            continues_after_import: enabled,
            multi_message_receive_ready: true,
            restart_generation_isolated: true,
            retry_wait_cancellable: true,
            runtime_state: enabled ? "receiving" : "stopped",
            runtime_label: enabled ? "Listening for new messages" : "Message listening stopped",
            last_attempt_started: false,
            last_attempt_succeeded: false,
            last_endpoint_update_applied: false,
            last_network_io_attempted: false,
            last_stream_accept_attempted: false,
            last_stream_read_write_attempted: false,
            last_envelope_io_opened: false,
            last_runtime_messaging_enabled: false,
            last_failure_kind: "none",
            last_failure_retryable: false,
            last_next_blocker: "none",
            explicit_user_start_required: true,
            duplicate_loop_blocked: false,
            starts_network_on_app_launch: false,
            raw_profile_returned: false,
            passphrase_retained: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        }
        case "production_onion_receive_loop_stop":
          previewStorage.setItem(receiveLoopActiveKey, "false");
          previewStorage.setItem(receiveLoopProfileKey, "");
          return {
            enabled: false,
            worker_running: false,
            stop_requested: true,
            stop_confirmed: true,
            profile_selected: false,
            receive_attempt_in_flight: false,
            attempt_count: 0,
            generation: 1,
            worker_start_count: 0,
            duplicate_start_block_count: 0,
            import_sequence: 0,
            message_import_count: 0,
            endpoint_update_count: 0,
            active_after_import: false,
            continues_after_import: false,
            multi_message_receive_ready: true,
            restart_generation_isolated: true,
            retry_wait_cancellable: true,
            runtime_state: "stopped",
            runtime_label: "Message listening stopped",
            last_attempt_started: false,
            last_attempt_succeeded: false,
            last_endpoint_update_applied: false,
            last_network_io_attempted: false,
            last_stream_accept_attempted: false,
            last_stream_read_write_attempted: false,
            last_envelope_io_opened: false,
            last_runtime_messaging_enabled: false,
            last_failure_kind: "none",
            last_failure_retryable: false,
            last_next_blocker: "none",
            explicit_user_start_required: true,
            duplicate_loop_blocked: false,
            starts_network_on_app_launch: false,
            raw_profile_returned: false,
            passphrase_retained: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
          };
        case "production_invite_room_presence_refresh": {
          const token = String(args.passphrase ?? "").trim();
          const record = await openInviteRecord(token);
          if (!record) {
            return { open: false, expires_at_ms: 0 };
          }
          const expiresAtMs = Date.now() + invitePresenceTtlMs;
          await storeOpenInviteRecord(token, {
            ...record,
            consumed: false,
            lastSeenAtMs: Date.now(),
            expiresAtMs,
          });
          return { open: true, expires_at_ms: expiresAtMs };
        }
        case "production_session_state_check":
          return sessionState(args.profile);
        case "production_invite_room_session_status":
        case "production_two_profile_session_status":
          return twoProfileStatus(args);
        case "production_message_transcript_export": {
          const transcript = await exportedTranscriptEntries(args.profile);
          return {
            entries: transcript.entries,
            expired_messages_purged: transcript.expiredMessagesPurged,
            stale_message_envelope_slots_pruned: 0,
          };
        }
        default:
          throw new Error(`Browser preview does not implement ${cmd}`);
      }
    },
  };
}

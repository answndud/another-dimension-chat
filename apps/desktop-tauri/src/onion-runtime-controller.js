export function createOnionRuntimeController(input) {
  const {
    productionProfileInput,
    productionProfileInputStillCurrent,
    productionTwoProfileInput,
    twoProfileTranscriptInputStillCurrent,
    manualNetworkPermissionEnabled,
    openPrivateDeliverySettings,
    setProductionTwoProfileState,
    setOnionLaunchPreflightState,
    setProductionPairingState,
    setText,
    t,
    localizedTwoProfileUserViewText,
    fields,
    invoke,
    applyProductionActionState,
    setProductionBusyAction,
    clearProductionBusyAction,
    productionPairingInput,
    productionPairingInputStillCurrent,
    latestTwoProfileSessionStatusForCurrentInput,
    twoProfileRoomIdentityInput,
    rememberTwoProfileOnionEndpoints,
    rememberTwoProfileSessionStatus,
    renderProductionTwoProfileSessionStatusResult,
    setTwoProfilePeerEndpointRefreshBusy,
    clearTwoProfilePeerEndpointRefreshBusy,
    refreshRouteReadinessNoticeAfterSessionRefresh,
    applyProductionPairingPayloadExportResult,
    applyProductionPairingSafetyPreviewResult,
    currentPairingSafetyVerified,
    productionSessionDraftView,
    setHandshakePayload,
    setProductionFollowupActions,
    localizedTwoProfileUserView,
  } = input;

  async function prepareProductionTwoProfileOnionKey() {
    const currentInput = productionTwoProfileInput();
    const { profileA, passphrase } = currentInput;
    if (!profileA || !passphrase) {
      setProductionTwoProfileState("Onion key needs profile");
      setText(fields.productionTwoProfileWarning, "Enter profile A and passphrase before preparing the onion key.");
      return;
    }

    setProductionBusyAction("two-profile-onion-key-prepare");
    setProductionTwoProfileState("Onion key prepare running");
    setText(fields.productionTwoProfileWarning, "Preparing local onion key record for profile A.");
    setText(fields.productionTwoProfileProfiles, `local_profile=${profileA}`);
    setText(fields.productionTwoProfileSession, "Preparing backup exclusion and encrypted onion key record");
    setText(fields.productionTwoProfileMessageState, "No network or message transport attempted");
    setText(fields.productionTwoProfileBoundary, "Local onion key preparation in progress");
    applyProductionActionState();
    if (fields.prepareProductionTwoProfileOnionKey) {
      fields.prepareProductionTwoProfileOnionKey.disabled = true;
    }

    try {
      const backup = await invoke("production_onion_backup_exclusion_prepare");
      const result = await invoke("production_onion_key_record_prepare", {
        profile: profileA,
        passphrase,
      });
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      const blockers = [...backup.blockers, ...result.blockers];
      setText(fields.onionPreflightWarning, result.warning);
      setText(
        fields.onionKeyRecordBoundary,
        `storage=${result.storage_opened} profile=${result.profile_marker_present} profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} lifecycle=${result.lifecycle_ready} written=${result.key_record_written} present=${result.key_record_present} material_ready=${result.key_material_ready} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
      );
      setProductionTwoProfileState(
        result.key_material_ready ? "Onion key ready" : "Onion key needs setup",
      );
      setText(fields.productionTwoProfileWarning, result.warning);
      setText(
        fields.productionTwoProfileProfiles,
        `profile_unlock=${result.profile_transport_unlock_ready} profile_marker=${result.profile_marker_present} storage=${result.storage_opened}`,
      );
      setText(
        fields.productionTwoProfileSession,
        `backup=${backup.backup_exclusion_verified} lifecycle=${result.lifecycle_ready} key_record=${result.key_record_present} key_material=${result.key_material_ready}`,
      );
      setText(fields.productionTwoProfileMessageState, "No network or message transport attempted");
      setText(
        fields.productionTwoProfileBoundary,
        `backup_dirs=${backup.state_cache_dirs_accessible} backup_written=${backup.backup_exclusion_written} backup_verified=${backup.backup_exclusion_verified} key_written=${result.key_record_written} blockers=${blockers.join("; ") || "none"} raw_path=${backup.raw_path_returned || result.raw_path_returned} onion_secret=${backup.onion_secret_returned || result.onion_secret_returned} key_material=${backup.key_material_exposed || result.key_material_exposed} network=${backup.network_io_attempted || result.network_io_attempted} transport=${backup.transport_io_opened || result.transport_io_opened} runtime=${backup.runtime_messaging_enabled || result.runtime_messaging_enabled}`,
      );
    } catch (error) {
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      setProductionTwoProfileState("Onion key prepare failed");
      setText(fields.productionTwoProfileWarning, `Onion key prepare failed without returning secrets. ${error}`);
      setText(fields.productionTwoProfileBoundary, "Failed before network, endpoint launch, or message transport.");
    } finally {
      clearProductionBusyAction("two-profile-onion-key-prepare");
      if (fields.prepareProductionTwoProfileOnionKey) {
        fields.prepareProductionTwoProfileOnionKey.disabled = false;
      }
      applyProductionActionState();
    }
  }

  async function checkOnionLaunchPreflight() {
    const currentInput = productionProfileInput();
    const { profile, passphrase } = currentInput;
    if (!profile || !passphrase) {
      setOnionLaunchPreflightState("Launch preflight needs profile");
      setText(fields.onionLaunchPreflightBoundary, "Enter profile and passphrase in the profile unlock panel first.");
      return;
    }

    setOnionLaunchPreflightState("Launch preflight running");
    setText(fields.onionLaunchPreflightBoundary, "Checking launch preflight guards without starting Tor or publishing a descriptor.");
    if (fields.checkOnionLaunchPreflight) {
      fields.checkOnionLaunchPreflight.disabled = true;
    }
    try {
      const result = await invoke("production_onion_launch_preflight_check", { profile, passphrase });
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      setOnionLaunchPreflightState(result.ready_for_onion_launch ? "Launch preflight ready" : "Launch preflight blocked");
      setText(fields.onionPreflightWarning, result.warning);
      setText(fields.onionLaunchPreflightBoundary, `profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} key_record=${result.key_record_present} key_material=${result.key_material_ready} persistent_client=${result.persistent_client_ready} publication_policy=${result.endpoint_publication_policy_ready} update_policy=${result.endpoint_update_policy_ready} redacted_events=${result.redacted_events_only} launch=${result.ready_for_onion_launch} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`);
    } catch (error) {
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      setOnionLaunchPreflightState("Launch preflight failed");
      setText(fields.onionLaunchPreflightBoundary, `Failed closed: ${error}`);
    } finally {
      if (fields.checkOnionLaunchPreflight) {
        fields.checkOnionLaunchPreflight.disabled = false;
      }
    }
  }

  async function attemptOnionServiceLaunch() {
    const currentInput = productionProfileInput();
    const { profile, passphrase } = currentInput;
    const manualNetworkPermission = manualNetworkPermissionEnabled();
    if (!profile || !passphrase) {
      setText(fields.onionServiceLaunchAttempt, "Enter profile and passphrase in the profile unlock panel first.");
      return;
    }

    setText(fields.onionServiceLaunchAttempt, "Attempting fail-closed onion launch boundary with explicit manual permission.");
    if (fields.attemptOnionServiceLaunch) {
      fields.attemptOnionServiceLaunch.disabled = true;
    }
    try {
      const result = await invoke("production_onion_service_launch_attempt", {
        profile,
        passphrase,
        manualNetworkPermission,
      });
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      setText(fields.onionPreflightWarning, result.warning);
      if (result.local_onion_endpoint && fields.productionPairingEndpoint) {
        fields.productionPairingEndpoint.value = result.local_onion_endpoint;
        fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
        setProductionPairingState("Local onion endpoint ready");
      }
      setText(fields.onionServiceLaunchAttempt, `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} key_record=${result.key_record_present} key_material=${result.key_material_ready} persistent_client=${result.persistent_client_ready} launch_preflight=${result.launch_preflight_ready} adapter=${result.launch_adapter_ready} started=${result.launch_attempt_started} succeeded=${result.launch_attempt_succeeded} retained=${result.onion_service_retained} rend_stream=${result.inbound_rend_request_stream_retained} endpoint_ready=${result.onion_endpoint_returned} event_recorded=${result.redacted_launch_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`);
    } catch (error) {
      if (!productionProfileInputStillCurrent(currentInput)) {
        return;
      }
      setText(fields.onionServiceLaunchAttempt, `Failed closed: ${error}`);
    } finally {
      if (fields.attemptOnionServiceLaunch) {
        fields.attemptOnionServiceLaunch.disabled = false;
      }
    }
  }

  async function launchProductionTwoProfileOnionEndpoint() {
    const currentInput = productionTwoProfileInput();
    const manualPairingInput = productionPairingInput();
    const { profileA, passphrase } = currentInput;
    const manualNetworkPermission = manualNetworkPermissionEnabled();
    if (!profileA || !passphrase) {
      setProductionTwoProfileState("Onion endpoint needs profile");
      setText(fields.productionTwoProfileWarning, "Enter profile A and passphrase before launching the local onion endpoint.");
      return;
    }
    if (!manualNetworkPermission) {
      setProductionTwoProfileState("Onion endpoint blocked");
      setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before launching an endpoint.");
      return;
    }

    setProductionBusyAction("two-profile-onion-endpoint-launch");
    setProductionTwoProfileState("Onion endpoint launch running");
    setText(fields.productionTwoProfileWarning, "Launching local onion endpoint for profile A.");
    setText(fields.productionTwoProfileProfiles, `local_profile=${profileA}`);
    setText(fields.productionTwoProfileSession, "Checking retained Tor client and onion key record");
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(fields.productionTwoProfileBoundary, "Endpoint launch in progress with manual network permission");
    applyProductionActionState();
    if (fields.launchProductionTwoProfileOnionEndpoint) {
      fields.launchProductionTwoProfileOnionEndpoint.disabled = true;
    }

    try {
      const result = await invoke("production_onion_service_launch_attempt", {
        profile: profileA,
        passphrase,
        manualNetworkPermission,
      });
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      let pairingPayloadExported = false;
      const manualPairingStillCurrent = productionPairingInputStillCurrent(manualPairingInput);
      if (result.local_onion_endpoint && fields.productionPairingEndpoint && manualPairingStillCurrent) {
        fields.productionPairingEndpoint.value = result.local_onion_endpoint;
        fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
        if (fields.productionProfileName) {
          fields.productionProfileName.value = profileA;
          fields.productionProfileName.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (fields.productionProfileSelector) {
          fields.productionProfileSelector.value = profileA;
        }
        try {
          const pairing = await invoke("production_pairing_payload_export", {
            profile: profileA,
            passphrase,
            rendezvousEndpoint: result.local_onion_endpoint,
          });
          if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
            return;
          }
          setText(fields.productionPairingWarning, "Pairing payload exported from local endpoint");
          if (pairing?.pairing_payload) {
            setText(fields.productionPairingSession, "Pairing payload export succeeded");
          }
          pairingPayloadExported = true;
        } catch (pairingError) {
          if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
            return;
          }
          setProductionPairingState("Local endpoint ready; pairing export failed");
          setText(fields.productionPairingWarning, `Endpoint launch succeeded, but pairing payload export failed without exposing secrets. ${pairingError}`);
        }
      }
      setProductionTwoProfileState(result.launch_attempt_succeeded && result.onion_endpoint_returned ? "Onion endpoint ready" : "Onion endpoint needs setup");
      setText(fields.productionTwoProfileWarning, result.warning);
      setText(fields.productionTwoProfileProfiles, `profile_unlock=${result.profile_transport_unlock_ready} key_record=${result.key_record_present} key_material=${result.key_material_ready}`);
      setText(fields.productionTwoProfileSession, `persistent_client=${result.persistent_client_ready} launch_preflight=${result.launch_preflight_ready} adapter=${result.launch_adapter_ready} retained=${result.onion_service_retained} pairing_payload=${pairingPayloadExported}`);
      setText(fields.productionTwoProfileMessageState, "No message transport attempted");
      setText(fields.productionTwoProfileBoundary, `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} started=${result.launch_attempt_started} succeeded=${result.launch_attempt_succeeded} endpoint_ready=${result.onion_endpoint_returned} event_recorded=${result.redacted_launch_result_event_recorded} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} events=${result.event_summary.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material=${result.key_material_exposed} network=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`);
    } catch (error) {
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      setProductionTwoProfileState("Onion endpoint launch failed");
      setText(fields.productionTwoProfileWarning, `Endpoint launch failed without returning secrets. ${error}`);
      setText(fields.productionTwoProfileBoundary, "Failed before descriptor publication or message transport.");
    } finally {
      clearProductionBusyAction("two-profile-onion-endpoint-launch");
      if (fields.launchProductionTwoProfileOnionEndpoint) {
        fields.launchProductionTwoProfileOnionEndpoint.disabled = false;
      }
      applyProductionActionState();
    }
  }

  async function refreshProductionTwoProfilePeerEndpoints(currentInput = productionTwoProfileInput(), options = {}) {
    const { profileA, profileB, passphrase } = currentInput;
    const roomInput = twoProfileRoomIdentityInput(currentInput);
    const manualNetworkPermission = manualNetworkPermissionEnabled();
    if (!profileA || !profileB || profileA === profileB || !passphrase) {
      setProductionTwoProfileState("Endpoint refresh needs profiles");
      setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsRoom"));
      return false;
    }
    if (!manualNetworkPermission) {
      setProductionTwoProfileState("Endpoint refresh blocked");
      setText(fields.productionTwoProfileWarning, t("privateDeliveryPermissionRequired"));
      return false;
    }
    if (!latestTwoProfileSessionStatusForCurrentInput(roomInput)) {
      setProductionTwoProfileState("Endpoint refresh needs session");
      setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsReadyRoom"));
      return false;
    }

    const launchEndpoint = async (profile) => {
      const launch = await invoke("production_onion_service_launch_attempt", {
        profile,
        passphrase,
        manualNetworkPermission,
      });
      if (!launch.local_onion_endpoint) {
        throw new Error(`${profile} endpoint unavailable: ${launch.next_blocker || "unknown blocker"}`);
      }
      return launch;
    };

    setTwoProfilePeerEndpointRefreshBusy(currentInput);
    setProductionTwoProfileState("Endpoint refresh running");
    setText(fields.productionTwoProfileWarning, t("refreshAddressRunning"));
    setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
    setText(fields.productionTwoProfileSession, "Existing encrypted session drafts are kept; only peer endpoint records are updated");
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(fields.productionTwoProfileBoundary, "Endpoint refresh in progress with manual network permission");
    applyProductionActionState();
    if (fields.refreshProductionTwoProfilePeerEndpoints) {
      fields.refreshProductionTwoProfilePeerEndpoints.disabled = true;
    }

    let refreshSucceeded = false;
    try {
      const profileALaunch = await launchEndpoint(profileA);
      const profileBLaunch = await launchEndpoint(profileB);
      const profileAUpdate = await invoke("production_pairing_session_remote_endpoint_update", {
        profile: profileA,
        passphrase,
        rendezvousEndpoint: profileBLaunch.local_onion_endpoint,
      });
      const profileBUpdate = await invoke("production_pairing_session_remote_endpoint_update", {
        profile: profileB,
        passphrase,
        rendezvousEndpoint: profileALaunch.local_onion_endpoint,
      });
      const status = await invoke("production_two_profile_session_status", {
        profileA,
        profileB,
        passphrase,
      });
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return false;
      }
      rememberTwoProfileOnionEndpoints(roomInput, {
        profileAEndpoint: profileALaunch.local_onion_endpoint,
        profileBEndpoint: profileBLaunch.local_onion_endpoint,
      });
      rememberTwoProfileSessionStatus(roomInput, status);
      renderProductionTwoProfileSessionStatusResult(status);
      setProductionTwoProfileState(
        status.both_ready_for_message_envelope ? "Peer endpoints refreshed" : "Peer endpoints refreshed; session needs review",
      );
      setText(fields.productionTwoProfileWarning, t("refreshAddressComplete"));
      setText(fields.productionTwoProfileProfiles, `a_endpoint=${profileALaunch.onion_endpoint_returned} b_endpoint=${profileBLaunch.onion_endpoint_returned}`);
      setText(fields.productionTwoProfileSession, `a_update=${profileAUpdate.remote_endpoint_state_written} b_update=${profileBUpdate.remote_endpoint_state_written} a_ready=${status.profile_a_ready_for_message_envelope} b_ready=${status.profile_b_ready_for_message_envelope}`);
      setText(fields.productionTwoProfileMessageState, "No message transport attempted");
      setText(fields.productionTwoProfileBoundary, `a_changed=${profileAUpdate.remote_endpoint_changed} b_changed=${profileBUpdate.remote_endpoint_changed} existing_session=${profileAUpdate.update_channel_existing_encrypted_session && profileBUpdate.update_channel_existing_encrypted_session} a_retained=${profileALaunch.onion_service_retained} b_retained=${profileBLaunch.onion_service_retained} raw_endpoint=${profileAUpdate.remote_endpoint_returned || profileBUpdate.remote_endpoint_returned} raw_path=${profileAUpdate.store_path_returned || profileBUpdate.store_path_returned || profileALaunch.raw_path_returned || profileBLaunch.raw_path_returned} onion_secret=${profileALaunch.onion_secret_returned || profileBLaunch.onion_secret_returned} key_material=${profileAUpdate.key_material_exposed || profileBUpdate.key_material_exposed || profileALaunch.key_material_exposed || profileBLaunch.key_material_exposed} network=${profileALaunch.network_io_attempted || profileBLaunch.network_io_attempted} transport=${profileAUpdate.transport_io_opened || profileBUpdate.transport_io_opened || profileALaunch.transport_io_opened || profileBLaunch.transport_io_opened} runtime=${profileAUpdate.runtime_messaging_enabled || profileBUpdate.runtime_messaging_enabled || profileALaunch.runtime_messaging_enabled || profileBLaunch.runtime_messaging_enabled}`);
      refreshSucceeded = true;
      return true;
    } catch (error) {
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return false;
      }
      setProductionTwoProfileState("Endpoint refresh failed");
      setText(fields.productionTwoProfileWarning, t("refreshAddressFailed"));
      setText(fields.productionTwoProfileBoundary, localizedTwoProfileUserViewText("Existing room state was kept."));
      return false;
    } finally {
      clearTwoProfilePeerEndpointRefreshBusy(currentInput);
      if (fields.refreshProductionTwoProfilePeerEndpoints) {
        fields.refreshProductionTwoProfilePeerEndpoints.disabled = false;
      }
      if (
        refreshSucceeded &&
        options.suppressRecoveryNoticeRefresh !== true &&
        twoProfileTranscriptInputStillCurrent(currentInput)
      ) {
        refreshRouteReadinessNoticeAfterSessionRefresh(currentInput, {
          allowRetryRecovery: options.allowRetryRecovery === true,
        });
      }
      applyProductionActionState();
    }
  }

  async function prepareProductionTwoProfileOnionPairing() {
    const currentInput = productionTwoProfileInput();
    const manualPairingInput = input.productionPairingInput();
    const { profileA, profileB, passphrase } = currentInput;
    const manualNetworkPermission = manualNetworkPermissionEnabled();
    if (!profileA || !profileB || profileA === profileB || !passphrase) {
      setProductionTwoProfileState("Onion pairing needs profiles");
      setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before preparing onion pairing.");
      return;
    }
    if (!manualNetworkPermission) {
      setProductionTwoProfileState("Onion pairing blocked");
      setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before preparing onion pairing.");
      return;
    }

    const launchAndExport = async (profile) => {
      const launch = await invoke("production_onion_service_launch_attempt", {
        profile,
        passphrase,
        manualNetworkPermission,
      });
      if (!launch.local_onion_endpoint) {
        throw new Error(`${profile} endpoint unavailable: ${launch.next_blocker || "unknown blocker"}`);
      }
      const pairing = await invoke("production_pairing_payload_export", {
        profile,
        passphrase,
        rendezvousEndpoint: launch.local_onion_endpoint,
      });
      return { launch, pairing };
    };

    setProductionBusyAction("two-profile-onion-pairing");
    setProductionTwoProfileState("Onion pairing running");
    setText(fields.productionTwoProfileWarning, "Launching Alice/Bob onion endpoints and preparing pairing payloads.");
    setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
    setText(fields.productionTwoProfileSession, "Waiting for endpoint launch, payload export, and safety preview");
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(fields.productionTwoProfileBoundary, "Onion pairing in progress with manual network permission");
    applyProductionActionState();
    if (fields.prepareProductionTwoProfileOnionPairing) {
      fields.prepareProductionTwoProfileOnionPairing.disabled = true;
    }

    try {
      const profileAResult = await launchAndExport(profileA);
      const profileBResult = await launchAndExport(profileB);
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      const manualPairingStillCurrent = input.productionPairingInputStillCurrent(manualPairingInput);
      if (manualPairingStillCurrent && fields.productionProfileName) {
        fields.productionProfileName.value = profileA;
        fields.productionProfileName.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (manualPairingStillCurrent && fields.productionProfileSelector) {
        fields.productionProfileSelector.value = profileA;
      }
      if (manualPairingStillCurrent && fields.productionPairingEndpoint) {
        fields.productionPairingEndpoint.value = profileAResult.launch.local_onion_endpoint;
        fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (manualPairingStillCurrent) {
        await applyProductionPairingPayloadExportResult(
          profileAResult.pairing,
          "Onion pairing payloads ready",
        );
      }
      if (manualPairingStillCurrent && fields.productionRemotePairingPayload) {
        fields.productionRemotePairingPayload.value = profileBResult.pairing.pairing_payload;
        fields.productionRemotePairingPayload.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const safety = await invoke("production_pairing_safety_preview", {
        localPayload: profileAResult.pairing.pairing_payload,
        remotePayload: profileBResult.pairing.pairing_payload,
      });
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      if (manualPairingStillCurrent) {
        applyProductionPairingSafetyPreviewResult(safety, {
          profile: profileA,
          passphrase,
          localPayload: profileAResult.pairing.pairing_payload,
          remotePayload: profileBResult.pairing.pairing_payload,
        });
      }
      setProductionTwoProfileState("Onion pairing safety ready");
      setText(fields.productionTwoProfileWarning, "Alice/Bob onion endpoints and pairing payloads are ready. Verify the safety number before saving a session draft.");
      setText(fields.productionTwoProfileProfiles, `a_endpoint=${profileAResult.launch.onion_endpoint_returned} b_endpoint=${profileBResult.launch.onion_endpoint_returned}`);
      setText(fields.productionTwoProfileSession, `a_payload=${profileAResult.pairing.pairing_payload_exported} b_payload=${profileBResult.pairing.pairing_payload_exported} safety=${safety.payloads_decodable}`);
      rememberTwoProfileOnionEndpoints(
        twoProfileRoomIdentityInput(currentInput),
        {
          profileAEndpoint: profileAResult.launch.local_onion_endpoint,
          profileBEndpoint: profileBResult.launch.local_onion_endpoint,
        },
      );
      setText(fields.productionTwoProfileMessageState, "No message transport attempted");
      setText(fields.productionTwoProfileBoundary, `a_launch=${profileAResult.launch.launch_attempt_succeeded} b_launch=${profileBResult.launch.launch_attempt_succeeded} a_retained=${profileAResult.launch.onion_service_retained} b_retained=${profileBResult.launch.onion_service_retained} a_events=${profileAResult.launch.event_summary.join("; ") || "none"} b_events=${profileBResult.launch.event_summary.join("; ") || "none"} payloads_returned=false safety_transcript_returned=${safety.safety_transcript_returned} raw_path=${profileAResult.launch.raw_path_returned || profileBResult.launch.raw_path_returned} onion_secret=${profileAResult.launch.onion_secret_returned || profileBResult.launch.onion_secret_returned} descriptor_body=${profileAResult.launch.descriptor_body_returned || profileBResult.launch.descriptor_body_returned} key_material=${profileAResult.launch.key_material_exposed || profileBResult.launch.key_material_exposed || profileAResult.pairing.key_material_exposed || profileBResult.pairing.key_material_exposed || safety.key_material_exposed} network=${profileAResult.launch.network_io_attempted || profileBResult.launch.network_io_attempted} transport=${profileAResult.launch.transport_io_opened || profileBResult.launch.transport_io_opened || profileAResult.pairing.transport_io_opened || profileBResult.pairing.transport_io_opened || safety.transport_io_opened} runtime=${profileAResult.launch.runtime_messaging_enabled || profileBResult.launch.runtime_messaging_enabled || profileAResult.pairing.runtime_messaging_enabled || profileBResult.pairing.runtime_messaging_enabled || safety.runtime_messaging_enabled}`);
    } catch (error) {
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      setProductionTwoProfileState("Onion pairing failed");
      setText(fields.productionTwoProfileWarning, `Onion pairing failed without returning secrets. ${error}`);
      setText(fields.productionTwoProfileBoundary, "Failed before session save or message transport.");
    } finally {
      clearProductionBusyAction("two-profile-onion-pairing");
      if (fields.prepareProductionTwoProfileOnionPairing) {
        fields.prepareProductionTwoProfileOnionPairing.disabled = false;
      }
      applyProductionActionState();
    }
  }

  async function saveProductionTwoProfileOnionSessions() {
    const currentInput = productionTwoProfileInput();
    const { profileA, profileB, passphrase } = currentInput;
    const roomInput = twoProfileRoomIdentityInput(currentInput);
    const localPayload = (fields.productionPairingPayload?.value ?? "").trim();
    const remotePayload = (fields.productionRemotePairingPayload?.value ?? "").trim();
    if (!profileA || !profileB || profileA === profileB || !passphrase) {
      setProductionTwoProfileState("Onion session save needs profiles");
      setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before saving onion sessions.");
      return;
    }
    if (!localPayload || !remotePayload) {
      setProductionTwoProfileState("Onion session save needs payloads");
      setText(fields.productionTwoProfileWarning, "Prepare onion pairing payloads before saving sessions.");
      return;
    }
    if (
      !currentPairingSafetyVerified({
        profile: profileA,
        passphrase,
        localPayload,
        remotePayload,
        safetyConfirmed: true,
      })
    ) {
      setProductionTwoProfileState("Onion session save needs safety");
      setText(fields.productionTwoProfileWarning, "Verify the safety number before saving Alice/Bob onion sessions.");
      return;
    }

    setProductionBusyAction("two-profile-onion-session-save");
    setProductionTwoProfileState("Onion session save running");
    setText(fields.productionTwoProfileWarning, "Saving verified Alice/Bob session drafts from onion pairing payloads.");
    setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
    setText(fields.productionTwoProfileSession, "Writing both encrypted session drafts");
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(fields.productionTwoProfileBoundary, "Session save in progress");
    applyProductionActionState();
    if (fields.saveProductionTwoProfileOnionSessions) {
      fields.saveProductionTwoProfileOnionSessions.disabled = true;
    }

    try {
      const profileADraft = await invoke("production_pairing_session_draft_save", {
        profile: profileA,
        passphrase,
        localPayload,
        remotePayload,
        safetyConfirmed: true,
      });
      const profileBDraft = await invoke("production_pairing_session_draft_save", {
        profile: profileB,
        passphrase,
        localPayload: remotePayload,
        remotePayload: localPayload,
        safetyConfirmed: true,
      });
      const status = await invoke("production_two_profile_session_status", {
        profileA,
        profileB,
        passphrase,
      });
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      rememberTwoProfileSessionStatus(roomInput, status);
      renderProductionTwoProfileSessionStatusResult(status);
      const profileAView = productionSessionDraftView(profileADraft);
      const profileBView = productionSessionDraftView(profileBDraft);
      setProductionPairingState("Onion sessions saved");
      setText(fields.productionPairingWarning, "Verified onion pairing saved for both local profiles. Message sessions still require handshake completion.");
      setText(fields.productionPairingSession, `a=${profileAView.session} b=${profileBView.session}`);
      setProductionTwoProfileState(status.both_ready_for_message_envelope ? "Onion sessions message-ready" : "Onion session drafts saved");
      setText(fields.productionTwoProfileWarning, status.both_ready_for_message_envelope ? "Alice/Bob sessions are message-ready. Send a stored-session message or continue onion roundtrip." : "Alice/Bob session drafts saved. Continue with handshake before stored-session messages.");
      setText(fields.productionTwoProfileProfiles, `a_draft=${profileADraft.session_draft_present} b_draft=${profileBDraft.session_draft_present}`);
      setText(fields.productionTwoProfileSession, `a_ready=${status.profile_a_ready_for_message_envelope} b_ready=${status.profile_b_ready_for_message_envelope} both_ready=${status.both_ready_for_message_envelope}`);
      setText(fields.productionTwoProfileMessageState, "No message transport attempted");
      setText(fields.productionTwoProfileBoundary, `a_written=${profileADraft.session_draft_written} b_written=${profileBDraft.session_draft_written} a_present=${profileADraft.session_draft_present} b_present=${profileBDraft.session_draft_present} path=${profileADraft.store_path_returned || profileBDraft.store_path_returned || status.store_path_returned} passphrase=${profileADraft.passphrase_retained || profileBDraft.passphrase_retained || status.passphrase_retained} key_material=${profileADraft.key_material_exposed || profileBDraft.key_material_exposed || status.key_material_exposed} network=false transport=${profileADraft.transport_io_opened || profileBDraft.transport_io_opened || status.transport_io_opened} runtime=${profileADraft.runtime_messaging_enabled || profileBDraft.runtime_messaging_enabled || status.runtime_messaging_enabled}`);
      setProductionFollowupActions(true, status.both_ready_for_message_envelope ? "Next: send a stored-session message." : "Next: complete handshake to make the sessions message-ready.");
    } catch (error) {
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      setProductionTwoProfileState("Onion session save failed");
      setText(fields.productionTwoProfileWarning, `Onion session save failed without returning secrets. ${error}`);
      setText(fields.productionTwoProfileBoundary, "Failed before message transport.");
    } finally {
      clearProductionBusyAction("two-profile-onion-session-save");
      if (fields.saveProductionTwoProfileOnionSessions) {
        fields.saveProductionTwoProfileOnionSessions.disabled = false;
      }
      applyProductionActionState();
    }
  }

  async function completeProductionTwoProfileOnionHandshake() {
    const currentInput = productionTwoProfileInput();
    const { profileA, profileB, passphrase } = currentInput;
    const roomInput = twoProfileRoomIdentityInput(currentInput);
    if (!profileA || !profileB || profileA === profileB || !passphrase) {
      setProductionTwoProfileState("Onion handshake needs profiles");
      setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before completing the onion handshake.");
      return;
    }

    setProductionBusyAction("two-profile-onion-handshake");
    setProductionTwoProfileState("Onion handshake running");
    setText(fields.productionTwoProfileWarning, "Completing Alice/Bob handshake from stored onion session drafts.");
    setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
    setText(fields.productionTwoProfileSession, "Creating init, reply, finish, and importing finish locally");
    setText(fields.productionTwoProfileMessageState, "No network or message transport attempted");
    setText(fields.productionTwoProfileBoundary, "Handshake in progress");
    applyProductionActionState();
    if (fields.completeProductionTwoProfileOnionHandshake) {
      fields.completeProductionTwoProfileOnionHandshake.disabled = true;
    }

    try {
      const profileAInit = await invoke("production_handshake_init_export", { profile: profileA, passphrase });
      let senderProfile = profileA;
      let receiverProfile = profileB;
      let init = profileAInit;
      let profileBInit = null;
      if (!profileAInit.output_payload_created) {
        profileBInit = await invoke("production_handshake_init_export", { profile: profileB, passphrase });
        if (!profileBInit.output_payload_created) {
          throw new Error("handshake init was not created for either profile");
        }
        senderProfile = profileB;
        receiverProfile = profileA;
        init = profileBInit;
      }

      const reply = await invoke("production_handshake_reply_export", {
        profile: receiverProfile,
        passphrase,
        initPayload: init.output_payload,
      });
      const finish = await invoke("production_handshake_finish_export", {
        profile: senderProfile,
        passphrase,
        replyPayload: reply.output_payload,
      });
      const finishImport = await invoke("production_handshake_finish_import", {
        profile: receiverProfile,
        passphrase,
        finishPayload: finish.output_payload,
      });
      const status = await invoke("production_two_profile_session_status", { profileA, profileB, passphrase });

      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      if (fields.productionProfileName) {
        fields.productionProfileName.value = senderProfile;
        fields.productionProfileName.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (fields.productionProfileSelector) {
        fields.productionProfileSelector.value = senderProfile;
      }
      setHandshakePayload(fields.productionHandshakeInitPayload, init.output_payload);
      setHandshakePayload(fields.productionHandshakeReplyPayload, reply.output_payload);
      setHandshakePayload(fields.productionHandshakeFinishPayload, finish.output_payload);
      setText(fields.productionHandshakeState, "Two-profile handshake completed");
      rememberTwoProfileSessionStatus(roomInput, status);
      renderProductionTwoProfileSessionStatusResult(status);
      setProductionPairingState(
        status.both_ready_for_message_envelope ? "Onion handshake message-ready" : "Onion handshake needs review",
      );
      setText(
        fields.productionPairingWarning,
        status.both_ready_for_message_envelope
          ? "Handshake transport state persisted for both local profiles."
          : "Handshake completed but message-ready state needs review.",
      );
      setProductionTwoProfileState(
        status.both_ready_for_message_envelope ? "Onion handshake message-ready" : "Onion handshake needs review",
      );
      setText(
        fields.productionTwoProfileWarning,
        status.both_ready_for_message_envelope
          ? "Alice/Bob sessions are message-ready. Send a stored-session message next."
          : "Handshake completed, but session status is not fully message-ready.",
      );
      setText(fields.productionTwoProfileProfiles, `sender=${senderProfile} receiver=${receiverProfile}`);
      setText(fields.productionTwoProfileSession, `init=${init.output_payload_created} reply=${reply.output_payload_created} finish=${finish.output_payload_created} import=${finishImport.transport_state_persisted} both_ready=${status.both_ready_for_message_envelope}`);
      setText(fields.productionTwoProfileMessageState, "No message transport attempted");
      setText(fields.productionTwoProfileBoundary, `a_init=${profileAInit.output_payload_created} b_init=${profileBInit?.output_payload_created ?? false} reply_state=${reply.state_written} finish_state=${finish.state_written} finish_import=${finishImport.transport_state_created} a_ready=${status.profile_a_ready_for_message_envelope} b_ready=${status.profile_b_ready_for_message_envelope} path=${status.store_path_returned} passphrase=${status.passphrase_retained} key_material=${profileAInit.key_material_exposed || Boolean(profileBInit?.key_material_exposed) || reply.key_material_exposed || finish.key_material_exposed || finishImport.key_material_exposed || status.key_material_exposed} network=false transport=${profileAInit.transport_io_opened || Boolean(profileBInit?.transport_io_opened) || reply.transport_io_opened || finish.transport_io_opened || finishImport.transport_io_opened || status.transport_io_opened} runtime=${profileAInit.runtime_messaging_enabled || Boolean(profileBInit?.runtime_messaging_enabled) || reply.runtime_messaging_enabled || finish.runtime_messaging_enabled || finishImport.runtime_messaging_enabled || status.runtime_messaging_enabled}`);
      setProductionFollowupActions(
        true,
        status.both_ready_for_message_envelope
          ? "Next: send a stored-session message."
          : "Next: check session status and retry handshake if needed.",
      );
      const currentAfter = productionTwoProfileInput();
      if (status.both_ready_for_message_envelope && currentAfter.message) {
        fields.runProductionTwoProfileMessageRoundtrip?.focus();
      } else if (status.both_ready_for_message_envelope) {
        fields.productionTwoProfileMessage?.focus();
      }
    } catch (error) {
      if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
        return;
      }
      setProductionTwoProfileState("Onion handshake failed");
      setText(fields.productionTwoProfileWarning, `Onion handshake failed without returning secrets. ${error}`);
      setText(fields.productionTwoProfileBoundary, "Failed before message transport.");
    } finally {
      clearProductionBusyAction("two-profile-onion-handshake");
      if (fields.completeProductionTwoProfileOnionHandshake) {
        fields.completeProductionTwoProfileOnionHandshake.disabled = false;
      }
      applyProductionActionState();
    }
  }

  return {
    checkOnionLaunchPreflight,
    attemptOnionServiceLaunch,
    prepareProductionTwoProfileOnionKey,
    launchProductionTwoProfileOnionEndpoint,
    refreshProductionTwoProfilePeerEndpoints,
    prepareProductionTwoProfileOnionPairing,
    saveProductionTwoProfileOnionSessions,
    completeProductionTwoProfileOnionHandshake,
  };
}

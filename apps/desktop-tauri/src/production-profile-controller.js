export function createProductionProfileController(input) {
  const {
    fields,
    document,
    invoke,
    setText,
    setProductionProfileState,
    redactedUiErrorMessage,
    t,
    productionProfileInput,
    productionTwoProfileInput,
    productionProfileInputStillCurrent,
    productionPairingInput,
    productionPairingInputStillCurrent,
    productionProfileUnlockView,
    productionProfileUnlockRecoveryView,
    productionProfileRecoveryActionsView,
    productionPanicLockMitigationView,
    setLatestProductionProfileUnlocked,
    setLatestProductionProductUnlockStatus,
    getProductionBusyAction,
    renderHighRiskReadinessStatus,
    clearProductionSensitiveMemoryState,
    clearProductionSensitiveFields,
    clearClipboardBestEffort,
    setProductionBusyAction,
    clearProductionBusyAction,
    applyProductionActionState,
    rememberFailureSupportReport,
    renderDataLifecycleDestructivePreflight,
    renderProductionDataLifecycleAction,
    resetProductionProfileView,
    resetProductionPairingView,
    resetProductionMessageView,
    resetProductionMessageTranscript,
    resetProductionMessageImportState,
    applyPostDestructiveLifecycleRebuildGuidance,
    rememberProductionSessionState,
    productionSessionLifecycleView,
    productionLocalLifecycleBoundaryView,
    clearSavedInviteRoomConversationMetadataForProfile,
    clearActiveConversationStateAfterLocalDelete,
    setProductionPairingState,
    setProductionMessageState,
    loadProductionMessageRetentionPreference,
    loadProductionProfileList,
    restoreProductionSessionAfterUnlock,
    refreshTwoProfileSessionAfterProfileUnlock,
    checkProductionSessionState,
  } = input;

  function localizedStorageBudgetStatus(result, options = {}) {
    const locked = options.locked === true;
    if (locked) {
      return t("storageBudgetHiddenWhileLocked");
    }
    const status = String(
      result?.profile_storage_budget_status ?? result?.app_storage_budget_status ?? "",
    ).trim();
    if (status === "at-cap") {
      return t("storageBudgetAtCap");
    }
    if (status === "cleanup-recommended") {
      return t("storageBudgetCleanupRecommended");
    }
    if (status === "within-limit") {
      return t("storageBudgetNormal");
    }
    return t("storageBudgetHiddenWhileLocked");
  }

  function renderProductionProductUnlockStatus(result) {
    setLatestProductionProductUnlockStatus(result ?? null);
    const unlocked = result?.unlocked === true;
    setLatestProductionProfileUnlocked(unlocked);
    const reason = result?.redacted_reason || "unknown";
    const profile = result?.profile ? ` profile=${result.profile}` : "";
    const expires = result?.expires_at_ms ? ` expires_at_ms=${result.expires_at_ms}` : "";
    setText(
      fields.productionProductUnlockState,
      `unlocked=${unlocked}${profile} reason=${reason} key_policy=${result?.key_policy_status ?? "unknown"} rollback_suspicion=${result?.rollback_suspicion_detected === true} idle_auto_lock_seconds=${result?.idle_auto_lock_seconds ?? 60}${expires}`,
    );
    setText(
      fields.productionProfileBoundary,
      `passphrase_first=${result?.passphrase_first === true} os_keystore_only_rejected=${result?.os_keystore_only_rejected === true} production_key_management_ready=${result?.production_key_management_ready === true} rollback_marker=${result?.rollback_marker_present === true} rollback_detection=${result?.rollback_detection_ready === true} rollback_blocked=${result?.rollback_resume_blocked === true} rollback_prevention=false secure_delete_claim=false store_path_returned=${result?.store_path_returned === true} passphrase_retained=${result?.passphrase_retained === true} key_material=${result?.key_material_exposed === true} raw_error=${result?.raw_storage_error_exposed === true} runtime=${result?.runtime_messaging_enabled === true}`,
    );
    if (fields.lockProductionProfile) {
      fields.lockProductionProfile.disabled = !unlocked || getProductionBusyAction() !== null;
    }
    renderHighRiskReadinessStatus();
    return unlocked;
  }

  function productionProductUnlockRecoveryView(result, options = {}) {
    const unlocked = result?.unlocked === true;
    const lockedByUser = options.lockedByUser === true;
    const reason = String(result?.redacted_reason ?? "unknown").trim() || "unknown";
    const rollbackBlocked =
      result?.rollback_suspicion_detected === true || result?.rollback_resume_blocked === true;
    const boundary =
      `local_only=true passphrase_first=${result?.passphrase_first === true} ` +
      `os_keychain_fallback=false os_keystore_only_rejected=${result?.os_keystore_only_rejected === true} ` +
      `backup_recovery=false cloud_backup_sync=false rollback_detection=${result?.rollback_detection_ready === true} ` +
      `rollback_prevention=false secure_delete_claim=false security_ready=false ` +
      `passphrase_retained=${result?.passphrase_retained === true} key_material=${result?.key_material_exposed === true} raw_error=${result?.raw_storage_error_exposed === true}`;

    if (unlocked) {
      return {
        state: "Profile unlocked",
        warning: result?.warning || t("profileRecoveryUnlocked"),
        storage: `Unlocked reason=${reason} local_recovery=not_needed`,
        identity: "Identity opened; passphrase not retained",
        next: t("profileRecoveryUnlocked"),
        boundary: `${boundary} recovery=unlocked rollback_suspicion=${rollbackBlocked}`,
      };
    }

    if (rollbackBlocked) {
      return {
        state: "Profile locked",
        warning: t("profileRecoveryRollbackBlocked"),
        storage: `Locked reason=${reason} local_recovery=check-data-lifecycle`,
        identity: "Not opened; saved-room resume blocked",
        next: t("profileRecoveryRollbackBlockedNext"),
        boundary: `${boundary} recovery=rollback-suspicion rollback_suspicion=true resume_blocked=true`,
      };
    }

    if (lockedByUser) {
      return {
        state: "Profile locked",
        warning: result?.warning || t("profileRecoveryLockedByUser"),
        storage: `Locked reason=${reason} local_recovery=unlock-with-passphrase`,
        identity: "Locked locally",
        next: t("profileRecoveryLockedByUser"),
        boundary: `${boundary} recovery=manual-lock rollback_suspicion=false resume_blocked=false`,
      };
    }

    const profileRecovery = productionProfileUnlockRecoveryView(result);
    const recoveryActions = productionProfileRecoveryActionsView(profileRecovery);
    return {
      state: "Profile locked",
      warning: profileRecovery.warning || t("profileRecoveryLocked"),
      storage: `Locked reason=${reason} local_recovery=${profileRecovery.kind}`,
      identity: "Not opened; no raw storage error exposed",
      next: recoveryActions.primaryNextAction || profileRecovery.nextAction || t("profileRecoveryLockedNext"),
      boundary: `${boundary} ${profileRecovery.boundary} ${recoveryActions.boundary} recovery=passphrase-first-lockout rollback_suspicion=false resume_blocked=false`,
    };
  }

  function renderProductionProductUnlockRecovery(result, options = {}) {
    const view = productionProductUnlockRecoveryView(result, options);
    setText(fields.productionProfileNextAction, view.next);
    return view;
  }

  async function checkProductionProductUnlockStatus() {
    try {
      const result = await invoke("production_product_unlock_status");
      renderProductionProductUnlockStatus(result);
      const view = renderProductionProductUnlockRecovery(result);
      setText(fields.productionProfileWarning, view.warning);
      setProductionProfileState(view.state);
      return result;
    } catch (error) {
      setProductionProfileState("Profile unlock status failed");
      setText(fields.productionProfileWarning, redactedUiErrorMessage("profile-create", error));
      setText(fields.productionProductUnlockState, "status failed without exposing local path details");
      setText(fields.productionProfileNextAction, t("profileRecoveryStatusFailedNext"));
      return null;
    }
  }

  async function lockProductionProfile() {
    try {
      const result = await invoke("production_product_lock");
      renderProductionProductUnlockStatus(result);
      const view = renderProductionProductUnlockRecovery(result, { lockedByUser: true });
      setProductionProfileState(view.state);
      setText(fields.productionProfileWarning, view.warning);
      setText(fields.productionProfileStorage, `${view.storage} | ${localizedStorageBudgetStatus(null, { locked: true })}`);
      setText(fields.productionProfileIdentity, view.identity);
      return result;
    } catch (error) {
      setProductionProfileState("Profile lock failed");
      setText(fields.productionProfileWarning, redactedUiErrorMessage("profile-unlock", error));
      return null;
    }
  }

  async function panicLockProductionProfile() {
    const boundary = productionPanicLockMitigationView();
    clearProductionSensitiveMemoryState();
    clearProductionSensitiveFields();
    document.body.classList.add("is-panic-locked");
    setProductionProfileState("Panic lock active");
    setText(fields.productionProfileWarning, "Private views hidden and local memory state cleared.");
    setText(
      fields.productionProfileStorage,
      `Locked locally; reopen with profile passphrase. | ${localizedStorageBudgetStatus(null, { locked: true })}`,
    );
    setText(fields.productionProfileIdentity, "Hidden after panic lock");
    setText(fields.productionProfileBoundary, boundary.boundary);
    await clearClipboardBestEffort();
    try {
      const result = await invoke("production_product_lock");
      renderProductionProductUnlockStatus(result);
      renderProductionProductUnlockRecovery(result, { lockedByUser: true });
      return result;
    } catch {
      return null;
    } finally {
      applyProductionActionState();
    }
  }

  async function unlockProductionProfile() {
    const inputValue = productionProfileInput();
    const { profile, passphrase } = inputValue;
    const twoProfileRefreshInput = productionTwoProfileInput();
    if (!profile || !passphrase) {
      setProductionProfileState("Profile unlock needs input");
      setText(fields.productionProfileWarning, "Keep the random nickname and enter a passphrase.");
      setText(fields.productionProfileNextAction, t("profileRecoveryNeedsInputNext"));
      return;
    }

    setProductionProfileState("Profile unlock running");
    setText(fields.productionProfileWarning, "Opening production profile store.");
    setText(fields.productionProfileStorage, "Waiting for app-data encrypted store");
    setText(fields.productionProfileIdentity, "Waiting for identity status");
    setText(fields.productionProfileBoundary, "Waiting for boundary flags");
    setProductionBusyAction("profile-unlock");
    applyProductionActionState();
    if (fields.unlockProductionProfile) {
      fields.unlockProductionProfile.disabled = true;
    }
    try {
      const productUnlock = await invoke("production_product_unlock", { profile, passphrase });
      renderProductionProductUnlockStatus(productUnlock);
      const productUnlockRecovery = renderProductionProductUnlockRecovery(productUnlock);
      if (productUnlock.unlocked !== true) {
        setProductionProfileState(productUnlockRecovery.state);
        setText(fields.productionProfileWarning, productUnlockRecovery.warning);
        setText(
          fields.productionProfileStorage,
          `${productUnlockRecovery.storage} | ${localizedStorageBudgetStatus(null, { locked: true })}`,
        );
        setText(fields.productionProfileIdentity, productUnlockRecovery.identity);
        setText(fields.productionProfileBoundary, productUnlockRecovery.boundary);
        rememberFailureSupportReport(
          "profile-unlock",
          productUnlockRecovery.storage?.includes("local_recovery=")
            ? productUnlockRecovery.storage.split("local_recovery=")[1]?.split(/\s+/)[0]
            : "profile_unlock_blocked",
          productUnlockRecovery.next,
          "profile_unlock_failed",
        );
        return;
      }
      const result = await invoke("production_profile_unlock", { profile, passphrase });
      if (!productionProfileInputStillCurrent(inputValue)) {
        return;
      }
      const view = productionProfileUnlockView(result);
      document.body.classList.remove("is-panic-locked");
      setProductionProfileState("Profile unlocked");
      setText(fields.productionProfileWarning, result.warning);
      setText(fields.productionProfileStorage, `${view.storage} | ${localizedStorageBudgetStatus(result)}`);
      setText(fields.productionProfileIdentity, view.identity);
      setText(fields.productionProfileBoundary, view.boundary);
      await loadProductionMessageRetentionPreference(profile, passphrase, { quiet: true });
      if (!productionProfileInputStillCurrent(inputValue)) {
        return;
      }
      await loadProductionProfileList();
      if (!productionProfileInputStillCurrent(inputValue)) {
        return;
      }
      await restoreProductionSessionAfterUnlock(inputValue);
      if (!productionProfileInputStillCurrent(inputValue)) {
        return;
      }
      await refreshTwoProfileSessionAfterProfileUnlock(profile, passphrase, twoProfileRefreshInput);
    } catch (error) {
      if (!productionProfileInputStillCurrent(inputValue)) {
        return;
      }
      const recovery = productionProfileUnlockRecoveryView({ error });
      const recoveryActions = productionProfileRecoveryActionsView(recovery);
      setLatestProductionProfileUnlocked(false);
      setProductionProfileState("Profile unlock failed");
      setText(fields.productionProfileWarning, recovery.warning);
      setText(
        fields.productionProfileStorage,
        `Failed local_recovery=${recovery.kind} | ${localizedStorageBudgetStatus(null, { locked: true })}`,
      );
      setText(fields.productionProfileIdentity, "Not opened; no raw storage error exposed");
      setText(fields.productionProfileBoundary, `${recovery.boundary} ${recoveryActions.boundary}`);
      setText(fields.productionProfileNextAction, recoveryActions.primaryNextAction || recovery.nextAction);
      rememberFailureSupportReport(
        "profile-unlock",
        recovery.kind,
        recoveryActions.primaryNextAction || recovery.nextAction,
        "profile_unlock_failed",
      );
    } finally {
      clearProductionBusyAction("profile-unlock");
      if (fields.unlockProductionProfile) {
        fields.unlockProductionProfile.disabled = false;
      }
      applyProductionActionState();
    }
  }

  async function deleteProductionProfile() {
    const inputValue = productionProfileInput();
    const roomInputBeforeDelete = productionTwoProfileInput();
    const confirmation = (fields.productionProfileDeleteConfirmation?.value ?? "").trim();
    const preflight = renderDataLifecycleDestructivePreflight("profile-delete", {
      confirmationMatched: Boolean(inputValue.profile && confirmation === inputValue.profile),
      profile: inputValue.profile,
    });
    if (!inputValue.profile || confirmation !== inputValue.profile) {
      setProductionProfileState("Profile delete needs confirmation");
      setText(fields.productionProfileWarning, preflight.warning);
      setText(fields.productionProfileNextAction, preflight.next);
      return null;
    }
    setProductionBusyAction("profile-delete");
    setProductionProfileState("Profile deleting");
    setText(fields.productionProfileWarning, `${preflight.warning} ${t("dataLifecycleDeleteRunning")}`);
    setText(fields.productionProfileNextAction, t("dataLifecycleDestructiveRunningNext"));
    applyProductionActionState();
    try {
      const result = await invoke("production_profile_delete", {
        profile: inputValue.profile,
        confirmation,
      });
      const view = renderProductionDataLifecycleAction(result, "profile-delete");
      setProductionProfileState(result.profile_deleted ? "Local profile deleted" : "Local profile not found");
      setText(fields.productionProfileWarning, `${result.warning} ${view.next}`);
      resetProductionPairingView({ preserveTwoProfileStatus: true });
      resetProductionMessageView();
      applyPostDestructiveLifecycleRebuildGuidance("profile-delete", {
        deletedProfile: inputValue.profile,
        input: roomInputBeforeDelete,
      });
      await loadProductionProfileList();
      await checkProductionProductUnlockStatus();
      return result;
    } catch (error) {
      setProductionProfileState("Profile delete failed");
      setText(fields.productionProfileWarning, redactedUiErrorMessage("profile-recovery-status", error));
      setText(fields.productionProfileNextAction, t("dataLifecycleFailedNext"));
      rememberFailureSupportReport(
        "profile-delete",
        "destructive_action_failed",
        "retry-local-lifecycle-action",
        "destructive_action_failed",
      );
      return null;
    } finally {
      clearProductionBusyAction("profile-delete");
      applyProductionActionState();
    }
  }

  async function wipeProductionLocalData() {
    const roomInputBeforeWipe = productionTwoProfileInput();
    const confirmation = (fields.productionFullWipeConfirmation?.value ?? "").trim();
    const preflight = renderDataLifecycleDestructivePreflight("full-local-wipe", {
      confirmationMatched: confirmation === "WIPE LOCAL DATA",
      profile: productionProfileInput().profile,
    });
    if (confirmation !== "WIPE LOCAL DATA") {
      setProductionProfileState("Local wipe needs confirmation");
      setText(fields.productionProfileWarning, preflight.warning);
      setText(fields.productionProfileNextAction, preflight.next);
      return null;
    }
    setProductionBusyAction("full-local-data-wipe");
    setProductionProfileState("Local data wiping");
    setText(fields.productionProfileWarning, `${preflight.warning} ${t("dataLifecycleWipeRunning")}`);
    setText(fields.productionProfileNextAction, t("dataLifecycleDestructiveRunningNext"));
    applyProductionActionState();
    try {
      const result = await invoke("production_full_local_data_wipe", { confirmation });
      resetProductionProfileView();
      resetProductionPairingView();
      resetProductionMessageView();
      const view = renderProductionDataLifecycleAction(result, "full-local-wipe");
      setProductionProfileState(result.full_local_data_wiped ? "Local app data wiped" : "Local wipe incomplete");
      setText(fields.productionProfileWarning, `${result.warning} ${view.next}`);
      applyPostDestructiveLifecycleRebuildGuidance("full-local-wipe", { input: roomInputBeforeWipe });
      await loadProductionProfileList();
      await checkProductionProductUnlockStatus();
      return result;
    } catch (error) {
      setProductionProfileState("Local data wipe failed");
      setText(fields.productionProfileWarning, redactedUiErrorMessage("profile-recovery-unlock", error));
      setText(fields.productionProfileNextAction, t("dataLifecycleFailedNext"));
      rememberFailureSupportReport(
        "full-local-wipe",
        "destructive_action_failed",
        "retry-local-lifecycle-action",
        "destructive_action_failed",
      );
      return null;
    } finally {
      clearProductionBusyAction("full-local-data-wipe");
      applyProductionActionState();
    }
  }

  async function emergencyWipeProductionLocalData() {
    const roomInputBeforeWipe = productionTwoProfileInput();
    const confirmation = (fields.productionEmergencyWipeConfirmation?.value ?? "").trim();
    const boundary = productionPanicLockMitigationView();
    if (confirmation !== boundary.emergencyConfirmation) {
      setProductionProfileState("Emergency wipe needs confirmation");
      setText(
        fields.productionProfileWarning,
        "Type EMERGENCY WIPE LOCAL DATA to run the separate emergency local wipe.",
      );
      setText(fields.productionProfileNextAction, "Next: confirm emergency local wipe.");
      setText(fields.productionProfileBoundary, boundary.boundary);
      return null;
    }
    clearProductionSensitiveMemoryState();
    clearProductionSensitiveFields();
    setProductionBusyAction("emergency-local-data-wipe");
    document.body.classList.add("is-panic-locked");
    setProductionProfileState("Emergency local wipe running");
    setText(fields.productionProfileWarning, "Emergency local wipe is deleting owned local app data.");
    setText(fields.productionProfileNextAction, t("dataLifecycleDestructiveRunningNext"));
    setText(fields.productionProfileBoundary, boundary.boundary);
    await clearClipboardBestEffort();
    applyProductionActionState();
    try {
      const result = await invoke("production_emergency_local_data_wipe", { confirmation });
      resetProductionProfileView();
      resetProductionPairingView();
      resetProductionMessageView();
      const view = renderProductionDataLifecycleAction(result, "emergency-local-wipe");
      document.body.classList.add("is-panic-locked");
      setProductionProfileState(
        result.full_local_data_wiped ? "Emergency local wipe complete" : "Emergency local wipe incomplete",
      );
      setText(fields.productionProfileWarning, `${result.warning} ${view.next}`);
      setText(fields.productionProfileBoundary, `${view.boundary} ${boundary.boundary}`);
      applyPostDestructiveLifecycleRebuildGuidance("full-local-wipe", { input: roomInputBeforeWipe });
      await loadProductionProfileList();
      return result;
    } catch (error) {
      setProductionProfileState("Emergency local wipe failed");
      setText(fields.productionProfileWarning, redactedUiErrorMessage("profile-recovery-create", error));
      setText(fields.productionProfileNextAction, t("dataLifecycleFailedNext"));
      rememberFailureSupportReport(
        "emergency-local-wipe",
        "destructive_action_failed",
        "retry-local-lifecycle-action",
        "destructive_action_failed",
      );
      return null;
    } finally {
      clearProductionBusyAction("emergency-local-data-wipe");
      applyProductionActionState();
    }
  }

  async function checkProductionDataLifecycle() {
    setProductionProfileState("Data lifecycle checking");
    setProductionBusyAction("data-lifecycle");
    applyProductionActionState();
    try {
      const result = await invoke("production_data_lifecycle_status");
      const view = renderProductionDataLifecycleAction(result, "status");
      setProductionProfileState("Data lifecycle checked");
      setText(fields.productionProfileWarning, result.warning);
      setText(fields.productionProfileNextAction, view.next);
      return result;
    } catch (error) {
      setProductionProfileState("Data lifecycle check failed");
      setText(fields.productionProfileWarning, redactedUiErrorMessage("profile-delete", error));
      setText(fields.productionDataLifecycle, "Failed");
      setText(fields.productionProfileNextAction, t("dataLifecycleFailedNext"));
      return null;
    } finally {
      clearProductionBusyAction("data-lifecycle");
      applyProductionActionState();
    }
  }

  async function prepareProductionDataLifecycle() {
    setProductionProfileState("Data lifecycle preparing");
    setProductionBusyAction("data-lifecycle-prepare");
    applyProductionActionState();
    try {
      const result = await invoke("production_data_lifecycle_prepare");
      const view = renderProductionDataLifecycleAction(result, "prepare");
      setProductionProfileState("Data lifecycle prepared");
      setText(fields.productionProfileWarning, result.warning);
      setText(fields.productionProfileNextAction, view.next);
      return result;
    } catch (error) {
      setProductionProfileState("Data lifecycle prepare failed");
      setText(fields.productionProfileWarning, redactedUiErrorMessage("local-data-wipe", error));
      setText(fields.productionDataLifecycle, "Failed");
      setText(fields.productionProfileNextAction, t("dataLifecycleFailedNext"));
      return null;
    } finally {
      clearProductionBusyAction("data-lifecycle-prepare");
      applyProductionActionState();
    }
  }

  async function deleteProductionSessionLifecycle(input = productionPairingInput()) {
    const { profile, passphrase } = input;
    const roomInputBeforeDelete = productionTwoProfileInput();
    if (!profile || !passphrase) {
      setProductionPairingState("Session delete needs profile");
      setText(fields.productionPairingWarning, "Enter profile and passphrase.");
      return;
    }
    const confirmation = (fields.productionSessionDeleteConfirmation?.value ?? "").trim();
    const preflight = renderDataLifecycleDestructivePreflight("session-delete", {
      confirmationMatched: confirmation === "DELETE SESSION",
      profile,
    });
    if (confirmation !== "DELETE SESSION") {
      setProductionPairingState("Session delete needs confirmation");
      setText(fields.productionPairingWarning, preflight.warning);
      setText(fields.productionPairingNextAction, preflight.next);
      setText(fields.productionSessionLifecycle, preflight.summary);
      return;
    }

    setProductionPairingState("Session lifecycle deleting");
    setText(
      fields.productionPairingWarning,
      "Deleting local session lifecycle records only. Message data, backups, and secure deletion claims are handled separately.",
    );
    setProductionBusyAction("session-lifecycle-delete");
    applyProductionActionState();
    if (fields.deleteProductionSessionLifecycle) {
      fields.deleteProductionSessionLifecycle.disabled = true;
    }
    try {
      const result = await invoke("production_session_lifecycle_delete", {
        profile,
        passphrase,
        confirmation,
      });
      if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
        return;
      }
      const view = productionSessionLifecycleView(result, { action: "session-delete" });
      rememberProductionSessionState(input, null);
      if (result.session_resume_closed) {
        applyPostDestructiveLifecycleRebuildGuidance("session-delete", {
          deletedProfile: profile,
          input: roomInputBeforeDelete,
        });
      }
      setProductionPairingState(
        result.session_resume_closed ? "Session lifecycle deleted" : "Session lifecycle delete incomplete",
      );
      setText(fields.productionPairingWarning, result.warning);
      setText(fields.productionPairingSession, "Local stored session no longer resumable");
      setText(fields.productionSessionLifecycle, view.lifecycle);
      setText(fields.productionPairingBoundary, view.boundary);
      setProductionMessageState("Message flow idle");
      setText(fields.productionMessageBoundary, view.boundary);
    } catch (error) {
      if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
        return;
      }
      setProductionPairingState("Session lifecycle delete failed");
      setText(fields.productionPairingWarning, redactedUiErrorMessage("session-delete", error));
      setText(fields.productionSessionLifecycle, "Failed");
      rememberFailureSupportReport(
        "session-delete",
        "destructive_action_failed",
        "retry-local-lifecycle-action",
        "destructive_action_failed",
      );
    } finally {
      clearProductionBusyAction("session-lifecycle-delete");
      if (fields.deleteProductionSessionLifecycle) {
        fields.deleteProductionSessionLifecycle.disabled = false;
      }
      applyProductionActionState();
    }
  }

  async function deleteProductionConversation() {
    const inputValue = productionProfileInput();
    const roomInputBeforeDelete = productionTwoProfileInput();
    const { profile, passphrase } = inputValue;
    if (!profile || !passphrase) {
      setProductionMessageState("Conversation delete needs profile");
      setText(fields.productionMessageWarning, "Enter profile and passphrase first.");
      return;
    }
    const confirmation = (fields.productionConversationDeleteConfirmation?.value ?? "").trim();
    const preflight = renderDataLifecycleDestructivePreflight("conversation-delete", {
      confirmationMatched: confirmation === "DELETE CONVERSATION",
      profile,
    });
    if (confirmation !== "DELETE CONVERSATION") {
      setProductionMessageState("Conversation delete needs confirmation");
      setText(fields.productionMessageWarning, preflight.warning);
      setText(fields.productionMessageNextAction, preflight.next);
      setText(fields.productionMessageBoundary, preflight.summary);
      return;
    }
    setProductionMessageState("Conversation deleting");
    setText(
      fields.productionMessageWarning,
      "Deleting local conversation message records only. This is not backup recovery, rollback prevention, or secure media deletion.",
    );
    setProductionBusyAction("conversation-delete");
    applyProductionActionState();
    try {
      const result = await invoke("production_conversation_delete", {
        profile,
        passphrase,
        confirmation,
      });
      if (!productionProfileInputStillCurrent(inputValue)) {
        return;
      }
      const savedRoomsCleared = clearSavedInviteRoomConversationMetadataForProfile(profile);
      const activeRoomCleared = clearActiveConversationStateAfterLocalDelete(profile, roomInputBeforeDelete);
      resetProductionMessageTranscript();
      resetProductionMessageImportState();
      if (fields.productionMessageEnvelope) {
        fields.productionMessageEnvelope.value = "";
      }
      setProductionMessageState("Conversation deleted");
      setText(fields.productionMessageWarning, result.warning);
      setText(
        fields.productionMessageOutbound,
        `sent_deleted=${result.sent_messages_deleted} envelopes_deleted=${result.message_envelopes_deleted} indexes_deleted=${result.local_message_indexes_deleted} counter_deleted=${result.message_counter_deleted}`,
      );
      setText(
        fields.productionMessageInbound,
        `received_deleted=${result.received_messages_deleted} total_records=${result.conversation_records_deleted} session_preserved=${result.session_records_preserved} saved_rooms_cleared=${savedRoomsCleared} active_room_cleared=${activeRoomCleared}`,
      );
      setText(fields.productionMessageBoundary, productionLocalLifecycleBoundaryView(result, { action: "conversation-delete" }));
      await checkProductionSessionState(inputValue);
    } catch (error) {
      if (!productionProfileInputStillCurrent(inputValue)) {
        return;
      }
      setProductionMessageState("Conversation delete failed");
      setText(fields.productionMessageWarning, redactedUiErrorMessage("conversation-delete", error));
      rememberFailureSupportReport(
        "conversation-delete",
        "destructive_action_failed",
        "retry-local-lifecycle-action",
        "destructive_action_failed",
      );
    } finally {
      clearProductionBusyAction("conversation-delete");
      applyProductionActionState();
    }
  }

  return {
    renderProductionProductUnlockStatus,
    productionProductUnlockRecoveryView,
    renderProductionProductUnlockRecovery,
    checkProductionProductUnlockStatus,
    unlockProductionProfile,
    deleteProductionProfile,
    wipeProductionLocalData,
    emergencyWipeProductionLocalData,
    checkProductionDataLifecycle,
    prepareProductionDataLifecycle,
    deleteProductionSessionLifecycle,
    deleteProductionConversation,
    lockProductionProfile,
    panicLockProductionProfile,
  };
}

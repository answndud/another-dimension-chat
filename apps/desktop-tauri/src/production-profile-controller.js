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
    loadProductionMessageRetentionPreference,
    loadProductionProfileList,
    restoreProductionSessionAfterUnlock,
    refreshTwoProfileSessionAfterProfileUnlock,
  } = input;

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
      setText(fields.productionProfileStorage, view.storage);
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
    setText(fields.productionProfileStorage, "Locked locally; reopen with profile passphrase.");
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
      setText(fields.productionProfileWarning, "Enter a profile name and passphrase.");
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
        setText(fields.productionProfileStorage, productUnlockRecovery.storage);
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
      setText(fields.productionProfileStorage, view.storage);
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
      setText(fields.productionProfileStorage, `Failed local_recovery=${recovery.kind}`);
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

  return {
    renderProductionProductUnlockStatus,
    productionProductUnlockRecoveryView,
    renderProductionProductUnlockRecovery,
    checkProductionProductUnlockStatus,
    unlockProductionProfile,
    lockProductionProfile,
    panicLockProductionProfile,
  };
}

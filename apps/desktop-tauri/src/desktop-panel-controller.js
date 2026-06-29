export function createDesktopPanelController(input) {
  const {
    document,
    fields,
    setManualNetworkPermission = () => {},
    productionTwoProfileInput,
    twoProfileSessionsReadyForInput,
    renderRoomIdentityBar,
    renderRoomStatusSummary,
    setProductionTwoProfileState,
    pendingPrivateRouteFollowup,
    privateRouteFollowupMatchesRoom,
    showPrivateRouteRetryFollowupPrompt,
    clearPrivateRouteFollowupForRoom,
    twoProfileSafetyConfirmedForInput,
    twoProfilePeerEndpointState,
    receiveIntentForRoom,
    manualNetworkPermissionEnabled,
    openPrivateDeliverySettings,
    focusSafetyConfirmation,
    twoProfileInviteCodeModeActive,
    focusPrivateRouteNextAction,
    applyPeerPrivateRouteCode,
    prepareInviteRoomPrivateRouteExchange,
    twoProfileTranscriptInputStillCurrent,
    refreshProductionTwoProfilePeerEndpoints,
    showLatestRetryableOutboundNotice,
    setText,
    t,
    setChatDeliveryNoticeByKey,
    refreshRouteReadinessNoticeAfterSessionRefresh,
    applyProductionActionState,
    openChatSettingsPanel,
    closeChatSettingsPanel,
    closeAppSettingsPanel,
    openManualProductionTools,
  } = input;

  function chatPanel() {
    return document.querySelector(".chat-settings-panel");
  }

  function systemPanel() {
    return document.querySelector(".system-settings-panel");
  }

  function systemPanelSummary() {
    return document.querySelector(".system-settings-panel > summary");
  }

  function developerDetailsPanel() {
    return document.querySelector(".boundary-details");
  }

  function bindPanelControls() {
    if (fields.toggleChatSettings) {
      fields.toggleChatSettings.setAttribute("aria-expanded", "false");
      fields.toggleChatSettings.addEventListener("click", () => {
        const panel = chatPanel();
        const appPanel = systemPanel();
        if (!panel) {
          return;
        }
        if (panel.open) {
          closeChatSettingsPanel();
        } else {
          openChatSettingsPanel();
        }
        if (panel.open && appPanel) {
          appPanel.open = false;
        }
      });
    }

    if (fields.closeChatSettings) {
      fields.closeChatSettings.addEventListener("click", () => {
        closeChatSettingsPanel();
        fields.toggleChatSettings?.focus?.();
      });
    }

    if (fields.openPrivateDeliverySettings) {
      fields.openPrivateDeliverySettings.addEventListener("click", () => enablePrivateDeliveryPermission());
    }

    chatPanel()?.addEventListener("toggle", (event) => {
      const open = Boolean(event.currentTarget.open);
      document.body.classList.toggle("is-chat-settings-open", open);
      fields.toggleChatSettings?.setAttribute("aria-expanded", open ? "true" : "false");
    });

    systemPanel()?.addEventListener("toggle", (event) => {
      const open = Boolean(event.currentTarget.open);
      document.body.classList.toggle("is-app-settings-open", open);
      if (open) {
        closeChatSettingsPanel();
      }
    });

    if (fields.closeAppSettings) {
      fields.closeAppSettings.addEventListener("click", (event) => {
        event.preventDefault();
        closeAppSettingsPanel();
        systemPanelSummary()?.focus?.();
      });
    }

    if (fields.openPublicBetaDetails) {
      fields.openPublicBetaDetails.addEventListener("click", () => {
        openChatSettingsPanel();
        const panel = developerDetailsPanel();
        if (panel && "open" in panel) {
          panel.open = true;
        }
        panel?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (chatPanel()?.open) {
        closeChatSettingsPanel();
        fields.toggleChatSettings?.focus?.();
      }
      if (systemPanel()?.open) {
        closeAppSettingsPanel();
        systemPanelSummary()?.focus?.();
      }
    });

    document.addEventListener("pointerdown", (event) => {
      const target = event.target;
      const currentChatPanel = chatPanel();
      if (currentChatPanel?.open) {
        if (currentChatPanel.contains(target) || fields.toggleChatSettings?.contains?.(target)) {
          return;
        }
        closeChatSettingsPanel();
      }
      const currentSystemPanel = systemPanel();
      const summary = systemPanelSummary();
      if (currentSystemPanel?.open) {
        if (currentSystemPanel.contains(target) || summary?.contains?.(target)) {
          return;
        }
        closeAppSettingsPanel();
      }
    });

    if (fields.openDeveloperTools) {
      fields.openDeveloperTools.addEventListener("click", () => {
        closeAppSettingsPanel();
        openManualProductionTools();
      });
    }
  }

  function enablePrivateDeliveryPermission(options = {}) {
    setManualNetworkPermission(true);
    if (options.preserveFollowup !== true) {
      clearPrivateRouteFollowupForRoom(productionTwoProfileInput());
    }
    document.querySelector(".network-permission-toggle")?.classList.remove("is-attention");
    const input = productionTwoProfileInput();
    const sessionsReady = twoProfileSessionsReadyForInput(input);
    renderRoomIdentityBar(input, sessionsReady);
    renderRoomStatusSummary(input, sessionsReady);
    setProductionTwoProfileState("Private delivery permission enabled");
    const preservedRetryFollowup =
      options.preserveFollowup === true &&
      pendingPrivateRouteFollowup?.action === "retry-outbound" &&
      privateRouteFollowupMatchesRoom(input);
    if (preservedRetryFollowup) {
      if (showPrivateRouteRetryFollowupPrompt(input)) {
        return;
      }
      clearPrivateRouteFollowupForRoom(input);
    }
    if (sessionsReady && twoProfileSafetyConfirmedForInput(input) && !twoProfilePeerEndpointState(input).ready) {
      setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteNeeded"));
      setChatDeliveryNoticeByKey("privateDeliveryRouteNeeded", "muted", input);
      fields.preparePrivateRoute?.focus?.({ preventScroll: true });
    } else if (sessionsReady && twoProfileSafetyConfirmedForInput(input) && receiveIntentForRoom(input)) {
      setText(fields.productionTwoProfileWarning, t("chatNoticeReceiveStopped"));
      setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "muted", input);
      fields.startProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
    } else {
      setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteReady"));
      setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
    }
    refreshRouteReadinessNoticeAfterSessionRefresh(input, { allowRetryRecovery: false });
    applyProductionActionState();
  }

  async function preparePrivateDeliveryRoute(options = {}) {
    const forceRefresh = options.forceRefresh === true;
    const input = options.input ?? productionTwoProfileInput();
    const allowRetryRecovery = options.allowRetryRecovery !== false;
    if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
      openChatSettingsPanel(fields.productionTwoProfileB);
      setProductionTwoProfileState("Private route needs room");
      setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsRoom"));
      return;
    }
    if (!twoProfileSessionsReadyForInput(input)) {
      setProductionTwoProfileState("Private route needs ready room");
      setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsReadyRoom"));
      return;
    }
    if (!twoProfileSafetyConfirmedForInput(input)) {
      setProductionTwoProfileState("Verification required");
      setText(fields.productionTwoProfileWarning, t("sendLockedUntilVerified"));
      focusSafetyConfirmation();
      return;
    }
    if (!manualNetworkPermissionEnabled()) {
      openPrivateDeliverySettings(input);
      return;
    }
    if (twoProfilePeerEndpointState(input).ready && !forceRefresh) {
      if (allowRetryRecovery && showPrivateRouteRetryFollowupPrompt(input)) {
        return;
      }
      setProductionTwoProfileState("Private route ready");
      setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteReady"));
      setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
      return;
    }

    if (twoProfileInviteCodeModeActive()) {
      const nextRouteAction = focusPrivateRouteNextAction(input, { forceRefresh });
      if (nextRouteAction === "paste-peer") {
        setProductionTwoProfileState("Peer delivery code needed");
        setText(fields.productionTwoProfileWarning, t("peerPrivateRouteCodeMissing"));
        setChatDeliveryNoticeByKey("peerPrivateRouteCodeMissing", "muted", input);
        if (allowRetryRecovery) {
          showPrivateRouteRetryFollowupPrompt(input);
        }
        return;
      }
      if (nextRouteAction === "apply-peer") {
        await applyPeerPrivateRouteCode({ allowRetryRecovery });
        return;
      }
      const localRouteCreated = await prepareInviteRoomPrivateRouteExchange(input, { allowRetryRecovery });
      if (!twoProfileTranscriptInputStillCurrent(input)) {
        return;
      }
      if (localRouteCreated && (fields.peerPrivateRouteCode?.value ?? "").trim()) {
        await applyPeerPrivateRouteCode({ allowRetryRecovery });
      }
      return;
    }

    setChatDeliveryNoticeByKey("privateDeliveryRoutePreparing", "progress", input);
    const refreshed = await refreshProductionTwoProfilePeerEndpoints(input, { allowRetryRecovery });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    if (allowRetryRecovery && refreshed && showPrivateRouteRetryFollowupPrompt(input, { clear: true })) {
      return;
    }
    if (allowRetryRecovery && refreshed && showLatestRetryableOutboundNotice(input, { allowAutomatic: false })) {
      return;
    }
    setChatDeliveryNoticeByKey(
      refreshed ? "privateDeliveryRouteReady" : "chatNoticeRefreshAddress",
      refreshed ? "success" : "warning",
      input,
    );
  }

  return { bindPanelControls, enablePrivateDeliveryPermission, preparePrivateDeliveryRoute };
}

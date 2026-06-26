export function createDesktopPanelController(input) {
  const {
    document,
    fields,
    setManualNetworkPermission,
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
      fields.closeAppSettings.addEventListener("click", () => {
        closeAppSettingsPanel();
        systemPanelSummary()?.focus?.();
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

  return { bindPanelControls };
}

export function createInviteQrController(input) {
  const {
    fields,
    t,
    normalizeInviteQrPayload,
    buildInviteQrSvgDataUrl,
    canImportInviteQr,
    decodeInviteQrFile,
    connectionCodeRoleFor,
    getCurrentInviteCodeShareVisible,
    setProductionTwoProfileState,
    setText,
    renderReceivedInviteCodeActionState,
    createRoomFromReceivedInviteCode,
  } = input;

  let currentInviteQrVisible = false;

  function setInviteQrPanel(code, visible) {
    const normalizedCode = normalizeInviteQrPayload(code);
    const show = Boolean(visible && normalizedCode);
    currentInviteQrVisible = show;
    if (fields.inviteQrPanel) {
      fields.inviteQrPanel.hidden = !show;
    }
    if (fields.inviteQrImage) {
      fields.inviteQrImage.hidden = !show;
      fields.inviteQrImage.src = show ? buildInviteQrSvgDataUrl(normalizedCode) : "";
    }
  }

  function closeInviteQrPanel() {
    setInviteQrPanel("", false);
  }

  async function showCurrentInviteQr() {
    const code = normalizeInviteQrPayload(fields.productionTwoProfileB?.value ?? "");
    if (!code || connectionCodeRoleFor(code) !== "inviter" || !getCurrentInviteCodeShareVisible()) {
      setProductionTwoProfileState("Invite QR unavailable");
      setText(fields.productionTwoProfileWarning, t("inviteQrUnavailable"));
      return false;
    }
    setInviteQrPanel(code, true);
    return true;
  }

  async function importReceivedInviteQr() {
    if (!canImportInviteQr()) {
      setProductionTwoProfileState("Invite QR import unavailable");
      setText(fields.productionTwoProfileWarning, t("inviteQrImportUnavailable"));
      return false;
    }
    fields.receivedInviteQrFile?.click?.();
    return true;
  }

  async function handleReceivedInviteQrFileChange(event) {
    const [file] = Array.from(event?.target?.files ?? []);
    if (!file) {
      return false;
    }
    try {
      const code = normalizeInviteQrPayload(await decodeInviteQrFile(file));
      if (fields.receivedInviteCode) {
        fields.receivedInviteCode.value = code;
      }
      renderReceivedInviteCodeActionState();
      setProductionTwoProfileState("Invite QR imported");
      setText(fields.productionTwoProfileWarning, t("inviteQrImportReady"));
      return createRoomFromReceivedInviteCode();
    } catch {
      setProductionTwoProfileState("Invite QR import failed");
      setText(fields.productionTwoProfileWarning, t("inviteQrImportFailed"));
      return false;
    } finally {
      if (fields.receivedInviteQrFile) {
        fields.receivedInviteQrFile.value = "";
      }
    }
  }

  function bindInviteQrControls() {
    if (fields.importReceivedInviteQr) {
      fields.importReceivedInviteQr.addEventListener("click", importReceivedInviteQr);
    }
    if (fields.receivedInviteQrFile) {
      fields.receivedInviteQrFile.addEventListener("change", handleReceivedInviteQrFileChange);
    }
    if (fields.showCreatedInviteQr) {
      fields.showCreatedInviteQr.addEventListener("click", showCurrentInviteQr);
    }
    if (fields.hideInviteQr) {
      fields.hideInviteQr.addEventListener("click", closeInviteQrPanel);
    }
  }

  return {
    bindInviteQrControls,
    closeInviteQrPanel,
    handleReceivedInviteQrFileChange,
    importReceivedInviteQr,
    isInviteQrVisible: () => currentInviteQrVisible,
    setInviteQrPanel,
    showCurrentInviteQr,
  };
}

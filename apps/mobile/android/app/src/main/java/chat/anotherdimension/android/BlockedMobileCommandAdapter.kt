package chat.anotherdimension.android

interface BlockedMobileCommandAdapter {
    val blockedCommandSurfaceInventory: List<String>
    val publicNonClaimsBoundary: List<String>

    fun profileUnlockLockStatus(passphraseProvided: Boolean): SharedCoreCommandResult
    fun inviteCodeCreateJoin(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun pairingPayloadExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun safetyTranscriptConfirm(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun manualEnvelopeExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun messageTranscriptView(): SharedCoreCommandResult
    fun localDataLifecycle(action: ExplicitUserActionToken): SharedCoreCommandResult
}

class SourceBoundaryBlockedMobileCommandAdapter : BlockedMobileCommandAdapter {
    override val blockedCommandSurfaceInventory = listOf(
        "profile_unlock_lock_status",
        "invite_code_create_join",
        "pairing_payload_export_import",
        "safety_transcript_confirm",
        "manual_envelope_export_import",
        "message_transcript_view",
        "local_data_lifecycle",
    )

    override val publicNonClaimsBoundary = listOf(
        "unsigned experimental public beta",
        "sensitive communication prohibited",
        "not audited",
        "not production-ready",
        "external onion delivery not claimed",
        "mobile readiness not claimed",
    )

    override fun profileUnlockLockStatus(passphraseProvided: Boolean): SharedCoreCommandResult {
        return if (passphraseProvided) {
            blocked("ffi_unavailable", "connect shared Rust core binding for profile_unlock_lock_status")
        } else {
            blocked("locked_profile", "enter passphrase")
        }
    }

    override fun inviteCodeCreateJoin(action: ExplicitUserActionToken): SharedCoreCommandResult =
        explicitActionBoundary(action, "invite_code_create_join")

    override fun pairingPayloadExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult =
        explicitActionBoundary(action, "pairing_payload_export_import")

    override fun safetyTranscriptConfirm(action: ExplicitUserActionToken): SharedCoreCommandResult =
        explicitActionBoundary(action, "safety_transcript_confirm")

    override fun manualEnvelopeExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult =
        explicitActionBoundary(action, "manual_envelope_export_import")

    override fun messageTranscriptView(): SharedCoreCommandResult =
        blocked("ffi_unavailable", "load transcript through shared Rust core for message_transcript_view")

    override fun localDataLifecycle(action: ExplicitUserActionToken): SharedCoreCommandResult =
        explicitActionBoundary(action, "local_data_lifecycle")

    private fun explicitActionBoundary(
        action: ExplicitUserActionToken,
        surface: String,
    ): SharedCoreCommandResult {
        return if (action.reason.isBlank()) {
            blocked("policy_blocked", "explicit user action required")
        } else {
            blocked("ffi_unavailable", "connect shared Rust core binding for $surface")
        }
    }

    private fun blocked(failureClass: String, recoveryNextAction: String): SharedCoreCommandResult =
        SharedCoreCommandResult(
            status = "blocked",
            failureClass = failureClass,
            recoveryNextAction = recoveryNextAction,
        )
}

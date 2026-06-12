package chat.anotherdimension.android

data class ExplicitUserActionToken(val reason: String)

data class SharedCoreStatusDto(
    val schemaVersion: Int,
    val platform: String,
    val profileLockState: String,
    val runtimeCommandSurface: List<String>,
    val mobileCommandSurface: List<String>,
    val localDataLifecycleState: String,
    val backupExclusionState: String,
    val installUpdateIntegrityState: String,
    val diagnosticsRedactionState: String,
    val publicNonClaims: List<String>,
)

data class SharedCoreCommandResult(
    val status: String,
    val failureClass: String,
    val recoveryNextAction: String,
)

interface SharedCoreMobileApi {
    fun sharedCoreStatusSurface(): SharedCoreStatusDto
    fun profileUnlockLockStatus(passphraseProvided: Boolean): SharedCoreCommandResult
    fun inviteCodeCreateJoin(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun pairingPayloadExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun safetyTranscriptConfirm(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun manualEnvelopeExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun messageTranscriptView(): SharedCoreCommandResult
    fun localDataLifecycle(action: ExplicitUserActionToken): SharedCoreCommandResult
    fun redactedSupportDiagnostics(): SharedCoreStatusDto
}

class AndroidSharedCoreBoundary : SharedCoreMobileApi {
    override fun sharedCoreStatusSurface(): SharedCoreStatusDto = redactedStatus(
        profileLockState = "locked",
        localDataLifecycleState = "app-private storage required",
        diagnosticsRedactionState = "redacted status only",
    )

    override fun profileUnlockLockStatus(passphraseProvided: Boolean): SharedCoreCommandResult {
        return if (passphraseProvided) {
            blocked("ffi_unavailable", "connect shared Rust core binding")
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
        blocked("ffi_unavailable", "load transcript through shared Rust core")

    override fun localDataLifecycle(action: ExplicitUserActionToken): SharedCoreCommandResult =
        explicitActionBoundary(action, "local_data_lifecycle")

    override fun redactedSupportDiagnostics(): SharedCoreStatusDto = redactedStatus(
        profileLockState = "locked",
        localDataLifecycleState = "local lifecycle status only",
        diagnosticsRedactionState = "status/build/failure/recovery only",
    )

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

    private fun redactedStatus(
        profileLockState: String,
        localDataLifecycleState: String,
        diagnosticsRedactionState: String,
    ): SharedCoreStatusDto = SharedCoreStatusDto(
        schemaVersion = 1,
        platform = "android_shell_candidate",
        profileLockState = profileLockState,
        runtimeCommandSurface = listOf("shared_core_runtime_command_surface"),
        mobileCommandSurface = listOf(
            "shared_core_status_surface",
            "profile_unlock_lock_status",
            "invite_code_create_join",
            "pairing_payload_export_import",
            "safety_transcript_confirm",
            "manual_envelope_export_import",
            "message_transcript_view",
            "local_data_lifecycle",
            "redacted_support_diagnostics",
        ),
        localDataLifecycleState = localDataLifecycleState,
        backupExclusionState = "cloud backup not claimed",
        installUpdateIntegrityState = "manual update verification required",
        diagnosticsRedactionState = diagnosticsRedactionState,
        publicNonClaims = listOf(
            "unsigned experimental public beta",
            "sensitive communication prohibited",
            "not audited",
            "not production-ready",
            "external onion delivery not claimed",
            "security-ready not claimed",
            "mobile readiness not claimed",
        ),
    )

    private fun blocked(failureClass: String, recoveryNextAction: String): SharedCoreCommandResult =
        SharedCoreCommandResult(
            status = "blocked",
            failureClass = failureClass,
            recoveryNextAction = recoveryNextAction,
        )
}

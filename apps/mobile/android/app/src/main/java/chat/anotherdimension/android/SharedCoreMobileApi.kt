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

class AndroidSharedCoreBoundary(
    private val readOnlyStatusAdapter: ReadOnlyNativeStatusAdapter = SourceBoundaryReadOnlyNativeStatusAdapter(),
    private val blockedCommandAdapter: BlockedMobileCommandAdapter = SourceBoundaryBlockedMobileCommandAdapter(),
) : SharedCoreMobileApi {
    private val sourceBoundaryApiGroupInventory = listOf(
        "shared_core_status_surface",
        "profile_unlock_lock_status",
        "invite_code_create_join",
        "pairing_payload_export_import",
        "safety_transcript_confirm",
        "manual_envelope_export_import",
        "message_transcript_view",
        "local_data_lifecycle",
        "redacted_support_diagnostics",
    )
    private val sourceBoundaryPublicNonClaims = listOf(
        "unsigned experimental public beta",
        "sensitive communication prohibited",
        "not audited",
        "not production-ready",
        "external onion delivery not claimed",
        "mobile readiness not claimed",
    )
    private val sourceBoundaryBlockedErrorTaxonomy = listOf(
        "locked_profile",
        "policy_blocked",
        "ffi_unavailable",
        "explicit user action required",
    )

    override fun sharedCoreStatusSurface(): SharedCoreStatusDto =
        readOnlyStatusAdapter.sharedCoreStatusSurface()

    override fun profileUnlockLockStatus(passphraseProvided: Boolean): SharedCoreCommandResult =
        blockedCommandAdapter.profileUnlockLockStatus(passphraseProvided)

    override fun inviteCodeCreateJoin(action: ExplicitUserActionToken): SharedCoreCommandResult =
        blockedCommandAdapter.inviteCodeCreateJoin(action)

    override fun pairingPayloadExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult =
        blockedCommandAdapter.pairingPayloadExportImport(action)

    override fun safetyTranscriptConfirm(action: ExplicitUserActionToken): SharedCoreCommandResult =
        blockedCommandAdapter.safetyTranscriptConfirm(action)

    override fun manualEnvelopeExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult =
        blockedCommandAdapter.manualEnvelopeExportImport(action)

    override fun messageTranscriptView(): SharedCoreCommandResult =
        blockedCommandAdapter.messageTranscriptView()

    override fun localDataLifecycle(action: ExplicitUserActionToken): SharedCoreCommandResult =
        blockedCommandAdapter.localDataLifecycle(action)

    override fun redactedSupportDiagnostics(): SharedCoreStatusDto =
        readOnlyStatusAdapter.redactedSupportDiagnostics()
}

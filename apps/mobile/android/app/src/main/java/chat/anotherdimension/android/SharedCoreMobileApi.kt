package chat.anotherdimension.android

data class ExplicitUserActionToken(val reason: String)

val sharedCoreMobileErrorTaxonomy = listOf(
    "locked_profile",
    "malformed_payload",
    "replay_rejected",
    "policy_blocked",
    "transport_unavailable",
    "unsupported_mobile_surface",
    "lifecycle_confirmation_required",
    "ffi_unavailable",
)

val sharedCoreMobileUnavailableActions = listOf(
    "native_network_delivery",
    "runtime_messaging",
    "push_notification_delivery",
    "cloud_backup",
    "account_contact_discovery",
    "mobile_public_artifact",
)

val sharedCoreMobileLocalPrivacyBoundary = listOf(
    "platform_private_app_data_only",
    "encrypted_local_store_through_shared_core",
    "redacted_support_diagnostics_only",
    "no_cloud_backup",
)

val sharedCoreMobileRecoveryActions = listOf(
    "enter passphrase",
    "show redacted parse failure",
    "show redacted replay rejection",
    "explicit user action required",
    "manual transport action required",
    "use desktop source boundary",
    "confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle",
    "connect shared Rust core binding",
)

data class SharedCoreStatusDto(
    val schemaVersion: Int,
    val platform: String,
    val appPurpose: String,
    val profileLockState: String,
    val runtimeCommandSurface: List<String>,
    val mobileCommandSurface: List<String>,
    val unavailableActions: List<String>,
    val localDataLifecycleState: String,
    val localPrivacyBoundary: List<String>,
    val backupExclusionState: String,
    val installUpdateIntegrityState: String,
    val diagnosticsRedactionState: String,
    val publicNonClaims: List<String>,
    val errorTaxonomy: List<String>,
    val fcmEnabled: Boolean,
    val apnsEnabled: Boolean,
    val cloudBackupClaimed: Boolean,
    val icloudBackupClaimed: Boolean,
    val accountContactDiscoveryClaimed: Boolean,
    val independentProtocolStorageTransportClaimed: Boolean,
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
    private val sourceBoundaryBlockedErrorTaxonomy = sharedCoreMobileErrorTaxonomy

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

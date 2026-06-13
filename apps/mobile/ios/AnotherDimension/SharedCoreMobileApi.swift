import Foundation

struct ExplicitUserActionToken {
    let reason: String
}

let sharedCoreMobileErrorTaxonomy = [
    "locked_profile",
    "malformed_payload",
    "replay_rejected",
    "policy_blocked",
    "transport_unavailable",
    "unsupported_mobile_surface",
    "lifecycle_confirmation_required",
    "ffi_unavailable",
]

let sharedCoreMobileUnavailableActions = [
    "native_network_delivery",
    "runtime_messaging",
    "push_notification_delivery",
    "cloud_backup",
    "account_contact_discovery",
    "mobile_public_artifact",
]

let sharedCoreMobileLocalPrivacyBoundary = [
    "platform_private_app_data_only",
    "encrypted_local_store_through_shared_core",
    "redacted_support_diagnostics_only",
    "no_cloud_backup",
]

let sharedCoreMobileRecoveryActions = [
    "enter passphrase",
    "show redacted parse failure",
    "show redacted replay rejection",
    "explicit user action required",
    "manual transport action required",
    "use desktop source boundary",
    "confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle",
    "connect shared Rust core binding",
]

struct SharedCoreStatusDto {
    let schemaVersion: Int
    let platform: String
    let appPurpose: String
    let profileLockState: String
    let runtimeCommandSurface: [String]
    let mobileCommandSurface: [String]
    let unavailableActions: [String]
    let localDataLifecycleState: String
    let localPrivacyBoundary: [String]
    let backupExclusionState: String
    let installUpdateIntegrityState: String
    let diagnosticsRedactionState: String
    let publicNonClaims: [String]
    let errorTaxonomy: [String]
    let fcmEnabled: Bool
    let apnsEnabled: Bool
    let cloudBackupClaimed: Bool
    let icloudBackupClaimed: Bool
    let accountContactDiscoveryClaimed: Bool
    let independentProtocolStorageTransportClaimed: Bool
}

struct SharedCoreCommandResult {
    let status: String
    let failureClass: String
    let recoveryNextAction: String
}

protocol SharedCoreMobileApi {
    func sharedCoreStatusSurface() -> SharedCoreStatusDto
    func profileUnlockLockStatus(passphraseProvided: Bool) -> SharedCoreCommandResult
    func inviteCodeCreateJoin(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func pairingPayloadExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func safetyTranscriptConfirm(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func manualEnvelopeExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func messageTranscriptView() -> SharedCoreCommandResult
    func localDataLifecycle(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func redactedSupportDiagnostics() -> SharedCoreStatusDto
}

final class IOSSharedCoreBoundary: SharedCoreMobileApi {
    private let readOnlyStatusAdapter: ReadOnlyNativeStatusAdapter
    private let blockedCommandAdapter: BlockedMobileCommandAdapter
    private let sourceBoundaryApiGroupInventory = [
        "shared_core_status_surface",
        "profile_unlock_lock_status",
        "invite_code_create_join",
        "pairing_payload_export_import",
        "safety_transcript_confirm",
        "manual_envelope_export_import",
        "message_transcript_view",
        "local_data_lifecycle",
        "redacted_support_diagnostics",
    ]
    private let sourceBoundaryPublicNonClaims = [
        "unsigned experimental public beta",
        "sensitive communication prohibited",
        "not audited",
        "not production-ready",
        "external onion delivery not claimed",
        "mobile readiness not claimed",
    ]
    private let sourceBoundaryBlockedErrorTaxonomy = sharedCoreMobileErrorTaxonomy

    init(
        readOnlyStatusAdapter: ReadOnlyNativeStatusAdapter = SourceBoundaryReadOnlyNativeStatusAdapter(),
        blockedCommandAdapter: BlockedMobileCommandAdapter = SourceBoundaryBlockedMobileCommandAdapter()
    ) {
        self.readOnlyStatusAdapter = readOnlyStatusAdapter
        self.blockedCommandAdapter = blockedCommandAdapter
    }

    func sharedCoreStatusSurface() -> SharedCoreStatusDto {
        readOnlyStatusAdapter.sharedCoreStatusSurface()
    }

    func profileUnlockLockStatus(passphraseProvided: Bool) -> SharedCoreCommandResult {
        blockedCommandAdapter.profileUnlockLockStatus(passphraseProvided: passphraseProvided)
    }

    func inviteCodeCreateJoin(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        blockedCommandAdapter.inviteCodeCreateJoin(action: action)
    }

    func pairingPayloadExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        blockedCommandAdapter.pairingPayloadExportImport(action: action)
    }

    func safetyTranscriptConfirm(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        blockedCommandAdapter.safetyTranscriptConfirm(action: action)
    }

    func manualEnvelopeExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        blockedCommandAdapter.manualEnvelopeExportImport(action: action)
    }

    func messageTranscriptView() -> SharedCoreCommandResult {
        blockedCommandAdapter.messageTranscriptView()
    }

    func localDataLifecycle(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        blockedCommandAdapter.localDataLifecycle(action: action)
    }

    func redactedSupportDiagnostics() -> SharedCoreStatusDto {
        readOnlyStatusAdapter.redactedSupportDiagnostics()
    }
}

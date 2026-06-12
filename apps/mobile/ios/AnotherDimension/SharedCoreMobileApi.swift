import Foundation

struct ExplicitUserActionToken {
    let reason: String
}

struct SharedCoreStatusDto {
    let schemaVersion: Int
    let platform: String
    let profileLockState: String
    let runtimeCommandSurface: [String]
    let mobileCommandSurface: [String]
    let localDataLifecycleState: String
    let backupExclusionState: String
    let installUpdateIntegrityState: String
    let diagnosticsRedactionState: String
    let publicNonClaims: [String]
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
    private let sourceBoundaryBlockedErrorTaxonomy = [
        "locked_profile",
        "policy_blocked",
        "ffi_unavailable",
        "explicit user action required",
    ]

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

import Foundation

protocol BlockedMobileCommandAdapter {
    var blockedCommandSurfaceInventory: [String] { get }
    var publicNonClaimsBoundary: [String] { get }

    func profileUnlockLockStatus(passphraseProvided: Bool) -> SharedCoreCommandResult
    func inviteCodeCreateJoin(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func pairingPayloadExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func safetyTranscriptConfirm(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func manualEnvelopeExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult
    func messageTranscriptView() -> SharedCoreCommandResult
    func localDataLifecycle(action: ExplicitUserActionToken) -> SharedCoreCommandResult
}

final class SourceBoundaryBlockedMobileCommandAdapter: BlockedMobileCommandAdapter {
    let blockedCommandSurfaceInventory = [
        "profile_unlock_lock_status",
        "invite_code_create_join",
        "pairing_payload_export_import",
        "safety_transcript_confirm",
        "manual_envelope_export_import",
        "message_transcript_view",
        "local_data_lifecycle",
    ]

    let publicNonClaimsBoundary = [
        "unsigned experimental public beta",
        "sensitive communication prohibited",
        "not audited",
        "not production-ready",
        "external onion delivery not claimed",
        "mobile readiness not claimed",
    ]

    func profileUnlockLockStatus(passphraseProvided: Bool) -> SharedCoreCommandResult {
        if passphraseProvided {
            return blocked(
                failureClass: "ffi_unavailable",
                recoveryNextAction: "connect shared Rust core binding for profile_unlock_lock_status"
            )
        }
        return blocked(failureClass: "locked_profile", recoveryNextAction: "enter passphrase")
    }

    func inviteCodeCreateJoin(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        explicitActionBoundary(action: action, surface: "invite_code_create_join")
    }

    func pairingPayloadExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        explicitActionBoundary(action: action, surface: "pairing_payload_export_import")
    }

    func safetyTranscriptConfirm(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        explicitActionBoundary(action: action, surface: "safety_transcript_confirm")
    }

    func manualEnvelopeExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        explicitActionBoundary(action: action, surface: "manual_envelope_export_import")
    }

    func messageTranscriptView() -> SharedCoreCommandResult {
        blocked(
            failureClass: "ffi_unavailable",
            recoveryNextAction: "load transcript through shared Rust core for message_transcript_view"
        )
    }

    func localDataLifecycle(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        if action.reason.isEmpty {
            return blocked(failureClass: "policy_blocked", recoveryNextAction: "explicit user action required")
        }
        return blocked(
            failureClass: "lifecycle_confirmation_required",
            recoveryNextAction: "confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle"
        )
    }

    private func explicitActionBoundary(action: ExplicitUserActionToken, surface: String) -> SharedCoreCommandResult {
        if action.reason.isEmpty {
            return blocked(failureClass: "policy_blocked", recoveryNextAction: "explicit user action required")
        }
        return blocked(failureClass: "ffi_unavailable", recoveryNextAction: "connect shared Rust core binding for \(surface)")
    }

    private func blocked(failureClass: String, recoveryNextAction: String) -> SharedCoreCommandResult {
        SharedCoreCommandResult(
            status: "blocked",
            failureClass: failureClass,
            recoveryNextAction: recoveryNextAction
        )
    }
}

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
    func sharedCoreStatusSurface() -> SharedCoreStatusDto {
        redactedStatus(
            profileLockState: "locked",
            localDataLifecycleState: "app-container storage required",
            diagnosticsRedactionState: "redacted status only"
        )
    }

    func profileUnlockLockStatus(passphraseProvided: Bool) -> SharedCoreCommandResult {
        if passphraseProvided {
            return blocked(failureClass: "ffi_unavailable", recoveryNextAction: "connect shared Rust core binding")
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
        blocked(failureClass: "ffi_unavailable", recoveryNextAction: "load transcript through shared Rust core")
    }

    func localDataLifecycle(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        explicitActionBoundary(action: action, surface: "local_data_lifecycle")
    }

    func redactedSupportDiagnostics() -> SharedCoreStatusDto {
        redactedStatus(
            profileLockState: "locked",
            localDataLifecycleState: "local lifecycle status only",
            diagnosticsRedactionState: "status/build/failure/recovery only"
        )
    }

    private func explicitActionBoundary(action: ExplicitUserActionToken, surface: String) -> SharedCoreCommandResult {
        if action.reason.isEmpty {
            return blocked(failureClass: "policy_blocked", recoveryNextAction: "explicit user action required")
        }
        return blocked(failureClass: "ffi_unavailable", recoveryNextAction: "connect shared Rust core binding for \(surface)")
    }

    private func redactedStatus(
        profileLockState: String,
        localDataLifecycleState: String,
        diagnosticsRedactionState: String
    ) -> SharedCoreStatusDto {
        SharedCoreStatusDto(
            schemaVersion: 1,
            platform: "ios_shell_candidate",
            profileLockState: profileLockState,
            runtimeCommandSurface: ["shared_core_runtime_command_surface"],
            mobileCommandSurface: [
                "shared_core_status_surface",
                "profile_unlock_lock_status",
                "invite_code_create_join",
                "pairing_payload_export_import",
                "safety_transcript_confirm",
                "manual_envelope_export_import",
                "message_transcript_view",
                "local_data_lifecycle",
                "redacted_support_diagnostics",
            ],
            localDataLifecycleState: localDataLifecycleState,
            backupExclusionState: "iCloud backup not claimed",
            installUpdateIntegrityState: "manual update verification required",
            diagnosticsRedactionState: diagnosticsRedactionState,
            publicNonClaims: [
                "unsigned experimental public beta",
                "sensitive communication prohibited",
                "not audited",
                "not production-ready",
                "external onion delivery not claimed",
                "security-ready not claimed",
                "mobile readiness not claimed",
            ]
        )
    }

    private func blocked(failureClass: String, recoveryNextAction: String) -> SharedCoreCommandResult {
        SharedCoreCommandResult(
            status: "blocked",
            failureClass: failureClass,
            recoveryNextAction: recoveryNextAction
        )
    }
}

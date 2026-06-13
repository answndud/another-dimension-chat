import Foundation

protocol ReadOnlyNativeStatusAdapter {
    func sharedCoreStatusSurface() -> SharedCoreStatusDto
    func redactedSupportDiagnostics() -> SharedCoreStatusDto
}

final class SourceBoundaryReadOnlyNativeStatusAdapter: ReadOnlyNativeStatusAdapter {
    func sharedCoreStatusSurface() -> SharedCoreStatusDto {
        redactedStatus(
            profileLockState: "locked",
            localDataLifecycleState: "app-container storage required",
            diagnosticsRedactionState: "redacted status only"
        )
    }

    func redactedSupportDiagnostics() -> SharedCoreStatusDto {
        redactedStatus(
            profileLockState: "locked",
            localDataLifecycleState: "local lifecycle status only",
            diagnosticsRedactionState: "status/build/failure/recovery only"
        )
    }

    private func redactedStatus(
        profileLockState: String,
        localDataLifecycleState: String,
        diagnosticsRedactionState: String
    ) -> SharedCoreStatusDto {
        SharedCoreStatusDto(
            schemaVersion: 1,
            platform: "ios_shell_candidate",
            appPurpose: "no-central-trusted-server-1:1-private-messenger",
            profileLockState: profileLockState,
            runtimeCommandSurface: ["shared_core_runtime_command_surface"],
            mobileCommandSurface: [
                "shared_core_status_surface",
                "redacted_support_diagnostics",
            ],
            unavailableActions: sharedCoreMobileUnavailableActions,
            localDataLifecycleState: localDataLifecycleState,
            localPrivacyBoundary: sharedCoreMobileLocalPrivacyBoundary,
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
            ],
            errorTaxonomy: sharedCoreMobileErrorTaxonomy,
            fcmEnabled: false,
            apnsEnabled: false,
            cloudBackupClaimed: false,
            icloudBackupClaimed: false,
            accountContactDiscoveryClaimed: false,
            independentProtocolStorageTransportClaimed: false
        )
    }
}

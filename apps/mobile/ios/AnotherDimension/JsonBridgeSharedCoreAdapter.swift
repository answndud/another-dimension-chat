import Foundation

protocol SharedCoreJsonBridge {
    func sharedCoreStatusSurfaceJson(platform: String) -> String
    func redactedSupportDiagnosticsJson(platform: String) -> String
    func mobileCommandResultJson(command: String, explicitUserAction: Bool) -> String
}

final class RuntimeScopeUnlockedJsonBridgeMobileApi: SharedCoreMobileApi {
    private let bridge: SharedCoreJsonBridge

    init(bridge: SharedCoreJsonBridge) {
        self.bridge = bridge
    }

    func sharedCoreStatusSurface() -> SharedCoreStatusDto {
        decodeStatus(bridge.sharedCoreStatusSurfaceJson(platform: "ios_runtime_candidate"))
    }

    func profileUnlockLockStatus(passphraseProvided: Bool) -> SharedCoreCommandResult {
        decodeResult(bridge.mobileCommandResultJson(command: "profile_unlock_lock_status", explicitUserAction: passphraseProvided))
    }

    func inviteCodeCreateJoin(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        decodeResult(bridge.mobileCommandResultJson(command: "invite_code_create_join", explicitUserAction: !action.reason.isEmpty))
    }

    func pairingPayloadExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        decodeResult(bridge.mobileCommandResultJson(command: "pairing_payload_export_import", explicitUserAction: !action.reason.isEmpty))
    }

    func safetyTranscriptConfirm(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        decodeResult(bridge.mobileCommandResultJson(command: "safety_transcript_confirm", explicitUserAction: !action.reason.isEmpty))
    }

    func manualEnvelopeExportImport(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        decodeResult(bridge.mobileCommandResultJson(command: "manual_envelope_export_import", explicitUserAction: !action.reason.isEmpty))
    }

    func messageTranscriptView() -> SharedCoreCommandResult {
        decodeResult(bridge.mobileCommandResultJson(command: "message_transcript_view", explicitUserAction: true))
    }

    func localDataLifecycle(action: ExplicitUserActionToken) -> SharedCoreCommandResult {
        decodeResult(bridge.mobileCommandResultJson(command: "local_data_lifecycle", explicitUserAction: !action.reason.isEmpty))
    }

    func redactedSupportDiagnostics() -> SharedCoreStatusDto {
        decodeStatus(bridge.redactedSupportDiagnosticsJson(platform: "ios_runtime_candidate"))
    }

    private func decodeStatus(_ json: String) -> SharedCoreStatusDto {
        let body = parseObject(json)
        return SharedCoreStatusDto(
            schemaVersion: body["schema_version"] as? Int ?? 1,
            platform: body["platform"] as? String ?? "ios_runtime_candidate",
            appPurpose: body["app_purpose"] as? String ?? "no-central-trusted-server-1:1-private-messenger",
            profileLockState: body["profile_lock_state"] as? String ?? "not_unlocked_by_status_bridge",
            runtimeCommandSurface: body["runtime_command_surface"] as? [String] ?? [],
            mobileCommandSurface: body["mobile_command_surface"] as? [String] ?? [],
            unavailableActions: body["unavailable_actions"] as? [String] ?? [],
            localDataLifecycleState: body["local_data_lifecycle_state"] as? String ?? "confirmation_required_no_unreviewed_mutation",
            localPrivacyBoundary: body["local_privacy_boundary"] as? [String] ?? [],
            backupExclusionState: body["backup_exclusion_state"] as? String ?? "platform_private_data_only_no_cloud_backup",
            installUpdateIntegrityState: body["install_update_integrity_state"] as? String ?? "manual_same_release_artifact_evidence_required",
            diagnosticsRedactionState: body["diagnostics_redaction_state"] as? String ?? "redacted_status_support_only",
            publicNonClaims: body["public_non_claims"] as? [String] ?? [],
            errorTaxonomy: body["error_taxonomy"] as? [String] ?? [],
            fcmEnabled: body["fcm_enabled"] as? Bool ?? false,
            apnsEnabled: body["apns_enabled"] as? Bool ?? false,
            cloudBackupClaimed: body["cloud_backup_claimed"] as? Bool ?? false,
            icloudBackupClaimed: body["icloud_backup_claimed"] as? Bool ?? false,
            accountContactDiscoveryClaimed: body["account_contact_discovery_claimed"] as? Bool ?? false,
            independentProtocolStorageTransportClaimed: body["independent_protocol_storage_transport_claimed"] as? Bool ?? false
        )
    }

    private func decodeResult(_ json: String) -> SharedCoreCommandResult {
        let body = parseObject(json)
        return SharedCoreCommandResult(
            status: body["status"] as? String ?? "blocked",
            failureClass: body["failure_class"] as? String ?? "malformed_payload",
            recoveryNextAction: body["recovery_next_action"] as? String ?? "show redacted parse failure"
        )
    }

    private func parseObject(_ json: String) -> [String: Any] {
        guard
            let data = json.data(using: .utf8),
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return [:]
        }
        return object
    }
}

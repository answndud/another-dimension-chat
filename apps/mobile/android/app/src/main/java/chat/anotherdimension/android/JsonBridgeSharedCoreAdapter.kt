package chat.anotherdimension.android

import org.json.JSONArray
import org.json.JSONObject

interface SharedCoreJsonBridge {
    fun sharedCoreStatusSurfaceJson(platform: String): String
    fun redactedSupportDiagnosticsJson(platform: String): String
    fun mobileCommandResultJson(command: String, explicitUserAction: Boolean): String
}

class RuntimeScopeUnlockedJsonBridgeMobileApi(
    private val bridge: SharedCoreJsonBridge,
) : SharedCoreMobileApi {
    override fun sharedCoreStatusSurface(): SharedCoreStatusDto =
        decodeStatus(bridge.sharedCoreStatusSurfaceJson("android_runtime_candidate"))

    override fun profileUnlockLockStatus(passphraseProvided: Boolean): SharedCoreCommandResult =
        decodeResult(bridge.mobileCommandResultJson("profile_unlock_lock_status", passphraseProvided))

    override fun inviteCodeCreateJoin(action: ExplicitUserActionToken): SharedCoreCommandResult =
        decodeResult(bridge.mobileCommandResultJson("invite_code_create_join", action.reason.isNotBlank()))

    override fun pairingPayloadExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult =
        decodeResult(bridge.mobileCommandResultJson("pairing_payload_export_import", action.reason.isNotBlank()))

    override fun safetyTranscriptConfirm(action: ExplicitUserActionToken): SharedCoreCommandResult =
        decodeResult(bridge.mobileCommandResultJson("safety_transcript_confirm", action.reason.isNotBlank()))

    override fun manualEnvelopeExportImport(action: ExplicitUserActionToken): SharedCoreCommandResult =
        decodeResult(bridge.mobileCommandResultJson("manual_envelope_export_import", action.reason.isNotBlank()))

    override fun messageTranscriptView(): SharedCoreCommandResult =
        decodeResult(bridge.mobileCommandResultJson("message_transcript_view", true))

    override fun localDataLifecycle(action: ExplicitUserActionToken): SharedCoreCommandResult =
        decodeResult(bridge.mobileCommandResultJson("local_data_lifecycle", action.reason.isNotBlank()))

    override fun redactedSupportDiagnostics(): SharedCoreStatusDto =
        decodeStatus(bridge.redactedSupportDiagnosticsJson("android_runtime_candidate"))

    private fun decodeStatus(json: String): SharedCoreStatusDto {
        val body = JSONObject(json)
        return SharedCoreStatusDto(
            schemaVersion = body.getInt("schema_version"),
            platform = body.getString("platform"),
            profileLockState = body.optString("profile_lock_state", "not_unlocked_by_status_bridge"),
            runtimeCommandSurface = body.optJSONArray("runtime_command_surface").asStringList(),
            mobileCommandSurface = body.optJSONArray("mobile_command_surface").asStringList(),
            localDataLifecycleState = body.optString("local_data_lifecycle_state", "confirmation_required_no_unreviewed_mutation"),
            backupExclusionState = body.optString("backup_exclusion_state", "platform_private_data_only_no_cloud_backup"),
            installUpdateIntegrityState = body.optString("install_update_integrity_state", "manual_same_release_artifact_evidence_required"),
            diagnosticsRedactionState = body.getString("diagnostics_redaction_state"),
            publicNonClaims = body.getJSONArray("public_non_claims").asStringList(),
        )
    }

    private fun decodeResult(json: String): SharedCoreCommandResult {
        val body = JSONObject(json)
        return SharedCoreCommandResult(
            status = body.getString("status"),
            failureClass = body.getString("failure_class"),
            recoveryNextAction = body.getString("recovery_next_action"),
        )
    }
}

private fun JSONArray?.asStringList(): List<String> {
    if (this == null) return emptyList()
    return List(length()) { index -> getString(index) }
}

package chat.anotherdimension.android

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.text.InputType
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private val sharedCore: SharedCoreMobileApi = AndroidSharedCoreBoundary()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val status = sharedCore.sharedCoreStatusSurface()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }

        val title = TextView(this).apply {
            text = "Another Dimension"
            textSize = 22f
        }
        val purpose = TextView(this).apply {
            text = "app_purpose=${status.appPurpose}"
        }
        val warning = TextView(this).apply {
            text = renderPublicNonClaims(status)
        }
        val mobileBoundary = TextView(this).apply {
            text = renderMobilePublicBoundary(status)
        }
        val passphrase = EditText(this).apply {
            hint = "Passphrase"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        val statusView = TextView(this).apply {
            text = renderLaunchNetworkRuntimeBoundary(status)
        }
        val unlock = Button(this).apply {
            text = "Unlock"
            setOnClickListener {
                val result = sharedCore.profileUnlockLockStatus(
                    passphraseProvided = passphrase.text.isNotEmpty(),
                )
                statusView.text = renderResult(result)
            }
        }
        val invite = Button(this).apply {
            text = "Invite"
            setOnClickListener {
                statusView.text = renderResult(
                    sharedCore.inviteCodeCreateJoin(ExplicitUserActionToken("tap_invite")),
                )
            }
        }
        val pairing = Button(this).apply {
            text = "Pairing"
            setOnClickListener {
                statusView.text = renderResult(
                    sharedCore.pairingPayloadExportImport(
                        ExplicitUserActionToken("tap_pairing_payload"),
                    ),
                )
            }
        }
        val safety = Button(this).apply {
            text = "Safety"
            setOnClickListener {
                statusView.text = renderResult(
                    sharedCore.safetyTranscriptConfirm(
                        ExplicitUserActionToken("tap_safety_transcript"),
                    ),
                )
            }
        }
        val envelope = Button(this).apply {
            text = "Envelope"
            setOnClickListener {
                statusView.text = renderResult(
                    sharedCore.manualEnvelopeExportImport(
                        ExplicitUserActionToken("tap_manual_envelope"),
                    ),
                )
            }
        }
        val transcript = Button(this).apply {
            text = "Transcript"
            setOnClickListener {
                statusView.text = renderResult(sharedCore.messageTranscriptView())
            }
        }
        val diagnostics = Button(this).apply {
            text = "Diagnostics"
            setOnClickListener {
                statusView.text = renderStatus(sharedCore.redactedSupportDiagnostics())
            }
        }
        val copyDiagnostics = Button(this).apply {
            text = "Copy Diagnostics"
            setOnClickListener {
                statusView.text = copyRedactedDiagnosticsPayload(sharedCore.redactedSupportDiagnostics())
            }
        }
        val lifecycle = Button(this).apply {
            text = "Lifecycle"
            setOnClickListener {
                statusView.text = renderLifecycleConfirmationBoundary(
                    sharedCore.localDataLifecycle(ExplicitUserActionToken("tap_lifecycle_review")),
                )
            }
        }

        root.addView(title)
        root.addView(purpose)
        root.addView(warning)
        root.addView(mobileBoundary)
        root.addView(passphrase)
        root.addView(unlock)
        root.addView(invite)
        root.addView(pairing)
        root.addView(safety)
        root.addView(envelope)
        root.addView(transcript)
        root.addView(diagnostics)
        root.addView(copyDiagnostics)
        root.addView(lifecycle)
        root.addView(statusView)
        setContentView(root)
    }

    private fun renderStatus(status: SharedCoreStatusDto): String =
        listOf(
            "schema_version=${status.schemaVersion}",
            "platform=${status.platform}",
            "app_purpose=${status.appPurpose}",
            "profile_lock_state=${status.profileLockState}",
            "runtime_command_surface=${status.runtimeCommandSurface.joinToString(separator = ",")}",
            "mobile_command_surface=${status.mobileCommandSurface.joinToString(separator = ",")}",
            "unavailable_actions=${status.unavailableActions.joinToString(separator = ",")}",
            "local_data_lifecycle_state=${status.localDataLifecycleState}",
            "local_privacy_boundary=${status.localPrivacyBoundary.joinToString(separator = ",")}",
            "backup_exclusion_state=${status.backupExclusionState}",
            "install_update_integrity_state=${status.installUpdateIntegrityState}",
            "diagnostics_redaction_state=${status.diagnosticsRedactionState}",
            "error_taxonomy=${status.errorTaxonomy.joinToString(separator = ",")}",
            renderMobilePublicBoundary(status),
            renderPublicNonClaims(status),
        ).joinToString(separator = "\n")

    private fun renderResult(result: SharedCoreCommandResult): String =
        listOf(
            "status=${result.status}",
            "failure_class=${result.failureClass}",
            "recovery_next_action=${result.recoveryNextAction}",
        ).joinToString(separator = "\n")

    private fun renderPublicNonClaims(status: SharedCoreStatusDto): String =
        "public_non_claims=${status.publicNonClaims.joinToString(separator = "|")}"

    private fun renderMobilePublicBoundary(status: SharedCoreStatusDto): String =
        listOf(
            "unavailable_actions=${status.unavailableActions.joinToString(separator = ",")}",
            "local_privacy_boundary=${status.localPrivacyBoundary.joinToString(separator = ",")}",
            "fcm_enabled=${status.fcmEnabled}",
            "apns_enabled=${status.apnsEnabled}",
            "cloud_backup_claimed=${status.cloudBackupClaimed}",
            "icloud_backup_claimed=${status.icloudBackupClaimed}",
            "account_contact_discovery_claimed=${status.accountContactDiscoveryClaimed}",
            "independent_protocol_storage_transport_claimed=${status.independentProtocolStorageTransportClaimed}",
        ).joinToString(separator = "\n")

    private fun copyRedactedDiagnosticsPayload(status: SharedCoreStatusDto): String {
        val payload = renderRedactedDiagnosticsPayload(status)
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("another-dimension-redacted-diagnostics", payload))
        return listOf(
            "status=blocked",
            "failure_class=policy_blocked",
            "recovery_next_action=redacted diagnostics copied by explicit user action",
            "diagnostics_copy_boundary=user_initiated_local_clipboard_only",
            "copied_payload=${payload.replace("\n", "|")}",
        ).joinToString(separator = "\n")
    }

    private fun renderRedactedDiagnosticsPayload(status: SharedCoreStatusDto): String =
        listOf(
            "diagnostics_copy_boundary=user_initiated_local_clipboard_only",
            "diagnostics_payload=redacted_status_support_only",
            renderStatus(status),
        ).joinToString(separator = "\n")

    private fun renderLifecycleConfirmationBoundary(result: SharedCoreCommandResult): String =
        listOf(
            renderResult(result),
            "lifecycle_confirmation_boundary=display_only_no_local_data_mutation",
            "lifecycle_commands=conversation_delete,session_delete,profile_delete,full_local_wipe",
            "destructive_lifecycle_execution=false",
            "filesystem_path_exposed=false",
            "storage_delete_called=false",
        ).joinToString(separator = "\n")

    private fun renderLaunchNetworkRuntimeBoundary(status: SharedCoreStatusDto): String =
        listOf(
            renderStatus(status),
            "launch_network_boundary=no_native_network_permission_no_bootstrap",
            "launch_runtime_boundary=no_runtime_messaging_loop_no_background_delivery",
            "push_notification_boundary=not_requested_not_configured",
            "implicit_delivery_start=false",
            "generated_callable_binding=false",
        ).joinToString(separator = "\n")
}

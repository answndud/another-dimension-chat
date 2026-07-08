import SwiftUI

struct ContentView: View {
    let sharedCore: SharedCoreMobileApi
    @State private var passphrase = ""
    @State private var statusText: String
    @State private var redactedDiagnosticsCopyBuffer = ""

    init(sharedCore: SharedCoreMobileApi) {
        self.sharedCore = sharedCore
        _statusText = State(initialValue: ContentView.renderLaunchNetworkRuntimeBoundary(sharedCore.sharedCoreStatusSurface()))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Another Dimension")
                .font(.title)
            Text(ContentView.renderPublicNonClaims(sharedCore.sharedCoreStatusSurface()))
                .font(.footnote)
            SecureField("Passphrase", text: $passphrase)
                .textFieldStyle(.roundedBorder)
            Button("Unlock") {
                statusText = renderResult(
                    sharedCore.profileUnlockLockStatus(passphraseProvided: !passphrase.isEmpty)
                )
            }
            Button("Invite") {
                statusText = renderResult(
                    sharedCore.inviteCodeCreateJoin(action: ExplicitUserActionToken(reason: "tap_invite"))
                )
            }
            Button("Pairing") {
                statusText = renderResult(
                    sharedCore.pairingPayloadExportImport(
                        action: ExplicitUserActionToken(reason: "tap_pairing_payload")
                    )
                )
            }
            Button("Safety") {
                statusText = renderResult(
                    sharedCore.safetyTranscriptConfirm(
                        action: ExplicitUserActionToken(reason: "tap_safety_transcript")
                    )
                )
            }
            Button("Envelope") {
                statusText = renderResult(
                    sharedCore.manualEnvelopeExportImport(
                        action: ExplicitUserActionToken(reason: "tap_manual_envelope")
                    )
                )
            }
            Button("Transcript") {
                statusText = renderResult(sharedCore.messageTranscriptView())
            }
            Button("Diagnostics") {
                statusText = ContentView.renderStatus(sharedCore.redactedSupportDiagnostics())
            }
            Button("Copy Diagnostics") {
                statusText = copyRedactedDiagnosticsPayload(sharedCore.redactedSupportDiagnostics())
            }
            Button("Lifecycle") {
                statusText = ContentView.renderLifecycleConfirmationBoundary(
                    sharedCore.localDataLifecycle(action: ExplicitUserActionToken(reason: "tap_lifecycle_review"))
                )
            }
            Text(statusText)
                .font(.system(.body, design: .monospaced))
        }
        .padding()
    }

    private func renderResult(_ result: SharedCoreCommandResult) -> String {
        [
            "status=\(result.status)",
            "failure_class=\(result.failureClass)",
            "recovery_next_action=\(result.recoveryNextAction)",
        ].joined(separator: "\n")
    }

    private static func renderStatus(_ status: SharedCoreStatusDto) -> String {
        [
            "schema_version=\(status.schemaVersion)",
            "platform=\(status.platform)",
            "profile_lock_state=\(status.profileLockState)",
            "runtime_command_surface=\(status.runtimeCommandSurface.joined(separator: ","))",
            "mobile_command_surface=\(status.mobileCommandSurface.joined(separator: ","))",
            "local_data_lifecycle_state=\(status.localDataLifecycleState)",
            "backup_exclusion_state=\(status.backupExclusionState)",
            "install_update_integrity_state=\(status.installUpdateIntegrityState)",
            "diagnostics_redaction_state=\(status.diagnosticsRedactionState)",
            renderPublicNonClaims(status),
        ].joined(separator: "\n")
    }

    private static func renderPublicNonClaims(_ status: SharedCoreStatusDto) -> String {
        "public_non_claims=\(status.publicNonClaims.joined(separator: "|"))"
    }

    private func copyRedactedDiagnosticsPayload(_ status: SharedCoreStatusDto) -> String {
        let payload = ContentView.renderRedactedDiagnosticsPayload(status)
        redactedDiagnosticsCopyBuffer = payload
        return [
            "status=blocked",
            "failure_class=policy_blocked",
            "recovery_next_action=redacted diagnostics copied by explicit user action",
            "diagnostics_copy_boundary=user_initiated_local_clipboard_only",
            "copied_payload=\(payload.replacingOccurrences(of: "\n", with: "|"))",
        ].joined(separator: "\n")
    }

    private static func renderRedactedDiagnosticsPayload(_ status: SharedCoreStatusDto) -> String {
        [
            "diagnostics_copy_boundary=user_initiated_local_clipboard_only",
            "diagnostics_payload=redacted_status_support_only",
            renderStatus(status),
        ].joined(separator: "\n")
    }

    private static func renderLifecycleConfirmationBoundary(_ result: SharedCoreCommandResult) -> String {
        [
            renderResultStatic(result),
            "lifecycle_confirmation_boundary=display_only_no_local_data_mutation",
            "lifecycle_commands=conversation_delete,session_delete,profile_delete,full_local_wipe",
            "destructive_lifecycle_execution=false",
            "filesystem_path_exposed=false",
            "storage_delete_called=false",
        ].joined(separator: "\n")
    }

    private static func renderResultStatic(_ result: SharedCoreCommandResult) -> String {
        [
            "status=\(result.status)",
            "failure_class=\(result.failureClass)",
            "recovery_next_action=\(result.recoveryNextAction)",
        ].joined(separator: "\n")
    }

    private static func renderLaunchNetworkRuntimeBoundary(_ status: SharedCoreStatusDto) -> String {
        [
            renderStatus(status),
            "launch_network_boundary=no_native_network_permission_no_bootstrap",
            "launch_runtime_boundary=no_runtime_messaging_loop_no_background_delivery",
            "push_notification_boundary=not_requested_not_configured",
            "implicit_delivery_start=false",
            "generated_callable_binding=false",
        ].joined(separator: "\n")
    }
}

import SwiftUI

struct ContentView: View {
    let sharedCore: SharedCoreMobileApi
    @State private var passphrase = ""
    @State private var statusText: String

    init(sharedCore: SharedCoreMobileApi) {
        self.sharedCore = sharedCore
        _statusText = State(initialValue: ContentView.renderStatus(sharedCore.sharedCoreStatusSurface()))
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
            Button("Envelope") {
                statusText = renderResult(
                    sharedCore.manualEnvelopeExportImport(
                        action: ExplicitUserActionToken(reason: "tap_manual_envelope")
                    )
                )
            }
            Button("Diagnostics") {
                statusText = ContentView.renderStatus(sharedCore.redactedSupportDiagnostics())
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
}

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
            Text(sharedCore.sharedCoreStatusSurface().publicNonClaims.joined(separator: "\n"))
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
            "failure=\(result.failureClass)",
            "next=\(result.recoveryNextAction)",
        ].joined(separator: "\n")
    }

    private static func renderStatus(_ status: SharedCoreStatusDto) -> String {
        [
            "platform=\(status.platform)",
            "profile=\(status.profileLockState)",
            "lifecycle=\(status.localDataLifecycleState)",
            "diagnostics=\(status.diagnosticsRedactionState)",
            "backup=\(status.backupExclusionState)",
            "install=\(status.installUpdateIntegrityState)",
        ].joined(separator: "\n")
    }
}

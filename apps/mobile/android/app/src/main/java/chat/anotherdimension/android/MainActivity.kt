package chat.anotherdimension.android

import android.app.Activity
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
        val warning = TextView(this).apply {
            text = status.publicNonClaims.joinToString(separator = "\n")
        }
        val passphrase = EditText(this).apply {
            hint = "Passphrase"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        val statusView = TextView(this).apply {
            text = renderStatus(status)
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
        val diagnostics = Button(this).apply {
            text = "Diagnostics"
            setOnClickListener {
                statusView.text = renderStatus(sharedCore.redactedSupportDiagnostics())
            }
        }

        root.addView(title)
        root.addView(warning)
        root.addView(passphrase)
        root.addView(unlock)
        root.addView(invite)
        root.addView(envelope)
        root.addView(diagnostics)
        root.addView(statusView)
        setContentView(root)
    }

    private fun renderStatus(status: SharedCoreStatusDto): String =
        listOf(
            "platform=${status.platform}",
            "profile=${status.profileLockState}",
            "lifecycle=${status.localDataLifecycleState}",
            "diagnostics=${status.diagnosticsRedactionState}",
            "backup=${status.backupExclusionState}",
            "install=${status.installUpdateIntegrityState}",
        ).joinToString(separator = "\n")

    private fun renderResult(result: SharedCoreCommandResult): String =
        listOf(
            "status=${result.status}",
            "failure=${result.failureClass}",
            "next=${result.recoveryNextAction}",
        ).joinToString(separator = "\n")
}

package chat.anotherdimension.android

interface ReadOnlyNativeStatusAdapter {
    fun sharedCoreStatusSurface(): SharedCoreStatusDto
    fun redactedSupportDiagnostics(): SharedCoreStatusDto
}

class SourceBoundaryReadOnlyNativeStatusAdapter : ReadOnlyNativeStatusAdapter {
    override fun sharedCoreStatusSurface(): SharedCoreStatusDto = redactedStatus(
        profileLockState = "locked",
        localDataLifecycleState = "app-private storage required",
        diagnosticsRedactionState = "redacted status only",
    )

    override fun redactedSupportDiagnostics(): SharedCoreStatusDto = redactedStatus(
        profileLockState = "locked",
        localDataLifecycleState = "local lifecycle status only",
        diagnosticsRedactionState = "status/build/failure/recovery only",
    )

    private fun redactedStatus(
        profileLockState: String,
        localDataLifecycleState: String,
        diagnosticsRedactionState: String,
    ): SharedCoreStatusDto = SharedCoreStatusDto(
        schemaVersion = 1,
        platform = "android_shell_candidate",
        profileLockState = profileLockState,
        runtimeCommandSurface = listOf("shared_core_runtime_command_surface"),
        mobileCommandSurface = listOf(
            "shared_core_status_surface",
            "redacted_support_diagnostics",
        ),
        localDataLifecycleState = localDataLifecycleState,
        backupExclusionState = "cloud backup not claimed",
        installUpdateIntegrityState = "manual update verification required",
        diagnosticsRedactionState = diagnosticsRedactionState,
        publicNonClaims = listOf(
            "unsigned experimental public beta",
            "sensitive communication prohibited",
            "not audited",
            "not production-ready",
            "external onion delivery not claimed",
            "security-ready not claimed",
            "mobile readiness not claimed",
        ),
    )
}

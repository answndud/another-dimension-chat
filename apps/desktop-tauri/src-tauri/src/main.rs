#[cfg(all(feature = "windows-public-shell", feature = "full-runtime"))]
compile_error!("windows-public-shell must be built with --no-default-features");

#[cfg(feature = "windows-public-shell")]
fn main() {
    run_windows_public_shell();
}

#[cfg(all(not(feature = "windows-public-shell"), feature = "full-runtime"))]
fn main() {
    another_dimension_desktop_tauri::run();
}

#[cfg(feature = "windows-public-shell")]
#[derive(serde::Serialize)]
struct WindowsPublicShellStatus {
    warning: &'static str,
    artifact_type: &'static str,
    runtime_mode: &'static str,
    engine_sidecar_required: bool,
    engine_sidecar_present: bool,
    full_runtime_compiled: bool,
    onion_runtime_compiled: bool,
    manual_e2ee_runtime_available: bool,
    public_artifact_ready: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
}

#[cfg(feature = "windows-public-shell")]
#[tauri::command]
fn prototype_status() -> WindowsPublicShellStatus {
    WindowsPublicShellStatus {
        warning: "windows public shell only; engine sidecar is required before messaging claims",
        artifact_type: "windows-shell-nsis-exe-installer-candidate",
        runtime_mode: "shell-sidecar-pending",
        engine_sidecar_required: true,
        engine_sidecar_present: false,
        full_runtime_compiled: false,
        onion_runtime_compiled: false,
        manual_e2ee_runtime_available: false,
        public_artifact_ready: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
    }
}

#[cfg(feature = "windows-public-shell")]
fn run_windows_public_shell() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![prototype_status])
        .run(tauri::generate_context!())
        .expect("failed to run Windows public shell");
}

#[cfg(all(not(feature = "windows-public-shell"), not(feature = "full-runtime")))]
compile_error!("desktop-tauri requires either full-runtime or windows-public-shell");

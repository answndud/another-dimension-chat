#[cfg(all(feature = "windows-public-shell", feature = "full-runtime"))]
compile_error!("windows-public-shell must be built with --no-default-features");

#[cfg(feature = "windows-public-shell")]
use tauri::Manager;

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
    engine_runtime_mode: &'static str,
    engine_sidecar_required: bool,
    engine_sidecar_present: bool,
    engine_sidecar_packaged: bool,
    engine_sidecar_contract_version: u16,
    engine_sidecar_protocol: &'static str,
    engine_sidecar_basename: String,
    engine_sidecar_location_class: &'static str,
    engine_sidecar_status_command: &'static str,
    engine_sidecar_probe_supported: bool,
    engine_sidecar_raw_path_returned: bool,
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
fn prototype_status(app: tauri::AppHandle) -> WindowsPublicShellStatus {
    let engine_sidecar_basename = engine_sidecar_basename();
    let engine_sidecar_present = engine_sidecar_present(&app, &engine_sidecar_basename);
    WindowsPublicShellStatus {
        warning: "windows public shell; engine sidecar packaging does not open messaging or high-risk claims",
        artifact_type: "windows-shell-nsis-exe-installer-candidate",
        runtime_mode: "shell-sidecar-pending",
        engine_runtime_mode: "manual-e2ee-engine-sidecar",
        engine_sidecar_required: true,
        engine_sidecar_present,
        engine_sidecar_packaged: engine_sidecar_present,
        engine_sidecar_contract_version: 1,
        engine_sidecar_protocol: "ad-engine-json-stdio-v1",
        engine_sidecar_basename,
        engine_sidecar_location_class: "tauri-resource-sidecar-basename-only",
        engine_sidecar_status_command: "status",
        engine_sidecar_probe_supported: true,
        engine_sidecar_raw_path_returned: false,
        full_runtime_compiled: false,
        onion_runtime_compiled: false,
        manual_e2ee_runtime_available: engine_sidecar_present,
        public_artifact_ready: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
    }
}

#[cfg(feature = "windows-public-shell")]
fn engine_sidecar_basename() -> String {
    format!(
        "another-dimension-engine-{}{}",
        engine_sidecar_target_triple(),
        std::env::consts::EXE_SUFFIX
    )
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "windows",
    target_arch = "x86_64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-pc-windows-msvc"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "windows",
    target_arch = "aarch64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-pc-windows-msvc"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "macos",
    target_arch = "x86_64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-apple-darwin"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "macos",
    target_arch = "aarch64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-apple-darwin"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "linux",
    target_arch = "x86_64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-unknown-linux-gnu"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "linux",
    target_arch = "aarch64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-unknown-linux-gnu"
}

#[cfg(all(
    feature = "windows-public-shell",
    not(any(
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "windows", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64"),
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "aarch64")
    ))
))]
fn engine_sidecar_target_triple() -> &'static str {
    "unsupported-target"
}

#[cfg(feature = "windows-public-shell")]
fn engine_sidecar_present(app: &tauri::AppHandle, basename: &str) -> bool {
    let Ok(resource_dir) = app.path().resource_dir() else {
        return false;
    };
    [
        resource_dir.join(basename),
        resource_dir.join("binaries").join(basename),
    ]
    .into_iter()
    .any(|path| path.is_file())
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

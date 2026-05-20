mod status;

pub use status::PrototypeStatus;

#[tauri::command]
pub fn prototype_status() -> PrototypeStatus {
    status::redacted_prototype_status()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![prototype_status])
        .run(tauri::generate_context!())
        .expect("failed to run desktop prototype shell");
}

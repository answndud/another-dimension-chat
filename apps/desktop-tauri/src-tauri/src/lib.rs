#[derive(serde::Serialize)]
pub struct PrototypeStatus {
    secure_release: bool,
    usable_messaging: bool,
    transport_status: &'static str,
    storage_status: &'static str,
}

#[tauri::command]
pub fn prototype_status() -> PrototypeStatus {
    PrototypeStatus {
        secure_release: false,
        usable_messaging: false,
        transport_status: "fail closed",
        storage_status: "prototype boundary",
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![prototype_status])
        .run(tauri::generate_context!())
        .expect("failed to run desktop prototype shell");
}

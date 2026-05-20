#[derive(serde::Serialize)]
pub struct PrototypeStatus {
    secure_release: bool,
    usable_messaging: bool,
    profile_status: &'static str,
    pairing_status: &'static str,
    transport_status: &'static str,
    storage_status: &'static str,
}

pub fn redacted_prototype_status() -> PrototypeStatus {
    PrototypeStatus {
        secure_release: false,
        usable_messaging: false,
        profile_status: "profile boundary only",
        pairing_status: "pairing boundary only",
        transport_status: "fail-closed boundary only",
        storage_status: "storage boundary only",
    }
}

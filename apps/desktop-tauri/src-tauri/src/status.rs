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
        profile_status: "prototype boundary",
        pairing_status: "prototype boundary",
        transport_status: "fail-closed only",
        storage_status: "prototype boundary",
    }
}

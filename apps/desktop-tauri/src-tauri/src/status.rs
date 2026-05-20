#[derive(serde::Serialize)]
pub struct PrototypeStatus {
    secure_release: bool,
    usable_messaging: bool,
    core_status: &'static str,
    profile_status: &'static str,
    pairing_status: &'static str,
    transport_status: &'static str,
    network_execution_status: &'static str,
    storage_status: &'static str,
    verification_status: &'static str,
}

pub fn redacted_prototype_status() -> PrototypeStatus {
    PrototypeStatus {
        secure_release: false,
        usable_messaging: false,
        core_status: "core boundary only",
        profile_status: "profile boundary only",
        pairing_status: "pairing boundary only",
        transport_status: "pre-network fail-closed only",
        network_execution_status: "network execution disabled",
        storage_status: "ADREC1 storage spike only",
        verification_status: "lightweight checks only",
    }
}

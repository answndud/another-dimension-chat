#[derive(serde::Serialize)]
pub struct PrototypeStatus {
    secure_release: bool,
    usable_messaging: bool,
    core_status: &'static str,
    profile_status: &'static str,
    pairing_status: &'static str,
    production_session_status: &'static str,
    production_self_test_status: &'static str,
    production_session_non_readiness: &'static str,
    production_preflight_status: &'static str,
    production_preflight_blockers: &'static str,
    session_durable_state_status: &'static str,
    session_unlock_policy_status: &'static str,
    session_unlock_non_readiness: &'static str,
    session_unlock_cli_rejection_status: &'static str,
    session_unlock_cli_rejection_flags: &'static str,
    transport_status: &'static str,
    network_execution_status: &'static str,
    experimental_transport_status: &'static str,
    bootstrap_status_classification: &'static str,
    transport_io_status: &'static str,
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
        production_session_status: "snow Noise XX synchronous evaluation boundary only",
        production_self_test_status: "CLI production boundary self-test only",
        production_session_non_readiness:
            "no production E2EE claim network transport durable persistence or async messaging",
        production_preflight_status: "read-only production skeleton blockers copy",
        production_preflight_blockers:
            "session E2EE false transport send receive false storage rollback not-provided messaging false",
        session_durable_state_status: "store-write adapter boundary; product unlock disabled",
        session_unlock_policy_status: "high-risk passphrase required OS-keystore-only rejected",
        session_unlock_non_readiness: "product unlock durable persistence rollback runtime messaging disabled",
        session_unlock_cli_rejection_status: "redacted product-unlock-disabled boundary copy",
        session_unlock_cli_rejection_flags:
            "storage_opened=false session_records_written=false key_material_exposed=false runtime_messaging=false",
        transport_status: "pre-network fail-closed only",
        network_execution_status: "network execution disabled",
        experimental_transport_status: "manual bootstrap gate summary only",
        bootstrap_status_classification:
            "network-disabled; censorship-or-bridge-required; timeout-or-transient-network-failure",
        transport_io_status: "hosting stream envelope messaging disabled",
        storage_status: "ADREC1 storage spike only",
        verification_status: "lightweight checks only",
    }
}

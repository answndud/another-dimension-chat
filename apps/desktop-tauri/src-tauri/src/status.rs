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
    production_preflight_status: String,
    production_preflight_blockers: String,
    session_durable_state_status: &'static str,
    session_unlock_policy_status: &'static str,
    session_unlock_non_readiness: &'static str,
    session_unlock_cli_rejection_status: &'static str,
    session_unlock_cli_rejection_flags: &'static str,
    transport_status: String,
    network_execution_status: String,
    experimental_transport_status: &'static str,
    bootstrap_status_classification: &'static str,
    transport_io_status: String,
    storage_status: &'static str,
    verification_status: &'static str,
    local_dev_peer_label: String,
}

pub fn redacted_prototype_status() -> PrototypeStatus {
    let preflight = another_dimension_core::production::production_skeleton_preflight_summary();
    let next_connector =
        another_dimension_core::production::production_skeleton_next_connector_selection();

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
        production_preflight_status: format!(
            "read-only production skeleton: session_e2ee={} transport_send_receive={} messaging={}",
            preflight.session_e2ee_ready(),
            preflight.transport_send_receive_available(),
            preflight.production_messaging_ready(),
        ),
        production_preflight_blockers: format!(
            "session_e2ee={} route={:?} route_allowed={} transport_send_receive={} message_storage={:?} session_transport_storage={:?} replay_commit_after_decrypt={} rollback_protection={:?} runtime_surface_closed={} messaging={}",
            preflight.session_e2ee_ready(),
            preflight.transport_route_kind(),
            preflight.transport_route_allowed_by_policy(),
            preflight.transport_send_receive_available(),
            preflight.storage_message_envelope_protection(),
            preflight.storage_session_transport_protection(),
            preflight.storage_replay_commit_after_decrypt(),
            preflight.storage_rollback_protection(),
            preflight.default_runtime_command_surface_closed(),
            preflight.production_messaging_ready(),
        ),
        session_durable_state_status: "store-write adapter boundary; product unlock disabled",
        session_unlock_policy_status: "high-risk passphrase required OS-keystore-only rejected",
        session_unlock_non_readiness: "product unlock durable persistence rollback runtime messaging disabled",
        session_unlock_cli_rejection_status: "redacted product-unlock-disabled boundary copy",
        session_unlock_cli_rejection_flags:
            "storage_opened=false session_records_written=false key_material_exposed=false runtime_messaging=false",
        transport_status: format!(
            "route={:?} allowed_by_policy={} send_receive={}",
            preflight.transport_route_kind(),
            preflight.transport_route_allowed_by_policy(),
            preflight.transport_send_receive_available(),
        ),
        network_execution_status: format!(
            "network execution disabled; next_connector={:?}; opens_runtime_execution={}",
            next_connector.connector(),
            next_connector.opens_runtime_execution(),
        ),
        experimental_transport_status: "manual bootstrap gate summary only",
        bootstrap_status_classification:
            "network-disabled; censorship-or-bridge-required; timeout-or-transient-network-failure",
        transport_io_status: format!(
            "transport_send_receive={} runtime_messaging={} required_gate={}",
            preflight.transport_send_receive_available(),
            preflight.production_messaging_ready(),
            next_connector.required_gate(),
        ),
        storage_status: "ADREC1 storage spike only",
        verification_status: "lightweight checks only",
        local_dev_peer_label: local_dev_peer_label(),
    }
}

fn local_dev_peer_label() -> String {
    #[cfg(debug_assertions)]
    {
        let label = std::env::var("ANOTHER_DIMENSION_DEV_PEER_LABEL").unwrap_or_default();
        let trimmed = label.trim();
        if matches!(trimmed, "peer-a" | "peer-b") {
            return trimmed.to_string();
        }
    }
    String::new()
}

#[cfg(test)]
mod tests {
    use super::redacted_prototype_status;

    #[test]
    fn prototype_status_uses_core_preflight_summary() {
        let status = redacted_prototype_status();

        assert!(status
            .production_preflight_status
            .contains("session_e2ee=false"));
        assert!(status
            .production_preflight_blockers
            .contains("transport_send_receive=false"));
        assert!(status
            .production_preflight_blockers
            .contains("rollback_protection=NotProvided"));
        assert!(status.transport_status.contains("route=OnionService"));
        assert!(status
            .network_execution_status
            .contains("next_connector=SessionProtocolAndStatePersistence"));
        assert!(status
            .transport_io_status
            .contains("transport_send_receive=false"));
        assert!(status
            .transport_io_status
            .contains("reviewed session protocol decision plus durable state persistence plan"));
        assert!(status.local_dev_peer_label.is_empty());
    }
}

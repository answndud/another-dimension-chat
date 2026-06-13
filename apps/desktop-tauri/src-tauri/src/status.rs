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
    production_session_readiness_blockers: String,
    production_async_delivery_semantics: String,
    production_manual_runtime_messaging: String,
    production_local_manual_e2ee_runtime: String,
    production_protocol_decision: String,
    production_runtime_command_surface: String,
    production_preflight_status: String,
    production_preflight_blockers: String,
    session_durable_state_status: &'static str,
    local_data_lifecycle_policy: String,
    key_rollback_boundary: String,
    backup_migration_boundary: String,
    transport_envelope_io_boundary: String,
    session_unlock_policy_status: &'static str,
    session_unlock_non_readiness: &'static str,
    session_unlock_cli_rejection_status: &'static str,
    session_unlock_cli_rejection_flags: &'static str,
    transport_status: String,
    network_execution_status: String,
    experimental_transport_status: &'static str,
    bootstrap_status_classification: &'static str,
    transport_io_status: String,
    privacy_model_boundary: &'static str,
    storage_status: &'static str,
    release_integrity_status: &'static str,
    desktop_platform_readiness_boundary: String,
    supply_chain_integrity_boundary: String,
    independent_review_boundary: String,
    diagnostics_redaction_boundary: String,
    verification_status: &'static str,
    local_dev_peer_label: String,
}

pub fn redacted_prototype_status() -> PrototypeStatus {
    let preflight = another_dimension_core::production::production_skeleton_preflight_summary();
    let session_gate = another_dimension_core::production::production_session_readiness_gate();
    let async_delivery =
        another_dimension_core::production::production_async_delivery_semantics_summary();
    let manual_runtime =
        another_dimension_core::production::production_manual_runtime_messaging_gate_summary();
    let local_manual_e2ee =
        another_dimension_core::production::production_local_manual_e2ee_runtime_summary();
    let protocol_decision =
        another_dimension_core::production::production_protocol_decision_summary();
    let command_surface =
        another_dimension_core::production::production_runtime_command_surface_summary();
    let next_connector =
        another_dimension_core::production::production_skeleton_next_connector_selection();
    let local_data_policy =
        another_dimension_core::production::production_local_data_lifecycle_policy_summary();
    let key_rollback =
        another_dimension_core::production::production_key_rollback_boundary_summary();
    let backup_migration =
        another_dimension_core::production::production_backup_migration_boundary_summary();
    let transport_boundary =
        another_dimension_core::production::production_transport_envelope_io_boundary_summary();
    let supply_chain =
        another_dimension_core::production::production_supply_chain_integrity_boundary_summary();
    let independent_review =
        another_dimension_core::production::production_independent_review_boundary_summary();
    let diagnostics_redaction =
        another_dimension_core::production::production_diagnostics_redaction_boundary_summary();

    PrototypeStatus {
        secure_release: false,
        usable_messaging: false,
        core_status: "core boundary only",
        profile_status: "profile boundary only",
        pairing_status: "pairing boundary only",
        production_session_status: "snow Noise XX synchronous evaluation boundary only",
        production_self_test_status: "CLI production boundary self-test only",
        production_session_non_readiness:
            "no audited production E2EE claim network transport automatic messaging or secure release",
        production_session_readiness_blockers: session_gate.blocker_tags().join(","),
        production_async_delivery_semantics: format!(
            "reviewed={} local_outbound={} envelope_export={} inbound_import={} retryable_failure={} cancel_terminal={} received_transcript={} remote_ack_protocol={} external_onion_delivery_verified={} runtime_messaging={} states={} required_followups={}",
            async_delivery.semantics_reviewed(),
            async_delivery.local_encrypted_outbound_ready(),
            async_delivery.explicit_envelope_export_ready(),
            async_delivery.explicit_inbound_import_ready(),
            async_delivery.retryable_failure_ready(),
            async_delivery.cancel_terminal_ready(),
            async_delivery.received_transcript_ready(),
            async_delivery.remote_ack_protocol_ready(),
            async_delivery.external_onion_delivery_verified(),
            async_delivery.runtime_messaging_enabled(),
            async_delivery.semantic_states().join(","),
            async_delivery.required_followups().join(","),
        ),
        production_manual_runtime_messaging: format!(
            "gate_reviewed={} manual_runtime_messaging={} explicit_user_action_required={} passphrase_first_storage_required={} session_runtime_material_required={} envelope_export_import_ready={} local_transcript_ready={} automatic_network_on_launch={} network_io_attempted={} external_onion_delivery_verified={} production_messaging_ready={} security_ready_claimed={} operations={}",
            manual_runtime.gate_reviewed(),
            manual_runtime.manual_runtime_messaging_enabled(),
            manual_runtime.explicit_user_action_required(),
            manual_runtime.passphrase_first_storage_required(),
            manual_runtime.session_runtime_material_required(),
            manual_runtime.encrypted_envelope_export_import_ready(),
            manual_runtime.local_transcript_ready(),
            manual_runtime.automatic_network_on_launch_allowed(),
            manual_runtime.network_io_attempted(),
            manual_runtime.external_onion_delivery_verified(),
            manual_runtime.production_messaging_ready(),
            manual_runtime.security_ready_claimed(),
            manual_runtime.operations().join(","),
        ),
        production_local_manual_e2ee_runtime: format!(
            "gate_reviewed={} local_manual_e2ee_runtime_ready={} supported_local_manual_e2ee_ready={} selected_protocol={} noise_xx_transport_state_required={} remote_static_verification_required={} safety_transcript_bound={} channel_binding_required={} message_number_nonce_binding_required={} replay_commit_after_decrypt={} tamper_failure_non_advance={} passphrase_first_storage_required={} envelope_export_import_ready={} automatic_network_on_launch={} network_io_attempted={} external_onion_delivery_verified={} production_e2ee_ready={} security_ready_claimed={} failure_model={}",
            local_manual_e2ee.gate_reviewed(),
            local_manual_e2ee.local_manual_e2ee_runtime_ready(),
            local_manual_e2ee.supported_local_manual_e2ee_ready(),
            local_manual_e2ee.selected_protocol(),
            local_manual_e2ee.noise_xx_transport_state_required(),
            local_manual_e2ee.remote_static_verification_required(),
            local_manual_e2ee.safety_transcript_bound(),
            local_manual_e2ee.channel_binding_required(),
            local_manual_e2ee.message_number_nonce_binding_required(),
            local_manual_e2ee.replay_commit_after_decrypt(),
            local_manual_e2ee.tamper_failure_non_advance(),
            local_manual_e2ee.passphrase_first_storage_required(),
            local_manual_e2ee.explicit_envelope_export_import_ready(),
            local_manual_e2ee.automatic_network_on_launch_allowed(),
            local_manual_e2ee.network_io_attempted(),
            local_manual_e2ee.external_onion_delivery_verified(),
            local_manual_e2ee.production_e2ee_ready(),
            local_manual_e2ee.security_ready_claimed(),
            local_manual_e2ee.failure_model().join(","),
        ),
        production_protocol_decision: format!(
            "reviewed={} selected={} custom_protocol_allowed={} offline_mailbox_selected={} group_or_multidevice_selected={} production_e2ee_ready={} rejected_directions={} required_followups={}",
            protocol_decision.decision_reviewed(),
            protocol_decision.selected_session_protocol(),
            protocol_decision.custom_protocol_allowed(),
            protocol_decision.offline_mailbox_selected(),
            protocol_decision.group_or_multidevice_selected(),
            protocol_decision.production_e2ee_ready(),
            protocol_decision.rejected_directions().join(","),
            protocol_decision.required_followups().join(","),
        ),
        production_runtime_command_surface: format!(
            "inventory_reviewed={} default_dev_insecure={} implicit_network_on_launch={} explicit_user_network_only={} plaintext_stdout_secret_export={} runtime_messaging={} reviewed_categories={} rejected_categories={}",
            command_surface.command_inventory_reviewed(),
            command_surface.default_build_has_dev_insecure_commands(),
            command_surface.implicit_network_on_launch_allowed(),
            command_surface.explicit_user_network_attempts_only(),
            command_surface.plaintext_stdout_secret_export_allowed(),
            command_surface.runtime_messaging_enabled(),
            command_surface.reviewed_categories().join(","),
            command_surface.rejected_categories().join(","),
        ),
        production_preflight_status: format!(
            "read-only production skeleton: session_e2ee={} transport_send_receive={} messaging={}",
            preflight.session_e2ee_ready(),
            preflight.transport_send_receive_available(),
            preflight.production_messaging_ready(),
        ),
        production_preflight_blockers: format!(
            "session_e2ee={} local_manual_e2ee_runtime={} key_rollback_boundary_closed={} transport_envelope_io_boundary_closed={} route={:?} route_allowed={} transport_send_receive={} message_storage={:?} session_transport_storage={:?} replay_commit_after_decrypt={} rollback_protection={:?} runtime_surface_closed={} messaging={}",
            preflight.session_e2ee_ready(),
            preflight.local_manual_e2ee_runtime_ready(),
            preflight.key_rollback_boundary_closed(),
            preflight.transport_envelope_io_boundary_closed(),
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
        session_durable_state_status:
            "local encrypted session lifecycle controls available; no audited readiness claim",
        local_data_lifecycle_policy: format!(
            "backend={:?} passphrase_first_required={} os_keystore_optional={} os_keystore_only_rejected={} key_wrapping_ready={} key_policy_decided={} rollback_protection={:?} rollback_non_claim={} backup_policy_decided={} backup_verified={} logical_delete={} supported_local_deletion_scope_ready={} supported_local_deletion_scope={} secure_media_deletion_claimed={} secure_deletion_claim_allowed={} forward_only_schema_migration={} prototype_data_migration_ready={} runtime_messaging={} policy_tags={}",
            local_data_policy.backend(),
            local_data_policy.passphrase_first_required(),
            local_data_policy.os_keystore_optional(),
            local_data_policy.os_keystore_only_rejected(),
            local_data_policy.production_key_wrapping_ready(),
            local_data_policy.production_key_management_policy_decided(),
            local_data_policy.rollback_protection(),
            local_data_policy.rollback_non_claim_decided(),
            local_data_policy.backup_exclusion_policy_decided(),
            local_data_policy.backup_exclusion_verified(),
            local_data_policy.logical_delete_available(),
            local_data_policy.supported_local_deletion_scope_ready(),
            local_data_policy.supported_local_deletion_scope(),
            local_data_policy.secure_media_deletion_claimed(),
            local_data_policy.secure_deletion_claim_allowed(),
            local_data_policy.forward_only_schema_migration(),
            local_data_policy.prototype_data_migration_ready(),
            local_data_policy.runtime_messaging_enabled(),
            local_data_policy.policy_tags().join(","),
        ),
        key_rollback_boundary: format!(
            "boundary_closed={} passphrase_first_required={} os_keystore_optional={} os_keystore_dependency_required={} os_keystore_only_rejected={} app_key_wrapping_ready={} app_key_wrapping_non_claim={} supported_local_key_lifecycle_ready={} supported_local_key_lifecycle_scope={} rollback_protection={:?} supported_rollback_detection_ready={} supported_rollback_detection_scope={} rollback_prevention_claimed={} rollback_non_claim={} external_monotonic_state_required_before_claim={} backup_policy_decided={} backup_verified={} secure_media_deletion_claimed={} secure_deletion_claim_allowed={} production_key_management_ready={} security_ready_claimed={} policies={}",
            key_rollback.boundary_closed(),
            key_rollback.passphrase_first_required(),
            key_rollback.os_keystore_optional(),
            key_rollback.os_keystore_dependency_required(),
            key_rollback.os_keystore_only_rejected(),
            key_rollback.app_key_wrapping_ready(),
            key_rollback.app_key_wrapping_non_claim_decided(),
            key_rollback.supported_local_key_lifecycle_ready(),
            key_rollback.supported_local_key_lifecycle_scope(),
            key_rollback.rollback_protection(),
            key_rollback.supported_rollback_detection_ready(),
            key_rollback.supported_rollback_detection_scope(),
            key_rollback.rollback_prevention_claimed(),
            key_rollback.rollback_non_claim_decided(),
            key_rollback.external_monotonic_state_required_before_claim(),
            key_rollback.backup_exclusion_policy_decided(),
            key_rollback.backup_exclusion_verified(),
            key_rollback.secure_media_deletion_claimed(),
            key_rollback.secure_deletion_claim_allowed(),
            key_rollback.production_key_management_ready(),
            key_rollback.security_ready_claimed(),
            key_rollback.policies().join(","),
        ),
        backup_migration_boundary: format!(
            "boundary_closed={} backup_policy_decided={} backup_verification_required={} backup_verified_by_core_status={} cloud_backup_or_sync_enabled={} backup_recovery_claimed={} forward_only_schema_migration_required={} migration_marker_required={} destructive_migration_blocked={} prototype_data_migration_ready={} rollback_detection_marker_only={} rollback_prevention_claimed={} secure_media_deletion_claimed={} security_ready_claimed={} policies={}",
            backup_migration.boundary_closed(),
            backup_migration.backup_exclusion_policy_decided(),
            backup_migration.backup_exclusion_verification_required(),
            backup_migration.backup_exclusion_verified_by_core_status(),
            backup_migration.cloud_backup_or_sync_enabled(),
            backup_migration.backup_recovery_claimed(),
            backup_migration.forward_only_schema_migration_required(),
            backup_migration.migration_marker_required(),
            backup_migration.destructive_migration_blocked(),
            backup_migration.prototype_data_migration_ready(),
            backup_migration.rollback_detection_marker_only(),
            backup_migration.rollback_prevention_claimed(),
            backup_migration.secure_media_deletion_claimed(),
            backup_migration.security_ready_claimed(),
            backup_migration.policies().join(","),
        ),
        transport_envelope_io_boundary: format!(
            "boundary_closed={} explicit_user_action_required={} automatic_network_on_launch={} high_risk_onion_only_policy={} direct_fallback_allowed={} route_allowed_by_policy={} outbound_fail_closed_adapter_ready={} inbound_fail_closed_adapter_ready={} redacted_envelope_io_context_required={} remote_peer_authentication_required={} verified_pairwise_session_required={} send_receive_available={} external_two_machine_onion_delivery_verified={} reliable_real_network_onion_delivery_claimed={} production_messaging_ready={} security_ready_claimed={} policies={}",
            transport_boundary.boundary_closed(),
            transport_boundary.explicit_user_action_required(),
            transport_boundary.automatic_network_on_launch_allowed(),
            transport_boundary.high_risk_onion_only_policy(),
            transport_boundary.direct_fallback_allowed(),
            transport_boundary.route_allowed_by_policy(),
            transport_boundary.outbound_fail_closed_adapter_ready(),
            transport_boundary.inbound_fail_closed_adapter_ready(),
            transport_boundary.redacted_envelope_io_context_required(),
            transport_boundary.remote_peer_authentication_required(),
            transport_boundary.verified_pairwise_session_required(),
            transport_boundary.send_receive_available(),
            transport_boundary.external_two_machine_onion_delivery_verified(),
            transport_boundary.reliable_real_network_onion_delivery_claimed(),
            transport_boundary.production_messaging_ready(),
            transport_boundary.security_ready_claimed(),
            transport_boundary.policies().join(","),
        ),
        session_unlock_policy_status: "passphrase-first high-risk policy OS-keystore-only rejected",
        session_unlock_non_readiness:
            "rollback prevention secure deletion from media runtime messaging disabled",
        session_unlock_cli_rejection_status:
            "CLI production unlock disabled; desktop product unlock available",
        session_unlock_cli_rejection_flags:
            "desktop_product_unlock=true storage_opened_on_user_action=true session_lifecycle_controls=true key_material_exposed=false runtime_messaging=false",
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
        experimental_transport_status:
            "manual bootstrap gate summary only; bridge config local-sensitive and configuration-specific; no audited censorship-circumvention claim",
        bootstrap_status_classification:
            "network-disabled; censorship-or-bridge-required; timeout-or-transient-network-failure; no reliable onion delivery claim without external peer evidence",
        transport_io_status: format!(
            "transport_send_receive={} runtime_messaging={} required_gate={}",
            preflight.transport_send_receive_available(),
            preflight.production_messaging_ready(),
            next_connector.required_gate(),
        ),
        privacy_model_boundary:
            "target=no-phone-no-email-no-global-account-no-central-contact-discovery-no-central-message-server; current_beta_not_briar_cwtch_equivalent=true; audited_e2ee=false; repeated_external_onion_evidence=false; offline_mesh=false; independent_review_complete=false; security_ready=false",
        storage_status:
            "ADREC1 storage spike plus forward-only schema and local data lifecycle boundary",
        release_integrity_status:
            "unsigned GitHub beta uses manual GitHub Release download, same GitHub Release assets as release authority, manual SHA-256 verification, same-release SHA-256 verification, macOS Privacy & Security manual allow only after checksum match, source branch is not release authority, source archives are not release authority, auto-update manifests are not trusted update authority, platform signing is not a v0.1 security boundary, notarization is not a v0.1 security boundary, store approval is not a v0.1 security boundary, public provenance, manifest, dependency inventory, dependency lockfile hashes, no branch-file release proof, no terminal quarantine-removal install step, no auto-update, no signing, no notarization, no supply-chain audit claim",
        desktop_platform_readiness_boundary:
            "desktop_platform_scope=macos-public-beta-windows-local-build-candidate windows_public_artifact_ready=false windows_installer_ready=false windows_signing_ready=false microsoft_store_ready=false smart_screen_reputation_claim=false notarization_equivalent_claim=false windows_local_runtime_smoke_status=source-boundary-only windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows windows_runtime_smoke_required=true windows_app_data_path_review_required=true windows_path_separator_review_required=true windows_local_deletion_behavior_review_required=true windows_redacted_diagnostics_behavior_review_required=true windows_explicit_user_action_review_required=true no_auto_update=true public_artifact_upload_allowed=false remaining_blocker=windows-local-build-smoke-and-release-boundary-review".to_string(),
        supply_chain_integrity_boundary: format!(
            "boundary_closed={} manual_github_release_download_required={} dmg_sha256_required={} public_provenance_required={} release_manifest_required={} dependency_inventory_required={} dependency_lockfile_hash_baseline_required={} dependency_lockfile_evidence_count={} dependency_lockfile_evidence_files={} dependency_inventory_runtime_visible={} vulnerability_triage_signoff_complete={} live_dependency_scan_performed={} auto_update_enabled={} signing_or_notarization_claimed={} sbom_published={} dependency_audit_complete={} reproducible_build_proof_available={} security_ready_claimed={} policies={}",
            supply_chain.boundary_closed(),
            supply_chain.manual_github_release_download_required(),
            supply_chain.dmg_sha256_required(),
            supply_chain.public_provenance_required(),
            supply_chain.release_manifest_required(),
            supply_chain.dependency_inventory_required(),
            supply_chain.dependency_lockfile_hash_baseline_required(),
            supply_chain.dependency_lockfile_evidence_count(),
            supply_chain.dependency_lockfile_evidence_files().join("|"),
            supply_chain.dependency_inventory_runtime_visible(),
            supply_chain.vulnerability_triage_signoff_complete(),
            supply_chain.live_dependency_scan_performed(),
            supply_chain.auto_update_enabled(),
            supply_chain.signing_or_notarization_claimed(),
            supply_chain.sbom_published(),
            supply_chain.dependency_audit_complete(),
            supply_chain.reproducible_build_proof_available(),
            supply_chain.security_ready_claimed(),
            supply_chain.policies().join(","),
        ),
        independent_review_boundary: format!(
            "boundary_closed={} public_threat_model_required={} independent_review_packet_required={} public_non_claims_required={} review_packet_inputs_public_safe={} known_review_gaps_published={} public_safe_review_commands_required={} private_reporting_boundary_required={} minimal_public_contact_request_allowed={} external_review_completed={} reviewer_signoff_claimed={} public_user_safety_signoff_claimed={} fabricated_review_or_peer_evidence_allowed={} public_review_gap_published={} sensitive_communication_allowed={} security_ready_claimed={} policies={}",
            independent_review.boundary_closed(),
            independent_review.public_threat_model_required(),
            independent_review.independent_review_packet_required(),
            independent_review.public_non_claims_required(),
            independent_review.review_packet_inputs_public_safe(),
            independent_review.known_review_gaps_published(),
            independent_review.public_safe_review_commands_required(),
            independent_review.private_reporting_boundary_required(),
            independent_review.minimal_public_contact_request_allowed(),
            independent_review.external_review_completed(),
            independent_review.reviewer_signoff_claimed(),
            independent_review.public_user_safety_signoff_claimed(),
            independent_review.fabricated_review_or_peer_evidence_allowed(),
            independent_review.public_review_gap_published(),
            independent_review.sensitive_communication_allowed(),
            independent_review.security_ready_claimed(),
            independent_review.policies().join(","),
        ),
        diagnostics_redaction_boundary: format!(
            "boundary_closed={} local_copy_only={} crash_upload_enabled={} telemetry_enabled={} raw_log_export_enabled={} crash_dump_export_enabled={} automated_log_collection_enabled={} support_bundle_export_enabled={} raw_diagnostic_file_export_enabled={} private_field_redaction_required={} app_launch_network_boundary_required={} security_ready_claimed={} allowed_fields={} forbidden_fields={} policies={}",
            diagnostics_redaction.boundary_closed(),
            diagnostics_redaction.public_diagnostics_local_copy_only(),
            diagnostics_redaction.crash_upload_enabled(),
            diagnostics_redaction.telemetry_enabled(),
            diagnostics_redaction.raw_log_export_enabled(),
            diagnostics_redaction.crash_dump_export_enabled(),
            diagnostics_redaction.automated_log_collection_enabled(),
            diagnostics_redaction.support_bundle_export_enabled(),
            diagnostics_redaction.raw_diagnostic_file_export_enabled(),
            diagnostics_redaction.private_field_redaction_required(),
            diagnostics_redaction.app_launch_network_boundary_required(),
            diagnostics_redaction.security_ready_claimed(),
            diagnostics_redaction.allowed_fields().join(","),
            diagnostics_redaction.forbidden_fields().join(","),
            diagnostics_redaction.policies().join(","),
        ),
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
        assert!(status
            .production_async_delivery_semantics
            .contains("reviewed=true"));
        assert!(status
            .production_async_delivery_semantics
            .contains("external_onion_delivery_verified=false"));
        assert!(status
            .production_manual_runtime_messaging
            .contains("manual_runtime_messaging=true"));
        assert!(status
            .production_manual_runtime_messaging
            .contains("network_io_attempted=false"));
        assert!(status
            .production_manual_runtime_messaging
            .contains("production_messaging_ready=false"));
        assert!(status
            .production_local_manual_e2ee_runtime
            .contains("local_manual_e2ee_runtime_ready=true"));
        assert!(status
            .production_local_manual_e2ee_runtime
            .contains("supported_local_manual_e2ee_ready=true"));
        assert!(status
            .production_local_manual_e2ee_runtime
            .contains("production_e2ee_ready=false"));
        assert!(status
            .production_local_manual_e2ee_runtime
            .contains("external_onion_delivery_verified=false"));
        assert!(status
            .local_data_lifecycle_policy
            .contains("passphrase_first_required=true"));
        assert!(status
            .local_data_lifecycle_policy
            .contains("rollback_non_claim=true"));
        assert!(status
            .local_data_lifecycle_policy
            .contains("supported_local_deletion_scope_ready=true"));
        assert!(status.local_data_lifecycle_policy.contains(
            "supported_local_deletion_scope=local-logical-delete-and-owned-app-data-wipe-only"
        ));
        assert!(status
            .local_data_lifecycle_policy
            .contains("secure_media_deletion_claimed=false"));
        assert!(status
            .local_data_lifecycle_policy
            .contains("secure_deletion_claim_allowed=false"));
        assert!(status.key_rollback_boundary.contains("boundary_closed=true"));
        assert!(status
            .key_rollback_boundary
            .contains("app_key_wrapping_non_claim=true"));
        assert!(status
            .key_rollback_boundary
            .contains("supported_local_key_lifecycle_ready=true"));
        assert!(status.key_rollback_boundary.contains(
            "supported_local_key_lifecycle_scope=passphrase-first-sqlcipher-local-profile-store-only"
        ));
        assert!(status
            .key_rollback_boundary
            .contains("supported_rollback_detection_ready=true"));
        assert!(status.key_rollback_boundary.contains(
            "supported_rollback_detection_scope=marker-only-detection-user-visible-reset-required"
        ));
        assert!(status
            .key_rollback_boundary
            .contains("rollback_non_claim=true"));
        assert!(status
            .key_rollback_boundary
            .contains("secure_deletion_claim_allowed=false"));
        assert!(status
            .key_rollback_boundary
            .contains("production_key_management_ready=false"));
        assert!(status
            .backup_migration_boundary
            .contains("boundary_closed=true"));
        assert!(status
            .backup_migration_boundary
            .contains("backup_verification_required=true"));
        assert!(status
            .backup_migration_boundary
            .contains("backup_verified_by_core_status=false"));
        assert!(status
            .backup_migration_boundary
            .contains("cloud_backup_or_sync_enabled=false"));
        assert!(status
            .backup_migration_boundary
            .contains("backup_recovery_claimed=false"));
        assert!(status
            .backup_migration_boundary
            .contains("forward_only_schema_migration_required=true"));
        assert!(status
            .backup_migration_boundary
            .contains("destructive_migration_blocked=true"));
        assert!(status
            .backup_migration_boundary
            .contains("rollback_prevention_claimed=false"));
        assert!(status
            .transport_envelope_io_boundary
            .contains("boundary_closed=true"));
        assert!(status
            .transport_envelope_io_boundary
            .contains("send_receive_available=false"));
        assert!(status
            .transport_envelope_io_boundary
            .contains("external_two_machine_onion_delivery_verified=false"));
        assert!(status
            .transport_envelope_io_boundary
            .contains("direct_fallback_allowed=false"));
        assert!(status
            .production_protocol_decision
            .contains("reviewed=true"));
        assert!(status
            .production_protocol_decision
            .contains("custom_protocol_allowed=false"));
        assert!(status
            .production_runtime_command_surface
            .contains("inventory_reviewed=true"));
        assert!(status
            .production_runtime_command_surface
            .contains("runtime_messaging=false"));
        assert!(status.transport_status.contains("route=OnionService"));
        assert!(status
            .network_execution_status
            .contains("next_connector=ExternalOnionEvidence"));
        assert!(status
            .experimental_transport_status
            .contains("bridge config local-sensitive"));
        assert!(status
            .experimental_transport_status
            .contains("no audited censorship-circumvention claim"));
        assert!(status
            .bootstrap_status_classification
            .contains("no reliable onion delivery claim without external peer evidence"));
        assert!(status
            .transport_io_status
            .contains("transport_send_receive=false"));
        assert!(status.privacy_model_boundary.contains("target=no-phone"));
        assert!(status
            .privacy_model_boundary
            .contains("current_beta_not_briar_cwtch_equivalent=true"));
        assert!(status.privacy_model_boundary.contains("audited_e2ee=false"));
        assert!(status
            .privacy_model_boundary
            .contains("repeated_external_onion_evidence=false"));
        assert!(status.privacy_model_boundary.contains("offline_mesh=false"));
        assert!(status
            .privacy_model_boundary
            .contains("independent_review_complete=false"));
        assert!(status.privacy_model_boundary.contains("security_ready=false"));
        assert!(status
            .transport_io_status
            .contains("real external peer reports without fabricated local evidence"));
        assert!(status
            .release_integrity_status
            .contains("manual SHA-256 verification"));
        assert!(status
            .release_integrity_status
            .contains("same GitHub Release assets as release authority"));
        assert!(status
            .release_integrity_status
            .contains("same-release SHA-256 verification"));
        assert!(status
            .release_integrity_status
            .contains("Privacy & Security manual allow"));
        assert!(status
            .release_integrity_status
            .contains("source branch is not release authority"));
        assert!(status
            .release_integrity_status
            .contains("source archives are not release authority"));
        assert!(status
            .release_integrity_status
            .contains("auto-update manifests are not trusted update authority"));
        assert!(status
            .release_integrity_status
            .contains("platform signing is not a v0.1 security boundary"));
        assert!(status
            .release_integrity_status
            .contains("notarization is not a v0.1 security boundary"));
        assert!(status
            .release_integrity_status
            .contains("store approval is not a v0.1 security boundary"));
        assert!(status
            .release_integrity_status
            .contains("no branch-file release proof"));
        assert!(status
            .release_integrity_status
            .contains("no terminal quarantine-removal install step"));
        assert!(status
            .release_integrity_status
            .contains("no auto-update"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("desktop_platform_scope=macos-public-beta-windows-local-build-candidate"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_public_artifact_ready=false"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_installer_ready=false"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_signing_ready=false"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("microsoft_store_ready=false"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("notarization_equivalent_claim=false"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_local_runtime_smoke_status=source-boundary-only"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_app_data_path_review_required=true"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_local_deletion_behavior_review_required=true"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_redacted_diagnostics_behavior_review_required=true"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("windows_explicit_user_action_review_required=true"));
        assert!(status
            .desktop_platform_readiness_boundary
            .contains("public_artifact_upload_allowed=false"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("boundary_closed=true"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("dependency_inventory_required=true"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("dependency_lockfile_evidence_count=3"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("apps/desktop-tauri/package-lock.json"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("dependency_inventory_runtime_visible=true"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("vulnerability_triage_signoff_complete=false"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("live_dependency_scan_performed=false"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("dependency_audit_complete=false"));
        assert!(status
            .supply_chain_integrity_boundary
            .contains("sbom_published=false"));
        assert!(status
            .independent_review_boundary
            .contains("boundary_closed=true"));
        assert!(status
            .independent_review_boundary
            .contains("independent_review_packet_required=true"));
        assert!(status
            .independent_review_boundary
            .contains("review_packet_inputs_public_safe=true"));
        assert!(status
            .independent_review_boundary
            .contains("known_review_gaps_published=true"));
        assert!(status
            .independent_review_boundary
            .contains("public_safe_review_commands_required=true"));
        assert!(status
            .independent_review_boundary
            .contains("private_reporting_boundary_required=true"));
        assert!(status
            .independent_review_boundary
            .contains("minimal_public_contact_request_allowed=true"));
        assert!(status
            .independent_review_boundary
            .contains("external_review_completed=false"));
        assert!(status
            .independent_review_boundary
            .contains("reviewer_signoff_claimed=false"));
        assert!(status
            .independent_review_boundary
            .contains("public_user_safety_signoff_claimed=false"));
        assert!(status
            .independent_review_boundary
            .contains("fabricated_review_or_peer_evidence_allowed=false"));
        assert!(status
            .independent_review_boundary
            .contains("public_review_gap_published=true"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("boundary_closed=true"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("local_copy_only=true"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("crash_upload_enabled=false"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("telemetry_enabled=false"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("raw_log_export_enabled=false"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("crash_dump_export_enabled=false"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("automated_log_collection_enabled=false"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("support_bundle_export_enabled=false"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("raw_diagnostic_file_export_enabled=false"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("allowed_fields=status,build,failure_class"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("forbidden_fields=bridge_lines,onion_endpoints"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("passphrases"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("crash_dumps"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("screenshots_private_room_data"));
        assert!(status
            .diagnostics_redaction_boundary
            .contains("key_material"));
        assert!(status.local_dev_peer_label.is_empty());
    }
}

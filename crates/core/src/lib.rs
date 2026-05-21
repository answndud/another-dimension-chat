pub mod production {
    use another_dimension_crypto::production::{
        create_noise_xx_handshake_finish_export, create_noise_xx_handshake_init_export,
        create_noise_xx_handshake_reply_export, create_noise_xx_stateless_initiator_transport,
        establish_noise_xx_transport_pair, generate_noise_static_keypair,
        prepare_noise_xx_handshake_init_message, run_noise_xx_handshake_smoke,
        validate_noise_xx_handshake_finish_message, NoisePrekeyBundle, NoiseStaticKeypair,
        NoiseTransportPair,
    };
    use another_dimension_crypto::CryptoError;
    use another_dimension_identity::{
        ContactId, IdentityError, PairwisePublicKeyScheme, PairwiseSignatureScheme,
        ProductionKeyAlgorithm, ProductionPairwisePrivateKey, ProfileName,
    };
    use another_dimension_pairing::{
        production_pairing_draft_with_defaults, production_pairing_payload_with_defaults,
        transcript, PairingError, PairingPayload, ProductionPairingDraft,
    };
    use another_dimension_protocol::{
        decode_hex, encode_hex, pad_to_bucket, Envelope, MessageType, ProtocolError, ReplayWindow,
    };
    use another_dimension_storage::production::{
        production_message_storage_boundary_summary, protection_for,
        require_encrypted_record_allowed, require_persistence_allowed, EncryptedRecord,
        EncryptedRecordId, EncryptedRecordScope, LockedProfileStore, ProductionRecordKind,
        ProductionStorageError, ProductionStoragePolicyError, ProfilePassphrase,
        ReplayRollbackProtection, SqlCipherRecordStore, StorageProtection, UnlockFactor,
        UnlockMode, UnlockRequest,
    };
    use another_dimension_transport::{
        BoundOutboundStreamSession, EncryptedEndpointUpdateControlEnvelope, EndpointLifecycleError,
        EndpointUpdateControlPlaintext, EnvelopeIoAdapterReady, OnionEnvelopeTransport,
        OnionOutboundStreamBoundary, OnionServiceEndpoint, OutboundEnvelopeIoAdapterBoundary,
        OutboundStreamGateDecision, OutboundStreamPreparationBoundary, PairwiseEndpointUpdate,
        PairwiseRendezvousEndpoint, PairwiseStreamSessionBinding,
        RedactedRemotePeerAuthenticationContext, RedactedStreamSessionVerificationContext,
        RemotePeerAuthenticationReady, RendezvousEndpointIdentityBinding, RendezvousEndpointScope,
        TransportKind, TransportPolicy, TransportRoute,
    };
    use sha2::{Digest, Sha256};

    const CANONICAL_DIALER_DOMAIN: &[u8] = b"AD-SESSION-CANONICAL-DIALER-V1";
    const PRODUCTION_CHANNEL_DOMAIN: &[u8] = b"AD-PRODUCTION-CHANNEL-V1";
    const PRODUCTION_REPLAY_RECORD_DOMAIN: &[u8] = b"AD-PRODUCTION-REPLAY-RECORD-V1";
    const PRODUCTION_ENDPOINT_STATE_RECORD_DOMAIN: &[u8] =
        b"AD-PRODUCTION-ENDPOINT-STATE-RECORD-V1";
    const PRODUCTION_MESSAGE_ENVELOPE_RECORD_DOMAIN: &[u8] =
        b"AD-PRODUCTION-MESSAGE-ENVELOPE-RECORD-V1";
    const PRODUCTION_LOCAL_MESSAGE_INDEX_RECORD_DOMAIN: &[u8] =
        b"AD-PRODUCTION-LOCAL-MESSAGE-INDEX-RECORD-V1";
    const PRODUCTION_SESSION_TRANSPORT_STATE_RECORD_DOMAIN: &[u8] =
        b"AD-PRODUCTION-SESSION-TRANSPORT-STATE-RECORD-V1";
    const PRODUCTION_IDENTITY_PRIVATE_KEY_RECORD_ID: &str = "pairwise_identity_private_key_v1";
    const PRODUCTION_LATEST_PAIRING_NOISE_STATIC_RECORD_ID: &str =
        "latest_pairing_noise_static_private_key_v1";
    const PRODUCTION_LATEST_SESSION_DRAFT_RECORD_ID: &str = "latest_session_draft_v1";
    const PRODUCTION_PENDING_HANDSHAKE_INITIATOR_STATE_RECORD_ID: &str =
        "pending_noise_xx_initiator_handshake_state_v1";

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionSessionPlan {
        pub safety_transcript: String,
        pub local_role: SessionRole,
        pub canonical_dialer_public_key: String,
        pub local_rendezvous_endpoint: PairwiseRendezvousEndpoint,
        pub remote_rendezvous_endpoint: PairwiseRendezvousEndpoint,
        pub local_noise_static_public_key: Vec<u8>,
        pub remote_noise_static_public_key: Vec<u8>,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionRole {
        CanonicalDialer,
        Responder,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionConnectionDirection {
        Inbound,
        Outbound,
    }

    impl SessionConnectionDirection {
        pub fn opposite(self) -> Self {
            match self {
                Self::Inbound => Self::Outbound,
                Self::Outbound => Self::Inbound,
            }
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum CanonicalConnectionState {
        MissingOrUnauthenticated,
        AuthenticatedUnhealthy,
        AuthenticatedHealthy,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum DuplicateConnectionAction {
        KeepCanonicalConnection,
        WaitForCanonicalConnection,
        CloseDuplicateConnection,
    }

    #[derive(Debug, Eq, PartialEq)]
    pub struct ProductionSetupDraft {
        pub pairing: ProductionPairingDraft,
        pub noise_static: NoiseStaticKeypair,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionHandshakeSmokeResult {
        pub plan: ProductionSessionPlan,
        pub ciphertext: Vec<u8>,
        pub plaintext: Vec<u8>,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionSessionEvaluationSummary {
        protocol_candidate: &'static str,
        production_pairing_required: bool,
        safety_transcript_bound: bool,
        canonical_dialer_stable: bool,
        ciphertext_tamper_rejected: bool,
        replay_guard_before_decrypt: bool,
        session_state_in_memory_only: bool,
        production_e2ee_ready: bool,
        durable_session_persistence_ready: bool,
        tauri_production_messaging_command_ready: bool,
        usable_async_messaging_ready: bool,
    }

    impl ProductionSessionEvaluationSummary {
        pub fn protocol_candidate(self) -> &'static str {
            self.protocol_candidate
        }

        pub fn production_pairing_required(self) -> bool {
            self.production_pairing_required
        }

        pub fn safety_transcript_bound(self) -> bool {
            self.safety_transcript_bound
        }

        pub fn canonical_dialer_stable(self) -> bool {
            self.canonical_dialer_stable
        }

        pub fn ciphertext_tamper_rejected(self) -> bool {
            self.ciphertext_tamper_rejected
        }

        pub fn replay_guard_before_decrypt(self) -> bool {
            self.replay_guard_before_decrypt
        }

        pub fn session_state_in_memory_only(self) -> bool {
            self.session_state_in_memory_only
        }

        pub fn production_e2ee_ready(self) -> bool {
            self.production_e2ee_ready
        }

        pub fn durable_session_persistence_ready(self) -> bool {
            self.durable_session_persistence_ready
        }

        pub fn tauri_production_messaging_command_ready(self) -> bool {
            self.tauri_production_messaging_command_ready
        }

        pub fn usable_async_messaging_ready(self) -> bool {
            self.usable_async_messaging_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionSkeletonPreflightSummary {
        session_pairing_required: bool,
        session_safety_transcript_bound: bool,
        session_e2ee_ready: bool,
        transport_route_kind: TransportKind,
        transport_route_allowed_by_policy: bool,
        transport_send_receive_available: bool,
        storage_message_envelope_protection: StorageProtection,
        storage_session_transport_protection: StorageProtection,
        storage_replay_commit_after_decrypt: bool,
        storage_rollback_protection: ReplayRollbackProtection,
        default_runtime_command_surface_closed: bool,
        production_messaging_ready: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionProfileInitSummary {
        storage_opened: bool,
        profile_marker_written: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionProfileStatusSummary {
        storage_opened: bool,
        profile_marker_present: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionProfileIdentityInitSummary {
        storage_opened: bool,
        identity_private_key_written: bool,
        identity_public_key_derivable: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionProfileIdentityStatusSummary {
        storage_opened: bool,
        identity_private_key_present: bool,
        identity_public_key_derivable: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionPairingPayloadCreateSummary {
        storage_opened: bool,
        identity_private_key_loaded: bool,
        noise_static_private_key_written: bool,
        payload: PairingPayload,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionPrepareSummary {
        storage_opened: bool,
        session_plan_created: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_payload: bool,
        safety_transcript_bound: bool,
        canonical_dialer_selected: bool,
        local_role: SessionRole,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionSaveDraftSummary {
        storage_opened: bool,
        session_plan_created: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_payload: bool,
        session_draft_written: bool,
        remote_endpoint_state_written: bool,
        replay_window_written: bool,
        channel_id_derivable: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionStatusSummary {
        storage_opened: bool,
        session_draft_present: bool,
        channel_id_derivable: bool,
        local_role_available: bool,
        remote_contact_present: bool,
        remote_endpoint_state_present: bool,
        replay_window_present: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionRuntimeLoadSummary {
        storage_opened: bool,
        session_draft_loaded: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_draft: bool,
        remote_noise_static_public_key_loaded: bool,
        remote_endpoint_state_loaded: bool,
        replay_window_loaded: bool,
        runtime_material_reconstructable: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionRuntimeOpenSummary {
        storage_opened: bool,
        runtime_material_reconstructable: bool,
        outbound_stream_gate_ready: bool,
        outbound_fail_closed_adapter_ready: bool,
        outbound_stream_preparation_ready: bool,
        session_binding_ready: bool,
        remote_peer_authentication_ready: bool,
        outbound_envelope_io_ready: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionTransportPrepareSummary {
        storage_opened: bool,
        runtime_material_reconstructable: bool,
        local_noise_static_private_key_loaded: bool,
        remote_noise_static_public_key_loaded: bool,
        remote_endpoint_state_loaded: bool,
        replay_window_loaded: bool,
        authenticated_handshake_required: bool,
        session_transport_state_created: bool,
        session_transport_persistence_allowed: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionHandshakeInitSummary {
        storage_opened: bool,
        session_draft_loaded: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_draft: bool,
        safety_transcript_loaded: bool,
        local_role_can_initiate: bool,
        handshake_message_created: bool,
        handshake_message_len: usize,
        handshake_message_exposed: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionHandshakeInitExport {
        storage_opened: bool,
        session_draft_loaded: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_draft: bool,
        safety_transcript_loaded: bool,
        local_role_can_initiate: bool,
        handshake_message_created: bool,
        handshake_message_len: usize,
        handshake_message_exposed: bool,
        export_payload: String,
        initiator_state_written: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionHandshakeInitImportSummary {
        storage_opened: bool,
        session_draft_loaded: bool,
        safety_transcript_loaded: bool,
        local_role_can_accept: bool,
        handshake_message_read: bool,
        handshake_message_decodable: bool,
        handshake_message_len: usize,
        handshake_message_exposed: bool,
        responder_state_created: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionHandshakeFinishExport {
        storage_opened: bool,
        session_draft_loaded: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_draft: bool,
        safety_transcript_loaded: bool,
        local_role_can_finish: bool,
        initiator_state_loaded: bool,
        reply_message_read: bool,
        reply_message_decodable: bool,
        reply_message_len: usize,
        finish_message_created: bool,
        finish_message_len: usize,
        finish_message_exposed: bool,
        export_payload: String,
        transport_state_persisted: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionHandshakeFinishImportSummary {
        storage_opened: bool,
        session_draft_loaded: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_draft: bool,
        safety_transcript_loaded: bool,
        local_role_can_complete: bool,
        responder_state_loaded: bool,
        finish_message_read: bool,
        finish_message_decodable: bool,
        finish_message_len: usize,
        remote_static_verified: bool,
        transport_state_created: bool,
        transport_state_persisted: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionPairingSessionHandshakeReplyExport {
        storage_opened: bool,
        session_draft_loaded: bool,
        local_noise_static_private_key_loaded: bool,
        local_noise_static_matches_draft: bool,
        safety_transcript_loaded: bool,
        local_role_can_accept: bool,
        init_message_read: bool,
        init_message_decodable: bool,
        init_message_len: usize,
        reply_message_created: bool,
        reply_message_len: usize,
        reply_message_exposed: bool,
        export_payload: String,
        responder_state_persisted: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionMessageSendPrepareSummary {
        storage_opened: bool,
        runtime_material_reconstructable: bool,
        outbound_envelope_io_ready: bool,
        plaintext_accepted: bool,
        message_number_reserved: bool,
        local_message_index_written: bool,
        pending_message_record_written: bool,
        envelope_encryption_ready: bool,
        network_send_attempted: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionMessagePendingStatusSummary {
        storage_opened: bool,
        runtime_material_reconstructable: bool,
        local_message_index_present: bool,
        pending_message_record_present: bool,
        pending_message_record_decodable: bool,
        local_message_index_matches_pending: bool,
        plaintext_exposed: bool,
        envelope_encryption_ready: bool,
        network_send_attempted: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionMessageOutboundEncryptPrepareSummary {
        storage_opened: bool,
        runtime_material_reconstructable: bool,
        local_message_index_present: bool,
        pending_message_record_present: bool,
        pending_message_record_decodable: bool,
        local_message_index_matches_pending: bool,
        pending_plaintext_loaded: bool,
        plaintext_exposed: bool,
        session_transport_ready: bool,
        envelope_encryption_ready: bool,
        encrypted_envelope_written: bool,
        network_send_attempted: bool,
        key_material_exposed: bool,
        transport_io_opened: bool,
        runtime_messaging_enabled: bool,
    }

    impl ProductionProfileInitSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn profile_marker_written(self) -> bool {
            self.profile_marker_written
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionProfileStatusSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn profile_marker_present(self) -> bool {
            self.profile_marker_present
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionProfileIdentityInitSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn identity_private_key_written(self) -> bool {
            self.identity_private_key_written
        }

        pub fn identity_public_key_derivable(self) -> bool {
            self.identity_public_key_derivable
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionProfileIdentityStatusSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn identity_private_key_present(self) -> bool {
            self.identity_private_key_present
        }

        pub fn identity_public_key_derivable(self) -> bool {
            self.identity_public_key_derivable
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingPayloadCreateSummary {
        pub fn storage_opened(&self) -> bool {
            self.storage_opened
        }

        pub fn identity_private_key_loaded(&self) -> bool {
            self.identity_private_key_loaded
        }

        pub fn noise_static_private_key_written(&self) -> bool {
            self.noise_static_private_key_written
        }

        pub fn payload(&self) -> &PairingPayload {
            &self.payload
        }

        pub fn key_material_exposed(&self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(&self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(&self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionPrepareSummary {
        pub fn storage_opened(&self) -> bool {
            self.storage_opened
        }

        pub fn session_plan_created(&self) -> bool {
            self.session_plan_created
        }

        pub fn local_noise_static_private_key_loaded(&self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_payload(&self) -> bool {
            self.local_noise_static_matches_payload
        }

        pub fn safety_transcript_bound(&self) -> bool {
            self.safety_transcript_bound
        }

        pub fn canonical_dialer_selected(&self) -> bool {
            self.canonical_dialer_selected
        }

        pub fn local_role(&self) -> SessionRole {
            self.local_role
        }

        pub fn key_material_exposed(&self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(&self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(&self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionSaveDraftSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn session_plan_created(self) -> bool {
            self.session_plan_created
        }

        pub fn local_noise_static_private_key_loaded(self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_payload(self) -> bool {
            self.local_noise_static_matches_payload
        }

        pub fn session_draft_written(self) -> bool {
            self.session_draft_written
        }

        pub fn remote_endpoint_state_written(self) -> bool {
            self.remote_endpoint_state_written
        }

        pub fn replay_window_written(self) -> bool {
            self.replay_window_written
        }

        pub fn channel_id_derivable(self) -> bool {
            self.channel_id_derivable
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionStatusSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_present(self) -> bool {
            self.session_draft_present
        }

        pub fn channel_id_derivable(self) -> bool {
            self.channel_id_derivable
        }

        pub fn local_role_available(self) -> bool {
            self.local_role_available
        }

        pub fn remote_contact_present(self) -> bool {
            self.remote_contact_present
        }

        pub fn remote_endpoint_state_present(self) -> bool {
            self.remote_endpoint_state_present
        }

        pub fn replay_window_present(self) -> bool {
            self.replay_window_present
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionRuntimeLoadSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_loaded(self) -> bool {
            self.session_draft_loaded
        }

        pub fn local_noise_static_private_key_loaded(self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_draft(self) -> bool {
            self.local_noise_static_matches_draft
        }

        pub fn remote_noise_static_public_key_loaded(self) -> bool {
            self.remote_noise_static_public_key_loaded
        }

        pub fn remote_endpoint_state_loaded(self) -> bool {
            self.remote_endpoint_state_loaded
        }

        pub fn replay_window_loaded(self) -> bool {
            self.replay_window_loaded
        }

        pub fn runtime_material_reconstructable(self) -> bool {
            self.runtime_material_reconstructable
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionRuntimeOpenSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn runtime_material_reconstructable(self) -> bool {
            self.runtime_material_reconstructable
        }

        pub fn outbound_stream_gate_ready(self) -> bool {
            self.outbound_stream_gate_ready
        }

        pub fn outbound_fail_closed_adapter_ready(self) -> bool {
            self.outbound_fail_closed_adapter_ready
        }

        pub fn outbound_stream_preparation_ready(self) -> bool {
            self.outbound_stream_preparation_ready
        }

        pub fn session_binding_ready(self) -> bool {
            self.session_binding_ready
        }

        pub fn remote_peer_authentication_ready(self) -> bool {
            self.remote_peer_authentication_ready
        }

        pub fn outbound_envelope_io_ready(self) -> bool {
            self.outbound_envelope_io_ready
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionMessageSendPrepareSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn runtime_material_reconstructable(self) -> bool {
            self.runtime_material_reconstructable
        }

        pub fn outbound_envelope_io_ready(self) -> bool {
            self.outbound_envelope_io_ready
        }

        pub fn plaintext_accepted(self) -> bool {
            self.plaintext_accepted
        }

        pub fn message_number_reserved(self) -> bool {
            self.message_number_reserved
        }

        pub fn local_message_index_written(self) -> bool {
            self.local_message_index_written
        }

        pub fn pending_message_record_written(self) -> bool {
            self.pending_message_record_written
        }

        pub fn envelope_encryption_ready(self) -> bool {
            self.envelope_encryption_ready
        }

        pub fn network_send_attempted(self) -> bool {
            self.network_send_attempted
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionMessagePendingStatusSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn runtime_material_reconstructable(self) -> bool {
            self.runtime_material_reconstructable
        }

        pub fn local_message_index_present(self) -> bool {
            self.local_message_index_present
        }

        pub fn pending_message_record_present(self) -> bool {
            self.pending_message_record_present
        }

        pub fn pending_message_record_decodable(self) -> bool {
            self.pending_message_record_decodable
        }

        pub fn local_message_index_matches_pending(self) -> bool {
            self.local_message_index_matches_pending
        }

        pub fn plaintext_exposed(self) -> bool {
            self.plaintext_exposed
        }

        pub fn envelope_encryption_ready(self) -> bool {
            self.envelope_encryption_ready
        }

        pub fn network_send_attempted(self) -> bool {
            self.network_send_attempted
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionTransportPrepareSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn runtime_material_reconstructable(self) -> bool {
            self.runtime_material_reconstructable
        }

        pub fn local_noise_static_private_key_loaded(self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn remote_noise_static_public_key_loaded(self) -> bool {
            self.remote_noise_static_public_key_loaded
        }

        pub fn remote_endpoint_state_loaded(self) -> bool {
            self.remote_endpoint_state_loaded
        }

        pub fn replay_window_loaded(self) -> bool {
            self.replay_window_loaded
        }

        pub fn authenticated_handshake_required(self) -> bool {
            self.authenticated_handshake_required
        }

        pub fn session_transport_state_created(self) -> bool {
            self.session_transport_state_created
        }

        pub fn session_transport_persistence_allowed(self) -> bool {
            self.session_transport_persistence_allowed
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionHandshakeInitSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_loaded(self) -> bool {
            self.session_draft_loaded
        }

        pub fn local_noise_static_private_key_loaded(self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_draft(self) -> bool {
            self.local_noise_static_matches_draft
        }

        pub fn safety_transcript_loaded(self) -> bool {
            self.safety_transcript_loaded
        }

        pub fn local_role_can_initiate(self) -> bool {
            self.local_role_can_initiate
        }

        pub fn handshake_message_created(self) -> bool {
            self.handshake_message_created
        }

        pub fn handshake_message_len(self) -> usize {
            self.handshake_message_len
        }

        pub fn handshake_message_exposed(self) -> bool {
            self.handshake_message_exposed
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionHandshakeInitExport {
        pub fn storage_opened(&self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_loaded(&self) -> bool {
            self.session_draft_loaded
        }

        pub fn local_noise_static_private_key_loaded(&self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_draft(&self) -> bool {
            self.local_noise_static_matches_draft
        }

        pub fn safety_transcript_loaded(&self) -> bool {
            self.safety_transcript_loaded
        }

        pub fn local_role_can_initiate(&self) -> bool {
            self.local_role_can_initiate
        }

        pub fn handshake_message_created(&self) -> bool {
            self.handshake_message_created
        }

        pub fn handshake_message_len(&self) -> usize {
            self.handshake_message_len
        }

        pub fn handshake_message_exposed(&self) -> bool {
            self.handshake_message_exposed
        }

        pub fn export_payload(&self) -> &str {
            &self.export_payload
        }

        pub fn initiator_state_written(&self) -> bool {
            self.initiator_state_written
        }

        pub fn key_material_exposed(&self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(&self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(&self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionHandshakeInitImportSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_loaded(self) -> bool {
            self.session_draft_loaded
        }

        pub fn safety_transcript_loaded(self) -> bool {
            self.safety_transcript_loaded
        }

        pub fn local_role_can_accept(self) -> bool {
            self.local_role_can_accept
        }

        pub fn handshake_message_read(self) -> bool {
            self.handshake_message_read
        }

        pub fn handshake_message_decodable(self) -> bool {
            self.handshake_message_decodable
        }

        pub fn handshake_message_len(self) -> usize {
            self.handshake_message_len
        }

        pub fn handshake_message_exposed(self) -> bool {
            self.handshake_message_exposed
        }

        pub fn responder_state_created(self) -> bool {
            self.responder_state_created
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionHandshakeReplyExport {
        pub fn storage_opened(&self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_loaded(&self) -> bool {
            self.session_draft_loaded
        }

        pub fn local_noise_static_private_key_loaded(&self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_draft(&self) -> bool {
            self.local_noise_static_matches_draft
        }

        pub fn safety_transcript_loaded(&self) -> bool {
            self.safety_transcript_loaded
        }

        pub fn local_role_can_accept(&self) -> bool {
            self.local_role_can_accept
        }

        pub fn init_message_read(&self) -> bool {
            self.init_message_read
        }

        pub fn init_message_decodable(&self) -> bool {
            self.init_message_decodable
        }

        pub fn init_message_len(&self) -> usize {
            self.init_message_len
        }

        pub fn reply_message_created(&self) -> bool {
            self.reply_message_created
        }

        pub fn reply_message_len(&self) -> usize {
            self.reply_message_len
        }

        pub fn reply_message_exposed(&self) -> bool {
            self.reply_message_exposed
        }

        pub fn export_payload(&self) -> &str {
            &self.export_payload
        }

        pub fn responder_state_persisted(&self) -> bool {
            self.responder_state_persisted
        }

        pub fn key_material_exposed(&self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(&self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(&self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionHandshakeFinishExport {
        pub fn storage_opened(&self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_loaded(&self) -> bool {
            self.session_draft_loaded
        }

        pub fn local_noise_static_private_key_loaded(&self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_draft(&self) -> bool {
            self.local_noise_static_matches_draft
        }

        pub fn safety_transcript_loaded(&self) -> bool {
            self.safety_transcript_loaded
        }

        pub fn local_role_can_finish(&self) -> bool {
            self.local_role_can_finish
        }

        pub fn initiator_state_loaded(&self) -> bool {
            self.initiator_state_loaded
        }

        pub fn reply_message_read(&self) -> bool {
            self.reply_message_read
        }

        pub fn reply_message_decodable(&self) -> bool {
            self.reply_message_decodable
        }

        pub fn reply_message_len(&self) -> usize {
            self.reply_message_len
        }

        pub fn finish_message_created(&self) -> bool {
            self.finish_message_created
        }

        pub fn finish_message_len(&self) -> usize {
            self.finish_message_len
        }

        pub fn finish_message_exposed(&self) -> bool {
            self.finish_message_exposed
        }

        pub fn export_payload(&self) -> &str {
            &self.export_payload
        }

        pub fn transport_state_persisted(&self) -> bool {
            self.transport_state_persisted
        }

        pub fn key_material_exposed(&self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(&self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(&self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionPairingSessionHandshakeFinishImportSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn session_draft_loaded(self) -> bool {
            self.session_draft_loaded
        }

        pub fn local_noise_static_private_key_loaded(self) -> bool {
            self.local_noise_static_private_key_loaded
        }

        pub fn local_noise_static_matches_draft(self) -> bool {
            self.local_noise_static_matches_draft
        }

        pub fn safety_transcript_loaded(self) -> bool {
            self.safety_transcript_loaded
        }

        pub fn local_role_can_complete(self) -> bool {
            self.local_role_can_complete
        }

        pub fn responder_state_loaded(self) -> bool {
            self.responder_state_loaded
        }

        pub fn finish_message_read(self) -> bool {
            self.finish_message_read
        }

        pub fn finish_message_decodable(self) -> bool {
            self.finish_message_decodable
        }

        pub fn finish_message_len(self) -> usize {
            self.finish_message_len
        }

        pub fn remote_static_verified(self) -> bool {
            self.remote_static_verified
        }

        pub fn transport_state_created(self) -> bool {
            self.transport_state_created
        }

        pub fn transport_state_persisted(self) -> bool {
            self.transport_state_persisted
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionMessageOutboundEncryptPrepareSummary {
        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn runtime_material_reconstructable(self) -> bool {
            self.runtime_material_reconstructable
        }

        pub fn local_message_index_present(self) -> bool {
            self.local_message_index_present
        }

        pub fn pending_message_record_present(self) -> bool {
            self.pending_message_record_present
        }

        pub fn pending_message_record_decodable(self) -> bool {
            self.pending_message_record_decodable
        }

        pub fn local_message_index_matches_pending(self) -> bool {
            self.local_message_index_matches_pending
        }

        pub fn pending_plaintext_loaded(self) -> bool {
            self.pending_plaintext_loaded
        }

        pub fn plaintext_exposed(self) -> bool {
            self.plaintext_exposed
        }

        pub fn session_transport_ready(self) -> bool {
            self.session_transport_ready
        }

        pub fn envelope_encryption_ready(self) -> bool {
            self.envelope_encryption_ready
        }

        pub fn encrypted_envelope_written(self) -> bool {
            self.encrypted_envelope_written
        }

        pub fn network_send_attempted(self) -> bool {
            self.network_send_attempted
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn transport_io_opened(self) -> bool {
            self.transport_io_opened
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    impl ProductionSkeletonPreflightSummary {
        pub fn session_pairing_required(self) -> bool {
            self.session_pairing_required
        }

        pub fn session_safety_transcript_bound(self) -> bool {
            self.session_safety_transcript_bound
        }

        pub fn session_e2ee_ready(self) -> bool {
            self.session_e2ee_ready
        }

        pub fn transport_route_kind(self) -> TransportKind {
            self.transport_route_kind
        }

        pub fn transport_route_allowed_by_policy(self) -> bool {
            self.transport_route_allowed_by_policy
        }

        pub fn transport_send_receive_available(self) -> bool {
            self.transport_send_receive_available
        }

        pub fn storage_message_envelope_protection(self) -> StorageProtection {
            self.storage_message_envelope_protection
        }

        pub fn storage_session_transport_protection(self) -> StorageProtection {
            self.storage_session_transport_protection
        }

        pub fn storage_replay_commit_after_decrypt(self) -> bool {
            self.storage_replay_commit_after_decrypt
        }

        pub fn storage_rollback_protection(self) -> ReplayRollbackProtection {
            self.storage_rollback_protection
        }

        pub fn default_runtime_command_surface_closed(self) -> bool {
            self.default_runtime_command_surface_closed
        }

        pub fn production_messaging_ready(self) -> bool {
            self.production_messaging_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum ProductionSkeletonConnector {
        SessionProtocolAndStatePersistence,
        StorageKeyManagementAndRollback,
        TransportEnvelopeIo,
        RuntimeCommandSurface,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionSkeletonNextConnectorSelection {
        connector: ProductionSkeletonConnector,
        blocker: &'static str,
        required_gate: &'static str,
        opens_runtime_execution: bool,
        production_messaging_ready: bool,
    }

    impl ProductionSkeletonNextConnectorSelection {
        pub fn connector(self) -> ProductionSkeletonConnector {
            self.connector
        }

        pub fn blocker(self) -> &'static str {
            self.blocker
        }

        pub fn required_gate(self) -> &'static str {
            self.required_gate
        }

        pub fn opens_runtime_execution(self) -> bool {
            self.opens_runtime_execution
        }

        pub fn production_messaging_ready(self) -> bool {
            self.production_messaging_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateConnectorGate {
        selected_connector: ProductionSkeletonConnector,
        pairwise_identity_private_key_storage: StorageProtection,
        noise_static_private_key_storage: StorageProtection,
        replay_window_storage: StorageProtection,
        session_transport_storage: StorageProtection,
        replay_commit_after_decrypt: bool,
        rollback_protection: ReplayRollbackProtection,
        opens_storage_unlock_command: bool,
        opens_transport_io: bool,
        opens_runtime_messaging: bool,
        connector_ready: bool,
    }

    impl SessionDurableStateConnectorGate {
        pub fn selected_connector(self) -> ProductionSkeletonConnector {
            self.selected_connector
        }

        pub fn pairwise_identity_private_key_storage(self) -> StorageProtection {
            self.pairwise_identity_private_key_storage
        }

        pub fn noise_static_private_key_storage(self) -> StorageProtection {
            self.noise_static_private_key_storage
        }

        pub fn replay_window_storage(self) -> StorageProtection {
            self.replay_window_storage
        }

        pub fn session_transport_storage(self) -> StorageProtection {
            self.session_transport_storage
        }

        pub fn replay_commit_after_decrypt(self) -> bool {
            self.replay_commit_after_decrypt
        }

        pub fn rollback_protection(self) -> ReplayRollbackProtection {
            self.rollback_protection
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            self.opens_storage_unlock_command
        }

        pub fn opens_transport_io(self) -> bool {
            self.opens_transport_io
        }

        pub fn opens_runtime_messaging(self) -> bool {
            self.opens_runtime_messaging
        }

        pub fn connector_ready(self) -> bool {
            self.connector_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateConnectorHarness {
        selected_connector: ProductionSkeletonConnector,
        pairwise_identity_private_key_encrypted_record_allowed: bool,
        noise_static_private_key_encrypted_record_allowed: bool,
        replay_window_encrypted_record_allowed: bool,
        session_transport_persistence_rejected: bool,
        rollback_protection_required_before_readiness: bool,
        opens_storage_unlock_command: bool,
        opens_transport_io: bool,
        opens_runtime_messaging: bool,
        harness_ready_for_connector_implementation: bool,
    }

    impl SessionDurableStateConnectorHarness {
        pub fn selected_connector(self) -> ProductionSkeletonConnector {
            self.selected_connector
        }

        pub fn pairwise_identity_private_key_encrypted_record_allowed(self) -> bool {
            self.pairwise_identity_private_key_encrypted_record_allowed
        }

        pub fn noise_static_private_key_encrypted_record_allowed(self) -> bool {
            self.noise_static_private_key_encrypted_record_allowed
        }

        pub fn replay_window_encrypted_record_allowed(self) -> bool {
            self.replay_window_encrypted_record_allowed
        }

        pub fn session_transport_persistence_rejected(self) -> bool {
            self.session_transport_persistence_rejected
        }

        pub fn rollback_protection_required_before_readiness(self) -> bool {
            self.rollback_protection_required_before_readiness
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            self.opens_storage_unlock_command
        }

        pub fn opens_transport_io(self) -> bool {
            self.opens_transport_io
        }

        pub fn opens_runtime_messaging(self) -> bool {
            self.opens_runtime_messaging
        }

        pub fn harness_ready_for_connector_implementation(self) -> bool {
            self.harness_ready_for_connector_implementation
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionDurableStateAdapterRecordKind {
        PairwiseIdentityPrivateKey,
        NoiseStaticPrivateKey,
        ReplayWindowState,
        SessionDraft,
        SessionTransportState,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateAdapterRecordPolicy {
        kind: SessionDurableStateAdapterRecordKind,
        production_record_kind: ProductionRecordKind,
        storage_protection: StorageProtection,
        encrypted_record_allowed: bool,
        persistence_allowed: bool,
    }

    impl SessionDurableStateAdapterRecordPolicy {
        pub fn kind(self) -> SessionDurableStateAdapterRecordKind {
            self.kind
        }

        pub fn production_record_kind(self) -> ProductionRecordKind {
            self.production_record_kind
        }

        pub fn storage_protection(self) -> StorageProtection {
            self.storage_protection
        }

        pub fn encrypted_record_allowed(self) -> bool {
            self.encrypted_record_allowed
        }

        pub fn persistence_allowed(self) -> bool {
            self.persistence_allowed
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStatePersistenceAdapterSkeleton {
        selected_connector: ProductionSkeletonConnector,
        opens_storage_unlock_command: bool,
        opens_transport_io: bool,
        opens_runtime_messaging: bool,
        adapter_implementation_ready: bool,
        ready_for_encrypted_record_adapter_spike: bool,
    }

    impl SessionDurableStatePersistenceAdapterSkeleton {
        pub fn selected_connector(self) -> ProductionSkeletonConnector {
            self.selected_connector
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            self.opens_storage_unlock_command
        }

        pub fn opens_transport_io(self) -> bool {
            self.opens_transport_io
        }

        pub fn opens_runtime_messaging(self) -> bool {
            self.opens_runtime_messaging
        }

        pub fn adapter_implementation_ready(self) -> bool {
            self.adapter_implementation_ready
        }

        pub fn ready_for_encrypted_record_adapter_spike(self) -> bool {
            self.ready_for_encrypted_record_adapter_spike
        }

        pub fn record_policy(
            self,
            kind: SessionDurableStateAdapterRecordKind,
        ) -> SessionDurableStateAdapterRecordPolicy {
            let production_record_kind = match kind {
                SessionDurableStateAdapterRecordKind::PairwiseIdentityPrivateKey => {
                    ProductionRecordKind::PairwiseIdentityPrivateKey
                }
                SessionDurableStateAdapterRecordKind::NoiseStaticPrivateKey => {
                    ProductionRecordKind::NoiseStaticPrivateKey
                }
                SessionDurableStateAdapterRecordKind::ReplayWindowState => {
                    ProductionRecordKind::ReplayWindowState
                }
                SessionDurableStateAdapterRecordKind::SessionDraft => {
                    ProductionRecordKind::SessionDraft
                }
                SessionDurableStateAdapterRecordKind::SessionTransportState => {
                    ProductionRecordKind::SessionTransportState
                }
            };

            SessionDurableStateAdapterRecordPolicy {
                kind,
                production_record_kind,
                storage_protection: protection_for(production_record_kind),
                encrypted_record_allowed: require_encrypted_record_allowed(production_record_kind)
                    .is_ok(),
                persistence_allowed: require_persistence_allowed(production_record_kind).is_ok(),
            }
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateEncryptedRecordAdapter {
        skeleton: SessionDurableStatePersistenceAdapterSkeleton,
    }

    impl SessionDurableStateEncryptedRecordAdapter {
        pub fn new(skeleton: SessionDurableStatePersistenceAdapterSkeleton) -> Self {
            Self { skeleton }
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            false
        }

        pub fn opens_transport_io(self) -> bool {
            false
        }

        pub fn opens_runtime_messaging(self) -> bool {
            false
        }

        pub fn persists_records_to_store(self) -> bool {
            false
        }

        pub fn prepare_record(
            self,
            kind: SessionDurableStateAdapterRecordKind,
            scope: EncryptedRecordScope,
            nonce: Vec<u8>,
            sealed_body: Vec<u8>,
        ) -> Result<EncryptedRecord, ProductionSessionError> {
            let policy = self.skeleton.record_policy(kind);
            if !policy.encrypted_record_allowed() || !policy.persistence_allowed() {
                return Err(ProductionSessionError::from(ProductionStorageError::from(
                    ProductionStoragePolicyError::PersistenceForbidden {
                        kind: policy.production_record_kind(),
                    },
                )));
            }
            EncryptedRecord::new(policy.production_record_kind(), scope, nonce, sealed_body)
                .map_err(ProductionStorageError::from)
                .map_err(ProductionSessionError::from)
        }

        #[cfg(test)]
        fn test_only_put_prepared_record(
            self,
            store: &SqlCipherRecordStore,
            record_id: &EncryptedRecordId,
            record: &EncryptedRecord,
        ) -> Result<(), ProductionSessionError> {
            store.put(record_id, record)?;
            Ok(())
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateAdapterNonReadinessGuard {
        rollback_protection: ReplayRollbackProtection,
        prepared_records_persisted: bool,
        store_write_enabled: bool,
        durable_session_persistence_ready: bool,
        production_e2ee_ready: bool,
        durable_noise_transport_persistence_allowed: bool,
        runtime_messaging_enabled: bool,
    }

    impl SessionDurableStateAdapterNonReadinessGuard {
        pub fn rollback_protection(self) -> ReplayRollbackProtection {
            self.rollback_protection
        }

        pub fn prepared_records_persisted(self) -> bool {
            self.prepared_records_persisted
        }

        pub fn store_write_enabled(self) -> bool {
            self.store_write_enabled
        }

        pub fn durable_session_persistence_ready(self) -> bool {
            self.durable_session_persistence_ready
        }

        pub fn production_e2ee_ready(self) -> bool {
            self.production_e2ee_ready
        }

        pub fn durable_noise_transport_persistence_allowed(self) -> bool {
            self.durable_noise_transport_persistence_allowed
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateStoreWriteStatusMirror {
        test_only_store_write_covered: bool,
        production_store_write_enabled: bool,
        production_unlock_command_enabled: bool,
        durable_session_persistence_ready: bool,
        rollback_protection: ReplayRollbackProtection,
        runtime_messaging_enabled: bool,
    }

    impl SessionDurableStateStoreWriteStatusMirror {
        pub fn test_only_store_write_covered(self) -> bool {
            self.test_only_store_write_covered
        }

        pub fn production_store_write_enabled(self) -> bool {
            self.production_store_write_enabled
        }

        pub fn production_unlock_command_enabled(self) -> bool {
            self.production_unlock_command_enabled
        }

        pub fn durable_session_persistence_ready(self) -> bool {
            self.durable_session_persistence_ready
        }

        pub fn rollback_protection(self) -> ReplayRollbackProtection {
            self.rollback_protection
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateProductUnlockBlockerSummary {
        passphrase_first_boundary_exists: bool,
        production_unlock_command_enabled: bool,
        app_key_wrapping_decided: bool,
        backup_exclusion_decided: bool,
        rollback_protection: ReplayRollbackProtection,
        durable_session_persistence_ready: bool,
        runtime_messaging_enabled: bool,
    }

    impl SessionDurableStateProductUnlockBlockerSummary {
        pub fn passphrase_first_boundary_exists(self) -> bool {
            self.passphrase_first_boundary_exists
        }

        pub fn production_unlock_command_enabled(self) -> bool {
            self.production_unlock_command_enabled
        }

        pub fn app_key_wrapping_decided(self) -> bool {
            self.app_key_wrapping_decided
        }

        pub fn backup_exclusion_decided(self) -> bool {
            self.backup_exclusion_decided
        }

        pub fn rollback_protection(self) -> ReplayRollbackProtection {
            self.rollback_protection
        }

        pub fn durable_session_persistence_ready(self) -> bool {
            self.durable_session_persistence_ready
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateUnlockPolicyHandoffSummary {
        passphrase_first_boundary_exists: bool,
        high_risk_requires_passphrase: bool,
        os_keystore_only_rejected: bool,
        production_unlock_command_enabled: bool,
        app_key_wrapping_decided: bool,
        backup_exclusion_decided: bool,
        rollback_protection: ReplayRollbackProtection,
        durable_session_persistence_ready: bool,
        runtime_messaging_enabled: bool,
    }

    impl SessionDurableStateUnlockPolicyHandoffSummary {
        pub fn passphrase_first_boundary_exists(self) -> bool {
            self.passphrase_first_boundary_exists
        }

        pub fn high_risk_requires_passphrase(self) -> bool {
            self.high_risk_requires_passphrase
        }

        pub fn os_keystore_only_rejected(self) -> bool {
            self.os_keystore_only_rejected
        }

        pub fn production_unlock_command_enabled(self) -> bool {
            self.production_unlock_command_enabled
        }

        pub fn app_key_wrapping_decided(self) -> bool {
            self.app_key_wrapping_decided
        }

        pub fn backup_exclusion_decided(self) -> bool {
            self.backup_exclusion_decided
        }

        pub fn rollback_protection(self) -> ReplayRollbackProtection {
            self.rollback_protection
        }

        pub fn durable_session_persistence_ready(self) -> bool {
            self.durable_session_persistence_ready
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionUnlockLockCommandDesignGate {
        high_risk_requires_passphrase: bool,
        os_keystore_only_rejected: bool,
        explicit_lock_required: bool,
        idle_auto_lock_required: bool,
        redacted_unlock_errors_required: bool,
        production_unlock_command_enabled: bool,
        production_lock_command_enabled: bool,
        durable_session_persistence_ready: bool,
        runtime_messaging_enabled: bool,
    }

    impl SessionUnlockLockCommandDesignGate {
        pub fn high_risk_requires_passphrase(self) -> bool {
            self.high_risk_requires_passphrase
        }

        pub fn os_keystore_only_rejected(self) -> bool {
            self.os_keystore_only_rejected
        }

        pub fn explicit_lock_required(self) -> bool {
            self.explicit_lock_required
        }

        pub fn idle_auto_lock_required(self) -> bool {
            self.idle_auto_lock_required
        }

        pub fn redacted_unlock_errors_required(self) -> bool {
            self.redacted_unlock_errors_required
        }

        pub fn production_unlock_command_enabled(self) -> bool {
            self.production_unlock_command_enabled
        }

        pub fn production_lock_command_enabled(self) -> bool {
            self.production_lock_command_enabled
        }

        pub fn durable_session_persistence_ready(self) -> bool {
            self.durable_session_persistence_ready
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct SessionUnlockCommandRequest {
        passphrase_provided: bool,
        os_keystore_wrapped_key_provided: bool,
    }

    impl SessionUnlockCommandRequest {
        pub fn passphrase_only() -> Self {
            Self {
                passphrase_provided: true,
                os_keystore_wrapped_key_provided: false,
            }
        }

        pub fn os_keystore_only() -> Self {
            Self {
                passphrase_provided: false,
                os_keystore_wrapped_key_provided: true,
            }
        }

        pub fn passphrase_and_os_keystore() -> Self {
            Self {
                passphrase_provided: true,
                os_keystore_wrapped_key_provided: true,
            }
        }

        pub fn passphrase_provided(&self) -> bool {
            self.passphrase_provided
        }

        pub fn os_keystore_wrapped_key_provided(&self) -> bool {
            self.os_keystore_wrapped_key_provided
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionUnlockCommandDisabledReason {
        ProductUnlockCommandDisabled,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionUnlockCommandFailClosedResult {
        command_accepted: bool,
        storage_opened: bool,
        session_records_written: bool,
        key_material_exposed: bool,
        runtime_messaging_enabled: bool,
        redacted_reason: SessionUnlockCommandDisabledReason,
    }

    impl SessionUnlockCommandFailClosedResult {
        pub fn command_accepted(self) -> bool {
            self.command_accepted
        }

        pub fn storage_opened(self) -> bool {
            self.storage_opened
        }

        pub fn session_records_written(self) -> bool {
            self.session_records_written
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }

        pub fn redacted_reason(self) -> SessionUnlockCommandDisabledReason {
            self.redacted_reason
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionLockLifecycleStatusMirror {
        explicit_lock_required: bool,
        idle_auto_lock_required: bool,
        default_idle_auto_lock_seconds: u16,
        high_risk_idle_auto_lock_seconds: u16,
        storage_currently_unlocked: bool,
        product_lock_command_enabled: bool,
        key_erasure_claim_available: bool,
        runtime_messaging_enabled: bool,
    }

    impl SessionLockLifecycleStatusMirror {
        pub fn explicit_lock_required(self) -> bool {
            self.explicit_lock_required
        }

        pub fn idle_auto_lock_required(self) -> bool {
            self.idle_auto_lock_required
        }

        pub fn default_idle_auto_lock_seconds(self) -> u16 {
            self.default_idle_auto_lock_seconds
        }

        pub fn high_risk_idle_auto_lock_seconds(self) -> u16 {
            self.high_risk_idle_auto_lock_seconds
        }

        pub fn storage_currently_unlocked(self) -> bool {
            self.storage_currently_unlocked
        }

        pub fn product_lock_command_enabled(self) -> bool {
            self.product_lock_command_enabled
        }

        pub fn key_erasure_claim_available(self) -> bool {
            self.key_erasure_claim_available
        }

        pub fn runtime_messaging_enabled(self) -> bool {
            self.runtime_messaging_enabled
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionUnlockRedactedErrorKind {
        ProductUnlockDisabled,
        PassphraseRequired,
        OsKeystoreOnlyRejected,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionUnlockRedactedErrorTaxonomy {
        kind: SessionUnlockRedactedErrorKind,
        exposes_raw_storage_error: bool,
        exposes_os_keychain_error: bool,
        exposes_path_or_identifier: bool,
        exposes_key_material_or_passphrase_detail: bool,
        retry_after_user_action_allowed: bool,
    }

    impl SessionUnlockRedactedErrorTaxonomy {
        pub fn kind(self) -> SessionUnlockRedactedErrorKind {
            self.kind
        }

        pub fn exposes_raw_storage_error(self) -> bool {
            self.exposes_raw_storage_error
        }

        pub fn exposes_os_keychain_error(self) -> bool {
            self.exposes_os_keychain_error
        }

        pub fn exposes_path_or_identifier(self) -> bool {
            self.exposes_path_or_identifier
        }

        pub fn exposes_key_material_or_passphrase_detail(self) -> bool {
            self.exposes_key_material_or_passphrase_detail
        }

        pub fn retry_after_user_action_allowed(self) -> bool {
            self.retry_after_user_action_allowed
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct LocalMessageIndexEntry {
        contact_id: ContactId,
        message_number: u64,
        message_type: MessageType,
    }

    impl LocalMessageIndexEntry {
        pub fn new(
            contact_id: ContactId,
            message_number: u64,
            message_type: MessageType,
        ) -> Result<Self, ProductionSessionError> {
            if message_number == 0 {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            Ok(Self {
                contact_id,
                message_number,
                message_type,
            })
        }

        pub fn contact_id(&self) -> &ContactId {
            &self.contact_id
        }

        pub fn message_number(&self) -> u64 {
            self.message_number
        }

        pub fn message_type(&self) -> MessageType {
            self.message_type.clone()
        }

        fn encode(&self) -> String {
            format!(
                "ADMSGIDX1|{}|{}|{}",
                self.contact_id.as_str(),
                self.message_number,
                message_type_tag(&self.message_type)
            )
        }

        fn decode(value: &str) -> Result<Self, ProductionSessionError> {
            let parts = value.split('|').collect::<Vec<_>>();
            if parts.len() != 4 || parts[0] != "ADMSGIDX1" {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            let contact_id =
                ContactId::new(parts[1]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            let message_number = parts[2]
                .parse::<u64>()
                .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            let message_type = parse_message_type_tag(parts[3])?;
            Self::new(contact_id, message_number, message_type)
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    struct PendingOutboundMessageRecord {
        contact_id: ContactId,
        message_number: u64,
        message_type: MessageType,
        plaintext: Vec<u8>,
    }

    impl PendingOutboundMessageRecord {
        fn new(
            contact_id: ContactId,
            message_number: u64,
            message_type: MessageType,
            plaintext: &[u8],
        ) -> Result<Self, ProductionSessionError> {
            if message_number == 0 || plaintext.is_empty() {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            Ok(Self {
                contact_id,
                message_number,
                message_type,
                plaintext: plaintext.to_vec(),
            })
        }

        fn encode(&self) -> String {
            format!(
                "ADPENDINGMSG1|{}|{}|{}|{}",
                self.contact_id.as_str(),
                self.message_number,
                message_type_tag(&self.message_type),
                encode_hex(&self.plaintext)
            )
        }

        fn decode(value: &str) -> Result<Self, ProductionSessionError> {
            let parts = value.split('|').collect::<Vec<_>>();
            if parts.len() != 5 || parts[0] != "ADPENDINGMSG1" {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            let contact_id =
                ContactId::new(parts[1]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            let message_number = parts[2]
                .parse::<u64>()
                .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            let message_type = parse_message_type_tag(parts[3])?;
            let plaintext =
                decode_hex(parts[4]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            Self::new(contact_id, message_number, message_type, &plaintext)
        }
    }

    #[derive(Debug)]
    pub struct ProductionEnvelopeSession {
        plan: ProductionSessionPlan,
        channel_id: String,
        transport: NoiseTransportPair,
    }

    impl ProductionEnvelopeSession {
        pub fn plan(&self) -> &ProductionSessionPlan {
            &self.plan
        }

        pub fn channel_id(&self) -> &str {
            &self.channel_id
        }

        fn replay_record_id(&self) -> EncryptedRecordId {
            production_replay_record_id(&self.channel_id)
        }

        fn endpoint_state_record_id(&self, contact_id: &ContactId) -> EncryptedRecordId {
            production_endpoint_state_record_id(&self.channel_id, contact_id)
        }

        #[cfg(test)]
        fn message_envelope_record_id(
            &self,
            message_number: u64,
            message_type: MessageType,
        ) -> EncryptedRecordId {
            production_message_envelope_record_id(&self.channel_id, message_number, message_type)
        }

        fn local_message_index_record_id(
            &self,
            contact_id: &ContactId,
            message_number: u64,
        ) -> EncryptedRecordId {
            production_local_message_index_record_id(&self.channel_id, contact_id, message_number)
        }

        pub fn encrypt_from_canonical_dialer(
            &mut self,
            message_number: u64,
            plaintext: &[u8],
        ) -> Result<Envelope, ProductionSessionError> {
            self.encrypt_from_canonical_dialer_with_type(
                message_number,
                plaintext,
                MessageType::Data,
            )
        }

        pub fn encrypt_control_from_canonical_dialer(
            &mut self,
            message_number: u64,
            plaintext: &[u8],
        ) -> Result<Envelope, ProductionSessionError> {
            self.encrypt_from_canonical_dialer_with_type(
                message_number,
                plaintext,
                MessageType::Control,
            )
        }

        fn encrypt_from_canonical_dialer_with_type(
            &mut self,
            message_number: u64,
            plaintext: &[u8],
            message_type: MessageType,
        ) -> Result<Envelope, ProductionSessionError> {
            Ok(Envelope {
                protocol_version: 1,
                channel_id: self.channel_id.clone(),
                message_number,
                message_type,
                padded_ciphertext: self.transport.initiator_encrypt(plaintext)?,
            })
        }

        pub fn encrypt_endpoint_update_from_canonical_dialer(
            &mut self,
            update: &PairwiseEndpointUpdate,
            message_number: u64,
        ) -> Result<EncryptedEndpointUpdateControlEnvelope, ProductionSessionError> {
            let plaintext = EndpointUpdateControlPlaintext::from_pairwise_update(update);
            let envelope = self.encrypt_control_from_canonical_dialer(
                message_number,
                &plaintext.encode_padded()?,
            )?;
            EncryptedEndpointUpdateControlEnvelope::from_control_envelope(update, envelope)
                .map_err(ProductionSessionError::from)
        }

        pub fn decrypt_at_responder(
            &mut self,
            envelope: &Envelope,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            if envelope.channel_id != self.channel_id || envelope.message_type != MessageType::Data
            {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            self.transport
                .responder_decrypt(&envelope.padded_ciphertext)
                .map_err(ProductionSessionError::from)
        }

        pub fn decrypt_control_at_responder(
            &mut self,
            envelope: &Envelope,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            if envelope.channel_id != self.channel_id
                || envelope.message_type != MessageType::Control
            {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            self.transport
                .responder_decrypt(&envelope.padded_ciphertext)
                .map_err(ProductionSessionError::from)
        }

        pub fn decrypt_at_responder_with_replay(
            &mut self,
            envelope: &Envelope,
            replay_window: &mut ReplayWindow,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            let mut next_replay_window = replay_window.clone();
            next_replay_window.accept(envelope.message_number)?;
            let plaintext = self.decrypt_at_responder(envelope)?;
            *replay_window = next_replay_window;
            Ok(plaintext)
        }

        fn decrypt_at_responder_with_persistent_replay(
            &mut self,
            envelope: &Envelope,
            store: &SqlCipherRecordStore,
            replay_record_id: &EncryptedRecordId,
            replay_scope: EncryptedRecordScope,
            window_size: u64,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            let mut replay_window = store
                .load_replay_window(replay_record_id)?
                .map(Ok)
                .unwrap_or_else(|| ReplayWindow::new(window_size))?;
            let plaintext = self.decrypt_at_responder_with_replay(envelope, &mut replay_window)?;
            store.save_replay_window(replay_record_id, replay_scope, &replay_window)?;
            Ok(plaintext)
        }

        pub fn decrypt_at_responder_with_session_replay(
            &mut self,
            envelope: &Envelope,
            store: &SqlCipherRecordStore,
            replay_scope: EncryptedRecordScope,
            window_size: u64,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            let replay_record_id = self.replay_record_id();
            self.decrypt_at_responder_with_persistent_replay(
                envelope,
                store,
                &replay_record_id,
                replay_scope,
                window_size,
            )
        }

        pub fn save_pairwise_endpoint_state(
            &self,
            store: &SqlCipherRecordStore,
            scope: EncryptedRecordScope,
            endpoint: &PairwiseRendezvousEndpoint,
        ) -> Result<EncryptedRecordId, ProductionSessionError> {
            if scope.contact_id() != Some(endpoint.contact_id()) {
                return Err(ProductionSessionError::EndpointScopeMismatch);
            }
            let record_id = self.endpoint_state_record_id(endpoint.contact_id());
            let record = EncryptedRecord::new(
                ProductionRecordKind::RendezvousEndpointState,
                scope,
                b"sqlcipher-page-encryption-v1".to_vec(),
                endpoint.encode_state().into_bytes(),
            )
            .map_err(ProductionStorageError::from)?;
            store.put(&record_id, &record)?;
            Ok(record_id)
        }

        pub fn load_pairwise_endpoint_state(
            &self,
            store: &SqlCipherRecordStore,
            contact_id: &ContactId,
        ) -> Result<Option<PairwiseRendezvousEndpoint>, ProductionSessionError> {
            let record_id = self.endpoint_state_record_id(contact_id);
            store
                .get(&record_id)?
                .map(|record| {
                    if record.kind != ProductionRecordKind::RendezvousEndpointState {
                        return Err(ProductionSessionError::UnexpectedEnvelope);
                    }
                    let state = String::from_utf8(record.sealed_body)
                        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                    let endpoint = PairwiseRendezvousEndpoint::decode_state(&state)?;
                    if endpoint.contact_id() != contact_id {
                        return Err(ProductionSessionError::EndpointScopeMismatch);
                    }
                    Ok(endpoint)
                })
                .transpose()
        }

        pub fn delete_pairwise_endpoint_state(
            &self,
            store: &SqlCipherRecordStore,
            contact_id: &ContactId,
        ) -> Result<(), ProductionSessionError> {
            let record_id = self.endpoint_state_record_id(contact_id);
            store.delete(&record_id)?;
            Ok(())
        }

        pub fn save_local_message_index(
            &self,
            store: &SqlCipherRecordStore,
            scope: EncryptedRecordScope,
            entry: &LocalMessageIndexEntry,
        ) -> Result<EncryptedRecordId, ProductionSessionError> {
            if scope.contact_id() != Some(entry.contact_id()) {
                return Err(ProductionSessionError::EndpointScopeMismatch);
            }
            let record_id =
                self.local_message_index_record_id(entry.contact_id(), entry.message_number());
            let record = EncryptedRecord::new(
                ProductionRecordKind::LocalMessageIndex,
                scope,
                b"sqlcipher-page-encryption-v1".to_vec(),
                entry.encode().into_bytes(),
            )
            .map_err(ProductionStorageError::from)?;
            store.put(&record_id, &record)?;
            Ok(record_id)
        }

        pub fn load_local_message_index(
            &self,
            store: &SqlCipherRecordStore,
            contact_id: &ContactId,
            message_number: u64,
        ) -> Result<Option<LocalMessageIndexEntry>, ProductionSessionError> {
            let record_id = self.local_message_index_record_id(contact_id, message_number);
            store
                .get(&record_id)?
                .map(|record| {
                    if record.kind != ProductionRecordKind::LocalMessageIndex {
                        return Err(ProductionSessionError::UnexpectedEnvelope);
                    }
                    let state = String::from_utf8(record.sealed_body)
                        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                    let entry = LocalMessageIndexEntry::decode(&state)?;
                    if entry.contact_id() != contact_id || entry.message_number() != message_number
                    {
                        return Err(ProductionSessionError::EndpointScopeMismatch);
                    }
                    Ok(entry)
                })
                .transpose()
        }
    }

    #[derive(Debug, Eq, PartialEq)]
    pub enum ProductionSessionError {
        Pairing(PairingError),
        Crypto(CryptoError),
        Identity(IdentityError),
        Protocol(ProtocolError),
        Storage(ProductionStorageError),
        EndpointLifecycle(EndpointLifecycleError),
        NonProductionPairingPayload,
        ProfileMarkerMissing,
        IdentityPrivateKeyMissing,
        NoiseStaticPrivateKeyMissing,
        LocalPairingPayloadMismatch,
        SessionDraftMissing,
        SamePairwiseIdentity,
        SameRendezvousEndpoint,
        InvalidRendezvousEndpoint,
        NoiseStaticKeyMismatch,
        UnexpectedEnvelope,
        EndpointScopeMismatch,
    }

    impl From<PairingError> for ProductionSessionError {
        fn from(value: PairingError) -> Self {
            Self::Pairing(value)
        }
    }

    impl From<CryptoError> for ProductionSessionError {
        fn from(value: CryptoError) -> Self {
            Self::Crypto(value)
        }
    }

    impl From<IdentityError> for ProductionSessionError {
        fn from(value: IdentityError) -> Self {
            Self::Identity(value)
        }
    }

    impl From<ProtocolError> for ProductionSessionError {
        fn from(value: ProtocolError) -> Self {
            Self::Protocol(value)
        }
    }

    impl From<ProductionStorageError> for ProductionSessionError {
        fn from(value: ProductionStorageError) -> Self {
            Self::Storage(value)
        }
    }

    impl From<EndpointLifecycleError> for ProductionSessionError {
        fn from(value: EndpointLifecycleError) -> Self {
            Self::EndpointLifecycle(value)
        }
    }

    impl ProductionSessionPlan {
        pub fn canonical_connection_direction(&self) -> SessionConnectionDirection {
            match self.local_role {
                SessionRole::CanonicalDialer => SessionConnectionDirection::Outbound,
                SessionRole::Responder => SessionConnectionDirection::Inbound,
            }
        }

        pub fn is_canonical_connection_direction(
            &self,
            observed_direction: SessionConnectionDirection,
        ) -> bool {
            observed_direction == self.canonical_connection_direction()
        }

        pub fn duplicate_connection_action(
            &self,
            observed_direction: SessionConnectionDirection,
            canonical_state: CanonicalConnectionState,
        ) -> DuplicateConnectionAction {
            if self.is_canonical_connection_direction(observed_direction) {
                return DuplicateConnectionAction::KeepCanonicalConnection;
            }
            if canonical_state == CanonicalConnectionState::AuthenticatedHealthy {
                DuplicateConnectionAction::CloseDuplicateConnection
            } else {
                DuplicateConnectionAction::WaitForCanonicalConnection
            }
        }
    }

    pub fn production_setup_draft_with_defaults(
        profile: &ProfileName,
        rendezvous_endpoint: impl Into<String>,
    ) -> Result<ProductionSetupDraft, ProductionSessionError> {
        let noise_static = generate_noise_static_keypair()?;
        let prekey_bundle = noise_static.prekey_bundle()?.encode();
        let pairing =
            production_pairing_draft_with_defaults(profile, rendezvous_endpoint, prekey_bundle)?;
        Ok(ProductionSetupDraft {
            pairing,
            noise_static,
        })
    }

    pub fn production_profile_init(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionProfileInitSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        store.put_profile_marker(profile)?;
        Ok(ProductionProfileInitSummary {
            storage_opened: true,
            profile_marker_written: true,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_profile_status(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionProfileStatusSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        let profile_marker_present = store.profile_marker_exists(&profile)?;
        Ok(ProductionProfileStatusSummary {
            storage_opened: true,
            profile_marker_present,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_profile_identity_init(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionProfileIdentityInitSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let private_key = ProductionPairwisePrivateKey::generate_ed25519_dalek()?;
        let public_key_derivable = private_key.public_key().is_ok();
        store.put(
            &production_identity_private_key_record_id(),
            &encode_production_identity_private_key_record(profile, &private_key)?,
        )?;
        Ok(ProductionProfileIdentityInitSummary {
            storage_opened: true,
            identity_private_key_written: true,
            identity_public_key_derivable: public_key_derivable,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_profile_identity_status(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionProfileIdentityStatusSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let identity = store
            .get(&production_identity_private_key_record_id())?
            .map(decode_production_identity_private_key_record)
            .transpose()?;
        let identity_public_key_derivable = identity
            .as_ref()
            .is_some_and(|private_key| private_key.public_key().is_ok());
        Ok(ProductionProfileIdentityStatusSummary {
            storage_opened: true,
            identity_private_key_present: identity.is_some(),
            identity_public_key_derivable,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_payload_create(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        rendezvous_endpoint: impl Into<String>,
    ) -> Result<ProductionPairingPayloadCreateSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let identity = store
            .get(&production_identity_private_key_record_id())?
            .map(decode_production_identity_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::IdentityPrivateKeyMissing)?;
        let noise_static = generate_noise_static_keypair()?;
        let prekey_bundle = noise_static.prekey_bundle()?.encode();
        let payload = production_pairing_payload_with_defaults(
            &profile,
            &identity,
            rendezvous_endpoint,
            prekey_bundle,
        )?;
        store.put(
            &production_latest_pairing_noise_static_record_id(),
            &encode_production_noise_static_private_key_record(
                profile,
                payload.pairing_nonce.clone(),
                &noise_static,
            )?,
        )?;
        Ok(ProductionPairingPayloadCreateSummary {
            storage_opened: true,
            identity_private_key_loaded: true,
            noise_static_private_key_written: true,
            payload,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_prepare(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        local_payload: &PairingPayload,
        remote_payload: &PairingPayload,
    ) -> Result<ProductionPairingSessionPrepareSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let (plan, _local_noise_static) =
            prepare_pairing_session_parts(&store, &profile, local_payload, remote_payload)?;
        Ok(ProductionPairingSessionPrepareSummary {
            storage_opened: true,
            session_plan_created: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_payload: true,
            safety_transcript_bound: !plan.safety_transcript.is_empty(),
            canonical_dialer_selected: !plan.canonical_dialer_public_key.is_empty(),
            local_role: plan.local_role,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_save_draft(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        local_payload: &PairingPayload,
        remote_payload: &PairingPayload,
    ) -> Result<ProductionPairingSessionSaveDraftSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let (plan, local_noise_static) =
            prepare_pairing_session_parts(&store, &profile, local_payload, remote_payload)?;
        let channel_id = production_channel_id(&plan);
        let remote_contact_id = remote_payload.contact_id()?;
        let replay_record_id = production_replay_record_id(&channel_id);
        let remote_endpoint_record_id =
            production_endpoint_state_record_id(&channel_id, &remote_contact_id);
        let session_draft_record = encode_production_session_draft_record(
            profile.clone(),
            &plan,
            &channel_id,
            &remote_contact_id,
        )?;
        store.put(
            &production_latest_session_draft_record_id(),
            &session_draft_record,
        )?;
        let endpoint_record = EncryptedRecord::new(
            ProductionRecordKind::RendezvousEndpointState,
            EncryptedRecordScope::contact(profile.clone(), remote_contact_id.clone()),
            b"sqlcipher-page-encryption-v1".to_vec(),
            plan.remote_rendezvous_endpoint.encode_state().into_bytes(),
        )
        .map_err(ProductionStorageError::from)?;
        store.put(&remote_endpoint_record_id, &endpoint_record)?;
        store.save_replay_window(
            &replay_record_id,
            EncryptedRecordScope::contact(profile, remote_contact_id),
            &ReplayWindow::new(128)?,
        )?;
        Ok(ProductionPairingSessionSaveDraftSummary {
            storage_opened: true,
            session_plan_created: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_payload: {
                local_noise_static.pairing_nonce == local_payload.pairing_nonce
                    && local_noise_static.keypair.public_key() == plan.local_noise_static_public_key
            },
            session_draft_written: true,
            remote_endpoint_state_written: true,
            replay_window_written: true,
            channel_id_derivable: !channel_id.is_empty(),
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_status(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionPairingSessionStatusSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?;
        let Some(draft) = draft else {
            return Ok(ProductionPairingSessionStatusSummary {
                storage_opened: true,
                session_draft_present: false,
                channel_id_derivable: false,
                local_role_available: false,
                remote_contact_present: false,
                remote_endpoint_state_present: false,
                replay_window_present: false,
                key_material_exposed: false,
                transport_io_opened: false,
                runtime_messaging_enabled: false,
            });
        };
        let expected_replay_id = production_replay_record_id_text(&draft.channel_id);
        let replay_record_id = production_replay_record_id(&draft.channel_id);
        let endpoint_state_present = load_remote_endpoint_state(&store, &draft)?.is_some();
        let replay_window_present = store.load_replay_window(&replay_record_id)?.is_some();
        Ok(ProductionPairingSessionStatusSummary {
            storage_opened: true,
            session_draft_present: true,
            channel_id_derivable: !draft.channel_id.is_empty()
                && draft.replay_record_id == expected_replay_id,
            local_role_available: matches!(
                draft.local_role,
                SessionRole::CanonicalDialer | SessionRole::Responder
            ) && draft.safety_transcript_present,
            remote_contact_present: true,
            remote_endpoint_state_present: endpoint_state_present,
            replay_window_present,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_load_runtime(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionPairingSessionRuntimeLoadSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        let local_matches_draft =
            local_noise_static.keypair.public_key() == draft.local_noise_static_public_key;
        if !local_matches_draft {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        let endpoint = load_remote_endpoint_state(&store, &draft)?;
        let replay_window =
            store.load_replay_window(&production_replay_record_id(&draft.channel_id))?;
        let remote_noise_loaded = !draft.remote_noise_static_public_key.is_empty();
        let endpoint_loaded = endpoint.is_some();
        let replay_loaded = replay_window.is_some();
        Ok(ProductionPairingSessionRuntimeLoadSummary {
            storage_opened: true,
            session_draft_loaded: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_draft: true,
            remote_noise_static_public_key_loaded: remote_noise_loaded,
            remote_endpoint_state_loaded: endpoint_loaded,
            replay_window_loaded: replay_loaded,
            runtime_material_reconstructable: remote_noise_loaded
                && endpoint_loaded
                && replay_loaded,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_open_runtime(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionPairingSessionRuntimeOpenSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let material = load_session_runtime_material(&store, &profile)?;
        open_fail_closed_outbound_runtime(&material)?;
        Ok(ProductionPairingSessionRuntimeOpenSummary {
            storage_opened: true,
            runtime_material_reconstructable: true,
            outbound_stream_gate_ready: true,
            outbound_fail_closed_adapter_ready: true,
            outbound_stream_preparation_ready: true,
            session_binding_ready: true,
            remote_peer_authentication_ready: true,
            outbound_envelope_io_ready: true,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_transport_prepare(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionPairingSessionTransportPrepareSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let _material = load_session_runtime_material(&store, &profile)?;
        let session_transport_persistence_allowed =
            require_persistence_allowed(ProductionRecordKind::SessionTransportState).is_ok();
        Ok(ProductionPairingSessionTransportPrepareSummary {
            storage_opened: true,
            runtime_material_reconstructable: true,
            local_noise_static_private_key_loaded: true,
            remote_noise_static_public_key_loaded: true,
            remote_endpoint_state_loaded: true,
            replay_window_loaded: true,
            authenticated_handshake_required: true,
            session_transport_state_created: false,
            session_transport_persistence_allowed,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_handshake_init(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionPairingSessionHandshakeInitSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        let local_matches_draft =
            local_noise_static.keypair.public_key() == draft.local_noise_static_public_key;
        if !local_matches_draft {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        let local_role_can_initiate = draft.local_role == SessionRole::CanonicalDialer;
        let handshake = if local_role_can_initiate {
            Some(prepare_noise_xx_handshake_init_message(
                &draft.safety_transcript,
                &local_noise_static.keypair,
            )?)
        } else {
            None
        };
        Ok(ProductionPairingSessionHandshakeInitSummary {
            storage_opened: true,
            session_draft_loaded: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_draft: true,
            safety_transcript_loaded: draft.safety_transcript_present,
            local_role_can_initiate,
            handshake_message_created: handshake.is_some(),
            handshake_message_len: handshake.map(|summary| summary.message_len).unwrap_or(0),
            handshake_message_exposed: false,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_handshake_init_export(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
    ) -> Result<ProductionPairingSessionHandshakeInitExport, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        let local_matches_draft =
            local_noise_static.keypair.public_key() == draft.local_noise_static_public_key;
        if !local_matches_draft {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        let local_role_can_initiate = draft.local_role == SessionRole::CanonicalDialer;
        let init_export = if local_role_can_initiate {
            Some(create_noise_xx_handshake_init_export(
                &draft.safety_transcript,
                &local_noise_static.keypair,
            )?)
        } else {
            None
        };
        if let Some(init_export) = &init_export {
            let state_record = encode_production_handshake_initiator_state_record(
                profile,
                &draft.channel_id,
                &init_export.message,
                &init_export.initiator_ephemeral_private,
            )?;
            store.put(
                &production_pending_handshake_initiator_state_record_id(),
                &state_record,
            )?;
        }
        let message = if let Some(init_export) = &init_export {
            init_export.message.clone()
        } else {
            Vec::new()
        };
        let export_payload = if message.is_empty() {
            String::new()
        } else {
            format!("ADNOISEXXINIT1|{}\n", encode_hex(&message))
        };
        Ok(ProductionPairingSessionHandshakeInitExport {
            storage_opened: true,
            session_draft_loaded: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_draft: true,
            safety_transcript_loaded: draft.safety_transcript_present,
            local_role_can_initiate,
            handshake_message_created: !message.is_empty(),
            handshake_message_len: message.len(),
            handshake_message_exposed: false,
            export_payload,
            initiator_state_written: init_export.is_some(),
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_handshake_init_import(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        import_payload: &str,
    ) -> Result<ProductionPairingSessionHandshakeInitImportSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let message = decode_handshake_init_export(import_payload)?;
        Ok(ProductionPairingSessionHandshakeInitImportSummary {
            storage_opened: true,
            session_draft_loaded: true,
            safety_transcript_loaded: draft.safety_transcript_present,
            local_role_can_accept: draft.local_role == SessionRole::Responder,
            handshake_message_read: !import_payload.is_empty(),
            handshake_message_decodable: true,
            handshake_message_len: message.len(),
            handshake_message_exposed: false,
            responder_state_created: false,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_handshake_reply_export(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        init_payload: &str,
    ) -> Result<ProductionPairingSessionHandshakeReplyExport, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        let local_matches_draft =
            local_noise_static.keypair.public_key() == draft.local_noise_static_public_key;
        if !local_matches_draft {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        let init_message = decode_handshake_init_export(init_payload)?;
        let local_role_can_accept = draft.local_role == SessionRole::Responder;
        let reply_export = if local_role_can_accept {
            Some(
                create_noise_xx_handshake_reply_export(
                    &draft.safety_transcript,
                    &local_noise_static.keypair,
                    &init_message,
                )
                .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?,
            )
        } else {
            None
        };
        if let Some(reply_export) = &reply_export {
            let state_record = encode_production_handshake_responder_state_record(
                profile,
                &draft.channel_id,
                &init_message,
                &reply_export.responder_ephemeral_private,
            )?;
            store.put(
                &production_pending_handshake_initiator_state_record_id(),
                &state_record,
            )?;
        }
        let reply_message = if let Some(reply_export) = &reply_export {
            reply_export.message.clone()
        } else {
            Vec::new()
        };
        let export_payload = if reply_message.is_empty() {
            String::new()
        } else {
            format!("ADNOISEXXREPLY1|{}\n", encode_hex(&reply_message))
        };
        Ok(ProductionPairingSessionHandshakeReplyExport {
            storage_opened: true,
            session_draft_loaded: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_draft: true,
            safety_transcript_loaded: draft.safety_transcript_present,
            local_role_can_accept,
            init_message_read: !init_payload.is_empty(),
            init_message_decodable: true,
            init_message_len: init_message.len(),
            reply_message_created: !reply_message.is_empty(),
            reply_message_len: reply_message.len(),
            reply_message_exposed: false,
            export_payload,
            responder_state_persisted: reply_export.is_some(),
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_handshake_finish_export(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        reply_payload: &str,
    ) -> Result<ProductionPairingSessionHandshakeFinishExport, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        let local_matches_draft =
            local_noise_static.keypair.public_key() == draft.local_noise_static_public_key;
        if !local_matches_draft {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        let state = store
            .get(&production_pending_handshake_initiator_state_record_id())?
            .map(|record| {
                decode_production_handshake_initiator_state_record(
                    record,
                    &profile,
                    &draft.channel_id,
                )
            })
            .transpose()?
            .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
        let reply_message = decode_handshake_reply_export(reply_payload)?;
        let local_role_can_finish = draft.local_role == SessionRole::CanonicalDialer;
        let finish_export = if local_role_can_finish {
            Some(
                create_noise_xx_handshake_finish_export(
                    &draft.safety_transcript,
                    &local_noise_static.keypair,
                    &state.initiator_ephemeral_private,
                    &reply_message,
                )
                .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?,
            )
        } else {
            None
        };
        if let Some(finish_export) = &finish_export {
            if finish_export.initiator_remote_static != draft.remote_noise_static_public_key {
                return Err(ProductionSessionError::NoiseStaticKeyMismatch);
            }
            let transport_record = encode_production_session_transport_state_record(
                profile,
                &draft,
                &finish_export.initiator_remote_static,
                "reply",
                &reply_message,
            )?;
            store.put(
                &production_session_transport_state_record_id(&draft.channel_id),
                &transport_record,
            )?;
        }
        let finish_message = if let Some(finish_export) = &finish_export {
            finish_export.message.clone()
        } else {
            Vec::new()
        };
        let export_payload = if finish_message.is_empty() {
            String::new()
        } else {
            format!("ADNOISEXXFINISH1|{}\n", encode_hex(&finish_message))
        };
        Ok(ProductionPairingSessionHandshakeFinishExport {
            storage_opened: true,
            session_draft_loaded: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_draft: true,
            safety_transcript_loaded: draft.safety_transcript_present,
            local_role_can_finish,
            initiator_state_loaded: !state.init_message.is_empty() && !state.channel_id.is_empty(),
            reply_message_read: !reply_payload.is_empty(),
            reply_message_decodable: true,
            reply_message_len: reply_message.len(),
            finish_message_created: !finish_message.is_empty(),
            finish_message_len: finish_message.len(),
            finish_message_exposed: false,
            export_payload,
            transport_state_persisted: finish_export
                .as_ref()
                .is_some_and(|finish_export| finish_export.transport_state_created),
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_pairing_session_handshake_finish_import(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        finish_payload: &str,
    ) -> Result<ProductionPairingSessionHandshakeFinishImportSummary, ProductionSessionError> {
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        let local_matches_draft =
            local_noise_static.keypair.public_key() == draft.local_noise_static_public_key;
        if !local_matches_draft {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        let state = store
            .get(&production_pending_handshake_initiator_state_record_id())?
            .map(|record| {
                decode_production_handshake_responder_state_record(
                    record,
                    &profile,
                    &draft.channel_id,
                )
            })
            .transpose()?
            .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
        let finish_message = decode_handshake_finish_export(finish_payload)?;
        let local_role_can_complete = draft.local_role == SessionRole::Responder;
        let complete = if local_role_can_complete {
            Some(
                validate_noise_xx_handshake_finish_message(
                    &draft.safety_transcript,
                    &local_noise_static.keypair,
                    &state.init_message,
                    &state.responder_ephemeral_private,
                    &finish_message,
                )
                .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?,
            )
        } else {
            None
        };
        let remote_static_verified = complete.as_ref().is_some_and(|complete| {
            complete.responder_remote_static == draft.remote_noise_static_public_key
        });
        if local_role_can_complete && !remote_static_verified {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        if let Some(complete) = &complete {
            let transport_record = encode_production_session_transport_state_record(
                profile,
                &draft,
                &complete.responder_remote_static,
                "finish",
                &finish_message,
            )?;
            store.put(
                &production_session_transport_state_record_id(&draft.channel_id),
                &transport_record,
            )?;
        }
        let transport_state_persisted = complete
            .as_ref()
            .is_some_and(|complete| complete.transport_state_created);
        Ok(ProductionPairingSessionHandshakeFinishImportSummary {
            storage_opened: true,
            session_draft_loaded: true,
            local_noise_static_private_key_loaded: true,
            local_noise_static_matches_draft: true,
            safety_transcript_loaded: draft.safety_transcript_present,
            local_role_can_complete,
            responder_state_loaded: !state.init_message.is_empty() && !state.channel_id.is_empty(),
            finish_message_read: !finish_payload.is_empty(),
            finish_message_decodable: true,
            finish_message_len: finish_message.len(),
            remote_static_verified,
            transport_state_created: complete
                .as_ref()
                .is_some_and(|complete| complete.transport_state_created),
            transport_state_persisted,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    fn open_fail_closed_outbound_runtime(
        material: &ProductionSessionRuntimeMaterial,
    ) -> Result<(), ProductionSessionError> {
        let policy = TransportPolicy::high_risk_default();
        let outbound_gate_ready = OutboundStreamGateDecision::from_pairwise_endpoint_and_policy(
            material.remote_endpoint.clone(),
            policy.clone(),
        )
        .check()
        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let outbound_adapter =
            another_dimension_transport::OutboundStreamFailClosedAdapter::from_gate_ready(
                outbound_gate_ready,
                material.remote_endpoint.clone(),
                policy.clone(),
            )
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let outbound_preparation_ready =
            OutboundStreamPreparationBoundary::from_fail_closed_adapter(
                outbound_gate_ready,
                &outbound_adapter,
            )
            .check()
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let session_binding = PairwiseStreamSessionBinding::from_verified_pairwise_session(
            material.remote_contact_id.clone(),
            RedactedStreamSessionVerificationContext::verified_pairwise_encrypted_session(),
        )
        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let remote_auth = RemotePeerAuthenticationReady::from_authenticated_pairwise_peer(
            material.remote_contact_id.clone(),
            RedactedRemotePeerAuthenticationContext::authenticated_pairwise_peer(),
        )
        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let outbound_boundary = OnionOutboundStreamBoundary::from_pairwise_endpoint(
            material.remote_endpoint.clone(),
            policy,
        )
        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let bound = BoundOutboundStreamSession::from_outbound_stream(
            outbound_boundary,
            session_binding,
            remote_auth,
        )
        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let _io_boundary = OutboundEnvelopeIoAdapterBoundary::from_bound_stream_session(
            bound,
            EnvelopeIoAdapterReady::fail_closed(),
        )
        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let _ = outbound_preparation_ready;
        Ok(())
    }

    pub fn production_message_send_prepare(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        message_number: u64,
        plaintext: &[u8],
    ) -> Result<ProductionMessageSendPrepareSummary, ProductionSessionError> {
        if plaintext.is_empty() {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let material = load_session_runtime_material(&store, &profile)?;
        open_fail_closed_outbound_runtime(&material)?;
        let entry = LocalMessageIndexEntry::new(
            material.remote_contact_id.clone(),
            message_number,
            MessageType::Data,
        )?;
        let record_id = production_local_message_index_record_id(
            &material.channel_id,
            &material.remote_contact_id,
            message_number,
        );
        let message_record_id = production_message_envelope_record_id(
            &material.channel_id,
            message_number,
            MessageType::Data,
        );
        if store.get(&record_id)?.is_some() || store.get(&message_record_id)?.is_some() {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let record = EncryptedRecord::new(
            ProductionRecordKind::LocalMessageIndex,
            EncryptedRecordScope::contact(profile.clone(), material.remote_contact_id.clone()),
            b"sqlcipher-page-encryption-v1".to_vec(),
            entry.encode().into_bytes(),
        )
        .map_err(ProductionStorageError::from)?;
        store.put(&record_id, &record)?;
        let pending = PendingOutboundMessageRecord::new(
            material.remote_contact_id.clone(),
            message_number,
            MessageType::Data,
            plaintext,
        )?;
        let message_record = EncryptedRecord::new(
            ProductionRecordKind::MessageEnvelope,
            EncryptedRecordScope::contact(profile, material.remote_contact_id),
            b"sqlcipher-page-encryption-v1".to_vec(),
            pending.encode().into_bytes(),
        )
        .map_err(ProductionStorageError::from)?;
        store.put(&message_record_id, &message_record)?;
        Ok(ProductionMessageSendPrepareSummary {
            storage_opened: true,
            runtime_material_reconstructable: true,
            outbound_envelope_io_ready: true,
            plaintext_accepted: true,
            message_number_reserved: true,
            local_message_index_written: true,
            pending_message_record_written: true,
            envelope_encryption_ready: false,
            network_send_attempted: false,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_message_pending_status(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        message_number: u64,
    ) -> Result<ProductionMessagePendingStatusSummary, ProductionSessionError> {
        if message_number == 0 {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let material = load_session_runtime_material(&store, &profile)?;
        let index_record_id = production_local_message_index_record_id(
            &material.channel_id,
            &material.remote_contact_id,
            message_number,
        );
        let message_record_id = production_message_envelope_record_id(
            &material.channel_id,
            message_number,
            MessageType::Data,
        );
        let index = store
            .get(&index_record_id)?
            .map(|record| {
                if record.kind != ProductionRecordKind::LocalMessageIndex {
                    return Err(ProductionSessionError::UnexpectedEnvelope);
                }
                let state = String::from_utf8(record.sealed_body)
                    .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                LocalMessageIndexEntry::decode(&state)
            })
            .transpose()?;
        let pending = store
            .get(&message_record_id)?
            .map(|record| {
                if record.kind != ProductionRecordKind::MessageEnvelope {
                    return Err(ProductionSessionError::UnexpectedEnvelope);
                }
                let state = String::from_utf8(record.sealed_body)
                    .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                PendingOutboundMessageRecord::decode(&state)
            })
            .transpose()?;
        let local_message_index_matches_pending = match (&index, &pending) {
            (Some(index), Some(pending)) => {
                index.contact_id() == &material.remote_contact_id
                    && pending.contact_id == material.remote_contact_id
                    && index.message_number() == message_number
                    && pending.message_number == message_number
                    && index.message_type() == pending.message_type
            }
            _ => false,
        };
        Ok(ProductionMessagePendingStatusSummary {
            storage_opened: true,
            runtime_material_reconstructable: true,
            local_message_index_present: index.is_some(),
            pending_message_record_present: pending.is_some(),
            pending_message_record_decodable: pending.is_some(),
            local_message_index_matches_pending,
            plaintext_exposed: false,
            envelope_encryption_ready: false,
            network_send_attempted: false,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_message_outbound_encrypt_prepare(
        store_path: impl AsRef<std::path::Path>,
        profile: ProfileName,
        passphrase: &ProfilePassphrase,
        message_number: u64,
    ) -> Result<ProductionMessageOutboundEncryptPrepareSummary, ProductionSessionError> {
        if message_number == 0 {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let locked = LockedProfileStore::new(store_path.as_ref());
        let store = locked.unlock(passphrase)?;
        if !store.profile_marker_exists(&profile)? {
            return Err(ProductionSessionError::ProfileMarkerMissing);
        }
        let material = load_session_runtime_material(&store, &profile)?;
        let draft = load_latest_session_draft(&store, &profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        if local_noise_static.keypair.public_key() != draft.local_noise_static_public_key {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        let transport_state = load_session_transport_state(&store, &profile, &draft)?;
        let index_record_id = production_local_message_index_record_id(
            &material.channel_id,
            &material.remote_contact_id,
            message_number,
        );
        let message_record_id = production_message_envelope_record_id(
            &material.channel_id,
            message_number,
            MessageType::Data,
        );
        let index = store
            .get(&index_record_id)?
            .map(|record| {
                if record.kind != ProductionRecordKind::LocalMessageIndex {
                    return Err(ProductionSessionError::UnexpectedEnvelope);
                }
                let state = String::from_utf8(record.sealed_body)
                    .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                LocalMessageIndexEntry::decode(&state)
            })
            .transpose()?;
        let pending = store
            .get(&message_record_id)?
            .map(|record| {
                if record.kind != ProductionRecordKind::MessageEnvelope {
                    return Err(ProductionSessionError::UnexpectedEnvelope);
                }
                let state = String::from_utf8(record.sealed_body)
                    .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                PendingOutboundMessageRecord::decode(&state)
            })
            .transpose()?;
        let local_message_index_matches_pending = match (&index, &pending) {
            (Some(index), Some(pending)) => {
                index.contact_id() == &material.remote_contact_id
                    && pending.contact_id == material.remote_contact_id
                    && index.message_number() == message_number
                    && pending.message_number == message_number
                    && index.message_type() == pending.message_type
                    && !pending.plaintext.is_empty()
            }
            _ => false,
        };
        let session_transport_ready = transport_state.as_ref().is_some_and(|state| {
            state.channel_id == material.channel_id
                && state.local_role == draft.local_role
                && state.remote_contact_id == material.remote_contact_id
                && state.remote_noise_static_public_key == draft.remote_noise_static_public_key
                && state.transport_state_created
        });
        let envelope_encryption_ready = local_message_index_matches_pending
            && session_transport_ready
            && draft.local_role == SessionRole::CanonicalDialer
            && transport_state
                .as_ref()
                .is_some_and(|state| state.handshake_message_kind == "reply");
        let encrypted_envelope_written = if envelope_encryption_ready {
            let pending = pending
                .as_ref()
                .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
            let state = store
                .get(&production_pending_handshake_initiator_state_record_id())?
                .map(|record| {
                    decode_production_handshake_initiator_state_record(
                        record,
                        &profile,
                        &draft.channel_id,
                    )
                })
                .transpose()?
                .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
            let transport_state = transport_state
                .as_ref()
                .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
            let transport = create_noise_xx_stateless_initiator_transport(
                &draft.safety_transcript,
                &local_noise_static.keypair,
                &state.initiator_ephemeral_private,
                &transport_state.handshake_message,
            )
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            if transport.remote_static() != draft.remote_noise_static_public_key {
                return Err(ProductionSessionError::NoiseStaticKeyMismatch);
            }
            let padded = pad_to_bucket(&pending.plaintext)?;
            let ciphertext = transport
                .encrypt_with_nonce(message_number - 1, &padded)
                .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            if ciphertext.remote_static != draft.remote_noise_static_public_key
                || ciphertext.key_material_exposed
            {
                return Err(ProductionSessionError::NoiseStaticKeyMismatch);
            }
            let envelope = Envelope {
                protocol_version: 1,
                channel_id: material.channel_id.clone(),
                message_number,
                message_type: MessageType::Data,
                padded_ciphertext: ciphertext.ciphertext,
            };
            let envelope_record = EncryptedRecord::new(
                ProductionRecordKind::MessageEnvelope,
                EncryptedRecordScope::contact(profile, material.remote_contact_id.clone()),
                b"sqlcipher-page-encryption-v1".to_vec(),
                envelope.encode().into_bytes(),
            )
            .map_err(ProductionStorageError::from)?;
            store.put(&message_record_id, &envelope_record)?;
            true
        } else {
            false
        };
        Ok(ProductionMessageOutboundEncryptPrepareSummary {
            storage_opened: true,
            runtime_material_reconstructable: true,
            local_message_index_present: index.is_some(),
            pending_message_record_present: pending.is_some(),
            pending_message_record_decodable: pending.is_some(),
            local_message_index_matches_pending,
            pending_plaintext_loaded: pending.is_some(),
            plaintext_exposed: false,
            session_transport_ready,
            envelope_encryption_ready,
            encrypted_envelope_written,
            network_send_attempted: false,
            key_material_exposed: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }

    pub fn production_session_evaluation_summary() -> ProductionSessionEvaluationSummary {
        ProductionSessionEvaluationSummary {
            protocol_candidate: "snow Noise XX synchronous boundary",
            production_pairing_required: true,
            safety_transcript_bound: true,
            canonical_dialer_stable: true,
            ciphertext_tamper_rejected: true,
            replay_guard_before_decrypt: true,
            session_state_in_memory_only: true,
            production_e2ee_ready: false,
            durable_session_persistence_ready: false,
            tauri_production_messaging_command_ready: false,
            usable_async_messaging_ready: false,
        }
    }

    pub fn production_skeleton_preflight_summary() -> ProductionSkeletonPreflightSummary {
        let session = production_session_evaluation_summary();
        let transport = OnionEnvelopeTransport::fail_closed_high_risk();
        let route = TransportRoute::onion("preflight.onion")
            .expect("static onion preflight route is valid");
        let transport = transport.message_path_boundary_summary(&route);
        let storage = production_message_storage_boundary_summary();

        ProductionSkeletonPreflightSummary {
            session_pairing_required: session.production_pairing_required(),
            session_safety_transcript_bound: session.safety_transcript_bound(),
            session_e2ee_ready: session.production_e2ee_ready(),
            transport_route_kind: transport.route_kind(),
            transport_route_allowed_by_policy: transport.route_allowed_by_policy(),
            transport_send_receive_available: transport.send_receive_available(),
            storage_message_envelope_protection: storage.message_envelope_storage(),
            storage_session_transport_protection: storage.session_transport_storage(),
            storage_replay_commit_after_decrypt: storage.replay_commit_after_decrypt(),
            storage_rollback_protection: storage.rollback_protection(),
            default_runtime_command_surface_closed: true,
            production_messaging_ready: false,
        }
    }

    pub fn production_skeleton_next_connector_selection() -> ProductionSkeletonNextConnectorSelection
    {
        let preflight = production_skeleton_preflight_summary();

        if !preflight.session_e2ee_ready() {
            return ProductionSkeletonNextConnectorSelection {
                connector: ProductionSkeletonConnector::SessionProtocolAndStatePersistence,
                blocker: "production session E2EE and durable state are not complete",
                required_gate:
                    "reviewed session protocol decision plus durable state persistence plan",
                opens_runtime_execution: false,
                production_messaging_ready: false,
            };
        }

        if preflight.storage_rollback_protection() == ReplayRollbackProtection::NotProvided {
            return ProductionSkeletonNextConnectorSelection {
                connector: ProductionSkeletonConnector::StorageKeyManagementAndRollback,
                blocker: "storage rollback protection and key management are not complete",
                required_gate: "key management rollback backup exclusion and migration decision",
                opens_runtime_execution: false,
                production_messaging_ready: false,
            };
        }

        if !preflight.transport_send_receive_available() {
            return ProductionSkeletonNextConnectorSelection {
                connector: ProductionSkeletonConnector::TransportEnvelopeIo,
                blocker: "transport send receive envelope I/O is disabled",
                required_gate: "bounded Tor onion lifecycle adapter without direct fallback",
                opens_runtime_execution: false,
                production_messaging_ready: false,
            };
        }

        ProductionSkeletonNextConnectorSelection {
            connector: ProductionSkeletonConnector::RuntimeCommandSurface,
            blocker: "runtime command surface remains closed",
            required_gate:
                "Rust-owned runtime command review after session storage transport gates",
            opens_runtime_execution: false,
            production_messaging_ready: false,
        }
    }

    pub fn session_durable_state_connector_gate() -> SessionDurableStateConnectorGate {
        let selection = production_skeleton_next_connector_selection();
        let storage = production_message_storage_boundary_summary();

        SessionDurableStateConnectorGate {
            selected_connector: selection.connector(),
            pairwise_identity_private_key_storage: protection_for(
                ProductionRecordKind::PairwiseIdentityPrivateKey,
            ),
            noise_static_private_key_storage: protection_for(
                ProductionRecordKind::NoiseStaticPrivateKey,
            ),
            replay_window_storage: storage.replay_window_storage(),
            session_transport_storage: storage.session_transport_storage(),
            replay_commit_after_decrypt: storage.replay_commit_after_decrypt(),
            rollback_protection: storage.rollback_protection(),
            opens_storage_unlock_command: false,
            opens_transport_io: false,
            opens_runtime_messaging: false,
            connector_ready: false,
        }
    }

    pub fn session_durable_state_connector_test_harness() -> SessionDurableStateConnectorHarness {
        let gate = session_durable_state_connector_gate();
        let session_transport_persistence_rejected =
            require_persistence_allowed(ProductionRecordKind::SessionTransportState).is_err();

        SessionDurableStateConnectorHarness {
            selected_connector: gate.selected_connector(),
            pairwise_identity_private_key_encrypted_record_allowed:
                require_encrypted_record_allowed(ProductionRecordKind::PairwiseIdentityPrivateKey)
                    .is_ok(),
            noise_static_private_key_encrypted_record_allowed: require_encrypted_record_allowed(
                ProductionRecordKind::NoiseStaticPrivateKey,
            )
            .is_ok(),
            replay_window_encrypted_record_allowed: require_encrypted_record_allowed(
                ProductionRecordKind::ReplayWindowState,
            )
            .is_ok(),
            session_transport_persistence_rejected,
            rollback_protection_required_before_readiness: gate.rollback_protection()
                == ReplayRollbackProtection::NotProvided,
            opens_storage_unlock_command: false,
            opens_transport_io: false,
            opens_runtime_messaging: false,
            harness_ready_for_connector_implementation: true,
        }
    }

    pub fn session_durable_state_persistence_adapter_skeleton(
    ) -> SessionDurableStatePersistenceAdapterSkeleton {
        let harness = session_durable_state_connector_test_harness();

        SessionDurableStatePersistenceAdapterSkeleton {
            selected_connector: harness.selected_connector(),
            opens_storage_unlock_command: false,
            opens_transport_io: false,
            opens_runtime_messaging: false,
            adapter_implementation_ready: false,
            ready_for_encrypted_record_adapter_spike: harness
                .harness_ready_for_connector_implementation(),
        }
    }

    pub fn session_durable_state_encrypted_record_adapter_spike(
    ) -> SessionDurableStateEncryptedRecordAdapter {
        SessionDurableStateEncryptedRecordAdapter::new(
            session_durable_state_persistence_adapter_skeleton(),
        )
    }

    pub fn session_durable_state_adapter_non_readiness_guard(
    ) -> SessionDurableStateAdapterNonReadinessGuard {
        SessionDurableStateAdapterNonReadinessGuard {
            rollback_protection: session_durable_state_connector_gate().rollback_protection(),
            prepared_records_persisted: session_durable_state_encrypted_record_adapter_spike()
                .persists_records_to_store(),
            store_write_enabled: false,
            durable_session_persistence_ready: false,
            production_e2ee_ready: production_session_evaluation_summary().production_e2ee_ready(),
            durable_noise_transport_persistence_allowed: false,
            runtime_messaging_enabled: false,
        }
    }

    pub fn session_durable_state_store_write_status_mirror(
    ) -> SessionDurableStateStoreWriteStatusMirror {
        let guard = session_durable_state_adapter_non_readiness_guard();

        SessionDurableStateStoreWriteStatusMirror {
            test_only_store_write_covered: true,
            production_store_write_enabled: guard.store_write_enabled(),
            production_unlock_command_enabled: false,
            durable_session_persistence_ready: guard.durable_session_persistence_ready(),
            rollback_protection: guard.rollback_protection(),
            runtime_messaging_enabled: guard.runtime_messaging_enabled(),
        }
    }

    pub fn session_durable_state_product_unlock_blocker_summary(
    ) -> SessionDurableStateProductUnlockBlockerSummary {
        let storage =
            another_dimension_storage::production::storage_backend_integration_boundary_summary();
        let status = session_durable_state_store_write_status_mirror();

        SessionDurableStateProductUnlockBlockerSummary {
            passphrase_first_boundary_exists: storage.passphrase_first_unlock(),
            production_unlock_command_enabled: status.production_unlock_command_enabled(),
            app_key_wrapping_decided: storage.production_key_management_ready(),
            backup_exclusion_decided: false,
            rollback_protection: status.rollback_protection(),
            durable_session_persistence_ready: status.durable_session_persistence_ready(),
            runtime_messaging_enabled: status.runtime_messaging_enabled(),
        }
    }

    pub fn session_durable_state_unlock_policy_handoff_summary(
    ) -> SessionDurableStateUnlockPolicyHandoffSummary {
        let blockers = session_durable_state_product_unlock_blocker_summary();
        let high_risk_requires_passphrase =
            UnlockRequest::new(UnlockMode::HighRisk, vec![UnlockFactor::Passphrase])
                .require_allowed()
                .is_ok();
        let os_keystore_only_rejected = matches!(
            UnlockRequest::new(
                UnlockMode::HighRisk,
                vec![UnlockFactor::OsKeystoreWrappedKey]
            )
            .require_allowed(),
            Err(ProductionStoragePolicyError::UnlockPolicyViolation)
        );

        SessionDurableStateUnlockPolicyHandoffSummary {
            passphrase_first_boundary_exists: blockers.passphrase_first_boundary_exists(),
            high_risk_requires_passphrase,
            os_keystore_only_rejected,
            production_unlock_command_enabled: blockers.production_unlock_command_enabled(),
            app_key_wrapping_decided: blockers.app_key_wrapping_decided(),
            backup_exclusion_decided: blockers.backup_exclusion_decided(),
            rollback_protection: blockers.rollback_protection(),
            durable_session_persistence_ready: blockers.durable_session_persistence_ready(),
            runtime_messaging_enabled: blockers.runtime_messaging_enabled(),
        }
    }

    pub fn session_unlock_lock_command_design_gate() -> SessionUnlockLockCommandDesignGate {
        let handoff = session_durable_state_unlock_policy_handoff_summary();

        SessionUnlockLockCommandDesignGate {
            high_risk_requires_passphrase: handoff.high_risk_requires_passphrase(),
            os_keystore_only_rejected: handoff.os_keystore_only_rejected(),
            explicit_lock_required: true,
            idle_auto_lock_required: true,
            redacted_unlock_errors_required: true,
            production_unlock_command_enabled: handoff.production_unlock_command_enabled(),
            production_lock_command_enabled: false,
            durable_session_persistence_ready: handoff.durable_session_persistence_ready(),
            runtime_messaging_enabled: handoff.runtime_messaging_enabled(),
        }
    }

    pub fn session_unlock_command_fail_closed(
        _request: &SessionUnlockCommandRequest,
    ) -> SessionUnlockCommandFailClosedResult {
        let gate = session_unlock_lock_command_design_gate();

        SessionUnlockCommandFailClosedResult {
            command_accepted: gate.production_unlock_command_enabled(),
            storage_opened: false,
            session_records_written: false,
            key_material_exposed: false,
            runtime_messaging_enabled: gate.runtime_messaging_enabled(),
            redacted_reason: SessionUnlockCommandDisabledReason::ProductUnlockCommandDisabled,
        }
    }

    pub fn session_lock_lifecycle_status_mirror() -> SessionLockLifecycleStatusMirror {
        let gate = session_unlock_lock_command_design_gate();
        let fail_closed =
            session_unlock_command_fail_closed(&SessionUnlockCommandRequest::passphrase_only());

        SessionLockLifecycleStatusMirror {
            explicit_lock_required: gate.explicit_lock_required(),
            idle_auto_lock_required: gate.idle_auto_lock_required(),
            default_idle_auto_lock_seconds: 300,
            high_risk_idle_auto_lock_seconds: 60,
            storage_currently_unlocked: fail_closed.storage_opened(),
            product_lock_command_enabled: gate.production_lock_command_enabled(),
            key_erasure_claim_available: false,
            runtime_messaging_enabled: fail_closed.runtime_messaging_enabled(),
        }
    }

    pub fn session_unlock_redacted_error_taxonomy(
        request: &SessionUnlockCommandRequest,
    ) -> SessionUnlockRedactedErrorTaxonomy {
        let kind = if request.os_keystore_wrapped_key_provided() && !request.passphrase_provided() {
            SessionUnlockRedactedErrorKind::OsKeystoreOnlyRejected
        } else if !request.passphrase_provided() {
            SessionUnlockRedactedErrorKind::PassphraseRequired
        } else {
            SessionUnlockRedactedErrorKind::ProductUnlockDisabled
        };

        SessionUnlockRedactedErrorTaxonomy {
            kind,
            exposes_raw_storage_error: false,
            exposes_os_keychain_error: false,
            exposes_path_or_identifier: false,
            exposes_key_material_or_passphrase_detail: false,
            retry_after_user_action_allowed: kind
                != SessionUnlockRedactedErrorKind::ProductUnlockDisabled,
        }
    }

    pub fn plan_session_from_verified_pairing_payloads(
        local: &PairingPayload,
        remote: &PairingPayload,
    ) -> Result<ProductionSessionPlan, ProductionSessionError> {
        require_verified_production_payload(local)?;
        require_verified_production_payload(remote)?;
        if local.pairwise_public_key == remote.pairwise_public_key {
            return Err(ProductionSessionError::SamePairwiseIdentity);
        }
        if local.rendezvous_endpoint == remote.rendezvous_endpoint {
            return Err(ProductionSessionError::SameRendezvousEndpoint);
        }
        let local_rendezvous_endpoint = pairwise_rendezvous_endpoint_from_payload(local)?;
        let remote_rendezvous_endpoint = pairwise_rendezvous_endpoint_from_payload(remote)?;
        let local_prekey = NoisePrekeyBundle::decode(&local.prekey_bundle)?;
        let remote_prekey = NoisePrekeyBundle::decode(&remote.prekey_bundle)?;
        let safety_transcript = transcript(local, remote)?;
        let local_rank = canonical_dialer_rank(local);
        let remote_rank = canonical_dialer_rank(remote);
        let local_role = if local_rank < remote_rank {
            SessionRole::CanonicalDialer
        } else {
            SessionRole::Responder
        };
        let canonical_dialer_public_key = match local_role {
            SessionRole::CanonicalDialer => local.pairwise_public_key.as_str(),
            SessionRole::Responder => remote.pairwise_public_key.as_str(),
        }
        .to_string();
        Ok(ProductionSessionPlan {
            safety_transcript,
            local_role,
            canonical_dialer_public_key,
            local_rendezvous_endpoint,
            remote_rendezvous_endpoint,
            local_noise_static_public_key: local_prekey.public_key().to_vec(),
            remote_noise_static_public_key: remote_prekey.public_key().to_vec(),
        })
    }

    fn prepare_pairing_session_parts(
        store: &SqlCipherRecordStore,
        profile: &ProfileName,
        local_payload: &PairingPayload,
        remote_payload: &PairingPayload,
    ) -> Result<(ProductionSessionPlan, ProductionStoredNoiseStaticKeypair), ProductionSessionError>
    {
        if &local_payload.owner_profile != profile {
            return Err(ProductionSessionError::LocalPairingPayloadMismatch);
        }
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        if local_noise_static.pairing_nonce != local_payload.pairing_nonce {
            return Err(ProductionSessionError::LocalPairingPayloadMismatch);
        }
        let plan = plan_session_from_verified_pairing_payloads(local_payload, remote_payload)?;
        require_matching_noise_static(
            &local_noise_static.keypair,
            &plan.local_noise_static_public_key,
        )?;
        Ok((plan, local_noise_static))
    }

    pub fn run_setup_draft_handshake_smoke(
        local: &ProductionSetupDraft,
        remote: &ProductionSetupDraft,
        plaintext: &[u8],
    ) -> Result<ProductionHandshakeSmokeResult, ProductionSessionError> {
        let plan = plan_session_from_verified_pairing_payloads(
            &local.pairing.payload,
            &remote.pairing.payload,
        )?;
        require_matching_noise_static(&local.noise_static, &plan.local_noise_static_public_key)?;
        require_matching_noise_static(&remote.noise_static, &plan.remote_noise_static_public_key)?;

        let (initiator, responder) = match plan.local_role {
            SessionRole::CanonicalDialer => (&local.noise_static, &remote.noise_static),
            SessionRole::Responder => (&remote.noise_static, &local.noise_static),
        };
        let handshake =
            run_noise_xx_handshake_smoke(&plan.safety_transcript, initiator, responder, plaintext)?;
        let expected_initiator_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.remote_noise_static_public_key,
            SessionRole::Responder => &plan.local_noise_static_public_key,
        };
        let expected_responder_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.local_noise_static_public_key,
            SessionRole::Responder => &plan.remote_noise_static_public_key,
        };
        if handshake.initiator_remote_static != *expected_initiator_remote
            || handshake.responder_remote_static != *expected_responder_remote
        {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }

        Ok(ProductionHandshakeSmokeResult {
            plan,
            ciphertext: handshake.ciphertext,
            plaintext: handshake.plaintext,
        })
    }

    pub fn establish_envelope_session_from_setup_drafts(
        local: &ProductionSetupDraft,
        remote: &ProductionSetupDraft,
    ) -> Result<ProductionEnvelopeSession, ProductionSessionError> {
        let plan = plan_session_from_verified_pairing_payloads(
            &local.pairing.payload,
            &remote.pairing.payload,
        )?;
        require_matching_noise_static(&local.noise_static, &plan.local_noise_static_public_key)?;
        require_matching_noise_static(&remote.noise_static, &plan.remote_noise_static_public_key)?;
        let (initiator, responder) = match plan.local_role {
            SessionRole::CanonicalDialer => (&local.noise_static, &remote.noise_static),
            SessionRole::Responder => (&remote.noise_static, &local.noise_static),
        };
        let transport =
            establish_noise_xx_transport_pair(&plan.safety_transcript, initiator, responder)?;
        verify_transport_remote_static(&plan, &transport)?;
        let channel_id = production_channel_id(&plan);
        Ok(ProductionEnvelopeSession {
            plan,
            channel_id,
            transport,
        })
    }

    fn verify_transport_remote_static(
        plan: &ProductionSessionPlan,
        transport: &NoiseTransportPair,
    ) -> Result<(), ProductionSessionError> {
        let expected_initiator_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.remote_noise_static_public_key,
            SessionRole::Responder => &plan.local_noise_static_public_key,
        };
        let expected_responder_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.local_noise_static_public_key,
            SessionRole::Responder => &plan.remote_noise_static_public_key,
        };
        if transport.initiator_remote_static() != expected_initiator_remote
            || transport.responder_remote_static() != expected_responder_remote
        {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        Ok(())
    }

    fn require_matching_noise_static(
        keypair: &NoiseStaticKeypair,
        expected_public_key: &[u8],
    ) -> Result<(), ProductionSessionError> {
        if keypair.public_key() == expected_public_key {
            Ok(())
        } else {
            Err(ProductionSessionError::NoiseStaticKeyMismatch)
        }
    }

    fn require_verified_production_payload(
        payload: &PairingPayload,
    ) -> Result<(), ProductionSessionError> {
        if payload.pairwise_public_key.scheme().ok()
            != Some(PairwisePublicKeyScheme::Ed25519DalekV2)
            || payload.pairwise_signature.scheme().ok()
                != Some(PairwiseSignatureScheme::Ed25519DalekV2)
        {
            return Err(ProductionSessionError::NonProductionPairingPayload);
        }
        let encoded = payload.encode()?;
        let decoded = PairingPayload::decode(&encoded)?;
        if decoded != *payload {
            return Err(ProductionSessionError::Pairing(
                PairingError::InvalidPayload,
            ));
        }
        Ok(())
    }

    fn pairwise_rendezvous_endpoint_from_payload(
        payload: &PairingPayload,
    ) -> Result<PairwiseRendezvousEndpoint, ProductionSessionError> {
        let contact_id = payload.contact_id()?;
        let endpoint = OnionServiceEndpoint::new(payload.rendezvous_endpoint.clone())
            .map_err(|_| ProductionSessionError::InvalidRendezvousEndpoint)?;
        PairwiseRendezvousEndpoint::new(
            contact_id,
            endpoint,
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .map_err(ProductionSessionError::from)
    }

    fn canonical_dialer_rank(payload: &PairingPayload) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(CANONICAL_DIALER_DOMAIN);
        hasher.update([0]);
        hasher.update(payload.pairwise_public_key.as_str().as_bytes());
        hasher.finalize().into()
    }

    fn production_channel_id(plan: &ProductionSessionPlan) -> String {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_CHANNEL_DOMAIN);
        hasher.update([0]);
        hasher.update(plan.safety_transcript.as_bytes());
        format!("adchan1:{}", encode_hex(&hasher.finalize()))
    }

    fn production_replay_record_id(channel_id: &str) -> EncryptedRecordId {
        EncryptedRecordId::new(production_replay_record_id_text(channel_id))
            .expect("domain-separated replay record id is valid")
    }

    fn production_replay_record_id_text(channel_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_REPLAY_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        format!("replay_{}", encode_hex(&hasher.finalize()))
    }

    fn production_endpoint_state_record_id(
        channel_id: &str,
        contact_id: &ContactId,
    ) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_ENDPOINT_STATE_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        hasher.update([0]);
        hasher.update(contact_id.as_str().as_bytes());
        EncryptedRecordId::new(format!("endpoint_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated endpoint state record id is valid")
    }

    fn production_message_envelope_record_id(
        channel_id: &str,
        message_number: u64,
        message_type: MessageType,
    ) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_MESSAGE_ENVELOPE_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        hasher.update([0]);
        hasher.update(message_number.to_be_bytes());
        hasher.update([0]);
        hasher.update(match message_type {
            MessageType::Data => b"data".as_slice(),
            MessageType::Ack => b"ack".as_slice(),
            MessageType::Control => b"control".as_slice(),
        });
        EncryptedRecordId::new(format!("message_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated message envelope record id is valid")
    }

    fn production_local_message_index_record_id(
        channel_id: &str,
        contact_id: &ContactId,
        message_number: u64,
    ) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_LOCAL_MESSAGE_INDEX_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        hasher.update([0]);
        hasher.update(contact_id.as_str().as_bytes());
        hasher.update([0]);
        hasher.update(message_number.to_be_bytes());
        EncryptedRecordId::new(format!("msgidx_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated local message index record id is valid")
    }

    fn production_session_transport_state_record_id(channel_id: &str) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_SESSION_TRANSPORT_STATE_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        EncryptedRecordId::new(format!("transport_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated session transport state record id is valid")
    }

    fn decode_handshake_init_export(value: &str) -> Result<Vec<u8>, ProductionSessionError> {
        let trimmed = value.trim_end_matches(['\r', '\n']);
        let encoded = trimmed
            .strip_prefix("ADNOISEXXINIT1|")
            .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
        let message =
            decode_hex(encoded).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        if message.is_empty() || message.len() > 1024 {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        Ok(message)
    }

    fn decode_handshake_reply_export(value: &str) -> Result<Vec<u8>, ProductionSessionError> {
        let trimmed = value.trim_end_matches(['\r', '\n']);
        let encoded = trimmed
            .strip_prefix("ADNOISEXXREPLY1|")
            .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
        let message =
            decode_hex(encoded).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        if message.is_empty() || message.len() > 1024 {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        Ok(message)
    }

    fn decode_handshake_finish_export(value: &str) -> Result<Vec<u8>, ProductionSessionError> {
        let trimmed = value.trim_end_matches(['\r', '\n']);
        let encoded = trimmed
            .strip_prefix("ADNOISEXXFINISH1|")
            .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
        let message =
            decode_hex(encoded).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        if message.is_empty() || message.len() > 1024 {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        Ok(message)
    }

    fn message_type_tag(message_type: &MessageType) -> &'static str {
        match message_type {
            MessageType::Data => "data",
            MessageType::Ack => "ack",
            MessageType::Control => "control",
        }
    }

    fn parse_message_type_tag(value: &str) -> Result<MessageType, ProductionSessionError> {
        match value {
            "data" => Ok(MessageType::Data),
            "ack" => Ok(MessageType::Ack),
            "control" => Ok(MessageType::Control),
            _ => Err(ProductionSessionError::UnexpectedEnvelope),
        }
    }

    fn production_identity_private_key_record_id() -> EncryptedRecordId {
        EncryptedRecordId::new(PRODUCTION_IDENTITY_PRIVATE_KEY_RECORD_ID)
            .expect("static production identity record id is valid")
    }

    fn production_latest_pairing_noise_static_record_id() -> EncryptedRecordId {
        EncryptedRecordId::new(PRODUCTION_LATEST_PAIRING_NOISE_STATIC_RECORD_ID)
            .expect("static production noise static record id is valid")
    }

    fn production_latest_session_draft_record_id() -> EncryptedRecordId {
        EncryptedRecordId::new(PRODUCTION_LATEST_SESSION_DRAFT_RECORD_ID)
            .expect("static production session draft record id is valid")
    }

    fn production_pending_handshake_initiator_state_record_id() -> EncryptedRecordId {
        EncryptedRecordId::new(PRODUCTION_PENDING_HANDSHAKE_INITIATOR_STATE_RECORD_ID)
            .expect("static production pending handshake state record id is valid")
    }

    fn encode_production_identity_private_key_record(
        profile: ProfileName,
        private_key: &ProductionPairwisePrivateKey,
    ) -> Result<EncryptedRecord, ProductionSessionError> {
        if private_key.algorithm() != ProductionKeyAlgorithm::Ed25519DalekV2 {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = format!(
            "ed25519-dalek-v2:{}",
            encode_hex(private_key.encrypted_storage_bytes())
        );
        EncryptedRecord::new(
            ProductionRecordKind::PairwiseIdentityPrivateKey,
            EncryptedRecordScope::profile(profile),
            b"sqlcipher-page-encryption-v1".to_vec(),
            encoded.into_bytes(),
        )
        .map_err(ProductionStorageError::from)
        .map_err(ProductionSessionError::from)
    }

    fn decode_production_identity_private_key_record(
        record: EncryptedRecord,
    ) -> Result<ProductionPairwisePrivateKey, ProductionSessionError> {
        if record.kind != ProductionRecordKind::PairwiseIdentityPrivateKey {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = String::from_utf8(record.sealed_body)
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let seed_hex = encoded
            .strip_prefix("ed25519-dalek-v2:")
            .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
        let seed = decode_hex(seed_hex).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        ProductionPairwisePrivateKey::from_bytes(ProductionKeyAlgorithm::Ed25519DalekV2, seed)
            .map_err(ProductionSessionError::from)
    }

    struct ProductionStoredNoiseStaticKeypair {
        pairing_nonce: String,
        keypair: NoiseStaticKeypair,
    }

    struct ProductionStoredSessionDraft {
        channel_id: String,
        local_role: SessionRole,
        remote_contact_id: ContactId,
        replay_record_id: String,
        safety_transcript: String,
        safety_transcript_present: bool,
        local_noise_static_public_key: Vec<u8>,
        remote_noise_static_public_key: Vec<u8>,
    }

    struct ProductionStoredHandshakeInitiatorState {
        channel_id: String,
        init_message: Vec<u8>,
        initiator_ephemeral_private: Vec<u8>,
    }

    struct ProductionStoredHandshakeResponderState {
        channel_id: String,
        init_message: Vec<u8>,
        responder_ephemeral_private: Vec<u8>,
    }

    struct ProductionStoredSessionTransportState {
        channel_id: String,
        local_role: SessionRole,
        remote_contact_id: ContactId,
        remote_noise_static_public_key: Vec<u8>,
        handshake_message_kind: String,
        handshake_message: Vec<u8>,
        transport_state_created: bool,
    }

    struct ProductionSessionRuntimeMaterial {
        channel_id: String,
        remote_contact_id: ContactId,
        remote_endpoint: PairwiseRendezvousEndpoint,
    }

    fn encode_production_noise_static_private_key_record(
        profile: ProfileName,
        pairing_nonce: String,
        keypair: &NoiseStaticKeypair,
    ) -> Result<EncryptedRecord, ProductionSessionError> {
        let encoded = format!(
            "noise-xx-25519-v1:{}:{}:{}",
            pairing_nonce,
            encode_hex(keypair.encrypted_storage_private_bytes()),
            encode_hex(keypair.public_key())
        );
        EncryptedRecord::new(
            ProductionRecordKind::NoiseStaticPrivateKey,
            EncryptedRecordScope::profile(profile),
            b"sqlcipher-page-encryption-v1".to_vec(),
            encoded.into_bytes(),
        )
        .map_err(ProductionStorageError::from)
        .map_err(ProductionSessionError::from)
    }

    fn decode_production_noise_static_private_key_record(
        record: EncryptedRecord,
    ) -> Result<ProductionStoredNoiseStaticKeypair, ProductionSessionError> {
        if record.kind != ProductionRecordKind::NoiseStaticPrivateKey {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = String::from_utf8(record.sealed_body)
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let parts = encoded.split(':').collect::<Vec<_>>();
        if parts.len() != 4 || parts[0] != "noise-xx-25519-v1" {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let private =
            decode_hex(parts[2]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let public =
            decode_hex(parts[3]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let keypair = NoiseStaticKeypair::from_private_public_bytes(private, public)?;
        Ok(ProductionStoredNoiseStaticKeypair {
            pairing_nonce: parts[1].to_string(),
            keypair,
        })
    }

    fn encode_production_handshake_initiator_state_record(
        profile: ProfileName,
        channel_id: &str,
        init_message: &[u8],
        initiator_ephemeral_private: &[u8],
    ) -> Result<EncryptedRecord, ProductionSessionError> {
        let encoded = format!(
            "ADNOISEXXISTATE1|{}|{}|{}",
            channel_id,
            encode_hex(init_message),
            encode_hex(initiator_ephemeral_private)
        );
        EncryptedRecord::new(
            ProductionRecordKind::HandshakeState,
            EncryptedRecordScope::profile(profile),
            b"sqlcipher-page-encryption-v1".to_vec(),
            encoded.into_bytes(),
        )
        .map_err(ProductionStorageError::from)
        .map_err(ProductionSessionError::from)
    }

    fn decode_production_handshake_initiator_state_record(
        record: EncryptedRecord,
        profile: &ProfileName,
        expected_channel_id: &str,
    ) -> Result<ProductionStoredHandshakeInitiatorState, ProductionSessionError> {
        if record.kind != ProductionRecordKind::HandshakeState
            || record.scope.profile_name() != profile
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = String::from_utf8(record.sealed_body)
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let parts = encoded.split('|').collect::<Vec<_>>();
        if parts.len() != 4 || parts[0] != "ADNOISEXXISTATE1" || parts[1] != expected_channel_id {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let init_message =
            decode_hex(parts[2]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let initiator_ephemeral_private =
            decode_hex(parts[3]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        if init_message.is_empty()
            || init_message.len() > 1024
            || initiator_ephemeral_private.len() != 32
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        Ok(ProductionStoredHandshakeInitiatorState {
            channel_id: parts[1].to_string(),
            init_message,
            initiator_ephemeral_private,
        })
    }

    fn encode_production_handshake_responder_state_record(
        profile: ProfileName,
        channel_id: &str,
        init_message: &[u8],
        responder_ephemeral_private: &[u8],
    ) -> Result<EncryptedRecord, ProductionSessionError> {
        let encoded = format!(
            "ADNOISEXXRSTATE1|{}|{}|{}",
            channel_id,
            encode_hex(init_message),
            encode_hex(responder_ephemeral_private)
        );
        EncryptedRecord::new(
            ProductionRecordKind::HandshakeState,
            EncryptedRecordScope::profile(profile),
            b"sqlcipher-page-encryption-v1".to_vec(),
            encoded.into_bytes(),
        )
        .map_err(ProductionStorageError::from)
        .map_err(ProductionSessionError::from)
    }

    fn decode_production_handshake_responder_state_record(
        record: EncryptedRecord,
        profile: &ProfileName,
        expected_channel_id: &str,
    ) -> Result<ProductionStoredHandshakeResponderState, ProductionSessionError> {
        if record.kind != ProductionRecordKind::HandshakeState
            || record.scope.profile_name() != profile
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = String::from_utf8(record.sealed_body)
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let parts = encoded.split('|').collect::<Vec<_>>();
        if parts.len() != 4 || parts[0] != "ADNOISEXXRSTATE1" || parts[1] != expected_channel_id {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let init_message =
            decode_hex(parts[2]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let responder_ephemeral_private =
            decode_hex(parts[3]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        if init_message.is_empty()
            || init_message.len() > 1024
            || responder_ephemeral_private.len() != 32
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        Ok(ProductionStoredHandshakeResponderState {
            channel_id: parts[1].to_string(),
            init_message,
            responder_ephemeral_private,
        })
    }

    fn encode_production_session_transport_state_record(
        profile: ProfileName,
        draft: &ProductionStoredSessionDraft,
        remote_noise_static_public_key: &[u8],
        handshake_message_kind: &str,
        handshake_message: &[u8],
    ) -> Result<EncryptedRecord, ProductionSessionError> {
        if remote_noise_static_public_key != draft.remote_noise_static_public_key {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        if !matches!(handshake_message_kind, "reply" | "finish") || handshake_message.is_empty() {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = format!(
            "ADSESSIONTRANSPORT2|{}|{}|{}|{}|{}|{}|{}",
            draft.channel_id,
            session_role_tag(draft.local_role),
            draft.remote_contact_id.as_str(),
            encode_hex(remote_noise_static_public_key),
            handshake_message_kind,
            encode_hex(handshake_message),
            "created"
        );
        EncryptedRecord::new(
            ProductionRecordKind::SessionTransportState,
            EncryptedRecordScope::contact(profile, draft.remote_contact_id.clone()),
            b"sqlcipher-page-encryption-v1".to_vec(),
            encoded.into_bytes(),
        )
        .map_err(ProductionStorageError::from)
        .map_err(ProductionSessionError::from)
    }

    fn decode_production_session_transport_state_record(
        record: EncryptedRecord,
        profile: &ProfileName,
        draft: &ProductionStoredSessionDraft,
    ) -> Result<ProductionStoredSessionTransportState, ProductionSessionError> {
        if record.kind != ProductionRecordKind::SessionTransportState
            || record.scope.profile_name() != profile
            || record.scope.contact_id() != Some(&draft.remote_contact_id)
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = String::from_utf8(record.sealed_body)
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let parts = encoded.split('|').collect::<Vec<_>>();
        if parts.len() != 8 || parts[0] != "ADSESSIONTRANSPORT2" {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let local_role = parse_session_role_tag(parts[2])?;
        let remote_contact_id =
            ContactId::new(parts[3]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let remote_noise_static_public_key =
            decode_hex(parts[4]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let handshake_message_kind = parts[5].to_string();
        let handshake_message =
            decode_hex(parts[6]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        if parts[1] != draft.channel_id
            || local_role != draft.local_role
            || remote_contact_id != draft.remote_contact_id
            || remote_noise_static_public_key != draft.remote_noise_static_public_key
            || !matches!(handshake_message_kind.as_str(), "reply" | "finish")
            || handshake_message.is_empty()
            || parts[7] != "created"
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        Ok(ProductionStoredSessionTransportState {
            channel_id: parts[1].to_string(),
            local_role,
            remote_contact_id,
            remote_noise_static_public_key,
            handshake_message_kind,
            handshake_message,
            transport_state_created: true,
        })
    }

    fn encode_production_session_draft_record(
        profile: ProfileName,
        plan: &ProductionSessionPlan,
        channel_id: &str,
        remote_contact_id: &ContactId,
    ) -> Result<EncryptedRecord, ProductionSessionError> {
        let replay_id = production_replay_record_id_text(channel_id);
        let encoded = format!(
            "ADSESSIONDRAFT2|{}|{}|{}|{}|{}|{}|{}",
            channel_id,
            session_role_tag(plan.local_role),
            remote_contact_id.as_str(),
            replay_id,
            encode_hex(plan.safety_transcript.as_bytes()),
            encode_hex(&plan.local_noise_static_public_key),
            encode_hex(&plan.remote_noise_static_public_key)
        );
        EncryptedRecord::new(
            ProductionRecordKind::SessionDraft,
            EncryptedRecordScope::profile(profile),
            b"sqlcipher-page-encryption-v1".to_vec(),
            encoded.into_bytes(),
        )
        .map_err(ProductionStorageError::from)
        .map_err(ProductionSessionError::from)
    }

    fn decode_production_session_draft_record(
        record: EncryptedRecord,
        profile: &ProfileName,
    ) -> Result<ProductionStoredSessionDraft, ProductionSessionError> {
        if record.kind != ProductionRecordKind::SessionDraft
            || record.scope.profile_name() != profile
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let encoded = String::from_utf8(record.sealed_body)
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let parts = encoded.split('|').collect::<Vec<_>>();
        if parts.len() != 8 || parts[0] != "ADSESSIONDRAFT2" {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let local_role = parse_session_role_tag(parts[2])?;
        let remote_contact_id =
            ContactId::new(parts[3]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let safety_transcript =
            decode_hex(parts[5]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let safety_transcript = String::from_utf8(safety_transcript)
            .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let local_noise_static_public_key =
            decode_hex(parts[6]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        let remote_noise_static_public_key =
            decode_hex(parts[7]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
        Ok(ProductionStoredSessionDraft {
            channel_id: parts[1].to_string(),
            local_role,
            remote_contact_id,
            replay_record_id: parts[4].to_string(),
            safety_transcript_present: !safety_transcript.is_empty(),
            safety_transcript,
            local_noise_static_public_key,
            remote_noise_static_public_key,
        })
    }

    fn load_latest_session_draft(
        store: &SqlCipherRecordStore,
        profile: &ProfileName,
    ) -> Result<Option<ProductionStoredSessionDraft>, ProductionSessionError> {
        store
            .get(&production_latest_session_draft_record_id())?
            .map(|record| decode_production_session_draft_record(record, profile))
            .transpose()
    }

    fn load_remote_endpoint_state(
        store: &SqlCipherRecordStore,
        draft: &ProductionStoredSessionDraft,
    ) -> Result<Option<PairwiseRendezvousEndpoint>, ProductionSessionError> {
        let endpoint_record_id =
            production_endpoint_state_record_id(&draft.channel_id, &draft.remote_contact_id);
        store
            .get(&endpoint_record_id)?
            .map(|record| {
                if record.kind != ProductionRecordKind::RendezvousEndpointState {
                    return Err(ProductionSessionError::UnexpectedEnvelope);
                }
                let state = String::from_utf8(record.sealed_body)
                    .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                let endpoint = PairwiseRendezvousEndpoint::decode_state(&state)?;
                if endpoint.contact_id() != &draft.remote_contact_id {
                    return Err(ProductionSessionError::EndpointScopeMismatch);
                }
                Ok(endpoint)
            })
            .transpose()
    }

    fn load_session_transport_state(
        store: &SqlCipherRecordStore,
        profile: &ProfileName,
        draft: &ProductionStoredSessionDraft,
    ) -> Result<Option<ProductionStoredSessionTransportState>, ProductionSessionError> {
        store
            .get(&production_session_transport_state_record_id(
                &draft.channel_id,
            ))?
            .map(|record| decode_production_session_transport_state_record(record, profile, draft))
            .transpose()
    }

    fn load_session_runtime_material(
        store: &SqlCipherRecordStore,
        profile: &ProfileName,
    ) -> Result<ProductionSessionRuntimeMaterial, ProductionSessionError> {
        let draft = load_latest_session_draft(store, profile)?
            .ok_or(ProductionSessionError::SessionDraftMissing)?;
        let local_noise_static = store
            .get(&production_latest_pairing_noise_static_record_id())?
            .map(decode_production_noise_static_private_key_record)
            .transpose()?
            .ok_or(ProductionSessionError::NoiseStaticPrivateKeyMissing)?;
        if local_noise_static.keypair.public_key() != draft.local_noise_static_public_key {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        if draft.remote_noise_static_public_key.is_empty() {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        let remote_endpoint = load_remote_endpoint_state(store, &draft)?
            .ok_or(ProductionSessionError::UnexpectedEnvelope)?;
        if store
            .load_replay_window(&production_replay_record_id(&draft.channel_id))?
            .is_none()
        {
            return Err(ProductionSessionError::UnexpectedEnvelope);
        }
        Ok(ProductionSessionRuntimeMaterial {
            channel_id: draft.channel_id,
            remote_contact_id: draft.remote_contact_id,
            remote_endpoint,
        })
    }

    fn session_role_tag(role: SessionRole) -> &'static str {
        match role {
            SessionRole::CanonicalDialer => "canonical-dialer",
            SessionRole::Responder => "responder",
        }
    }

    fn parse_session_role_tag(value: &str) -> Result<SessionRole, ProductionSessionError> {
        match value {
            "canonical-dialer" => Ok(SessionRole::CanonicalDialer),
            "responder" => Ok(SessionRole::Responder),
            _ => Err(ProductionSessionError::UnexpectedEnvelope),
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use another_dimension_identity::{
            ContactId, PairwisePublicKey, PairwiseSignature, ProductionPairwisePrivateKey,
            ProfileName,
        };
        use another_dimension_pairing::{
            production_pairing_payload_for, ProductionPairingPayloadParams, DEFAULT_TTL_SECONDS,
        };
        use another_dimension_protocol::trim_padding;
        use another_dimension_storage::production::{LockedProfileStore, ProfilePassphrase};
        use another_dimension_transport::{
            EndpointUpdateChannel, OnionServiceEndpoint, PairwiseRendezvousEndpoint,
            RendezvousEndpointIdentityBinding, RendezvousEndpointScope,
        };

        #[test]
        fn production_session_evaluation_summary_keeps_readiness_false() {
            let summary = production_session_evaluation_summary();

            assert_eq!(
                summary.protocol_candidate(),
                "snow Noise XX synchronous boundary"
            );
            assert!(summary.production_pairing_required());
            assert!(summary.safety_transcript_bound());
            assert!(summary.canonical_dialer_stable());
            assert!(summary.ciphertext_tamper_rejected());
            assert!(summary.replay_guard_before_decrypt());
            assert!(summary.session_state_in_memory_only());
            assert!(!summary.production_e2ee_ready());
            assert!(!summary.durable_session_persistence_ready());
            assert!(!summary.tauri_production_messaging_command_ready());
            assert!(!summary.usable_async_messaging_ready());
        }

        #[test]
        fn production_skeleton_preflight_aggregates_blockers_without_readiness() {
            let summary = production_skeleton_preflight_summary();

            assert!(summary.session_pairing_required());
            assert!(summary.session_safety_transcript_bound());
            assert!(!summary.session_e2ee_ready());
            assert_eq!(summary.transport_route_kind(), TransportKind::OnionService);
            assert!(summary.transport_route_allowed_by_policy());
            assert!(!summary.transport_send_receive_available());
            assert_eq!(
                summary.storage_message_envelope_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                summary.storage_session_transport_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(summary.storage_replay_commit_after_decrypt());
            assert_eq!(
                summary.storage_rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(summary.default_runtime_command_surface_closed());
            assert!(!summary.production_messaging_ready());
        }

        #[test]
        fn production_skeleton_next_connector_selects_session_gate_without_runtime() {
            let selection = production_skeleton_next_connector_selection();

            assert_eq!(
                selection.connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert_eq!(
                selection.blocker(),
                "production session E2EE and durable state are not complete"
            );
            assert_eq!(
                selection.required_gate(),
                "reviewed session protocol decision plus durable state persistence plan"
            );
            assert!(!selection.opens_runtime_execution());
            assert!(!selection.production_messaging_ready());
        }

        #[test]
        fn session_durable_state_connector_gate_keeps_runtime_closed() {
            let gate = session_durable_state_connector_gate();

            assert_eq!(
                gate.selected_connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert_eq!(
                gate.pairwise_identity_private_key_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                gate.noise_static_private_key_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                gate.replay_window_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                gate.session_transport_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(gate.replay_commit_after_decrypt());
            assert_eq!(
                gate.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!gate.opens_storage_unlock_command());
            assert!(!gate.opens_transport_io());
            assert!(!gate.opens_runtime_messaging());
            assert!(!gate.connector_ready());
        }

        #[test]
        fn session_durable_state_connector_harness_applies_storage_policy() {
            let harness = session_durable_state_connector_test_harness();

            assert_eq!(
                harness.selected_connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert!(harness.pairwise_identity_private_key_encrypted_record_allowed());
            assert!(harness.noise_static_private_key_encrypted_record_allowed());
            assert!(harness.replay_window_encrypted_record_allowed());
            assert!(!harness.session_transport_persistence_rejected());
            assert!(harness.rollback_protection_required_before_readiness());
            assert!(!harness.opens_storage_unlock_command());
            assert!(!harness.opens_transport_io());
            assert!(!harness.opens_runtime_messaging());
            assert!(harness.harness_ready_for_connector_implementation());
        }

        #[test]
        fn session_durable_state_persistence_adapter_skeleton_maps_record_policies() {
            let skeleton = session_durable_state_persistence_adapter_skeleton();

            assert_eq!(
                skeleton.selected_connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert!(!skeleton.opens_storage_unlock_command());
            assert!(!skeleton.opens_transport_io());
            assert!(!skeleton.opens_runtime_messaging());
            assert!(!skeleton.adapter_implementation_ready());
            assert!(skeleton.ready_for_encrypted_record_adapter_spike());

            let pairwise_private = skeleton
                .record_policy(SessionDurableStateAdapterRecordKind::PairwiseIdentityPrivateKey);
            assert_eq!(
                pairwise_private.production_record_kind(),
                ProductionRecordKind::PairwiseIdentityPrivateKey
            );
            assert_eq!(
                pairwise_private.storage_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(pairwise_private.encrypted_record_allowed());
            assert!(pairwise_private.persistence_allowed());

            let noise_static =
                skeleton.record_policy(SessionDurableStateAdapterRecordKind::NoiseStaticPrivateKey);
            assert_eq!(
                noise_static.production_record_kind(),
                ProductionRecordKind::NoiseStaticPrivateKey
            );
            assert_eq!(
                noise_static.storage_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(noise_static.encrypted_record_allowed());
            assert!(noise_static.persistence_allowed());

            let replay =
                skeleton.record_policy(SessionDurableStateAdapterRecordKind::ReplayWindowState);
            assert_eq!(
                replay.production_record_kind(),
                ProductionRecordKind::ReplayWindowState
            );
            assert_eq!(
                replay.storage_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(replay.encrypted_record_allowed());
            assert!(replay.persistence_allowed());

            let session_transport =
                skeleton.record_policy(SessionDurableStateAdapterRecordKind::SessionTransportState);
            assert_eq!(
                session_transport.production_record_kind(),
                ProductionRecordKind::SessionTransportState
            );
            assert_eq!(
                session_transport.storage_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(session_transport.encrypted_record_allowed());
            assert!(session_transport.persistence_allowed());
        }

        #[test]
        fn session_durable_state_encrypted_record_adapter_prepares_allowed_records_only() {
            let adapter = session_durable_state_encrypted_record_adapter_spike();
            assert!(!adapter.opens_storage_unlock_command());
            assert!(!adapter.opens_transport_io());
            assert!(!adapter.opens_runtime_messaging());
            assert!(!adapter.persists_records_to_store());

            let scope =
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("valid profile"));
            let record = adapter
                .prepare_record(
                    SessionDurableStateAdapterRecordKind::NoiseStaticPrivateKey,
                    scope.clone(),
                    b"adapter-spike-nonce".to_vec(),
                    b"sealed-noise-static-key-record".to_vec(),
                )
                .expect("noise static private key record can be prepared");
            assert_eq!(record.kind, ProductionRecordKind::NoiseStaticPrivateKey);
            assert_eq!(record.scope, scope);
            assert!(record
                .associated_data()
                .starts_with(b"AD-ENCRYPTED-RECORD-V1|noise-static-private-key|"));

            let session_transport_record = adapter
                .prepare_record(
                    SessionDurableStateAdapterRecordKind::SessionTransportState,
                    EncryptedRecordScope::profile(
                        ProfileName::new("alice").expect("valid profile"),
                    ),
                    b"adapter-spike-nonce".to_vec(),
                    b"sealed-session-transport-record".to_vec(),
                )
                .expect("session transport record can be prepared");
            assert_eq!(
                session_transport_record.kind,
                ProductionRecordKind::SessionTransportState
            );
        }

        #[test]
        fn session_durable_state_adapter_non_readiness_guard_blocks_claims() {
            let guard = session_durable_state_adapter_non_readiness_guard();

            assert_eq!(
                guard.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!guard.prepared_records_persisted());
            assert!(!guard.store_write_enabled());
            assert!(!guard.durable_session_persistence_ready());
            assert!(!guard.production_e2ee_ready());
            assert!(!guard.durable_noise_transport_persistence_allowed());
            assert!(!guard.runtime_messaging_enabled());
        }

        #[test]
        fn session_durable_state_store_write_test_only_round_trips_prepared_record() {
            let (dir, store) = production_test_store("session_durable_state_store_write_test_only");
            let adapter = session_durable_state_encrypted_record_adapter_spike();
            let scope =
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("valid profile"));
            let record_id =
                EncryptedRecordId::new("session_noise_static_test_only").expect("record id");
            let record = adapter
                .prepare_record(
                    SessionDurableStateAdapterRecordKind::NoiseStaticPrivateKey,
                    scope,
                    b"adapter-spike-nonce".to_vec(),
                    b"sealed-noise-static-key-record".to_vec(),
                )
                .expect("prepare record");

            adapter
                .test_only_put_prepared_record(&store, &record_id, &record)
                .expect("test-only write");
            assert_eq!(
                store.get(&record_id).expect("load record"),
                Some(record.clone())
            );

            let guard = session_durable_state_adapter_non_readiness_guard();
            assert!(!guard.store_write_enabled());
            assert!(!guard.durable_session_persistence_ready());
            assert!(!guard.production_e2ee_ready());

            drop(store);
            std::fs::remove_dir_all(dir).expect("remove test store");
        }

        #[test]
        fn session_durable_state_store_write_status_mirror_keeps_production_closed() {
            let status = session_durable_state_store_write_status_mirror();

            assert!(status.test_only_store_write_covered());
            assert!(!status.production_store_write_enabled());
            assert!(!status.production_unlock_command_enabled());
            assert!(!status.durable_session_persistence_ready());
            assert_eq!(
                status.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!status.runtime_messaging_enabled());
        }

        #[test]
        fn session_durable_state_product_unlock_blocker_summary_keeps_unlock_closed() {
            let summary = session_durable_state_product_unlock_blocker_summary();

            assert!(summary.passphrase_first_boundary_exists());
            assert!(!summary.production_unlock_command_enabled());
            assert!(!summary.app_key_wrapping_decided());
            assert!(!summary.backup_exclusion_decided());
            assert_eq!(
                summary.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!summary.durable_session_persistence_ready());
            assert!(!summary.runtime_messaging_enabled());
        }

        #[test]
        fn session_durable_state_unlock_policy_handoff_keeps_product_unlock_closed() {
            let summary = session_durable_state_unlock_policy_handoff_summary();

            assert!(summary.passphrase_first_boundary_exists());
            assert!(summary.high_risk_requires_passphrase());
            assert!(summary.os_keystore_only_rejected());
            assert!(!summary.production_unlock_command_enabled());
            assert!(!summary.app_key_wrapping_decided());
            assert!(!summary.backup_exclusion_decided());
            assert_eq!(
                summary.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!summary.durable_session_persistence_ready());
            assert!(!summary.runtime_messaging_enabled());
        }

        #[test]
        fn session_unlock_lock_command_design_gate_keeps_commands_closed() {
            let gate = session_unlock_lock_command_design_gate();

            assert!(gate.high_risk_requires_passphrase());
            assert!(gate.os_keystore_only_rejected());
            assert!(gate.explicit_lock_required());
            assert!(gate.idle_auto_lock_required());
            assert!(gate.redacted_unlock_errors_required());
            assert!(!gate.production_unlock_command_enabled());
            assert!(!gate.production_lock_command_enabled());
            assert!(!gate.durable_session_persistence_ready());
            assert!(!gate.runtime_messaging_enabled());
        }

        #[test]
        fn session_unlock_command_fail_closed_skeleton_rejects_all_requests() {
            for request in [
                SessionUnlockCommandRequest::passphrase_only(),
                SessionUnlockCommandRequest::os_keystore_only(),
                SessionUnlockCommandRequest::passphrase_and_os_keystore(),
            ] {
                let result = session_unlock_command_fail_closed(&request);

                assert!(!result.command_accepted());
                assert!(!result.storage_opened());
                assert!(!result.session_records_written());
                assert!(!result.key_material_exposed());
                assert!(!result.runtime_messaging_enabled());
                assert_eq!(
                    result.redacted_reason(),
                    SessionUnlockCommandDisabledReason::ProductUnlockCommandDisabled
                );
            }
        }

        #[test]
        fn session_lock_lifecycle_status_mirror_keeps_lock_runtime_closed() {
            let status = session_lock_lifecycle_status_mirror();

            assert!(status.explicit_lock_required());
            assert!(status.idle_auto_lock_required());
            assert_eq!(status.default_idle_auto_lock_seconds(), 300);
            assert_eq!(status.high_risk_idle_auto_lock_seconds(), 60);
            assert!(!status.storage_currently_unlocked());
            assert!(!status.product_lock_command_enabled());
            assert!(!status.key_erasure_claim_available());
            assert!(!status.runtime_messaging_enabled());
        }

        #[test]
        fn session_unlock_redacted_error_taxonomy_hides_sensitive_details() {
            let cases = [
                (
                    SessionUnlockCommandRequest::passphrase_only(),
                    SessionUnlockRedactedErrorKind::ProductUnlockDisabled,
                    false,
                ),
                (
                    SessionUnlockCommandRequest::os_keystore_only(),
                    SessionUnlockRedactedErrorKind::OsKeystoreOnlyRejected,
                    true,
                ),
                (
                    SessionUnlockCommandRequest::passphrase_and_os_keystore(),
                    SessionUnlockRedactedErrorKind::ProductUnlockDisabled,
                    false,
                ),
            ];

            for (request, expected_kind, retry_allowed) in cases {
                let taxonomy = session_unlock_redacted_error_taxonomy(&request);

                assert_eq!(taxonomy.kind(), expected_kind);
                assert!(!taxonomy.exposes_raw_storage_error());
                assert!(!taxonomy.exposes_os_keychain_error());
                assert!(!taxonomy.exposes_path_or_identifier());
                assert!(!taxonomy.exposes_key_material_or_passphrase_detail());
                assert_eq!(taxonomy.retry_after_user_action_allowed(), retry_allowed);
            }
        }

        #[test]
        fn production_profile_init_opens_store_and_writes_marker_without_runtime() {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-production-profile-init-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale dir");
            }
            std::fs::create_dir_all(&dir).expect("create dir");
            let store_path = dir.join("profile.db");
            let profile = ProfileName::new("alice").expect("valid profile");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");

            let summary = production_profile_init(&store_path, profile.clone(), &passphrase)
                .expect("profile init");

            assert!(summary.storage_opened());
            assert!(summary.profile_marker_written());
            assert!(!summary.key_material_exposed());
            assert!(!summary.transport_io_opened());
            assert!(!summary.runtime_messaging_enabled());

            let store = LockedProfileStore::new(&store_path)
                .unlock(&passphrase)
                .expect("unlock initialized store");
            assert!(store
                .profile_marker_exists(&profile)
                .expect("profile marker exists"));

            let _ = std::fs::remove_dir_all(dir);
        }

        #[test]
        fn production_profile_status_reopens_store_and_checks_marker_without_runtime() {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-production-profile-status-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale dir");
            }
            std::fs::create_dir_all(&dir).expect("create dir");
            let store_path = dir.join("profile.db");
            let profile = ProfileName::new("alice").expect("valid profile");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");

            let missing = production_profile_status(&store_path, profile.clone(), &passphrase)
                .expect("profile status before marker");
            assert!(missing.storage_opened());
            assert!(!missing.profile_marker_present());
            assert!(!missing.key_material_exposed());
            assert!(!missing.transport_io_opened());
            assert!(!missing.runtime_messaging_enabled());

            production_profile_init(&store_path, profile.clone(), &passphrase)
                .expect("profile init");
            let present = production_profile_status(&store_path, profile, &passphrase)
                .expect("profile status after marker");

            assert!(present.storage_opened());
            assert!(present.profile_marker_present());
            assert!(!present.key_material_exposed());
            assert!(!present.transport_io_opened());
            assert!(!present.runtime_messaging_enabled());

            let _ = std::fs::remove_dir_all(dir);
        }

        #[test]
        fn production_profile_identity_init_and_status_use_encrypted_profile_store() {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-production-profile-identity-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale dir");
            }
            std::fs::create_dir_all(&dir).expect("create dir");
            let store_path = dir.join("profile.db");
            let profile = ProfileName::new("alice").expect("valid profile");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");

            assert_eq!(
                production_profile_identity_status(&store_path, profile.clone(), &passphrase),
                Err(ProductionSessionError::ProfileMarkerMissing)
            );
            production_profile_init(&store_path, profile.clone(), &passphrase)
                .expect("profile init");
            let missing_identity =
                production_profile_identity_status(&store_path, profile.clone(), &passphrase)
                    .expect("identity status before init");
            assert!(missing_identity.storage_opened());
            assert!(!missing_identity.identity_private_key_present());
            assert!(!missing_identity.identity_public_key_derivable());
            assert!(!missing_identity.key_material_exposed());
            assert!(!missing_identity.transport_io_opened());
            assert!(!missing_identity.runtime_messaging_enabled());

            let init = production_profile_identity_init(&store_path, profile.clone(), &passphrase)
                .expect("identity init");
            assert!(init.storage_opened());
            assert!(init.identity_private_key_written());
            assert!(init.identity_public_key_derivable());
            assert!(!init.key_material_exposed());
            assert!(!init.transport_io_opened());
            assert!(!init.runtime_messaging_enabled());

            let present = production_profile_identity_status(&store_path, profile, &passphrase)
                .expect("identity status after init");
            assert!(present.storage_opened());
            assert!(present.identity_private_key_present());
            assert!(present.identity_public_key_derivable());
            assert!(!present.key_material_exposed());
            assert!(!present.transport_io_opened());
            assert!(!present.runtime_messaging_enabled());

            let _ = std::fs::remove_dir_all(dir);
        }

        #[test]
        fn production_pairing_payload_create_uses_stored_identity_and_persists_noise_static() {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-production-pairing-payload-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale dir");
            }
            std::fs::create_dir_all(&dir).expect("create dir");
            let store_path = dir.join("profile.db");
            let profile = ProfileName::new("alice").expect("valid profile");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");

            assert_eq!(
                production_pairing_payload_create(
                    &store_path,
                    profile.clone(),
                    &passphrase,
                    "alice.onion",
                ),
                Err(ProductionSessionError::ProfileMarkerMissing)
            );
            production_profile_init(&store_path, profile.clone(), &passphrase)
                .expect("profile init");
            assert_eq!(
                production_pairing_payload_create(
                    &store_path,
                    profile.clone(),
                    &passphrase,
                    "alice.onion",
                ),
                Err(ProductionSessionError::IdentityPrivateKeyMissing)
            );
            production_profile_identity_init(&store_path, profile.clone(), &passphrase)
                .expect("identity init");

            let summary = production_pairing_payload_create(
                &store_path,
                profile.clone(),
                &passphrase,
                "alice.onion",
            )
            .expect("pairing payload create");
            let encoded = summary.payload().encode().expect("payload encodes");
            let decoded = PairingPayload::decode(&encoded).expect("payload decodes");
            let prekey = NoisePrekeyBundle::decode(&decoded.prekey_bundle).expect("prekey");

            assert!(summary.storage_opened());
            assert!(summary.identity_private_key_loaded());
            assert!(summary.noise_static_private_key_written());
            assert!(!summary.key_material_exposed());
            assert!(!summary.transport_io_opened());
            assert!(!summary.runtime_messaging_enabled());
            assert_eq!(decoded.owner_profile, profile);
            assert_eq!(decoded.rendezvous_endpoint, "alice.onion");

            let store = LockedProfileStore::new(&store_path)
                .unlock(&passphrase)
                .expect("unlock initialized store");
            let record = store
                .get(&production_latest_pairing_noise_static_record_id())
                .expect("load noise static record")
                .expect("noise static record");
            assert_eq!(record.kind, ProductionRecordKind::NoiseStaticPrivateKey);
            assert_eq!(record.scope.profile_name(), &profile);
            let body = String::from_utf8(record.sealed_body).expect("noise record body");
            assert!(body.starts_with(&format!("noise-xx-25519-v1:{}:", decoded.pairing_nonce)));
            assert!(body.ends_with(&encode_hex(prekey.public_key())));

            let _ = std::fs::remove_dir_all(dir);
        }

        #[test]
        fn production_pairing_session_prepare_loads_stored_noise_static_for_local_payload() {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-production-session-prepare-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale dir");
            }
            std::fs::create_dir_all(&dir).expect("create dir");
            let alice_store = dir.join("alice.db");
            let bob_store = dir.join("bob.db");
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");

            production_profile_init(&alice_store, alice.clone(), &passphrase)
                .expect("alice profile init");
            production_profile_identity_init(&alice_store, alice.clone(), &passphrase)
                .expect("alice identity init");
            production_profile_init(&bob_store, bob.clone(), &passphrase)
                .expect("bob profile init");
            production_profile_identity_init(&bob_store, bob.clone(), &passphrase)
                .expect("bob identity init");

            let alice_payload = production_pairing_payload_create(
                &alice_store,
                alice.clone(),
                &passphrase,
                "alice.onion",
            )
            .expect("alice payload")
            .payload()
            .clone();
            let bob_payload = production_pairing_payload_create(
                &bob_store,
                bob.clone(),
                &passphrase,
                "bob.onion",
            )
            .expect("bob payload")
            .payload()
            .clone();

            let summary = production_pairing_session_prepare(
                &alice_store,
                alice.clone(),
                &passphrase,
                &alice_payload,
                &bob_payload,
            )
            .expect("session prepare");

            assert!(summary.storage_opened());
            assert!(summary.session_plan_created());
            assert!(summary.local_noise_static_private_key_loaded());
            assert!(summary.local_noise_static_matches_payload());
            assert!(summary.safety_transcript_bound());
            assert!(summary.canonical_dialer_selected());
            assert!(!summary.key_material_exposed());
            assert!(!summary.transport_io_opened());
            assert!(!summary.runtime_messaging_enabled());

            assert_eq!(
                production_pairing_session_prepare(
                    &alice_store,
                    alice.clone(),
                    &passphrase,
                    &bob_payload,
                    &alice_payload,
                ),
                Err(ProductionSessionError::LocalPairingPayloadMismatch)
            );

            let carol = production_setup_draft_with_defaults(
                &ProfileName::new("carol").expect("valid profile"),
                "carol.onion",
            )
            .expect("carol setup");
            assert_eq!(
                production_pairing_session_prepare(
                    &alice_store,
                    alice,
                    &passphrase,
                    &carol.pairing.payload,
                    &bob_payload,
                ),
                Err(ProductionSessionError::LocalPairingPayloadMismatch)
            );

            let _ = std::fs::remove_dir_all(dir);
        }

        #[test]
        fn production_pairing_session_save_draft_persists_session_records_without_transport() {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-production-session-save-draft-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale dir");
            }
            std::fs::create_dir_all(&dir).expect("create dir");
            let alice_store = dir.join("alice.db");
            let bob_store = dir.join("bob.db");
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");

            production_profile_init(&alice_store, alice.clone(), &passphrase)
                .expect("alice profile init");
            production_profile_identity_init(&alice_store, alice.clone(), &passphrase)
                .expect("alice identity init");
            production_profile_init(&bob_store, bob.clone(), &passphrase)
                .expect("bob profile init");
            production_profile_identity_init(&bob_store, bob.clone(), &passphrase)
                .expect("bob identity init");
            let alice_payload = production_pairing_payload_create(
                &alice_store,
                alice.clone(),
                &passphrase,
                "alice.onion",
            )
            .expect("alice payload")
            .payload()
            .clone();
            let bob_payload = production_pairing_payload_create(
                &bob_store,
                bob.clone(),
                &passphrase,
                "bob.onion",
            )
            .expect("bob payload")
            .payload()
            .clone();

            let empty_status =
                production_pairing_session_status(&alice_store, alice.clone(), &passphrase)
                    .expect("empty session status");
            assert!(empty_status.storage_opened());
            assert!(!empty_status.session_draft_present());
            assert!(!empty_status.channel_id_derivable());
            assert!(!empty_status.remote_endpoint_state_present());
            assert!(!empty_status.replay_window_present());
            assert!(!empty_status.transport_io_opened());
            assert!(!empty_status.runtime_messaging_enabled());

            let summary = production_pairing_session_save_draft(
                &alice_store,
                alice.clone(),
                &passphrase,
                &alice_payload,
                &bob_payload,
            )
            .expect("save draft");

            assert!(summary.storage_opened());
            assert!(summary.session_plan_created());
            assert!(summary.local_noise_static_private_key_loaded());
            assert!(summary.local_noise_static_matches_payload());
            assert!(summary.session_draft_written());
            assert!(summary.remote_endpoint_state_written());
            assert!(summary.replay_window_written());
            assert!(summary.channel_id_derivable());
            assert!(!summary.key_material_exposed());
            assert!(!summary.transport_io_opened());
            assert!(!summary.runtime_messaging_enabled());

            production_pairing_session_save_draft(
                &bob_store,
                bob.clone(),
                &passphrase,
                &bob_payload,
                &alice_payload,
            )
            .expect("bob save draft");

            let plan = plan_session_from_verified_pairing_payloads(&alice_payload, &bob_payload)
                .expect("plan");
            let channel_id = production_channel_id(&plan);
            let remote_contact = bob_payload.contact_id().expect("contact id");
            let store = LockedProfileStore::new(&alice_store)
                .unlock(&passphrase)
                .expect("unlock store");
            let draft = store
                .get(&production_latest_session_draft_record_id())
                .expect("read draft")
                .expect("draft");
            assert_eq!(draft.kind, ProductionRecordKind::SessionDraft);
            assert!(String::from_utf8(draft.sealed_body)
                .expect("draft body")
                .starts_with(&format!("ADSESSIONDRAFT2|{channel_id}|")));
            assert!(store
                .get(&production_endpoint_state_record_id(
                    &channel_id,
                    &remote_contact
                ))
                .expect("read endpoint")
                .is_some());
            assert!(store
                .load_replay_window(&production_replay_record_id(&channel_id))
                .expect("read replay")
                .is_some());

            let status =
                production_pairing_session_status(&alice_store, alice.clone(), &passphrase)
                    .expect("session status");
            assert!(status.storage_opened());
            assert!(status.session_draft_present());
            assert!(status.channel_id_derivable());
            assert!(status.local_role_available());
            assert!(status.remote_contact_present());
            assert!(status.remote_endpoint_state_present());
            assert!(status.replay_window_present());
            assert!(!status.key_material_exposed());
            assert!(!status.transport_io_opened());
            assert!(!status.runtime_messaging_enabled());

            let runtime =
                production_pairing_session_load_runtime(&alice_store, alice.clone(), &passphrase)
                    .expect("load runtime");
            assert!(runtime.storage_opened());
            assert!(runtime.session_draft_loaded());
            assert!(runtime.local_noise_static_private_key_loaded());
            assert!(runtime.local_noise_static_matches_draft());
            assert!(runtime.remote_noise_static_public_key_loaded());
            assert!(runtime.remote_endpoint_state_loaded());
            assert!(runtime.replay_window_loaded());
            assert!(runtime.runtime_material_reconstructable());
            assert!(!runtime.key_material_exposed());
            assert!(!runtime.transport_io_opened());
            assert!(!runtime.runtime_messaging_enabled());

            let opened =
                production_pairing_session_open_runtime(&alice_store, alice.clone(), &passphrase)
                    .expect("open runtime");
            assert!(opened.storage_opened());
            assert!(opened.runtime_material_reconstructable());
            assert!(opened.outbound_stream_gate_ready());
            assert!(opened.outbound_fail_closed_adapter_ready());
            assert!(opened.outbound_stream_preparation_ready());
            assert!(opened.session_binding_ready());
            assert!(opened.remote_peer_authentication_ready());
            assert!(opened.outbound_envelope_io_ready());
            assert!(!opened.key_material_exposed());
            assert!(!opened.transport_io_opened());
            assert!(!opened.runtime_messaging_enabled());

            let transport_prepare = production_pairing_session_transport_prepare(
                &alice_store,
                alice.clone(),
                &passphrase,
            )
            .expect("transport prepare");
            assert!(transport_prepare.storage_opened());
            assert!(transport_prepare.runtime_material_reconstructable());
            assert!(transport_prepare.local_noise_static_private_key_loaded());
            assert!(transport_prepare.remote_noise_static_public_key_loaded());
            assert!(transport_prepare.remote_endpoint_state_loaded());
            assert!(transport_prepare.replay_window_loaded());
            assert!(transport_prepare.authenticated_handshake_required());
            assert!(!transport_prepare.session_transport_state_created());
            assert!(transport_prepare.session_transport_persistence_allowed());
            assert!(!transport_prepare.key_material_exposed());
            assert!(!transport_prepare.transport_io_opened());
            assert!(!transport_prepare.runtime_messaging_enabled());

            let handshake_init =
                production_pairing_session_handshake_init(&alice_store, alice.clone(), &passphrase)
                    .expect("handshake init");
            assert!(handshake_init.storage_opened());
            assert!(handshake_init.session_draft_loaded());
            assert!(handshake_init.local_noise_static_private_key_loaded());
            assert!(handshake_init.local_noise_static_matches_draft());
            assert!(handshake_init.safety_transcript_loaded());
            assert_eq!(
                handshake_init.local_role_can_initiate(),
                plan.local_role == SessionRole::CanonicalDialer
            );
            assert_eq!(
                handshake_init.handshake_message_created(),
                handshake_init.local_role_can_initiate()
            );
            assert_eq!(
                handshake_init.handshake_message_len() > 0,
                handshake_init.local_role_can_initiate()
            );
            assert!(!handshake_init.handshake_message_exposed());
            assert!(!handshake_init.key_material_exposed());
            assert!(!handshake_init.transport_io_opened());
            assert!(!handshake_init.runtime_messaging_enabled());

            let handshake_export = production_pairing_session_handshake_init_export(
                &alice_store,
                alice.clone(),
                &passphrase,
            )
            .expect("handshake init export");
            assert!(handshake_export.storage_opened());
            assert!(handshake_export.session_draft_loaded());
            assert!(handshake_export.local_noise_static_private_key_loaded());
            assert!(handshake_export.local_noise_static_matches_draft());
            assert!(handshake_export.safety_transcript_loaded());
            assert_eq!(
                handshake_export.local_role_can_initiate(),
                handshake_init.local_role_can_initiate()
            );
            assert_eq!(
                handshake_export.handshake_message_created(),
                handshake_init.handshake_message_created()
            );
            assert_eq!(
                handshake_export.handshake_message_len() > 0,
                handshake_init.handshake_message_len() > 0
            );
            assert!(!handshake_export.handshake_message_exposed());
            assert_eq!(
                !handshake_export.export_payload().is_empty(),
                handshake_export.handshake_message_created()
            );
            if handshake_export.handshake_message_created() {
                assert!(handshake_export
                    .export_payload()
                    .starts_with("ADNOISEXXINIT1|"));
            }
            assert_eq!(
                handshake_export.initiator_state_written(),
                handshake_export.handshake_message_created()
            );
            assert!(!handshake_export.key_material_exposed());
            assert!(!handshake_export.transport_io_opened());
            assert!(!handshake_export.runtime_messaging_enabled());

            let handshake_import_payload = if handshake_export.handshake_message_created() {
                handshake_export.export_payload()
            } else {
                "ADNOISEXXINIT1|00\n"
            };
            let handshake_import = production_pairing_session_handshake_init_import(
                &alice_store,
                alice.clone(),
                &passphrase,
                handshake_import_payload,
            )
            .expect("handshake init import");
            assert!(handshake_import.storage_opened());
            assert!(handshake_import.session_draft_loaded());
            assert!(handshake_import.safety_transcript_loaded());
            assert_eq!(
                handshake_import.local_role_can_accept(),
                plan.local_role == SessionRole::Responder
            );
            assert!(handshake_import.handshake_message_read());
            assert!(handshake_import.handshake_message_decodable());
            assert!(handshake_import.handshake_message_len() > 0);
            assert!(!handshake_import.handshake_message_exposed());
            assert!(!handshake_import.responder_state_created());
            assert!(!handshake_import.key_material_exposed());
            assert!(!handshake_import.transport_io_opened());
            assert!(!handshake_import.runtime_messaging_enabled());
            assert_eq!(
                production_pairing_session_handshake_init_import(
                    &alice_store,
                    alice.clone(),
                    &passphrase,
                    "ADNOISEXXINIT1|not-hex\n",
                ),
                Err(ProductionSessionError::UnexpectedEnvelope)
            );

            let bob_handshake_export = production_pairing_session_handshake_init_export(
                &bob_store,
                bob.clone(),
                &passphrase,
            )
            .expect("bob handshake init export");
            let reply_export = if handshake_export.handshake_message_created() {
                production_pairing_session_handshake_reply_export(
                    &bob_store,
                    bob.clone(),
                    &passphrase,
                    handshake_export.export_payload(),
                )
                .expect("bob handshake reply export")
            } else {
                assert!(bob_handshake_export.handshake_message_created());
                production_pairing_session_handshake_reply_export(
                    &alice_store,
                    alice.clone(),
                    &passphrase,
                    bob_handshake_export.export_payload(),
                )
                .expect("alice handshake reply export")
            };
            assert!(reply_export.storage_opened());
            assert!(reply_export.session_draft_loaded());
            assert!(reply_export.local_noise_static_private_key_loaded());
            assert!(reply_export.local_noise_static_matches_draft());
            assert!(reply_export.safety_transcript_loaded());
            assert!(reply_export.local_role_can_accept());
            assert!(reply_export.init_message_read());
            assert!(reply_export.init_message_decodable());
            assert!(reply_export.init_message_len() > 0);
            assert!(reply_export.reply_message_created());
            assert!(reply_export.reply_message_len() > 0);
            assert!(!reply_export.reply_message_exposed());
            assert!(reply_export
                .export_payload()
                .starts_with("ADNOISEXXREPLY1|"));
            assert!(reply_export.responder_state_persisted());
            assert!(!reply_export.key_material_exposed());
            assert!(!reply_export.transport_io_opened());
            assert!(!reply_export.runtime_messaging_enabled());

            let finish_export = if handshake_export.handshake_message_created() {
                production_pairing_session_handshake_finish_export(
                    &alice_store,
                    alice.clone(),
                    &passphrase,
                    reply_export.export_payload(),
                )
                .expect("alice handshake finish export")
            } else {
                production_pairing_session_handshake_finish_export(
                    &bob_store,
                    bob.clone(),
                    &passphrase,
                    reply_export.export_payload(),
                )
                .expect("bob handshake finish export")
            };
            assert!(finish_export.storage_opened());
            assert!(finish_export.session_draft_loaded());
            assert!(finish_export.local_noise_static_private_key_loaded());
            assert!(finish_export.local_noise_static_matches_draft());
            assert!(finish_export.safety_transcript_loaded());
            assert!(finish_export.local_role_can_finish());
            assert!(finish_export.initiator_state_loaded());
            assert!(finish_export.reply_message_read());
            assert!(finish_export.reply_message_decodable());
            assert!(finish_export.reply_message_len() > 0);
            assert!(finish_export.finish_message_created());
            assert!(finish_export.finish_message_len() > 0);
            assert!(!finish_export.finish_message_exposed());
            assert!(finish_export
                .export_payload()
                .starts_with("ADNOISEXXFINISH1|"));
            assert!(finish_export.transport_state_persisted());
            assert!(!finish_export.key_material_exposed());
            assert!(!finish_export.transport_io_opened());
            assert!(!finish_export.runtime_messaging_enabled());

            let finish_import = if handshake_export.handshake_message_created() {
                production_pairing_session_handshake_finish_import(
                    &bob_store,
                    bob.clone(),
                    &passphrase,
                    finish_export.export_payload(),
                )
                .expect("bob handshake finish import")
            } else {
                production_pairing_session_handshake_finish_import(
                    &alice_store,
                    alice.clone(),
                    &passphrase,
                    finish_export.export_payload(),
                )
                .expect("alice handshake finish import")
            };
            assert!(finish_import.storage_opened());
            assert!(finish_import.session_draft_loaded());
            assert!(finish_import.local_noise_static_private_key_loaded());
            assert!(finish_import.local_noise_static_matches_draft());
            assert!(finish_import.safety_transcript_loaded());
            assert!(finish_import.local_role_can_complete());
            assert!(finish_import.responder_state_loaded());
            assert!(finish_import.finish_message_read());
            assert!(finish_import.finish_message_decodable());
            assert!(finish_import.finish_message_len() > 0);
            assert!(finish_import.remote_static_verified());
            assert!(finish_import.transport_state_created());
            assert!(finish_import.transport_state_persisted());
            assert!(!finish_import.key_material_exposed());
            assert!(!finish_import.transport_io_opened());
            assert!(!finish_import.runtime_messaging_enabled());

            let (outbound_store, outbound_profile) = if handshake_export.handshake_message_created()
            {
                (&alice_store, alice.clone())
            } else {
                (&bob_store, bob.clone())
            };
            let pending_status_before = production_message_pending_status(
                outbound_store,
                outbound_profile.clone(),
                &passphrase,
                1,
            )
            .expect("pending status before send prepare");
            assert!(pending_status_before.storage_opened());
            assert!(pending_status_before.runtime_material_reconstructable());
            assert!(!pending_status_before.local_message_index_present());
            assert!(!pending_status_before.pending_message_record_present());
            assert!(!pending_status_before.pending_message_record_decodable());
            assert!(!pending_status_before.local_message_index_matches_pending());
            assert!(!pending_status_before.plaintext_exposed());
            assert!(!pending_status_before.envelope_encryption_ready());
            assert!(!pending_status_before.network_send_attempted());
            assert!(!pending_status_before.key_material_exposed());
            assert!(!pending_status_before.transport_io_opened());
            assert!(!pending_status_before.runtime_messaging_enabled());

            let send_prepare = production_message_send_prepare(
                outbound_store,
                outbound_profile.clone(),
                &passphrase,
                1,
                b"hi",
            )
            .expect("message send prepare");
            assert!(send_prepare.storage_opened());
            assert!(send_prepare.runtime_material_reconstructable());
            assert!(send_prepare.outbound_envelope_io_ready());
            assert!(send_prepare.plaintext_accepted());
            assert!(send_prepare.message_number_reserved());
            assert!(send_prepare.local_message_index_written());
            assert!(send_prepare.pending_message_record_written());
            assert!(!send_prepare.envelope_encryption_ready());
            assert!(!send_prepare.network_send_attempted());
            assert!(!send_prepare.key_material_exposed());
            assert!(!send_prepare.transport_io_opened());
            assert!(!send_prepare.runtime_messaging_enabled());

            let store_after_send = LockedProfileStore::new(outbound_store)
                .unlock(&passphrase)
                .expect("unlock store after send prepare");
            let outbound_draft = load_latest_session_draft(&store_after_send, &outbound_profile)
                .expect("read outbound draft")
                .expect("outbound draft");
            let message_index = store_after_send
                .get(&production_local_message_index_record_id(
                    &outbound_draft.channel_id,
                    &outbound_draft.remote_contact_id,
                    1,
                ))
                .expect("read local message index")
                .expect("local message index");
            assert_eq!(message_index.kind, ProductionRecordKind::LocalMessageIndex);
            assert_eq!(
                LocalMessageIndexEntry::decode(
                    &String::from_utf8(message_index.sealed_body).expect("index body")
                )
                .expect("decode index"),
                LocalMessageIndexEntry::new(
                    outbound_draft.remote_contact_id.clone(),
                    1,
                    MessageType::Data
                )
                .expect("index entry")
            );
            let pending_message = store_after_send
                .get(&production_message_envelope_record_id(
                    &outbound_draft.channel_id,
                    1,
                    MessageType::Data,
                ))
                .expect("read pending message")
                .expect("pending message");
            assert_eq!(pending_message.kind, ProductionRecordKind::MessageEnvelope);
            assert_eq!(
                PendingOutboundMessageRecord::decode(
                    &String::from_utf8(pending_message.sealed_body).expect("pending body")
                )
                .expect("decode pending"),
                PendingOutboundMessageRecord::new(
                    outbound_draft.remote_contact_id.clone(),
                    1,
                    MessageType::Data,
                    b"hi"
                )
                .expect("pending")
            );
            let pending_status = production_message_pending_status(
                outbound_store,
                outbound_profile.clone(),
                &passphrase,
                1,
            )
            .expect("pending status");
            assert!(pending_status.storage_opened());
            assert!(pending_status.runtime_material_reconstructable());
            assert!(pending_status.local_message_index_present());
            assert!(pending_status.pending_message_record_present());
            assert!(pending_status.pending_message_record_decodable());
            assert!(pending_status.local_message_index_matches_pending());
            assert!(!pending_status.plaintext_exposed());
            assert!(!pending_status.envelope_encryption_ready());
            assert!(!pending_status.network_send_attempted());
            assert!(!pending_status.key_material_exposed());
            assert!(!pending_status.transport_io_opened());
            assert!(!pending_status.runtime_messaging_enabled());

            let encrypt_prepare = production_message_outbound_encrypt_prepare(
                outbound_store,
                outbound_profile.clone(),
                &passphrase,
                1,
            )
            .expect("outbound encrypt prepare");
            assert!(encrypt_prepare.storage_opened());
            assert!(encrypt_prepare.runtime_material_reconstructable());
            assert!(encrypt_prepare.local_message_index_present());
            assert!(encrypt_prepare.pending_message_record_present());
            assert!(encrypt_prepare.pending_message_record_decodable());
            assert!(encrypt_prepare.local_message_index_matches_pending());
            assert!(encrypt_prepare.pending_plaintext_loaded());
            assert!(!encrypt_prepare.plaintext_exposed());
            assert!(encrypt_prepare.session_transport_ready());
            assert!(encrypt_prepare.envelope_encryption_ready());
            assert!(encrypt_prepare.encrypted_envelope_written());
            assert!(!encrypt_prepare.network_send_attempted());
            assert!(!encrypt_prepare.key_material_exposed());
            assert!(!encrypt_prepare.transport_io_opened());
            assert!(!encrypt_prepare.runtime_messaging_enabled());
            let encrypted_message = LockedProfileStore::new(outbound_store)
                .unlock(&passphrase)
                .expect("unlock after encrypt prepare")
                .get(&production_message_envelope_record_id(
                    &outbound_draft.channel_id,
                    1,
                    MessageType::Data,
                ))
                .expect("read encrypted message")
                .expect("encrypted message");
            let envelope = Envelope::decode(
                &String::from_utf8(encrypted_message.sealed_body).expect("envelope body"),
            )
            .expect("decode envelope");
            assert_eq!(envelope.channel_id, outbound_draft.channel_id);
            assert_eq!(envelope.message_number, 1);
            assert_eq!(envelope.message_type, MessageType::Data);
            assert!(!envelope
                .padded_ciphertext
                .windows(2)
                .any(|window| window == b"hi"));
            assert!(matches!(
                production_message_send_prepare(
                    outbound_store,
                    outbound_profile.clone(),
                    &passphrase,
                    2,
                    b""
                ),
                Err(ProductionSessionError::UnexpectedEnvelope)
            ));
            assert!(matches!(
                production_message_send_prepare(
                    outbound_store,
                    outbound_profile.clone(),
                    &passphrase,
                    0,
                    b"hi"
                ),
                Err(ProductionSessionError::UnexpectedEnvelope)
            ));
            assert!(matches!(
                production_message_send_prepare(
                    outbound_store,
                    outbound_profile,
                    &passphrase,
                    1,
                    b"hi"
                ),
                Err(ProductionSessionError::UnexpectedEnvelope)
            ));

            let _ = std::fs::remove_dir_all(dir);
        }

        #[test]
        fn production_setup_draft_signs_payload_with_noise_prekey_bundle() {
            let draft = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("setup draft");
            let decoded_payload =
                PairingPayload::decode(&draft.pairing.payload.encode().expect("payload encodes"))
                    .expect("payload decodes");
            let prekey =
                NoisePrekeyBundle::decode(&draft.pairing.payload.prekey_bundle).expect("prekey");

            assert_eq!(decoded_payload, draft.pairing.payload);
            assert_eq!(prekey.public_key(), draft.noise_static.public_key());
        }

        #[test]
        fn production_setup_drafts_can_plan_session() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");

            let plan = plan_session_from_verified_pairing_payloads(
                &alice.pairing.payload,
                &bob.pairing.payload,
            )
            .expect("session plan");

            assert_eq!(
                plan.local_noise_static_public_key,
                alice.noise_static.public_key()
            );
            assert_eq!(
                plan.remote_noise_static_public_key,
                bob.noise_static.public_key()
            );
        }

        #[test]
        fn production_setup_drafts_can_run_transcript_bound_handshake_smoke() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let plaintext = b"session bootstrap message";

            let result =
                run_setup_draft_handshake_smoke(&alice, &bob, plaintext).expect("handshake smoke");

            assert_eq!(result.plaintext, plaintext);
            assert!(!result
                .ciphertext
                .windows(plaintext.len())
                .any(|window| window == plaintext));
        }

        #[test]
        fn production_setup_drafts_can_encrypt_and_decrypt_envelope() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let plaintext = b"production envelope message";
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");

            let envelope = session
                .encrypt_from_canonical_dialer(1, plaintext)
                .expect("encrypt envelope");

            assert_eq!(envelope.protocol_version, 1);
            assert_eq!(envelope.channel_id, session.channel_id());
            assert_eq!(envelope.message_number, 1);
            assert_eq!(envelope.message_type, MessageType::Data);
            assert!(!envelope
                .padded_ciphertext
                .windows(plaintext.len())
                .any(|window| window == plaintext));
            assert_eq!(
                session
                    .decrypt_at_responder(&envelope)
                    .expect("decrypt envelope"),
                plaintext
            );
        }

        #[test]
        fn production_session_encrypts_endpoint_update_as_control_envelope() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let current = PairwiseRendezvousEndpoint::new(
                ContactId::new("bob").expect("contact"),
                OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("current endpoint");
            let update = PairwiseEndpointUpdate::for_existing_encrypted_session(
                &current,
                OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
                EndpointUpdateChannel::ExistingEncryptedSession,
            )
            .expect("endpoint update");
            let plaintext = EndpointUpdateControlPlaintext::from_pairwise_update(&update);
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");

            let control = session
                .encrypt_endpoint_update_from_canonical_dialer(&update, 2)
                .expect("endpoint update control envelope");

            assert_eq!(control.contact_id(), current.contact_id());
            assert_eq!(control.envelope().protocol_version, 1);
            assert_eq!(control.envelope().channel_id, session.channel_id());
            assert_eq!(control.envelope().message_number, 2);
            assert_eq!(control.envelope().message_type, MessageType::Control);
            assert!(!control
                .envelope()
                .padded_ciphertext
                .windows("newsecret.onion".len())
                .any(|window| window == b"newsecret.onion"));

            let decrypted = session
                .decrypt_control_at_responder(control.envelope())
                .expect("decrypt endpoint update");
            assert_eq!(trim_padding(&decrypted), plaintext.encode().as_slice());

            let debug = format!("{control:?}");
            assert!(!debug.contains("bob"));
            assert!(!debug.contains("oldsecret.onion"));
            assert!(!debug.contains("newsecret.onion"));
        }

        #[test]
        fn production_envelope_session_rejects_tampered_ciphertext() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut envelope = session
                .encrypt_from_canonical_dialer(1, b"production envelope message")
                .expect("encrypt envelope");
            let last = envelope
                .padded_ciphertext
                .last_mut()
                .expect("ciphertext is non-empty");
            *last ^= 0x01;

            assert!(session.decrypt_at_responder(&envelope).is_err());
        }

        #[test]
        fn production_envelope_replay_window_rejects_duplicate_message() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut replay_window = ReplayWindow::new(4).expect("replay window");
            let envelope = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt envelope");

            assert_eq!(
                session
                    .decrypt_at_responder_with_replay(&envelope, &mut replay_window)
                    .expect("decrypt envelope"),
                b"message one"
            );
            assert_eq!(
                session.decrypt_at_responder_with_replay(&envelope, &mut replay_window),
                Err(ProductionSessionError::Protocol(
                    ProtocolError::ReplayMessage
                ))
            );
        }

        #[test]
        fn production_envelope_replay_window_rejects_old_message() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut replay_window = ReplayWindow::new(2).expect("replay window");
            let first = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt first");
            let second = session
                .encrypt_from_canonical_dialer(2, b"message two")
                .expect("encrypt second");
            let third = session
                .encrypt_from_canonical_dialer(3, b"message three")
                .expect("encrypt third");

            assert!(session
                .decrypt_at_responder_with_replay(&first, &mut replay_window)
                .is_ok());
            assert!(session
                .decrypt_at_responder_with_replay(&second, &mut replay_window)
                .is_ok());
            assert!(session
                .decrypt_at_responder_with_replay(&third, &mut replay_window)
                .is_ok());
            assert_eq!(
                session.decrypt_at_responder_with_replay(&first, &mut replay_window),
                Err(ProductionSessionError::Protocol(ProtocolError::OldMessage))
            );
        }

        #[test]
        fn production_envelope_tamper_does_not_advance_replay_window() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut replay_window = ReplayWindow::new(4).expect("replay window");
            let mut tampered = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt tampered");
            let last = tampered
                .padded_ciphertext
                .last_mut()
                .expect("ciphertext is non-empty");
            *last ^= 0x01;
            assert!(session
                .decrypt_at_responder_with_replay(&tampered, &mut replay_window)
                .is_err());

            let (alice, bob) = production_setup_pair();
            let mut fresh_session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("fresh envelope session");
            let valid = fresh_session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt valid");
            assert_eq!(replay_window.highest_seen(), 0);
            assert!(fresh_session
                .decrypt_at_responder_with_replay(&valid, &mut replay_window)
                .is_ok());
        }

        #[test]
        fn production_receive_persists_replay_after_successful_decrypt() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let (_dir, store) = production_test_store("persistent-replay-success");
            let record_id = session.replay_record_id();
            let scope = EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile"));
            let envelope = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt envelope");

            assert_eq!(
                session
                    .decrypt_at_responder_with_persistent_replay(
                        &envelope,
                        &store,
                        &record_id,
                        scope.clone(),
                        4,
                    )
                    .expect("decrypt envelope"),
                b"message one"
            );
            assert_eq!(
                store
                    .load_replay_window(&record_id)
                    .expect("load replay")
                    .expect("replay persisted")
                    .highest_seen(),
                1
            );
            assert_eq!(
                session.decrypt_at_responder_with_session_replay(&envelope, &store, scope, 4),
                Err(ProductionSessionError::Protocol(
                    ProtocolError::ReplayMessage
                ))
            );
        }

        #[test]
        fn production_receive_tamper_does_not_persist_replay_state() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let (_dir, store) = production_test_store("persistent-replay-tamper");
            let record_id = session.replay_record_id();
            let scope = EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile"));
            let mut envelope = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt envelope");
            let last = envelope
                .padded_ciphertext
                .last_mut()
                .expect("ciphertext is non-empty");
            *last ^= 0x01;

            assert!(session
                .decrypt_at_responder_with_persistent_replay(
                    &envelope, &store, &record_id, scope, 4
                )
                .is_err());
            assert_eq!(
                store.load_replay_window(&record_id).expect("load replay"),
                None
            );
        }

        #[test]
        fn production_replay_record_id_is_session_scoped_and_opaque() {
            let (alice, bob) = production_setup_pair();
            let alice_bob = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("alice bob session");
            let (carol, dave) = production_setup_pair();
            let carol_dave = establish_envelope_session_from_setup_drafts(&carol, &dave)
                .expect("carol dave session");

            assert_eq!(alice_bob.replay_record_id(), alice_bob.replay_record_id());
            assert_ne!(alice_bob.replay_record_id(), carol_dave.replay_record_id());
            assert!(!format!("{:?}", alice_bob.replay_record_id()).contains("adchan1"));
            assert!(EncryptedRecordId::new(alice_bob.channel_id()).is_err());
        }

        #[test]
        fn production_message_record_ids_are_session_scoped_and_opaque() {
            let (alice, bob) = production_setup_pair();
            let alice_bob = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("alice bob session");
            let (carol, dave) = production_setup_pair();
            let carol_dave = establish_envelope_session_from_setup_drafts(&carol, &dave)
                .expect("carol dave session");
            let contact = ContactId::new("bob").expect("contact");

            let message_one = alice_bob.message_envelope_record_id(1, MessageType::Data);
            let message_two = alice_bob.message_envelope_record_id(2, MessageType::Data);
            let control_one = alice_bob.message_envelope_record_id(1, MessageType::Control);
            let other_session = carol_dave.message_envelope_record_id(1, MessageType::Data);
            let index_one = alice_bob.local_message_index_record_id(&contact, 1);
            let index_two = alice_bob.local_message_index_record_id(&contact, 2);

            assert_eq!(
                message_one,
                alice_bob.message_envelope_record_id(1, MessageType::Data)
            );
            assert_ne!(message_one, message_two);
            assert_ne!(message_one, control_one);
            assert_ne!(message_one, other_session);
            assert_ne!(index_one, index_two);
            for record_id in [message_one, control_one, index_one] {
                let debug = format!("{record_id:?}");
                assert!(!debug.contains("adchan1"));
                assert!(!debug.contains("bob"));
                assert!(!debug.contains(alice_bob.channel_id()));
            }
        }

        #[test]
        fn production_local_message_index_persists_through_encrypted_store() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let entry =
                LocalMessageIndexEntry::new(contact.clone(), 7, MessageType::Data).expect("entry");
            let (dir, store) = production_test_store("local-message-index");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );

            let record_id = session
                .save_local_message_index(&store, scope, &entry)
                .expect("save local message index");

            assert_eq!(
                session
                    .load_local_message_index(&store, &contact, 7)
                    .expect("load local message index"),
                Some(entry)
            );
            assert_eq!(
                record_id,
                session.local_message_index_record_id(&contact, 7)
            );
            let rendered_record_id = format!("{record_id:?}");
            assert!(!rendered_record_id.contains("alice"));
            assert!(!rendered_record_id.contains("bob"));
            assert!(!rendered_record_id.contains("adchan1"));

            let database_bytes = std::fs::read(dir.join("store.db")).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"ADMSGIDX1"));
            assert!(!contains_bytes(&database_bytes, b"bob"));
            assert!(!contains_bytes(&database_bytes, b"alice"));
        }

        #[test]
        fn production_local_message_index_rejects_scope_mismatch() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let entry = LocalMessageIndexEntry::new(
                ContactId::new("bob").expect("contact"),
                7,
                MessageType::Data,
            )
            .expect("entry");
            let (_dir, store) = production_test_store("local-message-index-scope-mismatch");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                ContactId::new("carol").expect("contact"),
            );

            assert_eq!(
                session.save_local_message_index(&store, scope, &entry),
                Err(ProductionSessionError::EndpointScopeMismatch)
            );
        }

        #[test]
        fn production_local_message_index_delete_uses_allocated_record_id() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let entry =
                LocalMessageIndexEntry::new(contact.clone(), 7, MessageType::Data).expect("entry");
            let (_dir, store) = production_test_store("local-message-index-delete");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );
            let record_id = session
                .save_local_message_index(&store, scope, &entry)
                .expect("save local message index");

            store
                .delete_local_message_index(&record_id)
                .expect("delete local message index");

            assert_eq!(
                session
                    .load_local_message_index(&store, &contact, 7)
                    .expect("load after delete"),
                None
            );
        }

        #[test]
        fn production_endpoint_state_persists_through_encrypted_store_with_opaque_record_id() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let endpoint = PairwiseRendezvousEndpoint::new(
                contact.clone(),
                OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("pairwise endpoint");
            let (dir, store) = production_test_store("endpoint-state");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );

            let record_id = session
                .save_pairwise_endpoint_state(&store, scope, &endpoint)
                .expect("save endpoint state");

            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load endpoint state"),
                Some(endpoint)
            );
            assert_eq!(record_id, session.endpoint_state_record_id(&contact));
            let rendered_record_id = format!("{record_id:?}");
            assert!(!rendered_record_id.contains("alice"));
            assert!(!rendered_record_id.contains("bob"));
            assert!(!rendered_record_id.contains("adchan1"));

            let database_bytes = std::fs::read(dir.join("store.db")).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"ADENDPOINTSTATE1"));
            assert!(!contains_bytes(&database_bytes, b"bobsecret.onion"));
            assert!(!contains_bytes(&database_bytes, b"alice"));
            assert!(!contains_bytes(&database_bytes, b"bob"));
        }

        #[test]
        fn production_endpoint_state_rejects_scope_mismatch() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let endpoint = PairwiseRendezvousEndpoint::new(
                ContactId::new("bob").expect("contact"),
                OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("pairwise endpoint");
            let (_dir, store) = production_test_store("endpoint-state-scope-mismatch");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                ContactId::new("carol").expect("contact"),
            );

            assert_eq!(
                session.save_pairwise_endpoint_state(&store, scope, &endpoint),
                Err(ProductionSessionError::EndpointScopeMismatch)
            );
        }

        #[test]
        fn production_endpoint_state_delete_uses_opaque_record_id() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let endpoint = PairwiseRendezvousEndpoint::new(
                contact.clone(),
                OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("pairwise endpoint");
            let (_dir, store) = production_test_store("endpoint-state-delete");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );

            session
                .save_pairwise_endpoint_state(&store, scope, &endpoint)
                .expect("save endpoint state");
            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load endpoint state"),
                Some(endpoint)
            );

            session
                .delete_pairwise_endpoint_state(&store, &contact)
                .expect("delete endpoint state");

            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load after delete"),
                None
            );
            let record_id = session.endpoint_state_record_id(&contact);
            let rendered_record_id = format!("{record_id:?}");
            assert!(!rendered_record_id.contains("bob"));
            assert!(!rendered_record_id.contains("adchan1"));
        }

        #[test]
        fn production_endpoint_state_delete_is_idempotent_for_missing_state() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let (_dir, store) = production_test_store("endpoint-state-delete-missing");

            session
                .delete_pairwise_endpoint_state(&store, &contact)
                .expect("first delete endpoint state");
            session
                .delete_pairwise_endpoint_state(&store, &contact)
                .expect("second delete endpoint state");
            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load missing endpoint state"),
                None
            );
        }

        fn production_setup_pair() -> (ProductionSetupDraft, ProductionSetupDraft) {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            (alice, bob)
        }

        fn production_test_store(test_name: &str) -> (std::path::PathBuf, SqlCipherRecordStore) {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-core-sqlcipher-{test_name}-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale test dir");
            }
            std::fs::create_dir_all(&dir).expect("create test dir");
            let locked = LockedProfileStore::new(dir.join("store.db"));
            let passphrase = ProfilePassphrase::new("test-passphrase").expect("passphrase");
            let store = locked.unlock(&passphrase).expect("unlock store");
            (dir, store)
        }

        fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
            haystack
                .windows(needle.len())
                .any(|window| window == needle)
        }

        #[test]
        fn production_setup_handshake_rejects_noise_static_key_mismatch() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let mut bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            bob.noise_static = generate_noise_static_keypair().expect("replacement keypair");

            assert_eq!(
                run_setup_draft_handshake_smoke(&alice, &bob, b"body"),
                Err(ProductionSessionError::NoiseStaticKeyMismatch)
            );
        }

        #[test]
        fn production_session_plan_is_order_stable() {
            let alice_prekey = noise_prekey_bundle();
            let bob_prekey = noise_prekey_bundle();
            let alice = production_payload("alice", [51_u8; 32], "alice.onion", &alice_prekey);
            let bob = production_payload("bob", [52_u8; 32], "bob.onion", &bob_prekey);

            let alice_view =
                plan_session_from_verified_pairing_payloads(&alice, &bob).expect("session plan");
            let bob_view =
                plan_session_from_verified_pairing_payloads(&bob, &alice).expect("session plan");

            assert_eq!(alice_view.safety_transcript, bob_view.safety_transcript);
            assert_eq!(
                alice_view.canonical_dialer_public_key,
                bob_view.canonical_dialer_public_key
            );
            assert_ne!(alice_view.local_role, bob_view.local_role);
            assert_eq!(
                alice_view.local_rendezvous_endpoint.contact_id().as_str(),
                "alice"
            );
            assert_eq!(
                alice_view.local_rendezvous_endpoint.endpoint().as_str(),
                "alice.onion"
            );
            assert_eq!(
                alice_view.remote_rendezvous_endpoint.contact_id().as_str(),
                "bob"
            );
            assert_eq!(
                bob_view.local_rendezvous_endpoint.contact_id().as_str(),
                "bob"
            );
            assert_eq!(
                bob_view.remote_rendezvous_endpoint.contact_id().as_str(),
                "alice"
            );
            assert_eq!(
                alice_view.local_noise_static_public_key,
                bob_view.remote_noise_static_public_key
            );
            assert_eq!(
                alice_view.remote_noise_static_public_key,
                bob_view.local_noise_static_public_key
            );
        }

        #[test]
        fn production_session_plan_resolves_duplicate_connections_without_timing_rules() {
            let alice_prekey = noise_prekey_bundle();
            let bob_prekey = noise_prekey_bundle();
            let alice = production_payload("alice", [51_u8; 32], "alice.onion", &alice_prekey);
            let bob = production_payload("bob", [52_u8; 32], "bob.onion", &bob_prekey);

            let alice_view =
                plan_session_from_verified_pairing_payloads(&alice, &bob).expect("session plan");
            let bob_view =
                plan_session_from_verified_pairing_payloads(&bob, &alice).expect("session plan");

            assert_eq!(
                alice_view.canonical_dialer_public_key,
                bob_view.canonical_dialer_public_key
            );
            assert_ne!(
                alice_view.canonical_connection_direction(),
                bob_view.canonical_connection_direction()
            );

            let duplicate_direction = alice_view.canonical_connection_direction().opposite();

            assert!(alice_view
                .is_canonical_connection_direction(alice_view.canonical_connection_direction()));
            assert!(!alice_view.is_canonical_connection_direction(duplicate_direction));
            assert_eq!(
                alice_view.duplicate_connection_action(
                    alice_view.canonical_connection_direction(),
                    CanonicalConnectionState::MissingOrUnauthenticated,
                ),
                DuplicateConnectionAction::KeepCanonicalConnection
            );
            assert_eq!(
                alice_view.duplicate_connection_action(
                    duplicate_direction,
                    CanonicalConnectionState::MissingOrUnauthenticated,
                ),
                DuplicateConnectionAction::WaitForCanonicalConnection
            );
            assert_eq!(
                alice_view.duplicate_connection_action(
                    duplicate_direction,
                    CanonicalConnectionState::AuthenticatedUnhealthy,
                ),
                DuplicateConnectionAction::WaitForCanonicalConnection
            );
            assert_eq!(
                alice_view.duplicate_connection_action(
                    duplicate_direction,
                    CanonicalConnectionState::AuthenticatedHealthy,
                ),
                DuplicateConnectionAction::CloseDuplicateConnection
            );
        }

        #[test]
        fn production_session_plan_rejects_invalid_or_shared_rendezvous_endpoint() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let invalid_endpoint =
                production_payload("bob", [52_u8; 32], "bob.example", &noise_prekey_bundle());
            let shared_endpoint =
                production_payload("bob", [53_u8; 32], "alice.onion", &noise_prekey_bundle());

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &invalid_endpoint),
                Err(ProductionSessionError::InvalidRendezvousEndpoint)
            );
            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &shared_endpoint),
                Err(ProductionSessionError::SameRendezvousEndpoint)
            );
        }

        #[test]
        fn production_session_plan_rejects_non_production_payload() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let dev_like = PairingPayload {
                owner_profile: ProfileName::new("bob").expect("valid profile"),
                pairing_nonce: "nonce".to_string(),
                pairwise_public_key: PairwisePublicKey::new("dev-pub-bob")
                    .expect("valid public key"),
                pairwise_signature: PairwiseSignature::new("dev-sign-v1-bob")
                    .expect("valid signature"),
                rendezvous_endpoint: "bob.onion".to_string(),
                endpoint_rotation_policy: "manual-v1".to_string(),
                protocol_capabilities: "prototype-production-pairing-v1".to_string(),
                prekey_bundle: noise_prekey_bundle(),
                issued_at_local_ms: 1_000,
                ttl_seconds: DEFAULT_TTL_SECONDS,
            };

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &dev_like),
                Err(ProductionSessionError::NonProductionPairingPayload)
            );
        }

        #[test]
        fn production_session_plan_rejects_tampered_payload() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let mut bob =
                production_payload("bob", [52_u8; 32], "bob.onion", &noise_prekey_bundle());
            bob.rendezvous_endpoint = "bob-rotated.onion".to_string();

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &bob),
                Err(ProductionSessionError::Pairing(
                    PairingError::InvalidPayload
                ))
            );
        }

        #[test]
        fn production_session_plan_rejects_invalid_noise_prekey_bundle() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let bob = production_payload("bob", [52_u8; 32], "bob.onion", "not-a-noise-prekey");

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &bob),
                Err(ProductionSessionError::Crypto(
                    CryptoError::InvalidNoisePrekeyBundle
                ))
            );
        }

        fn noise_prekey_bundle() -> String {
            generate_noise_static_keypair()
                .expect("noise static key")
                .prekey_bundle()
                .expect("prekey bundle")
                .encode()
        }

        fn production_payload(
            owner: &str,
            seed: [u8; 32],
            endpoint: &str,
            prekey: &str,
        ) -> PairingPayload {
            let private_key =
                ProductionPairwisePrivateKey::from_ed25519_dalek_seed(seed).expect("valid seed");
            production_pairing_payload_for(
                &ProfileName::new(owner).expect("valid profile"),
                &private_key,
                ProductionPairingPayloadParams {
                    pairing_nonce: format!("{owner}-nonce"),
                    rendezvous_endpoint: endpoint.to_string(),
                    endpoint_rotation_policy: "manual-v1".to_string(),
                    protocol_capabilities: "prototype-production-pairing-v1".to_string(),
                    prekey_bundle: prekey.to_string(),
                    issued_at_local_ms: 1_000,
                    ttl_seconds: DEFAULT_TTL_SECONDS,
                },
            )
            .expect("payload signs")
        }
    }
}

#[cfg(feature = "dev-insecure")]
pub mod dev_insecure {
    use another_dimension_crypto::dev_insecure::FakeCryptoSession;
    use another_dimension_crypto::CryptoSession;
    use another_dimension_identity::{ContactId, ProfileName};
    use another_dimension_pairing::{
        dev_pairing_material_for, transcript, PairingPayload, PendingContact,
    };
    use another_dimension_protocol::{Envelope, MessageType, ProtocolError};
    use another_dimension_storage::dev_insecure::DevFileStore;
    use another_dimension_storage::{StorageError, Store};
    use another_dimension_transport::dev_insecure::DevFileTransport;
    use another_dimension_transport::{Transport, TransportError};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    const REPLAY_WINDOW_SIZE: u64 = 128;

    #[derive(Clone, Debug)]
    pub struct DevApp {
        store: DevFileStore,
        transport: DevFileTransport,
        crypto: FakeCryptoSession,
    }

    impl DevApp {
        pub fn new(root: impl Into<PathBuf>) -> Self {
            let store = DevFileStore::new(root);
            let transport = DevFileTransport::new(store.clone());
            Self {
                store,
                transport,
                crypto: FakeCryptoSession,
            }
        }

        pub fn init_profile(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.store.create_profile(&profile)?;
            Ok(format!("profile initialized: {profile}"))
        }

        pub fn pairing_start(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let (payload, private_key) = dev_pairing_material_for(&profile);
            self.store
                .save_own_pairing_material(&profile, &payload, &private_key)?;
            payload.encode().map_err(CoreError::from)
        }

        pub fn pairing_scan(
            &self,
            profile: ProfileName,
            remote_payload: PairingPayload,
        ) -> Result<ScanResult, CoreError> {
            self.require_profile(&profile)?;
            if remote_payload.is_expired_at(now_ms()) {
                return Err(CoreError::Pairing(
                    another_dimension_pairing::PairingError::ExpiredPayload,
                ));
            }
            let contact_id = remote_payload.contact_id()?;
            if self.store.pending_contact_exists(&profile, &contact_id) {
                return Err(CoreError::PairingAlreadyPending(contact_id.to_string()));
            }
            if self.store.contact_exists(&profile, &contact_id) {
                return Err(CoreError::ContactAlreadyActive(contact_id.to_string()));
            }
            let local_payload = match self.store.latest_own_pairing(&profile) {
                Ok(payload) => payload,
                Err(_) => {
                    let (payload, private_key) = dev_pairing_material_for(&profile);
                    self.store
                        .save_own_pairing_material(&profile, &payload, &private_key)?;
                    payload
                }
            };
            let safety_transcript = transcript(&local_payload, &remote_payload)?;
            let safety = self.crypto.derive_safety_material(&safety_transcript);
            let pending = PendingContact {
                contact_id: contact_id.clone(),
                local_payload: local_payload.clone(),
                remote_payload,
                safety_number: safety.number.clone(),
                safety_phrase: safety.phrase.clone(),
            };
            self.store.save_pending_contact(&pending)?;
            Ok(ScanResult {
                response_payload: local_payload.encode().map_err(CoreError::from)?,
                contact_id,
                safety_number: safety.number,
                safety_phrase: safety.phrase,
            })
        }

        pub fn pairing_confirm(
            &self,
            profile: ProfileName,
            contact: ContactId,
        ) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            self.store.activate_contact(&profile, &contact)?;
            Ok(format!("contact activated: {contact}"))
        }

        pub fn pairing_cancel(
            &self,
            profile: ProfileName,
            contact: ContactId,
        ) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let removed = self.store.remove_pending_contact(&profile, &contact)?;
            if removed {
                Ok(format!("pending pairing cancelled: {contact}"))
            } else {
                Ok(format!("pending pairing not found: {contact}"))
            }
        }

        pub fn pairing_expire(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let count = self.expire_pending_pairings_at(&profile, now_ms())?;
            Ok(format!("expired pending pairings: {count}"))
        }

        pub fn message_send(
            &self,
            sender: ProfileName,
            contact: ContactId,
            plaintext: String,
        ) -> Result<String, CoreError> {
            self.require_profile(&sender)?;
            if !self.store.contact_exists(&sender, &contact) {
                return Err(CoreError::ContactNotActive(contact.to_string()));
            }
            let recipient =
                ProfileName::new(contact.as_str()).map_err(|_| CoreError::InvalidInput)?;
            let envelope = Envelope {
                protocol_version: 1,
                channel_id: format!("dev-channel-{}-{}", sender, contact),
                message_number: now_ms() as u64,
                message_type: MessageType::Data,
                padded_ciphertext: self.crypto.encrypt(&plaintext)?,
            };
            self.transport.send_envelope(&recipient, &envelope)?;
            Ok(format!(
                "queued envelope for {recipient}: {} bytes",
                envelope.padded_ciphertext.len()
            ))
        }

        pub fn message_receive(&self, profile: ProfileName) -> Result<Vec<String>, CoreError> {
            self.require_profile(&profile)?;
            let envelopes = self.store.load_inbox_envelopes(&profile)?;
            let mut messages = Vec::new();
            for envelope in envelopes {
                let mut replay_window = self.store.load_replay_window(
                    &profile,
                    &envelope.channel_id,
                    REPLAY_WINDOW_SIZE,
                )?;
                match replay_window.accept(envelope.message_number) {
                    Ok(()) => {
                        self.store.save_replay_window(
                            &profile,
                            &envelope.channel_id,
                            &replay_window,
                        )?;
                        messages.push(self.crypto.decrypt(&envelope.padded_ciphertext)?);
                    }
                    Err(ProtocolError::ReplayMessage | ProtocolError::OldMessage) => {}
                    Err(error) => return Err(CoreError::Protocol(error)),
                }
            }
            Ok(messages)
        }

        pub fn message_expire(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let count = self.store.clear_inbox(&profile)?;
            Ok(format!("expired envelopes: {count}"))
        }

        fn require_profile(&self, profile: &ProfileName) -> Result<(), CoreError> {
            if self.store.profile_exists(profile) {
                Ok(())
            } else {
                Err(CoreError::ProfileMissing(profile.to_string()))
            }
        }

        fn expire_pending_pairings_at(
            &self,
            profile: &ProfileName,
            observed_at_local_ms: u128,
        ) -> Result<usize, CoreError> {
            let pending_contacts = self.store.load_pending_contacts(profile)?;
            let mut count = 0;
            for pending in pending_contacts {
                let is_expired = pending.local_payload.is_expired_at(observed_at_local_ms)
                    || pending.remote_payload.is_expired_at(observed_at_local_ms);
                if is_expired
                    && self
                        .store
                        .remove_pending_contact(profile, &pending.contact_id)?
                {
                    count += 1;
                }
            }
            Ok(count)
        }
    }

    #[derive(Clone, Debug)]
    pub struct ScanResult {
        pub response_payload: String,
        pub contact_id: ContactId,
        pub safety_number: String,
        pub safety_phrase: String,
    }

    #[derive(Debug)]
    pub enum CoreError {
        Storage(StorageError),
        Transport(TransportError),
        Crypto(another_dimension_crypto::CryptoError),
        Pairing(another_dimension_pairing::PairingError),
        Protocol(ProtocolError),
        ProfileMissing(String),
        ContactNotActive(String),
        PairingAlreadyPending(String),
        ContactAlreadyActive(String),
        InvalidInput,
    }

    impl From<StorageError> for CoreError {
        fn from(value: StorageError) -> Self {
            Self::Storage(value)
        }
    }

    impl From<TransportError> for CoreError {
        fn from(value: TransportError) -> Self {
            Self::Transport(value)
        }
    }

    impl From<another_dimension_crypto::CryptoError> for CoreError {
        fn from(value: another_dimension_crypto::CryptoError) -> Self {
            Self::Crypto(value)
        }
    }

    impl From<another_dimension_pairing::PairingError> for CoreError {
        fn from(value: another_dimension_pairing::PairingError) -> Self {
            Self::Pairing(value)
        }
    }

    impl From<ProtocolError> for CoreError {
        fn from(value: ProtocolError) -> Self {
            Self::Protocol(value)
        }
    }

    fn now_ms() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::fs;
        use std::path::Path;

        #[test]
        fn same_machine_pairing_requires_confirmation_before_send() {
            let root = temp_root("pairing_requires_confirmation");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");
            let alice_contact = ContactId::new("alice").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");

            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let alice_nonce = alice_payload.pairing_nonce.clone();
            assert!(app.store.own_pairing_material_exists(&alice, &alice_nonce));
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            assert!(app.store.own_pairing_material_exists(&alice, &alice_nonce));
            let alice_scan = app
                .pairing_scan(alice.clone(), bob_payload)
                .expect("alice scans bob");
            assert!(!app.store.own_pairing_material_exists(&alice, &alice_nonce));

            assert_eq!(alice_scan.safety_number, bob_scan.safety_number);
            assert!(matches!(
                app.message_send(alice.clone(), bob_contact.clone(), "blocked".to_string()),
                Err(CoreError::ContactNotActive(contact)) if contact == "bob"
            ));

            app.pairing_confirm(alice.clone(), bob_contact.clone())
                .expect("alice confirms bob");
            app.pairing_confirm(bob.clone(), alice_contact)
                .expect("bob confirms alice");
            let send_result = app
                .message_send(alice, bob_contact, "hello after confirm".to_string())
                .expect("send after confirm");

            assert!(send_result.contains("256 bytes"));
            let messages = app.message_receive(bob.clone()).expect("bob receives");
            assert_eq!(messages, vec!["hello after confirm".to_string()]);
            let replayed_messages = app.message_receive(bob).expect("bob receives again");
            assert!(replayed_messages.is_empty());
            assert!(!tree_contains(&root, "hello after confirm"));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn expired_pairing_payload_is_rejected() {
            let root = temp_root("expired_pairing_payload");
            let app = DevApp::new(&root);
            let bob = ProfileName::new("bob").expect("valid profile");
            app.init_profile(bob.clone()).expect("bob profile");

            let expired_payload = PairingPayload {
                owner_profile: ProfileName::new("alice").expect("valid profile"),
                pairing_nonce: "expired".to_string(),
                pairwise_public_key: another_dimension_identity::PairwisePublicKey::new(
                    "alice-pub",
                )
                .expect("valid public key"),
                pairwise_signature: another_dimension_identity::PairwiseSignature::new(
                    "unsigned-test-signature",
                )
                .expect("valid signature"),
                rendezvous_endpoint: "alice.onion".to_string(),
                endpoint_rotation_policy: "manual-v1".to_string(),
                protocol_capabilities: "prototype".to_string(),
                prekey_bundle: "PendingCryptoDesign".to_string(),
                issued_at_local_ms: 1,
                ttl_seconds: 1,
            };

            assert!(matches!(
                app.pairing_scan(bob, expired_payload),
                Err(CoreError::Pairing(
                    another_dimension_pairing::PairingError::ExpiredPayload
                ))
            ));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn cancelled_pending_pairing_cannot_be_confirmed() {
            let root = temp_root("cancelled_pending_pairing");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload)
                .expect("alice scans bob");

            assert!(app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            app.pairing_cancel(alice.clone(), bob_contact.clone())
                .expect("cancel pending");
            assert!(!app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(!app.store.pending_key_exists(&alice, &bob_contact));
            assert!(matches!(
                app.pairing_confirm(alice, bob_contact),
                Err(CoreError::Storage(_))
            ));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn confirmed_pairing_moves_pending_key_to_contact_key() {
            let root = temp_root("confirmed_pairing_moves_key");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload)
                .expect("alice scans bob");

            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            assert!(!app.store.contact_key_exists(&alice, &bob_contact));
            app.pairing_confirm(alice.clone(), bob_contact.clone())
                .expect("confirm pending");

            assert!(!app.store.pending_key_exists(&alice, &bob_contact));
            assert!(app.store.contact_key_exists(&alice, &bob_contact));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn expired_pending_pairing_cleanup_removes_record_and_key() {
            let root = temp_root("expired_pending_pairing_cleanup");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.pairing_start(alice.clone())
                .expect("alice pairing payload");
            let local_payload = app
                .store
                .latest_own_pairing(&alice)
                .expect("latest own pairing");
            let (mut remote_payload, remote_private_key) = dev_pairing_material_for(&bob);
            remote_payload.issued_at_local_ms = 1;
            remote_payload.ttl_seconds = 1;
            let remote_identity = another_dimension_identity::PairwiseIdentity::new(
                remote_payload.pairwise_public_key.clone(),
                remote_private_key,
            )
            .expect("valid identity");
            remote_payload.pairwise_signature = remote_identity.sign_pairing_payload(
                &remote_payload.canonical_bytes().expect("canonical payload"),
            );
            let pending = PendingContact {
                contact_id: bob_contact.clone(),
                local_payload,
                remote_payload,
                safety_number: "000 000 000 000".to_string(),
                safety_phrase: "river-river-river".to_string(),
            };
            app.store
                .save_pending_contact(&pending)
                .expect("save pending");

            assert!(app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            let count = app
                .expire_pending_pairings_at(&alice, 2_001)
                .expect("expire pending");

            assert_eq!(count, 1);
            assert!(!app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(!app.store.pending_key_exists(&alice, &bob_contact));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn rescanning_pending_contact_does_not_create_new_pairing_material() {
            let root = temp_root("rescanning_pending_contact");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload.clone())
                .expect("alice scans bob");

            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            assert!(matches!(
                app.pairing_scan(alice, bob_payload),
                Err(CoreError::PairingAlreadyPending(contact)) if contact == "bob"
            ));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn rescanning_active_contact_is_rejected() {
            let root = temp_root("rescanning_active_contact");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload.clone())
                .expect("alice scans bob");
            app.pairing_confirm(alice.clone(), bob_contact)
                .expect("alice confirms bob");

            assert!(matches!(
                app.pairing_scan(alice, bob_payload),
                Err(CoreError::ContactAlreadyActive(contact)) if contact == "bob"
            ));

            let _ = fs::remove_dir_all(root);
        }

        fn temp_root(label: &str) -> PathBuf {
            let root = std::env::temp_dir().join(format!(
                "another-dimension-{label}-{}",
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_nanos())
                    .unwrap_or_default()
            ));
            let _ = fs::remove_dir_all(&root);
            root
        }

        fn tree_contains(root: &Path, needle: &str) -> bool {
            let Ok(entries) = fs::read_dir(root) else {
                return false;
            };
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if tree_contains(&path, needle) {
                        return true;
                    }
                } else if fs::read_to_string(&path)
                    .map(|content| content.contains(needle))
                    .unwrap_or(false)
                {
                    return true;
                }
            }
            false
        }
    }
}

mod status;

pub use status::PrototypeStatus;
use tauri::Manager;

#[cfg(debug_assertions)]
fn debug_repo_root_from_current_dir() -> Option<std::path::PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    if cwd.file_name().is_some_and(|name| name == "desktop-tauri")
        && cwd.parent()?.file_name().is_some_and(|name| name == "apps")
    {
        return cwd.parent()?.parent().map(std::path::Path::to_path_buf);
    }
    if cwd.file_name().is_some_and(|name| name == "another-dimension") {
        return Some(cwd);
    }
    None
}

#[cfg(debug_assertions)]
fn debug_peer_label_from_app(app: &tauri::AppHandle) -> Option<&'static str> {
    let identifier = app.config().identifier.as_str();
    if identifier.ends_with(".peera") {
        Some("peer-a")
    } else if identifier.ends_with(".peerb") {
        Some("peer-b")
    } else {
        None
    }
}

#[cfg(debug_assertions)]
fn debug_peer_root_from_app(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let peer = debug_peer_label_from_app(app)?;
    Some(debug_repo_root_from_current_dir()?.join(format!("another-dimension-dev-{peer}")))
}

fn production_app_data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(debug_assertions)]
    if let Ok(path) = std::env::var("ANOTHER_DIMENSION_APP_DATA_DIR") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(std::path::PathBuf::from(trimmed));
        }
    }
    #[cfg(debug_assertions)]
    if let Some(peer_root) = debug_peer_root_from_app(app) {
        return Ok(peer_root.join("app-data"));
    }

    app.path()
        .app_data_dir()
        .map_err(|_| "failed to resolve app data directory".to_string())
}

fn production_app_cache_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(debug_assertions)]
    if let Ok(path) = std::env::var("ANOTHER_DIMENSION_APP_CACHE_DIR") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(std::path::PathBuf::from(trimmed));
        }
    }
    #[cfg(debug_assertions)]
    if let Some(peer_root) = debug_peer_root_from_app(app) {
        return Ok(peer_root.join("app-cache"));
    }

    app.path()
        .app_cache_dir()
        .map_err(|_| "failed to resolve app cache directory".to_string())
}

#[cfg(debug_assertions)]
fn dev_rendezvous_dir() -> Option<std::path::PathBuf> {
    if let Ok(path) = std::env::var("ANOTHER_DIMENSION_DEV_RENDEZVOUS_DIR") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Some(std::path::PathBuf::from(trimmed));
        }
    }
    Some(debug_repo_root_from_current_dir()?.join("another-dimension-dev-rendezvous"))
}

#[cfg(not(debug_assertions))]
fn dev_rendezvous_dir() -> Option<std::path::PathBuf> {
    None
}

#[derive(serde::Deserialize, serde::Serialize)]
struct DevInviteRoomRecord {
    inviter_profile: String,
    peer_profile: String,
    created_at_ms: u128,
    last_seen_at_ms: u128,
    expires_at_ms: u128,
    consumed: bool,
}

#[derive(serde::Serialize)]
struct DevInviteRoomPresenceRefreshResult {
    open: bool,
    expires_at_ms: u128,
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
struct DevInviteRoomMessageRecord {
    sender_profile: String,
    receiver_profile: String,
    message_number: u64,
    message: String,
    created_at_ms: u128,
    ttl_seconds: u64,
    expires_at_ms: Option<u128>,
}

const DEV_INVITE_ROOM_TTL_MS: u128 = 10_000;

fn now_unix_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn invite_token_file_name(token: &str) -> String {
    let mut out = String::with_capacity(token.len() * 2 + 12);
    out.push_str("invite-");
    for byte in token.as_bytes() {
        out.push_str(&format!("{byte:02x}"));
    }
    out.push_str(".json");
    out
}

fn dev_invite_room_record_path(token: &str) -> Option<std::path::PathBuf> {
    dev_rendezvous_dir().map(|dir| dir.join(invite_token_file_name(token)))
}

fn dev_invite_room_messages_path(token: &str, receiver_profile: &str) -> Option<std::path::PathBuf> {
    dev_rendezvous_dir().map(|dir| {
        dir.join(format!(
            "messages-{}-{}.json",
            invite_token_file_name(token)
                .trim_start_matches("invite-")
                .trim_end_matches(".json"),
            invite_token_file_name(receiver_profile)
                .trim_start_matches("invite-")
                .trim_end_matches(".json")
        ))
    })
}

fn write_dev_invite_room_record(token: &str, record: &DevInviteRoomRecord) -> Result<(), String> {
    let Some(path) = dev_invite_room_record_path(token) else {
        return Ok(());
    };
    let parent = path
        .parent()
        .ok_or_else(|| "dev invite rendezvous path invalid".to_string())?;
    std::fs::create_dir_all(parent).map_err(|_| "dev invite rendezvous unavailable".to_string())?;
    let payload = serde_json::to_vec(record)
        .map_err(|_| "dev invite rendezvous record failed".to_string())?;
    std::fs::write(path, payload).map_err(|_| "dev invite rendezvous unavailable".to_string())
}

fn read_dev_invite_room_record(token: &str) -> Result<Option<DevInviteRoomRecord>, String> {
    let Some(path) = dev_invite_room_record_path(token) else {
        return Ok(None);
    };
    if !path.exists() {
        return Ok(None);
    }
    let payload =
        std::fs::read(path).map_err(|_| "dev invite rendezvous unavailable".to_string())?;
    serde_json::from_slice(&payload)
        .map(Some)
        .map_err(|_| "dev invite rendezvous record invalid".to_string())
}

fn dev_invite_room_is_enabled() -> bool {
    dev_rendezvous_dir().is_some()
}

fn production_invite_role(profile: &str) -> &'static str {
    if profile.starts_with("inviter-") {
        "inviter"
    } else {
        "joiner"
    }
}

fn register_dev_invite_room(
    token: &str,
    inviter_profile: &str,
    peer_profile: &str,
) -> Result<(), String> {
    if !dev_invite_room_is_enabled() {
        return Ok(());
    }
    let now = now_unix_ms();
    let existing = read_dev_invite_room_record(token)?;
    write_dev_invite_room_record(
        token,
        &DevInviteRoomRecord {
            inviter_profile: inviter_profile.to_string(),
            peer_profile: peer_profile.to_string(),
            created_at_ms: existing
                .as_ref()
                .map(|record| record.created_at_ms)
                .unwrap_or(now),
            last_seen_at_ms: now,
            expires_at_ms: now + DEV_INVITE_ROOM_TTL_MS,
            consumed: false,
        },
    )
}

fn ensure_dev_invite_room_open(token: &str) -> Result<DevInviteRoomRecord, String> {
    if !dev_invite_room_is_enabled() {
        return Err("invite code cannot be checked because no room rendezvous is running".to_string());
    }
    let record = read_dev_invite_room_record(token)?
        .ok_or_else(|| "invite code is not open; keep the room creator app connected".to_string())?;
    if record.expires_at_ms <= now_unix_ms() {
        return Err("invite code is not open; keep the room creator app connected".to_string());
    }
    Ok(record)
}

fn note_dev_invite_room_join(token: &str, mut record: DevInviteRoomRecord) -> Result<(), String> {
    if !dev_invite_room_is_enabled() {
        return Ok(());
    }
    record.consumed = false;
    record.last_seen_at_ms = now_unix_ms();
    write_dev_invite_room_record(token, &record)
}

fn read_dev_invite_room_messages(
    token: &str,
    receiver_profile: &str,
) -> Result<Vec<DevInviteRoomMessageRecord>, String> {
    let Some(path) = dev_invite_room_messages_path(token, receiver_profile) else {
        return Ok(Vec::new());
    };
    if !path.exists() {
        return Ok(Vec::new());
    }
    let payload =
        std::fs::read(path).map_err(|_| "dev invite message relay unavailable".to_string())?;
    serde_json::from_slice(&payload)
        .map_err(|_| "dev invite message relay record invalid".to_string())
}

fn append_dev_invite_room_message(
    token: &str,
    message: DevInviteRoomMessageRecord,
) -> Result<(), String> {
    let Some(path) = dev_invite_room_messages_path(token, &message.receiver_profile) else {
        return Ok(());
    };
    let parent = path
        .parent()
        .ok_or_else(|| "dev invite message relay path invalid".to_string())?;
    std::fs::create_dir_all(parent)
        .map_err(|_| "dev invite message relay unavailable".to_string())?;
    let mut messages = read_dev_invite_room_messages(token, &message.receiver_profile)?;
    if !messages.iter().any(|existing| {
        existing.sender_profile == message.sender_profile
            && existing.receiver_profile == message.receiver_profile
            && existing.message_number == message.message_number
    }) {
        messages.push(message);
    }
    let payload = serde_json::to_vec(&messages)
        .map_err(|_| "dev invite message relay record failed".to_string())?;
    std::fs::write(path, payload).map_err(|_| "dev invite message relay unavailable".to_string())
}

#[derive(Default)]
struct ProductionOnionClientRuntimeState {
    receive_loop_enabled: std::sync::atomic::AtomicBool,
    receive_loop_stop_requested: std::sync::atomic::AtomicBool,
    receive_loop_attempts: std::sync::atomic::AtomicU64,
    receive_loop_generation: std::sync::atomic::AtomicU64,
    receive_loop_import_sequence: std::sync::atomic::AtomicU64,
    receive_loop_message_imports: std::sync::atomic::AtomicU64,
    receive_loop_endpoint_updates: std::sync::atomic::AtomicU64,
    receive_loop_worker_starts: std::sync::atomic::AtomicU64,
    receive_loop_duplicate_start_blocks: std::sync::atomic::AtomicU64,
    receive_loop_worker_running: std::sync::atomic::AtomicBool,
    receive_loop_last_attempt_started: std::sync::atomic::AtomicBool,
    receive_loop_last_attempt_succeeded: std::sync::atomic::AtomicBool,
    receive_loop_last_endpoint_update_applied: std::sync::atomic::AtomicBool,
    receive_loop_last_network_io_attempted: std::sync::atomic::AtomicBool,
    receive_loop_last_stream_accept_attempted: std::sync::atomic::AtomicBool,
    receive_loop_last_stream_read_write_attempted: std::sync::atomic::AtomicBool,
    receive_loop_last_envelope_io_opened: std::sync::atomic::AtomicBool,
    receive_loop_last_runtime_messaging_enabled: std::sync::atomic::AtomicBool,
    receive_loop_last_next_blocker: std::sync::Mutex<Option<String>>,
    receive_loop_profile: std::sync::Mutex<Option<String>>,
    #[cfg(feature = "manual-onion-client-attempt")]
    owner: std::sync::Mutex<Option<another_dimension_transport::arti_adapter_spike::PersistentArtiClientOwner>>,
    #[cfg(feature = "manual-onion-client-attempt")]
    real_onion_roundtrip_owners: std::sync::Mutex<
        std::collections::HashMap<
            String,
            another_dimension_transport::arti_adapter_spike::PersistentArtiClientOwner,
        >,
    >,
    #[cfg(feature = "manual-onion-client-attempt")]
    bootstrap_in_progress: std::sync::atomic::AtomicBool,
    #[cfg(feature = "manual-onion-client-attempt")]
    send_in_progress: std::sync::atomic::AtomicBool,
    #[cfg(feature = "manual-onion-client-attempt")]
    receive_in_progress: std::sync::atomic::AtomicBool,
    #[cfg(feature = "manual-onion-client-attempt")]
    real_onion_roundtrip_generation: std::sync::atomic::AtomicU64,
    #[cfg(feature = "manual-onion-client-attempt")]
    real_onion_roundtrip_in_progress: std::sync::atomic::AtomicBool,
    #[cfg(feature = "manual-onion-client-attempt")]
    real_onion_roundtrip_cancel_requested: std::sync::atomic::AtomicBool,
}

#[cfg(feature = "manual-onion-client-attempt")]
struct RealOnionRoundtripCancelScope<'a> {
    state: &'a ProductionOnionClientRuntimeState,
    generation: u64,
}

#[cfg(feature = "manual-onion-client-attempt")]
impl RealOnionRoundtripCancelScope<'_> {
    fn is_cancel_requested(&self) -> bool {
        self.state
            .real_onion_roundtrip_generation
            .load(std::sync::atomic::Ordering::SeqCst)
            == self.generation
            && self
                .state
                .real_onion_roundtrip_cancel_requested
                .load(std::sync::atomic::Ordering::SeqCst)
    }
}

#[derive(serde::Serialize)]
pub struct DevLocalDemoTranscript {
    warning: String,
    transcript: String,
    steps: Vec<DevLocalDemoStep>,
    simulation: DevLocalSimulation,
    first_run_hint: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalMessageLoopResult {
    warning: String,
    transcript: String,
    messages: Vec<DevLocalLoopMessage>,
    replay_summary: String,
    expiry_summary: String,
    storage_guard: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalLoopMessage {
    index: usize,
    sent: String,
    received: String,
    replay_check: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalDemoStep {
    label: String,
    status: &'static str,
    detail: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalSimulation {
    peers: Vec<DevLocalPeer>,
    safety_number: String,
    safety_phrase: String,
    message_body: String,
    queued_envelope: String,
    replay_check: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalPeer {
    name: &'static str,
    profile_state: &'static str,
    contact_state: &'static str,
    inbox_state: &'static str,
}

#[derive(serde::Serialize)]
pub struct ProductionLocalRoundtripResult {
    warning: &'static str,
    profile_stores_opened: bool,
    identities_created: bool,
    pairing_payloads_created: bool,
    session_drafts_written: bool,
    transport_state_persisted: bool,
    outbound_message_prepared: bool,
    encrypted_envelope_exported: bool,
    inbound_message_stored: bool,
    received_status_verified: bool,
    received_export_matches_input: bool,
    plaintext_returned_to_frontend: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionTwoProfileRoundtripResult {
    warning: &'static str,
    sender_profile: String,
    receiver_profile: String,
    message_number: u64,
    message_ttl_seconds: u64,
    safety_number: String,
    safety_phrase: String,
    safety_confirmed: bool,
    profile_a_unlocked: bool,
    profile_b_unlocked: bool,
    pairing_payloads_exported: bool,
    session_drafts_saved: bool,
    handshake_completed: bool,
    sender_session_ready: bool,
    receiver_session_ready: bool,
    message_number_reserved: bool,
    encrypted_envelope_exported: bool,
    inbound_message_stored: bool,
    received_status_verified: bool,
    received_export_matches_input: bool,
    plaintext_returned_to_frontend: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionTwoProfileRoomSetupResult {
    warning: &'static str,
    profile_a: String,
    profile_b: String,
    safety_number: String,
    safety_phrase: String,
    safety_confirmed: bool,
    profile_a_unlocked: bool,
    profile_b_unlocked: bool,
    pairing_payloads_exported: bool,
    session_drafts_saved: bool,
    handshake_completed: bool,
    profile_a_ready_for_message_envelope: bool,
    profile_b_ready_for_message_envelope: bool,
    both_ready_for_message_envelope: bool,
    plaintext_returned_to_frontend: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionTwoProfileMessageRoundtripResult {
    warning: &'static str,
    sender_profile: String,
    receiver_profile: String,
    message_number: u64,
    message_ttl_seconds: u64,
    sender_session_ready: bool,
    receiver_session_ready: bool,
    message_number_reserved: bool,
    encrypted_envelope_exported: bool,
    inbound_message_stored: bool,
    received_status_verified: bool,
    received_export_matches_input: bool,
    plaintext_returned_to_frontend: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionTwoProfileRealOnionRoundtripResult {
    warning: &'static str,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    sender_profile: String,
    receiver_profile: String,
    message_number: u64,
    second_message_number: u64,
    message_ttl_seconds: u64,
    profile_a_unlocked: bool,
    profile_b_unlocked: bool,
    bootstrap_retry_limit: u8,
    profile_a_bootstrap_attempts: u8,
    profile_b_bootstrap_attempts: u8,
    profile_a_bootstrap_reused: bool,
    profile_b_bootstrap_reused: bool,
    profile_a_client_bootstrapped: bool,
    profile_b_client_bootstrapped: bool,
    profile_a_onion_service_launched: bool,
    profile_b_onion_service_launched: bool,
    profile_a_endpoint_ready: bool,
    profile_b_endpoint_ready: bool,
    pairing_payloads_exported: bool,
    session_drafts_saved: bool,
    handshake_completed: bool,
    sender_session_ready: bool,
    receiver_session_ready: bool,
    message_number_reserved: bool,
    second_message_number_reserved: bool,
    encrypted_envelope_exported: bool,
    second_encrypted_envelope_exported: bool,
    send_attempt_started: bool,
    send_attempt_succeeded: bool,
    second_send_attempt_succeeded: bool,
    receive_attempt_started: bool,
    receive_attempt_succeeded: bool,
    second_receive_attempt_succeeded: bool,
    inbound_message_stored: bool,
    second_inbound_message_stored: bool,
    consecutive_receive_attempts: u64,
    consecutive_messages_imported: u64,
    receive_mode_runtime_state: &'static str,
    receive_mode_runtime_label: &'static str,
    receive_mode_attempt_count: u64,
    receive_mode_import_sequence: u64,
    receive_mode_message_import_count: u64,
    receive_mode_endpoint_update_count: u64,
    receive_mode_last_network_io_attempted: bool,
    receive_mode_last_stream_accept_attempted: bool,
    receive_mode_last_stream_read_write_attempted: bool,
    receive_mode_last_envelope_io_opened: bool,
    receive_mode_last_runtime_messaging_enabled: bool,
    receive_mode_recorder_verified: bool,
    received_status_verified: bool,
    received_export_matches_input: bool,
    second_received_status_verified: bool,
    second_received_export_matches_input: bool,
    event_summary: Vec<String>,
    next_blocker: String,
    blockers: Vec<String>,
    local_endpoint_returned: bool,
    peer_endpoint_returned: bool,
    envelope_payload_returned: bool,
    plaintext_returned_to_frontend: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionProfileUnlockResult {
    warning: &'static str,
    storage_opened: bool,
    app_data_profile_store: bool,
    profile_initialized: bool,
    profile_marker_present: bool,
    identity_created: bool,
    identity_private_key_present: bool,
    identity_public_key_derivable: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionProfileListResult {
    warning: &'static str,
    profiles: Vec<String>,
    profile_count: usize,
    app_data_profile_store: bool,
    store_path_returned: bool,
    passphrase_required: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionPairingPayloadExportResult {
    warning: &'static str,
    storage_opened: bool,
    identity_private_key_loaded: bool,
    noise_static_private_key_written: bool,
    pairing_payload_exported: bool,
    pairing_payload: String,
    payload_format: &'static str,
    store_path_returned: bool,
    passphrase_retained: bool,
    private_key_material_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionPairingSafetyPreviewResult {
    warning: &'static str,
    payloads_decodable: bool,
    safety_transcript_bound: bool,
    safety_number: String,
    safety_phrase: String,
    safety_confirmed: bool,
    payloads_returned: bool,
    safety_transcript_returned: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionPairingSessionDraftResult {
    warning: &'static str,
    storage_opened: bool,
    session_plan_created: bool,
    local_noise_static_private_key_loaded: bool,
    local_noise_static_matches_payload: bool,
    session_draft_written: bool,
    remote_endpoint_state_written: bool,
    replay_window_written: bool,
    channel_id_derivable: bool,
    session_draft_present: bool,
    remote_contact_present: bool,
    remote_endpoint_state_present: bool,
    replay_window_present: bool,
    payloads_returned: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionSessionStateCheckResult {
    warning: &'static str,
    storage_opened: bool,
    session_draft_present: bool,
    channel_id_derivable: bool,
    local_role_available: bool,
    remote_contact_present: bool,
    remote_endpoint_state_present: bool,
    remote_endpoint_marked_stale: bool,
    remote_endpoint_refresh_recommended: bool,
    remote_endpoint_last_failed_message_number: Option<u64>,
    replay_window_present: bool,
    session_transport_state_present: bool,
    runtime_material_reconstructable: bool,
    outbound_envelope_io_ready: bool,
    ready_for_message_envelope: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionPairingSessionRemoteEndpointUpdateResult {
    warning: &'static str,
    storage_opened: bool,
    session_draft_loaded: bool,
    previous_remote_endpoint_present: bool,
    update_channel_existing_encrypted_session: bool,
    remote_endpoint_changed: bool,
    remote_endpoint_state_written: bool,
    runtime_material_reconstructable: bool,
    remote_endpoint_returned: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionTwoProfileSessionStatusResult {
    warning: &'static str,
    profile_a: String,
    profile_b: String,
    profile_a_ready_for_message_envelope: bool,
    profile_b_ready_for_message_envelope: bool,
    both_ready_for_message_envelope: bool,
    profile_a_remote_endpoint_state_present: bool,
    profile_b_remote_endpoint_state_present: bool,
    profile_a_remote_endpoint_invite_placeholder: bool,
    profile_b_remote_endpoint_invite_placeholder: bool,
    profile_a_remote_endpoint_marked_stale: bool,
    profile_b_remote_endpoint_marked_stale: bool,
    profile_a_remote_endpoint_refresh_recommended: bool,
    profile_b_remote_endpoint_refresh_recommended: bool,
    profile_a_remote_endpoint_last_failed_message_number: Option<u64>,
    profile_b_remote_endpoint_last_failed_message_number: Option<u64>,
    profile_a_session_transport_state_present: bool,
    profile_b_session_transport_state_present: bool,
    profile_a_runtime_material_reconstructable: bool,
    profile_b_runtime_material_reconstructable: bool,
    profile_a_outbound_envelope_io_ready: bool,
    profile_b_outbound_envelope_io_ready: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionHandshakePayloadResult {
    warning: &'static str,
    storage_opened: bool,
    session_draft_loaded: bool,
    local_noise_static_private_key_loaded: bool,
    local_noise_static_matches_draft: bool,
    safety_transcript_loaded: bool,
    role_allowed: bool,
    input_payload_read: bool,
    input_payload_decodable: bool,
    output_payload_created: bool,
    output_payload: String,
    output_payload_format: &'static str,
    state_written: bool,
    transport_state_persisted: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionHandshakeFinishImportResult {
    warning: &'static str,
    storage_opened: bool,
    session_draft_loaded: bool,
    local_noise_static_private_key_loaded: bool,
    local_noise_static_matches_draft: bool,
    safety_transcript_loaded: bool,
    role_allowed: bool,
    finish_payload_read: bool,
    finish_payload_decodable: bool,
    remote_static_verified: bool,
    transport_state_created: bool,
    transport_state_persisted: bool,
    payloads_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageEnvelopeExportResult {
    warning: &'static str,
    selected_message_number: u64,
    message_ttl_seconds: u64,
    auto_message_number: bool,
    auto_counter_written: bool,
    existing_message_slot_skipped: bool,
    expired_outbound_messages_purged: usize,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    outbound_envelope_io_ready: bool,
    plaintext_accepted: bool,
    message_number_reserved: bool,
    local_message_index_written: bool,
    pending_message_record_written: bool,
    pending_message_record_present: bool,
    local_message_index_matches_pending: bool,
    session_transport_ready: bool,
    envelope_encryption_ready: bool,
    encrypted_envelope_written: bool,
    encrypted_envelope_present: bool,
    envelope_decodable: bool,
    envelope_message_number_matches: bool,
    envelope_payload: String,
    plaintext_returned: bool,
    key_material_exposed: bool,
    network_send_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageEnvelopeImportResult {
    warning: &'static str,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    envelope_read: bool,
    envelope_decodable: bool,
    session_transport_ready: bool,
    replay_window_loaded: bool,
    replay_accepted: bool,
    plaintext_decrypted: bool,
    plaintext_returned: bool,
    received_message_written: bool,
    replay_window_committed: bool,
    received_message_record_present: bool,
    received_message_record_decodable: bool,
    received_message_matches_session: bool,
    expired_received_message_purged: bool,
    key_material_exposed: bool,
    network_receive_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionEndpointUpdateControlEnvelopeExportResult {
    warning: &'static str,
    selected_message_number: u64,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    session_transport_ready: bool,
    endpoint_update_created: bool,
    encrypted_control_envelope_written: bool,
    envelope_decodable: bool,
    envelope_message_number_matches: bool,
    envelope_message_type_control: bool,
    envelope_payload: String,
    endpoint_payload_returned: bool,
    endpoint_plaintext_exposed: bool,
    key_material_exposed: bool,
    network_send_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionEndpointUpdateControlEnvelopeImportResult {
    warning: &'static str,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    envelope_read: bool,
    envelope_decodable: bool,
    envelope_message_type_control: bool,
    session_transport_ready: bool,
    replay_window_loaded: bool,
    replay_accepted: bool,
    control_plaintext_decrypted: bool,
    endpoint_update_applied: bool,
    remote_endpoint_state_written: bool,
    stale_endpoint_status_cleared: bool,
    endpoint_payload_returned: bool,
    endpoint_plaintext_exposed: bool,
    key_material_exposed: bool,
    network_receive_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageReceivedExportResult {
    warning: &'static str,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    received_message_record_present: bool,
    received_message_record_decodable: bool,
    received_message_matches_session: bool,
    expired_received_message_purged: bool,
    received_message: String,
    created_at_ms: u128,
    message_ttl_seconds: u64,
    expires_at_ms: Option<u128>,
    expired: bool,
    plaintext_returned_after_unlock: bool,
    key_material_exposed: bool,
    network_receive_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
pub struct ProductionMessageTranscriptEntryResult {
    direction: String,
    message_number: u64,
    message: String,
    created_at_ms: u128,
    ttl_seconds: u64,
    expires_at_ms: Option<u128>,
    expired: bool,
    outbound_delivery_state: Option<String>,
    outbound_failure_kind: Option<String>,
    outbound_retryable: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageTranscriptExportResult {
    warning: &'static str,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    entries: Vec<ProductionMessageTranscriptEntryResult>,
    transcript_tsv: String,
    expired_messages_purged: usize,
    plaintext_returned_after_unlock: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageRetentionPreferenceResult {
    warning: &'static str,
    storage_opened: bool,
    profile_marker_present: bool,
    preference_present: bool,
    message_ttl_seconds: u64,
    preference_written: bool,
    key_material_exposed: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageRetentionPolicyResult {
    default_ttl_seconds: u64,
    allowed_ttl_seconds: Vec<u64>,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionPreflightCheckResult {
    warning: &'static str,
    preflight_only: bool,
    ready_for_runtime_bootstrap: bool,
    ready_for_onion_launch: bool,
    state_cache_dirs_accessible: bool,
    backup_exclusion_verified: bool,
    log_redaction_ready: bool,
    crash_redaction_ready: bool,
    bridge_or_censorship_ready: bool,
    manual_network_action: bool,
    blockers: Vec<String>,
    event_summary: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionBackupExclusionPrepareResult {
    warning: &'static str,
    state_cache_dirs_accessible: bool,
    backup_exclusion_written: bool,
    backup_exclusion_verified: bool,
    blockers: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionKeyRecordPrepareResult {
    warning: &'static str,
    storage_opened: bool,
    profile_marker_present: bool,
    profile_transport_unlock_ready: bool,
    backup_exclusion_verified: bool,
    lifecycle_ready: bool,
    key_record_written: bool,
    key_record_present: bool,
    key_material_ready: bool,
    blockers: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionBootstrapPreflightCheckResult {
    warning: &'static str,
    bootstrap_preflight_only: bool,
    state_cache_dirs_accessible: bool,
    backup_exclusion_verified: bool,
    runtime_preflight_ready: bool,
    bootstrap_policy_ready: bool,
    timeout_seconds: u16,
    retry_max_attempts: u8,
    retry_initial_backoff_ms: u32,
    retry_max_backoff_ms: u32,
    silent_retry_allowed: bool,
    censorship_classification_ready: bool,
    persistent_client_ready: bool,
    manual_bootstrap_attempt_enabled: bool,
    next_blocker: String,
    blockers: Vec<String>,
    event_summary: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionClientAttemptGateResult {
    warning: &'static str,
    attempt_gate_only: bool,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    client_attempt_started: bool,
    persistent_client_ready: bool,
    runtime_preflight_ready: bool,
    bootstrap_policy_ready: bool,
    lifecycle_state: String,
    next_blocker: String,
    blockers: Vec<String>,
    event_summary: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionClientBootstrapOnceResult {
    warning: &'static str,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    client_attempt_started: bool,
    client_bootstrap_succeeded: bool,
    persistent_client_ready: bool,
    runtime_preflight_ready: bool,
    bootstrap_policy_ready: bool,
    lifecycle_state: String,
    next_blocker: String,
    blockers: Vec<String>,
    event_summary: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionPersistentClientStatusResult {
    warning: &'static str,
    manual_client_attempt_feature_compiled: bool,
    persistent_client_ready: bool,
    lifecycle_state: String,
    timeout_seconds: u16,
    bootstrap_in_progress: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionPersistentClientStartResult {
    warning: &'static str,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    client_bootstrap_started: bool,
    client_bootstrap_succeeded: bool,
    persistent_client_ready: bool,
    runtime_preflight_ready: bool,
    bootstrap_policy_ready: bool,
    lifecycle_state: String,
    timeout_seconds: u16,
    next_blocker: String,
    blockers: Vec<String>,
    event_summary: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionLaunchPreflightCheckResult {
    warning: &'static str,
    launch_preflight_only: bool,
    profile_transport_unlock_ready: bool,
    backup_exclusion_verified: bool,
    key_record_present: bool,
    key_material_ready: bool,
    persistent_client_ready: bool,
    endpoint_publication_policy_ready: bool,
    endpoint_update_policy_ready: bool,
    redacted_events_only: bool,
    ready_for_onion_launch: bool,
    next_blocker: String,
    blockers: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionServiceLaunchAttemptResult {
    warning: &'static str,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    profile_transport_unlock_ready: bool,
    backup_exclusion_verified: bool,
    key_record_present: bool,
    key_material_ready: bool,
    persistent_client_ready: bool,
    launch_preflight_ready: bool,
    launch_adapter_ready: bool,
    launch_attempt_started: bool,
    launch_attempt_succeeded: bool,
    onion_service_retained: bool,
    inbound_rend_request_stream_retained: bool,
    local_onion_endpoint: String,
    onion_endpoint_returned: bool,
    redacted_launch_result_event_recorded: bool,
    event_summary: Vec<String>,
    next_blocker: String,
    blockers: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    descriptor_body_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    descriptor_publish_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionDescriptorPublicationPrepareResult {
    warning: &'static str,
    preparation_only: bool,
    manual_client_attempt_feature_compiled: bool,
    profile_transport_unlock_ready: bool,
    key_material_ready: bool,
    persistent_client_ready: bool,
    launch_preflight_ready: bool,
    onion_hosting_gate_ready: bool,
    descriptor_publication_gate_ready: bool,
    fail_closed_adapter_ready: bool,
    redacted_context_ready: bool,
    descriptor_preparation_ready: bool,
    endpoint_publication_policy_ready: bool,
    next_blocker: String,
    blockers: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    descriptor_body_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    descriptor_publish_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionDescriptorPublicationAttemptResult {
    warning: &'static str,
    preparation_only: bool,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    persistent_client_ready: bool,
    launch_preflight_ready: bool,
    descriptor_publication_gate_ready: bool,
    descriptor_preparation_ready: bool,
    publish_attempt_started: bool,
    publish_attempt_succeeded: bool,
    redacted_publish_result_event_recorded: bool,
    event_summary: Vec<String>,
    next_blocker: String,
    blockers: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    descriptor_body_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    descriptor_publish_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionInboundStreamPrepareResult {
    warning: &'static str,
    preparation_only: bool,
    manual_client_attempt_feature_compiled: bool,
    persistent_client_ready: bool,
    launch_preflight_ready: bool,
    descriptor_publication_gate_ready: bool,
    descriptor_preparation_ready: bool,
    inbound_stream_gate_ready: bool,
    fail_closed_adapter_ready: bool,
    inbound_stream_preparation_ready: bool,
    next_blocker: String,
    blockers: Vec<String>,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    descriptor_body_returned: bool,
    stream_id_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    descriptor_publish_attempted: bool,
    stream_accept_attempted: bool,
    stream_read_write_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionInboundEnvelopeReceiveAttemptResult {
    warning: &'static str,
    preparation_only: bool,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    persistent_client_ready: bool,
    persistent_client_promoted_from_real_onion_cache: bool,
    inbound_stream_preparation_ready: bool,
    inbound_rend_request_stream_ready: bool,
    inbound_rend_request_accept_attempted: bool,
    inbound_rend_request_accepted: bool,
    accepted_stream_request_stream_ready: bool,
    stream_request_accept_attempted: bool,
    stream_request_accepted: bool,
    stream_read_attempted: bool,
    stream_bytes_read: bool,
    receive_attempt_started: bool,
    receive_attempt_succeeded: bool,
    received_envelope_ready: bool,
    inbound_import_attempted: bool,
    control_envelope_imported: bool,
    endpoint_update_applied: bool,
    stale_endpoint_status_cleared: bool,
    redacted_receive_result_event_recorded: bool,
    event_summary: Vec<String>,
    next_blocker: String,
    blockers: Vec<String>,
    raw_endpoint_returned: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    descriptor_body_returned: bool,
    stream_id_returned: bool,
    envelope_payload_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    descriptor_publish_attempted: bool,
    stream_accept_attempted: bool,
    stream_read_write_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionReceiveLoopStatusResult {
    warning: &'static str,
    enabled: bool,
    stop_requested: bool,
    profile_selected: bool,
    worker_running: bool,
    stop_confirmed: bool,
    receive_attempt_in_flight: bool,
    attempt_count: u64,
    generation: u64,
    worker_start_count: u64,
    duplicate_start_block_count: u64,
    import_sequence: u64,
    message_import_count: u64,
    endpoint_update_count: u64,
    active_after_import: bool,
    continues_after_import: bool,
    multi_message_receive_ready: bool,
    restart_generation_isolated: bool,
    retry_wait_cancellable: bool,
    runtime_state: &'static str,
    runtime_label: &'static str,
    last_attempt_started: bool,
    last_attempt_succeeded: bool,
    last_endpoint_update_applied: bool,
    last_network_io_attempted: bool,
    last_stream_accept_attempted: bool,
    last_stream_read_write_attempted: bool,
    last_envelope_io_opened: bool,
    last_runtime_messaging_enabled: bool,
    last_next_blocker: Option<String>,
    last_failure_kind: &'static str,
    last_failure_retryable: bool,
    duplicate_loop_blocked: bool,
    explicit_user_start_required: bool,
    starts_network_on_app_launch: bool,
    raw_profile_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionOutboundStreamPrepareResult {
    warning: &'static str,
    preparation_only: bool,
    endpoint_accepted: bool,
    pairwise_endpoint_ready: bool,
    high_risk_onion_policy_ready: bool,
    outbound_stream_gate_ready: bool,
    fail_closed_adapter_ready: bool,
    outbound_stream_preparation_ready: bool,
    next_blocker: String,
    blockers: Vec<String>,
    raw_endpoint_returned: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    stream_id_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    stream_dial_attempted: bool,
    stream_send_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionStreamAdapterCloseoutPrepareResult {
    warning: &'static str,
    preparation_only: bool,
    manual_client_attempt_feature_compiled: bool,
    persistent_client_ready: bool,
    inbound_stream_preparation_ready: bool,
    outbound_stream_preparation_ready: bool,
    stream_adapter_closeout_ready: bool,
    remote_peer_authentication_next: bool,
    verified_pairwise_session_after_remote_authentication: bool,
    next_blocker: String,
    blockers: Vec<String>,
    raw_endpoint_returned: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    descriptor_body_returned: bool,
    stream_id_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    descriptor_publish_attempted: bool,
    stream_accept_attempted: bool,
    stream_dial_attempted: bool,
    stream_read_write_attempted: bool,
    stream_send_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionRemotePeerAuthenticationPrepareResult {
    warning: &'static str,
    preparation_only: bool,
    stream_adapter_closeout_ready: bool,
    remote_peer_authentication_required: bool,
    stored_pairwise_session_ready: bool,
    remote_peer_authentication_ready: bool,
    verified_pairwise_session_binding_ready: bool,
    bound_stream_session_ready: bool,
    outbound_envelope_io_boundary_ready: bool,
    next_blocker: String,
    blockers: Vec<String>,
    raw_endpoint_returned: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    peer_proof_returned: bool,
    session_transcript_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    stream_accept_attempted: bool,
    stream_dial_attempted: bool,
    stream_read_write_attempted: bool,
    stream_send_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionOutboundEnvelopeSendPrepareResult {
    warning: &'static str,
    preparation_only: bool,
    remote_peer_authentication_ready: bool,
    bound_stream_session_ready: bool,
    outbound_envelope_io_boundary_ready: bool,
    stored_outbound_envelope_ready: bool,
    envelope_decodable: bool,
    envelope_message_number_matches: bool,
    send_intent_prepared: bool,
    ack_wait_registered: bool,
    redacted_send_result_event_recorded: bool,
    event_summary: Vec<String>,
    next_blocker: String,
    blockers: Vec<String>,
    raw_endpoint_returned: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    peer_proof_returned: bool,
    session_transcript_returned: bool,
    envelope_payload_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    stream_accept_attempted: bool,
    stream_dial_attempted: bool,
    stream_read_write_attempted: bool,
    stream_send_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionEndpointUpdateControlSendAttemptResult {
    warning: &'static str,
    preparation_only: bool,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    persistent_client_ready: bool,
    persistent_client_promoted_from_real_onion_cache: bool,
    endpoint_update_created: bool,
    encrypted_control_envelope_written: bool,
    send_intent_prepared: bool,
    send_attempt_started: bool,
    send_attempt_succeeded: bool,
    peer_endpoint_failure_recorded: bool,
    peer_endpoint_refresh_recommended: bool,
    retry_recommended_after_endpoint_refresh: bool,
    redacted_send_result_event_recorded: bool,
    event_summary: Vec<String>,
    next_blocker: String,
    blockers: Vec<String>,
    raw_endpoint_returned: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    peer_proof_returned: bool,
    session_transcript_returned: bool,
    envelope_payload_returned: bool,
    endpoint_plaintext_exposed: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    stream_accept_attempted: bool,
    stream_dial_attempted: bool,
    stream_read_write_attempted: bool,
    stream_send_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionOnionOutboundEnvelopeSendAttemptResult {
    warning: &'static str,
    preparation_only: bool,
    manual_client_attempt_feature_compiled: bool,
    manual_network_permission_enabled: bool,
    persistent_client_ready: bool,
    persistent_client_promoted_from_real_onion_cache: bool,
    send_intent_prepared: bool,
    send_attempt_started: bool,
    send_attempt_succeeded: bool,
    peer_endpoint_failure_recorded: bool,
    peer_endpoint_refresh_recommended: bool,
    retry_recommended_after_endpoint_refresh: bool,
    ack_wait_registered: bool,
    redacted_send_result_event_recorded: bool,
    event_summary: Vec<String>,
    next_blocker: String,
    blockers: Vec<String>,
    raw_endpoint_returned: bool,
    raw_path_returned: bool,
    onion_secret_returned: bool,
    peer_proof_returned: bool,
    session_transcript_returned: bool,
    envelope_payload_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    stream_accept_attempted: bool,
    stream_dial_attempted: bool,
    stream_read_write_attempted: bool,
    stream_send_attempted: bool,
    envelope_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[tauri::command]
fn prototype_status() -> PrototypeStatus {
    status::redacted_prototype_status()
}

#[tauri::command]
fn production_message_retention_policy() -> ProductionMessageRetentionPolicyResult {
    ProductionMessageRetentionPolicyResult {
        default_ttl_seconds: another_dimension_core::production::PRODUCTION_DEFAULT_MESSAGE_TTL_SECONDS,
        allowed_ttl_seconds: another_dimension_core::production::PRODUCTION_ALLOWED_MESSAGE_TTL_SECONDS
            .to_vec(),
    }
}

#[tauri::command]
fn production_onion_backup_exclusion_prepare(
    app: tauri::AppHandle,
) -> Result<ProductionOnionBackupExclusionPrepareResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion backup exclusion prepare failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion backup exclusion prepare failed without exposing local path details"
    })?;
    Ok(run_production_onion_backup_exclusion_prepare(
        app_data_root,
        app_cache_root,
    ))
}

#[tauri::command]
fn production_onion_preflight_check(
    app: tauri::AppHandle,
) -> Result<ProductionOnionPreflightCheckResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production onion preflight failed without exposing local path details")?;
    let app_cache_root = production_app_cache_dir(&app)
        .map_err(|_| "production onion preflight failed without exposing local path details")?;
    Ok(run_production_onion_preflight_check(
        app_data_root,
        app_cache_root,
    ))
}

#[tauri::command]
fn production_onion_bootstrap_preflight_check(
    app: tauri::AppHandle,
) -> Result<ProductionOnionBootstrapPreflightCheckResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production onion bootstrap preflight failed without exposing local path details")?;
    let app_cache_root = production_app_cache_dir(&app)
        .map_err(|_| "production onion bootstrap preflight failed without exposing local path details")?;
    Ok(run_production_onion_bootstrap_preflight_check(
        app_data_root,
        app_cache_root,
    ))
}

#[tauri::command]
async fn production_onion_client_bootstrap_once(
    app: tauri::AppHandle,
    manual_network_permission: bool,
) -> Result<ProductionOnionClientBootstrapOnceResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production onion client attempt failed without exposing local path details")?;
    let app_cache_root = production_app_cache_dir(&app)
        .map_err(|_| "production onion client attempt failed without exposing local path details")?;
    Ok(run_production_onion_client_bootstrap_once(
        app_data_root,
        app_cache_root,
        manual_network_permission,
    )
    .await)
}

#[tauri::command]
fn production_onion_persistent_client_status(
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
) -> Result<ProductionOnionPersistentClientStatusResult, String> {
    Ok(run_production_onion_persistent_client_status(&state))
}

#[tauri::command]
async fn production_onion_persistent_client_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    manual_network_permission: bool,
) -> Result<ProductionOnionPersistentClientStartResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion persistent client start failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion persistent client start failed without exposing local path details"
    })?;
    Ok(run_production_onion_persistent_client_start(
        app_data_root,
        app_cache_root,
        &state,
        manual_network_permission,
    )
    .await)
}

#[tauri::command]
async fn production_onion_client_attempt_gate_check(
    app: tauri::AppHandle,
) -> Result<ProductionOnionClientAttemptGateResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion client attempt gate failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion client attempt gate failed without exposing local path details"
    })?;
    Ok(run_production_onion_client_attempt_gate_check(
        app_data_root,
        app_cache_root,
    )
    .await)
}

#[tauri::command]
fn production_onion_launch_preflight_check(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
) -> Result<ProductionOnionLaunchPreflightCheckResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production onion launch preflight failed without exposing local path details")?;
    let app_cache_root = production_app_cache_dir(&app)
        .map_err(|_| "production onion launch preflight failed without exposing local path details")?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)?;
    run_production_onion_launch_preflight_check_with_persistent_client(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        persistent_client_ready,
    )
    .map_err(|_| {
            "production onion launch preflight failed without exposing profile, path, or key details"
                .to_string()
	    })
}

#[tauri::command]
fn production_onion_service_launch_attempt(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionServiceLaunchAttemptResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production onion service launch failed without exposing local path details")?;
    let app_cache_root = production_app_cache_dir(&app)
        .map_err(|_| "production onion service launch failed without exposing local path details")?;
    run_production_onion_service_launch_attempt(
        app_data_root,
        app_cache_root,
        &state,
        profile,
        passphrase,
        manual_network_permission,
    )
    .map_err(|_| {
        "production onion service launch failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_onion_descriptor_publication_prepare(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
) -> Result<ProductionOnionDescriptorPublicationPrepareResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion descriptor publication prepare failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion descriptor publication prepare failed without exposing local path details"
    })?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)?;
    run_production_onion_descriptor_publication_prepare(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        persistent_client_ready,
    )
    .map_err(|_| {
        "production onion descriptor publication prepare failed without exposing profile, path, or key details"
            .to_string()
	    })
}

#[tauri::command]
fn production_onion_descriptor_publication_attempt(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionDescriptorPublicationAttemptResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion descriptor publication attempt failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion descriptor publication attempt failed without exposing local path details"
    })?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)?;
    run_production_onion_descriptor_publication_attempt(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        persistent_client_ready,
        manual_network_permission,
    )
    .map_err(|_| {
        "production onion descriptor publication attempt failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_onion_inbound_stream_prepare(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
) -> Result<ProductionOnionInboundStreamPrepareResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion inbound stream prepare failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion inbound stream prepare failed without exposing local path details"
    })?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)?;
    run_production_onion_inbound_stream_prepare(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        persistent_client_ready,
    )
    .map_err(|_| {
        "production onion inbound stream prepare failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_onion_receive_loop_status(
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
) -> Result<ProductionOnionReceiveLoopStatusResult, String> {
    Ok(run_production_onion_receive_loop_status(&state, false))
}

#[tauri::command]
async fn production_onion_receive_loop_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionReceiveLoopStatusResult, String> {
    let profile = sanitize_production_profile(profile)?;
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion receive loop start failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion receive loop start failed without exposing local path details"
    })?;
    #[cfg(feature = "manual-onion-client-attempt")]
    let _promoted_cached_owner = if manual_network_permission {
        promote_cached_real_onion_roundtrip_owner_to_persistent_owner(
            &state,
            &app_data_root,
            &app_cache_root,
            profile.as_str(),
        )
    } else {
        false
    };
    let started = run_production_onion_receive_loop_start(
        &state,
        profile.as_str().to_string(),
        manual_network_permission,
    );
    if started.enabled && !started.duplicate_loop_blocked {
        let worker = run_production_onion_receive_loop_worker_started(&state);
        spawn_production_onion_receive_loop_worker(
            app,
            app_data_root,
            app_cache_root,
            profile.as_str().to_string(),
            passphrase,
        );
        Ok(worker)
    } else {
        Ok(started)
    }
}

#[tauri::command]
fn production_onion_receive_loop_stop(
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
) -> Result<ProductionOnionReceiveLoopStatusResult, String> {
    Ok(run_production_onion_receive_loop_stop(&state))
}

#[tauri::command]
async fn production_onion_inbound_envelope_receive_attempt(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionInboundEnvelopeReceiveAttemptResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion inbound envelope receive attempt failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion inbound envelope receive attempt failed without exposing local path details"
    })?;
    run_production_onion_inbound_envelope_receive_attempt(
        app_data_root,
        app_cache_root,
        &state,
        profile,
        passphrase,
        manual_network_permission,
    )
    .await
    .map_err(|_| {
        "production onion inbound envelope receive attempt failed without exposing profile, endpoint, payload, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_onion_outbound_stream_prepare(
    rendezvous_endpoint: String,
) -> Result<ProductionOnionOutboundStreamPrepareResult, String> {
    run_production_onion_outbound_stream_prepare(rendezvous_endpoint).map_err(|_| {
        "production onion outbound stream prepare failed without exposing endpoint details"
            .to_string()
    })
}

#[tauri::command]
fn production_onion_stream_adapter_closeout_prepare(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionOnionStreamAdapterCloseoutPrepareResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion stream adapter closeout prepare failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion stream adapter closeout prepare failed without exposing local path details"
    })?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)?;
    run_production_onion_stream_adapter_closeout_prepare(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        rendezvous_endpoint,
        persistent_client_ready,
    )
    .map_err(|_| {
        "production onion stream adapter closeout prepare failed without exposing profile, endpoint, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_onion_remote_peer_authentication_prepare(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionOnionRemotePeerAuthenticationPrepareResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion remote peer authentication prepare failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion remote peer authentication prepare failed without exposing local path details"
    })?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)?;
    run_production_onion_remote_peer_authentication_prepare(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        rendezvous_endpoint,
        persistent_client_ready,
    )
    .map_err(|_| {
        "production onion remote peer authentication prepare failed without exposing profile, endpoint, path, proof, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_onion_outbound_envelope_send_prepare(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
    message_number: u64,
) -> Result<ProductionOnionOutboundEnvelopeSendPrepareResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion outbound envelope send prepare failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion outbound envelope send prepare failed without exposing local path details"
    })?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)?;
    run_production_onion_outbound_envelope_send_prepare(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        rendezvous_endpoint,
        message_number,
        persistent_client_ready,
    )
    .map_err(|_| {
        "production onion outbound envelope send prepare failed without exposing profile, endpoint, payload, path, proof, or key details"
            .to_string()
    })
}

#[tauri::command]
async fn production_onion_outbound_envelope_send_attempt(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
    message_number: u64,
    manual_network_permission: bool,
) -> Result<ProductionOnionOutboundEnvelopeSendAttemptResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion outbound envelope send attempt failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion outbound envelope send attempt failed without exposing local path details"
    })?;
    let mut result = run_production_onion_outbound_envelope_send_attempt(
        &app_data_root,
        app_cache_root,
        &state,
        profile.clone(),
        passphrase.clone(),
        rendezvous_endpoint,
        message_number,
        manual_network_permission,
    )
    .await
    .map_err(|_| {
        "production onion outbound envelope send attempt failed without exposing profile, endpoint, payload, path, proof, or key details"
            .to_string()
    })?;
    apply_peer_endpoint_send_failure_result(
        &mut result,
        &app_data_root,
        profile.clone(),
        passphrase.clone(),
        message_number,
    );
    apply_outbound_message_send_attempt_result(
        &app_data_root,
        profile,
        passphrase,
        message_number,
        &result,
    );
    Ok(result)
}

#[tauri::command]
async fn production_onion_outbound_envelope_send_stored_endpoint_attempt(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    message_number: u64,
    manual_network_permission: bool,
) -> Result<ProductionOnionOutboundEnvelopeSendAttemptResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion outbound envelope send stored-endpoint attempt failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion outbound envelope send stored-endpoint attempt failed without exposing local path details"
    })?;
    let persistent_client_ready = run_production_onion_persistent_client_ready(&state)
        .unwrap_or(false);
    let rendezvous_endpoint = match run_production_pairing_session_remote_endpoint_for_transport(
        &app_data_root,
        profile.clone(),
        passphrase.clone(),
    ) {
        Ok(endpoint) => endpoint,
        Err(error) => {
            let result = stored_endpoint_unavailable_outbound_send_result(
                error,
                manual_network_permission,
                persistent_client_ready,
            );
            apply_outbound_message_send_attempt_result(
                &app_data_root,
                profile,
                passphrase,
                message_number,
                &result,
            );
            return Ok(result);
        }
    };
    let mut result = run_production_onion_outbound_envelope_send_attempt(
        &app_data_root,
        app_cache_root,
        &state,
        profile.clone(),
        passphrase.clone(),
        rendezvous_endpoint,
        message_number,
        manual_network_permission,
    )
    .await
    .map_err(|_| {
        "production onion outbound envelope send stored-endpoint attempt failed without exposing profile, endpoint, payload, path, proof, or key details"
            .to_string()
    })?;
    apply_peer_endpoint_send_failure_result(
        &mut result,
        &app_data_root,
        profile.clone(),
        passphrase.clone(),
        message_number,
    );
    apply_outbound_message_send_attempt_result(
        &app_data_root,
        profile,
        passphrase,
        message_number,
        &result,
    );
    Ok(result)
}

fn stored_endpoint_unavailable_outbound_send_result(
    next_blocker: String,
    manual_network_permission: bool,
    persistent_client_ready: bool,
) -> ProductionOnionOutboundEnvelopeSendAttemptResult {
    let refresh_recommended = next_blocker.to_ascii_lowercase().contains("refresh")
        || next_blocker.to_ascii_lowercase().contains("stale");
    ProductionOnionOutboundEnvelopeSendAttemptResult {
        warning: "Stored peer onion endpoint is not ready. The message remains saved and can be retried after the endpoint is refreshed.",
        preparation_only: false,
        manual_client_attempt_feature_compiled: cfg!(feature = "manual-onion-client-attempt"),
        manual_network_permission_enabled: manual_network_permission,
        persistent_client_ready,
        persistent_client_promoted_from_real_onion_cache: false,
        send_intent_prepared: false,
        send_attempt_started: false,
        send_attempt_succeeded: false,
        peer_endpoint_failure_recorded: false,
        peer_endpoint_refresh_recommended: refresh_recommended,
        retry_recommended_after_endpoint_refresh: refresh_recommended,
        ack_wait_registered: false,
        redacted_send_result_event_recorded: false,
        event_summary: Vec::new(),
        next_blocker: next_blocker.clone(),
        blockers: vec![next_blocker],
        raw_endpoint_returned: false,
        raw_path_returned: false,
        onion_secret_returned: false,
        peer_proof_returned: false,
        session_transcript_returned: false,
        envelope_payload_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        stream_accept_attempted: false,
        stream_dial_attempted: false,
        stream_read_write_attempted: false,
        stream_send_attempted: false,
        envelope_io_opened: false,
        runtime_messaging_enabled: false,
    }
}

#[tauri::command]
async fn production_onion_endpoint_update_control_send_stored_endpoint_attempt(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile: String,
    passphrase: String,
    message_number: u64,
    local_rendezvous_endpoint: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionEndpointUpdateControlSendAttemptResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production onion endpoint update send attempt failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production onion endpoint update send attempt failed without exposing local path details"
    })?;
    let mut result = run_production_onion_endpoint_update_control_send_stored_endpoint_attempt(
        &app_data_root,
        app_cache_root,
        &state,
        profile.clone(),
        passphrase.clone(),
        message_number,
        local_rendezvous_endpoint,
        manual_network_permission,
    )
    .await
    .map_err(|_| {
        "production onion endpoint update send attempt failed without exposing profile, endpoint, payload, path, proof, or key details"
            .to_string()
    })?;
    apply_endpoint_update_control_send_failure_result(
        &mut result,
        app_data_root,
        profile,
        passphrase,
        message_number,
    );
    Ok(result)
}

#[tauri::command]
fn production_onion_key_record_prepare(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionOnionKeyRecordPrepareResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production onion key record prepare failed without exposing local path details")?;
    let app_cache_root = production_app_cache_dir(&app)
        .map_err(|_| "production onion key record prepare failed without exposing local path details")?;
    run_production_onion_key_record_prepare(app_data_root, app_cache_root, profile, passphrase)
        .map_err(|_| {
            "production onion key record prepare failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_profile_unlock(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionProfileUnlockResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production profile unlock failed without exposing local path details")?;
    run_production_profile_unlock(app_data_root, profile, passphrase).map_err(|_| {
        "production profile unlock failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_profile_list(app: tauri::AppHandle) -> Result<ProductionProfileListResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production profile list failed without exposing local path details")?;
    run_production_profile_list(app_data_root).map_err(|_| {
        "production profile list failed without exposing local path details".to_string()
    })
}

#[tauri::command]
fn production_message_retention_preference_get(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionMessageRetentionPreferenceResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production message retention preference load failed without exposing local path details"
    })?;
    run_production_message_retention_preference_get(app_data_root, profile, passphrase).map_err(
        |_| {
            "production message retention preference load failed without exposing profile, path, or key details"
                .to_string()
        },
    )
}

#[tauri::command]
fn production_message_retention_preference_set(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_ttl_seconds: u64,
) -> Result<ProductionMessageRetentionPreferenceResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production message retention preference save failed without exposing local path details"
    })?;
    run_production_message_retention_preference_set(
        app_data_root,
        profile,
        passphrase,
        message_ttl_seconds,
    )
    .map_err(|_| {
        "production message retention preference save failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_pairing_payload_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionPairingPayloadExportResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production pairing payload export failed without exposing local path details"
    })?;
    run_production_pairing_payload_export(app_data_root, profile, passphrase, rendezvous_endpoint)
        .map_err(|_| {
            "production pairing payload export failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_pairing_session_draft_save(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    local_payload: String,
    remote_payload: String,
    safety_confirmed: bool,
) -> Result<ProductionPairingSessionDraftResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production pairing session draft save failed without exposing local path details"
    })?;
    run_production_pairing_session_draft_save(
        app_data_root,
        profile,
        passphrase,
        local_payload,
        remote_payload,
        safety_confirmed,
    )
    .map_err(|_| {
        "production pairing session draft save failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_pairing_session_remote_endpoint_update(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionPairingSessionRemoteEndpointUpdateResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production pairing session remote endpoint update failed without exposing local path details"
    })?;
    run_production_pairing_session_remote_endpoint_update(
        app_data_root,
        profile,
        passphrase,
        rendezvous_endpoint,
    )
    .map_err(|_| {
        "production pairing session remote endpoint update failed without exposing profile, endpoint, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_pairing_safety_preview(
    local_payload: String,
    remote_payload: String,
) -> Result<ProductionPairingSafetyPreviewResult, String> {
    run_production_pairing_safety_preview(local_payload, remote_payload).map_err(|_| {
        "production pairing safety preview failed without exposing payload or transcript details"
            .to_string()
    })
}

#[tauri::command]
fn production_session_state_check(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionSessionStateCheckResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production session state check failed without exposing local path details")?;
    run_production_session_state_check(app_data_root, profile, passphrase).map_err(|_| {
        "production session state check failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_two_profile_session_status(
    app: tauri::AppHandle,
    profile_a: String,
    profile_b: String,
    passphrase: String,
) -> Result<ProductionTwoProfileSessionStatusResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production two-profile session status failed without exposing local path details"
    })?;
    run_production_two_profile_session_status(app_data_root, profile_a, profile_b, passphrase)
        .map_err(|_| {
            "production two-profile session status failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_invite_room_session_status(
    app: tauri::AppHandle,
    local_profile: String,
    peer_profile: String,
    passphrase: String,
) -> Result<ProductionTwoProfileSessionStatusResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production invite room session status failed without exposing local path details"
    })?;
    run_production_two_profile_session_status(app_data_root, local_profile, peer_profile, passphrase)
        .map_err(|_| {
            "production invite room session status failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_handshake_init_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production handshake init failed without exposing local path details")?;
    run_production_handshake_init_export(app_data_root, profile, passphrase).map_err(|_| {
        "production handshake init failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_handshake_reply_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    init_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production handshake reply failed without exposing local path details")?;
    run_production_handshake_reply_export(app_data_root, profile, passphrase, init_payload).map_err(
        |_| {
            "production handshake reply failed without exposing profile, path, or key details"
                .to_string()
        },
    )
}

#[tauri::command]
fn production_handshake_finish_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    reply_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production handshake finish failed without exposing local path details")?;
    run_production_handshake_finish_export(app_data_root, profile, passphrase, reply_payload)
        .map_err(|_| {
            "production handshake finish failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_handshake_finish_import(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    finish_payload: String,
) -> Result<ProductionHandshakeFinishImportResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production handshake import failed without exposing local path details")?;
    run_production_handshake_finish_import(app_data_root, profile, passphrase, finish_payload)
        .map_err(|_| {
            "production handshake import failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_message_envelope_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
    auto_message_number: bool,
    message: String,
    message_ttl_seconds: u64,
) -> Result<ProductionMessageEnvelopeExportResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production message export failed without exposing local path details")?;
    run_production_message_envelope_export(
        app_data_root,
        profile,
        passphrase,
        message_number,
        auto_message_number,
        message,
        message_ttl_seconds,
    )
    .map_err(|_| {
        "production message export failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_message_envelope_import(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
    envelope_payload: String,
    message_ttl_seconds: u64,
) -> Result<ProductionMessageEnvelopeImportResult, String> {
    let app_data_root = production_app_data_dir(&app)
        .map_err(|_| "production message import failed without exposing local path details")?;
    run_production_message_envelope_import(
        app_data_root,
        profile,
        passphrase,
        message_number,
        envelope_payload,
        message_ttl_seconds,
    )
    .map_err(|_| {
        "production message import failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_endpoint_update_control_envelope_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
    local_rendezvous_endpoint: String,
) -> Result<ProductionEndpointUpdateControlEnvelopeExportResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production endpoint update export failed without exposing local path details"
    })?;
    run_production_endpoint_update_control_envelope_export(
        app_data_root,
        profile,
        passphrase,
        message_number,
        local_rendezvous_endpoint,
    )
    .map_err(|_| {
        "production endpoint update export failed without exposing profile, endpoint, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_endpoint_update_control_envelope_import(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    envelope_payload: String,
) -> Result<ProductionEndpointUpdateControlEnvelopeImportResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production endpoint update import failed without exposing local path details"
    })?;
    run_production_endpoint_update_control_envelope_import(
        app_data_root,
        profile,
        passphrase,
        envelope_payload,
    )
    .map_err(|_| {
        "production endpoint update import failed without exposing profile, endpoint, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_message_received_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
) -> Result<ProductionMessageReceivedExportResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production received message export failed without exposing local path details"
    })?;
    run_production_message_received_export(app_data_root, profile, passphrase, message_number)
        .map_err(|_| {
            "production received message export failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_message_transcript_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionMessageTranscriptExportResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production message transcript export failed without exposing local path details"
    })?;
    run_production_message_transcript_export(app_data_root, profile, passphrase).map_err(|_| {
        "production message transcript export failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_message_outbound_cancel_pending(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
) -> Result<(), String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production outbound cancel failed without exposing local path details"
    })?;
    run_production_message_outbound_cancel_pending(
        app_data_root,
        profile,
        passphrase,
        message_number,
    )
}

#[tauri::command]
fn production_message_outbound_mark_send_failed(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
    failure_kind: String,
) -> Result<(), String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production outbound failure mark failed without exposing local path details"
    })?;
    run_production_message_outbound_mark_send_failed(
        app_data_root,
        profile,
        passphrase,
        message_number,
        failure_kind,
    )
}

fn run_production_message_outbound_mark_send_failed(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
    failure_kind: String,
) -> Result<(), String> {
    use another_dimension_core::production::production_message_outbound_mark_send_failed;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let failure_kind = failure_kind.trim();
    let failure_kind = if failure_kind.is_empty() {
        "peer-endpoint-missing"
    } else {
        failure_kind
    };
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    production_message_outbound_mark_send_failed(
        &store_path,
        profile,
        &passphrase,
        message_number,
        failure_kind,
    )
    .map_err(|_| {
        "production outbound failure mark failed without exposing profile, path, or key details"
            .to_string()
    })
}

fn run_production_message_outbound_cancel_pending(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
) -> Result<(), String> {
    use another_dimension_core::production::production_message_outbound_cancel_pending;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    production_message_outbound_cancel_pending(&store_path, profile, &passphrase, message_number)
        .map_err(|_| {
            "production outbound cancel failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_local_roundtrip(message: String) -> Result<ProductionLocalRoundtripResult, String> {
    run_production_local_roundtrip(message).map_err(|_| {
        "production local roundtrip failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_two_profile_roundtrip(
    app: tauri::AppHandle,
    profile_a: String,
    profile_b: String,
    passphrase: String,
    message: String,
    message_ttl_seconds: u64,
) -> Result<ProductionTwoProfileRoundtripResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production two-profile roundtrip failed without exposing local path details"
    })?;
    run_production_two_profile_roundtrip(
        app_data_root,
        profile_a,
        profile_b,
        passphrase,
        message,
        message_ttl_seconds,
    )
    .map_err(|_| {
            "production two-profile roundtrip failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_two_profile_room_setup(
    app: tauri::AppHandle,
    profile_a: String,
    profile_b: String,
    passphrase: String,
) -> Result<ProductionTwoProfileRoomSetupResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production two-profile room setup failed without exposing local path details"
    })?;
    run_production_two_profile_room_setup(app_data_root, profile_a, profile_b, passphrase)
        .map_err(|_| {
            "production two-profile room setup failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_invite_room_setup(
    app: tauri::AppHandle,
    local_profile: String,
    peer_profile: String,
    passphrase: String,
) -> Result<ProductionTwoProfileRoomSetupResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production invite room setup failed without exposing local path details"
    })?;
    let role = production_invite_role(&local_profile);
    let open_record = if role == "joiner" {
        Some(ensure_dev_invite_room_open(&passphrase).map_err(|_| {
            "production invite room setup failed because the invite code is not open".to_string()
        })?)
    } else {
        None
    };
    let result = run_production_two_profile_room_setup(
        app_data_root,
        local_profile.clone(),
        peer_profile.clone(),
        passphrase.clone(),
    )
        .map_err(|_| {
            "production invite room setup failed without exposing profile, path, or key details"
                .to_string()
        })?;
    if role == "inviter" {
        register_dev_invite_room(&passphrase, &local_profile, &peer_profile).map_err(|_| {
            "production invite room setup failed because the invite room could not be opened"
                .to_string()
        })?;
    } else if let Some(record) = open_record {
        note_dev_invite_room_join(&passphrase, record).map_err(|_| {
            "production invite room setup failed because the invite room could not be updated"
                .to_string()
        })?;
    }
    Ok(result)
}

#[tauri::command]
fn production_invite_room_presence_refresh(
    local_profile: String,
    peer_profile: String,
    passphrase: String,
) -> Result<DevInviteRoomPresenceRefreshResult, String> {
    if production_invite_role(&local_profile) != "inviter" || passphrase.trim().is_empty() {
        return Ok(DevInviteRoomPresenceRefreshResult {
            open: false,
            expires_at_ms: 0,
        });
    }
    let now = now_unix_ms();
    let expires_at_ms = now + DEV_INVITE_ROOM_TTL_MS;
    let mut record =
        read_dev_invite_room_record(&passphrase)?.unwrap_or_else(|| DevInviteRoomRecord {
            inviter_profile: local_profile.clone(),
            peer_profile: peer_profile.clone(),
            created_at_ms: now,
            last_seen_at_ms: now,
            expires_at_ms,
            consumed: false,
        });
    record.consumed = false;
    record.last_seen_at_ms = now;
    record.expires_at_ms = expires_at_ms;
    write_dev_invite_room_record(&passphrase, &record)?;
    Ok(DevInviteRoomPresenceRefreshResult {
        open: true,
        expires_at_ms,
    })
}

#[tauri::command]
fn production_two_profile_message_roundtrip(
    app: tauri::AppHandle,
    profile_a: String,
    profile_b: String,
    passphrase: String,
    message: String,
    message_ttl_seconds: u64,
) -> Result<ProductionTwoProfileMessageRoundtripResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production stored-session message roundtrip failed without exposing local path details"
    })?;
    run_production_two_profile_message_roundtrip(
        app_data_root,
        profile_a,
        profile_b,
        passphrase,
        message,
        message_ttl_seconds,
    )
    .map_err(|_| {
        "production stored-session message roundtrip failed without exposing profile, path, or key details"
            .to_string()
        })
}

#[tauri::command]
fn production_invite_room_message_send(
    app: tauri::AppHandle,
    local_profile: String,
    peer_profile: String,
    passphrase: String,
    message: String,
    message_ttl_seconds: u64,
) -> Result<ProductionTwoProfileMessageRoundtripResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production invite room message send failed without exposing local path details"
    })?;
    let local_profile_for_relay = local_profile.clone();
    let peer_profile_for_relay = peer_profile.clone();
    let passphrase_for_relay = passphrase.clone();
    let message_for_relay = message.clone();
    let result = run_production_two_profile_message_roundtrip(
        app_data_root,
        local_profile,
        peer_profile,
        passphrase,
        message,
        message_ttl_seconds,
    )
    .map_err(|_| {
        "production invite room message send failed without exposing profile, path, or key details"
            .to_string()
    })?;
    if dev_invite_room_is_enabled() {
        let created_at_ms = now_unix_ms();
        append_dev_invite_room_message(
            &passphrase_for_relay,
            DevInviteRoomMessageRecord {
                sender_profile: local_profile_for_relay,
                receiver_profile: peer_profile_for_relay,
                message_number: result.message_number,
                message: message_for_relay.trim().to_string(),
                created_at_ms,
                ttl_seconds: result.message_ttl_seconds,
                expires_at_ms: Some(created_at_ms + u128::from(result.message_ttl_seconds) * 1000),
            },
        )
        .map_err(|_| {
            "production invite room message send failed because dev relay write failed".to_string()
        })?;
    }
    Ok(result)
}

#[tauri::command]
async fn production_two_profile_real_onion_roundtrip(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
    profile_a: String,
    profile_b: String,
    passphrase: String,
    message: String,
    message_ttl_seconds: u64,
    manual_network_permission: bool,
    bootstrap_retry_limit: Option<u8>,
) -> Result<ProductionTwoProfileRealOnionRoundtripResult, String> {
    let app_data_root = production_app_data_dir(&app).map_err(|_| {
        "production real onion roundtrip failed without exposing local path details"
    })?;
    let app_cache_root = production_app_cache_dir(&app).map_err(|_| {
        "production real onion roundtrip failed without exposing local path details"
    })?;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let _ = &state;
    #[cfg(feature = "manual-onion-client-attempt")]
    let generation = state
        .real_onion_roundtrip_generation
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst)
        + 1;
    #[cfg(feature = "manual-onion-client-attempt")]
    {
        state
            .real_onion_roundtrip_cancel_requested
            .store(false, std::sync::atomic::Ordering::SeqCst);
        state
            .real_onion_roundtrip_in_progress
            .store(true, std::sync::atomic::Ordering::SeqCst);
    }
    #[cfg(feature = "manual-onion-client-attempt")]
    let cancel_scope = RealOnionRoundtripCancelScope {
        state: &state,
        generation,
    };
    #[cfg(feature = "manual-onion-client-attempt")]
    let result = run_production_two_profile_real_onion_roundtrip_with_cancel(
        app_data_root,
        app_cache_root,
        Some(&state),
        profile_a,
        profile_b,
        passphrase,
        message,
        message_ttl_seconds,
        manual_network_permission,
        bootstrap_retry_limit,
        Some(&cancel_scope),
    )
    .await
    .map_err(|error| {
        format!(
            "production real onion roundtrip stopped at redacted stage: {error}"
        )
    });
    #[cfg(feature = "manual-onion-client-attempt")]
    {
        state
            .real_onion_roundtrip_in_progress
            .store(false, std::sync::atomic::Ordering::SeqCst);
    }
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let result = run_production_two_profile_real_onion_roundtrip(
        app_data_root,
        app_cache_root,
        profile_a,
        profile_b,
        passphrase,
        message,
        message_ttl_seconds,
        manual_network_permission,
        bootstrap_retry_limit,
    )
    .await
    .map_err(|error| {
        format!(
            "production real onion roundtrip stopped at redacted stage: {error}"
        )
    });
    result
}

#[derive(serde::Serialize)]
struct ProductionTwoProfileRealOnionWaitCancelResult {
    warning: &'static str,
    roundtrip_in_progress: bool,
    cancel_requested: bool,
    generation: u64,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[tauri::command]
fn production_two_profile_real_onion_wait_cancel(
    state: tauri::State<'_, ProductionOnionClientRuntimeState>,
) -> Result<ProductionTwoProfileRealOnionWaitCancelResult, String> {
    #[cfg(feature = "manual-onion-client-attempt")]
    {
        let in_progress = state
            .real_onion_roundtrip_in_progress
            .load(std::sync::atomic::Ordering::SeqCst);
        if in_progress {
            state
                .real_onion_roundtrip_cancel_requested
                .store(true, std::sync::atomic::Ordering::SeqCst);
        }
        return Ok(ProductionTwoProfileRealOnionWaitCancelResult {
            warning: "Real onion wait cancel only requests cancellation for an explicit in-progress roundtrip. It does not start network work, delete messages, or expose private details.",
            roundtrip_in_progress: in_progress,
            cancel_requested: in_progress,
            generation: state
                .real_onion_roundtrip_generation
                .load(std::sync::atomic::Ordering::SeqCst),
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        });
    }
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = state;
        Ok(ProductionTwoProfileRealOnionWaitCancelResult {
            warning: "Real onion wait cancel is unavailable in this build. No network work was started.",
            roundtrip_in_progress: false,
            cancel_requested: false,
            generation: 0,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }
}

#[cfg(test)]
#[allow(clippy::too_many_arguments)]
async fn run_production_two_profile_real_onion_roundtrip(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile_a: String,
    profile_b: String,
    passphrase: String,
    message: String,
    message_ttl_seconds: u64,
    manual_network_permission: bool,
    bootstrap_retry_limit: Option<u8>,
) -> Result<ProductionTwoProfileRealOnionRoundtripResult, String> {
    run_production_two_profile_real_onion_roundtrip_with_cancel(
        app_data_root,
        app_cache_root,
        None,
        profile_a,
        profile_b,
        passphrase,
        message,
        message_ttl_seconds,
        manual_network_permission,
        bootstrap_retry_limit,
        None,
    )
    .await
}

#[tauri::command]
fn dev_local_demo() -> Result<DevLocalDemoTranscript, String> {
    let root_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .ok_or_else(|| "failed to resolve repository root".to_string())?;
    let output = std::process::Command::new("cargo")
        .current_dir(root_dir)
        .args([
            "run",
            "-q",
            "--features",
            "dev-insecure",
            "--",
            "demo",
            "local",
        ])
        .output()
        .map_err(|_| "failed to launch local dev demo command".to_string())?;
    let warning = String::from_utf8_lossy(&output.stderr).into_owned();
    let transcript = String::from_utf8_lossy(&output.stdout).into_owned();

    if output.status.success() {
        let steps = parse_demo_steps(&transcript);
        let simulation = build_demo_simulation(&steps);
        Ok(DevLocalDemoTranscript {
            warning,
            transcript,
            steps,
            simulation,
            first_run_hint:
                "First run may take longer while Cargo builds the dev-insecure local demo."
                    .to_string(),
        })
    } else {
        Err(format!(
            "local dev demo failed\n{}\n{}",
            warning.trim(),
            transcript.trim()
        ))
    }
}

#[tauri::command]
fn dev_local_message_loop(messages: Vec<String>) -> Result<DevLocalMessageLoopResult, String> {
    let messages = sanitize_loop_messages(messages)?;
    let root_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .ok_or_else(|| "failed to resolve repository root".to_string())?;
    let mut args = vec![
        "run".to_string(),
        "-q".to_string(),
        "--features".to_string(),
        "dev-insecure".to_string(),
        "--".to_string(),
        "demo".to_string(),
        "local-loop".to_string(),
    ];
    for message in messages {
        args.push("--message".to_string());
        args.push(message);
    }
    let output = std::process::Command::new("cargo")
        .current_dir(root_dir)
        .args(args)
        .output()
        .map_err(|_| "failed to launch local dev message loop command".to_string())?;
    let warning = String::from_utf8_lossy(&output.stderr).into_owned();
    let transcript = String::from_utf8_lossy(&output.stdout).into_owned();

    if output.status.success() {
        Ok(DevLocalMessageLoopResult {
            warning,
            messages: parse_loop_messages(&transcript),
            replay_summary: extract_line_containing(&transcript, "no replayed messages")
                .unwrap_or_else(|| "replay check summary not observed".to_string()),
            expiry_summary: extract_line_containing(&transcript, "expired envelopes:")
                .unwrap_or_else(|| "expiry summary not observed".to_string()),
            storage_guard: extract_line_containing(&transcript, "dev store plaintext guard")
                .unwrap_or_else(|| "storage guard summary not observed".to_string()),
            transcript,
        })
    } else {
        Err(format!(
            "local dev message loop failed\n{}\n{}",
            warning.trim(),
            transcript.trim()
        ))
    }
}

fn sanitize_loop_messages(messages: Vec<String>) -> Result<Vec<String>, String> {
    let cleaned = messages
        .into_iter()
        .map(|message| message.trim().to_string())
        .filter(|message| !message.is_empty())
        .collect::<Vec<_>>();
    if cleaned.is_empty() {
        return Err("local loop requires at least one message".to_string());
    }
    if cleaned.len() > 5 {
        return Err("local loop accepts at most 5 messages".to_string());
    }
    if cleaned.iter().any(|message| message.len() > 240) {
        return Err("local loop messages must be 240 characters or fewer".to_string());
    }
    Ok(cleaned)
}

fn parse_demo_steps(transcript: &str) -> Vec<DevLocalDemoStep> {
    let mut steps = Vec::new();
    let mut current_label: Option<String> = None;
    let mut current_detail = Vec::new();

    for line in transcript.lines() {
        if let Some(label) = line
            .strip_prefix("== ")
            .and_then(|value| value.strip_suffix(" =="))
        {
            if let Some(label) = current_label.replace(label.to_string()) {
                steps.push(DevLocalDemoStep {
                    label,
                    status: "completed",
                    detail: current_detail.join("\n").trim().to_string(),
                });
                current_detail.clear();
            }
        } else if current_label.is_some() && !line.trim().is_empty() {
            current_detail.push(line.to_string());
        }
    }

    if let Some(label) = current_label {
        steps.push(DevLocalDemoStep {
            label,
            status: "completed",
            detail: current_detail.join("\n").trim().to_string(),
        });
    }

    steps
}

fn build_demo_simulation(steps: &[DevLocalDemoStep]) -> DevLocalSimulation {
    DevLocalSimulation {
        peers: vec![
            DevLocalPeer {
                name: "Alice",
                profile_state: "local dev profile initialized",
                contact_state: "Bob contact activated",
                inbox_state: "sender in local dev flow",
            },
            DevLocalPeer {
                name: "Bob",
                profile_state: "local dev profile initialized",
                contact_state: "Alice contact activated",
                inbox_state: "received one local dev message",
            },
        ],
        safety_number: extract_prefixed_value(steps, "safety number:"),
        safety_phrase: extract_prefixed_value(steps, "safety phrase:"),
        message_body: extract_step_detail(steps, "Receive as Bob"),
        queued_envelope: extract_step_detail(steps, "Send message"),
        replay_check: extract_step_detail(steps, "Replay check"),
    }
}

fn extract_step_detail(steps: &[DevLocalDemoStep], label: &str) -> String {
    steps
        .iter()
        .find(|step| step.label == label)
        .map(|step| step.detail.clone())
        .unwrap_or_else(|| "not observed in local demo transcript".to_string())
}

fn extract_prefixed_value(steps: &[DevLocalDemoStep], prefix: &str) -> String {
    steps
        .iter()
        .flat_map(|step| step.detail.lines())
        .find_map(|line| line.strip_prefix(prefix).map(str::trim))
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| "not observed in local demo transcript".to_string())
}

fn parse_loop_messages(transcript: &str) -> Vec<DevLocalLoopMessage> {
    let mut messages = Vec::new();
    let mut current_index = None;
    let mut received = None;
    let mut replay_check = None;

    for line in transcript.lines() {
        if let Some(label) = line
            .strip_prefix("== Local message ")
            .and_then(|value| value.strip_suffix(" =="))
        {
            if let Some(index) = current_index.take() {
                messages.push(DevLocalLoopMessage {
                    index,
                    sent: received.clone().unwrap_or_default(),
                    received: received.take().unwrap_or_default(),
                    replay_check: replay_check.take().unwrap_or_default(),
                });
            }
            current_index = label.parse::<usize>().ok();
        } else if let Some(value) = line.strip_prefix("received by bob: ") {
            received = Some(value.to_string());
        } else if let Some(value) = line.strip_prefix("replay check: ") {
            replay_check = Some(value.to_string());
        }
    }

    if let Some(index) = current_index {
        messages.push(DevLocalLoopMessage {
            index,
            sent: received.clone().unwrap_or_default(),
            received: received.unwrap_or_default(),
            replay_check: replay_check.unwrap_or_default(),
        });
    }

    messages
}

fn extract_line_containing(transcript: &str, needle: &str) -> Option<String> {
    transcript
        .lines()
        .rev()
        .find(|line| line.contains(needle))
        .map(ToString::to_string)
}

fn run_production_profile_unlock(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionProfileUnlockResult, String> {
    use another_dimension_core::production::{
        production_profile_identity_init, production_profile_identity_status,
        production_profile_init, production_profile_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;

    if let Some(parent) = store_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|_| "failed to create production profile store directory")?;
    }

    let initial_profile = production_profile_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "profile unlock failed")?;
    let profile_initialized = if initial_profile.profile_marker_present() {
        false
    } else {
        let init = production_profile_init(&store_path, profile.clone(), &passphrase)
            .map_err(|_| "profile init failed")?;
        init.profile_marker_written()
    };
    let profile_status = production_profile_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "profile status failed")?;
    let profile_storage_opened = profile_status.storage_opened();
    let profile_marker_present = profile_status.profile_marker_present();
    let profile_key_material_exposed = profile_status.key_material_exposed();
    let profile_transport_io_opened = profile_status.transport_io_opened();
    let profile_runtime_messaging_enabled = profile_status.runtime_messaging_enabled();

    let initial_identity =
        production_profile_identity_status(&store_path, profile.clone(), &passphrase)
            .map_err(|_| "identity status failed")?;
    let identity_created = if initial_identity.identity_private_key_present() {
        false
    } else {
        let init = production_profile_identity_init(&store_path, profile.clone(), &passphrase)
            .map_err(|_| "identity init failed")?;
        init.identity_private_key_written()
    };
    let identity_status = production_profile_identity_status(&store_path, profile, &passphrase)
        .map_err(|_| "identity status failed")?;
    let identity_storage_opened = identity_status.storage_opened();
    let identity_private_key_present = identity_status.identity_private_key_present();
    let identity_public_key_derivable = identity_status.identity_public_key_derivable();
    let identity_key_material_exposed = identity_status.key_material_exposed();
    let identity_transport_io_opened = identity_status.transport_io_opened();
    let identity_runtime_messaging_enabled = identity_status.runtime_messaging_enabled();

    Ok(ProductionProfileUnlockResult {
        warning:
            "app-data production profile unlock only; no session, network, Tor, or secure-release claim",
        storage_opened: profile_storage_opened && identity_storage_opened,
        app_data_profile_store: true,
        profile_initialized,
        profile_marker_present,
        identity_created,
        identity_private_key_present,
        identity_public_key_derivable,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: profile_key_material_exposed || identity_key_material_exposed,
        network_io_attempted: false,
        transport_io_opened: profile_transport_io_opened || identity_transport_io_opened,
        runtime_messaging_enabled: profile_runtime_messaging_enabled
            || identity_runtime_messaging_enabled,
    })
}

fn run_production_message_retention_preference_get(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionMessageRetentionPreferenceResult, String> {
    use another_dimension_core::production::production_message_retention_preference_get;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let preference = production_message_retention_preference_get(
        &store_path,
        profile,
        &passphrase,
        another_dimension_core::production::PRODUCTION_DEFAULT_MESSAGE_TTL_SECONDS,
    )
    .map_err(|_| "message retention preference load failed")?;
    Ok(ProductionMessageRetentionPreferenceResult {
        warning: "message retention preference loaded after local profile unlock",
        storage_opened: preference.storage_opened(),
        profile_marker_present: preference.profile_marker_present(),
        preference_present: preference.preference_present(),
        message_ttl_seconds: preference.message_ttl_seconds(),
        preference_written: preference.preference_written(),
        key_material_exposed: preference.key_material_exposed(),
        transport_io_opened: preference.transport_io_opened(),
        runtime_messaging_enabled: preference.runtime_messaging_enabled(),
    })
}

fn run_production_message_retention_preference_set(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_ttl_seconds: u64,
) -> Result<ProductionMessageRetentionPreferenceResult, String> {
    use another_dimension_core::production::production_message_retention_preference_set;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let message_ttl_seconds = sanitize_production_message_ttl_seconds(message_ttl_seconds)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let preference = production_message_retention_preference_set(
        &store_path,
        profile,
        &passphrase,
        message_ttl_seconds,
    )
    .map_err(|_| "message retention preference save failed")?;
    Ok(ProductionMessageRetentionPreferenceResult {
        warning: "message retention preference saved in encrypted local profile store",
        storage_opened: preference.storage_opened(),
        profile_marker_present: preference.profile_marker_present(),
        preference_present: preference.preference_present(),
        message_ttl_seconds: preference.message_ttl_seconds(),
        preference_written: preference.preference_written(),
        key_material_exposed: preference.key_material_exposed(),
        transport_io_opened: preference.transport_io_opened(),
        runtime_messaging_enabled: preference.runtime_messaging_enabled(),
    })
}

fn sanitize_production_profile(
    profile: String,
) -> Result<another_dimension_identity::ProfileName, String> {
    let trimmed = profile.trim();
    if trimmed.len() > 64 {
        return Err("production profile name must be 64 bytes or fewer".to_string());
    }
    another_dimension_identity::ProfileName::new(trimmed)
        .map_err(|_| "invalid production profile name".to_string())
}

fn production_profile_store_path(
    app_data_root: impl AsRef<std::path::Path>,
    profile: &another_dimension_identity::ProfileName,
) -> Result<std::path::PathBuf, String> {
    let profile_name = profile.as_str();
    if profile_name.contains('.') {
        return Err("production profile name cannot contain path-like segments".to_string());
    }
    Ok(app_data_root
        .as_ref()
        .join("profiles")
        .join(format!("{profile_name}.db")))
}

#[cfg(feature = "manual-onion-client-attempt")]
fn production_onion_service_nickname(profile: &another_dimension_identity::ProfileName) -> String {
    format!("adchat-{}", profile.as_str().to_ascii_lowercase())
}

fn run_production_onion_preflight_check(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
) -> ProductionOnionPreflightCheckResult {
    use another_dimension_transport::{
        probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
        BridgeCensorshipConfiguration, BridgeRequirement, OnionServiceLaunchPreflight,
        RedactedTransportRuntimeEvent, TransportPreNetworkBlocker, TransportPreNetworkCloseout,
        TransportRuntimePermissionPreflight,
    };

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let mut blockers = Vec::new();
    let mut event_summary = Vec::new();

    let dirs = match probe_app_private_state_cache_dirs(&state_dir, &cache_dir) {
        Ok(dirs) => Some(dirs),
        Err(error) => {
            blockers.push("app-private state/cache directories unavailable".to_string());
            event_summary.push(
                RedactedTransportRuntimeEvent::directory_probe_failed(&state_dir, error)
                    .to_string(),
            );
            None
        }
    };

    let backup_exclusion_verified = dirs
        .as_ref()
        .and_then(|dirs| verify_transport_backup_exclusion(dirs).ok())
        .is_some();
    if dirs.is_some() && !backup_exclusion_verified {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    let bridge_ready = BridgeCensorshipConfiguration::NoBridgeRequired
        .check(BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
        .ok();
    if bridge_ready.is_none() {
        blockers.push("bridge/censorship decision unavailable".to_string());
    }

    let permission_preflight = dirs
        .as_ref()
        .map(|dirs| {
            TransportRuntimePermissionPreflight::from_platform_preflight(
                dirs,
                true,
                backup_exclusion_verified,
                another_dimension_transport::TransportLogRedactionPolicy::RedactedTransportEventsOnly,
                another_dimension_transport::TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
                bridge_ready
                    .map(|ready| ready.readiness())
                    .unwrap_or(another_dimension_transport::TransportCensorshipReadiness::Unsupported),
            )
        })
        .unwrap_or_else(TransportRuntimePermissionPreflight::locked_down_by_default);
    let runtime_preflight = permission_preflight.to_runtime_preflight();
    if let Some(error) = runtime_preflight.first_runtime_blocker() {
        event_summary
            .push(RedactedTransportRuntimeEvent::runtime_preflight_failed(error).to_string());
    }

    let mut pre_network_blockers = Vec::new();
    if !backup_exclusion_verified {
        pre_network_blockers.push(TransportPreNetworkBlocker::BackupExclusionVerification);
    }
    pre_network_blockers.push(TransportPreNetworkBlocker::OnionServiceKeyLifecycle);
    if bridge_ready.is_none() {
        pre_network_blockers.push(TransportPreNetworkBlocker::BridgeCensorshipConfiguration);
    }
    let closeout = TransportPreNetworkCloseout::from_blockers(pre_network_blockers);
    if !closeout.network_execution_allowed() {
        blockers.push(format!(
            "pre-network closeout incomplete: next={:?}",
            closeout.next_phase()
        ));
    }

    if let Err(error) = OnionServiceLaunchPreflight::locked_down_by_default().check() {
        blockers.push(format!("onion launch preflight blocked: {error:?}"));
    }

    ProductionOnionPreflightCheckResult {
        warning: "Onion transport preflight only. No Tor bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
        preflight_only: true,
        ready_for_runtime_bootstrap: runtime_preflight.all_runtime_guards_ready(),
        ready_for_onion_launch: false,
        state_cache_dirs_accessible: dirs.is_some(),
        backup_exclusion_verified,
        log_redaction_ready: runtime_preflight.log_redaction_ready,
        crash_redaction_ready: true,
        bridge_or_censorship_ready: runtime_preflight.bridge_or_censorship_ready,
        manual_network_action: true,
        blockers,
        event_summary,
        raw_path_returned: false,
        onion_secret_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    }
}

fn run_production_onion_bootstrap_preflight_check(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
) -> ProductionOnionBootstrapPreflightCheckResult {
    use another_dimension_transport::{
        probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
        BridgeCensorshipConfiguration, BridgeRequirement, RedactedTransportRuntimeEvent,
        TransportBootstrapExecutionSkeleton, TransportBootstrapPolicy,
        TransportCrashRedactionPolicy, TransportLogRedactionPolicy,
        TransportRuntimePermissionPreflight,
    };

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let mut blockers = Vec::new();
    let mut event_summary = Vec::new();

    let dirs = match probe_app_private_state_cache_dirs(&state_dir, &cache_dir) {
        Ok(dirs) => Some(dirs),
        Err(error) => {
            blockers.push("app-private state/cache directories unavailable".to_string());
            event_summary.push(
                RedactedTransportRuntimeEvent::directory_probe_failed(&state_dir, error)
                    .to_string(),
            );
            None
        }
    };
    let backup_exclusion = dirs
        .as_ref()
        .and_then(|dirs| verify_transport_backup_exclusion(dirs).ok());
    if dirs.is_some() && backup_exclusion.is_none() {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    let bridge_ready = BridgeCensorshipConfiguration::NoBridgeRequired
        .check(BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
        .ok();
    if bridge_ready.is_none() {
        blockers.push("bridge/censorship decision unavailable".to_string());
    }

    let permission_preflight = match (dirs.as_ref(), backup_exclusion.as_ref(), bridge_ready) {
        (Some(dirs), Some(backup_exclusion), Some(bridge_ready)) => {
            TransportRuntimePermissionPreflight::from_fully_verified_preflight(
                dirs,
                true,
                backup_exclusion,
                bridge_ready,
                TransportLogRedactionPolicy::RedactedTransportEventsOnly,
                TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
            )
        }
        _ => TransportRuntimePermissionPreflight::locked_down_by_default(),
    };
    let runtime_preflight = permission_preflight.to_runtime_preflight();
    let runtime_ready = permission_preflight.check().ok();
    if let Some(error) = runtime_preflight.first_runtime_blocker() {
        event_summary
            .push(RedactedTransportRuntimeEvent::runtime_preflight_failed(error).to_string());
    }

    let policy = TransportBootstrapPolicy::high_risk_default();
    let skeleton = runtime_ready
        .map(|runtime_ready| TransportBootstrapExecutionSkeleton::new(runtime_ready, policy));
    let bootstrap_policy_ready = skeleton.is_some();
    let manual_bootstrap_attempt_enabled = false;
    let persistent_client_ready = false;

    let next_blocker = if !runtime_preflight.all_runtime_guards_ready() {
        runtime_preflight
            .first_runtime_blocker()
            .map(|error| format!("{error:?}"))
            .unwrap_or_else(|| "RuntimePreflightNotReady".to_string())
    } else if !manual_bootstrap_attempt_enabled {
        "ManualBootstrapAttemptNotEnabled".to_string()
    } else {
        "PersistentClientNotReady".to_string()
    };
    if !blockers.iter().any(|blocker| blocker == &next_blocker) {
        blockers.push(next_blocker.clone());
    }

    ProductionOnionBootstrapPreflightCheckResult {
        warning: "Onion bootstrap preflight check only. No persistent Tor client bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
        bootstrap_preflight_only: true,
        state_cache_dirs_accessible: dirs.is_some(),
        backup_exclusion_verified: backup_exclusion.is_some(),
        runtime_preflight_ready: runtime_preflight.all_runtime_guards_ready(),
        bootstrap_policy_ready,
        timeout_seconds: policy.timeout().seconds(),
        retry_max_attempts: policy.retry().max_attempts(),
        retry_initial_backoff_ms: policy.retry().initial_backoff_ms(),
        retry_max_backoff_ms: policy.retry().max_backoff_ms(),
        silent_retry_allowed: policy.allow_silent_retry(),
        censorship_classification_ready: policy.classify_censorship_separately(),
        persistent_client_ready,
        manual_bootstrap_attempt_enabled,
        next_blocker,
        blockers,
        event_summary,
        raw_path_returned: false,
        onion_secret_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    }
}

async fn run_production_onion_client_attempt_gate_check(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
) -> ProductionOnionClientAttemptGateResult {
    let preflight =
        run_production_onion_bootstrap_preflight_check(&app_data_root, &app_cache_root);
    let mut blockers = preflight.blockers.clone();
    let event_summary = preflight.event_summary.clone();

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let next_blocker = "ManualClientAttemptFeatureNotEnabled".to_string();
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        return ProductionOnionClientAttemptGateResult {
            warning: "Onion client attempt gate only. The manual client attempt feature is not enabled; no persistent Tor client bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
            attempt_gate_only: true,
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: false,
            client_attempt_started: false,
            persistent_client_ready: false,
            runtime_preflight_ready: preflight.runtime_preflight_ready,
            bootstrap_policy_ready: preflight.bootstrap_policy_ready,
            lifecycle_state: "feature-disabled".to_string(),
            next_blocker,
            blockers,
            event_summary,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        };
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_transport::{
            arti_adapter_spike, InMemoryTransportRuntimeEventSink,
            TransportBootstrapExecutionSkeleton, TransportBootstrapPolicy,
            TransportCrashRedactionPolicy, TransportLogRedactionPolicy,
            TransportRuntimePermissionPreflight,
        };

        let mut event_summary = event_summary;
        let mut lifecycle_state = "not-created".to_string();
        let mut next_blocker = preflight.next_blocker.clone();
        if preflight.runtime_preflight_ready && preflight.bootstrap_policy_ready {
            let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
            let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
            let dirs = another_dimension_transport::probe_app_private_state_cache_dirs(
                &state_dir, &cache_dir,
            )
            .ok();
            let backup_exclusion = dirs
                .as_ref()
                .and_then(|dirs| another_dimension_transport::verify_transport_backup_exclusion(dirs).ok());
            let bridge_ready = another_dimension_transport::BridgeCensorshipConfiguration::NoBridgeRequired
                .check(another_dimension_transport::BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
                .ok();
            let runtime_ready = match (dirs.as_ref(), backup_exclusion.as_ref(), bridge_ready) {
                (Some(dirs), Some(backup_exclusion), Some(bridge_ready)) => {
                    TransportRuntimePermissionPreflight::from_fully_verified_preflight(
                        dirs,
                        true,
                        backup_exclusion,
                        bridge_ready,
                        TransportLogRedactionPolicy::RedactedTransportEventsOnly,
                        TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
                    )
                    .check()
                    .ok()
                }
                _ => None,
            };

            if let Some(runtime_ready) = runtime_ready {
                let policy = TransportBootstrapPolicy::high_risk_default();
                let skeleton = TransportBootstrapExecutionSkeleton::new(runtime_ready, policy);
                if let Some(dirs) = dirs {
                    match arti_adapter_spike::ArtiAppPrivateDirs::new(
                        dirs.state_dir().to_path_buf(),
                        dirs.cache_dir().to_path_buf(),
                    )
                    .and_then(|arti_dirs| {
                        arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                            arti_dirs, skeleton,
                        )
                    }) {
                        Ok(adapter) => {
                            let gate = arti_adapter_spike::ManualArtiBootstrapAttemptGate::disabled(adapter);
                            let mut sink = InMemoryTransportRuntimeEventSink::default();
                            let result = gate.bootstrap_once_and_drop_client(&mut sink).await;
                            event_summary.extend(sink.events().iter().map(ToString::to_string));
                            lifecycle_state = "unbootstrapped".to_string();
                            next_blocker = format!("{:?}", result.expect_err("disabled gate fails closed"));
                        }
                        Err(_) => {
                            next_blocker = "ClientAdapterConfigFailed".to_string();
                        }
                    }
                }
            }
        }
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        ProductionOnionClientAttemptGateResult {
            warning: "Onion client attempt gate only. Manual network permission remains disabled, so no persistent Tor client bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
            attempt_gate_only: true,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: false,
            client_attempt_started: false,
            persistent_client_ready: false,
            runtime_preflight_ready: preflight.runtime_preflight_ready,
            bootstrap_policy_ready: preflight.bootstrap_policy_ready,
            lifecycle_state,
            next_blocker,
            blockers,
            event_summary,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        }
    }
}

async fn run_production_onion_client_bootstrap_once(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    manual_network_permission: bool,
) -> ProductionOnionClientBootstrapOnceResult {
    let preflight =
        run_production_onion_bootstrap_preflight_check(&app_data_root, &app_cache_root);
    let mut blockers = preflight.blockers.clone();
    let event_summary = preflight.event_summary.clone();

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let next_blocker = "ManualClientAttemptFeatureNotEnabled".to_string();
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        return ProductionOnionClientBootstrapOnceResult {
            warning: "Onion client one-shot attempt is feature-disabled in this build. No persistent Tor client bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: manual_network_permission,
            client_attempt_started: false,
            client_bootstrap_succeeded: false,
            persistent_client_ready: false,
            runtime_preflight_ready: preflight.runtime_preflight_ready,
            bootstrap_policy_ready: preflight.bootstrap_policy_ready,
            lifecycle_state: "feature-disabled".to_string(),
            next_blocker,
            blockers,
            event_summary,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        };
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_transport::{
            arti_adapter_spike, InMemoryTransportRuntimeEventSink,
            TransportBootstrapExecutionSkeleton, TransportBootstrapPolicy,
            TransportCrashRedactionPolicy, TransportLogRedactionPolicy,
            TransportRuntimePermissionPreflight,
        };

        let mut event_summary = event_summary;
        let mut lifecycle_state = "not-created".to_string();
        let mut next_blocker = preflight.next_blocker.clone();
        let mut client_attempt_started = false;
        let mut client_bootstrap_succeeded = false;

        if !manual_network_permission {
            next_blocker = "ManualNetworkPermissionMissing".to_string();
        } else if preflight.runtime_preflight_ready && preflight.bootstrap_policy_ready {
            let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
            let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
            let dirs = another_dimension_transport::probe_app_private_state_cache_dirs(
                &state_dir, &cache_dir,
            )
            .ok();
            let backup_exclusion = dirs.as_ref().and_then(|dirs| {
                another_dimension_transport::verify_transport_backup_exclusion(dirs).ok()
            });
            let bridge_ready =
                another_dimension_transport::BridgeCensorshipConfiguration::NoBridgeRequired
                    .check(another_dimension_transport::BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
                    .ok();
            let runtime_ready = match (dirs.as_ref(), backup_exclusion.as_ref(), bridge_ready) {
                (Some(dirs), Some(backup_exclusion), Some(bridge_ready)) => {
                    TransportRuntimePermissionPreflight::from_fully_verified_preflight(
                        dirs,
                        true,
                        backup_exclusion,
                        bridge_ready,
                        TransportLogRedactionPolicy::RedactedTransportEventsOnly,
                        TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
                    )
                    .check()
                    .ok()
                }
                _ => None,
            };

            if let (Some(runtime_ready), Some(dirs)) = (runtime_ready, dirs) {
                let policy = TransportBootstrapPolicy::high_risk_default();
                let skeleton = TransportBootstrapExecutionSkeleton::new(runtime_ready, policy);
                match arti_adapter_spike::ArtiAppPrivateDirs::new(
                    dirs.state_dir().to_path_buf(),
                    dirs.cache_dir().to_path_buf(),
                )
                .and_then(|arti_dirs| {
                    arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                        arti_dirs, skeleton,
                    )
                }) {
                    Ok(adapter) => {
                        let gate = arti_adapter_spike::ManualArtiBootstrapAttemptGate::explicitly_enabled_for_manual_spike(adapter);
                        let mut sink = InMemoryTransportRuntimeEventSink::default();
                        client_attempt_started = true;
                        let result = gate.bootstrap_once_and_drop_client(&mut sink).await;
                        event_summary.extend(sink.events().iter().map(ToString::to_string));
                        lifecycle_state = "one-shot-client-dropped".to_string();
                        match result {
                            Ok(()) => {
                                client_bootstrap_succeeded = true;
                                next_blocker = "PersistentClientNotKeptAfterOneShot".to_string();
                            }
                            Err(error) => {
                                next_blocker = format!("{error:?}");
                            }
                        }
                    }
                    Err(_) => {
                        next_blocker = "ClientAdapterConfigFailed".to_string();
                    }
                }
            }
        }
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        ProductionOnionClientBootstrapOnceResult {
            warning: "Onion client one-shot attempt boundary. It may attempt Tor bootstrap only when this build has the manual feature and the checkbox permission is set; it never launches an onion service, publishes a descriptor, opens stream I/O, or sends messages.",
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: manual_network_permission,
            client_attempt_started,
            client_bootstrap_succeeded,
            persistent_client_ready: false,
            runtime_preflight_ready: preflight.runtime_preflight_ready,
            bootstrap_policy_ready: preflight.bootstrap_policy_ready,
            lifecycle_state,
            next_blocker,
            blockers,
            event_summary,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: client_attempt_started,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        }
    }
}

fn run_production_onion_persistent_client_ready(
    state: &ProductionOnionClientRuntimeState,
) -> Result<bool, String> {
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = state;
        Ok(false)
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        let guard = state
            .owner
            .lock()
            .map_err(|_| "production onion persistent client state unavailable".to_string())?;
        Ok(guard
            .as_ref()
            .map(|owner| owner.summary().has_bootstrapped_client())
            .unwrap_or(false))
    }
}

fn run_production_onion_persistent_client_status(
    state: &ProductionOnionClientRuntimeState,
) -> ProductionOnionPersistentClientStatusResult {
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = state;
        ProductionOnionPersistentClientStatusResult {
            warning: "Persistent onion client status is feature-disabled in this build. No Tor client is retained and no network I/O was attempted.",
            manual_client_attempt_feature_compiled: false,
            persistent_client_ready: false,
            lifecycle_state: "feature-disabled".to_string(),
            timeout_seconds: 45,
            bootstrap_in_progress: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        }
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        let bootstrap_in_progress = state
            .bootstrap_in_progress
            .load(std::sync::atomic::Ordering::Acquire);
        let (persistent_client_ready, lifecycle_state, timeout_seconds) = state
            .owner
            .lock()
            .ok()
            .and_then(|guard| {
                guard.as_ref().map(|owner| {
                    let summary = owner.summary();
                    (
                        summary.has_bootstrapped_client(),
                        format!("{:?}", summary.state()),
                        summary.timeout_seconds(),
                    )
                })
            })
            .unwrap_or((false, "not-created".to_string(), 45));

        ProductionOnionPersistentClientStatusResult {
            warning: "Persistent onion client status only. This reports retained in-memory client state without launching an onion service, publishing a descriptor, opening stream I/O, or sending messages.",
            manual_client_attempt_feature_compiled: true,
            persistent_client_ready,
            lifecycle_state,
            timeout_seconds,
            bootstrap_in_progress,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        }
    }
}

async fn run_production_onion_persistent_client_start(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    state: &ProductionOnionClientRuntimeState,
    manual_network_permission: bool,
) -> ProductionOnionPersistentClientStartResult {
    let preflight =
        run_production_onion_bootstrap_preflight_check(&app_data_root, &app_cache_root);
    let mut blockers = preflight.blockers.clone();
    let event_summary = preflight.event_summary.clone();

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = state;
        let next_blocker = "ManualClientAttemptFeatureNotEnabled".to_string();
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        return ProductionOnionPersistentClientStartResult {
            warning: "Persistent onion client start is feature-disabled in this build. No Tor client bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: manual_network_permission,
            client_bootstrap_started: false,
            client_bootstrap_succeeded: false,
            persistent_client_ready: false,
            runtime_preflight_ready: preflight.runtime_preflight_ready,
            bootstrap_policy_ready: preflight.bootstrap_policy_ready,
            lifecycle_state: "feature-disabled".to_string(),
            timeout_seconds: preflight.timeout_seconds,
            next_blocker,
            blockers,
            event_summary,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        };
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_transport::{
            arti_adapter_spike, InMemoryTransportRuntimeEventSink,
            TransportBootstrapExecutionSkeleton, TransportBootstrapPolicy,
            TransportBootstrapRetryPolicy, TransportBootstrapTimeoutPolicy,
            TransportCrashRedactionPolicy, TransportLogRedactionPolicy,
            TransportRuntimePermissionPreflight,
        };

        let mut event_summary = event_summary;
        let interactive_policy = TransportBootstrapPolicy::new(
            TransportBootstrapTimeoutPolicy::new(12).expect("bounded interactive timeout"),
            TransportBootstrapRetryPolicy::high_risk_default(),
            false,
            true,
        )
        .expect("bounded interactive bootstrap policy");
        let next_blocker: String;
        let mut lifecycle_state = "not-created".to_string();
        let mut client_bootstrap_started = false;
        let mut client_bootstrap_succeeded = false;
        let mut persistent_client_ready = false;

        if !manual_network_permission {
            next_blocker = "ManualNetworkPermissionMissing".to_string();
        } else if !(preflight.runtime_preflight_ready && preflight.bootstrap_policy_ready) {
            next_blocker = preflight.next_blocker.clone();
        } else if state
            .bootstrap_in_progress
            .swap(true, std::sync::atomic::Ordering::AcqRel)
        {
            next_blocker = "PersistentClientBootstrapAlreadyInProgress".to_string();
        } else {
            let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
            let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
            let mut owner = match state.owner.lock() {
                Ok(mut guard) => guard.take(),
                Err(_) => {
                    state
                        .bootstrap_in_progress
                        .store(false, std::sync::atomic::Ordering::Release);
                    None
                }
            };
            if owner.is_none() {
                let dirs = another_dimension_transport::probe_app_private_state_cache_dirs(
                    &state_dir, &cache_dir,
                )
                .ok();
                let backup_exclusion = dirs.as_ref().and_then(|dirs| {
                    another_dimension_transport::verify_transport_backup_exclusion(dirs).ok()
                });
                let bridge_ready =
                    another_dimension_transport::BridgeCensorshipConfiguration::NoBridgeRequired
                        .check(another_dimension_transport::BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
                        .ok();
                let runtime_ready = match (dirs.as_ref(), backup_exclusion.as_ref(), bridge_ready) {
                    (Some(dirs), Some(backup_exclusion), Some(bridge_ready)) => {
                        TransportRuntimePermissionPreflight::from_fully_verified_preflight(
                            dirs,
                            true,
                            backup_exclusion,
                            bridge_ready,
                            TransportLogRedactionPolicy::RedactedTransportEventsOnly,
                            TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
                        )
                        .check()
                        .ok()
                    }
                    _ => None,
                };
                owner = match (runtime_ready, dirs) {
                    (Some(runtime_ready), Some(dirs)) => {
                        let skeleton =
                            TransportBootstrapExecutionSkeleton::new(runtime_ready, interactive_policy);
                        arti_adapter_spike::ArtiAppPrivateDirs::new(
                            dirs.state_dir().to_path_buf(),
                            dirs.cache_dir().to_path_buf(),
                        )
                        .and_then(|arti_dirs| {
                            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                                arti_dirs, skeleton,
                            )
                        })
                        .ok()
                        .map(arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped)
                    }
                    _ => None,
                };
            }

            match owner {
                Some(mut owner) => {
                    let summary = owner.summary();
                    if summary.has_bootstrapped_client() {
                        persistent_client_ready = true;
                        lifecycle_state = format!("{:?}", summary.state());
                        next_blocker = "none".to_string();
                    } else {
                        let mut sink = InMemoryTransportRuntimeEventSink::default();
                        client_bootstrap_started = true;
                        let bootstrap_timeout = std::time::Duration::from_secs(u64::from(
                            interactive_policy.timeout().seconds() + 2,
                        ));
                        let result = match tokio::time::timeout(
                            bootstrap_timeout,
                            owner.bootstrap_and_keep_client(
                                arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
                                &mut sink,
                            ),
                        )
                        .await
                        {
                            Ok(result) => result,
                            Err(_) => {
                                event_summary.push(
                                    "transport_event kind=BootstrapFailed runtime_error=Some(BootstrapTimeout) probe_error=None route_kind=None direction=None"
                                        .to_string(),
                                );
                                Err(arti_adapter_spike::PersistentArtiClientLifecycleError::BootstrapFailed(
                                    another_dimension_transport::TransportRuntimeError::BootstrapTimeout,
                                ))
                            }
                        };
                        event_summary.extend(sink.events().iter().map(ToString::to_string));
                        let summary = owner.summary();
                        persistent_client_ready = summary.has_bootstrapped_client();
                        lifecycle_state = format!("{:?}", summary.state());
                        match result {
                            Ok(()) => {
                                client_bootstrap_succeeded = true;
                                next_blocker = "none".to_string();
                            }
                            Err(error) => {
                                next_blocker = format!("{error:?}");
                            }
                        }
                    }
                    if let Ok(mut guard) = state.owner.lock() {
                        *guard = Some(owner);
                    }
                }
                None => {
                    next_blocker = "PersistentClientOwnerUnavailable".to_string();
                }
            }
            state
                .bootstrap_in_progress
                .store(false, std::sync::atomic::Ordering::Release);
        }

        if !persistent_client_ready && !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        ProductionOnionPersistentClientStartResult {
            warning: "Persistent onion client start boundary. It may attempt Tor bootstrap only when this build has the manual feature and the checkbox permission is set; it never launches an onion service, publishes a descriptor, opens stream I/O, or sends messages.",
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: manual_network_permission,
            client_bootstrap_started,
            client_bootstrap_succeeded,
            persistent_client_ready,
            runtime_preflight_ready: preflight.runtime_preflight_ready,
            bootstrap_policy_ready: preflight.bootstrap_policy_ready,
            lifecycle_state,
            timeout_seconds: interactive_policy.timeout().seconds(),
            next_blocker,
            blockers,
            event_summary,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: false,
            network_io_attempted: client_bootstrap_started,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        }
    }
}

fn run_production_onion_backup_exclusion_prepare(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
) -> ProductionOnionBackupExclusionPrepareResult {
    use another_dimension_transport::{
        probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
    };

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let mut blockers = Vec::new();

    let dirs = match probe_app_private_state_cache_dirs(&state_dir, &cache_dir) {
        Ok(dirs) => dirs,
        Err(_) => {
            return ProductionOnionBackupExclusionPrepareResult {
                warning: "Onion backup exclusion prepare is blocked before transport setup. No Tor bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
                state_cache_dirs_accessible: false,
                backup_exclusion_written: false,
                backup_exclusion_verified: false,
                blockers: vec!["app-private state/cache directories unavailable".to_string()],
                raw_path_returned: false,
                onion_secret_returned: false,
                key_material_exposed: false,
                network_io_attempted: false,
                transport_io_opened: false,
                runtime_messaging_enabled: false,
            };
        }
    };

    let backup_exclusion_written = mark_transport_backup_exclusion(&dirs).is_ok();
    if !backup_exclusion_written {
        blockers.push("state/cache backup exclusion write failed or unsupported".to_string());
    }

    let backup_exclusion_verified = verify_transport_backup_exclusion(&dirs).is_ok();
    if !backup_exclusion_verified {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    ProductionOnionBackupExclusionPrepareResult {
        warning: "Onion backup exclusion prepare only marks app-private Tor state/cache directories for local backup exclusion. No Tor bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
        state_cache_dirs_accessible: true,
        backup_exclusion_written,
        backup_exclusion_verified,
        blockers,
        raw_path_returned: false,
        onion_secret_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    }
}

#[cfg(target_os = "macos")]
fn mark_transport_backup_exclusion(
    dirs: &another_dimension_transport::TransportStateCacheDirsReady,
) -> Result<(), ()> {
    mark_dir_backup_exclusion(dirs.state_dir())?;
    mark_dir_backup_exclusion(dirs.cache_dir())?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn mark_dir_backup_exclusion(path: &std::path::Path) -> Result<(), ()> {
    let output = std::process::Command::new("xattr")
        .arg("-w")
        .arg("com.apple.metadata:com_apple_backup_excludeItem")
        .arg("com.apple.backupd")
        .arg(path)
        .output()
        .map_err(|_| ())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(())
    }
}

#[cfg(not(target_os = "macos"))]
fn mark_transport_backup_exclusion(
    _dirs: &another_dimension_transport::TransportStateCacheDirsReady,
) -> Result<(), ()> {
    Err(())
}

fn run_production_onion_key_record_prepare(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionOnionKeyRecordPrepareResult, String> {
    use another_dimension_core::production::production_onion_service_key_record_prepare;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::{
        probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
    };

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let mut blockers = Vec::new();
    let dirs = probe_app_private_state_cache_dirs(&state_dir, &cache_dir).ok();
    let backup_exclusion = dirs
        .as_ref()
        .and_then(|dirs| verify_transport_backup_exclusion(dirs).ok());

    if dirs.is_none() {
        blockers.push("app-private state/cache directories unavailable".to_string());
    }
    if backup_exclusion.is_none() {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    if let Some(backup_exclusion) = backup_exclusion {
        let profile = sanitize_production_profile(profile)?;
        let passphrase = ProfilePassphrase::new(passphrase.trim())
            .map_err(|_| "invalid production profile passphrase")?;
        let store_path = production_profile_store_path(app_data_root, &profile)?;
        let summary = production_onion_service_key_record_prepare(
            &store_path,
            profile,
            &passphrase,
            &backup_exclusion,
        )
        .map_err(|_| "onion service key record prepare failed")?;
        return Ok(ProductionOnionKeyRecordPrepareResult {
            warning: "Onion service key record prepared in the local encrypted profile store. No onion key bytes, onion address, Tor bootstrap, descriptor publication, stream I/O, or message transport was exposed.",
            storage_opened: summary.storage_opened(),
            profile_marker_present: summary.profile_marker_present(),
            profile_transport_unlock_ready: summary.profile_transport_unlock_ready(),
            backup_exclusion_verified: true,
            lifecycle_ready: summary.lifecycle_ready(),
            key_record_written: summary.key_record_written(),
            key_record_present: summary.key_record_present(),
            key_material_ready: summary.key_material_ready(),
            blockers,
            raw_path_returned: false,
            onion_secret_returned: false,
            key_material_exposed: summary.key_material_exposed(),
            network_io_attempted: summary.network_io_attempted(),
            transport_io_opened: summary.transport_io_opened(),
            runtime_messaging_enabled: summary.runtime_messaging_enabled(),
        });
    }

    Ok(ProductionOnionKeyRecordPrepareResult {
        warning: "Onion service key record prepare is blocked before profile unlock. Verify app-private state/cache directories and backup exclusion first.",
        storage_opened: false,
        profile_marker_present: false,
        profile_transport_unlock_ready: false,
        backup_exclusion_verified: false,
        lifecycle_ready: false,
        key_record_written: false,
        key_record_present: false,
        key_material_ready: false,
        blockers,
        raw_path_returned: false,
        onion_secret_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

#[allow(dead_code)]
fn run_production_onion_launch_preflight_check(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionOnionLaunchPreflightCheckResult, String> {
    run_production_onion_launch_preflight_check_with_persistent_client(
        app_data_root,
        app_cache_root,
        profile,
        passphrase,
        false,
    )
}

fn run_production_onion_launch_preflight_check_with_persistent_client(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    persistent_client_ready: bool,
) -> Result<ProductionOnionLaunchPreflightCheckResult, String> {
    use another_dimension_core::production::production_onion_service_key_record_status;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::{
        probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
        OnionEndpointPublicationPolicy, OnionEndpointUpdatePolicy, OnionServiceKeyLifecycleDecision,
        OnionServiceKeyMaterialDecision, OnionServiceKeyRecordId, OnionServiceLaunchPreflight,
        ProfileTransportUnlockReady,
    };

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let mut blockers = Vec::new();

    let dirs = probe_app_private_state_cache_dirs(&state_dir, &cache_dir).ok();
    let backup_exclusion = dirs
        .as_ref()
        .and_then(|dirs| verify_transport_backup_exclusion(dirs).ok());
    if dirs.is_none() {
        blockers.push("app-private state/cache directories unavailable".to_string());
    }
    if backup_exclusion.is_none() {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(&app_data_root, &profile)?;
    let status = production_onion_service_key_record_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "onion service key record status failed")?;

    let profile_transport_unlock_ready = status.profile_transport_unlock_ready();
    let key_record_present = status.key_record_present();
    if !key_record_present {
        blockers.push("onion service key record not prepared".to_string());
    }

    let key_material_ready = if key_record_present {
        backup_exclusion.as_ref()
    } else {
        None
    }
    .and_then(|backup_exclusion| {
        let lifecycle_ready =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(backup_exclusion)
                .check()
                .ok();
        let profile_unlock = ProfileTransportUnlockReady;
        let record_id = OnionServiceKeyRecordId::new("onion_service_key_material_v1").ok();
        lifecycle_ready
            .zip(record_id)
            .and_then(|(lifecycle_ready, record_id)| {
                OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
                    &profile_unlock,
                    &lifecycle_ready,
                    record_id,
                )
                .check()
                .ok()
            })
    });
    if key_material_ready.is_none() {
        blockers.push("onion service key material readiness not verified".to_string());
    }

    let endpoint_publication_policy_ready = true;
    let endpoint_update_policy_ready = true;
    let redacted_events_only = true;
    let launch_result = key_material_ready.as_ref().map(|key_material_ready| {
        let profile_unlock = ProfileTransportUnlockReady;
        OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            key_material_ready,
            persistent_client_ready,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
            OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
            redacted_events_only,
        )
        .check()
    });

    let ready_for_onion_launch = matches!(launch_result, Some(Ok(_)));
    let next_blocker = match launch_result {
        Some(Err(error)) => format!("{error:?}"),
        Some(Ok(_)) => "none".to_string(),
        None => blockers
            .first()
            .cloned()
            .unwrap_or_else(|| "onion launch preflight inputs unavailable".to_string()),
    };
    if !ready_for_onion_launch && !blockers.iter().any(|blocker| blocker == &next_blocker) {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionLaunchPreflightCheckResult {
        warning: "Onion launch preflight check only. No persistent Tor client bootstrap, onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
        launch_preflight_only: true,
        profile_transport_unlock_ready,
        backup_exclusion_verified: backup_exclusion.is_some(),
        key_record_present,
        key_material_ready: key_material_ready.is_some(),
        persistent_client_ready,
        endpoint_publication_policy_ready,
        endpoint_update_policy_ready,
        redacted_events_only,
        ready_for_onion_launch,
        next_blocker,
        blockers,
        raw_path_returned: false,
        onion_secret_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
	    })
}

fn run_production_onion_service_launch_attempt(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    state: &ProductionOnionClientRuntimeState,
    profile: String,
    passphrase: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionServiceLaunchAttemptResult, String> {
    use another_dimension_core::production::production_onion_service_key_record_status;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::{
        probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
        OnionServiceKeyLifecycleDecision, OnionServiceKeyMaterialDecision, OnionServiceKeyRecordId,
        ProfileTransportUnlockReady,
    };

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let mut blockers = Vec::new();

    let dirs = probe_app_private_state_cache_dirs(&state_dir, &cache_dir).ok();
    let backup_exclusion = dirs
        .as_ref()
        .and_then(|dirs| verify_transport_backup_exclusion(dirs).ok());
    if dirs.is_none() {
        blockers.push("app-private state/cache directories unavailable".to_string());
    }
    if backup_exclusion.is_none() {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(&app_data_root, &profile)?;
    let status = production_onion_service_key_record_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "onion service key record status failed")?;

    let profile_transport_unlock_ready = status.profile_transport_unlock_ready();
    let key_record_present = status.key_record_present();
    if !key_record_present {
        blockers.push("onion service key record not prepared".to_string());
    }

    let key_material_ready = if key_record_present {
        backup_exclusion.as_ref()
    } else {
        None
    }
    .and_then(|backup_exclusion| {
        let lifecycle_ready =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(backup_exclusion)
                .check()
                .ok();
        let profile_unlock = ProfileTransportUnlockReady;
        let record_id = OnionServiceKeyRecordId::new("onion_service_key_material_v1").ok();
        lifecycle_ready
            .zip(record_id)
            .and_then(|(lifecycle_ready, record_id)| {
                OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
                    &profile_unlock,
                    &lifecycle_ready,
                    record_id,
                )
                .check()
                .ok()
            })
    });
    if key_material_ready.is_none() {
        blockers.push("onion service key material readiness not verified".to_string());
    }

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = state;
        let next_blocker = "ManualClientAttemptFeatureNotEnabled".to_string();
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        return Ok(ProductionOnionServiceLaunchAttemptResult {
            warning: "Onion service launch attempt is feature-disabled in this build. No onion service launch, descriptor publication, stream I/O, or message transport was attempted.",
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: manual_network_permission,
            profile_transport_unlock_ready,
            backup_exclusion_verified: backup_exclusion.is_some(),
            key_record_present,
            key_material_ready: key_material_ready.is_some(),
            persistent_client_ready: false,
            launch_preflight_ready: false,
            launch_adapter_ready: false,
            launch_attempt_started: false,
            launch_attempt_succeeded: false,
            onion_service_retained: false,
            inbound_rend_request_stream_retained: false,
            local_onion_endpoint: String::new(),
            onion_endpoint_returned: false,
            redacted_launch_result_event_recorded: false,
            event_summary: Vec::new(),
            next_blocker,
            blockers,
            raw_path_returned: false,
            onion_secret_returned: false,
            descriptor_body_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            descriptor_publish_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        });
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_transport::{
            arti_adapter_spike, InMemoryTransportRuntimeEventSink, OnionEndpointPublicationPolicy,
            OnionEndpointUpdatePolicy, OnionServiceLaunchPreflight,
        };

        let mut event_summary = Vec::new();
        let mut persistent_client_ready = false;
        let mut launch_preflight_ready = false;
        let mut launch_adapter_ready = false;
        let mut launch_attempt_started = false;
        let mut launch_attempt_succeeded = false;
        let mut onion_service_retained = false;
        let mut inbound_rend_request_stream_retained = false;
        let mut local_onion_endpoint = String::new();
        let next_blocker: String;

        if !manual_network_permission {
            next_blocker = "ManualNetworkPermissionMissing".to_string();
        } else {
            let mut guard = state
                .owner
                .lock()
                .map_err(|_| "production onion persistent client state unavailable".to_string())?;
            match (guard.as_mut(), key_material_ready.as_ref()) {
                (Some(owner), Some(key_material_ready)) => {
                    persistent_client_ready = owner.summary().has_bootstrapped_client();
                    let profile_unlock = ProfileTransportUnlockReady;
                    let launch_result = OnionServiceLaunchPreflight::from_ready_boundaries(
                        &profile_unlock,
                        key_material_ready,
                        persistent_client_ready,
                        OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
                        OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
                        true,
                    )
                    .check();
                    launch_preflight_ready = launch_result.is_ok();
                    match launch_result {
                        Ok(launch_ready) => {
                            match arti_adapter_spike::OnionServiceLaunchAdapterSkeleton::from_ready_owner(
                                launch_ready,
                                key_material_ready,
                                owner,
                            ) {
                                Ok(_adapter) => {
                                    launch_adapter_ready = true;
	                                    let mut sink = InMemoryTransportRuntimeEventSink::default();
	                                    launch_attempt_started = true;
	                                    let network_permission = arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike;
	                                    let service_nickname = production_onion_service_nickname(&profile);
	                                    match owner.launch_onion_service_once(
	                                        network_permission,
	                                        &service_nickname,
	                                        &mut sink,
	                                    ) {
	                                        Ok(()) => {
	                                            launch_attempt_succeeded = true;
	                                            next_blocker = "none".to_string();
                                        }
                                        Err(error) => {
                                            next_blocker = format!("{error:?}");
                                        }
                                    }
                                    event_summary
                                        .extend(sink.events().iter().map(ToString::to_string));
                                }
                                Err(error) => {
                                    next_blocker = format!("{error:?}");
                                }
                            }
                        }
                        Err(error) => {
                            next_blocker = format!("{error:?}");
                        }
                    }
                }
                (None, _) => {
                    next_blocker = "PersistentClientOwnerUnavailable".to_string();
                }
                (_, None) => {
                    next_blocker = "OnionServiceKeyMaterialNotReady".to_string();
                }
            }
            onion_service_retained = guard
                .as_ref()
                .map(|owner| owner.summary().onion_service_owned())
                .unwrap_or(false);
            inbound_rend_request_stream_retained = guard
                .as_ref()
                .map(|owner| owner.summary().inbound_rend_request_stream_owned())
                .unwrap_or(false);
            local_onion_endpoint = guard
                .as_ref()
                .and_then(|owner| owner.retained_onion_endpoint())
                .unwrap_or_default();
        }

        if next_blocker != "none" && !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }

        Ok(ProductionOnionServiceLaunchAttemptResult {
            warning: "Onion service launch attempt boundary. This requires the manual network permission checkbox and a retained bootstrapped Tor client. It asks Arti to launch and retain an onion service handle, but returns no onion address, raw path, descriptor body, or key material, and does not enable messaging.",
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: manual_network_permission,
            profile_transport_unlock_ready,
            backup_exclusion_verified: backup_exclusion.is_some(),
            key_record_present,
            key_material_ready: key_material_ready.is_some(),
            persistent_client_ready,
            launch_preflight_ready,
            launch_adapter_ready,
            launch_attempt_started,
            launch_attempt_succeeded,
            onion_service_retained,
            inbound_rend_request_stream_retained,
            onion_endpoint_returned: !local_onion_endpoint.is_empty(),
            local_onion_endpoint,
            redacted_launch_result_event_recorded: !event_summary.is_empty(),
            event_summary,
            next_blocker,
            blockers,
            raw_path_returned: false,
            onion_secret_returned: false,
            descriptor_body_returned: false,
            key_material_exposed: false,
            network_io_attempted: launch_attempt_started,
            descriptor_publish_attempted: launch_attempt_started,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        })
    }
}

fn run_production_onion_descriptor_publication_prepare(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    persistent_client_ready: bool,
) -> Result<ProductionOnionDescriptorPublicationPrepareResult, String> {
    use another_dimension_core::production::production_onion_service_key_record_status;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::{
        BootstrapOnlyExperimentDecision, BootstrapOnlyExperimentFeatureState,
        DescriptorPublicationFailClosedAdapter, DescriptorPublicationGateDecision,
        DescriptorPublicationPreparationBoundary, NetworkExperimentGateProposal,
        NetworkExperimentManualGate, NetworkExperimentOperatorConsent,
        NetworkExperimentTargetCachePolicy, NetworkExperimentVerificationPolicy,
        OnionEndpointPublicationPolicy, OnionEndpointUpdatePolicy, OnionHostingGateDecision,
        OnionHostingGateFeatureState, OnionServiceKeyLifecycleDecision,
        OnionServiceKeyMaterialDecision, OnionServiceKeyRecordId, OnionServiceLaunchPreflight,
        ProfileTransportUnlockReady, RedactedDescriptorPublicationContext,
        TransportNextRiskBoundary, TransportPhaseCloseoutDecision, TransportPreNetworkCloseout,
        TransportRuntimeError, TransportRuntimePreflight,
    };

    let mut blockers = Vec::new();
    let runtime_preflight = TransportRuntimePreflight::disabled_by_default();
    if !matches!(
        runtime_preflight.first_runtime_blocker(),
        Some(TransportRuntimeError::RuntimeNetworkDisabled)
    ) {
        blockers.push("runtime preflight did not fail closed before descriptor preparation".to_string());
    }

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let dirs = another_dimension_transport::probe_app_private_state_cache_dirs(
        &state_dir, &cache_dir,
    )
    .ok();
    let backup_exclusion = dirs
        .as_ref()
        .and_then(|dirs| another_dimension_transport::verify_transport_backup_exclusion(dirs).ok());
    if dirs.is_none() {
        blockers.push("app-private state/cache directories unavailable".to_string());
    }
    if backup_exclusion.is_none() {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(&app_data_root, &profile)?;
    let status = production_onion_service_key_record_status(&store_path, profile, &passphrase)
        .map_err(|_| "onion service key record status failed")?;
    let profile_transport_unlock_ready = status.profile_transport_unlock_ready();
    let key_record_present = status.key_record_present();
    if !key_record_present {
        blockers.push("onion service key record not prepared".to_string());
    }

    let key_material_ready = if key_record_present {
        backup_exclusion.as_ref()
    } else {
        None
    }
    .and_then(|backup_exclusion| {
        let lifecycle_ready =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(backup_exclusion)
                .check()
                .ok();
        let profile_unlock = ProfileTransportUnlockReady;
        let record_id = OnionServiceKeyRecordId::new("onion_service_key_material_v1").ok();
        lifecycle_ready
            .zip(record_id)
            .and_then(|(lifecycle_ready, record_id)| {
                OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
                    &profile_unlock,
                    &lifecycle_ready,
                    record_id,
                )
                .check()
                .ok()
            })
    });
    if key_material_ready.is_none() {
        blockers.push("onion service key material readiness not verified".to_string());
    }

    let endpoint_publication_policy_ready = true;
    let redacted_events_only = true;
    let launch_result = key_material_ready.as_ref().map(|key_material_ready| {
        let profile_unlock = ProfileTransportUnlockReady;
        OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            key_material_ready,
            persistent_client_ready,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
            OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
            redacted_events_only,
        )
        .check()
    });
    let launch_preflight_ready = matches!(launch_result, Some(Ok(_)));

    let transport_phase_closeout_ready = TransportPhaseCloseoutDecision::select_onion_hosting_gate(
        BootstrapOnlyExperimentDecision::existing_manual_bootstrap_only(
            NetworkExperimentGateProposal::bootstrap_only_manual_spike(
                &TransportPreNetworkCloseout::from_blockers(Vec::new()),
                NetworkExperimentOperatorConsent::ExplicitForLocalManualSpike,
                NetworkExperimentVerificationPolicy::HeavyIsolatedTargetAndManualCiExcluded,
                NetworkExperimentTargetCachePolicy::IsolatedTemporaryTarget,
            )
            .check()
            .map_err(|error| format!("{error:?}"))?,
            BootstrapOnlyExperimentFeatureState::ArtiManualBootstrapFeature,
        )
        .check()
        .map_err(|error| format!("{error:?}"))?,
    )
    .check()
    .map_err(|error| format!("{error:?}"))?;
    let transport_next_boundary_ready =
        transport_phase_closeout_ready.next_boundary() == TransportNextRiskBoundary::OnionHostingGate;
    if !transport_next_boundary_ready {
        blockers.push("transport phase closeout did not select onion hosting gate".to_string());
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    let (manual_client_attempt_feature_compiled, feature_state) = (
        true,
        OnionHostingGateFeatureState::ArtiAdapterSpikeFeature,
    );
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let (manual_client_attempt_feature_compiled, feature_state) =
        (false, OnionHostingGateFeatureState::NotCompiled);

    let hosting_gate_result = match (launch_result, key_material_ready.as_ref()) {
        (Some(Ok(launch_ready)), Some(key_material_ready)) => OnionHostingGateDecision::from_ready_boundaries(
            transport_phase_closeout_ready,
            launch_ready,
            key_material_ready,
            NetworkExperimentManualGate::FeatureGatedManualOnly,
            feature_state,
            persistent_client_ready,
        )
        .check()
        .map_err(|error| format!("{error:?}")),
        (Some(Err(error)), _) => Err(format!("{error:?}")),
        (Some(Ok(_)), None) => Err("onion service key material readiness not verified".to_string()),
        (None, _) => Err(blockers
            .first()
            .cloned()
            .unwrap_or_else(|| "descriptor publication inputs unavailable".to_string())),
    };
    let onion_hosting_gate_ready = hosting_gate_result.is_ok();

    let descriptor_gate_result = hosting_gate_result
        .map(|hosting_ready| {
            DescriptorPublicationGateDecision::pairwise_rendezvous_only(
                hosting_ready,
                OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
                redacted_events_only,
            )
            .check()
            .map_err(|error| format!("{error:?}"))
        })
        .and_then(|result| result);
    let descriptor_publication_gate_ready = descriptor_gate_result.is_ok();

    let adapter_result = match (descriptor_gate_result, launch_preflight_ready) {
        (Ok(gate_ready), true) => DescriptorPublicationFailClosedAdapter::from_gate_ready(
            gate_ready,
            another_dimension_transport::OnionServiceLaunchReady,
        )
        .map_err(|error| format!("{error:?}"))
        .map(|adapter| (gate_ready, adapter)),
        (Err(error), _) => Err(error),
        (_, false) => Err("LaunchPreflightRequired".to_string()),
    };
    let fail_closed_adapter_ready = adapter_result.is_ok();

    let redacted_context =
        RedactedDescriptorPublicationContext::pairwise_rendezvous_only(
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
        );
    let redacted_context_ready = redacted_context.is_redacted();

    let preparation_result = adapter_result
        .map(|(gate_ready, adapter)| {
            DescriptorPublicationPreparationBoundary::from_fail_closed_adapter(
                gate_ready,
                &adapter,
                redacted_context,
            )
            .check()
            .map_err(|error| format!("{error:?}"))
        })
        .and_then(|result| result);
    let descriptor_preparation_ready = preparation_result.is_ok();

    let next_blocker = match preparation_result {
        Ok(_) => "none".to_string(),
        Err(error) => error,
    };
    if !descriptor_preparation_ready && !blockers.iter().any(|blocker| blocker == &next_blocker) {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionDescriptorPublicationPrepareResult {
        warning: "Descriptor publication preparation only. No descriptor body was created, no descriptor was published, no stream I/O opened, and no message transport was attempted.",
        preparation_only: true,
        manual_client_attempt_feature_compiled,
        profile_transport_unlock_ready,
        key_material_ready: key_material_ready.is_some(),
        persistent_client_ready,
        launch_preflight_ready,
        onion_hosting_gate_ready,
        descriptor_publication_gate_ready,
        fail_closed_adapter_ready,
        redacted_context_ready,
        descriptor_preparation_ready,
        endpoint_publication_policy_ready,
        next_blocker,
        blockers,
        raw_path_returned: false,
        onion_secret_returned: false,
        descriptor_body_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        descriptor_publish_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn run_production_onion_descriptor_publication_attempt(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    persistent_client_ready: bool,
    manual_network_permission: bool,
) -> Result<ProductionOnionDescriptorPublicationAttemptResult, String> {
    use another_dimension_core::production::production_onion_service_key_record_status;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::{
        BootstrapOnlyExperimentDecision, BootstrapOnlyExperimentFeatureState,
        DescriptorPublicationFailClosedAdapter, DescriptorPublicationGateDecision,
        DescriptorPublicationPreparationBoundary, InMemoryTransportRuntimeEventSink,
        NetworkExperimentGateProposal, NetworkExperimentManualGate, NetworkExperimentOperatorConsent,
        NetworkExperimentTargetCachePolicy, NetworkExperimentVerificationPolicy,
        OnionEndpointPublicationPolicy, OnionEndpointUpdatePolicy, OnionHostingGateDecision,
        OnionHostingGateFeatureState, OnionServiceKeyLifecycleDecision,
        OnionServiceKeyMaterialDecision, OnionServiceKeyRecordId, OnionServiceLaunchPreflight,
        ProfileTransportUnlockReady, RedactedDescriptorPublicationContext,
        TransportPhaseCloseoutDecision, TransportPreNetworkCloseout,
    };

    let prepare = run_production_onion_descriptor_publication_prepare(
        &app_data_root,
        &app_cache_root,
        profile.clone(),
        passphrase.clone(),
        persistent_client_ready,
    )?;
    let mut blockers = prepare.blockers.clone();
    let mut event_summary = Vec::new();
    let mut publish_attempt_started = false;
    let publish_attempt_succeeded = false;
    let next_blocker: String;

    if !manual_network_permission {
        next_blocker = "ManualNetworkPermissionMissing".to_string();
    } else if !prepare.descriptor_preparation_ready {
        next_blocker = prepare.next_blocker.clone();
    } else {
        let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
        let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
        let dirs = another_dimension_transport::probe_app_private_state_cache_dirs(
            &state_dir, &cache_dir,
        )
        .ok();
        let backup_exclusion = dirs
            .as_ref()
            .and_then(|dirs| another_dimension_transport::verify_transport_backup_exclusion(dirs).ok());
        let profile = sanitize_production_profile(profile)?;
        let passphrase = ProfilePassphrase::new(passphrase.trim())
            .map_err(|_| "invalid production profile passphrase")?;
        let store_path = production_profile_store_path(&app_data_root, &profile)?;
        let status = production_onion_service_key_record_status(&store_path, profile, &passphrase)
            .map_err(|_| "onion service key record status failed")?;
        let key_material_ready = if status.key_record_present() {
            backup_exclusion.as_ref()
        } else {
            None
        }
        .and_then(|backup_exclusion| {
            let lifecycle_ready =
                OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(backup_exclusion)
                    .check()
                    .ok();
            let profile_unlock = ProfileTransportUnlockReady;
            let record_id = OnionServiceKeyRecordId::new("onion_service_key_material_v1").ok();
            lifecycle_ready
                .zip(record_id)
                .and_then(|(lifecycle_ready, record_id)| {
                    OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
                        &profile_unlock,
                        &lifecycle_ready,
                        record_id,
                    )
                    .check()
                    .ok()
                })
        });

        let attempt_result = key_material_ready
            .as_ref()
            .ok_or_else(|| "OnionServiceKeyMaterialNotReady".to_string())
            .and_then(|key_material_ready| {
                let profile_unlock = ProfileTransportUnlockReady;
                let launch_ready = OnionServiceLaunchPreflight::from_ready_boundaries(
                    &profile_unlock,
                    key_material_ready,
                    persistent_client_ready,
                    OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
                    OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
                    true,
                )
                .check()
                .map_err(|error| format!("{error:?}"))?;
                let transport_phase_closeout_ready =
                    TransportPhaseCloseoutDecision::select_onion_hosting_gate(
                        BootstrapOnlyExperimentDecision::existing_manual_bootstrap_only(
                            NetworkExperimentGateProposal::bootstrap_only_manual_spike(
                                &TransportPreNetworkCloseout::from_blockers(Vec::new()),
                                NetworkExperimentOperatorConsent::ExplicitForLocalManualSpike,
                                NetworkExperimentVerificationPolicy::HeavyIsolatedTargetAndManualCiExcluded,
                                NetworkExperimentTargetCachePolicy::IsolatedTemporaryTarget,
                            )
                            .check()
                            .map_err(|error| format!("{error:?}"))?,
                            BootstrapOnlyExperimentFeatureState::ArtiManualBootstrapFeature,
                        )
                        .check()
                        .map_err(|error| format!("{error:?}"))?,
                    )
                    .check()
                    .map_err(|error| format!("{error:?}"))?;
                let hosting_ready = OnionHostingGateDecision::from_ready_boundaries(
                    transport_phase_closeout_ready,
                    launch_ready,
                    key_material_ready,
                    NetworkExperimentManualGate::FeatureGatedManualOnly,
                    OnionHostingGateFeatureState::ArtiAdapterSpikeFeature,
                    persistent_client_ready,
                )
                .check()
                .map_err(|error| format!("{error:?}"))?;
                let gate_ready = DescriptorPublicationGateDecision::pairwise_rendezvous_only(
                    hosting_ready,
                    OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
                    true,
                )
                .check()
                .map_err(|error| format!("{error:?}"))?;
                let adapter =
                    DescriptorPublicationFailClosedAdapter::from_gate_ready(gate_ready, launch_ready)
                        .map_err(|error| format!("{error:?}"))?;
                DescriptorPublicationPreparationBoundary::from_fail_closed_adapter(
                    gate_ready,
                    &adapter,
                    RedactedDescriptorPublicationContext::pairwise_rendezvous_only(
                        OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
                    ),
                )
                .check()
                .map_err(|error| format!("{error:?}"))?;
                let mut sink = InMemoryTransportRuntimeEventSink::default();
                publish_attempt_started = true;
                let result = adapter.publish_fail_closed(&mut sink);
                event_summary.extend(sink.events().iter().map(ToString::to_string));
                result.map_err(|error| format!("{error:?}"))
            });
        next_blocker = match attempt_result {
            Ok(()) => "none".to_string(),
            Err(error) => error,
        };
    }

    if next_blocker != "none" && !blockers.iter().any(|blocker| blocker == &next_blocker) {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionDescriptorPublicationAttemptResult {
        warning: "Descriptor publication attempt boundary. It requires explicit manual network permission and descriptor preparation. The current adapter is fail-closed: it records only a redacted publish failure event and does not return a descriptor, onion address, stream, or usable messaging state.",
        preparation_only: false,
        manual_client_attempt_feature_compiled: prepare.manual_client_attempt_feature_compiled,
        manual_network_permission_enabled: manual_network_permission,
        persistent_client_ready: prepare.persistent_client_ready,
        launch_preflight_ready: prepare.launch_preflight_ready,
        descriptor_publication_gate_ready: prepare.descriptor_publication_gate_ready,
        descriptor_preparation_ready: prepare.descriptor_preparation_ready,
        publish_attempt_started,
        publish_attempt_succeeded,
        redacted_publish_result_event_recorded: !event_summary.is_empty(),
        event_summary,
        next_blocker,
        blockers,
        raw_path_returned: false,
        onion_secret_returned: false,
        descriptor_body_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        descriptor_publish_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn run_production_onion_inbound_stream_prepare(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    persistent_client_ready: bool,
) -> Result<ProductionOnionInboundStreamPrepareResult, String> {
    use another_dimension_core::production::production_onion_service_key_record_status;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::{
        BootstrapOnlyExperimentDecision, BootstrapOnlyExperimentFeatureState,
        DescriptorPublicationFailClosedAdapter, DescriptorPublicationGateDecision,
        DescriptorPublicationPreparationBoundary, InboundStreamFailClosedAdapter,
        InboundStreamGateDecision, InboundStreamPreparationBoundary,
        NetworkExperimentGateProposal, NetworkExperimentManualGate,
        NetworkExperimentOperatorConsent, NetworkExperimentTargetCachePolicy,
        NetworkExperimentVerificationPolicy, OnionEndpointPublicationPolicy,
        OnionEndpointUpdatePolicy, OnionHostingGateDecision, OnionHostingGateFeatureState,
        OnionServiceDescriptorPublicationReady, OnionServiceKeyLifecycleDecision,
        OnionServiceKeyMaterialDecision, OnionServiceKeyRecordId, OnionServiceLaunchPreflight,
        ProfileTransportUnlockReady, RedactedDescriptorPublicationContext,
        TransportNextRiskBoundary, TransportPhaseCloseoutDecision, TransportPreNetworkCloseout,
        TransportRuntimeError, TransportRuntimePreflight,
    };

    let mut blockers = Vec::new();
    if !matches!(
        TransportRuntimePreflight::disabled_by_default().first_runtime_blocker(),
        Some(TransportRuntimeError::RuntimeNetworkDisabled)
    ) {
        blockers.push("runtime preflight did not fail closed before inbound stream preparation".to_string());
    }

    let state_dir = app_data_root.as_ref().join("transport").join("arti-state");
    let cache_dir = app_cache_root.as_ref().join("transport").join("arti-cache");
    let dirs = another_dimension_transport::probe_app_private_state_cache_dirs(
        &state_dir, &cache_dir,
    )
    .ok();
    let backup_exclusion = dirs
        .as_ref()
        .and_then(|dirs| another_dimension_transport::verify_transport_backup_exclusion(dirs).ok());
    if dirs.is_none() {
        blockers.push("app-private state/cache directories unavailable".to_string());
    }
    if backup_exclusion.is_none() {
        blockers.push("state/cache backup exclusion not verified".to_string());
    }

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(&app_data_root, &profile)?;
    let status = production_onion_service_key_record_status(&store_path, profile, &passphrase)
        .map_err(|_| "onion service key record status failed")?;
    let key_record_present = status.key_record_present();
    if !key_record_present {
        blockers.push("onion service key record not prepared".to_string());
    }

    let key_material_ready = if key_record_present {
        backup_exclusion.as_ref()
    } else {
        None
    }
    .and_then(|backup_exclusion| {
        let lifecycle_ready =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(backup_exclusion)
                .check()
                .ok();
        let profile_unlock = ProfileTransportUnlockReady;
        let record_id = OnionServiceKeyRecordId::new("onion_service_key_material_v1").ok();
        lifecycle_ready
            .zip(record_id)
            .and_then(|(lifecycle_ready, record_id)| {
                OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
                    &profile_unlock,
                    &lifecycle_ready,
                    record_id,
                )
                .check()
                .ok()
            })
    });
    if key_material_ready.is_none() {
        blockers.push("onion service key material readiness not verified".to_string());
    }

    let redacted_events_only = true;
    let launch_result = key_material_ready.as_ref().map(|key_material_ready| {
        let profile_unlock = ProfileTransportUnlockReady;
        OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            key_material_ready,
            persistent_client_ready,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
            OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
            redacted_events_only,
        )
        .check()
    });
    let launch_preflight_ready = matches!(launch_result, Some(Ok(_)));

    let transport_phase_closeout_ready = TransportPhaseCloseoutDecision::select_onion_hosting_gate(
        BootstrapOnlyExperimentDecision::existing_manual_bootstrap_only(
            NetworkExperimentGateProposal::bootstrap_only_manual_spike(
                &TransportPreNetworkCloseout::from_blockers(Vec::new()),
                NetworkExperimentOperatorConsent::ExplicitForLocalManualSpike,
                NetworkExperimentVerificationPolicy::HeavyIsolatedTargetAndManualCiExcluded,
                NetworkExperimentTargetCachePolicy::IsolatedTemporaryTarget,
            )
            .check()
            .map_err(|error| format!("{error:?}"))?,
            BootstrapOnlyExperimentFeatureState::ArtiManualBootstrapFeature,
        )
        .check()
        .map_err(|error| format!("{error:?}"))?,
    )
    .check()
    .map_err(|error| format!("{error:?}"))?;
    if transport_phase_closeout_ready.next_boundary() != TransportNextRiskBoundary::OnionHostingGate
    {
        blockers.push("transport phase closeout did not select onion hosting gate".to_string());
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    let (manual_client_attempt_feature_compiled, feature_state) = (
        true,
        OnionHostingGateFeatureState::ArtiAdapterSpikeFeature,
    );
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let (manual_client_attempt_feature_compiled, feature_state) =
        (false, OnionHostingGateFeatureState::NotCompiled);

    let hosting_gate_result = match (launch_result, key_material_ready.as_ref()) {
        (Some(Ok(launch_ready)), Some(key_material_ready)) => {
            OnionHostingGateDecision::from_ready_boundaries(
                transport_phase_closeout_ready,
                launch_ready,
                key_material_ready,
                NetworkExperimentManualGate::FeatureGatedManualOnly,
                feature_state,
                persistent_client_ready,
            )
            .check()
            .map_err(|error| format!("{error:?}"))
        }
        (Some(Err(error)), _) => Err(format!("{error:?}")),
        (Some(Ok(_)), None) => Err("onion service key material readiness not verified".to_string()),
        (None, _) => Err(blockers
            .first()
            .cloned()
            .unwrap_or_else(|| "inbound stream inputs unavailable".to_string())),
    };

    let descriptor_gate_result = hosting_gate_result
        .map(|hosting_ready| {
            DescriptorPublicationGateDecision::pairwise_rendezvous_only(
                hosting_ready,
                OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
                redacted_events_only,
            )
            .check()
            .map_err(|error| format!("{error:?}"))
        })
        .and_then(|result| result);
    let descriptor_publication_gate_ready = descriptor_gate_result.is_ok();

    let descriptor_adapter_result = match (descriptor_gate_result, launch_preflight_ready) {
        (Ok(gate_ready), true) => DescriptorPublicationFailClosedAdapter::from_gate_ready(
            gate_ready,
            another_dimension_transport::OnionServiceLaunchReady,
        )
        .map_err(|error| format!("{error:?}"))
        .map(|adapter| (gate_ready, adapter)),
        (Err(error), _) => Err(error),
        (_, false) => Err("LaunchPreflightRequired".to_string()),
    };

    let descriptor_preparation_result = descriptor_adapter_result
        .as_ref()
        .map_err(|error| error.clone())
        .and_then(|(gate_ready, adapter)| {
            DescriptorPublicationPreparationBoundary::from_fail_closed_adapter(
                *gate_ready,
                adapter,
                RedactedDescriptorPublicationContext::pairwise_rendezvous_only(
                    OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
                ),
            )
            .check()
            .map_err(|error| format!("{error:?}"))
        });
    let descriptor_preparation_ready = descriptor_preparation_result.is_ok();

    let inbound_gate_result = descriptor_adapter_result
        .as_ref()
        .map_err(|error| error.clone())
        .and_then(|(gate_ready, adapter)| {
            InboundStreamGateDecision::from_publication_gate_and_adapter(*gate_ready, adapter)
                .check()
                .map_err(|error| format!("{error:?}"))
        });
    let inbound_stream_gate_ready = inbound_gate_result.is_ok();

    let inbound_adapter_result = inbound_gate_result
        .map(|gate_ready| {
            (
                gate_ready,
                InboundStreamFailClosedAdapter::from_gate_ready(
                    gate_ready,
                    OnionServiceDescriptorPublicationReady,
                ),
            )
        })
        .map_err(|error| error);
    let fail_closed_adapter_ready = inbound_adapter_result.is_ok();

    let inbound_preparation_result = inbound_adapter_result
        .as_ref()
        .map_err(|error| error.clone())
        .and_then(|(gate_ready, adapter)| {
            InboundStreamPreparationBoundary::from_fail_closed_adapter(*gate_ready, adapter)
                .check()
                .map_err(|error| format!("{error:?}"))
        });
    let inbound_stream_preparation_ready = inbound_preparation_result.is_ok();

    let next_blocker = match inbound_preparation_result {
        Ok(_) => "none".to_string(),
        Err(error) => error,
    };
    if !inbound_stream_preparation_ready
        && !blockers.iter().any(|blocker| blocker == &next_blocker)
    {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionInboundStreamPrepareResult {
        warning: "Inbound stream preparation only. No inbound accept, stream read/write, envelope I/O, or message transport was attempted.",
        preparation_only: true,
        manual_client_attempt_feature_compiled,
        persistent_client_ready,
        launch_preflight_ready,
        descriptor_publication_gate_ready,
        descriptor_preparation_ready,
        inbound_stream_gate_ready,
        fail_closed_adapter_ready,
        inbound_stream_preparation_ready,
        next_blocker,
        blockers,
        raw_path_returned: false,
        onion_secret_returned: false,
        descriptor_body_returned: false,
        stream_id_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        descriptor_publish_attempted: false,
        stream_accept_attempted: false,
        stream_read_write_attempted: false,
        envelope_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn run_production_onion_receive_loop_status(
    state: &ProductionOnionClientRuntimeState,
    duplicate_loop_blocked: bool,
) -> ProductionOnionReceiveLoopStatusResult {
    let profile_selected = state
        .receive_loop_profile
        .lock()
        .map(|guard| guard.is_some())
        .unwrap_or(false);
    let last_next_blocker = state
        .receive_loop_last_next_blocker
        .lock()
        .ok()
        .and_then(|guard| guard.clone());
    let worker_running = state
        .receive_loop_worker_running
        .load(std::sync::atomic::Ordering::Acquire);
    let enabled = state
        .receive_loop_enabled
        .load(std::sync::atomic::Ordering::Acquire);
    let stop_requested = state
        .receive_loop_stop_requested
        .load(std::sync::atomic::Ordering::Acquire);
    let (last_failure_kind, last_failure_retryable) =
        production_onion_receive_loop_failure_view(last_next_blocker.as_deref());
    let receive_attempt_in_flight = {
        #[cfg(feature = "manual-onion-client-attempt")]
        {
            state
                .receive_in_progress
                .load(std::sync::atomic::Ordering::Acquire)
        }
        #[cfg(not(feature = "manual-onion-client-attempt"))]
        {
            false
        }
    };
    let import_sequence = state
        .receive_loop_import_sequence
        .load(std::sync::atomic::Ordering::Acquire);
    let message_import_count = state
        .receive_loop_message_imports
        .load(std::sync::atomic::Ordering::Acquire);
    let attempt_count = state
        .receive_loop_attempts
        .load(std::sync::atomic::Ordering::Acquire);
    let generation = state
        .receive_loop_generation
        .load(std::sync::atomic::Ordering::Acquire);
    let worker_start_count = state
        .receive_loop_worker_starts
        .load(std::sync::atomic::Ordering::Acquire);
    let duplicate_start_block_count = state
        .receive_loop_duplicate_start_blocks
        .load(std::sync::atomic::Ordering::Acquire);
    let endpoint_update_count = state
        .receive_loop_endpoint_updates
        .load(std::sync::atomic::Ordering::Acquire);
    let last_attempt_succeeded = state
        .receive_loop_last_attempt_succeeded
        .load(std::sync::atomic::Ordering::Acquire);
    let last_endpoint_update_applied = state
        .receive_loop_last_endpoint_update_applied
        .load(std::sync::atomic::Ordering::Acquire);
    let (runtime_state, runtime_label) = production_onion_receive_loop_runtime_view(
        enabled,
        stop_requested,
        worker_running,
        receive_attempt_in_flight,
        last_attempt_succeeded,
        last_endpoint_update_applied,
        last_failure_kind,
        last_failure_retryable,
        last_next_blocker.as_deref(),
    );
    ProductionOnionReceiveLoopStatusResult {
        warning: if worker_running {
            "Receive loop worker was started by explicit user action. Status is redacted."
        } else {
            "Receive loop runtime status is local and redacted. It does not start network work."
        },
        enabled,
        stop_requested,
        profile_selected,
        worker_running,
        stop_confirmed: stop_requested && !enabled && !worker_running,
        receive_attempt_in_flight,
        attempt_count,
        generation,
        worker_start_count,
        duplicate_start_block_count,
        import_sequence,
        message_import_count,
        endpoint_update_count,
        active_after_import: enabled && worker_running && message_import_count > 0,
        continues_after_import: enabled
            && worker_running
            && !stop_requested
            && message_import_count > 0,
        multi_message_receive_ready: enabled
            && worker_running
            && !stop_requested
            && message_import_count > 1
            && import_sequence >= message_import_count,
        restart_generation_isolated: generation > 1
            && enabled
            && !stop_requested
            && attempt_count == 0
            && import_sequence == 0
            && message_import_count == 0
            && endpoint_update_count == 0
            && worker_start_count == 0
            && duplicate_start_block_count == 0,
        retry_wait_cancellable: true,
        last_attempt_started: state
            .receive_loop_last_attempt_started
            .load(std::sync::atomic::Ordering::Acquire),
        last_network_io_attempted: state
            .receive_loop_last_network_io_attempted
            .load(std::sync::atomic::Ordering::Acquire),
        last_stream_accept_attempted: state
            .receive_loop_last_stream_accept_attempted
            .load(std::sync::atomic::Ordering::Acquire),
        last_stream_read_write_attempted: state
            .receive_loop_last_stream_read_write_attempted
            .load(std::sync::atomic::Ordering::Acquire),
        last_envelope_io_opened: state
            .receive_loop_last_envelope_io_opened
            .load(std::sync::atomic::Ordering::Acquire),
        last_runtime_messaging_enabled: state
            .receive_loop_last_runtime_messaging_enabled
            .load(std::sync::atomic::Ordering::Acquire),
        runtime_state,
        runtime_label,
        last_attempt_succeeded,
        last_endpoint_update_applied,
        last_next_blocker,
        last_failure_kind,
        last_failure_retryable,
        duplicate_loop_blocked,
        explicit_user_start_required: true,
        starts_network_on_app_launch: false,
        raw_profile_returned: false,
        passphrase_retained: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    }
}

fn run_production_onion_receive_loop_start(
    state: &ProductionOnionClientRuntimeState,
    profile: String,
    manual_network_permission: bool,
) -> ProductionOnionReceiveLoopStatusResult {
    if !manual_network_permission {
        return run_production_onion_receive_loop_status(state, false);
    }
    if state
        .receive_loop_worker_running
        .load(std::sync::atomic::Ordering::Acquire)
    {
        state
            .receive_loop_duplicate_start_blocks
            .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
        return run_production_onion_receive_loop_status(state, true);
    }
    if state
        .receive_loop_enabled
        .compare_exchange(
            false,
            true,
            std::sync::atomic::Ordering::AcqRel,
            std::sync::atomic::Ordering::Acquire,
        )
        .is_err()
    {
        state
            .receive_loop_duplicate_start_blocks
            .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
        return run_production_onion_receive_loop_status(state, true);
    }
    state
        .receive_loop_stop_requested
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_attempts
        .store(0, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_import_sequence
        .store(0, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_message_imports
        .store(0, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_endpoint_updates
        .store(0, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_worker_starts
        .store(0, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_duplicate_start_blocks
        .store(0, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_attempt_started
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_attempt_succeeded
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_endpoint_update_applied
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_network_io_attempted
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_stream_accept_attempted
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_stream_read_write_attempted
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_envelope_io_opened
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_runtime_messaging_enabled
        .store(false, std::sync::atomic::Ordering::Release);
    if let Ok(mut guard) = state.receive_loop_last_next_blocker.lock() {
        *guard = None;
    }
    state
        .receive_loop_generation
        .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
    if let Ok(mut guard) = state.receive_loop_profile.lock() {
        *guard = Some(profile);
    }
    run_production_onion_receive_loop_status(state, false)
}

fn production_onion_receive_loop_failure_view(
    next_blocker: Option<&str>,
) -> (&'static str, bool) {
    match next_blocker.unwrap_or("none") {
        "none" => ("none", false),
        "ManualNetworkPermissionMissing" => ("manual-permission", true),
        "ManualClientAttemptFeatureNotEnabled" => ("feature-disabled", false),
        "PersistentClientNotReady" | "PersistentClientOwnerUnavailable" => {
            ("persistent-client", true)
        }
        "InboundEnvelopeReceiveAlreadyInProgress" => ("busy", true),
        "InboundEnvelopeImportIncomplete"
        | "InboundEnvelopeImportFailed"
        | "InboundEnvelopeDecodeFailed"
        | "InboundEnvelopeSanitizeFailed"
        | "InboundEnvelopeUtf8Failed"
        | "InboundControlEnvelopeImportIncomplete"
        | "InboundControlEnvelopeImportFailed"
        | "InboundAckEnvelopeImportUnsupported" => ("import", true),
        blocker if blocker.contains("Timeout") || blocker.contains("timeout") => {
            ("receive-timeout", true)
        }
        blocker
            if blocker.contains("Accept")
                || blocker.contains("Rend")
                || blocker.contains("Stream")
                || blocker.contains("Unavailable") =>
        {
            ("peer-offline", true)
        }
        "ReceiveLoopAttemptFailed" => ("attempt-failed", true),
        _ => ("unknown-retryable", true),
    }
}

fn production_onion_receive_loop_runtime_view(
    enabled: bool,
    stop_requested: bool,
    worker_running: bool,
    receive_attempt_in_flight: bool,
    last_attempt_succeeded: bool,
    last_endpoint_update_applied: bool,
    last_failure_kind: &str,
    last_failure_retryable: bool,
    last_next_blocker: Option<&str>,
) -> (&'static str, &'static str) {
    if stop_requested || (!enabled && !worker_running) {
        return ("stopped", "Receive mode stopped");
    }
    if last_attempt_succeeded || last_endpoint_update_applied {
        return ("message-imported", "Receive mode imported message or endpoint update");
    }
    if receive_attempt_in_flight {
        return ("peer-connected", "Receive mode peer connected");
    }
    match last_failure_kind {
        "persistent-client" => {
            return ("bootstrapping", "Receive mode waiting for Tor bootstrap");
        }
        "peer-offline" | "receive-timeout" if worker_running => {
            return ("receiving", "Receive mode receiving");
        }
        _ => {}
    }
    if last_next_blocker
        .map(|blocker| {
            blocker.contains("Descriptor")
                || blocker.contains("Launch")
                || blocker.contains("InboundStream")
                || blocker.contains("Publication")
                || blocker.contains("Service")
        })
        .unwrap_or(false)
    {
        return ("launching-service", "Receive mode waiting for onion service");
    }
    if last_failure_retryable {
        return ("failed-retryable", "Receive mode retryable failure");
    }
    if worker_running || enabled {
        return ("receiving", "Receive mode receiving");
    }
    ("stopped", "Receive mode stopped")
}

fn run_production_onion_receive_loop_worker_started(
    state: &ProductionOnionClientRuntimeState,
) -> ProductionOnionReceiveLoopStatusResult {
    state
        .receive_loop_worker_running
        .store(true, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_worker_starts
        .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
    run_production_onion_receive_loop_status(state, false)
}

fn run_production_onion_receive_loop_stop(
    state: &ProductionOnionClientRuntimeState,
) -> ProductionOnionReceiveLoopStatusResult {
    state
        .receive_loop_stop_requested
        .store(true, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_enabled
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_generation
        .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
    if let Ok(mut guard) = state.receive_loop_profile.lock() {
        *guard = None;
    }
    run_production_onion_receive_loop_status(state, false)
}

fn run_production_onion_receive_loop_worker_finished(state: &ProductionOnionClientRuntimeState) {
    state
        .receive_loop_worker_running
        .store(false, std::sync::atomic::Ordering::Release);
}

fn run_production_onion_receive_loop_record_attempt_result(
    state: &ProductionOnionClientRuntimeState,
    result: &ProductionOnionInboundEnvelopeReceiveAttemptResult,
) {
    state
        .receive_loop_last_attempt_started
        .store(result.receive_attempt_started, std::sync::atomic::Ordering::Release);
    state.receive_loop_last_attempt_succeeded.store(
        result.receive_attempt_succeeded,
        std::sync::atomic::Ordering::Release,
    );
    state.receive_loop_last_endpoint_update_applied.store(
        result.endpoint_update_applied,
        std::sync::atomic::Ordering::Release,
    );
    state.receive_loop_last_network_io_attempted.store(
        result.network_io_attempted,
        std::sync::atomic::Ordering::Release,
    );
    state.receive_loop_last_stream_accept_attempted.store(
        result.stream_accept_attempted,
        std::sync::atomic::Ordering::Release,
    );
    state.receive_loop_last_stream_read_write_attempted.store(
        result.stream_read_write_attempted,
        std::sync::atomic::Ordering::Release,
    );
    state.receive_loop_last_envelope_io_opened.store(
        result.envelope_io_opened,
        std::sync::atomic::Ordering::Release,
    );
    state.receive_loop_last_runtime_messaging_enabled.store(
        result.runtime_messaging_enabled,
        std::sync::atomic::Ordering::Release,
    );
    if let Ok(mut guard) = state.receive_loop_last_next_blocker.lock() {
        *guard = Some(result.next_blocker.clone());
    }
    if result.receive_attempt_succeeded || result.endpoint_update_applied {
        state
            .receive_loop_import_sequence
            .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
    }
    if result.receive_attempt_succeeded {
        state
            .receive_loop_message_imports
            .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
    }
    if result.endpoint_update_applied {
        state
            .receive_loop_endpoint_updates
            .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
    }
}

fn run_production_onion_receive_loop_record_attempt_error(
    state: &ProductionOnionClientRuntimeState,
) {
    state
        .receive_loop_last_attempt_started
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_attempt_succeeded
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_endpoint_update_applied
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_network_io_attempted
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_stream_accept_attempted
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_stream_read_write_attempted
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_envelope_io_opened
        .store(false, std::sync::atomic::Ordering::Release);
    state
        .receive_loop_last_runtime_messaging_enabled
        .store(false, std::sync::atomic::Ordering::Release);
    if let Ok(mut guard) = state.receive_loop_last_next_blocker.lock() {
        *guard = Some("ReceiveLoopAttemptFailed".to_string());
    }
}

fn production_onion_receive_loop_should_continue(
    state: &ProductionOnionClientRuntimeState,
) -> bool {
    state
        .receive_loop_enabled
        .load(std::sync::atomic::Ordering::Acquire)
        && !state
            .receive_loop_stop_requested
            .load(std::sync::atomic::Ordering::Acquire)
}

fn production_onion_receive_loop_retry_wait_millis(
    last_failure_kind: &str,
) -> u64 {
    match last_failure_kind {
        "manual-permission" | "persistent-client" => 1_000,
        "busy" => 500,
        "receive-timeout" | "peer-offline" | "attempt-failed" => 3_000,
        "feature-disabled" => 5_000,
        _ => 2_000,
    }
}

async fn production_onion_receive_loop_wait_or_stop(
    state: &ProductionOnionClientRuntimeState,
    total_wait_millis: u64,
) -> bool {
    let mut remaining = total_wait_millis;
    while remaining > 0 {
        if !production_onion_receive_loop_should_continue(state) {
            return false;
        }
        let step = remaining.min(100);
        tokio::time::sleep(std::time::Duration::from_millis(step)).await;
        remaining -= step;
    }
    production_onion_receive_loop_should_continue(state)
}

fn spawn_production_onion_receive_loop_worker(
    app: tauri::AppHandle,
    app_data_root: std::path::PathBuf,
    app_cache_root: std::path::PathBuf,
    profile: String,
    passphrase: String,
) {
    tauri::async_runtime::spawn(async move {
        loop {
            let state = app.state::<ProductionOnionClientRuntimeState>();
            if !production_onion_receive_loop_should_continue(&state) {
                run_production_onion_receive_loop_worker_finished(&state);
                break;
            }

            match run_production_onion_inbound_envelope_receive_attempt(
                &app_data_root,
                &app_cache_root,
                &state,
                profile.clone(),
                passphrase.clone(),
                true,
            )
            .await
            {
                Ok(result) => run_production_onion_receive_loop_record_attempt_result(&state, &result),
                Err(_) => run_production_onion_receive_loop_record_attempt_error(&state),
            }

            if !production_onion_receive_loop_should_continue(&state) {
                run_production_onion_receive_loop_worker_finished(&state);
                break;
            }
            let failure_kind = run_production_onion_receive_loop_status(&state, false)
                .last_failure_kind
                .to_string();
            let wait_millis = production_onion_receive_loop_retry_wait_millis(&failure_kind);
            if !production_onion_receive_loop_wait_or_stop(&state, wait_millis).await {
                run_production_onion_receive_loop_worker_finished(&state);
                break;
            }
        }
    });
}

async fn run_production_onion_inbound_envelope_receive_attempt(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    state: &ProductionOnionClientRuntimeState,
    profile: String,
    passphrase: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionInboundEnvelopeReceiveAttemptResult, String> {
    #[cfg(feature = "manual-onion-client-attempt")]
    let promoted_cached_owner = if manual_network_permission {
        promote_cached_real_onion_roundtrip_owner_to_persistent_owner(
            state,
            app_data_root.as_ref(),
            app_cache_root.as_ref(),
            &profile,
        )
    } else {
        false
    };
    let persistent_client_ready = run_production_onion_persistent_client_ready(state)?;
    #[cfg(feature = "manual-onion-client-attempt")]
    let profile_for_import = profile.clone();
    #[cfg(feature = "manual-onion-client-attempt")]
    let passphrase_for_import = passphrase.clone();
    let prepare = run_production_onion_inbound_stream_prepare(
        &app_data_root,
        &app_cache_root,
        profile,
        passphrase,
        persistent_client_ready,
    )?;
    if state
        .receive_loop_enabled
        .load(std::sync::atomic::Ordering::Acquire)
    {
        state
            .receive_loop_attempts
            .fetch_add(1, std::sync::atomic::Ordering::AcqRel);
    }
    let mut blockers = prepare.blockers.clone();
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut event_summary = Vec::new();
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let event_summary = Vec::new();
    #[cfg(feature = "manual-onion-client-attempt")]
    if promoted_cached_owner {
        event_summary.push("persistent_client_promoted_from_real_onion_cache".to_string());
    }
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut next_blocker;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let next_blocker;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut receive_attempt_started = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let receive_attempt_started = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let receive_attempt_succeeded = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut inbound_rend_request_stream_ready = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let inbound_rend_request_stream_ready = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut accepted_stream_request_stream_ready = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let accepted_stream_request_stream_ready = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut inbound_rend_request_accept_attempted = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let inbound_rend_request_accept_attempted = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut inbound_rend_request_accepted = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let inbound_rend_request_accepted = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut stream_request_accept_attempted = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let stream_request_accept_attempted = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut stream_request_accepted = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let stream_request_accepted = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut stream_read_attempted = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let stream_read_attempted = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut stream_bytes_read = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let stream_bytes_read = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut received_envelope_ready = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let received_envelope_ready = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut inbound_import_attempted = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let inbound_import_attempted = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut control_envelope_imported = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let control_envelope_imported = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut endpoint_update_applied = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let endpoint_update_applied = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut stale_endpoint_status_cleared = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let stale_endpoint_status_cleared = false;

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = state;
        next_blocker = "ManualClientAttemptFeatureNotEnabled".to_string();
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        return Ok(ProductionOnionInboundEnvelopeReceiveAttemptResult {
            warning: "Inbound envelope receive attempt is feature-disabled in this build. No onion service accept, stream read/write, envelope I/O, or message import was attempted.",
            preparation_only: false,
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: manual_network_permission,
            persistent_client_ready,
            persistent_client_promoted_from_real_onion_cache: false,
            inbound_stream_preparation_ready: prepare.inbound_stream_preparation_ready,
            inbound_rend_request_stream_ready,
            inbound_rend_request_accept_attempted,
            inbound_rend_request_accepted,
            accepted_stream_request_stream_ready,
            stream_request_accept_attempted,
            stream_request_accepted,
            stream_read_attempted,
            stream_bytes_read,
            receive_attempt_started,
            receive_attempt_succeeded,
            received_envelope_ready,
            inbound_import_attempted,
            control_envelope_imported,
            endpoint_update_applied,
            stale_endpoint_status_cleared,
            redacted_receive_result_event_recorded: !event_summary.is_empty(),
            event_summary,
            next_blocker,
            blockers,
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            descriptor_body_returned: false,
            stream_id_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            descriptor_publish_attempted: false,
            stream_accept_attempted: false,
            stream_read_write_attempted: false,
            envelope_io_opened: false,
            runtime_messaging_enabled: false,
        });
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_transport::{arti_adapter_spike, InMemoryTransportRuntimeEventSink};

        if !manual_network_permission {
            next_blocker = "ManualNetworkPermissionMissing".to_string();
        } else if !persistent_client_ready {
            next_blocker = "PersistentClientNotReady".to_string();
        } else if !prepare.inbound_stream_preparation_ready {
            next_blocker = prepare.next_blocker.clone();
        } else if state
            .receive_in_progress
            .swap(true, std::sync::atomic::Ordering::AcqRel)
        {
            next_blocker = "InboundEnvelopeReceiveAlreadyInProgress".to_string();
        } else {
            next_blocker = "none".to_string();
            let mut owner = match state.owner.lock() {
                Ok(mut guard) => guard.take(),
                Err(_) => None,
            };
            match owner.as_mut() {
                Some(owner) => {
                    inbound_rend_request_stream_ready =
                        owner.summary().inbound_rend_request_stream_owned();
                    let mut sink = InMemoryTransportRuntimeEventSink::default();
                    receive_attempt_started = true;
                    inbound_rend_request_accept_attempted = true;
                    let mut recorded_event_count = 0;
                    let result = owner.accept_inbound_rend_request_once(
                        arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
                        &mut sink,
                    ).await;
                    event_summary.extend(sink.events()[recorded_event_count..].iter().map(ToString::to_string));
                    recorded_event_count = sink.events().len();
                    match result {
                        Ok(()) => {
                            inbound_rend_request_accepted = true;
                            accepted_stream_request_stream_ready =
                                owner.summary().accepted_stream_request_stream_owned();
                            stream_request_accept_attempted = true;
                            stream_read_attempted = true;
                            let read_result = owner.read_accepted_inbound_stream_once(
                                arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
                                4096,
                                &mut sink,
                            ).await;
                            event_summary.extend(sink.events()[recorded_event_count..].iter().map(ToString::to_string));
                            match read_result {
                                Ok(envelope_bytes) => {
                                    stream_request_accepted = true;
                                    stream_bytes_read = !envelope_bytes.is_empty();
                                    let envelope_payload = match String::from_utf8(envelope_bytes)
                                    {
                                        Ok(payload) => match sanitize_envelope_payload(payload) {
                                            Ok(payload) => Some(payload),
                                            Err(_) => {
                                                next_blocker =
                                                    "InboundEnvelopeSanitizeFailed".to_string();
                                                None
                                            }
                                        },
                                        Err(_) => {
                                            next_blocker =
                                                "InboundEnvelopeUtf8Failed".to_string();
                                            None
                                        }
                                    };
                                    if let Some(envelope_payload) = envelope_payload {
                                        match another_dimension_protocol::Envelope::decode(
                                            &envelope_payload,
                                        ) {
                                            Ok(envelope) => {
                                                inbound_import_attempted = true;
                                                match envelope.message_type {
                                                    another_dimension_protocol::MessageType::Data => {
                                                        match run_production_message_retention_preference_get(
                                                            app_data_root.as_ref(),
                                                            profile_for_import.clone(),
                                                            passphrase_for_import.clone(),
                                                        )
                                                        .and_then(|retention| {
                                                            run_production_message_envelope_import(
                                                                app_data_root.as_ref(),
                                                                profile_for_import.clone(),
                                                                passphrase_for_import.clone(),
                                                                envelope.message_number,
                                                                envelope_payload,
                                                                retention.message_ttl_seconds,
                                                            )
                                                        }) {
                                                            Ok(import) => {
                                                                received_envelope_ready =
                                                                    import.received_message_written
                                                                        && import.received_message_record_present
                                                                        && import.received_message_record_decodable
                                                                        && import
                                                                            .received_message_matches_session;
                                                                next_blocker = if received_envelope_ready {
                                                                    "none".to_string()
                                                                } else {
                                                                    "InboundEnvelopeImportIncomplete".to_string()
                                                                };
                                                            }
                                                            Err(_) => {
                                                                next_blocker =
                                                                    "InboundEnvelopeImportFailed".to_string();
                                                            }
                                                        }
                                                    }
                                                    another_dimension_protocol::MessageType::Control => {
                                                        match run_production_endpoint_update_control_envelope_import(
                                                            app_data_root.as_ref(),
                                                            profile_for_import.clone(),
                                                            passphrase_for_import.clone(),
                                                            envelope_payload,
                                                        ) {
                                                            Ok(import) => {
                                                                control_envelope_imported = true;
                                                                endpoint_update_applied =
                                                                    import.endpoint_update_applied;
                                                                stale_endpoint_status_cleared =
                                                                    import.stale_endpoint_status_cleared;
                                                                received_envelope_ready =
                                                                    endpoint_update_applied;
                                                                next_blocker = if endpoint_update_applied {
                                                                    "none".to_string()
                                                                } else {
                                                                    "InboundControlEnvelopeImportIncomplete"
                                                                        .to_string()
                                                                };
                                                            }
                                                            Err(_) => {
                                                                next_blocker =
                                                                    "InboundControlEnvelopeImportFailed"
                                                                        .to_string();
                                                            }
                                                        }
                                                    }
                                                    another_dimension_protocol::MessageType::Ack => {
                                                        next_blocker =
                                                            "InboundAckEnvelopeImportUnsupported"
                                                                .to_string();
                                                    }
                                                }
                                            }
                                            Err(_) => {
                                                next_blocker =
                                                    "InboundEnvelopeDecodeFailed".to_string();
                                            }
                                        }
                                    }
                                }
                                Err(error) => {
                                    next_blocker = format!("{error:?}");
                                }
                            }
                        }
                        Err(error) => {
                            next_blocker = format!("{error:?}");
                        }
                    }
                }
                None => {
                    next_blocker = "PersistentClientOwnerUnavailable".to_string();
                }
            }
            if let Ok(mut guard) = state.owner.lock() {
                *guard = owner;
            }
            state
                .receive_in_progress
                .store(false, std::sync::atomic::Ordering::Release);
        }

        if next_blocker != "none" && !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        Ok(ProductionOnionInboundEnvelopeReceiveAttemptResult {
            warning: "Inbound envelope receive attempt boundary. With manual network permission and a retained onion service, it attempts accept/read/import and returns only redacted status.",
            preparation_only: false,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: manual_network_permission,
            persistent_client_ready,
            persistent_client_promoted_from_real_onion_cache: promoted_cached_owner,
            inbound_stream_preparation_ready: prepare.inbound_stream_preparation_ready,
            inbound_rend_request_stream_ready,
            inbound_rend_request_accept_attempted,
            inbound_rend_request_accepted,
            accepted_stream_request_stream_ready,
            stream_request_accept_attempted,
            stream_request_accepted,
            stream_read_attempted,
            stream_bytes_read,
            receive_attempt_started,
            receive_attempt_succeeded: received_envelope_ready,
            received_envelope_ready,
            inbound_import_attempted,
            control_envelope_imported,
            endpoint_update_applied,
            stale_endpoint_status_cleared,
            redacted_receive_result_event_recorded: !event_summary.is_empty(),
            event_summary,
            next_blocker,
            blockers,
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            descriptor_body_returned: false,
            stream_id_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: false,
            network_io_attempted: receive_attempt_started,
            descriptor_publish_attempted: false,
            stream_accept_attempted: inbound_rend_request_accept_attempted
                || stream_request_accept_attempted,
            stream_read_write_attempted: stream_read_attempted,
            envelope_io_opened: inbound_import_attempted || control_envelope_imported,
            runtime_messaging_enabled: received_envelope_ready,
        })
    }
}

fn run_production_onion_outbound_stream_prepare(
    rendezvous_endpoint: String,
) -> Result<ProductionOnionOutboundStreamPrepareResult, String> {
    use another_dimension_identity::ContactId;
    use another_dimension_transport::{
        OnionServiceEndpoint, OutboundStreamFailClosedAdapter, OutboundStreamGateDecision,
        OutboundStreamPreparationBoundary, PairwiseRendezvousEndpoint,
        RendezvousEndpointIdentityBinding, RendezvousEndpointScope, TransportPolicy,
    };

    let mut blockers = Vec::new();
    let endpoint = sanitize_pairing_rendezvous_endpoint(rendezvous_endpoint)?;
    let onion_endpoint = OnionServiceEndpoint::new(endpoint).map_err(|_| {
        "production onion outbound stream prepare rejected endpoint without exposing details"
            .to_string()
    })?;
    let contact_id = ContactId::new("manual_peer").map_err(|_| {
        "production onion outbound stream prepare rejected contact without exposing details"
            .to_string()
    })?;
    let pairwise_endpoint = PairwiseRendezvousEndpoint::new(
        contact_id,
        onion_endpoint,
        RendezvousEndpointScope::PairwiseContact,
        RendezvousEndpointIdentityBinding::TransportScoped,
    )
    .map_err(|_| {
        "production onion outbound stream prepare rejected pairwise endpoint without exposing details"
            .to_string()
    })?;

    let policy = TransportPolicy::high_risk_default();
    let gate_result =
        OutboundStreamGateDecision::from_pairwise_endpoint_and_policy(
            pairwise_endpoint.clone(),
            policy.clone(),
        )
        .check()
        .map_err(|error| format!("{error:?}"));
    let outbound_stream_gate_ready = gate_result.is_ok();

    let adapter_result = gate_result
        .map(|gate_ready| {
            OutboundStreamFailClosedAdapter::from_gate_ready(
                gate_ready,
                pairwise_endpoint,
                policy,
            )
            .map_err(|error| format!("{error:?}"))
            .map(|adapter| (gate_ready, adapter))
        })
        .and_then(|result| result);
    let fail_closed_adapter_ready = adapter_result.is_ok();

    let preparation_result = adapter_result
        .as_ref()
        .map_err(|error| error.clone())
        .and_then(|(gate_ready, adapter)| {
            OutboundStreamPreparationBoundary::from_fail_closed_adapter(*gate_ready, adapter)
                .check()
                .map_err(|error| format!("{error:?}"))
        });
    let outbound_stream_preparation_ready = preparation_result.is_ok();
    let next_blocker = match preparation_result {
        Ok(_) => "none".to_string(),
        Err(error) => error,
    };
    if !outbound_stream_preparation_ready {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionOutboundStreamPrepareResult {
        warning: "Outbound stream preparation only. No outbound dial, stream send, envelope I/O, or message transport was attempted.",
        preparation_only: true,
        endpoint_accepted: true,
        pairwise_endpoint_ready: true,
        high_risk_onion_policy_ready: true,
        outbound_stream_gate_ready,
        fail_closed_adapter_ready,
        outbound_stream_preparation_ready,
        next_blocker,
        blockers,
        raw_endpoint_returned: false,
        raw_path_returned: false,
        onion_secret_returned: false,
        stream_id_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        stream_dial_attempted: false,
        stream_send_attempted: false,
        envelope_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn run_production_onion_stream_adapter_closeout_prepare(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
    persistent_client_ready: bool,
) -> Result<ProductionOnionStreamAdapterCloseoutPrepareResult, String> {
    use another_dimension_identity::ContactId;
    use another_dimension_transport::{
        InboundStreamFailClosedAdapter, InboundStreamGateReady, InboundStreamPreparationBoundary,
        OnionServiceDescriptorPublicationReady, OnionServiceEndpoint,
        OutboundStreamFailClosedAdapter, OutboundStreamGateDecision,
        OutboundStreamPreparationBoundary, PairwiseRendezvousEndpoint,
        RendezvousEndpointIdentityBinding, RendezvousEndpointScope,
        StreamAdapterCloseoutDecision, StreamCloseoutIntegrationOrder, TransportPolicy,
    };

    #[cfg(feature = "manual-onion-client-attempt")]
    let manual_client_attempt_feature_compiled = true;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let manual_client_attempt_feature_compiled = false;

    let inbound = run_production_onion_inbound_stream_prepare(
        &app_data_root,
        &app_cache_root,
        profile,
        passphrase,
        persistent_client_ready,
    )?;
    let outbound = run_production_onion_outbound_stream_prepare(rendezvous_endpoint.clone())?;

    let mut blockers = inbound.blockers.clone();
    for blocker in outbound.blockers.iter() {
        if !blockers.iter().any(|existing| existing == blocker) {
            blockers.push(blocker.clone());
        }
    }

    let closeout_result = if inbound.inbound_stream_preparation_ready
        && outbound.outbound_stream_preparation_ready
    {
        let inbound_gate_ready = InboundStreamGateReady;
        let inbound_adapter = InboundStreamFailClosedAdapter::from_gate_ready(
            inbound_gate_ready,
            OnionServiceDescriptorPublicationReady,
        );
        let inbound_preparation =
            InboundStreamPreparationBoundary::from_fail_closed_adapter(
                inbound_gate_ready,
                &inbound_adapter,
            )
            .check()
            .map_err(|error| format!("{error:?}"))?;

        let endpoint = sanitize_pairing_rendezvous_endpoint(rendezvous_endpoint)?;
        let onion_endpoint = OnionServiceEndpoint::new(endpoint).map_err(|_| {
            "production onion stream adapter closeout prepare rejected endpoint without exposing details"
                .to_string()
        })?;
        let contact_id = ContactId::new("manual_peer").map_err(|_| {
            "production onion stream adapter closeout prepare rejected contact without exposing details"
                .to_string()
        })?;
        let pairwise_endpoint = PairwiseRendezvousEndpoint::new(
            contact_id,
            onion_endpoint,
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .map_err(|_| {
            "production onion stream adapter closeout prepare rejected pairwise endpoint without exposing details"
                .to_string()
        })?;
        let policy = TransportPolicy::high_risk_default();
        let outbound_gate_ready = OutboundStreamGateDecision::from_pairwise_endpoint_and_policy(
            pairwise_endpoint.clone(),
            policy.clone(),
        )
        .check()
        .map_err(|error| format!("{error:?}"))?;
        let outbound_adapter = OutboundStreamFailClosedAdapter::from_gate_ready(
            outbound_gate_ready,
            pairwise_endpoint,
            policy,
        )
        .map_err(|error| format!("{error:?}"))?;
        let outbound_preparation =
            OutboundStreamPreparationBoundary::from_fail_closed_adapter(
                outbound_gate_ready,
                &outbound_adapter,
            )
            .check()
            .map_err(|error| format!("{error:?}"))?;

        StreamAdapterCloseoutDecision::from_fail_closed_adapters(
            &inbound_adapter,
            &outbound_adapter,
            inbound_preparation,
            outbound_preparation,
        )
        .check()
        .map_err(|error| format!("{error:?}"))
    } else {
        let blocker = blockers
            .first()
            .cloned()
            .unwrap_or_else(|| "stream adapter closeout inputs unavailable".to_string());
        Err(blocker)
    };

    let closeout_ready = closeout_result.is_ok();
    let closeout_integration_ready = closeout_result
        .map(StreamCloseoutIntegrationOrder::from_closeout_ready)
        .and_then(|order| order.check().map_err(|error| format!("{error:?}")));
    let remote_peer_authentication_next = closeout_integration_ready.is_ok();
    let verified_pairwise_session_after_remote_authentication = closeout_integration_ready.is_ok();
    let next_blocker = match closeout_integration_ready {
        Ok(_) => "none".to_string(),
        Err(error) => error,
    };
    if !closeout_ready && !blockers.iter().any(|blocker| blocker == &next_blocker) {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionStreamAdapterCloseoutPrepareResult {
        warning: "Stream adapter closeout preparation only. No stream accept, dial, read/write, envelope I/O, or message transport was attempted.",
        preparation_only: true,
        manual_client_attempt_feature_compiled,
        persistent_client_ready,
        inbound_stream_preparation_ready: inbound.inbound_stream_preparation_ready,
        outbound_stream_preparation_ready: outbound.outbound_stream_preparation_ready,
        stream_adapter_closeout_ready: closeout_ready,
        remote_peer_authentication_next,
        verified_pairwise_session_after_remote_authentication,
        next_blocker,
        blockers,
        raw_endpoint_returned: false,
        raw_path_returned: false,
        onion_secret_returned: false,
        descriptor_body_returned: false,
        stream_id_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        descriptor_publish_attempted: false,
        stream_accept_attempted: false,
        stream_dial_attempted: false,
        stream_read_write_attempted: false,
        stream_send_attempted: false,
        envelope_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn run_production_onion_remote_peer_authentication_prepare(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
    persistent_client_ready: bool,
) -> Result<ProductionOnionRemotePeerAuthenticationPrepareResult, String> {
    use another_dimension_core::production::production_pairing_session_open_runtime;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::RemotePeerAuthenticationReady;

    let closeout = run_production_onion_stream_adapter_closeout_prepare(
        &app_data_root,
        &app_cache_root,
        profile.clone(),
        passphrase.clone(),
        rendezvous_endpoint,
        persistent_client_ready,
    )?;
    let mut blockers = closeout.blockers.clone();
    let session_runtime = if closeout.stream_adapter_closeout_ready {
        let profile = sanitize_production_profile(profile)?;
        let passphrase = ProfilePassphrase::new(passphrase.trim())
            .map_err(|_| "invalid production profile passphrase")?;
        let store_path = production_profile_store_path(app_data_root, &profile)?;
        production_pairing_session_open_runtime(&store_path, profile, &passphrase).ok()
    } else {
        None
    };
    let stored_pairwise_session_ready = session_runtime.as_ref().is_some_and(|runtime| {
        runtime.runtime_material_reconstructable()
            && runtime.session_binding_ready()
            && runtime.remote_peer_authentication_ready()
    });
    let outbound_envelope_io_boundary_ready = session_runtime
        .as_ref()
        .is_some_and(|runtime| runtime.outbound_envelope_io_ready());
    let fallback_authentication_result = if closeout.stream_adapter_closeout_ready
        && !stored_pairwise_session_ready
    {
        RemotePeerAuthenticationReady::from_missing_peer_proof()
            .map(|_| ())
            .map_err(|error| format!("{error:?}"))
    } else if closeout.stream_adapter_closeout_ready {
        Ok(())
    } else {
        Err(closeout.next_blocker.clone())
    };
    let remote_peer_authentication_ready = closeout.stream_adapter_closeout_ready
        && stored_pairwise_session_ready
        && fallback_authentication_result.is_ok();
    let verified_pairwise_session_binding_ready =
        remote_peer_authentication_ready && stored_pairwise_session_ready;
    let bound_stream_session_ready =
        verified_pairwise_session_binding_ready && outbound_envelope_io_boundary_ready;
    let next_blocker = if remote_peer_authentication_ready {
        "none".to_string()
    } else {
        match fallback_authentication_result {
            Ok(_) => "StoredPairwiseSessionRequired".to_string(),
            Err(error) => error,
        }
    };
    if next_blocker != "none" && !blockers.iter().any(|blocker| blocker == &next_blocker) {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionRemotePeerAuthenticationPrepareResult {
        warning: "Remote peer authentication boundary only. It can use a stored verified pairwise session as redacted authentication context, but no live peer challenge, stream read/write, envelope I/O, or message transport was attempted.",
        preparation_only: true,
        stream_adapter_closeout_ready: closeout.stream_adapter_closeout_ready,
        remote_peer_authentication_required: true,
        stored_pairwise_session_ready,
        remote_peer_authentication_ready,
        verified_pairwise_session_binding_ready,
        bound_stream_session_ready,
        outbound_envelope_io_boundary_ready,
        next_blocker,
        blockers,
        raw_endpoint_returned: false,
        raw_path_returned: false,
        onion_secret_returned: false,
        peer_proof_returned: false,
        session_transcript_returned: false,
        key_material_exposed: false,
        network_io_attempted: false,
        stream_accept_attempted: false,
        stream_dial_attempted: false,
        stream_read_write_attempted: false,
        stream_send_attempted: false,
        envelope_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn run_production_onion_outbound_envelope_send_prepare(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
    message_number: u64,
    persistent_client_ready: bool,
) -> Result<ProductionOnionOutboundEnvelopeSendPrepareResult, String> {
    use another_dimension_core::production::production_message_outbound_envelope_export;
    use another_dimension_storage::production::ProfilePassphrase;
    use another_dimension_transport::{
        RedactedTransportRuntimeEvent, TransportRuntimeError, TransportTransferDirection,
    };

    if message_number == 0 {
        return Err("message number is required".to_string());
    }

    let remote_auth = run_production_onion_remote_peer_authentication_prepare(
        &app_data_root,
        &app_cache_root,
        profile.clone(),
        passphrase.clone(),
        rendezvous_endpoint,
        persistent_client_ready,
    )?;
    let mut blockers = remote_auth.blockers.clone();
    let envelope = if remote_auth.bound_stream_session_ready {
        let profile = sanitize_production_profile(profile)?;
        let passphrase = ProfilePassphrase::new(passphrase.trim())
            .map_err(|_| "invalid production profile passphrase")?;
        let store_path = production_profile_store_path(app_data_root, &profile)?;
        production_message_outbound_envelope_export(
            &store_path,
            profile,
            &passphrase,
            message_number,
        )
        .ok()
    } else {
        None
    };
    let stored_outbound_envelope_ready = envelope.as_ref().is_some_and(|envelope| {
        envelope.encrypted_envelope_present()
            && envelope.envelope_decodable()
            && envelope.envelope_message_number_matches()
    });
    let envelope_decodable = envelope
        .as_ref()
        .is_some_and(|envelope| envelope.envelope_decodable());
    let envelope_message_number_matches = envelope
        .as_ref()
        .is_some_and(|envelope| envelope.envelope_message_number_matches());
    let send_intent_prepared = remote_auth.remote_peer_authentication_ready
        && remote_auth.bound_stream_session_ready
        && remote_auth.outbound_envelope_io_boundary_ready
        && stored_outbound_envelope_ready;
    let ack_wait_registered = send_intent_prepared;
    let event_summary = if send_intent_prepared {
        vec![RedactedTransportRuntimeEvent::transfer_failed(
            TransportTransferDirection::Send,
            TransportRuntimeError::SendFailed,
        )
        .to_string()]
    } else {
        Vec::new()
    };
    let redacted_send_result_event_recorded = !event_summary.is_empty();
    let next_blocker = if send_intent_prepared {
        "none".to_string()
    } else if !remote_auth.remote_peer_authentication_ready {
        remote_auth.next_blocker.clone()
    } else if !stored_outbound_envelope_ready {
        "StoredOutboundEnvelopeRequired".to_string()
    } else {
        "OutboundEnvelopeSendIntentBlocked".to_string()
    };
    if next_blocker != "none" && !blockers.iter().any(|blocker| blocker == &next_blocker) {
        blockers.push(next_blocker.clone());
    }

    Ok(ProductionOnionOutboundEnvelopeSendPrepareResult {
        warning: "Outbound envelope send prepare boundary only. A stored encrypted envelope can be matched to the verified pairwise stream session, but no stream dial, stream send, envelope I/O, or message transport was attempted.",
        preparation_only: true,
        remote_peer_authentication_ready: remote_auth.remote_peer_authentication_ready,
        bound_stream_session_ready: remote_auth.bound_stream_session_ready,
        outbound_envelope_io_boundary_ready: remote_auth.outbound_envelope_io_boundary_ready,
        stored_outbound_envelope_ready,
        envelope_decodable,
        envelope_message_number_matches,
        send_intent_prepared,
        ack_wait_registered,
        redacted_send_result_event_recorded,
        event_summary,
        next_blocker,
        blockers,
        raw_endpoint_returned: false,
        raw_path_returned: false,
        onion_secret_returned: false,
        peer_proof_returned: false,
        session_transcript_returned: false,
        envelope_payload_returned: false,
        key_material_exposed: envelope
            .as_ref()
            .is_some_and(|envelope| envelope.key_material_exposed()),
        network_io_attempted: false,
        stream_accept_attempted: false,
        stream_dial_attempted: false,
        stream_read_write_attempted: false,
        stream_send_attempted: false,
        envelope_io_opened: false,
        runtime_messaging_enabled: envelope
            .as_ref()
            .is_some_and(|envelope| envelope.runtime_messaging_enabled()),
    })
}

async fn run_production_onion_outbound_envelope_send_attempt(
    app_data_root: impl AsRef<std::path::Path>,
    app_cache_root: impl AsRef<std::path::Path>,
    state: &ProductionOnionClientRuntimeState,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
    message_number: u64,
    manual_network_permission: bool,
) -> Result<ProductionOnionOutboundEnvelopeSendAttemptResult, String> {
    #[cfg(feature = "manual-onion-client-attempt")]
    let promoted_cached_owner = if manual_network_permission {
        promote_cached_real_onion_roundtrip_owner_to_persistent_owner(
            state,
            app_data_root.as_ref(),
            app_cache_root.as_ref(),
            &profile,
        )
    } else {
        false
    };
    let persistent_client_ready = run_production_onion_persistent_client_ready(state)?;
    let prepare = run_production_onion_outbound_envelope_send_prepare(
        &app_data_root,
        &app_cache_root,
        profile.clone(),
        passphrase.clone(),
        rendezvous_endpoint.clone(),
        message_number,
        persistent_client_ready,
    )?;
    let mut blockers = prepare.blockers.clone();
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut event_summary = Vec::new();
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let event_summary = Vec::new();
    let next_blocker;
    #[cfg(feature = "manual-onion-client-attempt")]
    if promoted_cached_owner {
        event_summary.push("persistent_client_promoted_from_real_onion_cache".to_string());
    }
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut send_attempt_started = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let send_attempt_started = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut send_attempt_succeeded = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let send_attempt_succeeded = false;

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = state;
        next_blocker = "ManualClientAttemptFeatureNotEnabled".to_string();
        if !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        return Ok(ProductionOnionOutboundEnvelopeSendAttemptResult {
            warning: "Outbound envelope send attempt is feature-disabled in this build. No stream dial, stream send, envelope I/O, or message transport was attempted.",
            preparation_only: false,
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: manual_network_permission,
            persistent_client_ready,
            persistent_client_promoted_from_real_onion_cache: false,
            send_intent_prepared: prepare.send_intent_prepared,
            send_attempt_started,
            send_attempt_succeeded,
            peer_endpoint_failure_recorded: false,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            ack_wait_registered: prepare.ack_wait_registered,
            redacted_send_result_event_recorded: !event_summary.is_empty(),
            event_summary,
            next_blocker,
            blockers,
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            peer_proof_returned: false,
            session_transcript_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: prepare.key_material_exposed,
            network_io_attempted: false,
            stream_accept_attempted: false,
            stream_dial_attempted: false,
            stream_read_write_attempted: false,
            stream_send_attempted: false,
            envelope_io_opened: false,
            runtime_messaging_enabled: false,
        });
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_core::production::production_message_outbound_envelope_export;
        use another_dimension_storage::production::ProfilePassphrase;
        use another_dimension_transport::{arti_adapter_spike, InMemoryTransportRuntimeEventSink};

        if !manual_network_permission {
            next_blocker = "ManualNetworkPermissionMissing".to_string();
        } else if !persistent_client_ready {
            next_blocker = "PersistentClientNotReady".to_string();
        } else if !prepare.send_intent_prepared {
            next_blocker = prepare.next_blocker.clone();
        } else if state
            .send_in_progress
            .swap(true, std::sync::atomic::Ordering::AcqRel)
        {
            next_blocker = "OutboundEnvelopeSendAlreadyInProgress".to_string();
        } else {
            let envelope = sanitize_production_profile(profile)
                .and_then(|sanitized_profile| {
                    let passphrase = ProfilePassphrase::new(passphrase.trim())
                        .map_err(|_| "invalid production profile passphrase".to_string())?;
                    let store_path =
                        production_profile_store_path(&app_data_root, &sanitized_profile)?;
                    production_message_outbound_envelope_export(
                        &store_path,
                        sanitized_profile,
                        &passphrase,
                        message_number,
                    )
                    .map_err(|_| "stored outbound envelope unavailable".to_string())
                });
            match envelope {
                Ok(envelope) => {
                    let mut owner = match state.owner.lock() {
                        Ok(mut guard) => guard.take(),
                        Err(_) => None,
                    };
                    match owner.as_mut() {
                        Some(owner) => {
                            let mut sink = InMemoryTransportRuntimeEventSink::default();
                            send_attempt_started = true;
                            let result = owner
                        .write_outbound_envelope_once(
                                    arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
                                    &rendezvous_endpoint,
                                    envelope.export_payload().as_bytes(),
                                    &mut sink,
                                )
                                .await;
                            event_summary.extend(sink.events().iter().map(ToString::to_string));
                            match result {
                                Ok(()) => {
                                    send_attempt_succeeded = true;
                                    next_blocker = "AwaitingRemoteAck".to_string();
                                }
                                Err(error) => {
                                    next_blocker = format!("{error:?}");
                                }
                            }
                        }
                        None => {
                            next_blocker = "PersistentClientOwnerUnavailable".to_string();
                        }
                    }
                    if let Ok(mut guard) = state.owner.lock() {
                        *guard = owner;
                    }
                }
                Err(error) => {
                    next_blocker = error;
                }
            }
            state
                .send_in_progress
                .store(false, std::sync::atomic::Ordering::Release);
        }

        if next_blocker != "none" && !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        Ok(ProductionOnionOutboundEnvelopeSendAttemptResult {
            warning: "Outbound envelope send attempt boundary. It may attempt one bounded onion stream dial and encrypted envelope write only when manual network permission, a retained Tor client, verified pairwise session, and stored outbound envelope are all ready. It returns only redacted status.",
            preparation_only: false,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: manual_network_permission,
            persistent_client_ready,
            persistent_client_promoted_from_real_onion_cache: promoted_cached_owner,
            send_intent_prepared: prepare.send_intent_prepared,
            send_attempt_started,
            send_attempt_succeeded,
            peer_endpoint_failure_recorded: false,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            ack_wait_registered: prepare.ack_wait_registered && send_attempt_started,
            redacted_send_result_event_recorded: !event_summary.is_empty(),
            event_summary,
            next_blocker,
            blockers,
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            peer_proof_returned: false,
            session_transcript_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: prepare.key_material_exposed,
            network_io_attempted: send_attempt_started,
            stream_accept_attempted: false,
            stream_dial_attempted: send_attempt_started,
            stream_read_write_attempted: send_attempt_started,
            stream_send_attempted: send_attempt_succeeded,
            envelope_io_opened: send_attempt_started,
            runtime_messaging_enabled: false,
        })
    }
}

async fn run_production_onion_endpoint_update_control_send_stored_endpoint_attempt(
    app_data_root: impl AsRef<std::path::Path>,
    _app_cache_root: impl AsRef<std::path::Path>,
    state: &ProductionOnionClientRuntimeState,
    profile: String,
    passphrase: String,
    message_number: u64,
    local_rendezvous_endpoint: String,
    manual_network_permission: bool,
) -> Result<ProductionOnionEndpointUpdateControlSendAttemptResult, String> {
    #[cfg(feature = "manual-onion-client-attempt")]
    let promoted_cached_owner = if manual_network_permission {
        promote_cached_real_onion_roundtrip_owner_to_persistent_owner(
            state,
            app_data_root.as_ref(),
            _app_cache_root.as_ref(),
            &profile,
        )
    } else {
        false
    };
    let persistent_client_ready = run_production_onion_persistent_client_ready(state)?;
    let mut blockers = Vec::new();
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut event_summary = Vec::new();
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let event_summary = Vec::new();
    let next_blocker;
    #[cfg(feature = "manual-onion-client-attempt")]
    if promoted_cached_owner {
        event_summary.push("persistent_client_promoted_from_real_onion_cache".to_string());
    }
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut endpoint_update_created = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let endpoint_update_created = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut encrypted_control_envelope_written = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let encrypted_control_envelope_written = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut send_intent_prepared = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let send_intent_prepared = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut send_attempt_started = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let send_attempt_started = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut send_attempt_succeeded = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let send_attempt_succeeded = false;
    #[cfg(feature = "manual-onion-client-attempt")]
    let mut key_material_exposed = false;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let key_material_exposed = false;

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let _ = (
            app_data_root,
            _app_cache_root,
            state,
            profile,
            passphrase,
            message_number,
            local_rendezvous_endpoint,
        );
        next_blocker = "ManualClientAttemptFeatureNotEnabled".to_string();
        blockers.push(next_blocker.clone());
        return Ok(ProductionOnionEndpointUpdateControlSendAttemptResult {
            warning: "Endpoint update control send attempt is feature-disabled in this build. No stream dial, stream send, envelope I/O, or message transport was attempted.",
            preparation_only: false,
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: manual_network_permission,
            persistent_client_ready,
            persistent_client_promoted_from_real_onion_cache: false,
            endpoint_update_created,
            encrypted_control_envelope_written,
            send_intent_prepared,
            send_attempt_started,
            send_attempt_succeeded,
            peer_endpoint_failure_recorded: false,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            redacted_send_result_event_recorded: !event_summary.is_empty(),
            event_summary,
            next_blocker,
            blockers,
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            peer_proof_returned: false,
            session_transcript_returned: false,
            envelope_payload_returned: false,
            endpoint_plaintext_exposed: false,
            key_material_exposed,
            network_io_attempted: false,
            stream_accept_attempted: false,
            stream_dial_attempted: false,
            stream_read_write_attempted: false,
            stream_send_attempted: false,
            envelope_io_opened: false,
            runtime_messaging_enabled: false,
        });
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_transport::{arti_adapter_spike, InMemoryTransportRuntimeEventSink};

        if !manual_network_permission {
            next_blocker = "ManualNetworkPermissionMissing".to_string();
        } else if !persistent_client_ready {
            next_blocker = "PersistentClientNotReady".to_string();
        } else if message_number == 0 {
            next_blocker = "EndpointUpdateMessageNumberMissing".to_string();
        } else if state
            .send_in_progress
            .swap(true, std::sync::atomic::Ordering::AcqRel)
        {
            next_blocker = "OutboundEnvelopeSendAlreadyInProgress".to_string();
        } else {
            let export = run_production_endpoint_update_control_envelope_export(
                app_data_root.as_ref(),
                profile.clone(),
                passphrase.clone(),
                message_number,
                local_rendezvous_endpoint,
            );
            match export {
                Ok(export) => {
                    endpoint_update_created = export.endpoint_update_created;
                    encrypted_control_envelope_written = export.encrypted_control_envelope_written;
                    key_material_exposed = export.key_material_exposed;
                    let rendezvous_endpoint =
                        run_production_pairing_session_remote_endpoint_for_transport(
                            app_data_root.as_ref(),
                            profile,
                            passphrase,
                        );
                    match rendezvous_endpoint {
                        Ok(rendezvous_endpoint) => {
                            send_intent_prepared = true;
                            let mut owner = match state.owner.lock() {
                                Ok(mut guard) => guard.take(),
                                Err(_) => None,
                            };
                            match owner.as_mut() {
                                Some(owner) => {
                                    let mut sink = InMemoryTransportRuntimeEventSink::default();
                                    send_attempt_started = true;
                                    let result = owner
                                        .write_outbound_envelope_once(
                                            arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
                                            &rendezvous_endpoint,
                                            export.envelope_payload.as_bytes(),
                                            &mut sink,
                                        )
                                        .await;
                                    event_summary
                                        .extend(sink.events().iter().map(ToString::to_string));
                                    match result {
                                        Ok(()) => {
                                            send_attempt_succeeded = true;
                                            next_blocker = "AwaitingRemoteControlImport".to_string();
                                        }
                                        Err(error) => {
                                            next_blocker = format!("{error:?}");
                                        }
                                    }
                                }
                                None => {
                                    next_blocker = "PersistentClientOwnerUnavailable".to_string();
                                }
                            }
                            if let Ok(mut guard) = state.owner.lock() {
                                *guard = owner;
                            }
                        }
                        Err(error) => {
                            next_blocker = error;
                        }
                    }
                }
                Err(error) => {
                    next_blocker = error;
                }
            }
            state
                .send_in_progress
                .store(false, std::sync::atomic::Ordering::Release);
        }

        if next_blocker != "none" && !blockers.iter().any(|blocker| blocker == &next_blocker) {
            blockers.push(next_blocker.clone());
        }
        Ok(ProductionOnionEndpointUpdateControlSendAttemptResult {
            warning: "Endpoint update control send attempt boundary. With manual network permission and a retained Tor client, it writes an encrypted control envelope over the stored peer onion endpoint and returns only redacted status.",
            preparation_only: false,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: manual_network_permission,
            persistent_client_ready,
            persistent_client_promoted_from_real_onion_cache: promoted_cached_owner,
            endpoint_update_created,
            encrypted_control_envelope_written,
            send_intent_prepared,
            send_attempt_started,
            send_attempt_succeeded,
            peer_endpoint_failure_recorded: false,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            redacted_send_result_event_recorded: !event_summary.is_empty(),
            event_summary,
            next_blocker,
            blockers,
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            peer_proof_returned: false,
            session_transcript_returned: false,
            envelope_payload_returned: false,
            endpoint_plaintext_exposed: false,
            key_material_exposed,
            network_io_attempted: send_attempt_started,
            stream_accept_attempted: false,
            stream_dial_attempted: send_attempt_started,
            stream_read_write_attempted: send_attempt_started,
            stream_send_attempted: send_attempt_succeeded,
            envelope_io_opened: send_attempt_started,
            runtime_messaging_enabled: false,
        })
    }
}

fn run_production_profile_list(
    app_data_root: impl AsRef<std::path::Path>,
) -> Result<ProductionProfileListResult, String> {
    let profiles_dir = app_data_root.as_ref().join("profiles");
    let mut profiles = Vec::new();
    if profiles_dir.exists() {
        for entry in std::fs::read_dir(&profiles_dir)
            .map_err(|_| "failed to read production profile directory")?
        {
            let entry = entry.map_err(|_| "failed to read production profile entry")?;
            let file_type = entry
                .file_type()
                .map_err(|_| "failed to read production profile entry type")?;
            if !file_type.is_file() {
                continue;
            }
            let file_name = entry.file_name();
            let Some(file_name) = file_name.to_str() else {
                continue;
            };
            let Some(profile_name) = file_name.strip_suffix(".db") else {
                continue;
            };
            if profile_name.contains('.') {
                continue;
            }
            if sanitize_production_profile(profile_name.to_string()).is_ok() {
                profiles.push(profile_name.to_string());
            }
        }
    }
    profiles.sort();
    profiles.dedup();
    let profile_count = profiles.len();

    Ok(ProductionProfileListResult {
        warning:
            "profile names loaded from app-data store filenames only; no profile store was unlocked",
        profiles,
        profile_count,
        app_data_profile_store: true,
        store_path_returned: false,
        passphrase_required: false,
        passphrase_retained: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn run_production_pairing_payload_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionPairingPayloadExportResult, String> {
    use another_dimension_core::production::production_pairing_payload_create;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let rendezvous_endpoint = sanitize_pairing_rendezvous_endpoint(rendezvous_endpoint)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let summary =
        production_pairing_payload_create(&store_path, profile, &passphrase, rendezvous_endpoint)
            .map_err(|_| "pairing payload export failed")?;
    let pairing_payload = summary
        .payload()
        .encode()
        .map_err(|_| "pairing payload encoding failed")?;

    Ok(ProductionPairingPayloadExportResult {
        warning:
            "public pairing payload export only; verify safety number out-of-band before trusting a contact",
        storage_opened: summary.storage_opened(),
        identity_private_key_loaded: summary.identity_private_key_loaded(),
        noise_static_private_key_written: summary.noise_static_private_key_written(),
        pairing_payload_exported: !pairing_payload.is_empty(),
        pairing_payload,
        payload_format: "ADPAIR2",
        store_path_returned: false,
        passphrase_retained: false,
        private_key_material_returned: false,
        key_material_exposed: summary.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: summary.transport_io_opened(),
        runtime_messaging_enabled: summary.runtime_messaging_enabled(),
    })
}

fn sanitize_pairing_rendezvous_endpoint(endpoint: String) -> Result<String, String> {
    let endpoint = endpoint.trim();
    if endpoint.is_empty() {
        return Err("pairing rendezvous endpoint is required".to_string());
    }
    if endpoint.len() > 128 {
        return Err("pairing rendezvous endpoint must be 128 bytes or fewer".to_string());
    }
    if !endpoint.ends_with(".onion")
        || endpoint.contains('/')
        || endpoint.contains('\\')
        || endpoint.chars().any(char::is_whitespace)
    {
        return Err("pairing rendezvous endpoint must be a single onion host".to_string());
    }
    Ok(endpoint.to_string())
}

fn run_production_pairing_session_draft_save(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    local_payload: String,
    remote_payload: String,
    safety_confirmed: bool,
) -> Result<ProductionPairingSessionDraftResult, String> {
    use another_dimension_core::production::{
        production_pairing_session_save_draft, production_pairing_session_status,
    };
    use another_dimension_pairing::PairingPayload;
    use another_dimension_storage::production::ProfilePassphrase;

    if !safety_confirmed {
        return Err("safety number verification is required before saving session draft".to_string());
    }

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let local_payload = PairingPayload::decode(&sanitize_pairing_payload(local_payload)?)
        .map_err(|_| "invalid local pairing payload")?;
    let remote_payload = PairingPayload::decode(&sanitize_pairing_payload(remote_payload)?)
        .map_err(|_| "invalid remote pairing payload")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;

    let save = production_pairing_session_save_draft(
        &store_path,
        profile.clone(),
        &passphrase,
        &local_payload,
        &remote_payload,
    )
    .map_err(|_| "session draft save failed")?;
    let status = production_pairing_session_status(&store_path, profile, &passphrase)
        .map_err(|_| "session draft status failed")?;

    Ok(ProductionPairingSessionDraftResult {
        warning:
            "session draft saved locally only; verify safety number before handshake or trust decisions",
        storage_opened: save.storage_opened() && status.storage_opened(),
        session_plan_created: save.session_plan_created(),
        local_noise_static_private_key_loaded: save.local_noise_static_private_key_loaded(),
        local_noise_static_matches_payload: save.local_noise_static_matches_payload(),
        session_draft_written: save.session_draft_written(),
        remote_endpoint_state_written: save.remote_endpoint_state_written(),
        replay_window_written: save.replay_window_written(),
        channel_id_derivable: save.channel_id_derivable() && status.channel_id_derivable(),
        session_draft_present: status.session_draft_present(),
        remote_contact_present: status.remote_contact_present(),
        remote_endpoint_state_present: status.remote_endpoint_state_present(),
        replay_window_present: status.replay_window_present(),
        payloads_returned: false,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: save.key_material_exposed() || status.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: save.transport_io_opened() || status.transport_io_opened(),
        runtime_messaging_enabled: save.runtime_messaging_enabled()
            || status.runtime_messaging_enabled(),
    })
}

fn run_production_pairing_session_remote_endpoint_update(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionPairingSessionRemoteEndpointUpdateResult, String> {
    use another_dimension_core::production::production_pairing_session_remote_endpoint_update;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let rendezvous_endpoint = sanitize_pairing_rendezvous_endpoint(rendezvous_endpoint)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let update = production_pairing_session_remote_endpoint_update(
        &store_path,
        profile,
        &passphrase,
        rendezvous_endpoint,
    )
    .map_err(|_| "stored remote endpoint update failed".to_string())?;

    Ok(ProductionPairingSessionRemoteEndpointUpdateResult {
        warning: "stored peer endpoint updated inside the existing encrypted session context only; no network I/O, pairing reset, or key material export occurred",
        storage_opened: update.storage_opened(),
        session_draft_loaded: update.session_draft_loaded(),
        previous_remote_endpoint_present: update.previous_remote_endpoint_present(),
        update_channel_existing_encrypted_session: update.update_channel_existing_encrypted_session(),
        remote_endpoint_changed: update.remote_endpoint_changed(),
        remote_endpoint_state_written: update.remote_endpoint_state_written(),
        runtime_material_reconstructable: update.runtime_material_reconstructable(),
        remote_endpoint_returned: false,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: update.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: update.transport_io_opened(),
        runtime_messaging_enabled: update.runtime_messaging_enabled(),
    })
}

fn run_production_pairing_safety_preview(
    local_payload: String,
    remote_payload: String,
) -> Result<ProductionPairingSafetyPreviewResult, String> {
    use another_dimension_crypto::derive_production_safety_material;
    use another_dimension_pairing::{transcript, PairingPayload};

    let local_payload = PairingPayload::decode(&sanitize_pairing_payload(local_payload)?)
        .map_err(|_| "invalid local pairing payload")?;
    let remote_payload = PairingPayload::decode(&sanitize_pairing_payload(remote_payload)?)
        .map_err(|_| "invalid remote pairing payload")?;
    let safety_transcript =
        transcript(&local_payload, &remote_payload).map_err(|_| "safety transcript failed")?;
    let safety = derive_production_safety_material(&safety_transcript);

    Ok(ProductionPairingSafetyPreviewResult {
        warning: "Compare this safety number with the other person out-of-band before saving the session draft.",
        payloads_decodable: true,
        safety_transcript_bound: !safety_transcript.is_empty(),
        safety_number: safety.number,
        safety_phrase: safety.phrase,
        safety_confirmed: false,
        payloads_returned: false,
        safety_transcript_returned: false,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: false,
        network_io_attempted: false,
        transport_io_opened: false,
        runtime_messaging_enabled: false,
    })
}

fn sanitize_pairing_payload(payload: String) -> Result<String, String> {
    let payload = payload.trim();
    if payload.is_empty() {
        return Err("pairing payload is required".to_string());
    }
    if payload.len() > 1200 {
        return Err("pairing payload is too large".to_string());
    }
    if !payload.starts_with("ADPAIR2|") || payload.chars().any(char::is_whitespace) {
        return Err("pairing payload must be a single ADPAIR2 value".to_string());
    }
    Ok(payload.to_string())
}

fn run_production_session_state_check(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionSessionStateCheckResult, String> {
    use another_dimension_core::production::{
        production_pairing_session_open_runtime, production_pairing_session_remote_endpoint_status,
        production_pairing_session_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let status = production_pairing_session_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "session state status failed")?;
    let remote_endpoint_status =
        production_pairing_session_remote_endpoint_status(&store_path, profile.clone(), &passphrase)
            .ok();
    let runtime =
        production_pairing_session_open_runtime(&store_path, profile.clone(), &passphrase).ok();

    let runtime_material_reconstructable = runtime
        .as_ref()
        .is_some_and(|runtime| runtime.runtime_material_reconstructable());
    let outbound_envelope_io_ready = runtime
        .as_ref()
        .is_some_and(|runtime| runtime.outbound_envelope_io_ready());
    let session_transport_state_present = status.session_transport_state_present();

    Ok(ProductionSessionStateCheckResult {
        warning:
            "session state read from encrypted local store only; no network or transport IO opened",
        storage_opened: status.storage_opened()
            && runtime
                .as_ref()
                .map(|runtime| runtime.storage_opened())
                .unwrap_or(true),
        session_draft_present: status.session_draft_present(),
        channel_id_derivable: status.channel_id_derivable(),
        local_role_available: status.local_role_available(),
        remote_contact_present: status.remote_contact_present(),
        remote_endpoint_state_present: status.remote_endpoint_state_present(),
        remote_endpoint_marked_stale: remote_endpoint_status
            .as_ref()
            .is_some_and(|status| status.remote_endpoint_marked_stale()),
        remote_endpoint_refresh_recommended: remote_endpoint_status
            .as_ref()
            .is_some_and(|status| status.refresh_recommended()),
        remote_endpoint_last_failed_message_number: remote_endpoint_status
            .as_ref()
            .and_then(|status| status.last_failed_message_number()),
        replay_window_present: status.replay_window_present(),
        session_transport_state_present,
        runtime_material_reconstructable,
        outbound_envelope_io_ready,
        ready_for_message_envelope: status.session_draft_present()
            && status.channel_id_derivable()
            && status.remote_contact_present()
            && status.remote_endpoint_state_present()
            && status.replay_window_present()
            && runtime_material_reconstructable
            && outbound_envelope_io_ready
            && session_transport_state_present,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: status.key_material_exposed()
            || runtime
                .as_ref()
                .is_some_and(|runtime| runtime.key_material_exposed()),
        network_io_attempted: false,
        transport_io_opened: status.transport_io_opened()
            || runtime
                .as_ref()
                .is_some_and(|runtime| runtime.transport_io_opened()),
        runtime_messaging_enabled: status.runtime_messaging_enabled()
            || runtime
                .as_ref()
                .is_some_and(|runtime| runtime.runtime_messaging_enabled()),
    })
}

fn run_production_pairing_session_remote_endpoint_for_transport(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<String, String> {
    use another_dimension_core::production::{
        production_pairing_session_remote_endpoint,
        production_pairing_session_remote_endpoint_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let endpoint_status =
        production_pairing_session_remote_endpoint_status(&store_path, profile.clone(), &passphrase)
            .map_err(|_| "stored remote endpoint unavailable".to_string())?;
    if !endpoint_status.remote_endpoint_state_present() {
        return Err("stored remote endpoint unavailable".to_string());
    }
    if endpoint_status.remote_endpoint_marked_stale() {
        return Err("stored remote endpoint refresh required".to_string());
    }
    let endpoint = production_pairing_session_remote_endpoint(&store_path, profile, &passphrase)
        .map_err(|_| "stored remote endpoint unavailable".to_string())?;
    Ok(endpoint.endpoint().as_str().to_string())
}

fn apply_peer_endpoint_send_failure_result(
    result: &mut ProductionOnionOutboundEnvelopeSendAttemptResult,
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
) {
    if !result.send_attempt_started || result.send_attempt_succeeded {
        return;
    }
    if !send_result_recommends_peer_endpoint_refresh(result) {
        return;
    }
    if run_production_pairing_session_remote_endpoint_mark_send_failure(
        app_data_root,
        profile,
        passphrase,
        message_number,
    )
    .is_ok()
    {
        result.peer_endpoint_failure_recorded = true;
        result.peer_endpoint_refresh_recommended = true;
        result.retry_recommended_after_endpoint_refresh = true;
    }
}

fn send_result_recommends_peer_endpoint_refresh(
    result: &ProductionOnionOutboundEnvelopeSendAttemptResult,
) -> bool {
    let blocker = result.next_blocker.to_ascii_lowercase();
    blocker.contains("endpoint") || blocker.contains("stale") || blocker.contains("refresh")
}

fn apply_outbound_message_send_attempt_result(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
    result: &ProductionOnionOutboundEnvelopeSendAttemptResult,
) {
    use another_dimension_core::production::{
        production_message_outbound_mark_send_failed,
        production_message_outbound_mark_send_succeeded,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let Ok(profile) = sanitize_production_profile(profile) else {
        return;
    };
    let Ok(passphrase) = ProfilePassphrase::new(passphrase.trim()) else {
        return;
    };
    let Ok(store_path) = production_profile_store_path(app_data_root, &profile) else {
        return;
    };
    if result.send_attempt_succeeded {
        let _ = production_message_outbound_mark_send_succeeded(
            &store_path,
            profile,
            &passphrase,
            message_number,
        );
    } else if result.send_intent_prepared
        || result.send_attempt_started
        || result.envelope_io_opened
        || result.next_blocker != "none"
    {
        let _ = production_message_outbound_mark_send_failed(
            &store_path,
            profile,
            &passphrase,
            message_number,
            &result.next_blocker,
        );
    }
}

fn apply_endpoint_update_control_send_failure_result(
    result: &mut ProductionOnionEndpointUpdateControlSendAttemptResult,
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
) {
    if !result.send_attempt_started || result.send_attempt_succeeded {
        return;
    }
    if run_production_pairing_session_remote_endpoint_mark_send_failure(
        app_data_root,
        profile,
        passphrase,
        message_number,
    )
    .is_ok()
    {
        result.peer_endpoint_failure_recorded = true;
        result.peer_endpoint_refresh_recommended = true;
        result.retry_recommended_after_endpoint_refresh = true;
    }
}

fn run_production_pairing_session_remote_endpoint_mark_send_failure(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
) -> Result<(), String> {
    use another_dimension_core::production::production_pairing_session_remote_endpoint_mark_send_failure;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    production_pairing_session_remote_endpoint_mark_send_failure(
        &store_path,
        profile,
        &passphrase,
        message_number,
    )
    .map(|_| ())
    .map_err(|_| "stored remote endpoint send failure mark failed".to_string())
}

fn run_production_two_profile_session_status(
    app_data_root: impl AsRef<std::path::Path>,
    profile_a: String,
    profile_b: String,
    passphrase: String,
) -> Result<ProductionTwoProfileSessionStatusResult, String> {
    let profile_a = sanitize_production_profile(profile_a)?;
    let profile_b = sanitize_production_profile(profile_b)?;
    if profile_a == profile_b {
        return Err("production two-profile session status requires distinct profiles".to_string());
    }
    let profile_a_name = profile_a.as_str().to_string();
    let profile_b_name = profile_b.as_str().to_string();

    let app_data_root = app_data_root.as_ref();
    let profile_a_state =
        run_production_session_state_check(app_data_root, profile_a_name.clone(), passphrase.clone())?;
    let profile_b_state =
        run_production_session_state_check(app_data_root, profile_b_name.clone(), passphrase.clone())?;
    let profile_a_endpoint_invite_placeholder =
        production_remote_endpoint_matches_redacted_value(
            app_data_root,
            profile_a_name.clone(),
            passphrase.clone(),
            &format!("{profile_b_name}.onion"),
        );
    let profile_b_endpoint_invite_placeholder =
        production_remote_endpoint_matches_redacted_value(
            app_data_root,
            profile_b_name.clone(),
            passphrase,
            &format!("{profile_a_name}.onion"),
        );
    let key_material_exposed =
        profile_a_state.key_material_exposed || profile_b_state.key_material_exposed;
    let transport_io_opened =
        profile_a_state.transport_io_opened || profile_b_state.transport_io_opened;
    let runtime_messaging_enabled =
        profile_a_state.runtime_messaging_enabled || profile_b_state.runtime_messaging_enabled;

    Ok(ProductionTwoProfileSessionStatusResult {
        warning: "two-profile session status read from encrypted local stores only; no network or transport IO opened",
        profile_a: profile_a_name,
        profile_b: profile_b_name,
        profile_a_ready_for_message_envelope: profile_a_state.ready_for_message_envelope,
        profile_b_ready_for_message_envelope: profile_b_state.ready_for_message_envelope,
        both_ready_for_message_envelope: profile_a_state.ready_for_message_envelope
            && profile_b_state.ready_for_message_envelope,
        profile_a_remote_endpoint_state_present: profile_a_state.remote_endpoint_state_present,
        profile_b_remote_endpoint_state_present: profile_b_state.remote_endpoint_state_present,
        profile_a_remote_endpoint_invite_placeholder: profile_a_endpoint_invite_placeholder,
        profile_b_remote_endpoint_invite_placeholder: profile_b_endpoint_invite_placeholder,
        profile_a_remote_endpoint_marked_stale: profile_a_state.remote_endpoint_marked_stale,
        profile_b_remote_endpoint_marked_stale: profile_b_state.remote_endpoint_marked_stale,
        profile_a_remote_endpoint_refresh_recommended: profile_a_state
            .remote_endpoint_refresh_recommended,
        profile_b_remote_endpoint_refresh_recommended: profile_b_state
            .remote_endpoint_refresh_recommended,
        profile_a_remote_endpoint_last_failed_message_number: profile_a_state
            .remote_endpoint_last_failed_message_number,
        profile_b_remote_endpoint_last_failed_message_number: profile_b_state
            .remote_endpoint_last_failed_message_number,
        profile_a_session_transport_state_present: profile_a_state.session_transport_state_present,
        profile_b_session_transport_state_present: profile_b_state.session_transport_state_present,
        profile_a_runtime_material_reconstructable: profile_a_state
            .runtime_material_reconstructable,
        profile_b_runtime_material_reconstructable: profile_b_state
            .runtime_material_reconstructable,
        profile_a_outbound_envelope_io_ready: profile_a_state.outbound_envelope_io_ready,
        profile_b_outbound_envelope_io_ready: profile_b_state.outbound_envelope_io_ready,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed,
        network_io_attempted: false,
        transport_io_opened,
        runtime_messaging_enabled,
    })
}

fn production_remote_endpoint_matches_redacted_value(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    expected_endpoint: &str,
) -> bool {
    run_production_pairing_session_remote_endpoint_for_transport(
        app_data_root,
        profile,
        passphrase,
    )
    .is_ok_and(|endpoint| endpoint == expected_endpoint)
}

fn run_production_handshake_init_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_init_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let init = production_pairing_session_handshake_init_export(&store_path, profile, &passphrase)
        .map_err(|_| "handshake init export failed")?;

    Ok(ProductionHandshakePayloadResult {
        warning: "handshake init payload export only; send out-of-band to paired contact",
        storage_opened: init.storage_opened(),
        session_draft_loaded: init.session_draft_loaded(),
        local_noise_static_private_key_loaded: init.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: init.local_noise_static_matches_draft(),
        safety_transcript_loaded: init.safety_transcript_loaded(),
        role_allowed: init.local_role_can_initiate(),
        input_payload_read: false,
        input_payload_decodable: false,
        output_payload_created: init.handshake_message_created(),
        output_payload: init.export_payload().trim().to_string(),
        output_payload_format: "ADNOISEXXINIT1",
        state_written: init.initiator_state_written(),
        transport_state_persisted: false,
        key_material_exposed: init.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: init.transport_io_opened(),
        runtime_messaging_enabled: init.runtime_messaging_enabled(),
    })
}

fn run_production_handshake_reply_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    init_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_reply_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let init_payload = sanitize_handshake_payload(init_payload, "ADNOISEXXINIT1")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let reply = production_pairing_session_handshake_reply_export(
        &store_path,
        profile,
        &passphrase,
        &init_payload,
    )
    .map_err(|_| "handshake reply export failed")?;

    Ok(ProductionHandshakePayloadResult {
        warning: "handshake reply payload export only; send out-of-band to initiator",
        storage_opened: reply.storage_opened(),
        session_draft_loaded: reply.session_draft_loaded(),
        local_noise_static_private_key_loaded: reply.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: reply.local_noise_static_matches_draft(),
        safety_transcript_loaded: reply.safety_transcript_loaded(),
        role_allowed: reply.local_role_can_accept(),
        input_payload_read: reply.init_message_read(),
        input_payload_decodable: reply.init_message_decodable(),
        output_payload_created: reply.reply_message_created(),
        output_payload: reply.export_payload().trim().to_string(),
        output_payload_format: "ADNOISEXXREPLY1",
        state_written: reply.responder_state_persisted(),
        transport_state_persisted: false,
        key_material_exposed: reply.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: reply.transport_io_opened(),
        runtime_messaging_enabled: reply.runtime_messaging_enabled(),
    })
}

fn run_production_handshake_finish_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    reply_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_finish_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let reply_payload = sanitize_handshake_payload(reply_payload, "ADNOISEXXREPLY1")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let finish = production_pairing_session_handshake_finish_export(
        &store_path,
        profile,
        &passphrase,
        &reply_payload,
    )
    .map_err(|_| "handshake finish export failed")?;

    Ok(ProductionHandshakePayloadResult {
        warning: "handshake finish payload export only; transport state persisted locally",
        storage_opened: finish.storage_opened(),
        session_draft_loaded: finish.session_draft_loaded(),
        local_noise_static_private_key_loaded: finish.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: finish.local_noise_static_matches_draft(),
        safety_transcript_loaded: finish.safety_transcript_loaded(),
        role_allowed: finish.local_role_can_finish(),
        input_payload_read: finish.reply_message_read(),
        input_payload_decodable: finish.reply_message_decodable(),
        output_payload_created: finish.finish_message_created(),
        output_payload: finish.export_payload().trim().to_string(),
        output_payload_format: "ADNOISEXXFINISH1",
        state_written: finish.initiator_state_loaded(),
        transport_state_persisted: finish.transport_state_persisted(),
        key_material_exposed: finish.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: finish.transport_io_opened(),
        runtime_messaging_enabled: finish.runtime_messaging_enabled(),
    })
}

fn run_production_handshake_finish_import(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    finish_payload: String,
) -> Result<ProductionHandshakeFinishImportResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_finish_import;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let finish_payload = sanitize_handshake_payload(finish_payload, "ADNOISEXXFINISH1")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let finish = production_pairing_session_handshake_finish_import(
        &store_path,
        profile,
        &passphrase,
        &finish_payload,
    )
    .map_err(|_| "handshake finish import failed")?;

    Ok(ProductionHandshakeFinishImportResult {
        warning: "handshake finish imported locally; transport state persisted",
        storage_opened: finish.storage_opened(),
        session_draft_loaded: finish.session_draft_loaded(),
        local_noise_static_private_key_loaded: finish.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: finish.local_noise_static_matches_draft(),
        safety_transcript_loaded: finish.safety_transcript_loaded(),
        role_allowed: finish.local_role_can_complete(),
        finish_payload_read: finish.finish_message_read(),
        finish_payload_decodable: finish.finish_message_decodable(),
        remote_static_verified: finish.remote_static_verified(),
        transport_state_created: finish.transport_state_created(),
        transport_state_persisted: finish.transport_state_persisted(),
        payloads_returned: false,
        key_material_exposed: finish.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: finish.transport_io_opened(),
        runtime_messaging_enabled: finish.runtime_messaging_enabled(),
    })
}

fn sanitize_handshake_payload(payload: String, expected_prefix: &str) -> Result<String, String> {
    let payload = payload.trim();
    if payload.is_empty() {
        return Err("handshake payload is required".to_string());
    }
    if payload.len() > 4096 {
        return Err("handshake payload is too large".to_string());
    }
    let expected = format!("{expected_prefix}|");
    if !payload.starts_with(&expected) || payload.chars().any(char::is_whitespace) {
        return Err("handshake payload must be a single expected handshake value".to_string());
    }
    Ok(payload.to_string())
}

fn run_production_message_envelope_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
    auto_message_number: bool,
    message: String,
    message_ttl_seconds: u64,
) -> Result<ProductionMessageEnvelopeExportResult, String> {
    use another_dimension_core::production::{
        production_message_next_number_reserve,
        production_message_outbound_encrypt_prepare, production_message_outbound_envelope_export,
        production_message_pending_status, production_message_send_prepare,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let message = sanitize_production_message_text(message)?;
    let message_ttl_seconds = sanitize_production_message_ttl_seconds(message_ttl_seconds)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let reservation = if auto_message_number {
        Some(
            production_message_next_number_reserve(&store_path, profile.clone(), &passphrase)
                .map_err(|_| "message number reservation failed")?,
        )
    } else {
        None
    };
    let selected_message_number = reservation
        .map(|summary| summary.reserved_message_number())
        .unwrap_or(message_number);
    if selected_message_number == 0 {
        return Err("message number is required".to_string());
    }

    let send = production_message_send_prepare(
        &store_path,
        profile.clone(),
        &passphrase,
        selected_message_number,
        &message,
        message_ttl_seconds,
    )
    .map_err(|_| "message send prepare failed")?;
    let pending = production_message_pending_status(
        &store_path,
        profile.clone(),
        &passphrase,
        selected_message_number,
    )
    .map_err(|_| "message pending status failed")?;
    let encrypt = production_message_outbound_encrypt_prepare(
        &store_path,
        profile.clone(),
        &passphrase,
        selected_message_number,
    )
    .map_err(|_| "message encrypt prepare failed")?;
    let envelope = production_message_outbound_envelope_export(
        &store_path,
        profile,
        &passphrase,
        selected_message_number,
    )
    .map_err(|_| "message envelope export failed")?;
    let auto_counter_written = reservation.is_some_and(|summary| summary.counter_record_written());
    let existing_message_slot_skipped =
        reservation.is_some_and(|summary| summary.existing_message_slot_skipped());
    let expired_outbound_messages_purged =
        reservation.map_or(0, |summary| summary.expired_outbound_messages_purged())
            + usize::from(pending.expired_outbound_message_purged())
            + usize::from(encrypt.expired_outbound_message_purged());

    Ok(ProductionMessageEnvelopeExportResult {
        warning:
            "encrypted envelope exported locally; deliver it out-of-band to the paired contact",
        selected_message_number,
        message_ttl_seconds,
        auto_message_number,
        auto_counter_written,
        existing_message_slot_skipped,
        expired_outbound_messages_purged,
        storage_opened: send.storage_opened()
            && pending.storage_opened()
            && encrypt.storage_opened()
            && envelope.storage_opened(),
        runtime_material_reconstructable: send.runtime_material_reconstructable()
            && pending.runtime_material_reconstructable()
            && encrypt.runtime_material_reconstructable()
            && envelope.runtime_material_reconstructable(),
        outbound_envelope_io_ready: send.outbound_envelope_io_ready(),
        plaintext_accepted: send.plaintext_accepted(),
        message_number_reserved: send.message_number_reserved(),
        local_message_index_written: send.local_message_index_written(),
        pending_message_record_written: send.pending_message_record_written(),
        pending_message_record_present: pending.pending_message_record_present()
            && encrypt.pending_message_record_present(),
        local_message_index_matches_pending: pending.local_message_index_matches_pending()
            && encrypt.local_message_index_matches_pending(),
        session_transport_ready: encrypt.session_transport_ready(),
        envelope_encryption_ready: encrypt.envelope_encryption_ready(),
        encrypted_envelope_written: encrypt.encrypted_envelope_written(),
        encrypted_envelope_present: envelope.encrypted_envelope_present(),
        envelope_decodable: envelope.envelope_decodable(),
        envelope_message_number_matches: envelope.envelope_message_number_matches(),
        envelope_payload: envelope.export_payload().trim().to_string(),
        plaintext_returned: false,
        key_material_exposed: send.key_material_exposed()
            || pending.key_material_exposed()
            || encrypt.key_material_exposed()
            || envelope.key_material_exposed(),
        network_send_attempted: send.network_send_attempted()
            || pending.network_send_attempted()
            || encrypt.network_send_attempted()
            || envelope.network_send_attempted(),
        transport_io_opened: send.transport_io_opened()
            || pending.transport_io_opened()
            || encrypt.transport_io_opened()
            || envelope.transport_io_opened(),
        runtime_messaging_enabled: send.runtime_messaging_enabled()
            || pending.runtime_messaging_enabled()
            || encrypt.runtime_messaging_enabled()
            || envelope.runtime_messaging_enabled(),
    })
}

fn run_production_message_envelope_import(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
    envelope_payload: String,
    message_ttl_seconds: u64,
) -> Result<ProductionMessageEnvelopeImportResult, String> {
    use another_dimension_core::production::{
        production_message_inbound_decrypt_import, production_message_received_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let envelope_payload = sanitize_envelope_payload(envelope_payload)?;
    let message_ttl_seconds = sanitize_production_message_ttl_seconds(message_ttl_seconds)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;

    let import = production_message_inbound_decrypt_import(
        &store_path,
        profile.clone(),
        &passphrase,
        &envelope_payload,
        message_ttl_seconds,
    )
    .map_err(|_| "message envelope import failed")?;
    let status =
        production_message_received_status(&store_path, profile, &passphrase, message_number)
            .map_err(|_| "message received status failed")?;

    Ok(ProductionMessageEnvelopeImportResult {
        warning:
            "encrypted envelope imported locally; received plaintext remains in encrypted store",
        storage_opened: import.storage_opened() && status.storage_opened(),
        runtime_material_reconstructable: import.runtime_material_reconstructable()
            && status.runtime_material_reconstructable(),
        envelope_read: import.envelope_read(),
        envelope_decodable: import.envelope_decodable(),
        session_transport_ready: import.session_transport_ready(),
        replay_window_loaded: import.replay_window_loaded(),
        replay_accepted: import.replay_accepted(),
        plaintext_decrypted: import.plaintext_decrypted(),
        plaintext_returned: false,
        received_message_written: import.received_message_written(),
        replay_window_committed: import.replay_window_committed(),
        received_message_record_present: status.received_message_record_present(),
        received_message_record_decodable: status.received_message_record_decodable(),
        received_message_matches_session: status.received_message_matches_session(),
        expired_received_message_purged: status.expired_received_message_purged(),
        key_material_exposed: import.key_material_exposed() || status.key_material_exposed(),
        network_receive_attempted: import.network_receive_attempted()
            || status.network_receive_attempted(),
        transport_io_opened: import.transport_io_opened() || status.transport_io_opened(),
        runtime_messaging_enabled: import.runtime_messaging_enabled()
            || status.runtime_messaging_enabled(),
    })
}

fn run_production_endpoint_update_control_envelope_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
    local_rendezvous_endpoint: String,
) -> Result<ProductionEndpointUpdateControlEnvelopeExportResult, String> {
    use another_dimension_core::production::production_endpoint_update_control_envelope_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let local_rendezvous_endpoint = sanitize_pairing_rendezvous_endpoint(local_rendezvous_endpoint)?;
    if message_number == 0 {
        return Err("endpoint update message number is required".to_string());
    }
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let export = production_endpoint_update_control_envelope_export(
        &store_path,
        profile,
        &passphrase,
        message_number,
        local_rendezvous_endpoint,
    )
    .map_err(|_| "endpoint update control envelope export failed")?;

    Ok(ProductionEndpointUpdateControlEnvelopeExportResult {
        warning: "encrypted endpoint update control envelope exported; it contains no plaintext endpoint in the result",
        selected_message_number: message_number,
        storage_opened: export.storage_opened(),
        runtime_material_reconstructable: export.runtime_material_reconstructable(),
        session_transport_ready: export.session_transport_ready(),
        endpoint_update_created: export.endpoint_update_created(),
        encrypted_control_envelope_written: export.encrypted_control_envelope_written(),
        envelope_decodable: export.envelope_decodable(),
        envelope_message_number_matches: export.envelope_message_number_matches(),
        envelope_message_type_control: export.envelope_message_type_control(),
        envelope_payload: export.export_payload().trim().to_string(),
        endpoint_payload_returned: false,
        endpoint_plaintext_exposed: export.endpoint_plaintext_exposed(),
        key_material_exposed: export.key_material_exposed(),
        network_send_attempted: export.network_send_attempted(),
        transport_io_opened: export.transport_io_opened(),
        runtime_messaging_enabled: export.runtime_messaging_enabled(),
    })
}

fn run_production_endpoint_update_control_envelope_import(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    envelope_payload: String,
) -> Result<ProductionEndpointUpdateControlEnvelopeImportResult, String> {
    use another_dimension_core::production::production_endpoint_update_control_envelope_import;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let envelope_payload = sanitize_envelope_payload(envelope_payload)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let import = production_endpoint_update_control_envelope_import(
        &store_path,
        profile,
        &passphrase,
        &envelope_payload,
    )
    .map_err(|_| "endpoint update control envelope import failed")?;

    Ok(ProductionEndpointUpdateControlEnvelopeImportResult {
        warning: "encrypted endpoint update control envelope imported; stored peer endpoint changed inside the existing session only",
        storage_opened: import.storage_opened(),
        runtime_material_reconstructable: import.runtime_material_reconstructable(),
        envelope_read: import.envelope_read(),
        envelope_decodable: import.envelope_decodable(),
        envelope_message_type_control: import.envelope_message_type_control(),
        session_transport_ready: import.session_transport_ready(),
        replay_window_loaded: import.replay_window_loaded(),
        replay_accepted: import.replay_accepted(),
        control_plaintext_decrypted: import.control_plaintext_decrypted(),
        endpoint_update_applied: import.endpoint_update_applied(),
        remote_endpoint_state_written: import.remote_endpoint_state_written(),
        stale_endpoint_status_cleared: import.stale_endpoint_status_cleared(),
        endpoint_payload_returned: false,
        endpoint_plaintext_exposed: import.endpoint_plaintext_exposed(),
        key_material_exposed: import.key_material_exposed(),
        network_receive_attempted: import.network_receive_attempted(),
        transport_io_opened: import.transport_io_opened(),
        runtime_messaging_enabled: import.runtime_messaging_enabled(),
    })
}

fn run_production_message_received_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
) -> Result<ProductionMessageReceivedExportResult, String> {
    use another_dimension_core::production::{
        production_message_received_export, production_message_received_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let status = production_message_received_status(&store_path, profile.clone(), &passphrase, message_number)
        .map_err(|_| "received message status failed")?;
    if status.expired_received_message_purged() {
        return Ok(ProductionMessageReceivedExportResult {
            warning: "received message expired and was purged after local unlock; plaintext was not returned",
            storage_opened: status.storage_opened(),
            runtime_material_reconstructable: status.runtime_material_reconstructable(),
            received_message_record_present: status.received_message_record_present(),
            received_message_record_decodable: status.received_message_record_decodable(),
            received_message_matches_session: status.received_message_matches_session(),
            expired_received_message_purged: true,
            received_message: String::new(),
            created_at_ms: 0,
            message_ttl_seconds: 0,
            expires_at_ms: None,
            expired: true,
            plaintext_returned_after_unlock: false,
            key_material_exposed: status.key_material_exposed(),
            network_receive_attempted: status.network_receive_attempted(),
            transport_io_opened: status.transport_io_opened(),
            runtime_messaging_enabled: status.runtime_messaging_enabled(),
        });
    }
    let export =
        production_message_received_export(&store_path, profile, &passphrase, message_number)
            .map_err(|_| "received message export failed")?;
    let received_message = String::from_utf8(export.export_payload().to_vec())
        .map_err(|_| "received message is not displayable UTF-8")?;

    Ok(ProductionMessageReceivedExportResult {
        warning: "received message exported after local unlock; no network or transport IO opened",
        storage_opened: export.storage_opened(),
        runtime_material_reconstructable: export.runtime_material_reconstructable(),
        received_message_record_present: export.received_message_record_present(),
        received_message_record_decodable: export.received_message_record_decodable(),
        received_message_matches_session: export.received_message_matches_session(),
        expired_received_message_purged: false,
        received_message,
        created_at_ms: export.created_at_ms(),
        message_ttl_seconds: export.ttl_seconds(),
        expires_at_ms: export.expires_at_ms(),
        expired: export.expired(),
        plaintext_returned_after_unlock: true,
        key_material_exposed: export.key_material_exposed(),
        network_receive_attempted: export.network_receive_attempted(),
        transport_io_opened: export.transport_io_opened(),
        runtime_messaging_enabled: export.runtime_messaging_enabled(),
    })
}

fn run_production_message_transcript_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionMessageTranscriptExportResult, String> {
    use another_dimension_core::production::{
        production_message_transcript_export, production_message_transcript_tsv,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let profile_for_relay = profile.as_str().to_string();
    let invite_token = passphrase.trim().to_string();
    let passphrase = ProfilePassphrase::new(&invite_token)
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let export = production_message_transcript_export(&store_path, profile, &passphrase)
        .map_err(|_| "message transcript export failed")?;
    let transcript_tsv = production_message_transcript_tsv(export.entries())
        .map_err(|_| "message transcript export failed")?;
    let mut entries = export
        .entries()
        .iter()
        .map(|entry| {
            let message = String::from_utf8(entry.plaintext().to_vec())
                .map_err(|_| "transcript message is not displayable UTF-8")?;
            Ok(ProductionMessageTranscriptEntryResult {
                direction: entry.direction().to_string(),
                message_number: entry.message_number(),
                message,
                created_at_ms: entry.created_at_ms(),
                ttl_seconds: entry.ttl_seconds(),
                expires_at_ms: entry.expires_at_ms(),
                expired: entry.expired(),
                outbound_delivery_state: entry.outbound_delivery_state().map(str::to_string),
                outbound_failure_kind: entry.outbound_failure_kind().map(str::to_string),
                outbound_retryable: entry.outbound_retryable(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    let mut relay_expired_messages_purged = 0usize;
    if dev_invite_room_is_enabled() {
        let now = now_unix_ms();
        entries.extend(
            read_dev_invite_room_messages(&invite_token, &profile_for_relay)?
                .into_iter()
                .filter_map(|message| {
                    let expired = message
                        .expires_at_ms
                        .is_some_and(|expires_at_ms| expires_at_ms <= now);
                    if expired {
                        relay_expired_messages_purged += 1;
                        return None;
                    }
                    Some(ProductionMessageTranscriptEntryResult {
                        direction: "received".to_string(),
                        message_number: message.message_number,
                        message: message.message,
                        created_at_ms: message.created_at_ms,
                        ttl_seconds: message.ttl_seconds,
                        expires_at_ms: message.expires_at_ms,
                        expired: false,
                        outbound_delivery_state: None,
                        outbound_failure_kind: None,
                        outbound_retryable: false,
                    })
                }),
        );
        entries.sort_by_key(|entry| (entry.created_at_ms, entry.message_number));
    }

    Ok(ProductionMessageTranscriptExportResult {
        warning: "message transcript exported after local unlock; no network or transport IO opened",
        storage_opened: export.storage_opened(),
        runtime_material_reconstructable: export.runtime_material_reconstructable(),
        entries,
        transcript_tsv,
        expired_messages_purged: export.expired_messages_purged() + relay_expired_messages_purged,
        plaintext_returned_after_unlock: true,
        key_material_exposed: export.key_material_exposed(),
        network_io_attempted: export.network_io_attempted(),
        transport_io_opened: export.transport_io_opened(),
        runtime_messaging_enabled: export.runtime_messaging_enabled(),
    })
}

fn run_production_message_number_reserve(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<u64, String> {
    use another_dimension_core::production::production_message_next_number_reserve;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let reservation = production_message_next_number_reserve(&store_path, profile, &passphrase)
        .map_err(|_| "message number reservation failed")?;
    Ok(reservation.reserved_message_number())
}

fn sanitize_production_message_text(message: String) -> Result<Vec<u8>, String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("production message requires text".to_string());
    }
    if trimmed.len() > 240 {
        return Err("production message must be 240 bytes or fewer".to_string());
    }
    Ok(trimmed.as_bytes().to_vec())
}

fn sanitize_production_message_ttl_seconds(ttl_seconds: u64) -> Result<u64, String> {
    another_dimension_core::production::production_message_ttl_seconds_validate(ttl_seconds)
        .map_err(|_| "message retention must be 1h, 1d, 7d, or 30d".to_string())
}

fn sanitize_envelope_payload(payload: String) -> Result<String, String> {
    let payload = payload.trim();
    if payload.is_empty() {
        return Err("encrypted envelope payload is required".to_string());
    }
    if payload.len() > 4096 {
        return Err("encrypted envelope payload is too large".to_string());
    }
    if !payload.starts_with("ADENV1|") || payload.chars().any(char::is_whitespace) {
        return Err("encrypted envelope payload must be a single ADENV1 value".to_string());
    }
    Ok(payload.to_string())
}

#[allow(clippy::too_many_arguments)]
async fn run_production_two_profile_real_onion_roundtrip_with_cancel(
    _app_data_root: impl AsRef<std::path::Path>,
    _app_cache_root: impl AsRef<std::path::Path>,
    runtime_state: Option<&ProductionOnionClientRuntimeState>,
    profile_a: String,
    profile_b: String,
    _passphrase: String,
    message: String,
    message_ttl_seconds: u64,
    manual_network_permission: bool,
    bootstrap_retry_limit: Option<u8>,
    #[cfg(feature = "manual-onion-client-attempt")] cancel_scope: Option<&RealOnionRoundtripCancelScope<'_>>,
    #[cfg(not(feature = "manual-onion-client-attempt"))] _cancel_scope: Option<&()>,
) -> Result<ProductionTwoProfileRealOnionRoundtripResult, String> {
    let profile_a = sanitize_production_profile(profile_a)?;
    let profile_b = sanitize_production_profile(profile_b)?;
    if profile_a == profile_b {
        return Err("real onion roundtrip requires two distinct profiles".to_string());
    }
    let profile_a_name = profile_a.as_str().to_string();
    let profile_b_name = profile_b.as_str().to_string();
    let message_ttl_seconds = sanitize_production_message_ttl_seconds(message_ttl_seconds)?;
    let bootstrap_retry_limit = bootstrap_retry_limit.unwrap_or(1).clamp(1, 3);
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let _ = runtime_state;
    #[cfg(feature = "manual-onion-client-attempt")]
    let passphrase = _passphrase.trim().to_string();
    #[cfg(feature = "manual-onion-client-attempt")]
    let message = sanitize_production_roundtrip_message(message)?;
    #[cfg(not(feature = "manual-onion-client-attempt"))]
    let _ = sanitize_production_roundtrip_message(message)?;
    #[cfg(feature = "manual-onion-client-attempt")]
    let message_text =
        String::from_utf8(message.clone()).map_err(|_| "real onion message must be UTF-8")?;

    #[cfg(not(feature = "manual-onion-client-attempt"))]
    {
        let mut blockers = vec!["ManualClientAttemptFeatureNotEnabled".to_string()];
        if manual_network_permission {
            blockers.push("ManualOnionClientFeatureRequired".to_string());
        }
        return Ok(ProductionTwoProfileRealOnionRoundtripResult {
            warning: "Real onion roundtrip is feature-disabled in this build. No Tor bootstrap, onion service launch, stream I/O, or message transport was attempted.",
            manual_client_attempt_feature_compiled: false,
            manual_network_permission_enabled: manual_network_permission,
            sender_profile: profile_a_name,
            receiver_profile: profile_b_name,
            message_number: 0,
            second_message_number: 0,
            message_ttl_seconds,
            bootstrap_retry_limit,
            profile_a_bootstrap_attempts: 0,
            profile_b_bootstrap_attempts: 0,
            profile_a_bootstrap_reused: false,
            profile_b_bootstrap_reused: false,
            profile_a_unlocked: false,
            profile_b_unlocked: false,
            profile_a_client_bootstrapped: false,
            profile_b_client_bootstrapped: false,
            profile_a_onion_service_launched: false,
            profile_b_onion_service_launched: false,
            profile_a_endpoint_ready: false,
            profile_b_endpoint_ready: false,
            pairing_payloads_exported: false,
            session_drafts_saved: false,
            handshake_completed: false,
            sender_session_ready: false,
            receiver_session_ready: false,
            message_number_reserved: false,
            second_message_number_reserved: false,
            encrypted_envelope_exported: false,
            second_encrypted_envelope_exported: false,
            send_attempt_started: false,
            send_attempt_succeeded: false,
            second_send_attempt_succeeded: false,
            receive_attempt_started: false,
            receive_attempt_succeeded: false,
            second_receive_attempt_succeeded: false,
            inbound_message_stored: false,
            second_inbound_message_stored: false,
            consecutive_receive_attempts: 0,
            consecutive_messages_imported: 0,
            receive_mode_runtime_state: "stopped",
            receive_mode_runtime_label: "Receive mode stopped",
            receive_mode_attempt_count: 0,
            receive_mode_import_sequence: 0,
            receive_mode_message_import_count: 0,
            receive_mode_endpoint_update_count: 0,
            receive_mode_last_network_io_attempted: false,
            receive_mode_last_stream_accept_attempted: false,
            receive_mode_last_stream_read_write_attempted: false,
            receive_mode_last_envelope_io_opened: false,
            receive_mode_last_runtime_messaging_enabled: false,
            receive_mode_recorder_verified: false,
            received_status_verified: false,
            received_export_matches_input: false,
            second_received_status_verified: false,
            second_received_export_matches_input: false,
            event_summary: Vec::new(),
            next_blocker: "ManualClientAttemptFeatureNotEnabled".to_string(),
            blockers,
            local_endpoint_returned: false,
            peer_endpoint_returned: false,
            envelope_payload_returned: false,
            plaintext_returned_to_frontend: false,
            store_path_returned: false,
            passphrase_retained: false,
            key_material_exposed: false,
            network_io_attempted: false,
            transport_io_opened: false,
            runtime_messaging_enabled: false,
        });
    }

    #[cfg(feature = "manual-onion-client-attempt")]
    {
        use another_dimension_transport::{
            arti_adapter_spike, InMemoryTransportRuntimeEventSink,
        };

        if !manual_network_permission {
            return Ok(ProductionTwoProfileRealOnionRoundtripResult {
                warning: "Real onion roundtrip requires the manual network permission checkbox. No Tor bootstrap, onion service launch, stream I/O, or message transport was attempted.",
                manual_client_attempt_feature_compiled: true,
                manual_network_permission_enabled: false,
                sender_profile: profile_a_name,
                receiver_profile: profile_b_name,
                message_number: 0,
                second_message_number: 0,
                message_ttl_seconds,
                bootstrap_retry_limit,
                profile_a_bootstrap_attempts: 0,
                profile_b_bootstrap_attempts: 0,
                profile_a_bootstrap_reused: false,
                profile_b_bootstrap_reused: false,
                profile_a_unlocked: false,
                profile_b_unlocked: false,
                profile_a_client_bootstrapped: false,
                profile_b_client_bootstrapped: false,
                profile_a_onion_service_launched: false,
                profile_b_onion_service_launched: false,
                profile_a_endpoint_ready: false,
                profile_b_endpoint_ready: false,
                pairing_payloads_exported: false,
                session_drafts_saved: false,
                handshake_completed: false,
                sender_session_ready: false,
                receiver_session_ready: false,
                message_number_reserved: false,
                second_message_number_reserved: false,
                encrypted_envelope_exported: false,
                second_encrypted_envelope_exported: false,
                send_attempt_started: false,
                send_attempt_succeeded: false,
                second_send_attempt_succeeded: false,
                receive_attempt_started: false,
                receive_attempt_succeeded: false,
                second_receive_attempt_succeeded: false,
                inbound_message_stored: false,
                second_inbound_message_stored: false,
                consecutive_receive_attempts: 0,
                consecutive_messages_imported: 0,
                receive_mode_runtime_state: "stopped",
                receive_mode_runtime_label: "Receive mode stopped",
                receive_mode_attempt_count: 0,
                receive_mode_import_sequence: 0,
                receive_mode_message_import_count: 0,
                receive_mode_endpoint_update_count: 0,
                receive_mode_last_network_io_attempted: false,
                receive_mode_last_stream_accept_attempted: false,
                receive_mode_last_stream_read_write_attempted: false,
                receive_mode_last_envelope_io_opened: false,
                receive_mode_last_runtime_messaging_enabled: false,
                receive_mode_recorder_verified: false,
                received_status_verified: false,
                received_export_matches_input: false,
                second_received_status_verified: false,
                second_received_export_matches_input: false,
                event_summary: Vec::new(),
                next_blocker: "ManualNetworkPermissionMissing".to_string(),
                blockers: vec!["ManualNetworkPermissionMissing".to_string()],
                local_endpoint_returned: false,
                peer_endpoint_returned: false,
                envelope_payload_returned: false,
                plaintext_returned_to_frontend: false,
                store_path_returned: false,
                passphrase_retained: false,
                key_material_exposed: false,
                network_io_attempted: false,
                transport_io_opened: false,
                runtime_messaging_enabled: false,
            });
        }

        let profile_a_unlock = run_production_profile_unlock(
            &_app_data_root,
            profile_a_name.clone(),
            passphrase.clone(),
        )?;
        let profile_b_unlock = run_production_profile_unlock(
            &_app_data_root,
            profile_b_name.clone(),
            passphrase.clone(),
        )?;
        let profile_a_key_record = run_production_onion_key_record_prepare(
            &_app_data_root,
            &_app_cache_root,
            profile_a_name.clone(),
            passphrase.clone(),
        )?;
        let profile_b_key_record = run_production_onion_key_record_prepare(
            &_app_data_root,
            &_app_cache_root,
            profile_b_name.clone(),
            passphrase.clone(),
        )?;

        let blocked_result = |next_blocker: String,
                              blockers: Vec<String>,
                              event_summary: Vec<String>,
                              profile_a_bootstrap_attempts: u8,
                              profile_b_bootstrap_attempts: u8,
                              profile_a_bootstrap_reused: bool,
                              profile_b_bootstrap_reused: bool,
                              profile_a_client_bootstrapped: bool,
                              profile_b_client_bootstrapped: bool,
                              profile_a_onion_service_launched: bool,
                              profile_b_onion_service_launched: bool,
                              profile_a_endpoint_ready: bool,
                              profile_b_endpoint_ready: bool| {
            ProductionTwoProfileRealOnionRoundtripResult {
                warning: "Real onion roundtrip stopped before message transport. Retry when the reported blocker is resolved; result is redacted and no message transport was attempted.",
                manual_client_attempt_feature_compiled: true,
                manual_network_permission_enabled: true,
                sender_profile: profile_a_name.clone(),
                receiver_profile: profile_b_name.clone(),
                message_number: 0,
                second_message_number: 0,
                message_ttl_seconds,
                bootstrap_retry_limit,
                profile_a_bootstrap_attempts,
                profile_b_bootstrap_attempts,
                profile_a_bootstrap_reused,
                profile_b_bootstrap_reused,
                profile_a_unlocked: profile_a_unlock.storage_opened
                    && profile_a_unlock.profile_marker_present,
                profile_b_unlocked: profile_b_unlock.storage_opened
                    && profile_b_unlock.profile_marker_present,
                profile_a_client_bootstrapped,
                profile_b_client_bootstrapped,
                profile_a_onion_service_launched,
                profile_b_onion_service_launched,
                profile_a_endpoint_ready,
                profile_b_endpoint_ready,
                pairing_payloads_exported: false,
                session_drafts_saved: false,
                handshake_completed: false,
                sender_session_ready: false,
                receiver_session_ready: false,
                message_number_reserved: false,
                second_message_number_reserved: false,
                encrypted_envelope_exported: false,
                second_encrypted_envelope_exported: false,
                send_attempt_started: false,
                send_attempt_succeeded: false,
                second_send_attempt_succeeded: false,
                receive_attempt_started: false,
                receive_attempt_succeeded: false,
                second_receive_attempt_succeeded: false,
                inbound_message_stored: false,
                second_inbound_message_stored: false,
                consecutive_receive_attempts: 0,
                consecutive_messages_imported: 0,
                receive_mode_runtime_state: "stopped",
                receive_mode_runtime_label: "Receive mode stopped",
                receive_mode_attempt_count: 0,
                receive_mode_import_sequence: 0,
                receive_mode_message_import_count: 0,
                receive_mode_endpoint_update_count: 0,
                receive_mode_last_network_io_attempted: false,
                receive_mode_last_stream_accept_attempted: false,
                receive_mode_last_stream_read_write_attempted: false,
                receive_mode_last_envelope_io_opened: false,
                receive_mode_last_runtime_messaging_enabled: false,
                receive_mode_recorder_verified: false,
                received_status_verified: false,
                received_export_matches_input: false,
                second_received_status_verified: false,
                second_received_export_matches_input: false,
                event_summary,
                next_blocker,
                blockers,
                local_endpoint_returned: false,
                peer_endpoint_returned: false,
                envelope_payload_returned: false,
                plaintext_returned_to_frontend: false,
                store_path_returned: false,
                passphrase_retained: false,
                key_material_exposed: profile_a_unlock.key_material_exposed
                    || profile_b_unlock.key_material_exposed,
                network_io_attempted: true,
                transport_io_opened: false,
                runtime_messaging_enabled: false,
            }
        };

        let mut event_summary = Vec::new();
        let profile_a_bootstrap_attempts;
        let profile_a_bootstrap_reused;
        let mut profile_b_bootstrap_attempts = 0;
        let mut profile_b_bootstrap_reused = false;
        let mut profile_a_owner = match build_real_onion_roundtrip_owner_with_retries(
            _app_data_root.as_ref(),
            _app_cache_root.as_ref(),
            runtime_state,
            &profile_a_name,
            &mut event_summary,
            bootstrap_retry_limit,
            cancel_scope,
        )
        .await
        {
            Ok((owner, attempts, reused)) => {
                profile_a_bootstrap_attempts = attempts;
                profile_a_bootstrap_reused = reused;
                owner
            }
            Err((error, attempts)) => {
                profile_a_bootstrap_attempts = attempts;
                let (next_blocker, blockers) =
                    classify_real_onion_bootstrap_blocker("ProfileA", &error);
                event_summary.push(format!("redacted_stage={error}"));
                return Ok(blocked_result(
                    next_blocker,
                    blockers,
                    event_summary,
                    profile_a_bootstrap_attempts,
                    profile_b_bootstrap_attempts,
                    false,
                    profile_b_bootstrap_reused,
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                ));
            }
        };
        let mut profile_b_owner = match build_real_onion_roundtrip_owner_with_retries(
            _app_data_root.as_ref(),
            _app_cache_root.as_ref(),
            runtime_state,
            &profile_b_name,
            &mut event_summary,
            bootstrap_retry_limit,
            cancel_scope,
        )
        .await
        {
            Ok((owner, attempts, reused)) => {
                profile_b_bootstrap_attempts = attempts;
                profile_b_bootstrap_reused = reused;
                owner
            }
            Err((error, attempts)) => {
                profile_b_bootstrap_attempts = attempts;
                let (next_blocker, blockers) =
                    classify_real_onion_bootstrap_blocker("ProfileB", &error);
                event_summary.push(format!("redacted_stage={error}"));
                return Ok(blocked_result(
                    next_blocker,
                    blockers,
                    event_summary,
                    profile_a_bootstrap_attempts,
                    profile_b_bootstrap_attempts,
                    profile_a_bootstrap_reused,
                    profile_b_bootstrap_reused,
                    true,
                    false,
                    false,
                    false,
                    false,
                    false,
                ));
            }
        };

        let profile_a_client_bootstrapped = profile_a_owner.summary().has_bootstrapped_client();
        let profile_b_client_bootstrapped = profile_b_owner.summary().has_bootstrapped_client();
        let mut launch_sink = InMemoryTransportRuntimeEventSink::default();
        if profile_a_owner
            .launch_onion_service_once(
                arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
                &production_onion_service_nickname(&profile_a),
                &mut launch_sink,
            )
            .is_err()
        {
            event_summary.extend(launch_sink.events().iter().map(ToString::to_string));
            store_cached_real_onion_roundtrip_owner(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &profile_a_name,
                profile_a_owner,
            );
            store_cached_real_onion_roundtrip_owner(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &profile_b_name,
                profile_b_owner,
            );
            return Ok(blocked_result(
                "ProfileAOnionServiceLaunchFailed".to_string(),
                vec!["OnionServiceLaunchFailed".to_string()],
                event_summary,
                profile_a_bootstrap_attempts,
                profile_b_bootstrap_attempts,
                profile_a_bootstrap_reused,
                profile_b_bootstrap_reused,
                profile_a_client_bootstrapped,
                profile_b_client_bootstrapped,
                false,
                false,
                false,
                false,
            ));
        }
        if profile_b_owner
            .launch_onion_service_once(
                arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
                &production_onion_service_nickname(&profile_b),
                &mut launch_sink,
            )
            .is_err()
        {
            event_summary.extend(launch_sink.events().iter().map(ToString::to_string));
            store_cached_real_onion_roundtrip_owner(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &profile_a_name,
                profile_a_owner,
            );
            store_cached_real_onion_roundtrip_owner(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &profile_b_name,
                profile_b_owner,
            );
            return Ok(blocked_result(
                "ProfileBOnionServiceLaunchFailed".to_string(),
                vec!["OnionServiceLaunchFailed".to_string()],
                event_summary,
                profile_a_bootstrap_attempts,
                profile_b_bootstrap_attempts,
                profile_a_bootstrap_reused,
                profile_b_bootstrap_reused,
                profile_a_client_bootstrapped,
                profile_b_client_bootstrapped,
                true,
                false,
                false,
                false,
            ));
        }
        event_summary.extend(launch_sink.events().iter().map(ToString::to_string));

        let profile_a_endpoint = match profile_a_owner.retained_onion_endpoint() {
            Some(endpoint) => endpoint,
            None => {
                store_cached_real_onion_roundtrip_owner(
                    runtime_state,
                    _app_data_root.as_ref(),
                    _app_cache_root.as_ref(),
                    &profile_a_name,
                    profile_a_owner,
                );
                store_cached_real_onion_roundtrip_owner(
                    runtime_state,
                    _app_data_root.as_ref(),
                    _app_cache_root.as_ref(),
                    &profile_b_name,
                    profile_b_owner,
                );
                return Ok(blocked_result(
                    "ProfileAEndpointUnavailable".to_string(),
                    vec!["EndpointUnavailable".to_string()],
                    event_summary,
                    profile_a_bootstrap_attempts,
                    profile_b_bootstrap_attempts,
                    profile_a_bootstrap_reused,
                    profile_b_bootstrap_reused,
                    profile_a_client_bootstrapped,
                    profile_b_client_bootstrapped,
                    true,
                    true,
                    false,
                    false,
                ));
            }
        };
        let profile_b_endpoint = match profile_b_owner.retained_onion_endpoint() {
            Some(endpoint) => endpoint,
            None => {
                store_cached_real_onion_roundtrip_owner(
                    runtime_state,
                    _app_data_root.as_ref(),
                    _app_cache_root.as_ref(),
                    &profile_a_name,
                    profile_a_owner,
                );
                store_cached_real_onion_roundtrip_owner(
                    runtime_state,
                    _app_data_root.as_ref(),
                    _app_cache_root.as_ref(),
                    &profile_b_name,
                    profile_b_owner,
                );
                return Ok(blocked_result(
                    "ProfileBEndpointUnavailable".to_string(),
                    vec!["EndpointUnavailable".to_string()],
                    event_summary,
                    profile_a_bootstrap_attempts,
                    profile_b_bootstrap_attempts,
                    profile_a_bootstrap_reused,
                    profile_b_bootstrap_reused,
                    profile_a_client_bootstrapped,
                    profile_b_client_bootstrapped,
                    true,
                    true,
                    true,
                    false,
                ));
            }
        };

        let profile_a_payload = run_production_pairing_payload_export(
            &_app_data_root,
            profile_a_name.clone(),
            passphrase.clone(),
            profile_a_endpoint.clone(),
        )?;
        let profile_b_payload = run_production_pairing_payload_export(
            &_app_data_root,
            profile_b_name.clone(),
            passphrase.clone(),
            profile_b_endpoint.clone(),
        )?;
        let profile_a_draft = run_production_pairing_session_draft_save(
            &_app_data_root,
            profile_a_name.clone(),
            passphrase.clone(),
            profile_a_payload.pairing_payload.clone(),
            profile_b_payload.pairing_payload.clone(),
            true,
        )?;
        let profile_b_draft = run_production_pairing_session_draft_save(
            &_app_data_root,
            profile_b_name.clone(),
            passphrase.clone(),
            profile_b_payload.pairing_payload,
            profile_a_payload.pairing_payload,
            true,
        )?;

        let profile_a_init = run_production_handshake_init_export(
            &_app_data_root,
            profile_a_name.clone(),
            passphrase.clone(),
        )?;
        let mut profile_b_init = None;
        let (sender_profile, receiver_profile, sender_owner, receiver_owner, receiver_endpoint, init_payload) =
            if profile_a_init.output_payload_created {
                (
                    profile_a_name.clone(),
                    profile_b_name.clone(),
                    profile_a_owner,
                    profile_b_owner,
                    profile_b_endpoint,
                    profile_a_init.output_payload,
                )
            } else {
                let init = run_production_handshake_init_export(
                    &_app_data_root,
                    profile_b_name.clone(),
                    passphrase.clone(),
                )?;
                if !init.output_payload_created {
                    return Err("real onion handshake init was not created".to_string());
                }
                let output_payload = init.output_payload.clone();
                profile_b_init = Some(init);
                (
                    profile_b_name.clone(),
                    profile_a_name.clone(),
                    profile_b_owner,
                    profile_a_owner,
                    profile_a_endpoint,
                    output_payload,
                )
            };

        let reply = run_production_handshake_reply_export(
            &_app_data_root,
            receiver_profile.clone(),
            passphrase.clone(),
            init_payload,
        )?;
        let finish = run_production_handshake_finish_export(
            &_app_data_root,
            sender_profile.clone(),
            passphrase.clone(),
            reply.output_payload,
        )?;
        let finish_import = run_production_handshake_finish_import(
            &_app_data_root,
            receiver_profile.clone(),
            passphrase.clone(),
            finish.output_payload,
        )?;
        let sender_state = run_production_session_state_check(
            &_app_data_root,
            sender_profile.clone(),
            passphrase.clone(),
        )?;
        let receiver_state = run_production_session_state_check(
            &_app_data_root,
            receiver_profile.clone(),
            passphrase.clone(),
        )?;
        let message_number = run_production_message_number_reserve(
            &_app_data_root,
            sender_profile.clone(),
            passphrase.clone(),
        )?;
        let sender_profile_result = sender_profile.clone();
        let receiver_profile_result = receiver_profile.clone();
        let outbound = run_production_message_envelope_export(
            &_app_data_root,
            sender_profile.clone(),
            passphrase.clone(),
            message_number,
            false,
            message_text.clone(),
            message_ttl_seconds,
        )?;
        let sender_runtime_state = ProductionOnionClientRuntimeState::default();
        let receiver_runtime_state = ProductionOnionClientRuntimeState::default();
        if let Ok(mut guard) = sender_runtime_state.owner.lock() {
            *guard = Some(sender_owner);
        }
        if let Ok(mut guard) = receiver_runtime_state.owner.lock() {
            *guard = Some(receiver_owner);
        }
        let _ = run_production_onion_receive_loop_start(
            &receiver_runtime_state,
            receiver_profile.clone(),
            true,
        );
        let _ = run_production_onion_receive_loop_worker_started(&receiver_runtime_state);
        let build_transport_blocked_result =
            |next_blocker: String,
             blockers: Vec<String>,
             message_number: u64,
             second_message_number: u64,
             first_outbound: &ProductionMessageEnvelopeExportResult,
             second_outbound: Option<&ProductionMessageEnvelopeExportResult>,
             first_send: Option<&ProductionOnionOutboundEnvelopeSendAttemptResult>,
             first_receive: Option<&ProductionOnionInboundEnvelopeReceiveAttemptResult>,
             second_send: Option<&ProductionOnionOutboundEnvelopeSendAttemptResult>,
             second_receive: Option<&ProductionOnionInboundEnvelopeReceiveAttemptResult>,
             first_received: Option<&ProductionMessageReceivedExportResult>,
             event_summary_snapshot: Vec<String>| {
                let receive_mode_status =
                    run_production_onion_receive_loop_status(&receiver_runtime_state, false);
                let send_network = first_send
                    .map(|attempt| attempt.network_io_attempted)
                    .unwrap_or(false)
                    || second_send
                        .map(|attempt| attempt.network_io_attempted)
                        .unwrap_or(false);
                let receive_network = first_receive
                    .map(|attempt| attempt.network_io_attempted)
                    .unwrap_or(false)
                    || second_receive
                        .map(|attempt| attempt.network_io_attempted)
                        .unwrap_or(false);
                let send_transport = first_send
                    .map(|attempt| {
                        attempt.stream_dial_attempted
                            || attempt.stream_read_write_attempted
                            || attempt.stream_send_attempted
                            || attempt.envelope_io_opened
                    })
                    .unwrap_or(false)
                    || second_send
                        .map(|attempt| {
                            attempt.stream_dial_attempted
                                || attempt.stream_read_write_attempted
                                || attempt.stream_send_attempted
                                || attempt.envelope_io_opened
                        })
                        .unwrap_or(false);
                let receive_transport = first_receive
                    .map(|attempt| {
                        attempt.stream_accept_attempted
                            || attempt.stream_read_write_attempted
                            || attempt.envelope_io_opened
                    })
                    .unwrap_or(false)
                    || second_receive
                        .map(|attempt| {
                            attempt.stream_accept_attempted
                                || attempt.stream_read_write_attempted
                                || attempt.envelope_io_opened
                        })
                        .unwrap_or(false);
                let runtime_messaging = first_send
                    .map(|attempt| attempt.runtime_messaging_enabled)
                    .unwrap_or(false)
                    || first_receive
                        .map(|attempt| attempt.runtime_messaging_enabled)
                        .unwrap_or(false)
                    || second_send
                        .map(|attempt| attempt.runtime_messaging_enabled)
                        .unwrap_or(false)
                    || second_receive
                        .map(|attempt| attempt.runtime_messaging_enabled)
                        .unwrap_or(false);
                let first_received_verified = first_receive
                    .map(|attempt| attempt.received_envelope_ready)
                    .unwrap_or(false)
                    && first_received
                        .map(|received| received.received_message_matches_session)
                        .unwrap_or(false);
                let first_received_matches = first_received
                    .map(|received| received.received_message.as_bytes() == message.as_slice())
                    .unwrap_or(false);

                ProductionTwoProfileRealOnionRoundtripResult {
                    warning: "Real onion roundtrip stopped during message transport. The transcript state is preserved and the result is redacted.",
                    manual_client_attempt_feature_compiled: true,
                    manual_network_permission_enabled: true,
                    sender_profile: sender_profile_result.clone(),
                    receiver_profile: receiver_profile_result.clone(),
                    message_number,
                    second_message_number,
                    message_ttl_seconds,
                    bootstrap_retry_limit,
                    profile_a_bootstrap_attempts,
                    profile_b_bootstrap_attempts,
                    profile_a_bootstrap_reused,
                    profile_b_bootstrap_reused,
                    profile_a_unlocked: profile_a_unlock.storage_opened
                        && profile_a_unlock.profile_marker_present,
                    profile_b_unlocked: profile_b_unlock.storage_opened
                        && profile_b_unlock.profile_marker_present,
                    profile_a_client_bootstrapped,
                    profile_b_client_bootstrapped,
                    profile_a_onion_service_launched: true,
                    profile_b_onion_service_launched: true,
                    profile_a_endpoint_ready: true,
                    profile_b_endpoint_ready: true,
                    pairing_payloads_exported: profile_a_payload.pairing_payload_exported
                        && profile_b_payload.pairing_payload_exported,
                    session_drafts_saved: profile_a_draft.session_draft_present
                        && profile_b_draft.session_draft_present,
                    handshake_completed: finish.transport_state_persisted
                        && finish_import.transport_state_persisted,
                    sender_session_ready: sender_state.ready_for_message_envelope,
                    receiver_session_ready: receiver_state.session_transport_state_present
                        && receiver_state.runtime_material_reconstructable,
                    message_number_reserved: first_outbound.message_number_reserved,
                    second_message_number_reserved: second_outbound
                        .map(|outbound| outbound.message_number_reserved)
                        .unwrap_or(false),
                    encrypted_envelope_exported: first_outbound.encrypted_envelope_present,
                    second_encrypted_envelope_exported: second_outbound
                        .map(|outbound| outbound.encrypted_envelope_present)
                        .unwrap_or(false),
                    send_attempt_started: first_send
                        .map(|attempt| attempt.send_attempt_started)
                        .unwrap_or(false),
                    send_attempt_succeeded: first_send
                        .map(|attempt| attempt.send_attempt_succeeded)
                        .unwrap_or(false),
                    second_send_attempt_succeeded: second_send
                        .map(|attempt| attempt.send_attempt_succeeded)
                        .unwrap_or(false),
                    receive_attempt_started: first_receive
                        .map(|attempt| attempt.receive_attempt_started)
                        .unwrap_or(false),
                    receive_attempt_succeeded: first_receive
                        .map(|attempt| attempt.receive_attempt_succeeded)
                        .unwrap_or(false),
                    second_receive_attempt_succeeded: second_receive
                        .map(|attempt| attempt.receive_attempt_succeeded)
                        .unwrap_or(false),
                    inbound_message_stored: first_receive
                        .map(|attempt| attempt.received_envelope_ready)
                        .unwrap_or(false),
                    second_inbound_message_stored: second_receive
                        .map(|attempt| attempt.received_envelope_ready)
                        .unwrap_or(false),
                    consecutive_receive_attempts: receive_mode_status.attempt_count,
                    consecutive_messages_imported: receive_mode_status.message_import_count,
                    receive_mode_runtime_state: receive_mode_status.runtime_state,
                    receive_mode_runtime_label: receive_mode_status.runtime_label,
                    receive_mode_attempt_count: receive_mode_status.attempt_count,
                    receive_mode_import_sequence: receive_mode_status.import_sequence,
                    receive_mode_message_import_count: receive_mode_status.message_import_count,
                    receive_mode_endpoint_update_count: receive_mode_status.endpoint_update_count,
                    receive_mode_last_network_io_attempted: receive_mode_status
                        .last_network_io_attempted,
                    receive_mode_last_stream_accept_attempted: receive_mode_status
                        .last_stream_accept_attempted,
                    receive_mode_last_stream_read_write_attempted: receive_mode_status
                        .last_stream_read_write_attempted,
                    receive_mode_last_envelope_io_opened: receive_mode_status
                        .last_envelope_io_opened,
                    receive_mode_last_runtime_messaging_enabled: receive_mode_status
                        .last_runtime_messaging_enabled,
                    receive_mode_recorder_verified: false,
                    received_status_verified: first_received_verified,
                    received_export_matches_input: first_received_matches,
                    second_received_status_verified: false,
                    second_received_export_matches_input: false,
                    event_summary: event_summary_snapshot,
                    next_blocker,
                    blockers,
                    local_endpoint_returned: false,
                    peer_endpoint_returned: false,
                    envelope_payload_returned: false,
                    plaintext_returned_to_frontend: false,
                    store_path_returned: false,
                    passphrase_retained: false,
                    key_material_exposed: profile_a_unlock.key_material_exposed
                        || profile_b_unlock.key_material_exposed
                        || profile_a_key_record.key_material_exposed
                        || profile_b_key_record.key_material_exposed
                        || profile_a_payload.key_material_exposed
                        || profile_b_payload.key_material_exposed
                        || profile_a_draft.key_material_exposed
                        || profile_b_draft.key_material_exposed
                        || profile_a_init.key_material_exposed
                        || profile_b_init
                            .as_ref()
                            .map(|init| init.key_material_exposed)
                            .unwrap_or(false)
                        || reply.key_material_exposed
                        || finish.key_material_exposed
                        || finish_import.key_material_exposed
                        || sender_state.key_material_exposed
                        || receiver_state.key_material_exposed
                        || first_outbound.key_material_exposed
                        || second_outbound
                            .map(|outbound| outbound.key_material_exposed)
                            .unwrap_or(false)
                        || first_send
                            .map(|attempt| attempt.key_material_exposed)
                            .unwrap_or(false)
                        || first_receive
                            .map(|attempt| attempt.key_material_exposed)
                            .unwrap_or(false)
                        || second_send
                            .map(|attempt| attempt.key_material_exposed)
                            .unwrap_or(false)
                        || second_receive
                            .map(|attempt| attempt.key_material_exposed)
                            .unwrap_or(false)
                        || first_received
                            .map(|received| received.key_material_exposed)
                            .unwrap_or(false),
                    network_io_attempted: send_network || receive_network,
                    transport_io_opened: send_transport || receive_transport,
                    runtime_messaging_enabled: runtime_messaging,
                }
            };
        let receive_future = run_production_onion_inbound_envelope_receive_attempt(
            &_app_data_root,
            &_app_cache_root,
            &receiver_runtime_state,
            receiver_profile.clone(),
            passphrase.clone(),
            true,
        );
        let send_future = run_production_onion_outbound_envelope_send_attempt(
            &_app_data_root,
            &_app_cache_root,
            &sender_runtime_state,
            sender_profile.clone(),
            passphrase.clone(),
            receiver_endpoint.clone(),
            message_number,
            true,
        );
        let (inbound_result, send_result) = tokio::join!(receive_future, send_future);
        let inbound_attempt = inbound_result.map_err(|_| "real onion receive attempt failed")?;
        let send_attempt = send_result.map_err(|_| "real onion send attempt failed")?;
        event_summary.extend(send_attempt.event_summary.iter().cloned());
        event_summary.extend(inbound_attempt.event_summary.iter().cloned());
        if !send_attempt.send_attempt_succeeded {
            let mut blockers = vec!["SendAttemptFailed".to_string()];
            if send_attempt.next_blocker != "none"
                && !blockers.iter().any(|blocker| blocker == &send_attempt.next_blocker)
            {
                blockers.push(send_attempt.next_blocker.clone());
            }
            restore_real_onion_roundtrip_runtime_owners(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &sender_profile_result,
                &receiver_profile_result,
                &sender_runtime_state,
                &receiver_runtime_state,
            );
            return Ok(build_transport_blocked_result(
                "SendAttemptFailed".to_string(),
                blockers,
                message_number,
                0,
                &outbound,
                None,
                Some(&send_attempt),
                Some(&inbound_attempt),
                None,
                None,
                None,
                event_summary.clone(),
            ));
        }
        if !inbound_attempt.receive_attempt_succeeded {
            let mut blockers = vec!["ReceiveAttemptFailed".to_string()];
            if inbound_attempt.next_blocker != "none"
                && !blockers
                    .iter()
                    .any(|blocker| blocker == &inbound_attempt.next_blocker)
            {
                blockers.push(inbound_attempt.next_blocker.clone());
            }
            restore_real_onion_roundtrip_runtime_owners(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &sender_profile_result,
                &receiver_profile_result,
                &sender_runtime_state,
                &receiver_runtime_state,
            );
            return Ok(build_transport_blocked_result(
                "ReceiveAttemptFailed".to_string(),
                blockers,
                message_number,
                0,
                &outbound,
                None,
                Some(&send_attempt),
                Some(&inbound_attempt),
                None,
                None,
                None,
                event_summary.clone(),
            ));
        }
        let received = run_production_message_received_export(
            &_app_data_root,
            receiver_profile.clone(),
            passphrase.clone(),
            message_number,
        )?;
        let second_message_number = run_production_message_number_reserve(
            &_app_data_root,
            sender_profile.clone(),
            passphrase.clone(),
        )?;
        let second_outbound = run_production_message_envelope_export(
            &_app_data_root,
            sender_profile.clone(),
            passphrase.clone(),
            second_message_number,
            false,
            message_text,
            message_ttl_seconds,
        )?;
        let second_receive_future = run_production_onion_inbound_envelope_receive_attempt(
            &_app_data_root,
            &_app_cache_root,
            &receiver_runtime_state,
            receiver_profile.clone(),
            passphrase.clone(),
            true,
        );
        let second_send_future = run_production_onion_outbound_envelope_send_attempt(
            &_app_data_root,
            &_app_cache_root,
            &sender_runtime_state,
            sender_profile.clone(),
            passphrase.clone(),
            receiver_endpoint,
            second_message_number,
            true,
        );
        let (second_inbound_result, second_send_result) =
            tokio::join!(second_receive_future, second_send_future);
        let second_inbound_attempt =
            second_inbound_result.map_err(|_| "real onion second receive attempt failed")?;
        let second_send_attempt =
            second_send_result.map_err(|_| "real onion second send attempt failed")?;
        event_summary.extend(second_send_attempt.event_summary.iter().cloned());
        event_summary.extend(second_inbound_attempt.event_summary.iter().cloned());
        if !second_send_attempt.send_attempt_succeeded {
            let mut blockers = vec!["SecondSendAttemptFailed".to_string()];
            if second_send_attempt.next_blocker != "none"
                && !blockers
                    .iter()
                    .any(|blocker| blocker == &second_send_attempt.next_blocker)
            {
                blockers.push(second_send_attempt.next_blocker.clone());
            }
            restore_real_onion_roundtrip_runtime_owners(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &sender_profile_result,
                &receiver_profile_result,
                &sender_runtime_state,
                &receiver_runtime_state,
            );
            return Ok(build_transport_blocked_result(
                "SecondSendAttemptFailed".to_string(),
                blockers,
                message_number,
                second_message_number,
                &outbound,
                Some(&second_outbound),
                Some(&send_attempt),
                Some(&inbound_attempt),
                Some(&second_send_attempt),
                Some(&second_inbound_attempt),
                Some(&received),
                event_summary.clone(),
            ));
        }
        if !second_inbound_attempt.receive_attempt_succeeded {
            let mut blockers = vec!["SecondReceiveAttemptFailed".to_string()];
            if second_inbound_attempt.next_blocker != "none"
                && !blockers
                    .iter()
                    .any(|blocker| blocker == &second_inbound_attempt.next_blocker)
            {
                blockers.push(second_inbound_attempt.next_blocker.clone());
            }
            restore_real_onion_roundtrip_runtime_owners(
                runtime_state,
                _app_data_root.as_ref(),
                _app_cache_root.as_ref(),
                &sender_profile_result,
                &receiver_profile_result,
                &sender_runtime_state,
                &receiver_runtime_state,
            );
            return Ok(build_transport_blocked_result(
                "SecondReceiveAttemptFailed".to_string(),
                blockers,
                message_number,
                second_message_number,
                &outbound,
                Some(&second_outbound),
                Some(&send_attempt),
                Some(&inbound_attempt),
                Some(&second_send_attempt),
                Some(&second_inbound_attempt),
                Some(&received),
                event_summary.clone(),
            ));
        }
        let second_received = run_production_message_received_export(
            &_app_data_root,
            receiver_profile,
            passphrase,
            second_message_number,
        )?;
        let receive_mode_status =
            run_production_onion_receive_loop_status(&receiver_runtime_state, false);
        let consecutive_messages_imported = receive_mode_status.message_import_count;
        let receive_mode_recorder_verified = receive_mode_status.attempt_count == 2
            && receive_mode_status.import_sequence == 2
            && receive_mode_status.message_import_count == 2
            && receive_mode_status.endpoint_update_count == 0
            && receive_mode_status.last_network_io_attempted
            && receive_mode_status.last_stream_accept_attempted
            && receive_mode_status.last_stream_read_write_attempted
            && receive_mode_status.last_envelope_io_opened
            && receive_mode_status.last_runtime_messaging_enabled;
        restore_real_onion_roundtrip_runtime_owners(
            runtime_state,
            _app_data_root.as_ref(),
            _app_cache_root.as_ref(),
            &sender_profile_result,
            &receiver_profile_result,
            &sender_runtime_state,
            &receiver_runtime_state,
        );

        Ok(ProductionTwoProfileRealOnionRoundtripResult {
            warning: "real onion two-profile roundtrip attempted with explicit manual network permission; result returns redacted transport status only",
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: true,
            sender_profile: sender_profile_result,
            receiver_profile: receiver_profile_result,
            message_number,
            second_message_number,
            message_ttl_seconds,
            bootstrap_retry_limit,
            profile_a_bootstrap_attempts,
            profile_b_bootstrap_attempts,
            profile_a_bootstrap_reused,
            profile_b_bootstrap_reused,
            profile_a_unlocked: profile_a_unlock.storage_opened
                && profile_a_unlock.profile_marker_present,
            profile_b_unlocked: profile_b_unlock.storage_opened
                && profile_b_unlock.profile_marker_present,
            profile_a_client_bootstrapped,
            profile_b_client_bootstrapped,
            profile_a_onion_service_launched: true,
            profile_b_onion_service_launched: true,
            profile_a_endpoint_ready: true,
            profile_b_endpoint_ready: true,
            pairing_payloads_exported: profile_a_payload.pairing_payload_exported
                && profile_b_payload.pairing_payload_exported,
            session_drafts_saved: profile_a_draft.session_draft_present
                && profile_b_draft.session_draft_present,
            handshake_completed: finish.transport_state_persisted
                && finish_import.transport_state_persisted,
            sender_session_ready: sender_state.ready_for_message_envelope,
            receiver_session_ready: receiver_state.session_transport_state_present
                && receiver_state.runtime_material_reconstructable,
            message_number_reserved: outbound.message_number_reserved,
            second_message_number_reserved: second_outbound.message_number_reserved,
            encrypted_envelope_exported: outbound.encrypted_envelope_present,
            second_encrypted_envelope_exported: second_outbound.encrypted_envelope_present,
            send_attempt_started: send_attempt.send_attempt_started,
            send_attempt_succeeded: send_attempt.send_attempt_succeeded,
            second_send_attempt_succeeded: second_send_attempt.send_attempt_succeeded,
            receive_attempt_started: inbound_attempt.receive_attempt_started,
            receive_attempt_succeeded: inbound_attempt.receive_attempt_succeeded,
            second_receive_attempt_succeeded: second_inbound_attempt.receive_attempt_succeeded,
            inbound_message_stored: inbound_attempt.received_envelope_ready,
            second_inbound_message_stored: second_inbound_attempt.received_envelope_ready,
            consecutive_receive_attempts: 2,
            consecutive_messages_imported,
            receive_mode_runtime_state: receive_mode_status.runtime_state,
            receive_mode_runtime_label: receive_mode_status.runtime_label,
            receive_mode_attempt_count: receive_mode_status.attempt_count,
            receive_mode_import_sequence: receive_mode_status.import_sequence,
            receive_mode_message_import_count: receive_mode_status.message_import_count,
            receive_mode_endpoint_update_count: receive_mode_status.endpoint_update_count,
            receive_mode_last_network_io_attempted: receive_mode_status.last_network_io_attempted,
            receive_mode_last_stream_accept_attempted: receive_mode_status
                .last_stream_accept_attempted,
            receive_mode_last_stream_read_write_attempted: receive_mode_status
                .last_stream_read_write_attempted,
            receive_mode_last_envelope_io_opened: receive_mode_status.last_envelope_io_opened,
            receive_mode_last_runtime_messaging_enabled: receive_mode_status
                .last_runtime_messaging_enabled,
            receive_mode_recorder_verified,
            received_status_verified: inbound_attempt.received_envelope_ready
                && received.received_message_matches_session,
            second_received_status_verified: second_inbound_attempt.received_envelope_ready
                && second_received.received_message_matches_session,
            received_export_matches_input: received.received_message.as_bytes() == message.as_slice(),
            second_received_export_matches_input: second_received.received_message.as_bytes()
                == message.as_slice(),
            event_summary,
            next_blocker: "none".to_string(),
            blockers: Vec::new(),
            local_endpoint_returned: false,
            peer_endpoint_returned: false,
            envelope_payload_returned: false,
            plaintext_returned_to_frontend: false,
            store_path_returned: false,
            passphrase_retained: false,
            key_material_exposed: profile_a_unlock.key_material_exposed
                || profile_b_unlock.key_material_exposed
                || profile_a_key_record.key_material_exposed
                || profile_b_key_record.key_material_exposed
                || profile_a_payload.key_material_exposed
                || profile_b_payload.key_material_exposed
                || profile_a_draft.key_material_exposed
                || profile_b_draft.key_material_exposed
                || profile_a_init.key_material_exposed
                || profile_b_init
                    .as_ref()
                    .is_some_and(|result| result.key_material_exposed)
                || reply.key_material_exposed
                || finish.key_material_exposed
                || finish_import.key_material_exposed
                || sender_state.key_material_exposed
                || receiver_state.key_material_exposed
                || outbound.key_material_exposed
                || received.key_material_exposed
                || second_outbound.key_material_exposed
                || second_received.key_material_exposed,
            network_io_attempted: true,
            transport_io_opened: true,
            runtime_messaging_enabled: true,
        })
    }
}

#[cfg(feature = "manual-onion-client-attempt")]
fn classify_real_onion_bootstrap_blocker(
    profile_prefix: &str,
    redacted_bootstrap_error: &str,
) -> (String, Vec<String>) {
    let blocker = if redacted_bootstrap_error.contains("BootstrapCancelled") {
        "BootstrapCancelled"
    } else if redacted_bootstrap_error.contains("RuntimeNetworkDisabled") {
        "NetworkDisabled"
    } else if redacted_bootstrap_error.contains("BootstrapNetworkAccessFailed") {
        "BootstrapNetworkAccessFailed"
    } else if redacted_bootstrap_error.contains("BootstrapLocalStateFailed") {
        "BootstrapLocalStateFailed"
    } else if redacted_bootstrap_error.contains("BootstrapConfigurationFailed") {
        "BootstrapConfigurationFailed"
    } else if redacted_bootstrap_error.contains("BootstrapUnsupported") {
        "BootstrapUnsupported"
    } else if redacted_bootstrap_error.contains("BootstrapProtocolFailed") {
        "BootstrapProtocolFailed"
    } else if redacted_bootstrap_error.contains("BootstrapTransientFailure") {
        "BootstrapTransientFailure"
    } else if redacted_bootstrap_error.contains("CensorshipOrBridgeRequired") {
        "CensorshipOrBridgeRequired"
    } else if redacted_bootstrap_error.contains("BootstrapTimeout") {
        "BootstrapTimeout"
    } else {
        "BootstrapFailed"
    };
    (format!("{profile_prefix}{blocker}"), vec![blocker.to_string()])
}

#[cfg(feature = "manual-onion-client-attempt")]
fn real_onion_bootstrap_error_retryable(redacted_bootstrap_error: &str) -> bool {
    redacted_bootstrap_error.contains("BootstrapTimeout")
        || redacted_bootstrap_error.contains("BootstrapNetworkAccessFailed")
        || redacted_bootstrap_error.contains("BootstrapTransientFailure")
        || redacted_bootstrap_error.contains("CensorshipOrBridgeRequired")
}

#[cfg(feature = "manual-onion-client-attempt")]
fn real_onion_roundtrip_owner_cache_key(
    app_data_root: &std::path::Path,
    app_cache_root: &std::path::Path,
    profile: &str,
) -> String {
    format!(
        "{}|{}|{}",
        app_data_root.display(),
        app_cache_root.display(),
        profile
    )
}

#[cfg(feature = "manual-onion-client-attempt")]
fn take_cached_real_onion_roundtrip_owner(
    runtime_state: Option<&ProductionOnionClientRuntimeState>,
    app_data_root: &std::path::Path,
    app_cache_root: &std::path::Path,
    profile: &str,
) -> Option<another_dimension_transport::arti_adapter_spike::PersistentArtiClientOwner> {
    let runtime_state = runtime_state?;
    let key = real_onion_roundtrip_owner_cache_key(app_data_root, app_cache_root, profile);
    let mut guard = runtime_state.real_onion_roundtrip_owners.lock().ok()?;
    guard.remove(&key).and_then(|owner| {
        if owner.summary().has_bootstrapped_client() {
            Some(owner)
        } else {
            None
        }
    })
}

#[cfg(feature = "manual-onion-client-attempt")]
fn store_cached_real_onion_roundtrip_owner(
    runtime_state: Option<&ProductionOnionClientRuntimeState>,
    app_data_root: &std::path::Path,
    app_cache_root: &std::path::Path,
    profile: &str,
    owner: another_dimension_transport::arti_adapter_spike::PersistentArtiClientOwner,
) {
    if !owner.summary().has_bootstrapped_client() {
        return;
    }
    let Some(runtime_state) = runtime_state else {
        return;
    };
    let key = real_onion_roundtrip_owner_cache_key(app_data_root, app_cache_root, profile);
    if let Ok(mut guard) = runtime_state.real_onion_roundtrip_owners.lock() {
        guard.insert(key, owner);
    }
}

#[cfg(feature = "manual-onion-client-attempt")]
fn promote_cached_real_onion_roundtrip_owner_to_persistent_owner(
    state: &ProductionOnionClientRuntimeState,
    app_data_root: &std::path::Path,
    app_cache_root: &std::path::Path,
    profile: &str,
) -> bool {
    let persistent_owner_ready = state
        .owner
        .lock()
        .ok()
        .and_then(|guard| guard.as_ref().map(|owner| owner.summary().has_bootstrapped_client()))
        .unwrap_or(false);
    if persistent_owner_ready {
        return false;
    }

    let Some(owner) =
        take_cached_real_onion_roundtrip_owner(Some(state), app_data_root, app_cache_root, profile)
    else {
        return false;
    };

    match state.owner.lock() {
        Ok(mut guard) => {
            if guard
                .as_ref()
                .is_some_and(|owner| owner.summary().has_bootstrapped_client())
            {
                store_cached_real_onion_roundtrip_owner(
                    Some(state),
                    app_data_root,
                    app_cache_root,
                    profile,
                    owner,
                );
                false
            } else {
                *guard = Some(owner);
                true
            }
        }
        Err(_) => {
            store_cached_real_onion_roundtrip_owner(
                Some(state),
                app_data_root,
                app_cache_root,
                profile,
                owner,
            );
            false
        }
    }
}

#[cfg(feature = "manual-onion-client-attempt")]
fn restore_real_onion_roundtrip_runtime_owners(
    runtime_state: Option<&ProductionOnionClientRuntimeState>,
    app_data_root: &std::path::Path,
    app_cache_root: &std::path::Path,
    sender_profile: &str,
    receiver_profile: &str,
    sender_runtime_state: &ProductionOnionClientRuntimeState,
    receiver_runtime_state: &ProductionOnionClientRuntimeState,
) {
    if let Ok(mut guard) = sender_runtime_state.owner.lock() {
        if let Some(owner) = guard.take() {
            store_cached_real_onion_roundtrip_owner(
                runtime_state,
                app_data_root,
                app_cache_root,
                sender_profile,
                owner,
            );
        }
    }
    if let Ok(mut guard) = receiver_runtime_state.owner.lock() {
        if let Some(owner) = guard.take() {
            store_cached_real_onion_roundtrip_owner(
                runtime_state,
                app_data_root,
                app_cache_root,
                receiver_profile,
                owner,
            );
        }
    }
}

#[cfg(feature = "manual-onion-client-attempt")]
async fn build_real_onion_roundtrip_owner_with_retries(
    app_data_root: &std::path::Path,
    app_cache_root: &std::path::Path,
    runtime_state: Option<&ProductionOnionClientRuntimeState>,
    profile: &str,
    event_summary: &mut Vec<String>,
    bootstrap_retry_limit: u8,
    cancel_scope: Option<&RealOnionRoundtripCancelScope<'_>>,
) -> Result<
    (
        another_dimension_transport::arti_adapter_spike::PersistentArtiClientOwner,
        u8,
        bool,
    ),
    (String, u8),
> {
    if let Some(owner) =
        take_cached_real_onion_roundtrip_owner(runtime_state, app_data_root, app_cache_root, profile)
    {
        event_summary.push("bootstrap_reuse profile=redacted".to_string());
        return Ok((owner, 0, true));
    }
    let attempts = bootstrap_retry_limit.max(1);
    let mut last_error = String::new();
    for attempt in 1..=attempts {
        event_summary.push(format!("bootstrap_attempt profile=redacted attempt={attempt}"));
        match build_real_onion_roundtrip_owner(
            app_data_root,
            app_cache_root,
            profile,
            event_summary,
            cancel_scope,
        )
        .await
        {
            Ok(owner) => return Ok((owner, attempt, false)),
            Err(error) => {
                let retryable = real_onion_bootstrap_error_retryable(&error)
                    && !error.contains("BootstrapCancelled")
                    && attempt < attempts;
                last_error = error;
                if !retryable {
                    return Err((last_error, attempt));
                }
                event_summary.push(format!(
                    "bootstrap_retry_wait profile=redacted completed_attempt={attempt}"
                ));
                tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            }
        }
    }
    Err((last_error, attempts))
}

#[cfg(feature = "manual-onion-client-attempt")]
async fn build_real_onion_roundtrip_owner(
    app_data_root: &std::path::Path,
    app_cache_root: &std::path::Path,
    profile: &str,
    event_summary: &mut Vec<String>,
    cancel_scope: Option<&RealOnionRoundtripCancelScope<'_>>,
) -> Result<another_dimension_transport::arti_adapter_spike::PersistentArtiClientOwner, String> {
    use another_dimension_transport::{
        arti_adapter_spike, probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
        BridgeCensorshipConfiguration, BridgeRequirement, InMemoryTransportRuntimeEventSink,
        TransportBootstrapExecutionSkeleton, TransportBootstrapPolicy, TransportBootstrapRetryPolicy,
        TransportBootstrapTimeoutPolicy, TransportCrashRedactionPolicy,
        TransportLogRedactionPolicy, TransportRuntimePermissionPreflight,
    };

    let transport_root = app_data_root
        .join("profiles")
        .join(profile)
        .join("real-onion-roundtrip");
    let cache_root = app_cache_root
        .join("profiles")
        .join(profile)
        .join("real-onion-roundtrip");
    let dirs =
        probe_app_private_state_cache_dirs(transport_root.join("arti-state"), cache_root.join("arti-cache"))
            .map_err(|_| "real onion state/cache dirs unavailable")?;
    let _ = mark_transport_backup_exclusion(&dirs);
    let backup_exclusion =
        verify_transport_backup_exclusion(&dirs).map_err(|_| "real onion backup exclusion not verified")?;
    let bridge_ready = BridgeCensorshipConfiguration::NoBridgeRequired
        .check(BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
        .map_err(|_| "real onion bridge readiness failed")?;
    let runtime_ready = TransportRuntimePermissionPreflight::from_fully_verified_preflight(
        &dirs,
        true,
        &backup_exclusion,
        bridge_ready,
        TransportLogRedactionPolicy::RedactedTransportEventsOnly,
        TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
    )
    .check()
    .map_err(|_| "real onion runtime preflight failed")?;
    let policy = TransportBootstrapPolicy::new(
        TransportBootstrapTimeoutPolicy::new(12)
            .map_err(|_| "real onion bootstrap timeout policy rejected")?,
        TransportBootstrapRetryPolicy::high_risk_default(),
        false,
        true,
    )
    .map_err(|_| "real onion bootstrap policy rejected")?;
    let skeleton = TransportBootstrapExecutionSkeleton::new(runtime_ready, policy);
    let arti_dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
        dirs.state_dir().to_path_buf(),
        dirs.cache_dir().to_path_buf(),
    )
    .map_err(|_| "real onion Arti dirs rejected")?;
    let adapter =
        arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
            arti_dirs, skeleton,
        )
        .map_err(|_| "real onion Arti adapter unavailable")?;
    let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
    let mut sink = InMemoryTransportRuntimeEventSink::default();
    let bootstrap_timeout =
        std::time::Duration::from_secs(u64::from(policy.timeout().seconds() + 2));
    let bootstrap_result = {
        let bootstrap_future = owner.bootstrap_and_keep_client(
            arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
            &mut sink,
        );
        tokio::pin!(bootstrap_future);
        let timeout_future = tokio::time::sleep(bootstrap_timeout);
        tokio::pin!(timeout_future);
        let cancel_future = async {
            loop {
                if cancel_scope
                    .is_some_and(RealOnionRoundtripCancelScope::is_cancel_requested)
                {
                    return;
                }
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        };
        tokio::pin!(cancel_future);
        tokio::select! {
            result = &mut bootstrap_future => result,
            _ = &mut timeout_future => {
                event_summary.push(
                    "transport_event kind=BootstrapFailed runtime_error=Some(BootstrapTimeout) probe_error=None route_kind=None direction=None"
                        .to_string(),
                );
                Err(arti_adapter_spike::PersistentArtiClientLifecycleError::BootstrapFailed(
                    another_dimension_transport::TransportRuntimeError::BootstrapTimeout,
                ))
            },
            _ = &mut cancel_future => {
                event_summary.push(
                    "transport_event kind=BootstrapFailed runtime_error=Some(BootstrapCancelled) probe_error=None route_kind=None direction=None"
                        .to_string(),
                );
                Err(arti_adapter_spike::PersistentArtiClientLifecycleError::BootstrapFailed(
                    another_dimension_transport::TransportRuntimeError::BootstrapCancelled,
                ))
            },
        }
    };
    event_summary.extend(sink.events().iter().map(ToString::to_string));
    bootstrap_result.map_err(|_| {
        format!(
            "real onion bootstrap failed after redacted events: {}",
            event_summary.join("; ")
        )
    })?;
    Ok(owner)
}

fn run_production_two_profile_roundtrip(
    app_data_root: impl AsRef<std::path::Path>,
    profile_a: String,
    profile_b: String,
    passphrase: String,
    message: String,
    message_ttl_seconds: u64,
) -> Result<ProductionTwoProfileRoundtripResult, String> {
    let profile_a = sanitize_production_profile(profile_a)?;
    let profile_b = sanitize_production_profile(profile_b)?;
    if profile_a == profile_b {
        return Err("two-profile roundtrip requires two distinct profiles".to_string());
    }
    let profile_a_name = profile_a.as_str().to_string();
    let profile_b_name = profile_b.as_str().to_string();
    let passphrase = passphrase.trim().to_string();
    let message = sanitize_production_roundtrip_message(message)?;
    let message_ttl_seconds = sanitize_production_message_ttl_seconds(message_ttl_seconds)?;
    let message_text = String::from_utf8(message.clone())
        .map_err(|_| "production two-profile message must be UTF-8")?;

    let profile_a_unlock =
        run_production_profile_unlock(&app_data_root, profile_a_name.clone(), passphrase.clone())?;
    let profile_b_unlock =
        run_production_profile_unlock(&app_data_root, profile_b_name.clone(), passphrase.clone())?;
    let profile_a_payload = run_production_pairing_payload_export(
        &app_data_root,
        profile_a_name.clone(),
        passphrase.clone(),
        format!("{profile_a_name}.onion"),
    )?;
    let profile_b_payload = run_production_pairing_payload_export(
        &app_data_root,
        profile_b_name.clone(),
        passphrase.clone(),
        format!("{profile_b_name}.onion"),
    )?;
    let safety = run_production_pairing_safety_preview(
        profile_a_payload.pairing_payload.clone(),
        profile_b_payload.pairing_payload.clone(),
    )?;
    let profile_a_draft = run_production_pairing_session_draft_save(
        &app_data_root,
        profile_a_name.clone(),
        passphrase.clone(),
        profile_a_payload.pairing_payload.clone(),
        profile_b_payload.pairing_payload.clone(),
        true,
    )?;
    let profile_b_draft = run_production_pairing_session_draft_save(
        &app_data_root,
        profile_b_name.clone(),
        passphrase.clone(),
        profile_b_payload.pairing_payload,
        profile_a_payload.pairing_payload,
        true,
    )?;

    let profile_a_init = run_production_handshake_init_export(
        &app_data_root,
        profile_a_name.clone(),
        passphrase.clone(),
    )?;
    let mut profile_b_init = None;
    let (sender_profile, receiver_profile, init_payload) = if profile_a_init.output_payload_created
    {
        (
            profile_a_name.clone(),
            profile_b_name.clone(),
            profile_a_init.output_payload,
        )
    } else {
        let init = run_production_handshake_init_export(
            &app_data_root,
            profile_b_name.clone(),
            passphrase.clone(),
        )?;
        if !init.output_payload_created {
            return Err("two-profile handshake init was not created".to_string());
        }
        let output_payload = init.output_payload.clone();
        profile_b_init = Some(init);
        (
            profile_b_name.clone(),
            profile_a_name.clone(),
            output_payload,
        )
    };
    let reply = run_production_handshake_reply_export(
        &app_data_root,
        receiver_profile.clone(),
        passphrase.clone(),
        init_payload,
    )?;
    let finish = run_production_handshake_finish_export(
        &app_data_root,
        sender_profile.clone(),
        passphrase.clone(),
        reply.output_payload,
    )?;
    let finish_import = run_production_handshake_finish_import(
        &app_data_root,
        receiver_profile.clone(),
        passphrase.clone(),
        finish.output_payload,
    )?;
    let sender_state = run_production_session_state_check(
        &app_data_root,
        sender_profile.clone(),
        passphrase.clone(),
    )?;
    let receiver_state = run_production_session_state_check(
        &app_data_root,
        receiver_profile.clone(),
        passphrase.clone(),
    )?;
    let message_number = run_production_message_number_reserve(
        &app_data_root,
        sender_profile.clone(),
        passphrase.clone(),
    )?;
    let sender_profile_result = sender_profile.clone();
    let receiver_profile_result = receiver_profile.clone();

    let outbound = run_production_message_envelope_export(
        &app_data_root,
        sender_profile,
        passphrase.clone(),
        message_number,
        false,
        message_text,
        message_ttl_seconds,
    )?;
    let inbound = run_production_message_envelope_import(
        &app_data_root,
        receiver_profile.clone(),
        passphrase.clone(),
        message_number,
        outbound.envelope_payload,
        message_ttl_seconds,
    )?;
    let received = run_production_message_received_export(
        &app_data_root,
        receiver_profile,
        passphrase,
        message_number,
    )?;

    Ok(ProductionTwoProfileRoundtripResult {
        warning: "two-profile app-data roundtrip only; no network, Tor, or secure-release claim",
        sender_profile: sender_profile_result,
        receiver_profile: receiver_profile_result,
        message_number,
        message_ttl_seconds,
        safety_number: safety.safety_number,
        safety_phrase: safety.safety_phrase,
        safety_confirmed: false,
        profile_a_unlocked: profile_a_unlock.storage_opened
            && profile_a_unlock.profile_marker_present
            && profile_a_unlock.identity_private_key_present,
        profile_b_unlocked: profile_b_unlock.storage_opened
            && profile_b_unlock.profile_marker_present
            && profile_b_unlock.identity_private_key_present,
        pairing_payloads_exported: profile_a_payload.pairing_payload_exported
            && profile_b_payload.pairing_payload_exported,
        session_drafts_saved: profile_a_draft.session_draft_present
            && profile_b_draft.session_draft_present,
        handshake_completed: finish.transport_state_persisted
            && finish_import.transport_state_persisted,
        sender_session_ready: sender_state.ready_for_message_envelope,
        receiver_session_ready: receiver_state.session_transport_state_present
            && receiver_state.runtime_material_reconstructable,
        message_number_reserved: outbound.message_number_reserved,
        encrypted_envelope_exported: outbound.encrypted_envelope_present,
        inbound_message_stored: inbound.received_message_written,
        received_status_verified: inbound.received_message_matches_session
            && received.received_message_matches_session,
        received_export_matches_input: received.received_message.as_bytes() == message.as_slice(),
        plaintext_returned_to_frontend: false,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: profile_a_unlock.key_material_exposed
            || profile_b_unlock.key_material_exposed
            || profile_a_payload.key_material_exposed
            || profile_b_payload.key_material_exposed
            || profile_a_draft.key_material_exposed
            || profile_b_draft.key_material_exposed
            || profile_a_init.key_material_exposed
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.key_material_exposed)
            || reply.key_material_exposed
            || finish.key_material_exposed
            || finish_import.key_material_exposed
            || sender_state.key_material_exposed
            || receiver_state.key_material_exposed
            || outbound.key_material_exposed
            || inbound.key_material_exposed
            || received.key_material_exposed,
        network_io_attempted: profile_a_unlock.network_io_attempted
            || profile_b_unlock.network_io_attempted
            || profile_a_payload.network_io_attempted
            || profile_b_payload.network_io_attempted
            || profile_a_draft.network_io_attempted
            || profile_b_draft.network_io_attempted
            || profile_a_init.network_io_attempted
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.network_io_attempted)
            || reply.network_io_attempted
            || finish.network_io_attempted
            || finish_import.network_io_attempted
            || sender_state.network_io_attempted
            || receiver_state.network_io_attempted
            || outbound.network_send_attempted
            || inbound.network_receive_attempted
            || received.network_receive_attempted,
        transport_io_opened: profile_a_unlock.transport_io_opened
            || profile_b_unlock.transport_io_opened
            || profile_a_payload.transport_io_opened
            || profile_b_payload.transport_io_opened
            || profile_a_draft.transport_io_opened
            || profile_b_draft.transport_io_opened
            || profile_a_init.transport_io_opened
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.transport_io_opened)
            || reply.transport_io_opened
            || finish.transport_io_opened
            || finish_import.transport_io_opened
            || sender_state.transport_io_opened
            || receiver_state.transport_io_opened
            || outbound.transport_io_opened
            || inbound.transport_io_opened
            || received.transport_io_opened,
        runtime_messaging_enabled: profile_a_unlock.runtime_messaging_enabled
            || profile_b_unlock.runtime_messaging_enabled
            || profile_a_payload.runtime_messaging_enabled
            || profile_b_payload.runtime_messaging_enabled
            || profile_a_draft.runtime_messaging_enabled
            || profile_b_draft.runtime_messaging_enabled
            || profile_a_init.runtime_messaging_enabled
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.runtime_messaging_enabled)
            || reply.runtime_messaging_enabled
            || finish.runtime_messaging_enabled
            || finish_import.runtime_messaging_enabled
            || sender_state.runtime_messaging_enabled
            || receiver_state.runtime_messaging_enabled
            || outbound.runtime_messaging_enabled
            || inbound.runtime_messaging_enabled
            || received.runtime_messaging_enabled,
    })
}

fn run_production_two_profile_room_setup(
    app_data_root: impl AsRef<std::path::Path>,
    profile_a: String,
    profile_b: String,
    passphrase: String,
) -> Result<ProductionTwoProfileRoomSetupResult, String> {
    let profile_a = sanitize_production_profile(profile_a)?;
    let profile_b = sanitize_production_profile(profile_b)?;
    if profile_a == profile_b {
        return Err("two-profile room setup requires two distinct profiles".to_string());
    }
    let profile_a_name = profile_a.as_str().to_string();
    let profile_b_name = profile_b.as_str().to_string();
    let passphrase = passphrase.trim().to_string();

    let profile_a_unlock =
        run_production_profile_unlock(&app_data_root, profile_a_name.clone(), passphrase.clone())?;
    let profile_b_unlock =
        run_production_profile_unlock(&app_data_root, profile_b_name.clone(), passphrase.clone())?;
    let profile_a_payload = run_production_pairing_payload_export(
        &app_data_root,
        profile_a_name.clone(),
        passphrase.clone(),
        format!("{profile_a_name}.onion"),
    )?;
    let profile_b_payload = run_production_pairing_payload_export(
        &app_data_root,
        profile_b_name.clone(),
        passphrase.clone(),
        format!("{profile_b_name}.onion"),
    )?;
    let safety = run_production_pairing_safety_preview(
        profile_a_payload.pairing_payload.clone(),
        profile_b_payload.pairing_payload.clone(),
    )?;
    let profile_a_draft = run_production_pairing_session_draft_save(
        &app_data_root,
        profile_a_name.clone(),
        passphrase.clone(),
        profile_a_payload.pairing_payload.clone(),
        profile_b_payload.pairing_payload.clone(),
        true,
    )?;
    let profile_b_draft = run_production_pairing_session_draft_save(
        &app_data_root,
        profile_b_name.clone(),
        passphrase.clone(),
        profile_b_payload.pairing_payload,
        profile_a_payload.pairing_payload,
        true,
    )?;

    let profile_a_init = run_production_handshake_init_export(
        &app_data_root,
        profile_a_name.clone(),
        passphrase.clone(),
    )?;
    let mut profile_b_init = None;
    let (sender_profile, receiver_profile, init_payload) = if profile_a_init.output_payload_created
    {
        (
            profile_a_name.clone(),
            profile_b_name.clone(),
            profile_a_init.output_payload,
        )
    } else {
        let init = run_production_handshake_init_export(
            &app_data_root,
            profile_b_name.clone(),
            passphrase.clone(),
        )?;
        if !init.output_payload_created {
            return Err("two-profile handshake init was not created".to_string());
        }
        let output_payload = init.output_payload.clone();
        profile_b_init = Some(init);
        (
            profile_b_name.clone(),
            profile_a_name.clone(),
            output_payload,
        )
    };
    let reply = run_production_handshake_reply_export(
        &app_data_root,
        receiver_profile.clone(),
        passphrase.clone(),
        init_payload,
    )?;
    let finish = run_production_handshake_finish_export(
        &app_data_root,
        sender_profile,
        passphrase.clone(),
        reply.output_payload,
    )?;
    let finish_import = run_production_handshake_finish_import(
        &app_data_root,
        receiver_profile,
        passphrase.clone(),
        finish.output_payload,
    )?;
    let profile_a_state = run_production_session_state_check(
        &app_data_root,
        profile_a_name.clone(),
        passphrase.clone(),
    )?;
    let profile_b_state = run_production_session_state_check(
        &app_data_root,
        profile_b_name.clone(),
        passphrase,
    )?;

    Ok(ProductionTwoProfileRoomSetupResult {
        warning: "two-profile room setup completed locally; no message, network, Tor, or secure-release claim",
        profile_a: profile_a_name,
        profile_b: profile_b_name,
        safety_number: safety.safety_number,
        safety_phrase: safety.safety_phrase,
        safety_confirmed: false,
        profile_a_unlocked: profile_a_unlock.storage_opened
            && profile_a_unlock.profile_marker_present
            && profile_a_unlock.identity_private_key_present,
        profile_b_unlocked: profile_b_unlock.storage_opened
            && profile_b_unlock.profile_marker_present
            && profile_b_unlock.identity_private_key_present,
        pairing_payloads_exported: profile_a_payload.pairing_payload_exported
            && profile_b_payload.pairing_payload_exported,
        session_drafts_saved: profile_a_draft.session_draft_present
            && profile_b_draft.session_draft_present,
        handshake_completed: finish.transport_state_persisted
            && finish_import.transport_state_persisted,
        profile_a_ready_for_message_envelope: profile_a_state.ready_for_message_envelope,
        profile_b_ready_for_message_envelope: profile_b_state.ready_for_message_envelope,
        both_ready_for_message_envelope: profile_a_state.ready_for_message_envelope
            && profile_b_state.ready_for_message_envelope,
        plaintext_returned_to_frontend: false,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: profile_a_unlock.key_material_exposed
            || profile_b_unlock.key_material_exposed
            || profile_a_payload.key_material_exposed
            || profile_b_payload.key_material_exposed
            || profile_a_draft.key_material_exposed
            || profile_b_draft.key_material_exposed
            || profile_a_init.key_material_exposed
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.key_material_exposed)
            || reply.key_material_exposed
            || finish.key_material_exposed
            || finish_import.key_material_exposed
            || profile_a_state.key_material_exposed
            || profile_b_state.key_material_exposed,
        network_io_attempted: profile_a_unlock.network_io_attempted
            || profile_b_unlock.network_io_attempted
            || profile_a_payload.network_io_attempted
            || profile_b_payload.network_io_attempted
            || profile_a_draft.network_io_attempted
            || profile_b_draft.network_io_attempted
            || profile_a_init.network_io_attempted
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.network_io_attempted)
            || reply.network_io_attempted
            || finish.network_io_attempted
            || finish_import.network_io_attempted
            || profile_a_state.network_io_attempted
            || profile_b_state.network_io_attempted,
        transport_io_opened: profile_a_unlock.transport_io_opened
            || profile_b_unlock.transport_io_opened
            || profile_a_payload.transport_io_opened
            || profile_b_payload.transport_io_opened
            || profile_a_draft.transport_io_opened
            || profile_b_draft.transport_io_opened
            || profile_a_init.transport_io_opened
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.transport_io_opened)
            || reply.transport_io_opened
            || finish.transport_io_opened
            || finish_import.transport_io_opened
            || profile_a_state.transport_io_opened
            || profile_b_state.transport_io_opened,
        runtime_messaging_enabled: profile_a_unlock.runtime_messaging_enabled
            || profile_b_unlock.runtime_messaging_enabled
            || profile_a_payload.runtime_messaging_enabled
            || profile_b_payload.runtime_messaging_enabled
            || profile_a_draft.runtime_messaging_enabled
            || profile_b_draft.runtime_messaging_enabled
            || profile_a_init.runtime_messaging_enabled
            || profile_b_init
                .as_ref()
                .is_some_and(|result| result.runtime_messaging_enabled)
            || reply.runtime_messaging_enabled
            || finish.runtime_messaging_enabled
            || finish_import.runtime_messaging_enabled
            || profile_a_state.runtime_messaging_enabled
            || profile_b_state.runtime_messaging_enabled,
    })
}

fn run_production_two_profile_message_roundtrip(
    app_data_root: impl AsRef<std::path::Path>,
    profile_a: String,
    profile_b: String,
    passphrase: String,
    message: String,
    message_ttl_seconds: u64,
) -> Result<ProductionTwoProfileMessageRoundtripResult, String> {
    let profile_a = sanitize_production_profile(profile_a)?;
    let profile_b = sanitize_production_profile(profile_b)?;
    if profile_a == profile_b {
        return Err("stored-session message roundtrip requires two distinct profiles".to_string());
    }

    let profile_a_name = profile_a.as_str().to_string();
    let profile_b_name = profile_b.as_str().to_string();
    let passphrase = passphrase.trim().to_string();
    let message = sanitize_production_roundtrip_message(message)?;
    let message_ttl_seconds = sanitize_production_message_ttl_seconds(message_ttl_seconds)?;
    let message_text = String::from_utf8(message.clone())
        .map_err(|_| "production stored-session message must be UTF-8")?;

    let sender_profile = profile_a_name.clone();
    let receiver_profile = profile_b_name.clone();

    let sender_state =
        run_production_session_state_check(&app_data_root, sender_profile.clone(), passphrase.clone())?;
    let receiver_state =
        run_production_session_state_check(&app_data_root, receiver_profile.clone(), passphrase.clone())?;
    if !sender_state.ready_for_message_envelope || !receiver_state.ready_for_message_envelope {
        return Err("stored-session message roundtrip requires both profiles message-ready".to_string());
    }
    let sender_profile_result = sender_profile.clone();
    let receiver_profile_result = receiver_profile.clone();
    let message_number = run_production_message_number_reserve(
        &app_data_root,
        sender_profile.clone(),
        passphrase.clone(),
    )?;

    let outbound = run_production_message_envelope_export(
        &app_data_root,
        sender_profile,
        passphrase.clone(),
        message_number,
        false,
        message_text,
        message_ttl_seconds,
    )?;
    let inbound = run_production_message_envelope_import(
        &app_data_root,
        receiver_profile.clone(),
        passphrase.clone(),
        message_number,
        outbound.envelope_payload,
        message_ttl_seconds,
    )?;
    let received =
        run_production_message_received_export(&app_data_root, receiver_profile, passphrase, message_number)?;

    Ok(ProductionTwoProfileMessageRoundtripResult {
        warning:
            "stored-session directed message roundtrip only; Profile A sends to Profile B without network, Tor, or secure-release claim",
        sender_profile: sender_profile_result,
        receiver_profile: receiver_profile_result,
        message_number,
        message_ttl_seconds,
        sender_session_ready: sender_state.ready_for_message_envelope,
        receiver_session_ready: receiver_state.ready_for_message_envelope,
        message_number_reserved: outbound.message_number_reserved,
        encrypted_envelope_exported: outbound.encrypted_envelope_present,
        inbound_message_stored: inbound.received_message_written,
        received_status_verified: inbound.received_message_matches_session
            && received.received_message_matches_session,
        received_export_matches_input: received.received_message.as_bytes() == message.as_slice(),
        plaintext_returned_to_frontend: false,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: sender_state.key_material_exposed
            || receiver_state.key_material_exposed
            || outbound.key_material_exposed
            || inbound.key_material_exposed
            || received.key_material_exposed,
        network_io_attempted: outbound.network_send_attempted
            || inbound.network_receive_attempted
            || received.network_receive_attempted,
        transport_io_opened: sender_state.transport_io_opened
            || receiver_state.transport_io_opened
            || outbound.transport_io_opened
            || inbound.transport_io_opened
            || received.transport_io_opened,
        runtime_messaging_enabled: sender_state.runtime_messaging_enabled
            || receiver_state.runtime_messaging_enabled
            || outbound.runtime_messaging_enabled
            || inbound.runtime_messaging_enabled
            || received.runtime_messaging_enabled,
    })
}

fn run_production_local_roundtrip(
    message: String,
) -> Result<ProductionLocalRoundtripResult, String> {
    use another_dimension_core::production::{
        production_message_inbound_decrypt_import, production_message_outbound_encrypt_prepare,
        production_message_outbound_envelope_export, production_message_received_export,
        production_message_received_status, production_message_send_prepare,
        production_pairing_payload_create, production_pairing_session_handshake_finish_export,
        production_pairing_session_handshake_finish_import,
        production_pairing_session_handshake_init_export,
        production_pairing_session_handshake_reply_export, production_pairing_session_save_draft,
        production_profile_identity_init, production_profile_init,
    };
    use another_dimension_identity::ProfileName;
    use another_dimension_storage::production::ProfilePassphrase;

    let message = sanitize_production_roundtrip_message(message)?;
    let root = unique_production_roundtrip_dir()?;
    std::fs::create_dir_all(&root).map_err(|_| "failed to create local roundtrip store")?;
    let alice_store = root.join("alice.db");
    let bob_store = root.join("bob.db");
    let passphrase = ProfilePassphrase::new("local-production-roundtrip-passphrase")
        .map_err(|_| "failed to create local roundtrip passphrase")?;
    let alice = ProfileName::new("alice").map_err(|_| "failed to create local profile")?;
    let bob = ProfileName::new("bob").map_err(|_| "failed to create local profile")?;

    let result = (|| {
        let alice_profile = production_profile_init(&alice_store, alice.clone(), &passphrase)
            .map_err(|_| "profile init failed")?;
        let bob_profile = production_profile_init(&bob_store, bob.clone(), &passphrase)
            .map_err(|_| "profile init failed")?;
        let alice_identity =
            production_profile_identity_init(&alice_store, alice.clone(), &passphrase)
                .map_err(|_| "identity init failed")?;
        let bob_identity = production_profile_identity_init(&bob_store, bob.clone(), &passphrase)
            .map_err(|_| "identity init failed")?;

        let alice_payload = production_pairing_payload_create(
            &alice_store,
            alice.clone(),
            &passphrase,
            "alice.onion",
        )
        .map_err(|_| "payload create failed")?;
        let bob_payload =
            production_pairing_payload_create(&bob_store, bob.clone(), &passphrase, "bob.onion")
                .map_err(|_| "payload create failed")?;
        let alice_payload_value = alice_payload.payload().clone();
        let bob_payload_value = bob_payload.payload().clone();

        let alice_draft = production_pairing_session_save_draft(
            &alice_store,
            alice.clone(),
            &passphrase,
            &alice_payload_value,
            &bob_payload_value,
        )
        .map_err(|_| "session draft failed")?;
        let bob_draft = production_pairing_session_save_draft(
            &bob_store,
            bob.clone(),
            &passphrase,
            &bob_payload_value,
            &alice_payload_value,
        )
        .map_err(|_| "session draft failed")?;

        let alice_init = production_pairing_session_handshake_init_export(
            &alice_store,
            alice.clone(),
            &passphrase,
        )
        .map_err(|_| "handshake init failed")?;
        let (init_payload, reply_profile, reply_store, finish_profile, finish_store) =
            if alice_init.handshake_message_created() {
                (
                    alice_init.export_payload().to_string(),
                    bob.clone(),
                    bob_store.as_path(),
                    alice.clone(),
                    alice_store.as_path(),
                )
            } else {
                let bob_init = production_pairing_session_handshake_init_export(
                    &bob_store,
                    bob.clone(),
                    &passphrase,
                )
                .map_err(|_| "handshake init failed")?;
                if !bob_init.handshake_message_created() {
                    return Err("handshake init was not created");
                }
                (
                    bob_init.export_payload().to_string(),
                    alice.clone(),
                    alice_store.as_path(),
                    bob.clone(),
                    bob_store.as_path(),
                )
            };

        let reply = production_pairing_session_handshake_reply_export(
            reply_store,
            reply_profile.clone(),
            &passphrase,
            &init_payload,
        )
        .map_err(|_| "handshake reply failed")?;
        let finish = production_pairing_session_handshake_finish_export(
            finish_store,
            finish_profile.clone(),
            &passphrase,
            reply.export_payload(),
        )
        .map_err(|_| "handshake finish failed")?;
        let finish_import = production_pairing_session_handshake_finish_import(
            reply_store,
            reply_profile.clone(),
            &passphrase,
            finish.export_payload(),
        )
        .map_err(|_| "handshake finish import failed")?;

        let send = production_message_send_prepare(
            finish_store,
            finish_profile.clone(),
            &passphrase,
            1,
            &message,
            604_800,
        )
        .map_err(|_| "send prepare failed")?;
        let encrypt = production_message_outbound_encrypt_prepare(
            finish_store,
            finish_profile.clone(),
            &passphrase,
            1,
        )
        .map_err(|_| "encrypt prepare failed")?;
        let envelope = production_message_outbound_envelope_export(
            finish_store,
            finish_profile,
            &passphrase,
            1,
        )
        .map_err(|_| "envelope export failed")?;
        let inbound = production_message_inbound_decrypt_import(
            reply_store,
            reply_profile.clone(),
            &passphrase,
            envelope.export_payload(),
            604_800,
        )
        .map_err(|_| "inbound import failed")?;
        let received_status =
            production_message_received_status(reply_store, reply_profile.clone(), &passphrase, 1)
                .map_err(|_| "received status failed")?;
        let received_export =
            production_message_received_export(reply_store, reply_profile, &passphrase, 1)
                .map_err(|_| "received export failed")?;

        Ok(ProductionLocalRoundtripResult {
            warning:
                "local production-core roundtrip only; no network, Tor, or secure-release claim",
            profile_stores_opened: alice_profile.storage_opened() && bob_profile.storage_opened(),
            identities_created: alice_identity.identity_private_key_written()
                && bob_identity.identity_private_key_written(),
            pairing_payloads_created: alice_payload.noise_static_private_key_written()
                && bob_payload.noise_static_private_key_written(),
            session_drafts_written: alice_draft.session_draft_written()
                && bob_draft.session_draft_written(),
            transport_state_persisted: finish.transport_state_persisted()
                && finish_import.transport_state_persisted(),
            outbound_message_prepared: send.pending_message_record_written()
                && encrypt.encrypted_envelope_written(),
            encrypted_envelope_exported: envelope.encrypted_envelope_present()
                && !envelope.export_payload().is_empty(),
            inbound_message_stored: inbound.received_message_written(),
            received_status_verified: received_status.received_message_matches_session(),
            received_export_matches_input: received_export.export_payload() == message.as_slice(),
            plaintext_returned_to_frontend: false,
            network_io_attempted: send.network_send_attempted()
                || encrypt.network_send_attempted()
                || inbound.network_receive_attempted()
                || received_status.network_receive_attempted()
                || received_export.network_receive_attempted(),
            transport_io_opened: send.transport_io_opened()
                || encrypt.transport_io_opened()
                || inbound.transport_io_opened()
                || received_status.transport_io_opened()
                || received_export.transport_io_opened(),
            runtime_messaging_enabled: send.runtime_messaging_enabled()
                || encrypt.runtime_messaging_enabled()
                || inbound.runtime_messaging_enabled()
                || received_status.runtime_messaging_enabled()
                || received_export.runtime_messaging_enabled(),
        })
    })();

    let _ = std::fs::remove_dir_all(&root);
    result.map_err(ToString::to_string)
}

fn sanitize_production_roundtrip_message(message: String) -> Result<Vec<u8>, String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("production local roundtrip requires a message".to_string());
    }
    if trimmed.len() > 240 {
        return Err("production local roundtrip message must be 240 bytes or fewer".to_string());
    }
    Ok(trimmed.as_bytes().to_vec())
}

fn unique_production_roundtrip_dir() -> Result<std::path::PathBuf, String> {
    static TEMP_DIR_COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "failed to create local roundtrip directory name")?
        .as_nanos();
    let counter = TEMP_DIR_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    Ok(std::env::temp_dir().join(format!(
        "another-dimension-production-roundtrip-{}-{nanos}-{counter}",
        std::process::id()
    )))
}

pub fn run() {
    install_manual_onion_tls_provider();
    tauri::Builder::default()
        .manage(ProductionOnionClientRuntimeState::default())
        .invoke_handler(tauri::generate_handler![
            prototype_status,
            production_message_retention_policy,
            production_onion_backup_exclusion_prepare,
            production_onion_bootstrap_preflight_check,
            production_onion_client_bootstrap_once,
            production_onion_client_attempt_gate_check,
            production_onion_descriptor_publication_attempt,
            production_onion_descriptor_publication_prepare,
            production_onion_inbound_envelope_receive_attempt,
            production_onion_receive_loop_status,
            production_onion_receive_loop_start,
            production_onion_receive_loop_stop,
            production_onion_inbound_stream_prepare,
            production_onion_launch_preflight_check,
            production_onion_service_launch_attempt,
            production_onion_outbound_stream_prepare,
            production_onion_persistent_client_start,
            production_onion_persistent_client_status,
            production_onion_preflight_check,
            production_onion_outbound_envelope_send_attempt,
            production_onion_outbound_envelope_send_stored_endpoint_attempt,
            production_onion_endpoint_update_control_send_stored_endpoint_attempt,
            production_onion_outbound_envelope_send_prepare,
            production_onion_remote_peer_authentication_prepare,
            production_onion_stream_adapter_closeout_prepare,
            production_onion_key_record_prepare,
            production_profile_unlock,
            production_profile_list,
            production_message_retention_preference_get,
            production_message_retention_preference_set,
            production_pairing_payload_export,
            production_pairing_safety_preview,
            production_pairing_session_draft_save,
            production_pairing_session_remote_endpoint_update,
            production_session_state_check,
            production_invite_room_session_status,
            production_two_profile_session_status,
            production_handshake_init_export,
            production_handshake_reply_export,
            production_handshake_finish_export,
            production_handshake_finish_import,
            production_message_envelope_export,
            production_message_envelope_import,
            production_endpoint_update_control_envelope_export,
            production_endpoint_update_control_envelope_import,
            production_message_received_export,
            production_message_transcript_export,
            production_message_outbound_cancel_pending,
            production_message_outbound_mark_send_failed,
            production_local_roundtrip,
            production_invite_room_setup,
            production_invite_room_presence_refresh,
            production_invite_room_message_send,
            production_two_profile_room_setup,
            production_two_profile_roundtrip,
            production_two_profile_real_onion_roundtrip,
            production_two_profile_real_onion_wait_cancel,
            production_two_profile_message_roundtrip,
            dev_local_demo,
            dev_local_message_loop
        ])
        .run(tauri::generate_context!())
        .expect("failed to run desktop prototype shell");
}

fn install_manual_onion_tls_provider() {
    #[cfg(feature = "manual-onion-client-attempt")]
    {
        static INSTALL: std::sync::Once = std::sync::Once::new();
        INSTALL.call_once(|| {
            let _ = rustls::crypto::ring::default_provider().install_default();
        });
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_demo_simulation, parse_demo_steps, parse_loop_messages,
        production_message_retention_policy,
        run_production_endpoint_update_control_envelope_export,
        run_production_endpoint_update_control_envelope_import,
        production_profile_store_path, run_production_handshake_finish_export,
        run_production_handshake_finish_import, run_production_handshake_init_export,
        run_production_handshake_reply_export, run_production_local_roundtrip,
        run_production_message_envelope_export, run_production_message_envelope_import,
        run_production_message_outbound_cancel_pending, run_production_message_retention_preference_get,
        run_production_message_retention_preference_set,
        run_production_message_received_export, run_production_message_transcript_export,
        run_production_onion_backup_exclusion_prepare,
        run_production_onion_bootstrap_preflight_check, run_production_onion_client_bootstrap_once,
        run_production_onion_client_attempt_gate_check,
        run_production_onion_descriptor_publication_attempt,
        run_production_onion_descriptor_publication_prepare,
        run_production_onion_inbound_stream_prepare, run_production_onion_key_record_prepare,
        run_production_onion_launch_preflight_check,
        run_production_onion_launch_preflight_check_with_persistent_client,
        run_production_onion_outbound_stream_prepare,
        run_production_onion_persistent_client_start, run_production_onion_persistent_client_status,
        run_production_onion_preflight_check, run_production_onion_receive_loop_start,
        run_production_onion_receive_loop_record_attempt_error,
        run_production_onion_receive_loop_record_attempt_result,
        run_production_onion_receive_loop_status, run_production_onion_receive_loop_stop,
        run_production_onion_receive_loop_worker_finished,
        run_production_onion_receive_loop_worker_started,
        production_onion_receive_loop_wait_or_stop,
        production_onion_receive_loop_retry_wait_millis,
        production_onion_receive_loop_should_continue,
        run_production_onion_service_launch_attempt, run_production_onion_stream_adapter_closeout_prepare,
        run_production_pairing_payload_export, run_production_pairing_safety_preview,
        run_production_pairing_session_draft_save,
        run_production_pairing_session_remote_endpoint_mark_send_failure,
        run_production_pairing_session_remote_endpoint_update, run_production_profile_list,
        run_production_profile_unlock,
        run_production_session_state_check, ProductionOnionClientRuntimeState,
        ProductionOnionInboundEnvelopeReceiveAttemptResult,
        run_production_two_profile_message_roundtrip, run_production_two_profile_real_onion_roundtrip,
        run_production_two_profile_room_setup, run_production_two_profile_roundtrip,
        run_production_two_profile_session_status, sanitize_envelope_payload,
        sanitize_handshake_payload, sanitize_loop_messages, sanitize_pairing_payload,
        sanitize_pairing_rendezvous_endpoint, sanitize_production_message_text,
        sanitize_production_profile, sanitize_production_roundtrip_message,
        unique_production_roundtrip_dir,
    };
    static DEV_RENDEZVOUS_ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[test]
    fn demo_step_parser_extracts_cli_sections() {
        let transcript = "\
Another Dimension Chat dev-insecure local demo

== Create local profiles ==
profile initialized: alice
profile initialized: bob

== Exchange pairing payloads ==
safety number: 013 859 357 798
safety phrase: copper-harbor-orbit

== Demo complete ==
dev-insecure local CLI flow completed
";

        let steps = parse_demo_steps(transcript);

        assert_eq!(steps.len(), 3);
        assert_eq!(steps[0].label, "Create local profiles");
        assert_eq!(steps[0].status, "completed");
        assert!(steps[0].detail.contains("profile initialized: alice"));
        assert_eq!(steps[1].label, "Exchange pairing payloads");
        assert!(steps[1].detail.contains("safety number"));
        assert_eq!(steps[2].label, "Demo complete");
    }

    #[test]
    fn demo_simulation_model_extracts_peer_state() {
        let transcript = "\
== Create local profiles ==
profile initialized: alice
profile initialized: bob

== Exchange pairing payloads ==
safety number: 013 859 357 798
safety phrase: copper-harbor-orbit

== Send message ==
queued envelope for bob: 256 bytes

== Receive as Bob ==
hello from the dev-insecure local demo

== Replay check ==
second receive returned no replayed messages
";

        let steps = parse_demo_steps(transcript);
        let simulation = build_demo_simulation(&steps);

        assert_eq!(simulation.peers.len(), 2);
        assert_eq!(simulation.peers[0].name, "Alice");
        assert_eq!(simulation.safety_number, "013 859 357 798");
        assert_eq!(simulation.safety_phrase, "copper-harbor-orbit");
        assert_eq!(
            simulation.message_body,
            "hello from the dev-insecure local demo"
        );
        assert!(simulation
            .queued_envelope
            .contains("queued envelope for bob"));
        assert!(simulation.replay_check.contains("no replayed messages"));
    }

    #[test]
    fn demo_loop_parser_extracts_repeated_messages() {
        let transcript = "\
== Local message 1 ==
queued envelope for bob: 256 bytes
received by bob: first
replay check: no replayed messages after message 1

== Local message 2 ==
queued envelope for bob: 256 bytes
received by bob: second
replay check: no replayed messages after message 2
";

        let messages = parse_loop_messages(transcript);

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].index, 1);
        assert_eq!(messages[0].sent, "first");
        assert_eq!(messages[0].received, "first");
        assert!(messages[1].replay_check.contains("message 2"));
    }

    #[test]
    fn demo_loop_message_sanitizer_rejects_empty_input() {
        assert!(sanitize_loop_messages(vec![" ".to_string()]).is_err());
        assert_eq!(
            sanitize_loop_messages(vec![" one ".to_string()]).expect("message"),
            ["one".to_string()]
        );
    }

    #[test]
    fn production_roundtrip_message_sanitizer_rejects_empty_input() {
        assert!(sanitize_production_roundtrip_message(" ".to_string()).is_err());
        assert_eq!(
            sanitize_production_roundtrip_message(" production local ".to_string())
                .expect("message"),
            b"production local"
        );
    }

    #[test]
    fn production_two_profile_real_onion_roundtrip_requires_manual_permission_without_network() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");
        let passphrase = "correct-passphrase";
        let message = "manual permission required";

        let result = tauri::async_runtime::block_on(run_production_two_profile_real_onion_roundtrip(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "bob".to_string(),
            passphrase.to_string(),
            message.to_string(),
            3600,
            false,
            None,
        ))
        .expect("real onion roundtrip permission gate");

        #[cfg(feature = "manual-onion-client-attempt")]
        {
            assert!(result.manual_client_attempt_feature_compiled);
            assert_eq!(result.next_blocker, "ManualNetworkPermissionMissing");
        }
        #[cfg(not(feature = "manual-onion-client-attempt"))]
        {
            assert!(!result.manual_client_attempt_feature_compiled);
            assert_eq!(result.next_blocker, "ManualClientAttemptFeatureNotEnabled");
        }
        assert!(!result.manual_network_permission_enabled);
        assert!(!result.profile_a_unlocked);
        assert!(!result.profile_b_unlocked);
        assert!(!result.profile_a_client_bootstrapped);
        assert!(!result.profile_b_client_bootstrapped);
        assert!(!result.profile_a_onion_service_launched);
        assert!(!result.profile_b_onion_service_launched);
        assert!(!result.profile_a_endpoint_ready);
        assert!(!result.profile_b_endpoint_ready);
        assert!(!result.pairing_payloads_exported);
        assert!(!result.session_drafts_saved);
        assert!(!result.handshake_completed);
        assert!(!result.sender_session_ready);
        assert!(!result.receiver_session_ready);
        assert!(!result.message_number_reserved);
        assert!(!result.second_message_number_reserved);
        assert!(!result.encrypted_envelope_exported);
        assert!(!result.second_encrypted_envelope_exported);
        assert!(!result.send_attempt_started);
        assert!(!result.send_attempt_succeeded);
        assert!(!result.second_send_attempt_succeeded);
        assert!(!result.receive_attempt_started);
        assert!(!result.receive_attempt_succeeded);
        assert!(!result.second_receive_attempt_succeeded);
        assert!(!result.inbound_message_stored);
        assert!(!result.second_inbound_message_stored);
        assert_eq!(result.consecutive_receive_attempts, 0);
        assert_eq!(result.consecutive_messages_imported, 0);
        assert_eq!(result.receive_mode_runtime_state, "stopped");
        assert_eq!(result.receive_mode_attempt_count, 0);
        assert_eq!(result.receive_mode_import_sequence, 0);
        assert_eq!(result.receive_mode_message_import_count, 0);
        assert_eq!(result.receive_mode_endpoint_update_count, 0);
        assert!(!result.receive_mode_last_network_io_attempted);
        assert!(!result.receive_mode_last_stream_accept_attempted);
        assert!(!result.receive_mode_last_stream_read_write_attempted);
        assert!(!result.receive_mode_last_envelope_io_opened);
        assert!(!result.receive_mode_last_runtime_messaging_enabled);
        assert!(!result.receive_mode_recorder_verified);
        assert!(!result.received_status_verified);
        assert!(!result.received_export_matches_input);
        assert!(!result.second_received_status_verified);
        assert!(!result.second_received_export_matches_input);
        assert!(result.event_summary.is_empty());
        assert!(!result.local_endpoint_returned);
        assert!(!result.peer_endpoint_returned);
        assert!(!result.envelope_payload_returned);
        assert!(!result.plaintext_returned_to_frontend);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize real onion gate");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(passphrase));
        assert!(!serialized.contains(message));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    #[ignore = "requires explicit Tor bootstrap and local onion stream I/O"]
    fn production_two_profile_real_onion_roundtrip_smoke_delivers_or_fails_closed() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let result = tauri::async_runtime::block_on(run_production_two_profile_real_onion_roundtrip(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "real onion smoke".to_string(),
            3600,
            true,
            None,
        ))
        .expect("real onion roundtrip smoke");

        eprintln!(
            "real_onion_field_smoke next={} blockers={} bootstrap_a={} bootstrap_b={} launch_a={} launch_b={} endpoint_a={} endpoint_b={} handshake={} first_send_started={} first_send_ok={} first_receive_started={} first_receive_ok={} second_send_ok={} second_receive_ok={} imports={} network={} transport={} runtime={}",
            result.next_blocker,
            result.blockers.join("#"),
            result.profile_a_client_bootstrapped,
            result.profile_b_client_bootstrapped,
            result.profile_a_onion_service_launched,
            result.profile_b_onion_service_launched,
            result.profile_a_endpoint_ready,
            result.profile_b_endpoint_ready,
            result.handshake_completed,
            result.send_attempt_started,
            result.send_attempt_succeeded,
            result.receive_attempt_started,
            result.receive_attempt_succeeded,
            result.second_send_attempt_succeeded,
            result.second_receive_attempt_succeeded,
            result.receive_mode_message_import_count,
            result.network_io_attempted,
            result.transport_io_opened,
            result.runtime_messaging_enabled,
        );

        assert!(result.manual_client_attempt_feature_compiled);
        assert!(result.manual_network_permission_enabled);
        if result.next_blocker != "none" {
            assert!(
                result.next_blocker == "ProfileABootstrapTimeout"
                    || result.next_blocker == "ProfileBBootstrapTimeout"
                    || result.next_blocker == "ProfileABootstrapCancelled"
                    || result.next_blocker == "ProfileBBootstrapCancelled"
                    || result.next_blocker == "ProfileABootstrapNetworkAccessFailed"
                    || result.next_blocker == "ProfileBBootstrapNetworkAccessFailed"
                    || result.next_blocker == "ProfileABootstrapLocalStateFailed"
                    || result.next_blocker == "ProfileBBootstrapLocalStateFailed"
                    || result.next_blocker == "ProfileABootstrapConfigurationFailed"
                    || result.next_blocker == "ProfileBBootstrapConfigurationFailed"
                    || result.next_blocker == "ProfileABootstrapUnsupported"
                    || result.next_blocker == "ProfileBBootstrapUnsupported"
                    || result.next_blocker == "ProfileABootstrapProtocolFailed"
                    || result.next_blocker == "ProfileBBootstrapProtocolFailed"
                    || result.next_blocker == "ProfileABootstrapTransientFailure"
                    || result.next_blocker == "ProfileBBootstrapTransientFailure"
                    || result.next_blocker == "ProfileANetworkDisabled"
                    || result.next_blocker == "ProfileBNetworkDisabled"
                    || result.next_blocker == "ProfileACensorshipOrBridgeRequired"
                    || result.next_blocker == "ProfileBCensorshipOrBridgeRequired"
                    || result.next_blocker == "ProfileABootstrapFailed"
                    || result.next_blocker == "ProfileBBootstrapFailed"
                    || result.next_blocker == "ProfileAOnionServiceLaunchFailed"
                    || result.next_blocker == "ProfileBOnionServiceLaunchFailed"
                    || result.next_blocker == "ProfileAEndpointUnavailable"
                    || result.next_blocker == "ProfileBEndpointUnavailable"
                    || result.next_blocker == "SendAttemptFailed"
                    || result.next_blocker == "ReceiveAttemptFailed"
                    || result.next_blocker == "SecondSendAttemptFailed"
                    || result.next_blocker == "SecondReceiveAttemptFailed",
                "unexpected real onion blocker: {}",
                result.next_blocker
            );
            assert!(
                result.blockers.contains(&"BootstrapTimeout".to_string())
                    || result.blockers.contains(&"BootstrapCancelled".to_string())
                    || result
                        .blockers
                        .contains(&"BootstrapNetworkAccessFailed".to_string())
                    || result
                        .blockers
                        .contains(&"BootstrapLocalStateFailed".to_string())
                    || result
                        .blockers
                        .contains(&"BootstrapConfigurationFailed".to_string())
                    || result
                        .blockers
                        .contains(&"BootstrapUnsupported".to_string())
                    || result
                        .blockers
                        .contains(&"BootstrapProtocolFailed".to_string())
                    || result
                        .blockers
                        .contains(&"BootstrapTransientFailure".to_string())
                    || result.blockers.contains(&"NetworkDisabled".to_string())
                    || result
                        .blockers
                        .contains(&"CensorshipOrBridgeRequired".to_string())
                    || result.blockers.contains(&"BootstrapFailed".to_string())
                    || result
                        .blockers
                        .contains(&"OnionServiceLaunchFailed".to_string())
                    || result.blockers.contains(&"EndpointUnavailable".to_string())
                    || result.blockers.contains(&"SendAttemptFailed".to_string())
                    || result.blockers.contains(&"ReceiveAttemptFailed".to_string())
                    || result
                        .blockers
                        .contains(&"SecondSendAttemptFailed".to_string())
                    || result
                        .blockers
                        .contains(&"SecondReceiveAttemptFailed".to_string())
            );
            match result.next_blocker.as_str() {
                "ProfileABootstrapTimeout"
                | "ProfileBBootstrapTimeout"
                | "ProfileABootstrapNetworkAccessFailed"
                | "ProfileBBootstrapNetworkAccessFailed"
                | "ProfileABootstrapLocalStateFailed"
                | "ProfileBBootstrapLocalStateFailed"
                | "ProfileABootstrapConfigurationFailed"
                | "ProfileBBootstrapConfigurationFailed"
                | "ProfileABootstrapUnsupported"
                | "ProfileBBootstrapUnsupported"
                | "ProfileABootstrapProtocolFailed"
                | "ProfileBBootstrapProtocolFailed"
                | "ProfileABootstrapTransientFailure"
                | "ProfileBBootstrapTransientFailure"
                | "ProfileANetworkDisabled"
                | "ProfileBNetworkDisabled"
                | "ProfileACensorshipOrBridgeRequired"
                | "ProfileBCensorshipOrBridgeRequired"
                | "ProfileABootstrapFailed"
                | "ProfileBBootstrapFailed" => {
                    assert!(!result.profile_a_onion_service_launched);
                    assert!(!result.profile_b_onion_service_launched);
                    assert!(!result.profile_a_endpoint_ready);
                    assert!(!result.profile_b_endpoint_ready);
                }
                "ProfileAOnionServiceLaunchFailed" => {
                    assert!(!result.profile_a_onion_service_launched);
                    assert!(!result.profile_b_onion_service_launched);
                    assert!(!result.profile_a_endpoint_ready);
                    assert!(!result.profile_b_endpoint_ready);
                }
                "ProfileBOnionServiceLaunchFailed" => {
                    assert!(result.profile_a_onion_service_launched);
                    assert!(!result.profile_b_onion_service_launched);
                    assert!(!result.profile_a_endpoint_ready);
                    assert!(!result.profile_b_endpoint_ready);
                }
                "ProfileAEndpointUnavailable" => {
                    assert!(result.profile_a_onion_service_launched);
                    assert!(result.profile_b_onion_service_launched);
                    assert!(!result.profile_a_endpoint_ready);
                    assert!(!result.profile_b_endpoint_ready);
                }
                "ProfileBEndpointUnavailable" => {
                    assert!(result.profile_a_onion_service_launched);
                    assert!(result.profile_b_onion_service_launched);
                    assert!(result.profile_a_endpoint_ready);
                    assert!(!result.profile_b_endpoint_ready);
                }
                "SendAttemptFailed"
                | "ReceiveAttemptFailed"
                | "SecondSendAttemptFailed"
                | "SecondReceiveAttemptFailed" => {
                    assert!(result.profile_a_onion_service_launched);
                    assert!(result.profile_b_onion_service_launched);
                    assert!(result.profile_a_endpoint_ready);
                    assert!(result.profile_b_endpoint_ready);
                    assert!(result.pairing_payloads_exported);
                    assert!(result.session_drafts_saved);
                    assert!(result.handshake_completed);
                    assert!(result.sender_session_ready);
                    assert!(result.receiver_session_ready);
                    assert!(result.message_number_reserved);
                    assert!(result.encrypted_envelope_exported);
                    if result.next_blocker.starts_with("Second") {
                        assert!(result.second_message_number_reserved);
                        assert!(result.second_encrypted_envelope_exported);
                        assert!(result.received_status_verified);
                        assert!(result.received_export_matches_input);
                    } else {
                        assert!(!result.second_message_number_reserved);
                        assert!(!result.second_encrypted_envelope_exported);
                        assert!(!result.second_send_attempt_succeeded);
                        assert!(!result.second_receive_attempt_succeeded);
                    }
                    assert!(!result.local_endpoint_returned);
                    assert!(!result.peer_endpoint_returned);
                    assert!(!result.envelope_payload_returned);
                    assert!(!result.plaintext_returned_to_frontend);
                    assert!(!result.store_path_returned);
                    assert!(!result.passphrase_retained);

                    let serialized =
                        serde_json::to_string(&result).expect("serialize blocked real onion smoke");
                    assert!(!serialized.contains("correct-passphrase"));
                    assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
                    assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
                    assert!(!serialized.contains("ADENV1"));
                    assert!(!serialized.contains("ADPAIR2"));
                    assert!(!serialized.contains(".onion"));
                    assert!(!serialized.contains("real onion smoke"));

                    let _ = std::fs::remove_dir_all(root);
                    return;
                }
                _ => unreachable!("unexpected blocker already checked"),
            }
            assert!(!result.pairing_payloads_exported);
            assert!(!result.session_drafts_saved);
            assert!(!result.handshake_completed);
            assert!(!result.message_number_reserved);
            assert!(!result.second_message_number_reserved);
            assert!(!result.encrypted_envelope_exported);
            assert!(!result.second_encrypted_envelope_exported);
            assert!(!result.send_attempt_started);
            assert!(!result.send_attempt_succeeded);
            assert!(!result.second_send_attempt_succeeded);
            assert!(!result.receive_attempt_started);
            assert!(!result.receive_attempt_succeeded);
            assert!(!result.second_receive_attempt_succeeded);
            assert!(!result.inbound_message_stored);
            assert!(!result.second_inbound_message_stored);
            assert_eq!(result.consecutive_receive_attempts, 0);
            assert_eq!(result.consecutive_messages_imported, 0);
            assert_eq!(result.receive_mode_attempt_count, 0);
            assert_eq!(result.receive_mode_import_sequence, 0);
            assert_eq!(result.receive_mode_message_import_count, 0);
            assert!(!result.receive_mode_recorder_verified);
            assert!(!result.received_status_verified);
            assert!(!result.received_export_matches_input);
            assert!(!result.second_received_status_verified);
            assert!(!result.second_received_export_matches_input);
            assert!(!result.local_endpoint_returned);
            assert!(!result.peer_endpoint_returned);
            assert!(!result.envelope_payload_returned);
            assert!(!result.plaintext_returned_to_frontend);
            assert!(!result.store_path_returned);
            assert!(!result.passphrase_retained);
            assert!(!result.transport_io_opened);
            assert!(!result.runtime_messaging_enabled);

            let serialized =
                serde_json::to_string(&result).expect("serialize blocked real onion smoke");
            assert!(!serialized.contains("correct-passphrase"));
            assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
            assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
            assert!(!serialized.contains("ADENV1"));
            assert!(!serialized.contains("ADPAIR2"));
            assert!(!serialized.contains(".onion"));
            assert!(!serialized.contains("real onion smoke"));

            let _ = std::fs::remove_dir_all(root);
            return;
        }

        assert!(result.profile_a_client_bootstrapped);
        assert!(result.profile_b_client_bootstrapped);
        assert!(result.profile_a_onion_service_launched);
        assert!(result.profile_b_onion_service_launched);
        assert!(result.profile_a_endpoint_ready);
        assert!(result.profile_b_endpoint_ready);
        assert!(result.pairing_payloads_exported);
        assert!(result.session_drafts_saved);
        assert!(result.handshake_completed);
        assert!(result.sender_session_ready);
        assert!(result.receiver_session_ready);
        assert!(result.message_number_reserved);
        assert!(result.second_message_number_reserved);
        assert!(result.encrypted_envelope_exported);
        assert!(result.second_encrypted_envelope_exported);
        assert!(result.send_attempt_started);
        assert!(result.send_attempt_succeeded);
        assert!(result.second_send_attempt_succeeded);
        assert!(result.receive_attempt_started);
        assert!(result.receive_attempt_succeeded);
        assert!(result.second_receive_attempt_succeeded);
        assert!(result.inbound_message_stored);
        assert!(result.second_inbound_message_stored);
        assert_eq!(result.consecutive_receive_attempts, 2);
        assert_eq!(result.consecutive_messages_imported, 2);
        assert_eq!(result.receive_mode_attempt_count, 2);
        assert_eq!(result.receive_mode_import_sequence, 2);
        assert_eq!(result.receive_mode_message_import_count, 2);
        assert_eq!(result.receive_mode_endpoint_update_count, 0);
        assert!(result.receive_mode_last_network_io_attempted);
        assert!(result.receive_mode_last_stream_accept_attempted);
        assert!(result.receive_mode_last_stream_read_write_attempted);
        assert!(result.receive_mode_last_envelope_io_opened);
        assert!(result.receive_mode_last_runtime_messaging_enabled);
        assert!(result.receive_mode_recorder_verified);
        assert!(result.received_status_verified);
        assert!(result.received_export_matches_input);
        assert!(result.second_received_status_verified);
        assert!(result.second_received_export_matches_input);
        assert_eq!(result.next_blocker, "none");
        assert!(result.blockers.is_empty());
        assert!(!result.local_endpoint_returned);
        assert!(!result.peer_endpoint_returned);
        assert!(!result.envelope_payload_returned);
        assert!(!result.plaintext_returned_to_frontend);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(result.network_io_attempted);
        assert!(result.transport_io_opened);
        assert!(result.runtime_messaging_enabled);

        let sender_transcript = run_production_message_transcript_export(
            &data_root,
            result.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("sender transcript after real onion smoke");
        let receiver_transcript = run_production_message_transcript_export(
            &data_root,
            result.receiver_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("receiver transcript after real onion smoke");
        assert_eq!(sender_transcript.entries.len(), 2);
        assert_eq!(receiver_transcript.entries.len(), 2);
        assert!(sender_transcript
            .entries
            .iter()
            .all(|entry| entry.direction == "sent"));
        assert!(receiver_transcript
            .entries
            .iter()
            .all(|entry| entry.direction == "received"));
        assert!(receiver_transcript.entries.iter().all(|entry| {
            entry.message == "real onion smoke" && entry.ttl_seconds == 3600 && !entry.expired
        }));

        let serialized = serde_json::to_string(&result).expect("serialize real onion smoke");
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("ADENV1"));
        assert!(!serialized.contains("ADPAIR2"));
        assert!(!serialized.contains(".onion"));
        assert!(!serialized.contains("real onion smoke"));

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_profile_sanitizer_rejects_path_like_input() {
        assert!(sanitize_production_profile("../alice".to_string()).is_err());
        assert!(sanitize_production_profile("alice.db".to_string()).is_err());
        let profile = sanitize_production_profile(" alice_1 ".to_string()).expect("profile");
        assert_eq!(profile.as_str(), "alice_1");
    }

    #[test]
    fn production_profile_store_path_stays_under_profiles_dir() {
        let profile = sanitize_production_profile("alice".to_string()).expect("profile");
        let path = production_profile_store_path("/tmp/app-data", &profile).expect("path");
        assert!(path.ends_with("profiles/alice.db"));
    }

    #[test]
    fn production_onion_backup_exclusion_prepare_is_explicit_and_redacted() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let result = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);

        assert!(result.state_cache_dirs_accessible);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize backup exclusion");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_bootstrap_preflight_prepares_skeleton_without_bootstrap() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);

        let result = run_production_onion_bootstrap_preflight_check(&data_root, &cache_root);

        assert!(result.bootstrap_preflight_only);
        assert!(result.state_cache_dirs_accessible);
        assert!(result.backup_exclusion_verified);
        assert!(result.runtime_preflight_ready);
        assert!(result.bootstrap_policy_ready);
        assert_eq!(result.timeout_seconds, 45);
        assert_eq!(result.retry_max_attempts, 2);
        assert!(!result.silent_retry_allowed);
        assert!(result.censorship_classification_ready);
        assert!(!result.persistent_client_ready);
        assert!(!result.manual_bootstrap_attempt_enabled);
        assert_eq!(result.next_blocker, "ManualBootstrapAttemptNotEnabled");
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize bootstrap preflight");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_onion_client_attempt_gate_is_feature_closed_without_network() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let result = tauri::async_runtime::block_on(run_production_onion_client_attempt_gate_check(
            &data_root,
            &cache_root,
        ));

        assert!(result.attempt_gate_only);
        assert!(!result.manual_network_permission_enabled);
        assert!(!result.client_attempt_started);
        assert!(!result.persistent_client_ready);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize client attempt gate");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_onion_client_bootstrap_once_requires_feature_or_manual_permission() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let result = tauri::async_runtime::block_on(run_production_onion_client_bootstrap_once(
            &data_root,
            &cache_root,
            false,
        ));

        assert!(!result.manual_network_permission_enabled);
        assert!(!result.client_attempt_started);
        assert!(!result.client_bootstrap_succeeded);
        assert!(!result.persistent_client_ready);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize client once result");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_onion_persistent_client_status_is_redacted_without_network() {
        let state = ProductionOnionClientRuntimeState::default();

        let result = run_production_onion_persistent_client_status(&state);

        assert!(!result.persistent_client_ready);
        assert!(!result.bootstrap_in_progress);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize client status");
        assert!(!serialized.contains(".onion"));
    }

    #[test]
    fn production_onion_persistent_client_start_requires_feature_or_manual_permission() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");
        let state = ProductionOnionClientRuntimeState::default();

        let result = tauri::async_runtime::block_on(run_production_onion_persistent_client_start(
            &data_root,
            &cache_root,
            &state,
            false,
        ));

        assert!(!result.manual_network_permission_enabled);
        assert!(!result.client_bootstrap_started);
        assert!(!result.client_bootstrap_succeeded);
        assert!(!result.persistent_client_ready);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize persistent client start");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_key_record_prepare_can_follow_backup_exclusion() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let unlock = run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        assert!(unlock.profile_marker_present);

        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);

        let result = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("onion key record prepare");

        assert!(result.backup_exclusion_verified);
        assert!(result.profile_transport_unlock_ready);
        assert!(result.key_record_written);
        assert!(result.key_material_ready);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_launch_preflight_reaches_persistent_client_blocker_without_network() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_launch_preflight_check(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("launch preflight check");

        assert!(result.launch_preflight_only);
        assert!(result.profile_transport_unlock_ready);
        assert!(result.backup_exclusion_verified);
        assert!(result.key_record_present);
        assert!(result.key_material_ready);
        assert!(!result.persistent_client_ready);
        assert!(result.endpoint_publication_policy_ready);
        assert!(result.endpoint_update_policy_ready);
        assert!(result.redacted_events_only);
        assert!(!result.ready_for_onion_launch);
        assert_eq!(result.next_blocker, "PersistentClientNotReady");
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize launch preflight");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_launch_preflight_accepts_retained_client_boundary_without_launch() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_launch_preflight_check_with_persistent_client(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            true,
        )
        .expect("launch preflight check");

        assert!(result.launch_preflight_only);
        assert!(result.persistent_client_ready);
        assert!(result.ready_for_onion_launch);
        assert_eq!(result.next_blocker, "none");
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_service_launch_attempt_requires_explicit_manual_permission() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");
        let state = ProductionOnionClientRuntimeState::default();

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_service_launch_attempt(
            &data_root,
            &cache_root,
            &state,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            false,
        )
        .expect("launch attempt");

        assert!(!result.manual_network_permission_enabled);
        assert!(result.profile_transport_unlock_ready);
        assert!(result.backup_exclusion_verified);
        assert!(result.key_record_present);
        assert!(result.key_material_ready);
        assert!(!result.launch_attempt_started);
        assert!(!result.launch_attempt_succeeded);
        assert!(!result.redacted_launch_result_event_recorded);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.descriptor_body_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize launch attempt");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_descriptor_publication_prepare_blocks_without_persistent_client() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_descriptor_publication_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            false,
        )
        .expect("descriptor publication prepare");

        assert!(result.preparation_only);
        assert!(result.profile_transport_unlock_ready);
        assert!(result.key_material_ready);
        assert!(!result.persistent_client_ready);
        assert!(!result.launch_preflight_ready);
        assert!(!result.descriptor_preparation_ready);
        assert_eq!(result.next_blocker, "PersistentClientNotReady");
        assert!(!result.descriptor_body_returned);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize descriptor prepare");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_descriptor_publication_attempt_requires_manual_permission() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_descriptor_publication_attempt(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            false,
            false,
        )
        .expect("descriptor publication attempt");

        assert!(!result.preparation_only);
        assert!(!result.manual_network_permission_enabled);
        assert!(!result.persistent_client_ready);
        assert!(!result.publish_attempt_started);
        assert!(!result.publish_attempt_succeeded);
        assert!(!result.redacted_publish_result_event_recorded);
        assert_eq!(result.next_blocker, "ManualNetworkPermissionMissing");
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.descriptor_body_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize descriptor attempt");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_descriptor_publication_prepare_reaches_redacted_boundary_without_publish() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_descriptor_publication_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            true,
        )
        .expect("descriptor publication prepare");

        assert!(result.manual_client_attempt_feature_compiled);
        assert!(result.persistent_client_ready);
        assert!(result.launch_preflight_ready);
        assert!(result.onion_hosting_gate_ready);
        assert!(result.descriptor_publication_gate_ready);
        assert!(result.fail_closed_adapter_ready);
        assert!(result.redacted_context_ready);
        assert!(result.descriptor_preparation_ready);
        assert_eq!(result.next_blocker, "none");
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.descriptor_body_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_inbound_stream_prepare_blocks_without_persistent_client() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_inbound_stream_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            false,
        )
        .expect("inbound stream prepare");

        assert!(result.preparation_only);
        assert!(!result.persistent_client_ready);
        assert!(!result.launch_preflight_ready);
        assert!(!result.inbound_stream_preparation_ready);
        assert_eq!(result.next_blocker, "PersistentClientNotReady");
        assert!(!result.stream_id_returned);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize inbound prepare");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_inbound_stream_prepare_reaches_gate_without_accepting_stream() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_inbound_stream_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            true,
        )
        .expect("inbound stream prepare");

        assert!(result.manual_client_attempt_feature_compiled);
        assert!(result.persistent_client_ready);
        assert!(result.launch_preflight_ready);
        assert!(result.descriptor_publication_gate_ready);
        assert!(result.descriptor_preparation_ready);
        assert!(result.inbound_stream_gate_ready);
        assert!(result.fail_closed_adapter_ready);
        assert!(result.inbound_stream_preparation_ready);
        assert_eq!(result.next_blocker, "none");
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.descriptor_body_returned);
        assert!(!result.stream_id_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_inbound_envelope_receive_attempt_requires_manual_permission() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");
        let state = ProductionOnionClientRuntimeState::default();

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = tauri::async_runtime::block_on(
            super::run_production_onion_inbound_envelope_receive_attempt(
                &data_root,
                &cache_root,
                &state,
                "alice".to_string(),
                "correct-passphrase".to_string(),
                false,
            ),
        )
        .expect("inbound envelope receive attempt");

        assert!(!result.preparation_only);
        assert!(result.manual_client_attempt_feature_compiled);
        assert!(!result.manual_network_permission_enabled);
        assert!(!result.persistent_client_ready);
        assert!(!result.receive_attempt_started);
        assert!(!result.receive_attempt_succeeded);
        assert!(!result.received_envelope_ready);
        assert!(!result.inbound_import_attempted);
        assert_eq!(result.next_blocker, "ManualNetworkPermissionMissing");
        assert!(result
            .blockers
            .contains(&"ManualNetworkPermissionMissing".to_string()));
        assert!(result.event_summary.is_empty());
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.descriptor_body_returned);
        assert!(!result.stream_id_returned);
        assert!(!result.envelope_payload_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize receive attempt");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".onion"));
        assert!(!serialized.contains("ADENV1"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_onion_outbound_stream_prepare_reaches_gate_without_dial_or_send() {
        let result =
            run_production_onion_outbound_stream_prepare("alice.onion".to_string())
                .expect("outbound stream prepare");

        assert!(result.preparation_only);
        assert!(result.endpoint_accepted);
        assert!(result.pairwise_endpoint_ready);
        assert!(result.high_risk_onion_policy_ready);
        assert!(result.outbound_stream_gate_ready);
        assert!(result.fail_closed_adapter_ready);
        assert!(result.outbound_stream_preparation_ready);
        assert_eq!(result.next_blocker, "none");
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.stream_id_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize outbound prepare");
        assert!(!serialized.contains("alice.onion"));
    }

    #[test]
    fn production_onion_outbound_stream_prepare_rejects_non_onion_endpoint() {
        assert!(run_production_onion_outbound_stream_prepare(
            "alice.example".to_string()
        )
        .is_err());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn production_onion_stream_adapter_closeout_blocks_without_persistent_client() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_stream_adapter_closeout_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
            false,
        )
        .expect("stream adapter closeout prepare");

        assert!(result.preparation_only);
        assert!(!result.persistent_client_ready);
        assert!(!result.inbound_stream_preparation_ready);
        assert!(result.outbound_stream_preparation_ready);
        assert!(!result.stream_adapter_closeout_ready);
        assert!(!result.remote_peer_authentication_next);
        assert!(!result.verified_pairwise_session_after_remote_authentication);
        assert_eq!(result.next_blocker, "PersistentClientNotReady");
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.descriptor_body_returned);
        assert!(!result.stream_id_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize stream closeout");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("alice.onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_stream_adapter_closeout_reaches_remote_auth_boundary_without_io() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = run_production_onion_stream_adapter_closeout_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
            true,
        )
        .expect("stream adapter closeout prepare");

        assert!(result.preparation_only);
        assert!(result.manual_client_attempt_feature_compiled);
        assert!(result.persistent_client_ready);
        assert!(result.inbound_stream_preparation_ready);
        assert!(result.outbound_stream_preparation_ready);
        assert!(result.stream_adapter_closeout_ready);
        assert!(result.remote_peer_authentication_next);
        assert!(result.verified_pairwise_session_after_remote_authentication);
        assert_eq!(result.next_blocker, "none");
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.descriptor_body_returned);
        assert!(!result.stream_id_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.descriptor_publish_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize stream closeout");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("alice.onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_remote_peer_authentication_blocks_without_peer_proof() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        run_production_profile_unlock(
            &data_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");
        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = super::run_production_onion_remote_peer_authentication_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
            true,
        )
        .expect("remote peer authentication prepare");

        assert!(result.preparation_only);
        assert!(result.stream_adapter_closeout_ready);
        assert!(result.remote_peer_authentication_required);
        assert!(!result.stored_pairwise_session_ready);
        assert!(!result.remote_peer_authentication_ready);
        assert!(!result.verified_pairwise_session_binding_ready);
        assert!(!result.bound_stream_session_ready);
        assert!(!result.outbound_envelope_io_boundary_ready);
        assert_eq!(result.next_blocker, "RemotePeerAuthenticationRequired");
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.peer_proof_returned);
        assert!(!result.session_transcript_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize remote auth prepare");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("alice.onion"));
        assert!(!serialized.contains("peer-proof"));
        assert!(!serialized.contains("session-transcript"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_remote_peer_authentication_uses_verified_pairwise_session_boundary() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let roundtrip = run_production_two_profile_roundtrip(
            &data_root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "transport auth bridge".to_string(),
            86_400,
        )
        .expect("two-profile roundtrip");
        assert!(roundtrip.sender_session_ready);
        assert!(roundtrip.receiver_session_ready);

        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = super::run_production_onion_remote_peer_authentication_prepare(
            &data_root,
            &cache_root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
            true,
        )
        .expect("remote peer authentication prepare");

        assert!(result.preparation_only);
        assert!(result.stream_adapter_closeout_ready);
        assert!(result.remote_peer_authentication_required);
        assert!(result.stored_pairwise_session_ready);
        assert!(
            result.remote_peer_authentication_ready,
            "next_blocker={}; blockers={:?}",
            result.next_blocker,
            result.blockers
        );
        assert!(result.verified_pairwise_session_binding_ready);
        assert!(result.bound_stream_session_ready);
        assert!(result.outbound_envelope_io_boundary_ready);
        assert_eq!(result.next_blocker, "none");
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.peer_proof_returned);
        assert!(!result.session_transcript_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize remote auth prepare");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("bob.onion"));
        assert!(!serialized.contains("transport auth bridge"));
        assert!(!serialized.contains("ADPAIR2"));
        assert!(!serialized.contains("ADENV1"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_outbound_envelope_send_prepare_uses_stored_envelope_without_send() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let roundtrip = run_production_two_profile_roundtrip(
            &data_root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "transport send intent".to_string(),
            86_400,
        )
        .expect("two-profile roundtrip");
        assert_eq!(roundtrip.message_number, 1);
        assert!(roundtrip.encrypted_envelope_exported);

        let backup = run_production_onion_backup_exclusion_prepare(&data_root, &cache_root);
        assert!(backup.backup_exclusion_verified);
        let key_record = run_production_onion_key_record_prepare(
            &data_root,
            &cache_root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("key record prepare");
        assert!(key_record.key_material_ready);

        let result = super::run_production_onion_outbound_envelope_send_prepare(
            &data_root,
            &cache_root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            format!("{}.onion", roundtrip.receiver_profile),
            1,
            true,
        )
        .expect("outbound envelope send prepare");

        assert!(result.preparation_only);
        assert!(
            result.remote_peer_authentication_ready,
            "next_blocker={}; blockers={:?}",
            result.next_blocker,
            result.blockers
        );
        assert!(result.bound_stream_session_ready);
        assert!(result.outbound_envelope_io_boundary_ready);
        assert!(result.stored_outbound_envelope_ready);
        assert!(result.envelope_decodable);
        assert!(result.envelope_message_number_matches);
        assert!(result.send_intent_prepared);
        assert!(result.ack_wait_registered);
        assert!(result.redacted_send_result_event_recorded);
        assert_eq!(result.event_summary.len(), 1);
        assert!(result.event_summary[0].contains("TransferFailed"));
        assert!(result.event_summary[0].contains("SendFailed"));
        assert_eq!(result.next_blocker, "none");
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.peer_proof_returned);
        assert!(!result.session_transcript_returned);
        assert!(!result.envelope_payload_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize send prepare");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(format!("{}.onion", roundtrip.receiver_profile).as_str()));
        assert!(!serialized.contains("transport send intent"));
        assert!(!serialized.contains("ADENV1"));
        assert!(!serialized.contains("ADPAIR2"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_outbound_envelope_send_attempt_requires_manual_permission() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");
        let state = ProductionOnionClientRuntimeState::default();

        let roundtrip = run_production_two_profile_roundtrip(
            &data_root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "transport send attempt".to_string(),
            86_400,
        )
        .expect("two-profile roundtrip");
        assert_eq!(roundtrip.message_number, 1);
        assert!(roundtrip.encrypted_envelope_exported);

        let result =
            tauri::async_runtime::block_on(super::run_production_onion_outbound_envelope_send_attempt(
                &data_root,
                &cache_root,
                &state,
                roundtrip.sender_profile.clone(),
                "correct-passphrase".to_string(),
                format!("{}.onion", roundtrip.receiver_profile),
                1,
                false,
            ))
            .expect("outbound envelope send attempt");

        assert!(!result.preparation_only);
        assert!(result.manual_client_attempt_feature_compiled);
        assert!(!result.manual_network_permission_enabled);
        assert!(!result.send_attempt_started);
        assert!(!result.send_attempt_succeeded);
        assert_eq!(result.next_blocker, "ManualNetworkPermissionMissing");
        assert!(result.blockers.contains(&"ManualNetworkPermissionMissing".to_string()));
        assert!(result.event_summary.is_empty());
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.peer_proof_returned);
        assert!(!result.session_transcript_returned);
        assert!(!result.envelope_payload_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.stream_accept_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize send attempt");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(format!("{}.onion", roundtrip.receiver_profile).as_str()));
        assert!(!serialized.contains("transport send attempt"));
        assert!(!serialized.contains("ADENV1"));
        assert!(!serialized.contains("ADPAIR2"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
    #[test]
    fn production_onion_endpoint_update_control_send_requires_manual_permission() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");
        let state = ProductionOnionClientRuntimeState::default();

        let roundtrip = run_production_two_profile_roundtrip(
            &data_root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "endpoint update send attempt".to_string(),
            86_400,
        )
        .expect("two-profile roundtrip");
        assert_eq!(roundtrip.message_number, 1);
        assert!(roundtrip.encrypted_envelope_exported);

        let result = tauri::async_runtime::block_on(
            super::run_production_onion_endpoint_update_control_send_stored_endpoint_attempt(
                &data_root,
                &cache_root,
                &state,
                roundtrip.sender_profile.clone(),
                "correct-passphrase".to_string(),
                2,
                format!("{}-rotated.onion", roundtrip.sender_profile),
                false,
            ),
        )
        .expect("endpoint update control send attempt");

        assert!(!result.preparation_only);
        assert!(result.manual_client_attempt_feature_compiled);
        assert!(!result.manual_network_permission_enabled);
        assert!(!result.endpoint_update_created);
        assert!(!result.encrypted_control_envelope_written);
        assert!(!result.send_intent_prepared);
        assert!(!result.send_attempt_started);
        assert!(!result.send_attempt_succeeded);
        assert_eq!(result.next_blocker, "ManualNetworkPermissionMissing");
        assert!(result
            .blockers
            .contains(&"ManualNetworkPermissionMissing".to_string()));
        assert!(result.event_summary.is_empty());
        assert!(!result.raw_endpoint_returned);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.peer_proof_returned);
        assert!(!result.session_transcript_returned);
        assert!(!result.envelope_payload_returned);
        assert!(!result.endpoint_plaintext_exposed);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.stream_dial_attempted);
        assert!(!result.stream_read_write_attempted);
        assert!(!result.stream_send_attempted);
        assert!(!result.envelope_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize endpoint update send");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("rotated.onion"));
        assert!(!serialized.contains("endpoint update send attempt"));
        assert!(!serialized.contains("ADENV1"));
        assert!(!serialized.contains("ADPAIR2"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_onion_receive_loop_status_tracks_start_stop_without_network() {
        let state = ProductionOnionClientRuntimeState::default();
        let initial = run_production_onion_receive_loop_status(&state, false);
        assert!(!initial.enabled);
        assert!(!initial.profile_selected);
        assert!(!initial.worker_running);
        assert!(!initial.stop_confirmed);
        assert_eq!(initial.runtime_state, "stopped");
        assert_eq!(initial.runtime_label, "Receive mode stopped");
        assert!(!initial.receive_attempt_in_flight);
        assert_eq!(initial.attempt_count, 0);
        assert_eq!(initial.worker_start_count, 0);
        assert_eq!(initial.duplicate_start_block_count, 0);
        assert_eq!(initial.import_sequence, 0);
        assert!(!initial.last_attempt_started);
        assert_eq!(initial.message_import_count, 0);
        assert_eq!(initial.endpoint_update_count, 0);
        assert!(!initial.active_after_import);
        assert!(!initial.continues_after_import);
        assert!(!initial.multi_message_receive_ready);
        assert!(!initial.restart_generation_isolated);
        assert!(initial.retry_wait_cancellable);
        assert!(!initial.last_attempt_succeeded);
        assert!(!initial.last_endpoint_update_applied);
        assert!(!initial.last_network_io_attempted);
        assert!(!initial.last_stream_accept_attempted);
        assert!(!initial.last_stream_read_write_attempted);
        assert!(!initial.last_envelope_io_opened);
        assert!(!initial.last_runtime_messaging_enabled);
        assert_eq!(initial.last_next_blocker, None);
        assert_eq!(initial.last_failure_kind, "none");
        assert!(!initial.last_failure_retryable);
        assert!(initial.explicit_user_start_required);
        assert!(!initial.starts_network_on_app_launch);
        assert!(!initial.raw_profile_returned);
        assert!(!initial.passphrase_retained);
        assert!(!initial.key_material_exposed);
        assert!(!initial.network_io_attempted);
        assert!(!initial.transport_io_opened);
        assert!(!initial.runtime_messaging_enabled);

        let blocked = run_production_onion_receive_loop_start(
            &state,
            "alice".to_string(),
            false,
        );
        assert!(!blocked.enabled);
        assert!(!blocked.profile_selected);

        let started = run_production_onion_receive_loop_start(
            &state,
            "alice".to_string(),
            true,
        );
        assert!(started.enabled);
        assert!(started.profile_selected);
        assert!(!started.worker_running);
        assert_eq!(started.runtime_state, "receiving");
        assert!(!started.duplicate_loop_blocked);
        assert_eq!(started.attempt_count, 0);
        assert_eq!(started.worker_start_count, 0);
        assert_eq!(started.duplicate_start_block_count, 0);
        assert!(!started.active_after_import);
        assert!(!started.continues_after_import);
        assert!(!started.multi_message_receive_ready);
        assert!(!started.restart_generation_isolated);
        assert!(started.retry_wait_cancellable);
        assert!(!started.network_io_attempted);

        let worker_started = run_production_onion_receive_loop_worker_started(&state);
        assert!(worker_started.worker_running);
        assert_eq!(worker_started.runtime_state, "receiving");
        assert_eq!(worker_started.worker_start_count, 1);

        let duplicate = run_production_onion_receive_loop_start(
            &state,
            "bob".to_string(),
            true,
        );
        assert!(duplicate.enabled);
        assert!(duplicate.profile_selected);
        assert!(duplicate.worker_running);
        assert!(duplicate.duplicate_loop_blocked);
        assert_eq!(duplicate.worker_start_count, 1);
        assert_eq!(duplicate.duplicate_start_block_count, 1);
        assert!(!duplicate.raw_profile_returned);

        state
            .receive_loop_attempts
            .fetch_add(2, std::sync::atomic::Ordering::AcqRel);
        let running = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(running.attempt_count, 2);
        assert_eq!(running.worker_start_count, 1);
        assert_eq!(running.duplicate_start_block_count, 1);

        if let Ok(mut guard) = state.receive_loop_last_next_blocker.lock() {
            *guard = Some("PersistentClientNotReady".to_string());
        }
        let retryable = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(retryable.last_failure_kind, "persistent-client");
        assert!(retryable.last_failure_retryable);
        assert_eq!(retryable.runtime_state, "bootstrapping");

        let stopped = run_production_onion_receive_loop_stop(&state);
        assert!(!stopped.enabled);
        assert!(stopped.stop_requested);
        assert_eq!(stopped.runtime_state, "stopped");
        assert!(!stopped.profile_selected);
        assert!(stopped.worker_running);
        assert!(!stopped.stop_confirmed);
        assert_eq!(stopped.attempt_count, 2);
        assert_eq!(stopped.worker_start_count, 1);
        assert_eq!(stopped.duplicate_start_block_count, 1);
        assert!(!stopped.starts_network_on_app_launch);

        let blocked_restart_while_stopping = run_production_onion_receive_loop_start(
            &state,
            "alice".to_string(),
            true,
        );
        assert!(!blocked_restart_while_stopping.enabled);
        assert!(blocked_restart_while_stopping.stop_requested);
        assert!(blocked_restart_while_stopping.worker_running);
        assert!(blocked_restart_while_stopping.duplicate_loop_blocked);
        assert_eq!(blocked_restart_while_stopping.worker_start_count, 1);
        assert_eq!(blocked_restart_while_stopping.duplicate_start_block_count, 2);
        assert!(!blocked_restart_while_stopping.starts_network_on_app_launch);

        run_production_onion_receive_loop_worker_finished(&state);
        let finished = run_production_onion_receive_loop_status(&state, false);
        assert!(!finished.worker_running);
        assert!(finished.stop_confirmed);
        assert!(!finished.active_after_import);
        assert!(!finished.continues_after_import);
        assert!(!finished.multi_message_receive_ready);
        assert!(!finished.restart_generation_isolated);
        assert_eq!(finished.worker_start_count, 1);
        assert_eq!(finished.duplicate_start_block_count, 2);

        let restarted = run_production_onion_receive_loop_start(
            &state,
            "alice".to_string(),
            true,
        );
        assert!(restarted.enabled);
        assert!(!restarted.stop_requested);
        assert!(restarted.profile_selected);
        assert_eq!(restarted.generation, 3);
        assert_eq!(restarted.attempt_count, 0);
        assert_eq!(restarted.worker_start_count, 0);
        assert_eq!(restarted.duplicate_start_block_count, 0);
        assert_eq!(restarted.import_sequence, 0);
        assert_eq!(restarted.message_import_count, 0);
        assert_eq!(restarted.endpoint_update_count, 0);
        assert!(!restarted.active_after_import);
        assert!(!restarted.continues_after_import);
        assert!(!restarted.multi_message_receive_ready);
        assert!(restarted.restart_generation_isolated);
    }

    #[test]
    fn production_onion_receive_loop_records_lifecycle_results() {
        let state = ProductionOnionClientRuntimeState::default();
        let started = run_production_onion_receive_loop_start(&state, "alice".to_string(), true);
        assert!(started.enabled);
        assert!(production_onion_receive_loop_should_continue(&state));
        let worker = run_production_onion_receive_loop_worker_started(&state);
        assert!(worker.worker_running);

        let retry_result = ProductionOnionInboundEnvelopeReceiveAttemptResult {
            warning: "test retry",
            preparation_only: false,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: true,
            persistent_client_ready: false,
            persistent_client_promoted_from_real_onion_cache: false,
            inbound_stream_preparation_ready: false,
            inbound_rend_request_stream_ready: false,
            inbound_rend_request_accept_attempted: false,
            inbound_rend_request_accepted: false,
            accepted_stream_request_stream_ready: false,
            stream_request_accept_attempted: false,
            stream_request_accepted: false,
            stream_read_attempted: false,
            stream_bytes_read: false,
            receive_attempt_started: false,
            receive_attempt_succeeded: false,
            received_envelope_ready: false,
            inbound_import_attempted: false,
            control_envelope_imported: false,
            endpoint_update_applied: false,
            stale_endpoint_status_cleared: false,
            redacted_receive_result_event_recorded: false,
            event_summary: Vec::new(),
            next_blocker: "PersistentClientNotReady".to_string(),
            blockers: vec!["PersistentClientNotReady".to_string()],
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            descriptor_body_returned: false,
            stream_id_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            descriptor_publish_attempted: false,
            stream_accept_attempted: false,
            stream_read_write_attempted: false,
            envelope_io_opened: false,
            runtime_messaging_enabled: false,
        };
        run_production_onion_receive_loop_record_attempt_result(&state, &retry_result);
        let retry = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(retry.import_sequence, 0);
        assert_eq!(retry.last_next_blocker.as_deref(), Some("PersistentClientNotReady"));
        assert_eq!(retry.last_failure_kind, "persistent-client");
        assert!(retry.last_failure_retryable);
        assert_eq!(retry.runtime_state, "bootstrapping");

        let imported_result = ProductionOnionInboundEnvelopeReceiveAttemptResult {
            next_blocker: "none".to_string(),
            blockers: Vec::new(),
            persistent_client_ready: true,
            persistent_client_promoted_from_real_onion_cache: false,
            inbound_stream_preparation_ready: true,
            inbound_rend_request_stream_ready: true,
            inbound_rend_request_accept_attempted: true,
            inbound_rend_request_accepted: true,
            accepted_stream_request_stream_ready: true,
            stream_request_accept_attempted: true,
            stream_request_accepted: true,
            stream_read_attempted: true,
            stream_bytes_read: true,
            receive_attempt_started: true,
            receive_attempt_succeeded: true,
            received_envelope_ready: true,
            inbound_import_attempted: true,
            network_io_attempted: true,
            stream_accept_attempted: true,
            stream_read_write_attempted: true,
            envelope_io_opened: true,
            runtime_messaging_enabled: true,
            ..retry_result
        };
        run_production_onion_receive_loop_record_attempt_result(&state, &imported_result);
        let imported = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(imported.import_sequence, 1);
        assert_eq!(imported.message_import_count, 1);
        assert_eq!(imported.endpoint_update_count, 0);
        assert!(imported.active_after_import);
        assert!(imported.continues_after_import);
        assert!(!imported.multi_message_receive_ready);
        assert!(imported.last_attempt_started);
        assert!(imported.last_attempt_succeeded);
        assert!(imported.last_network_io_attempted);
        assert!(imported.last_stream_accept_attempted);
        assert!(imported.last_stream_read_write_attempted);
        assert!(imported.last_envelope_io_opened);
        assert!(imported.last_runtime_messaging_enabled);
        assert_eq!(imported.last_failure_kind, "none");
        assert!(!imported.last_failure_retryable);
        assert_eq!(imported.runtime_state, "message-imported");

        let endpoint_update_result = ProductionOnionInboundEnvelopeReceiveAttemptResult {
            receive_attempt_succeeded: false,
            endpoint_update_applied: true,
            ..imported_result
        };
        run_production_onion_receive_loop_record_attempt_result(&state, &endpoint_update_result);
        let endpoint_updated = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(endpoint_updated.import_sequence, 2);
        assert_eq!(endpoint_updated.message_import_count, 1);
        assert_eq!(endpoint_updated.endpoint_update_count, 1);
        assert!(endpoint_updated.continues_after_import);
        assert!(!endpoint_updated.multi_message_receive_ready);
        assert_eq!(endpoint_updated.runtime_state, "message-imported");

        run_production_onion_receive_loop_record_attempt_error(&state);
        let errored = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(errored.import_sequence, 2);
        assert_eq!(errored.message_import_count, 1);
        assert_eq!(errored.endpoint_update_count, 1);
        assert!(!errored.last_network_io_attempted);
        assert!(!errored.last_stream_accept_attempted);
        assert!(!errored.last_stream_read_write_attempted);
        assert!(!errored.last_envelope_io_opened);
        assert!(!errored.last_runtime_messaging_enabled);
        assert_eq!(errored.last_failure_kind, "attempt-failed");
        assert!(errored.last_failure_retryable);
        assert_eq!(errored.runtime_state, "failed-retryable");

        if let Ok(mut guard) = state.receive_loop_last_next_blocker.lock() {
            *guard = Some("InboundEnvelopeDecodeFailed".to_string());
        }
        let import_failed = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(import_failed.import_sequence, 2);
        assert_eq!(import_failed.message_import_count, 1);
        assert_eq!(import_failed.endpoint_update_count, 1);
        assert_eq!(import_failed.last_failure_kind, "import");
        assert!(import_failed.last_failure_retryable);
        assert_eq!(import_failed.runtime_state, "failed-retryable");

        let second_imported_result = ProductionOnionInboundEnvelopeReceiveAttemptResult {
            receive_attempt_succeeded: true,
            endpoint_update_applied: false,
            next_blocker: "none".to_string(),
            blockers: Vec::new(),
            ..endpoint_update_result
        };
        run_production_onion_receive_loop_record_attempt_result(&state, &second_imported_result);
        let second_imported = run_production_onion_receive_loop_status(&state, false);
        assert_eq!(second_imported.import_sequence, 3);
        assert_eq!(second_imported.message_import_count, 2);
        assert_eq!(second_imported.endpoint_update_count, 1);
        assert!(second_imported.active_after_import);
        assert!(second_imported.continues_after_import);
        assert!(second_imported.multi_message_receive_ready);
        assert_eq!(second_imported.last_failure_kind, "none");
        assert!(!second_imported.last_failure_retryable);
        assert_eq!(second_imported.runtime_state, "message-imported");

        let stopping = run_production_onion_receive_loop_stop(&state);
        assert!(!stopping.stop_confirmed);
        assert!(!production_onion_receive_loop_should_continue(&state));
        run_production_onion_receive_loop_worker_finished(&state);
        let stopped = run_production_onion_receive_loop_status(&state, false);
        assert!(stopped.stop_confirmed);
        assert!(!stopped.active_after_import);
        assert!(!stopped.continues_after_import);
        assert!(!stopped.multi_message_receive_ready);
        assert!(!stopped.restart_generation_isolated);
        assert!(!stopped.profile_selected);
        assert!(!stopped.raw_profile_returned);
        assert!(!stopped.passphrase_retained);
        assert!(!stopped.key_material_exposed);
    }

    #[test]
    fn production_onion_receive_loop_retry_waits_are_bounded_by_failure_kind() {
        assert_eq!(
            production_onion_receive_loop_retry_wait_millis("manual-permission"),
            1_000
        );
        assert_eq!(
            production_onion_receive_loop_retry_wait_millis("persistent-client"),
            1_000
        );
        assert_eq!(production_onion_receive_loop_retry_wait_millis("busy"), 500);
        assert_eq!(
            production_onion_receive_loop_retry_wait_millis("peer-offline"),
            3_000
        );
        assert_eq!(
            production_onion_receive_loop_retry_wait_millis("receive-timeout"),
            3_000
        );
        assert_eq!(
            production_onion_receive_loop_retry_wait_millis("feature-disabled"),
            5_000
        );
        assert_eq!(
            production_onion_receive_loop_retry_wait_millis("unknown-retryable"),
            2_000
        );
    }

    #[test]
    fn production_onion_receive_loop_wait_stops_without_sleeping_full_interval() {
        let state = ProductionOnionClientRuntimeState::default();
        let started = run_production_onion_receive_loop_start(&state, "alice".to_string(), true);
        assert!(started.enabled);
        let stopping = run_production_onion_receive_loop_stop(&state);
        assert!(stopping.stop_requested);

        let began = std::time::Instant::now();
        let should_continue = tauri::async_runtime::block_on(
            production_onion_receive_loop_wait_or_stop(&state, 3_000),
        );
        assert!(!should_continue);
        assert!(
            began.elapsed() < std::time::Duration::from_millis(250),
            "stop request should cancel receive loop retry wait promptly"
        );
    }

    #[test]
    fn production_onion_preflight_is_explicit_and_redacted() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let data_root = root.join("data");
        let cache_root = root.join("cache");

        let result = run_production_onion_preflight_check(&data_root, &cache_root);

        assert!(result.preflight_only);
        assert!(result.manual_network_action);
        assert!(!result.ready_for_onion_launch);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        assert!(result
            .blockers
            .iter()
            .any(|blocker| blocker.contains("onion launch preflight blocked")));
        let serialized = serde_json::to_string(&result).expect("serialize preflight");
        assert!(!serialized.contains(data_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(cache_root.to_string_lossy().as_ref()));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_onion_key_record_prepare_blocks_without_backup_exclusion() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let result = run_production_onion_key_record_prepare(
            root.join("data"),
            root.join("cache"),
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("onion key record prepare result");

        assert!(!result.storage_opened);
        assert!(!result.profile_transport_unlock_ready);
        assert!(!result.backup_exclusion_verified);
        assert!(!result.lifecycle_ready);
        assert!(!result.key_record_written);
        assert!(!result.key_material_ready);
        assert!(!result.raw_path_returned);
        assert!(!result.onion_secret_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        assert!(result
            .blockers
            .iter()
            .any(|blocker| blocker.contains("backup exclusion")));
        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains(root.to_string_lossy().as_ref()));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".onion"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_profile_unlock_uses_app_data_store_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let result = run_production_profile_unlock(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");

        assert!(result.storage_opened);
        assert!(result.app_data_profile_store);
        assert!(result.profile_initialized);
        assert!(result.profile_marker_present);
        assert!(result.identity_created);
        assert!(result.identity_private_key_present);
        assert!(result.identity_public_key_derivable);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let second = run_production_profile_unlock(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("second profile unlock");
        assert!(!second.profile_initialized);
        assert!(!second.identity_created);

        let policy = production_message_retention_policy();
        assert_eq!(policy.default_ttl_seconds, 604_800);
        assert_eq!(
            policy.allowed_ttl_seconds,
            vec![3_600, 86_400, 604_800, 2_592_000]
        );

        let default_preference = run_production_message_retention_preference_get(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("default retention preference");
        assert!(default_preference.storage_opened);
        assert!(default_preference.profile_marker_present);
        assert!(!default_preference.preference_present);
        assert_eq!(default_preference.message_ttl_seconds, 604_800);
        assert!(!default_preference.preference_written);

        let saved_preference = run_production_message_retention_preference_set(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            86_400,
        )
        .expect("save retention preference");
        assert!(saved_preference.preference_present);
        assert!(saved_preference.preference_written);
        assert_eq!(saved_preference.message_ttl_seconds, 86_400);
        assert!(!saved_preference.key_material_exposed);
        assert!(!saved_preference.transport_io_opened);
        assert!(!saved_preference.runtime_messaging_enabled);

        let loaded_preference = run_production_message_retention_preference_get(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("loaded retention preference");
        assert!(loaded_preference.preference_present);
        assert_eq!(loaded_preference.message_ttl_seconds, 86_400);
        assert!(!loaded_preference.preference_written);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        assert!(!serialized.contains("profiles"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_profile_list_returns_sanitized_names_without_unlocking_stores() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let empty = run_production_profile_list(&root).expect("empty profile list");
        assert!(empty.profiles.is_empty());
        assert_eq!(empty.profile_count, 0);
        assert!(empty.app_data_profile_store);
        assert!(!empty.passphrase_required);
        assert!(!empty.store_path_returned);
        assert!(!empty.key_material_exposed);
        assert!(!empty.transport_io_opened);
        assert!(!empty.runtime_messaging_enabled);

        run_production_profile_unlock(&root, "bob".to_string(), "correct-passphrase".to_string())
            .expect("bob unlock");
        run_production_profile_unlock(&root, "alice".to_string(), "correct-passphrase".to_string())
            .expect("alice unlock");
        let profiles_dir = root.join("profiles");
        std::fs::write(profiles_dir.join("bad.name.db"), b"ignored").expect("write bad profile");
        std::fs::write(profiles_dir.join("notes.txt"), b"ignored").expect("write ignored file");

        let listed = run_production_profile_list(&root).expect("profile list");
        assert_eq!(
            listed.profiles,
            vec!["alice".to_string(), "bob".to_string()]
        );
        assert_eq!(listed.profile_count, 2);
        assert!(!listed.store_path_returned);
        assert!(!listed.passphrase_retained);
        assert!(!listed.key_material_exposed);
        assert!(!listed.network_io_attempted);
        assert!(!listed.transport_io_opened);
        assert!(!listed.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&listed).expect("serialize list");
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains(".db"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn pairing_rendezvous_endpoint_sanitizer_accepts_onion_host_only() {
        assert_eq!(
            sanitize_pairing_rendezvous_endpoint(" alice.onion ".to_string()).expect("endpoint"),
            "alice.onion"
        );
        assert!(sanitize_pairing_rendezvous_endpoint("alice.onion/path".to_string()).is_err());
        assert!(sanitize_pairing_rendezvous_endpoint("alice.example".to_string()).is_err());
        assert!(sanitize_pairing_rendezvous_endpoint("alice onion".to_string()).is_err());
    }

    #[test]
    fn production_pairing_payload_export_uses_persistent_profile_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        run_production_profile_unlock(&root, "alice".to_string(), "correct-passphrase".to_string())
            .expect("profile unlock");
        let result = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("payload export");

        assert!(result.storage_opened);
        assert!(result.identity_private_key_loaded);
        assert!(result.noise_static_private_key_written);
        assert!(result.pairing_payload_exported);
        assert!(result.pairing_payload.starts_with("ADPAIR2|"));
        assert_eq!(result.payload_format, "ADPAIR2");
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.private_key_material_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        assert!(!serialized.contains("profiles"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn pairing_payload_sanitizer_accepts_single_adpair2_value_only() {
        assert_eq!(
            sanitize_pairing_payload(" ADPAIR2|abc|sig ".to_string()).expect("payload"),
            "ADPAIR2|abc|sig"
        );
        assert!(sanitize_pairing_payload("ADPAIR1|abc|sig".to_string()).is_err());
        assert!(sanitize_pairing_payload("ADPAIR2|abc|sig\nADPAIR2|x|y".to_string()).is_err());
    }

    #[test]
    fn production_pairing_session_draft_save_uses_persistent_profile_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for (profile, endpoint) in [("alice", "alice.onion"), ("bob", "bob.onion")] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
            run_production_pairing_payload_export(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
                endpoint.to_string(),
            )
            .expect("payload export");
        }

        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;

        let result = run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload,
            bob_payload,
            true,
        )
        .expect("session draft save");

        assert!(result.storage_opened);
        assert!(result.session_plan_created);
        assert!(result.local_noise_static_private_key_loaded);
        assert!(result.local_noise_static_matches_payload);
        assert!(result.session_draft_written);
        assert!(result.remote_endpoint_state_written);
        assert!(result.replay_window_written);
        assert!(result.channel_id_derivable);
        assert!(result.session_draft_present);
        assert!(result.remote_contact_present);
        assert!(result.remote_endpoint_state_present);
        assert!(result.replay_window_present);
        assert!(!result.payloads_returned);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("ADPAIR2"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_pairing_safety_preview_is_redacted_and_required_for_draft_save() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for profile in ["alice", "bob"] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
        }
        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;

        assert!(run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload.clone(),
            bob_payload.clone(),
            false,
        )
        .is_err());

        let result = run_production_pairing_safety_preview(alice_payload, bob_payload)
            .expect("safety preview");

        assert!(result.payloads_decodable);
        assert!(result.safety_transcript_bound);
        assert!(!result.safety_number.is_empty());
        assert!(!result.safety_phrase.is_empty());
        assert!(!result.safety_confirmed);
        assert!(!result.payloads_returned);
        assert!(!result.safety_transcript_returned);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&result).expect("serialize safety preview");
        assert!(!serialized.contains("ADPAIR2"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("alice.onion"));
        assert!(!serialized.contains("bob.onion"));
        assert!(!serialized.contains("/tmp"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn handshake_payload_sanitizer_accepts_expected_single_value_only() {
        assert_eq!(
            sanitize_handshake_payload(" ADNOISEXXINIT1|abc ".to_string(), "ADNOISEXXINIT1")
                .expect("payload"),
            "ADNOISEXXINIT1|abc"
        );
        assert!(
            sanitize_handshake_payload("ADNOISEXXREPLY1|abc".to_string(), "ADNOISEXXINIT1")
                .is_err()
        );
        assert!(sanitize_handshake_payload(
            "ADNOISEXXINIT1|abc\nADNOISEXXINIT1|def".to_string(),
            "ADNOISEXXINIT1"
        )
        .is_err());
    }

    #[test]
    fn production_handshake_commands_persist_transport_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for profile in ["alice", "bob"] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
        }
        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;
        run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload.clone(),
            bob_payload.clone(),
            true,
        )
        .expect("alice draft");
        run_production_pairing_session_draft_save(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            bob_payload,
            alice_payload,
            true,
        )
        .expect("bob draft");
        let draft_state = run_production_session_state_check(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("draft state");
        assert!(draft_state.storage_opened);
        assert!(draft_state.session_draft_present);
        assert!(draft_state.channel_id_derivable);
        assert!(draft_state.local_role_available);
        assert!(draft_state.remote_contact_present);
        assert!(draft_state.remote_endpoint_state_present);
        assert!(draft_state.replay_window_present);
        assert!(!draft_state.session_transport_state_present);
        assert!(draft_state.runtime_material_reconstructable);
        assert!(draft_state.outbound_envelope_io_ready);
        assert!(!draft_state.ready_for_message_envelope);
        assert!(!draft_state.store_path_returned);
        assert!(!draft_state.passphrase_retained);
        assert!(!draft_state.key_material_exposed);
        assert!(!draft_state.network_io_attempted);
        assert!(!draft_state.transport_io_opened);
        assert!(!draft_state.runtime_messaging_enabled);

        let alice_init = run_production_handshake_init_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("alice init");
        let (initiator, responder, init_payload) = if alice_init.output_payload_created {
            ("alice", "bob", alice_init.output_payload)
        } else {
            let bob_init = run_production_handshake_init_export(
                &root,
                "bob".to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("bob init");
            assert!(bob_init.output_payload_created);
            ("bob", "alice", bob_init.output_payload)
        };

        let reply = run_production_handshake_reply_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            init_payload,
        )
        .expect("reply");
        assert!(reply.output_payload_created);
        assert!(reply.state_written);

        let finish = run_production_handshake_finish_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            reply.output_payload,
        )
        .expect("finish");
        assert!(finish.output_payload_created);
        assert!(finish.transport_state_persisted);

        let import = run_production_handshake_finish_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            finish.output_payload,
        )
        .expect("finish import");
        assert!(import.remote_static_verified);
        assert!(import.transport_state_created);
        assert!(import.transport_state_persisted);
        assert!(!import.payloads_returned);
        assert!(!import.key_material_exposed);
        assert!(!import.network_io_attempted);
        assert!(!import.transport_io_opened);
        assert!(!import.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&import).expect("serialize import");
        assert!(!serialized.contains("ADNOISEXX"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_two_profile_session_status_reads_both_profiles_without_transport_io() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for profile in ["alice", "bob"] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
        }
        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;
        run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload.clone(),
            bob_payload.clone(),
            true,
        )
        .expect("alice draft");
        run_production_pairing_session_draft_save(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            bob_payload,
            alice_payload,
            true,
        )
        .expect("bob draft");

        let draft_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("draft status");
        assert_eq!(draft_status.profile_a, "alice");
        assert_eq!(draft_status.profile_b, "bob");
        assert!(!draft_status.both_ready_for_message_envelope);
        assert!(draft_status.profile_a_remote_endpoint_state_present);
        assert!(draft_status.profile_b_remote_endpoint_state_present);
        assert!(draft_status.profile_a_remote_endpoint_invite_placeholder);
        assert!(draft_status.profile_b_remote_endpoint_invite_placeholder);
        assert!(!draft_status.profile_a_session_transport_state_present);
        assert!(!draft_status.profile_b_session_transport_state_present);

        let alice_init = run_production_handshake_init_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("alice init");
        let (initiator, responder, init_payload) = if alice_init.output_payload_created {
            ("alice", "bob", alice_init.output_payload)
        } else {
            let bob_init = run_production_handshake_init_export(
                &root,
                "bob".to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("bob init");
            ("bob", "alice", bob_init.output_payload)
        };
        let reply = run_production_handshake_reply_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            init_payload,
        )
        .expect("reply");
        let finish = run_production_handshake_finish_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            reply.output_payload,
        )
        .expect("finish");
        run_production_handshake_finish_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            finish.output_payload,
        )
        .expect("finish import");

        let ready_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("ready status");
        assert!(ready_status.profile_a_ready_for_message_envelope);
        assert!(ready_status.profile_b_ready_for_message_envelope);
        assert!(ready_status.both_ready_for_message_envelope);
        assert!(ready_status.profile_a_remote_endpoint_state_present);
        assert!(ready_status.profile_b_remote_endpoint_state_present);
        assert!(ready_status.profile_a_remote_endpoint_invite_placeholder);
        assert!(ready_status.profile_b_remote_endpoint_invite_placeholder);
        assert!(!ready_status.store_path_returned);
        assert!(!ready_status.passphrase_retained);
        assert!(!ready_status.key_material_exposed);
        assert!(!ready_status.network_io_attempted);
        assert!(!ready_status.transport_io_opened);
        assert!(!ready_status.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&ready_status).expect("serialize status");
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_two_profile_resume_reloads_status_and_transcripts_after_new_command_invocations()
    {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let setup = run_production_two_profile_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "resume after restart".to_string(),
            86_400,
        )
        .expect("two profile setup");
        assert!(setup.handshake_completed);
        assert!(setup.sender_session_ready);
        assert!(setup.receiver_session_ready);
        assert!(setup.inbound_message_stored);
        assert!(!setup.network_io_attempted);
        assert!(!setup.transport_io_opened);
        assert!(!setup.runtime_messaging_enabled);

        let resumed_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("resumed status");
        assert!(resumed_status.profile_a_ready_for_message_envelope);
        assert!(resumed_status.profile_b_ready_for_message_envelope);
        assert!(resumed_status.both_ready_for_message_envelope);
        assert!(resumed_status.profile_a_remote_endpoint_state_present);
        assert!(resumed_status.profile_b_remote_endpoint_state_present);
        assert!(resumed_status.profile_a_session_transport_state_present);
        assert!(resumed_status.profile_b_session_transport_state_present);
        assert!(resumed_status.profile_a_runtime_material_reconstructable);
        assert!(resumed_status.profile_b_runtime_material_reconstructable);
        assert!(!resumed_status.profile_a_remote_endpoint_marked_stale);
        assert!(!resumed_status.profile_b_remote_endpoint_marked_stale);
        assert!(!resumed_status.store_path_returned);
        assert!(!resumed_status.passphrase_retained);
        assert!(!resumed_status.key_material_exposed);
        assert!(!resumed_status.network_io_attempted);
        assert!(!resumed_status.transport_io_opened);
        assert!(!resumed_status.runtime_messaging_enabled);

        let sender_transcript = run_production_message_transcript_export(
            &root,
            setup.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("sender transcript after resume");
        let receiver_transcript = run_production_message_transcript_export(
            &root,
            setup.receiver_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("receiver transcript after resume");
        assert_eq!(sender_transcript.entries.len(), 1);
        assert_eq!(receiver_transcript.entries.len(), 1);
        assert_eq!(sender_transcript.expired_messages_purged, 0);
        assert_eq!(receiver_transcript.expired_messages_purged, 0);
        assert_eq!(sender_transcript.entries[0].direction, "sent");
        assert_eq!(receiver_transcript.entries[0].direction, "received");
        assert_eq!(
            sender_transcript.entries[0].message_number,
            setup.message_number
        );
        assert_eq!(
            receiver_transcript.entries[0].message_number,
            setup.message_number
        );
        assert_eq!(sender_transcript.entries[0].message, "resume after restart");
        assert_eq!(
            receiver_transcript.entries[0].message,
            "resume after restart"
        );
        assert_eq!(sender_transcript.entries[0].ttl_seconds, 86_400);
        assert_eq!(receiver_transcript.entries[0].ttl_seconds, 86_400);
        assert!(sender_transcript.plaintext_returned_after_unlock);
        assert!(receiver_transcript.plaintext_returned_after_unlock);
        assert!(!sender_transcript.key_material_exposed);
        assert!(!receiver_transcript.key_material_exposed);
        assert!(!sender_transcript.network_io_attempted);
        assert!(!receiver_transcript.network_io_attempted);
        assert!(!sender_transcript.transport_io_opened);
        assert!(!receiver_transcript.transport_io_opened);
        assert!(!sender_transcript.runtime_messaging_enabled);
        assert!(!receiver_transcript.runtime_messaging_enabled);

        let serialized_status =
            serde_json::to_string(&resumed_status).expect("serialize resumed status");
        assert!(!serialized_status.contains("correct-passphrase"));
        assert!(!serialized_status.contains("/tmp"));
        assert!(!serialized_status.contains("resume after restart"));

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_two_profile_resume_keeps_retryable_send_after_runtime_reinitialization() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let setup = run_production_two_profile_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "initial room transcript".to_string(),
            86_400,
        )
        .expect("two profile setup");
        assert!(setup.sender_session_ready);
        assert!(setup.receiver_session_ready);

        let outbound = run_production_message_envelope_export(
            &root,
            setup.sender_profile.clone(),
            "correct-passphrase".to_string(),
            0,
            true,
            "retry after runtime restart".to_string(),
            604_800,
        )
        .expect("outbound message");
        assert!(outbound.pending_message_record_written);
        assert!(outbound.encrypted_envelope_present);
        assert!(!outbound.network_send_attempted);

        super::run_production_message_outbound_mark_send_failed(
            &root,
            setup.sender_profile.clone(),
            "correct-passphrase".to_string(),
            outbound.selected_message_number,
            "peer-endpoint-missing".to_string(),
        )
        .expect("mark outbound failed");
        let failed_transcript = run_production_message_transcript_export(
            &root,
            setup.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("failed sender transcript");
        let failed_entry = failed_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("failed sender entry");
        assert_eq!(failed_entry.direction, "sent");
        assert_eq!(failed_entry.message, "retry after runtime restart");
        assert_eq!(
            failed_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert_eq!(
            failed_entry.outbound_failure_kind.as_deref(),
            Some("peer-endpoint-missing")
        );
        assert!(failed_entry.outbound_retryable);

        let running_runtime = ProductionOnionClientRuntimeState::default();
        let receive_started = run_production_onion_receive_loop_start(
            &running_runtime,
            setup.receiver_profile.clone(),
            true,
        );
        assert!(receive_started.enabled);
        assert!(receive_started.explicit_user_start_required);
        assert!(!receive_started.starts_network_on_app_launch);
        assert!(!receive_started.passphrase_retained);

        let restarted_runtime = ProductionOnionClientRuntimeState::default();
        let receive_after_restart = run_production_onion_receive_loop_status(&restarted_runtime, false);
        assert!(!receive_after_restart.enabled);
        assert!(!receive_after_restart.worker_running);
        assert_eq!(receive_after_restart.runtime_state, "stopped");
        assert!(receive_after_restart.explicit_user_start_required);
        assert!(!receive_after_restart.starts_network_on_app_launch);
        assert!(!receive_after_restart.passphrase_retained);
        assert!(!receive_after_restart.key_material_exposed);
        assert!(!receive_after_restart.network_io_attempted);

        let resumed_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("resumed status after runtime restart");
        assert!(resumed_status.both_ready_for_message_envelope);
        assert!(resumed_status.profile_a_runtime_material_reconstructable);
        assert!(resumed_status.profile_b_runtime_material_reconstructable);
        assert!(!resumed_status.passphrase_retained);
        assert!(!resumed_status.key_material_exposed);
        assert!(!resumed_status.network_io_attempted);
        assert!(!resumed_status.transport_io_opened);
        assert!(!resumed_status.runtime_messaging_enabled);

        let resumed_sender_transcript = run_production_message_transcript_export(
            &root,
            setup.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("resumed sender transcript");
        assert!(resumed_sender_transcript.entries.iter().any(|entry| {
            entry.direction == "sent"
                && entry.message_number == setup.message_number
                && entry.message == "initial room transcript"
        }));
        let resumed_failed_entry = resumed_sender_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("resumed failed sender entry");
        assert_eq!(
            resumed_failed_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert_eq!(
            resumed_failed_entry.outbound_failure_kind.as_deref(),
            Some("peer-endpoint-missing")
        );
        assert!(resumed_failed_entry.outbound_retryable);
        assert!(!resumed_sender_transcript.key_material_exposed);
        assert!(!resumed_sender_transcript.network_io_attempted);
        assert!(!resumed_sender_transcript.transport_io_opened);

        let resumed_receiver_transcript = run_production_message_transcript_export(
            &root,
            setup.receiver_profile,
            "correct-passphrase".to_string(),
        )
        .expect("resumed receiver transcript");
        assert!(resumed_receiver_transcript.entries.iter().any(|entry| {
            entry.direction == "received"
                && entry.message_number == setup.message_number
                && entry.message == "initial room transcript"
        }));
        assert!(!resumed_receiver_transcript.key_material_exposed);
        assert!(!resumed_receiver_transcript.network_io_attempted);
        assert!(!resumed_receiver_transcript.transport_io_opened);

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_receive_import_updates_transcript_and_receive_loop_refresh_counters() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let setup = run_production_two_profile_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "initial room transcript".to_string(),
            86_400,
        )
        .expect("two profile setup");
        assert!(setup.sender_session_ready);
        assert!(setup.receiver_session_ready);

        let outbound = run_production_message_envelope_export(
            &root,
            setup.sender_profile.clone(),
            "correct-passphrase".to_string(),
            0,
            true,
            "receive refresh import".to_string(),
            86_400,
        )
        .expect("outbound message");
        assert!(outbound.encrypted_envelope_present);
        assert!(!outbound.network_send_attempted);

        let inbound = run_production_message_envelope_import(
            &root,
            setup.receiver_profile.clone(),
            "correct-passphrase".to_string(),
            outbound.selected_message_number,
            outbound.envelope_payload,
            86_400,
        )
        .expect("inbound import");
        assert!(inbound.received_message_written);
        assert!(inbound.received_message_record_present);
        assert!(inbound.received_message_matches_session);
        assert!(!inbound.plaintext_returned);
        assert!(!inbound.network_receive_attempted);
        assert!(!inbound.transport_io_opened);
        assert!(!inbound.runtime_messaging_enabled);

        let receive_state = ProductionOnionClientRuntimeState::default();
        let started = run_production_onion_receive_loop_start(
            &receive_state,
            setup.receiver_profile.clone(),
            true,
        );
        assert!(started.enabled);
        let worker_started = run_production_onion_receive_loop_worker_started(&receive_state);
        assert!(worker_started.worker_running);
        let imported_result = ProductionOnionInboundEnvelopeReceiveAttemptResult {
            warning: "test receive import",
            preparation_only: false,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: true,
            persistent_client_ready: true,
            persistent_client_promoted_from_real_onion_cache: false,
            inbound_stream_preparation_ready: true,
            inbound_rend_request_stream_ready: true,
            inbound_rend_request_accept_attempted: true,
            inbound_rend_request_accepted: true,
            accepted_stream_request_stream_ready: true,
            stream_request_accept_attempted: true,
            stream_request_accepted: true,
            stream_read_attempted: true,
            stream_bytes_read: true,
            receive_attempt_started: true,
            receive_attempt_succeeded: true,
            received_envelope_ready: true,
            inbound_import_attempted: true,
            control_envelope_imported: false,
            endpoint_update_applied: false,
            stale_endpoint_status_cleared: false,
            redacted_receive_result_event_recorded: true,
            event_summary: vec!["MessageImported".to_string()],
            next_blocker: "none".to_string(),
            blockers: Vec::new(),
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            descriptor_body_returned: false,
            stream_id_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: false,
            network_io_attempted: true,
            descriptor_publish_attempted: false,
            stream_accept_attempted: true,
            stream_read_write_attempted: true,
            envelope_io_opened: true,
            runtime_messaging_enabled: true,
        };
        run_production_onion_receive_loop_record_attempt_result(
            &receive_state,
            &imported_result,
        );
        let receive_status = run_production_onion_receive_loop_status(&receive_state, false);
        assert_eq!(receive_status.import_sequence, 1);
        assert_eq!(receive_status.message_import_count, 1);
        assert_eq!(receive_status.endpoint_update_count, 0);
        assert!(receive_status.active_after_import);
        assert!(receive_status.continues_after_import);
        assert_eq!(receive_status.runtime_state, "message-imported");
        assert!(receive_status.last_attempt_succeeded);
        assert!(receive_status.last_stream_read_write_attempted);
        assert!(receive_status.last_envelope_io_opened);
        assert!(receive_status.last_runtime_messaging_enabled);
        assert!(!receive_status.passphrase_retained);
        assert!(!receive_status.key_material_exposed);

        let receiver_transcript = run_production_message_transcript_export(
            &root,
            setup.receiver_profile,
            "correct-passphrase".to_string(),
        )
        .expect("receiver transcript after receive import");
        assert!(receiver_transcript.entries.iter().any(|entry| {
            entry.direction == "received"
                && entry.message_number == outbound.selected_message_number
                && entry.message == "receive refresh import"
                && !entry.expired
        }));
        assert!(!receiver_transcript.key_material_exposed);
        assert!(!receiver_transcript.network_io_attempted);
        assert!(!receiver_transcript.transport_io_opened);
        assert!(!receiver_transcript.runtime_messaging_enabled);

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_remote_endpoint_update_keeps_existing_session_without_transport_io() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for profile in ["alice", "bob"] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
        }
        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;
        run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload.clone(),
            bob_payload.clone(),
            true,
        )
        .expect("alice draft");
        run_production_pairing_session_draft_save(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            bob_payload,
            alice_payload,
            true,
        )
        .expect("bob draft");

        let update = run_production_pairing_session_remote_endpoint_update(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "bob-rotated.onion".to_string(),
        )
        .expect("endpoint update");

        assert!(update.storage_opened);
        assert!(update.session_draft_loaded);
        assert!(update.previous_remote_endpoint_present);
        assert!(update.update_channel_existing_encrypted_session);
        assert!(update.remote_endpoint_changed);
        assert!(update.remote_endpoint_state_written);
        assert!(update.runtime_material_reconstructable);
        assert!(!update.remote_endpoint_returned);
        assert!(!update.store_path_returned);
        assert!(!update.passphrase_retained);
        assert!(!update.key_material_exposed);
        assert!(!update.network_io_attempted);
        assert!(!update.transport_io_opened);
        assert!(!update.runtime_messaging_enabled);

        let status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("status");
        assert!(status.profile_a_remote_endpoint_state_present);
        assert!(status.profile_a_runtime_material_reconstructable);
        assert!(!status.network_io_attempted);
        let serialized = serde_json::to_string(&update).expect("serialize update");
        assert!(!serialized.contains("bob-rotated.onion"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));

        run_production_pairing_session_remote_endpoint_mark_send_failure(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            7,
        )
        .expect("mark send failure");
        let stale_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("stale status");
        assert!(stale_status.profile_a_remote_endpoint_marked_stale);
        assert!(stale_status.profile_a_remote_endpoint_refresh_recommended);
        assert_eq!(
            stale_status.profile_a_remote_endpoint_last_failed_message_number,
            Some(7)
        );
        assert!(!stale_status.network_io_attempted);
        assert!(!serde_json::to_string(&stale_status)
            .expect("serialize stale status")
            .contains("bob-rotated.onion"));
        assert!(
            super::run_production_pairing_session_remote_endpoint_for_transport(
                &root,
                "alice".to_string(),
                "correct-passphrase".to_string(),
            )
            .is_err(),
            "stale stored endpoint must not be returned for transport send"
        );

        run_production_pairing_session_remote_endpoint_update(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "bob-rerotated.onion".to_string(),
        )
        .expect("clear stale endpoint");
        let refreshed_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("refreshed status");
        assert!(!refreshed_status.profile_a_remote_endpoint_marked_stale);
        assert!(!refreshed_status.profile_a_remote_endpoint_refresh_recommended);
        assert_eq!(
            refreshed_status.profile_a_remote_endpoint_last_failed_message_number,
            None
        );
        let refreshed_endpoint = super::run_production_pairing_session_remote_endpoint_for_transport(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("refreshed endpoint for transport");
        assert_eq!(refreshed_endpoint, "bob-rerotated.onion");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_onion_send_attempt_result_persists_failed_and_sent_resume_state() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let roundtrip = run_production_two_profile_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "session setup".to_string(),
            86_400,
        )
        .expect("two profile setup");
        assert!(roundtrip.sender_session_ready);
        assert!(roundtrip.receiver_session_ready);

        let outbound = run_production_message_envelope_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            0,
            true,
            "retry over onion".to_string(),
            604_800,
        )
        .expect("outbound message");
        let failed_attempt = super::ProductionOnionOutboundEnvelopeSendAttemptResult {
            warning: "test send attempt",
            preparation_only: false,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: true,
            persistent_client_ready: true,
            persistent_client_promoted_from_real_onion_cache: false,
            send_intent_prepared: true,
            send_attempt_started: true,
            send_attempt_succeeded: false,
            peer_endpoint_failure_recorded: false,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            ack_wait_registered: true,
            redacted_send_result_event_recorded: true,
            event_summary: vec!["TransferFailed(SendFailed)".to_string()],
            next_blocker: "receive-timeout".to_string(),
            blockers: vec!["receive-timeout".to_string()],
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            peer_proof_returned: false,
            session_transcript_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: false,
            network_io_attempted: true,
            stream_accept_attempted: false,
            stream_dial_attempted: true,
            stream_read_write_attempted: true,
            stream_send_attempted: false,
            envelope_io_opened: true,
            runtime_messaging_enabled: false,
        };
        let mut failed_endpoint_attempt = failed_attempt;
        super::apply_peer_endpoint_send_failure_result(
            &mut failed_endpoint_attempt,
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            outbound.selected_message_number,
        );
        super::apply_outbound_message_send_attempt_result(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            outbound.selected_message_number,
            &failed_endpoint_attempt,
        );

        assert!(!failed_endpoint_attempt.peer_endpoint_failure_recorded);
        assert!(!failed_endpoint_attempt.peer_endpoint_refresh_recommended);
        assert!(!failed_endpoint_attempt.retry_recommended_after_endpoint_refresh);
        let failed_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("failed status");
        let sender_is_a = failed_status.profile_a == roundtrip.sender_profile;
        assert_eq!(
            if sender_is_a {
                failed_status.profile_a_remote_endpoint_last_failed_message_number
            } else {
                failed_status.profile_b_remote_endpoint_last_failed_message_number
            },
            None
        );
        assert!(!if sender_is_a {
            failed_status.profile_a_remote_endpoint_marked_stale
        } else {
            failed_status.profile_b_remote_endpoint_marked_stale
        });

        let failed_transcript = run_production_message_transcript_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("failed transcript");
        let failed_entry = failed_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("failed entry");
        assert_eq!(
            failed_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert_eq!(
            failed_entry.outbound_failure_kind.as_deref(),
            Some("receive-timeout")
        );
        assert!(failed_entry.outbound_retryable);

        let succeeded_attempt = super::ProductionOnionOutboundEnvelopeSendAttemptResult {
            send_attempt_succeeded: true,
            stream_send_attempted: true,
            next_blocker: "AwaitingRemoteAck".to_string(),
            blockers: Vec::new(),
            ..failed_endpoint_attempt
        };
        super::apply_outbound_message_send_attempt_result(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            outbound.selected_message_number,
            &succeeded_attempt,
        );
        let sent_transcript = run_production_message_transcript_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("sent transcript");
        let sent_entry = sent_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("sent entry");
        assert_eq!(sent_entry.outbound_delivery_state.as_deref(), Some("sent"));
        assert_eq!(sent_entry.outbound_failure_kind, None);
        assert!(!sent_entry.outbound_retryable);

        let blocked_outbound = run_production_message_envelope_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            0,
            true,
            "retry after bootstrap".to_string(),
            604_800,
        )
        .expect("blocked outbound message");
        let blocked_attempt = super::ProductionOnionOutboundEnvelopeSendAttemptResult {
            warning: "test blocked send attempt",
            preparation_only: false,
            manual_client_attempt_feature_compiled: true,
            manual_network_permission_enabled: true,
            persistent_client_ready: false,
            persistent_client_promoted_from_real_onion_cache: false,
            send_intent_prepared: true,
            send_attempt_started: false,
            send_attempt_succeeded: false,
            peer_endpoint_failure_recorded: false,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            ack_wait_registered: true,
            redacted_send_result_event_recorded: false,
            event_summary: Vec::new(),
            next_blocker: "PersistentClientNotReady".to_string(),
            blockers: vec!["PersistentClientNotReady".to_string()],
            raw_endpoint_returned: false,
            raw_path_returned: false,
            onion_secret_returned: false,
            peer_proof_returned: false,
            session_transcript_returned: false,
            envelope_payload_returned: false,
            key_material_exposed: false,
            network_io_attempted: false,
            stream_accept_attempted: false,
            stream_dial_attempted: false,
            stream_read_write_attempted: false,
            stream_send_attempted: false,
            envelope_io_opened: false,
            runtime_messaging_enabled: false,
        };
        super::apply_outbound_message_send_attempt_result(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            blocked_outbound.selected_message_number,
            &blocked_attempt,
        );
        let blocked_transcript = run_production_message_transcript_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("blocked transcript");
        let blocked_entry = blocked_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == blocked_outbound.selected_message_number)
            .expect("blocked entry");
        assert_eq!(
            blocked_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert_eq!(
            blocked_entry.outbound_failure_kind.as_deref(),
            Some("PersistentClientNotReady")
        );
        assert!(blocked_entry.outbound_retryable);
        let resume_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("resume status after blocked send");
        assert!(resume_status.both_ready_for_message_envelope);

        let unavailable_endpoint_outbound = run_production_message_envelope_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            0,
            true,
            "retry after endpoint unavailable".to_string(),
            604_800,
        )
        .expect("unavailable endpoint outbound message");
        let unavailable_endpoint_attempt = super::stored_endpoint_unavailable_outbound_send_result(
            "stored remote endpoint unavailable".to_string(),
            true,
            true,
        );
        super::apply_outbound_message_send_attempt_result(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            unavailable_endpoint_outbound.selected_message_number,
            &unavailable_endpoint_attempt,
        );
        assert!(!unavailable_endpoint_attempt.send_attempt_started);
        assert!(!unavailable_endpoint_attempt.network_io_attempted);
        assert_eq!(
            unavailable_endpoint_attempt.next_blocker,
            "stored remote endpoint unavailable"
        );
        let unavailable_endpoint_transcript = run_production_message_transcript_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("unavailable endpoint transcript");
        let unavailable_endpoint_entry = unavailable_endpoint_transcript
            .entries
            .iter()
            .find(|entry| {
                entry.message_number == unavailable_endpoint_outbound.selected_message_number
            })
            .expect("unavailable endpoint entry");
        assert_eq!(
            unavailable_endpoint_entry
                .outbound_delivery_state
                .as_deref(),
            Some("failed")
        );
        assert_eq!(
            unavailable_endpoint_entry.outbound_failure_kind.as_deref(),
            Some("storedremoteendpointunavailable")
        );
        assert!(unavailable_endpoint_entry.outbound_retryable);

        let endpoint_blocked_outbound = run_production_message_envelope_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            0,
            true,
            "retry after endpoint refresh".to_string(),
            604_800,
        )
        .expect("endpoint blocked outbound message");
        let mut endpoint_refresh_attempt = super::ProductionOnionOutboundEnvelopeSendAttemptResult {
            next_blocker: "stored remote endpoint refresh required".to_string(),
            blockers: vec!["stored remote endpoint refresh required".to_string()],
            send_attempt_started: true,
            send_attempt_succeeded: false,
            peer_endpoint_failure_recorded: false,
            peer_endpoint_refresh_recommended: false,
            retry_recommended_after_endpoint_refresh: false,
            ..blocked_attempt
        };
        super::apply_peer_endpoint_send_failure_result(
            &mut endpoint_refresh_attempt,
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            endpoint_blocked_outbound.selected_message_number,
        );
        super::apply_outbound_message_send_attempt_result(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            endpoint_blocked_outbound.selected_message_number,
            &endpoint_refresh_attempt,
        );
        assert!(endpoint_refresh_attempt.peer_endpoint_failure_recorded);
        assert!(endpoint_refresh_attempt.peer_endpoint_refresh_recommended);
        assert!(endpoint_refresh_attempt.retry_recommended_after_endpoint_refresh);
        let endpoint_refresh_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("endpoint refresh status");
        let endpoint_sender_is_a = endpoint_refresh_status.profile_a == roundtrip.sender_profile;
        assert!(if endpoint_sender_is_a {
            endpoint_refresh_status.profile_a_remote_endpoint_marked_stale
        } else {
            endpoint_refresh_status.profile_b_remote_endpoint_marked_stale
        });
        assert_eq!(
            if endpoint_sender_is_a {
                endpoint_refresh_status.profile_a_remote_endpoint_last_failed_message_number
            } else {
                endpoint_refresh_status.profile_b_remote_endpoint_last_failed_message_number
            },
            Some(endpoint_blocked_outbound.selected_message_number)
        );

        let missing_endpoint_outbound = run_production_message_envelope_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            0,
            true,
            "retry after missing endpoint".to_string(),
            604_800,
        )
        .expect("missing endpoint outbound message");
        super::run_production_message_outbound_mark_send_failed(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
            missing_endpoint_outbound.selected_message_number,
            "peer-endpoint-missing".to_string(),
        )
        .expect("mark missing endpoint failure");
        let missing_endpoint_transcript = run_production_message_transcript_export(
            &root,
            roundtrip.sender_profile.clone(),
            "correct-passphrase".to_string(),
        )
        .expect("missing endpoint transcript");
        let missing_endpoint_entry = missing_endpoint_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == missing_endpoint_outbound.selected_message_number)
            .expect("missing endpoint entry");
        assert_eq!(
            missing_endpoint_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert_eq!(
            missing_endpoint_entry.outbound_failure_kind.as_deref(),
            Some("peer-endpoint-missing")
        );
        assert!(missing_endpoint_entry.outbound_retryable);

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_message_sanitizers_reject_empty_or_wrong_payloads() {
        assert_eq!(
            sanitize_production_message_text(" hello ".to_string()).expect("message"),
            b"hello"
        );
        assert!(sanitize_production_message_text(" ".to_string()).is_err());
        assert_eq!(
            sanitize_envelope_payload(" ADENV1|abc ".to_string()).expect("envelope"),
            "ADENV1|abc"
        );
        assert!(sanitize_envelope_payload("ADENV2|abc".to_string()).is_err());
        assert!(sanitize_envelope_payload("ADENV1|abc\nADENV1|def".to_string()).is_err());
    }

    #[test]
    fn production_message_envelope_commands_use_persistent_transport_without_returning_plaintext() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for profile in ["alice", "bob"] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
        }
        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;
        run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload.clone(),
            bob_payload.clone(),
            true,
        )
        .expect("alice draft");
        run_production_pairing_session_draft_save(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            bob_payload,
            alice_payload,
            true,
        )
        .expect("bob draft");

        let alice_init = run_production_handshake_init_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("alice init");
        let (initiator, responder, init_payload) = if alice_init.output_payload_created {
            ("alice", "bob", alice_init.output_payload)
        } else {
            let bob_init = run_production_handshake_init_export(
                &root,
                "bob".to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("bob init");
            ("bob", "alice", bob_init.output_payload)
        };
        let reply = run_production_handshake_reply_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            init_payload,
        )
        .expect("reply");
        let finish = run_production_handshake_finish_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            reply.output_payload,
        )
        .expect("finish");
        run_production_handshake_finish_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            finish.output_payload,
        )
        .expect("finish import");
        let ready_state = run_production_session_state_check(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("ready state");
        assert!(ready_state.session_transport_state_present);
        assert!(ready_state.runtime_material_reconstructable);
        assert!(ready_state.outbound_envelope_io_ready);
        assert!(ready_state.ready_for_message_envelope);
        assert!(!ready_state.key_material_exposed);
        assert!(!ready_state.transport_io_opened);
        assert!(!ready_state.runtime_messaging_enabled);

        let outbound = run_production_message_envelope_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            0,
            true,
            "persistent hello".to_string(),
            86_400,
        )
        .expect("outbound");
        assert_eq!(outbound.selected_message_number, 1);
        assert_eq!(outbound.message_ttl_seconds, 86_400);
        assert!(outbound.auto_message_number);
        assert!(outbound.auto_counter_written);
        assert!(!outbound.existing_message_slot_skipped);
        assert!(outbound.storage_opened);
        assert!(outbound.runtime_material_reconstructable);
        assert!(outbound.message_number_reserved);
        assert!(outbound.pending_message_record_written);
        assert!(outbound.session_transport_ready);
        assert!(outbound.encrypted_envelope_written);
        assert!(outbound.encrypted_envelope_present);
        assert!(outbound.envelope_payload.starts_with("ADENV1|"));
        assert!(!outbound.plaintext_returned);
        assert!(!outbound.key_material_exposed);
        assert!(!outbound.network_send_attempted);
        assert!(!outbound.transport_io_opened);
        assert!(!outbound.runtime_messaging_enabled);

        let inbound = run_production_message_envelope_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            outbound.selected_message_number,
            outbound.envelope_payload,
            86_400,
        )
        .expect("inbound");
        assert!(inbound.storage_opened);
        assert!(inbound.runtime_material_reconstructable);
        assert!(inbound.envelope_read);
        assert!(inbound.envelope_decodable);
        assert!(inbound.session_transport_ready);
        assert!(inbound.replay_accepted);
        assert!(inbound.plaintext_decrypted);
        assert!(inbound.received_message_written);
        assert!(inbound.replay_window_committed);
        assert!(inbound.received_message_matches_session);
        assert!(!inbound.plaintext_returned);
        assert!(!inbound.key_material_exposed);
        assert!(!inbound.network_receive_attempted);
        assert!(!inbound.transport_io_opened);
        assert!(!inbound.runtime_messaging_enabled);

        let received = run_production_message_received_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            outbound.selected_message_number,
        )
        .expect("received export");
        assert!(received.storage_opened);
        assert!(received.runtime_material_reconstructable);
        assert!(received.received_message_record_present);
        assert!(received.received_message_record_decodable);
        assert!(received.received_message_matches_session);
        assert_eq!(received.received_message, "persistent hello");
        assert!(received.created_at_ms > 0);
        assert_eq!(received.message_ttl_seconds, 86_400);
        assert!(received.expires_at_ms.is_some());
        assert!(!received.expired);
        assert!(received.plaintext_returned_after_unlock);
        assert!(!received.key_material_exposed);
        assert!(!received.network_receive_attempted);
        assert!(!received.transport_io_opened);
        assert!(!received.runtime_messaging_enabled);

        let endpoint_update = run_production_endpoint_update_control_envelope_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            2,
            format!("{initiator}-rotated.onion"),
        )
        .expect("endpoint update export");
        assert_eq!(endpoint_update.selected_message_number, 2);
        assert!(endpoint_update.storage_opened);
        assert!(endpoint_update.runtime_material_reconstructable);
        assert!(endpoint_update.session_transport_ready);
        assert!(endpoint_update.endpoint_update_created);
        assert!(endpoint_update.encrypted_control_envelope_written);
        assert!(endpoint_update.envelope_decodable);
        assert!(endpoint_update.envelope_message_number_matches);
        assert!(endpoint_update.envelope_message_type_control);
        assert!(endpoint_update.envelope_payload.starts_with("ADENV1|"));
        assert!(!endpoint_update.envelope_payload.contains("rotated.onion"));
        assert!(!endpoint_update.endpoint_payload_returned);
        assert!(!endpoint_update.endpoint_plaintext_exposed);
        assert!(!endpoint_update.key_material_exposed);
        assert!(!endpoint_update.network_send_attempted);
        assert!(!endpoint_update.transport_io_opened);
        assert!(!endpoint_update.runtime_messaging_enabled);

        run_production_pairing_session_remote_endpoint_mark_send_failure(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            2,
        )
        .expect("mark responder endpoint stale");
        let endpoint_import = run_production_endpoint_update_control_envelope_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            endpoint_update.envelope_payload.clone(),
        )
        .expect("endpoint update import");
        assert!(endpoint_import.storage_opened);
        assert!(endpoint_import.runtime_material_reconstructable);
        assert!(endpoint_import.envelope_read);
        assert!(endpoint_import.envelope_decodable);
        assert!(endpoint_import.envelope_message_type_control);
        assert!(endpoint_import.session_transport_ready);
        assert!(endpoint_import.replay_window_loaded);
        assert!(endpoint_import.replay_accepted);
        assert!(endpoint_import.control_plaintext_decrypted);
        assert!(endpoint_import.endpoint_update_applied);
        assert!(endpoint_import.remote_endpoint_state_written);
        assert!(endpoint_import.stale_endpoint_status_cleared);
        assert!(!endpoint_import.endpoint_payload_returned);
        assert!(!endpoint_import.endpoint_plaintext_exposed);
        assert!(!endpoint_import.key_material_exposed);
        assert!(!endpoint_import.network_receive_attempted);
        assert!(!endpoint_import.transport_io_opened);
        assert!(!endpoint_import.runtime_messaging_enabled);
        let endpoint_status = run_production_two_profile_session_status(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("endpoint status after control import");
        if responder == "alice" {
            assert!(!endpoint_status.profile_a_remote_endpoint_marked_stale);
        } else {
            assert!(!endpoint_status.profile_b_remote_endpoint_marked_stale);
        }
        let serialized_endpoint_update =
            serde_json::to_string(&endpoint_import).expect("serialize endpoint import");
        assert!(!serialized_endpoint_update.contains("rotated.onion"));
        assert!(!serialized_endpoint_update.contains("correct-passphrase"));
        assert!(!serialized_endpoint_update.contains("/tmp"));

        let sender_transcript = run_production_message_transcript_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("sender transcript");
        assert!(sender_transcript.storage_opened);
        assert!(sender_transcript.runtime_material_reconstructable);
        assert_eq!(sender_transcript.entries.len(), 1);
        assert_eq!(sender_transcript.expired_messages_purged, 0);
        assert_eq!(sender_transcript.entries[0].direction, "sent");
        assert_eq!(sender_transcript.entries[0].message_number, 1);
        assert_eq!(sender_transcript.entries[0].message, "persistent hello");
        assert!(sender_transcript.entries[0].created_at_ms > 0);
        assert_eq!(sender_transcript.entries[0].ttl_seconds, 86_400);
        assert!(sender_transcript.entries[0].expires_at_ms.is_some());
        assert!(!sender_transcript.entries[0].expired);
        assert!(sender_transcript
            .transcript_tsv
            .starts_with("direction\tmessage_number\tcreated_at_ms\tttl_seconds\texpires_at_ms\tmessage\n"));
        assert!(sender_transcript.transcript_tsv.contains("sent\t1\t"));
        assert!(sender_transcript
            .transcript_tsv
            .contains("persistent hello\n"));
        assert!(sender_transcript.plaintext_returned_after_unlock);
        assert!(!sender_transcript.key_material_exposed);
        assert!(!sender_transcript.network_io_attempted);
        assert!(!sender_transcript.transport_io_opened);
        assert!(!sender_transcript.runtime_messaging_enabled);
        let receiver_transcript = run_production_message_transcript_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("receiver transcript");
        assert!(receiver_transcript.storage_opened);
        assert!(receiver_transcript.runtime_material_reconstructable);
        assert_eq!(receiver_transcript.entries.len(), 1);
        assert_eq!(receiver_transcript.expired_messages_purged, 0);
        assert_eq!(receiver_transcript.entries[0].direction, "received");
        assert_eq!(receiver_transcript.entries[0].message_number, 1);
        assert_eq!(receiver_transcript.entries[0].message, "persistent hello");
        assert!(receiver_transcript.entries[0].created_at_ms > 0);
        assert_eq!(receiver_transcript.entries[0].ttl_seconds, 86_400);
        assert!(receiver_transcript.entries[0].expires_at_ms.is_some());
        assert!(!receiver_transcript.entries[0].expired);
        assert!(receiver_transcript
            .transcript_tsv
            .contains("received\t1\t"));
        assert!(receiver_transcript
            .transcript_tsv
            .contains("persistent hello\n"));
        assert!(receiver_transcript.plaintext_returned_after_unlock);
        assert!(!receiver_transcript.key_material_exposed);
        assert!(!receiver_transcript.network_io_attempted);
        assert!(!receiver_transcript.transport_io_opened);
        assert!(!receiver_transcript.runtime_messaging_enabled);

        let reply_outbound = run_production_message_envelope_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            0,
            true,
            "manual reply after import".to_string(),
            604_800,
        )
        .expect("reply outbound");
        assert_eq!(reply_outbound.message_ttl_seconds, 604_800);
        assert!(reply_outbound.auto_message_number);
        assert!(reply_outbound.message_number_reserved);
        assert!(reply_outbound.encrypted_envelope_written);
        assert!(reply_outbound.encrypted_envelope_present);
        assert!(reply_outbound.envelope_payload.starts_with("ADENV1|"));
        assert!(!reply_outbound.plaintext_returned);
        assert!(!reply_outbound.key_material_exposed);
        assert!(!reply_outbound.network_send_attempted);
        assert!(!reply_outbound.transport_io_opened);
        assert!(!reply_outbound.runtime_messaging_enabled);

        let reply_inbound = run_production_message_envelope_import(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            reply_outbound.selected_message_number,
            reply_outbound.envelope_payload,
            604_800,
        )
        .expect("reply inbound");
        assert!(reply_inbound.envelope_read);
        assert!(reply_inbound.envelope_decodable);
        assert!(reply_inbound.session_transport_ready);
        assert!(reply_inbound.replay_accepted);
        assert!(reply_inbound.plaintext_decrypted);
        assert!(reply_inbound.received_message_written);
        assert!(reply_inbound.received_message_matches_session);
        assert!(!reply_inbound.plaintext_returned);
        assert!(!reply_inbound.key_material_exposed);
        assert!(!reply_inbound.network_receive_attempted);
        assert!(!reply_inbound.transport_io_opened);
        assert!(!reply_inbound.runtime_messaging_enabled);

        let reply_received = run_production_message_received_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            reply_outbound.selected_message_number,
        )
        .expect("reply received export");
        assert_eq!(reply_received.received_message, "manual reply after import");
        assert!(reply_received.received_message_matches_session);
        assert!(reply_received.plaintext_returned_after_unlock);
        assert!(!reply_received.key_material_exposed);
        assert!(!reply_received.network_receive_attempted);
        assert!(!reply_received.transport_io_opened);
        assert!(!reply_received.runtime_messaging_enabled);

        let initiator_reply_transcript = run_production_message_transcript_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("initiator transcript after reply");
        assert!(initiator_reply_transcript.entries.iter().any(|entry| {
            entry.direction == "received"
                && entry.message_number == reply_outbound.selected_message_number
                && entry.message == "manual reply after import"
        }));
        assert!(initiator_reply_transcript.plaintext_returned_after_unlock);
        assert!(!initiator_reply_transcript.key_material_exposed);
        assert!(!initiator_reply_transcript.network_io_attempted);
        assert!(!initiator_reply_transcript.transport_io_opened);
        assert!(!initiator_reply_transcript.runtime_messaging_enabled);

        let responder_reply_transcript = run_production_message_transcript_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("responder transcript after reply");
        assert!(responder_reply_transcript.entries.iter().any(|entry| {
            entry.direction == "sent"
                && entry.message_number == reply_outbound.selected_message_number
                && entry.message == "manual reply after import"
        }));
        assert!(responder_reply_transcript.plaintext_returned_after_unlock);
        assert!(!responder_reply_transcript.key_material_exposed);
        assert!(!responder_reply_transcript.network_io_attempted);
        assert!(!responder_reply_transcript.transport_io_opened);
        assert!(!responder_reply_transcript.runtime_messaging_enabled);

        let cancel_outbound = run_production_message_envelope_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            0,
            true,
            "cancel before retry".to_string(),
            604_800,
        )
        .expect("cancel outbound");
        run_production_message_outbound_cancel_pending(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            cancel_outbound.selected_message_number,
        )
        .expect("cancel pending outbound");
        let canceled_transcript = run_production_message_transcript_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("canceled transcript");
        let canceled_entry = canceled_transcript
            .entries
            .iter()
            .find(|entry| {
                entry.direction == "sent"
                    && entry.message_number == cancel_outbound.selected_message_number
                    && entry.message == "cancel before retry"
            })
            .expect("canceled transcript entry");
        assert_eq!(
            canceled_entry.outbound_delivery_state.as_deref(),
            Some("canceled")
        );
        assert!(!canceled_entry.outbound_retryable);
        assert_eq!(canceled_entry.outbound_failure_kind, None);

        let serialized = serde_json::to_string(&inbound).expect("serialize inbound");
        assert!(!serialized.contains("persistent hello"));
        assert!(!serialized.contains("ADENV1"));
        assert!(!serialized.contains("correct-passphrase"));
        let serialized_reply_inbound =
            serde_json::to_string(&reply_inbound).expect("serialize reply inbound");
        assert!(!serialized_reply_inbound.contains("manual reply after import"));
        assert!(!serialized_reply_inbound.contains("ADENV1"));
        assert!(!serialized_reply_inbound.contains("correct-passphrase"));
        let serialized_received = serde_json::to_string(&received).expect("serialize received");
        assert!(serialized_received.contains("persistent hello"));
        assert!(!serialized_received.contains("ADENV1"));
        assert!(!serialized_received.contains("correct-passphrase"));
        let serialized_reply_received =
            serde_json::to_string(&reply_received).expect("serialize reply received");
        assert!(serialized_reply_received.contains("manual reply after import"));
        assert!(!serialized_reply_received.contains("ADENV1"));
        assert!(!serialized_reply_received.contains("correct-passphrase"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_roundtrip_uses_core_without_returning_plaintext() {
        let result = run_production_local_roundtrip("tauri production bridge".to_string())
            .expect("production roundtrip");

        assert!(result.profile_stores_opened);
        assert!(result.identities_created);
        assert!(result.pairing_payloads_created);
        assert!(result.session_drafts_written);
        assert!(result.transport_state_persisted);
        assert!(result.outbound_message_prepared);
        assert!(result.encrypted_envelope_exported);
        assert!(result.inbound_message_stored);
        assert!(result.received_status_verified);
        assert!(result.received_export_matches_input);
        assert!(!result.plaintext_returned_to_frontend);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("tauri production bridge"));
        assert!(!serialized.contains("alice"));
        assert!(!serialized.contains("bob"));
        assert!(!serialized.contains("ADENV1"));
    }

    #[test]
    fn production_two_profile_roundtrip_uses_app_data_profiles_without_returning_plaintext() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let setup = run_production_two_profile_room_setup(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("room setup");
        assert!(setup.profile_a_unlocked);
        assert!(setup.profile_b_unlocked);
        assert!(setup.pairing_payloads_exported);
        assert!(setup.session_drafts_saved);
        assert!(setup.handshake_completed);
        assert!(setup.profile_a_ready_for_message_envelope);
        assert!(setup.profile_b_ready_for_message_envelope);
        assert!(setup.both_ready_for_message_envelope);
        assert!(!setup.plaintext_returned_to_frontend);
        assert!(!setup.store_path_returned);
        assert!(!setup.passphrase_retained);
        assert!(!setup.key_material_exposed);
        assert!(!setup.network_io_attempted);
        assert!(!setup.transport_io_opened);
        assert!(!setup.runtime_messaging_enabled);
        let empty_transcript = run_production_message_transcript_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("empty transcript after setup");
        assert!(empty_transcript.entries.is_empty());

        let result = run_production_two_profile_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "two profile hello".to_string(),
            86_400,
        )
        .expect("two-profile roundtrip");

        assert!(result.profile_a_unlocked);
        assert!(result.profile_b_unlocked);
        assert!(result.pairing_payloads_exported);
        assert!(result.session_drafts_saved);
        assert!(result.handshake_completed);
        assert!(result.sender_session_ready);
        assert!(result.receiver_session_ready);
        assert_ne!(result.sender_profile, result.receiver_profile);
        assert!(["alice", "bob"].contains(&result.sender_profile.as_str()));
        assert!(["alice", "bob"].contains(&result.receiver_profile.as_str()));
        assert_eq!(result.message_number, 1);
        assert_eq!(result.message_ttl_seconds, 86_400);
        assert!(result.message_number_reserved);
        assert!(result.encrypted_envelope_exported);
        assert!(result.inbound_message_stored);
        assert!(result.received_status_verified);
        assert!(result.received_export_matches_input);
        assert!(!result.plaintext_returned_to_frontend);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&result).expect("serialize");
        assert!(!serialized.contains("two profile hello"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("ADENV1"));
        assert!(!serialized.contains("ADPAIR2"));

        let repeated = run_production_two_profile_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "two profile hello again".to_string(),
            604_800,
        )
        .expect("repeat two-profile roundtrip");
        assert!(repeated.received_export_matches_input);
        assert!(!repeated.key_material_exposed);
        assert!(!repeated.network_io_attempted);
        assert!(!repeated.transport_io_opened);

        let stored_message = run_production_two_profile_message_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "stored session hello".to_string(),
            86_400,
        )
        .expect("stored-session message roundtrip");
        assert_ne!(stored_message.sender_profile, stored_message.receiver_profile);
        assert!(["alice", "bob"].contains(&stored_message.sender_profile.as_str()));
        assert!(["alice", "bob"].contains(&stored_message.receiver_profile.as_str()));
        assert!(stored_message.message_number >= 1);
        assert!(stored_message.sender_session_ready);
        assert!(stored_message.receiver_session_ready);
        assert!(stored_message.message_number_reserved);
        assert!(stored_message.encrypted_envelope_exported);
        assert!(stored_message.inbound_message_stored);
        assert!(stored_message.received_status_verified);
        assert!(stored_message.received_export_matches_input);
        assert_eq!(stored_message.message_ttl_seconds, 86_400);
        assert!(!stored_message.plaintext_returned_to_frontend);
        assert!(!stored_message.store_path_returned);
        assert!(!stored_message.passphrase_retained);
        assert!(!stored_message.key_material_exposed);
        assert!(!stored_message.network_io_attempted);
        assert!(!stored_message.transport_io_opened);
        assert!(!stored_message.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&stored_message).expect("serialize stored message");
        assert!(!serialized.contains("stored session hello"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("ADENV1"));

        let reply_message = run_production_two_profile_message_roundtrip(
            &root,
            "bob".to_string(),
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "stored session reply".to_string(),
            604_800,
        )
        .expect("stored-session reply roundtrip");
        assert_eq!(reply_message.sender_profile, "bob");
        assert_eq!(reply_message.receiver_profile, "alice");
        assert!(reply_message.message_number >= 1);
        assert!(reply_message.sender_session_ready);
        assert!(reply_message.receiver_session_ready);
        assert!(reply_message.message_number_reserved);
        assert!(reply_message.encrypted_envelope_exported);
        assert!(reply_message.inbound_message_stored);
        assert!(reply_message.received_status_verified);
        assert!(reply_message.received_export_matches_input);
        assert_eq!(reply_message.message_ttl_seconds, 604_800);
        assert!(!reply_message.plaintext_returned_to_frontend);
        assert!(!reply_message.key_material_exposed);
        assert!(!reply_message.network_io_attempted);
        assert!(!reply_message.transport_io_opened);
        assert!(!reply_message.runtime_messaging_enabled);

        let second_reply = run_production_two_profile_message_roundtrip(
            &root,
            "alice".to_string(),
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "second stored reply".to_string(),
            86_400,
        )
        .expect("second stored-session reply roundtrip");
        assert_eq!(second_reply.sender_profile, "alice");
        assert_eq!(second_reply.receiver_profile, "bob");
        assert!(second_reply.message_number > stored_message.message_number);
        assert!(second_reply.sender_session_ready);
        assert!(second_reply.receiver_session_ready);
        assert!(second_reply.message_number_reserved);
        assert!(second_reply.encrypted_envelope_exported);
        assert!(second_reply.inbound_message_stored);
        assert!(second_reply.received_status_verified);
        assert!(second_reply.received_export_matches_input);
        assert_eq!(second_reply.message_ttl_seconds, 86_400);
        assert!(!second_reply.plaintext_returned_to_frontend);
        assert!(!second_reply.store_path_returned);
        assert!(!second_reply.passphrase_retained);
        assert!(!second_reply.key_material_exposed);
        assert!(!second_reply.network_io_attempted);
        assert!(!second_reply.transport_io_opened);
        assert!(!second_reply.runtime_messaging_enabled);
        let serialized = serde_json::to_string(&second_reply).expect("serialize second reply");
        assert!(!serialized.contains("second stored reply"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("ADENV1"));

        let alice_transcript = run_production_message_transcript_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("alice transcript after reply loop");
        assert!(alice_transcript.entries.iter().any(|entry| {
            entry.direction == "received"
                && entry.message_number == reply_message.message_number
                && entry.message == "stored session reply"
        }));
        assert!(alice_transcript.entries.iter().any(|entry| {
            entry.direction == "sent"
                && entry.message_number == second_reply.message_number
                && entry.message == "second stored reply"
        }));

        let bob_transcript = run_production_message_transcript_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("bob transcript after reply loop");
        assert!(bob_transcript.entries.iter().any(|entry| {
            entry.direction == "sent"
                && entry.message_number == reply_message.message_number
                && entry.message == "stored session reply"
        }));
        assert!(bob_transcript.entries.iter().any(|entry| {
            entry.direction == "received"
                && entry.message_number == second_reply.message_number
                && entry.message == "second stored reply"
        }));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_two_profile_room_setup_accepts_invite_derived_profiles() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let setup = run_production_two_profile_room_setup(
            &root,
            "inviter-abcd-2345".to_string(),
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived room setup");

        assert_eq!(setup.profile_a, "inviter-abcd-2345");
        assert_eq!(setup.profile_b, "joiner-abcd-2345");
        assert!(setup.profile_a_unlocked);
        assert!(setup.profile_b_unlocked);
        assert!(setup.pairing_payloads_exported);
        assert!(setup.session_drafts_saved);
        assert!(setup.handshake_completed);
        assert!(setup.profile_a_ready_for_message_envelope);
        assert!(setup.profile_b_ready_for_message_envelope);
        assert!(setup.both_ready_for_message_envelope);
        assert!(!setup.plaintext_returned_to_frontend);
        assert!(!setup.store_path_returned);
        assert!(!setup.passphrase_retained);
        assert!(!setup.key_material_exposed);
        assert!(!setup.network_io_attempted);
        assert!(!setup.transport_io_opened);
        assert!(!setup.runtime_messaging_enabled);

        let status = run_production_two_profile_session_status(
            &root,
            "inviter-abcd-2345".to_string(),
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived status");
        assert!(status.both_ready_for_message_envelope);
        assert!(status.profile_a_remote_endpoint_state_present);
        assert!(status.profile_b_remote_endpoint_state_present);
        assert!(status.profile_a_remote_endpoint_invite_placeholder);
        assert!(status.profile_b_remote_endpoint_invite_placeholder);

        let transcript = run_production_message_transcript_export(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived transcript");
        assert!(transcript.entries.is_empty());
        assert_eq!(transcript.expired_messages_purged, 0);

        let outbound = run_production_message_envelope_export(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
            0,
            true,
            "invite flow pending send".to_string(),
            86_400,
        )
        .expect("invite-derived outbound");
        assert!(outbound.message_number_reserved);
        assert!(outbound.pending_message_record_written);
        assert!(outbound.encrypted_envelope_present);
        assert!(!outbound.plaintext_returned);
        assert!(!outbound.network_send_attempted);

        let inbound = run_production_message_envelope_import(
            &root,
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
            outbound.selected_message_number,
            outbound.envelope_payload.clone(),
            86_400,
        )
        .expect("invite-derived inbound import");
        assert!(inbound.received_message_written);
        assert!(inbound.received_message_record_present);
        assert!(inbound.received_message_record_decodable);
        assert!(inbound.received_message_matches_session);
        assert!(!inbound.plaintext_returned);
        assert!(!inbound.network_receive_attempted);
        assert!(!inbound.transport_io_opened);
        assert!(!inbound.runtime_messaging_enabled);
        let receiver_transcript = run_production_message_transcript_export(
            &root,
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived receiver transcript");
        let received_entry = receiver_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("invite-derived received entry");
        assert_eq!(received_entry.direction, "received");
        assert_eq!(received_entry.message, "invite flow pending send");
        assert_eq!(received_entry.ttl_seconds, 86_400);
        assert!(!received_entry.expired);

        super::run_production_message_outbound_mark_send_failed(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
            outbound.selected_message_number,
            "peer-endpoint-missing".to_string(),
        )
        .expect("mark invite-derived send failed");
        let failed_transcript = run_production_message_transcript_export(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived failed transcript");
        let failed_entry = failed_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("failed invite-derived entry");
        assert_eq!(failed_entry.direction, "sent");
        assert_eq!(
            failed_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert_eq!(
            failed_entry.outbound_failure_kind.as_deref(),
            Some("peer-endpoint-missing")
        );
        assert!(failed_entry.outbound_retryable);

        let resumed_status = run_production_two_profile_session_status(
            &root,
            "inviter-abcd-2345".to_string(),
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived resumed status");
        assert!(resumed_status.both_ready_for_message_envelope);
        let resumed_failed_transcript = run_production_message_transcript_export(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived resumed failed transcript");
        assert_eq!(resumed_failed_transcript.expired_messages_purged, 0);
        let resumed_failed_entry = resumed_failed_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("resumed failed invite-derived entry");
        assert_eq!(resumed_failed_entry.direction, "sent");
        assert_eq!(
            resumed_failed_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert_eq!(
            resumed_failed_entry.outbound_failure_kind.as_deref(),
            Some("peer-endpoint-missing")
        );
        assert!(resumed_failed_entry.outbound_retryable);
        let resumed_receiver_transcript = run_production_message_transcript_export(
            &root,
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived resumed receiver transcript");
        assert!(resumed_receiver_transcript.entries.iter().any(|entry| {
            entry.direction == "received"
                && entry.message_number == outbound.selected_message_number
                && entry.message == "invite flow pending send"
        }));

        let route_update = run_production_pairing_session_remote_endpoint_update(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
            "joiner-route.onion".to_string(),
        )
        .expect("save invite-derived peer route code");
        assert!(route_update.remote_endpoint_state_written);
        assert!(route_update.update_channel_existing_encrypted_session);
        assert!(!route_update.remote_endpoint_returned);
        assert!(!route_update.network_io_attempted);
        assert!(!route_update.transport_io_opened);
        let route_status = run_production_two_profile_session_status(
            &root,
            "inviter-abcd-2345".to_string(),
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived route status");
        assert!(route_status.both_ready_for_message_envelope);
        assert!(route_status.profile_a_remote_endpoint_state_present);
        assert!(!route_status.profile_a_remote_endpoint_invite_placeholder);
        assert!(!route_status.profile_a_remote_endpoint_marked_stale);
        assert!(!route_status.profile_a_remote_endpoint_refresh_recommended);
        assert_eq!(
            route_status.profile_a_remote_endpoint_last_failed_message_number,
            None
        );
        let route_for_transport =
            super::run_production_pairing_session_remote_endpoint_for_transport(
                &root,
                "inviter-abcd-2345".to_string(),
                "shared-invite-passphrase".to_string(),
            )
            .expect("invite-derived route for retry");
        assert_eq!(route_for_transport, "joiner-route.onion");
        let retryable_after_route = run_production_message_transcript_export(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived retryable transcript after route");
        let retryable_entry = retryable_after_route
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("retryable invite-derived entry after route");
        assert_eq!(
            retryable_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert!(retryable_entry.outbound_retryable);

        run_production_message_outbound_cancel_pending(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
            outbound.selected_message_number,
        )
        .expect("cancel invite-derived failed send");
        let canceled_transcript = run_production_message_transcript_export(
            &root,
            "inviter-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived canceled transcript");
        let canceled_entry = canceled_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("canceled invite-derived entry");
        assert_eq!(
            canceled_entry.outbound_delivery_state.as_deref(),
            Some("canceled")
        );
        assert_eq!(canceled_entry.outbound_failure_kind, None);
        assert!(!canceled_entry.outbound_retryable);
        let canceled_status = run_production_two_profile_session_status(
            &root,
            "inviter-abcd-2345".to_string(),
            "joiner-abcd-2345".to_string(),
            "shared-invite-passphrase".to_string(),
        )
        .expect("invite-derived canceled status");
        assert!(canceled_status.both_ready_for_message_envelope);
        assert!(!canceled_status.profile_a_remote_endpoint_marked_stale);
        assert_eq!(
            canceled_status.profile_a_remote_endpoint_last_failed_message_number,
            None
        );
        #[cfg(all(target_os = "macos", feature = "manual-onion-client-attempt"))]
        {
            let cache_root = root.join("cache");
            let backup = run_production_onion_backup_exclusion_prepare(&root, &cache_root);
            assert!(backup.backup_exclusion_verified);
            let key_record = run_production_onion_key_record_prepare(
                &root,
                &cache_root,
                "inviter-abcd-2345".to_string(),
                "shared-invite-passphrase".to_string(),
            )
            .expect("invite-derived key record prepare");
            assert!(key_record.key_material_ready);

            let canceled_send_prepare =
                super::run_production_onion_outbound_envelope_send_prepare(
                    &root,
                    &cache_root,
                    "inviter-abcd-2345".to_string(),
                    "shared-invite-passphrase".to_string(),
                    "joiner-abcd-2345.onion".to_string(),
                    outbound.selected_message_number,
                    true,
                )
                .expect("canceled send prepare");
            assert!(
                canceled_send_prepare.remote_peer_authentication_ready,
                "next_blocker={}; blockers={:?}",
                canceled_send_prepare.next_blocker,
                canceled_send_prepare.blockers
            );
            assert!(canceled_send_prepare.bound_stream_session_ready);
            assert!(canceled_send_prepare.outbound_envelope_io_boundary_ready);
            assert!(!canceled_send_prepare.stored_outbound_envelope_ready);
            assert!(!canceled_send_prepare.send_intent_prepared);
            assert!(!canceled_send_prepare.ack_wait_registered);
            assert_eq!(
                canceled_send_prepare.next_blocker,
                "StoredOutboundEnvelopeRequired"
            );
            assert!(canceled_send_prepare
                .blockers
                .contains(&"StoredOutboundEnvelopeRequired".to_string()));
            assert!(canceled_send_prepare.event_summary.is_empty());
            assert!(!canceled_send_prepare.raw_endpoint_returned);
            assert!(!canceled_send_prepare.raw_path_returned);
            assert!(!canceled_send_prepare.envelope_payload_returned);
            assert!(!canceled_send_prepare.key_material_exposed);
            assert!(!canceled_send_prepare.network_io_attempted);
            assert!(!canceled_send_prepare.stream_accept_attempted);
            assert!(!canceled_send_prepare.stream_dial_attempted);
            assert!(!canceled_send_prepare.stream_read_write_attempted);
            assert!(!canceled_send_prepare.stream_send_attempted);
            assert!(!canceled_send_prepare.envelope_io_opened);
            assert!(!canceled_send_prepare.runtime_messaging_enabled);
        }

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_two_profile_room_setup_accepts_generated_invite_code_charset() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let invite_code = "Aa0Bb1Cc2Dd3Ee4Ff5Gg6Hh7Ii8!$%^*";
        let setup = run_production_two_profile_room_setup(
            &root,
            "inviter-aa0bb1cc2dd3ee4ff5gg6hh7-0000000".to_string(),
            "joiner-aa0bb1cc2dd3ee4ff5gg6hh7-0000000".to_string(),
            invite_code.to_string(),
        )
        .expect("generated invite code charset room setup");

        assert!(setup.both_ready_for_message_envelope);
        assert!(setup.profile_a_unlocked);
        assert!(setup.profile_b_unlocked);
        assert!(!setup.key_material_exposed);
        assert!(!setup.network_io_attempted);

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn dev_invite_room_token_stays_open_after_join_and_presence_refresh() {
        let _guard = DEV_RENDEZVOUS_ENV_LOCK.lock().expect("dev rendezvous env lock");
        let previous = std::env::var_os("ANOTHER_DIMENSION_DEV_RENDEZVOUS_DIR");
        let root = unique_production_roundtrip_dir().expect("temp root");
        std::env::set_var("ANOTHER_DIMENSION_DEV_RENDEZVOUS_DIR", &root);

        let token = "active-room-token";
        super::register_dev_invite_room(token, "inviter-active-room", "joiner-active-room")
            .expect("register active room");
        let opened = super::ensure_dev_invite_room_open(token).expect("room open");
        super::note_dev_invite_room_join(token, opened).expect("join noted without closing room");

        let still_open = super::ensure_dev_invite_room_open(token).expect("room still open");
        assert!(!still_open.consumed);

        let now = super::now_unix_ms();
        super::write_dev_invite_room_record(
            token,
            &super::DevInviteRoomRecord {
                inviter_profile: "inviter-active-room".to_string(),
                peer_profile: "joiner-active-room".to_string(),
                created_at_ms: now,
                last_seen_at_ms: now,
                expires_at_ms: now + 1,
                consumed: true,
            },
        )
        .expect("write legacy consumed room");

        let refreshed = super::production_invite_room_presence_refresh(
            "inviter-active-room".to_string(),
            "joiner-active-room".to_string(),
            token.to_string(),
        )
        .expect("presence refresh reopens room");
        assert!(refreshed.open);
        assert!(refreshed.expires_at_ms > now);

        let reopened = super::ensure_dev_invite_room_open(token).expect("room reopened");
        assert!(!reopened.consumed);

        if let Some(previous) = previous {
            std::env::set_var("ANOTHER_DIMENSION_DEV_RENDEZVOUS_DIR", previous);
        } else {
            std::env::remove_var("ANOTHER_DIMENSION_DEV_RENDEZVOUS_DIR");
        }
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_isolated_invite_roots_exchange_payloads_without_peer_private_profile() {
        let root_a = unique_production_roundtrip_dir().expect("temp root a");
        let root_b = unique_production_roundtrip_dir().expect("temp root b");
        let passphrase = "shared-invite-passphrase".to_string();
        let inviter = "inviter-abcd-2345".to_string();
        let joiner = "joiner-abcd-2345".to_string();

        run_production_profile_unlock(&root_a, inviter.clone(), passphrase.clone())
            .expect("unlock inviter");
        run_production_profile_unlock(&root_b, joiner.clone(), passphrase.clone())
            .expect("unlock joiner");
        let inviter_profiles = run_production_profile_list(&root_a).expect("list inviter root");
        let joiner_profiles = run_production_profile_list(&root_b).expect("list joiner root");
        assert_eq!(inviter_profiles.profiles, vec![inviter.clone()]);
        assert_eq!(joiner_profiles.profiles, vec![joiner.clone()]);

        let inviter_payload = run_production_pairing_payload_export(
            &root_a,
            inviter.clone(),
            passphrase.clone(),
            "inviter-route.onion".to_string(),
        )
        .expect("inviter payload")
        .pairing_payload;
        let joiner_payload = run_production_pairing_payload_export(
            &root_b,
            joiner.clone(),
            passphrase.clone(),
            "joiner-route.onion".to_string(),
        )
        .expect("joiner payload")
        .pairing_payload;

        run_production_pairing_session_draft_save(
            &root_a,
            inviter.clone(),
            passphrase.clone(),
            inviter_payload.clone(),
            joiner_payload.clone(),
            true,
        )
        .expect("save inviter draft");
        run_production_pairing_session_draft_save(
            &root_b,
            joiner.clone(),
            passphrase.clone(),
            joiner_payload,
            inviter_payload,
            true,
        )
        .expect("save joiner draft");
        assert_eq!(
            run_production_profile_list(&root_a)
                .expect("list inviter root after draft")
                .profiles,
            vec![inviter.clone()]
        );
        assert_eq!(
            run_production_profile_list(&root_b)
                .expect("list joiner root after draft")
                .profiles,
            vec![joiner.clone()]
        );

        let inviter_init =
            run_production_handshake_init_export(&root_a, inviter.clone(), passphrase.clone())
                .expect("inviter init");
        let (initiator_root, initiator_profile, responder_root, responder_profile, init_payload) =
            if inviter_init.output_payload_created {
                (
                    &root_a,
                    inviter.clone(),
                    &root_b,
                    joiner.clone(),
                    inviter_init.output_payload,
                )
            } else {
                let joiner_init =
                    run_production_handshake_init_export(&root_b, joiner.clone(), passphrase.clone())
                        .expect("joiner init");
                assert!(joiner_init.output_payload_created);
                (
                    &root_b,
                    joiner.clone(),
                    &root_a,
                    inviter.clone(),
                    joiner_init.output_payload,
                )
            };
        let reply = run_production_handshake_reply_export(
            responder_root,
            responder_profile.clone(),
            passphrase.clone(),
            init_payload,
        )
        .expect("joiner reply");
        assert!(reply.output_payload_created);
        let finish = run_production_handshake_finish_export(
            initiator_root,
            initiator_profile.clone(),
            passphrase.clone(),
            reply.output_payload,
        )
        .expect("inviter finish");
        assert!(finish.transport_state_persisted);
        let finish_import = run_production_handshake_finish_import(
            responder_root,
            responder_profile.clone(),
            passphrase.clone(),
            finish.output_payload,
        )
        .expect("joiner finish import");
        assert!(finish_import.transport_state_persisted);

        let inviter_state = run_production_session_state_check(
            &root_a,
            inviter.clone(),
            passphrase.clone(),
        )
        .expect("inviter state");
        let joiner_state =
            run_production_session_state_check(&root_b, joiner.clone(), passphrase.clone())
                .expect("joiner state");
        assert!(inviter_state.ready_for_message_envelope);
        assert!(joiner_state.ready_for_message_envelope);

        let outbound = run_production_message_envelope_export(
            initiator_root,
            initiator_profile.clone(),
            passphrase.clone(),
            0,
            true,
            "isolated invite hello".to_string(),
            86_400,
        )
        .expect("isolated outbound");
        assert!(outbound.encrypted_envelope_present);
        let inbound = run_production_message_envelope_import(
            responder_root,
            responder_profile.clone(),
            passphrase.clone(),
            outbound.selected_message_number,
            outbound.envelope_payload,
            86_400,
        )
        .expect("isolated inbound");
        assert!(inbound.received_message_written);
        let receiver_transcript =
            run_production_message_transcript_export(responder_root, responder_profile, passphrase.clone())
                .expect("isolated receiver transcript");
        assert!(receiver_transcript.entries.iter().any(|entry| {
            entry.direction == "received"
                && entry.message_number == outbound.selected_message_number
                && entry.message == "isolated invite hello"
        }));

        super::run_production_message_outbound_mark_send_failed(
            initiator_root,
            initiator_profile.clone(),
            passphrase.clone(),
            outbound.selected_message_number,
            "peer-endpoint-missing".to_string(),
        )
        .expect("mark isolated outbound failed");
        let failed_transcript = run_production_message_transcript_export(
            initiator_root,
            initiator_profile.clone(),
            passphrase.clone(),
        )
        .expect("isolated failed sender transcript");
        let failed_entry = failed_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("isolated failed sender entry");
        assert_eq!(failed_entry.outbound_delivery_state.as_deref(), Some("failed"));
        assert_eq!(
            failed_entry.outbound_failure_kind.as_deref(),
            Some("peer-endpoint-missing")
        );
        assert!(failed_entry.outbound_retryable);

        let resumed_state = run_production_session_state_check(
            initiator_root,
            initiator_profile.clone(),
            passphrase.clone(),
        )
        .expect("isolated sender resumed state");
        assert!(resumed_state.ready_for_message_envelope);
        let resumed_failed_transcript = run_production_message_transcript_export(
            initiator_root,
            initiator_profile.clone(),
            passphrase.clone(),
        )
        .expect("isolated resumed failed sender transcript");
        let resumed_failed_entry = resumed_failed_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("isolated resumed failed sender entry");
        assert_eq!(
            resumed_failed_entry.outbound_delivery_state.as_deref(),
            Some("failed")
        );
        assert!(resumed_failed_entry.outbound_retryable);

        run_production_message_outbound_cancel_pending(
            initiator_root,
            initiator_profile.clone(),
            passphrase.clone(),
            outbound.selected_message_number,
        )
        .expect("cancel isolated failed outbound");
        let canceled_transcript = run_production_message_transcript_export(
            initiator_root,
            initiator_profile,
            passphrase,
        )
        .expect("isolated canceled sender transcript");
        let canceled_entry = canceled_transcript
            .entries
            .iter()
            .find(|entry| entry.message_number == outbound.selected_message_number)
            .expect("isolated canceled sender entry");
        assert_eq!(
            canceled_entry.outbound_delivery_state.as_deref(),
            Some("canceled")
        );
        assert_eq!(canceled_entry.outbound_failure_kind, None);
        assert!(!canceled_entry.outbound_retryable);

        let _ = std::fs::remove_dir_all(root_a);
        let _ = std::fs::remove_dir_all(root_b);
    }

    #[test]
    fn production_two_profile_roundtrip_rejects_same_profile() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let result = run_production_two_profile_roundtrip(
            &root,
            "alice".to_string(),
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "two profile hello".to_string(),
            604_800,
        );

        assert!(result.is_err());
        let _ = std::fs::remove_dir_all(root);
    }
}

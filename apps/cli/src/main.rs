#[cfg(feature = "dev-insecure")]
fn main() {
    if let Err(error) = dev_main() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn main() {
    if let Err(error) = production_main() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn production_main() -> Result<(), String> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match args.as_slice() {
        [] => {
            println!("{}", production_help());
        }
        [help] if help == "--help" || help == "-h" || help == "help" => {
            println!("{}", production_help());
        }
        [cmd, sub] if cmd == "production" && sub == "self-test" => {
            run_production_self_test()?;
            print_production_self_test_summary();
            eprintln!("warning: production self-test is not a secure messenger release");
            println!("production boundary self-test passed");
        }
        [cmd, sub] if cmd == "production" && sub == "preflight" => {
            print_production_skeleton_preflight_summary();
            eprintln!(
                "warning: production preflight is read-only and not a secure messenger release"
            );
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "profile" && action == "init" =>
        {
            run_production_profile_init_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "profile" && action == "status" =>
        {
            run_production_profile_status_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "identity" && action == "init" =>
        {
            run_production_identity_init_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "identity" && action == "status" =>
        {
            run_production_identity_status_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "payload"
                && action == "create" =>
        {
            run_production_pairing_payload_create_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "prepare" =>
        {
            run_production_pairing_session_prepare_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "save-draft" =>
        {
            run_production_pairing_session_save_draft_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "status" =>
        {
            run_production_pairing_session_status_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "load-runtime" =>
        {
            run_production_pairing_session_load_runtime_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "open-runtime" =>
        {
            run_production_pairing_session_open_runtime_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "transport-prepare" =>
        {
            run_production_pairing_session_transport_prepare_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "handshake-init" =>
        {
            run_production_pairing_session_handshake_init_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "handshake-init-export" =>
        {
            run_production_pairing_session_handshake_init_export_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "handshake-init-import" =>
        {
            run_production_pairing_session_handshake_init_import_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "handshake-reply-export" =>
        {
            run_production_pairing_session_handshake_reply_export_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "handshake-finish-export" =>
        {
            run_production_pairing_session_handshake_finish_export_command(args)?;
        }
        [cmd, sub, object, action, args @ ..]
            if cmd == "production"
                && sub == "pairing"
                && object == "session"
                && action == "handshake-finish-import" =>
        {
            run_production_pairing_session_handshake_finish_import_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "message" && action == "send-prepare" =>
        {
            run_production_message_send_prepare_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "message" && action == "pending-status" =>
        {
            run_production_message_pending_status_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "message" && action == "outbound-encrypt-prepare" =>
        {
            run_production_message_outbound_encrypt_prepare_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "message" && action == "outbound-envelope-export" =>
        {
            run_production_message_outbound_envelope_export_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "message" && action == "inbound-decrypt-import" =>
        {
            run_production_message_inbound_decrypt_import_command(args)?;
        }
        [cmd, sub, action, args @ ..]
            if cmd == "production" && sub == "message" && action == "received-status" =>
        {
            run_production_message_received_status_command(args)?;
        }
        [cmd, sub, _args @ ..] if cmd == "production" && sub == "unlock" => {
            return Err(production_unlock_rejected_error());
        }
        #[cfg(feature = "arti-manual-bootstrap")]
        [cmd, sub, args @ ..] if cmd == "transport" && sub == "bootstrap" => {
            run_manual_bootstrap_command(args)?;
        }
        #[cfg(feature = "arti-manual-bootstrap")]
        [cmd, sub, action, args @ ..]
            if cmd == "transport" && sub == "lifecycle" && action == "bootstrap" =>
        {
            run_manual_lifecycle_bootstrap_command(args)?;
        }
        _ => {
            return Err(format!(
                "another-dimension default build exposes only boundary commands\n\n{}",
                production_help()
            ));
        }
    }
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn production_unlock_rejected_error() -> String {
    use another_dimension_core::production::{
        session_unlock_redacted_error_taxonomy, SessionUnlockCommandRequest,
        SessionUnlockRedactedErrorKind,
    };

    let taxonomy =
        session_unlock_redacted_error_taxonomy(&SessionUnlockCommandRequest::passphrase_only());
    let redacted_kind = match taxonomy.kind() {
        SessionUnlockRedactedErrorKind::ProductUnlockDisabled => "product-unlock-disabled",
        SessionUnlockRedactedErrorKind::PassphraseRequired => "passphrase-required",
        SessionUnlockRedactedErrorKind::OsKeystoreOnlyRejected => "os-keystore-only-rejected",
    };

    format!(
        "production unlock is disabled: unlock_error={redacted_kind} retry_after_user_action={} storage_opened=false session_records_written=false key_material_exposed=false runtime_messaging=false",
        taxonomy.retry_after_user_action_allowed()
    )
}

#[cfg(not(feature = "dev-insecure"))]
fn production_help() -> String {
    "usage:
  another-dimension production self-test
  another-dimension production preflight
  another-dimension production profile init --profile <name> --store <path> --passphrase-stdin
  another-dimension production profile status --profile <name> --store <path> --passphrase-stdin
  another-dimension production identity init --profile <name> --store <path> --passphrase-stdin
  another-dimension production identity status --profile <name> --store <path> --passphrase-stdin
  another-dimension production pairing payload create --profile <name> --store <path> --rendezvous-endpoint <onion> --out <path> --passphrase-stdin
  another-dimension production pairing session prepare --profile <name> --store <path> --local-payload <path> --remote-payload <path> --passphrase-stdin
  another-dimension production pairing session save-draft --profile <name> --store <path> --local-payload <path> --remote-payload <path> --passphrase-stdin
  another-dimension production pairing session status --profile <name> --store <path> --passphrase-stdin
  another-dimension production pairing session load-runtime --profile <name> --store <path> --passphrase-stdin
  another-dimension production pairing session open-runtime --profile <name> --store <path> --passphrase-stdin
  another-dimension production pairing session transport-prepare --profile <name> --store <path> --passphrase-stdin
  another-dimension production pairing session handshake-init --profile <name> --store <path> --passphrase-stdin
  another-dimension production pairing session handshake-init-export --profile <name> --store <path> --out <path> --passphrase-stdin
  another-dimension production pairing session handshake-init-import --profile <name> --store <path> --in <path> --passphrase-stdin
  another-dimension production pairing session handshake-reply-export --profile <name> --store <path> --in <path> --out <path> --passphrase-stdin
  another-dimension production pairing session handshake-finish-export --profile <name> --store <path> --in <path> --out <path> --passphrase-stdin
  another-dimension production pairing session handshake-finish-import --profile <name> --store <path> --in <path> --passphrase-stdin
  another-dimension production message send-prepare --profile <name> --store <path> --message-number <n> --plaintext <path> --passphrase-stdin
  another-dimension production message pending-status --profile <name> --store <path> --message-number <n> --passphrase-stdin
  another-dimension production message outbound-encrypt-prepare --profile <name> --store <path> --message-number <n> --passphrase-stdin
  another-dimension production message outbound-envelope-export --profile <name> --store <path> --message-number <n> --out <path> --passphrase-stdin
  another-dimension production message inbound-decrypt-import --profile <name> --store <path> --in <path> --passphrase-stdin
  another-dimension production message received-status --profile <name> --store <path> --message-number <n> --passphrase-stdin
  another-dimension --help

boundary:
  default build is not a secure messenger release
  no usable messaging, pairing, transport bootstrap, or long-lived storage unlock command is exposed
  production self-test performs no network I/O and opens no local storage
  production preflight is read-only and performs no messaging, storage unlock, or transport I/O
  production profile init is storage-only: it creates an encrypted local profile store but opens no messaging or transport
  production profile status is storage-only: it verifies an encrypted local profile marker but opens no messaging or transport
  production identity init is storage-only: it creates a production pairwise identity key but opens no messaging or transport
  production identity status is storage-only: it verifies the production pairwise identity key but opens no messaging or transport
  production pairing payload create is storage-only: it signs a QR payload from stored keys and opens no messaging or transport
  production pairing session prepare is storage-only: it verifies payloads and local Noise key readiness without opening transport
  production pairing session save-draft is storage-only: it persists session draft records without opening transport
  production pairing session status is storage-only: it checks persisted session draft readiness without opening transport
  production pairing session load-runtime is storage-only: it rebuilds in-memory runtime material without opening transport
  production pairing session open-runtime is storage-only: it binds runtime material to fail-closed stream gates without opening transport
  production pairing session transport-prepare is storage-only: it verifies transport inputs and keeps session transport in-memory only
  production pairing session handshake-init is storage-only: it checks the first Noise handshake message without exposing bytes or opening transport
  production pairing session handshake-init-export writes handshake bytes only to explicit --out and never to stdout
  production pairing session handshake-init-import reads handshake bytes only from explicit --in and never echoes them
  production pairing session handshake-reply-export reads init bytes only from --in and writes reply bytes only to --out
  production pairing session handshake-finish-export reads reply bytes only from --in and writes finish bytes only to --out
  production pairing session handshake-finish-import reads finish bytes only from --in and persists verified transport state metadata
  production message send-prepare is storage-only: it validates outbound readiness and indexes a local message without network send
  production message pending-status is storage-only: it checks a queued outbound message without exposing plaintext or opening transport
  production message outbound-encrypt-prepare is storage-only: it checks pending plaintext and fails closed before envelope encryption until session transport exists
  production message outbound-envelope-export is storage-only: it writes an encrypted envelope only to explicit --out and never prints plaintext
  production message inbound-decrypt-import is storage-only: it imports an encrypted envelope, decrypts it locally, stores the received message encrypted-at-rest, and commits replay state without printing plaintext
  production message received-status is storage-only: it checks a stored received message without exposing plaintext or opening transport
  prototype profile/pairing/message commands require --features dev-insecure"
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_profile_init_command(args: &[String]) -> Result<(), String> {
    let options = ProductionProfileInitOptions::parse(args)?;
    let passphrase = read_passphrase_from_stdin()?;
    let passphrase = another_dimension_storage::production::ProfilePassphrase::new(passphrase)
        .map_err(|_| "invalid production profile passphrase".to_string())?;
    let summary = another_dimension_core::production::production_profile_init(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_profile_init_error)?;

    println!(
        "production profile initialized: storage_opened={} profile_marker_written={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.profile_marker_written(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production profile init is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_profile_status_command(args: &[String]) -> Result<(), String> {
    let options =
        ProductionProfileInitOptions::parse_with_help(args, production_profile_status_help)?;
    let passphrase = read_passphrase_from_stdin()?;
    let passphrase = another_dimension_storage::production::ProfilePassphrase::new(passphrase)
        .map_err(|_| "invalid production profile passphrase".to_string())?;
    let summary = another_dimension_core::production::production_profile_status(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_profile_status_error)?;

    println!(
        "production profile status: storage_opened={} profile_marker_present={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.profile_marker_present(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production profile status is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_identity_init_command(args: &[String]) -> Result<(), String> {
    let options =
        ProductionProfileInitOptions::parse_with_help(args, production_identity_init_help)?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_profile_identity_init(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_identity_init_error)?;

    println!(
        "production identity initialized: storage_opened={} identity_private_key_written={} identity_public_key_derivable={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.identity_private_key_written(),
        summary.identity_public_key_derivable(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production identity init is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_identity_status_command(args: &[String]) -> Result<(), String> {
    let options =
        ProductionProfileInitOptions::parse_with_help(args, production_identity_status_help)?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_profile_identity_status(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_identity_status_error)?;

    println!(
        "production identity status: storage_opened={} identity_private_key_present={} identity_public_key_derivable={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.identity_private_key_present(),
        summary.identity_public_key_derivable(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production identity status is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_payload_create_command(args: &[String]) -> Result<(), String> {
    let options = ProductionPairingPayloadCreateOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_pairing_payload_create(
        &options.store_path,
        options.profile,
        &passphrase,
        options.rendezvous_endpoint,
    )
    .map_err(redacted_production_pairing_payload_create_error)?;
    let encoded = summary
        .payload()
        .encode()
        .map_err(|_| "production pairing payload create failed".to_string())?;
    std::fs::write(&options.out_path, encoded)
        .map_err(|_| "production pairing payload create failed: output write failed".to_string())?;

    println!(
        "production pairing payload created: storage_opened={} identity_private_key_loaded={} noise_static_private_key_written={} payload_written=true key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.identity_private_key_loaded(),
        summary.noise_static_private_key_written(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing payload create is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_prepare_command(args: &[String]) -> Result<(), String> {
    let options = ProductionPairingSessionPrepareOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let local_payload = read_production_pairing_payload(&options.local_payload_path)?;
    let remote_payload = read_production_pairing_payload(&options.remote_payload_path)?;
    let summary = another_dimension_core::production::production_pairing_session_prepare(
        &options.store_path,
        options.profile,
        &passphrase,
        &local_payload,
        &remote_payload,
    )
    .map_err(redacted_production_pairing_session_prepare_error)?;

    println!(
        "production pairing session prepared: storage_opened={} session_plan_created={} local_noise_static_private_key_loaded={} local_noise_static_matches_payload={} safety_transcript_bound={} canonical_dialer_selected={} local_role={:?} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_plan_created(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_payload(),
        summary.safety_transcript_bound(),
        summary.canonical_dialer_selected(),
        summary.local_role(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session prepare is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_save_draft_command(args: &[String]) -> Result<(), String> {
    let options = ProductionPairingSessionPrepareOptions::parse_with_help(
        args,
        production_pairing_session_save_draft_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let local_payload = read_production_pairing_payload(&options.local_payload_path)?;
    let remote_payload = read_production_pairing_payload(&options.remote_payload_path)?;
    let summary = another_dimension_core::production::production_pairing_session_save_draft(
        &options.store_path,
        options.profile,
        &passphrase,
        &local_payload,
        &remote_payload,
    )
    .map_err(redacted_production_pairing_session_save_draft_error)?;

    println!(
        "production pairing session draft saved: storage_opened={} session_plan_created={} local_noise_static_private_key_loaded={} local_noise_static_matches_payload={} session_draft_written={} remote_endpoint_state_written={} replay_window_written={} channel_id_derivable={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_plan_created(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_payload(),
        summary.session_draft_written(),
        summary.remote_endpoint_state_written(),
        summary.replay_window_written(),
        summary.channel_id_derivable(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session save-draft is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_status_command(args: &[String]) -> Result<(), String> {
    let options = ProductionProfileInitOptions::parse_with_help(
        args,
        production_pairing_session_status_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_pairing_session_status(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_pairing_session_status_error)?;

    println!(
        "production pairing session status: storage_opened={} session_draft_present={} channel_id_derivable={} local_role_available={} remote_contact_present={} remote_endpoint_state_present={} replay_window_present={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_present(),
        summary.channel_id_derivable(),
        summary.local_role_available(),
        summary.remote_contact_present(),
        summary.remote_endpoint_state_present(),
        summary.replay_window_present(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session status is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_load_runtime_command(args: &[String]) -> Result<(), String> {
    let options = ProductionProfileInitOptions::parse_with_help(
        args,
        production_pairing_session_load_runtime_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_pairing_session_load_runtime(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_pairing_session_load_runtime_error)?;

    println!(
        "production pairing session runtime loaded: storage_opened={} session_draft_loaded={} local_noise_static_private_key_loaded={} local_noise_static_matches_draft={} remote_noise_static_public_key_loaded={} remote_endpoint_state_loaded={} replay_window_loaded={} runtime_material_reconstructable={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_loaded(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_draft(),
        summary.remote_noise_static_public_key_loaded(),
        summary.remote_endpoint_state_loaded(),
        summary.replay_window_loaded(),
        summary.runtime_material_reconstructable(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session load-runtime is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_open_runtime_command(args: &[String]) -> Result<(), String> {
    let options = ProductionProfileInitOptions::parse_with_help(
        args,
        production_pairing_session_open_runtime_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_pairing_session_open_runtime(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_pairing_session_open_runtime_error)?;

    println!(
        "production pairing session runtime opened: storage_opened={} runtime_material_reconstructable={} outbound_stream_gate_ready={} outbound_fail_closed_adapter_ready={} outbound_stream_preparation_ready={} session_binding_ready={} remote_peer_authentication_ready={} outbound_envelope_io_ready={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.outbound_stream_gate_ready(),
        summary.outbound_fail_closed_adapter_ready(),
        summary.outbound_stream_preparation_ready(),
        summary.session_binding_ready(),
        summary.remote_peer_authentication_ready(),
        summary.outbound_envelope_io_ready(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session open-runtime is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_transport_prepare_command(args: &[String]) -> Result<(), String> {
    let options = ProductionProfileInitOptions::parse_with_help(
        args,
        production_pairing_session_transport_prepare_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_pairing_session_transport_prepare(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_pairing_session_transport_prepare_error)?;

    println!(
        "production pairing session transport prepared: storage_opened={} runtime_material_reconstructable={} local_noise_static_private_key_loaded={} remote_noise_static_public_key_loaded={} remote_endpoint_state_loaded={} replay_window_loaded={} authenticated_handshake_required={} session_transport_state_created={} session_transport_persistence_allowed={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.local_noise_static_private_key_loaded(),
        summary.remote_noise_static_public_key_loaded(),
        summary.remote_endpoint_state_loaded(),
        summary.replay_window_loaded(),
        summary.authenticated_handshake_required(),
        summary.session_transport_state_created(),
        summary.session_transport_persistence_allowed(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session transport-prepare is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_handshake_init_command(args: &[String]) -> Result<(), String> {
    let options = ProductionProfileInitOptions::parse_with_help(
        args,
        production_pairing_session_handshake_init_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_pairing_session_handshake_init(
        &options.store_path,
        options.profile,
        &passphrase,
    )
    .map_err(redacted_production_pairing_session_handshake_init_error)?;

    println!(
        "production pairing session handshake initialized: storage_opened={} session_draft_loaded={} local_noise_static_private_key_loaded={} local_noise_static_matches_draft={} safety_transcript_loaded={} local_role_can_initiate={} handshake_message_created={} handshake_message_len={} handshake_message_exposed={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_loaded(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_draft(),
        summary.safety_transcript_loaded(),
        summary.local_role_can_initiate(),
        summary.handshake_message_created(),
        summary.handshake_message_len(),
        summary.handshake_message_exposed(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session handshake-init is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_handshake_init_export_command(
    args: &[String],
) -> Result<(), String> {
    let options = ProductionPairingSessionHandshakeInitExportOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let summary =
        another_dimension_core::production::production_pairing_session_handshake_init_export(
            &options.store_path,
            options.profile,
            &passphrase,
        )
        .map_err(redacted_production_pairing_session_handshake_init_export_error)?;
    if summary.handshake_message_created() {
        std::fs::write(&options.out_path, summary.export_payload()).map_err(|_| {
            "production pairing session handshake-init-export failed: out write failed".to_string()
        })?;
    }

    println!(
        "production pairing session handshake init exported: storage_opened={} session_draft_loaded={} local_noise_static_private_key_loaded={} local_noise_static_matches_draft={} safety_transcript_loaded={} local_role_can_initiate={} handshake_message_created={} handshake_message_len={} handshake_message_written={} handshake_message_exposed={} initiator_state_written={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_loaded(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_draft(),
        summary.safety_transcript_loaded(),
        summary.local_role_can_initiate(),
        summary.handshake_message_created(),
        summary.handshake_message_len(),
        summary.handshake_message_created(),
        summary.handshake_message_exposed(),
        summary.initiator_state_written(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session handshake-init-export writes handshake bytes only to --out and is not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_handshake_init_import_command(
    args: &[String],
) -> Result<(), String> {
    let options = ProductionPairingSessionHandshakeInitImportOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let import_payload = std::fs::read_to_string(&options.in_path).map_err(|_| {
        "production pairing session handshake-init-import failed: in read failed".to_string()
    })?;
    let summary =
        another_dimension_core::production::production_pairing_session_handshake_init_import(
            &options.store_path,
            options.profile,
            &passphrase,
            &import_payload,
        )
        .map_err(redacted_production_pairing_session_handshake_init_import_error)?;

    println!(
        "production pairing session handshake init imported: storage_opened={} session_draft_loaded={} safety_transcript_loaded={} local_role_can_accept={} handshake_message_read={} handshake_message_decodable={} handshake_message_len={} handshake_message_exposed={} responder_state_created={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_loaded(),
        summary.safety_transcript_loaded(),
        summary.local_role_can_accept(),
        summary.handshake_message_read(),
        summary.handshake_message_decodable(),
        summary.handshake_message_len(),
        summary.handshake_message_exposed(),
        summary.responder_state_created(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session handshake-init-import is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_handshake_reply_export_command(
    args: &[String],
) -> Result<(), String> {
    let options = ProductionPairingSessionHandshakeReplyExportOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let init_payload = std::fs::read_to_string(&options.in_path).map_err(|_| {
        "production pairing session handshake-reply-export failed: in read failed".to_string()
    })?;
    let summary =
        another_dimension_core::production::production_pairing_session_handshake_reply_export(
            &options.store_path,
            options.profile,
            &passphrase,
            &init_payload,
        )
        .map_err(redacted_production_pairing_session_handshake_reply_export_error)?;
    if summary.reply_message_created() {
        std::fs::write(&options.out_path, summary.export_payload()).map_err(|_| {
            "production pairing session handshake-reply-export failed: out write failed".to_string()
        })?;
    }

    println!(
        "production pairing session handshake reply exported: storage_opened={} session_draft_loaded={} local_noise_static_private_key_loaded={} local_noise_static_matches_draft={} safety_transcript_loaded={} local_role_can_accept={} init_message_read={} init_message_decodable={} init_message_len={} reply_message_created={} reply_message_len={} reply_message_written={} reply_message_exposed={} responder_state_persisted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_loaded(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_draft(),
        summary.safety_transcript_loaded(),
        summary.local_role_can_accept(),
        summary.init_message_read(),
        summary.init_message_decodable(),
        summary.init_message_len(),
        summary.reply_message_created(),
        summary.reply_message_len(),
        summary.reply_message_created(),
        summary.reply_message_exposed(),
        summary.responder_state_persisted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session handshake-reply-export writes handshake bytes only to --out and is not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_handshake_finish_export_command(
    args: &[String],
) -> Result<(), String> {
    let options = ProductionPairingSessionHandshakeFinishExportOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let reply_payload = std::fs::read_to_string(&options.in_path).map_err(|_| {
        "production pairing session handshake-finish-export failed: in read failed".to_string()
    })?;
    let summary =
        another_dimension_core::production::production_pairing_session_handshake_finish_export(
            &options.store_path,
            options.profile,
            &passphrase,
            &reply_payload,
        )
        .map_err(redacted_production_pairing_session_handshake_finish_export_error)?;
    if summary.finish_message_created() {
        std::fs::write(&options.out_path, summary.export_payload()).map_err(|_| {
            "production pairing session handshake-finish-export failed: out write failed"
                .to_string()
        })?;
    }

    println!(
        "production pairing session handshake finish exported: storage_opened={} session_draft_loaded={} local_noise_static_private_key_loaded={} local_noise_static_matches_draft={} safety_transcript_loaded={} local_role_can_finish={} initiator_state_loaded={} reply_message_read={} reply_message_decodable={} reply_message_len={} finish_message_created={} finish_message_len={} finish_message_written={} finish_message_exposed={} transport_state_persisted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_loaded(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_draft(),
        summary.safety_transcript_loaded(),
        summary.local_role_can_finish(),
        summary.initiator_state_loaded(),
        summary.reply_message_read(),
        summary.reply_message_decodable(),
        summary.reply_message_len(),
        summary.finish_message_created(),
        summary.finish_message_len(),
        summary.finish_message_created(),
        summary.finish_message_exposed(),
        summary.transport_state_persisted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session handshake-finish-export writes handshake bytes only to --out and is not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_pairing_session_handshake_finish_import_command(
    args: &[String],
) -> Result<(), String> {
    let options = ProductionPairingSessionHandshakeFinishImportOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let finish_payload = std::fs::read_to_string(&options.in_path).map_err(|_| {
        "production pairing session handshake-finish-import failed: in read failed".to_string()
    })?;
    let summary =
        another_dimension_core::production::production_pairing_session_handshake_finish_import(
            &options.store_path,
            options.profile,
            &passphrase,
            &finish_payload,
        )
        .map_err(redacted_production_pairing_session_handshake_finish_import_error)?;

    println!(
        "production pairing session handshake finish imported: storage_opened={} session_draft_loaded={} local_noise_static_private_key_loaded={} local_noise_static_matches_draft={} safety_transcript_loaded={} local_role_can_complete={} responder_state_loaded={} finish_message_read={} finish_message_decodable={} finish_message_len={} remote_static_verified={} transport_state_created={} transport_state_persisted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.session_draft_loaded(),
        summary.local_noise_static_private_key_loaded(),
        summary.local_noise_static_matches_draft(),
        summary.safety_transcript_loaded(),
        summary.local_role_can_complete(),
        summary.responder_state_loaded(),
        summary.finish_message_read(),
        summary.finish_message_decodable(),
        summary.finish_message_len(),
        summary.remote_static_verified(),
        summary.transport_state_created(),
        summary.transport_state_persisted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production pairing session handshake-finish-import persists verified transport state metadata without opening transport I/O and is not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_message_send_prepare_command(args: &[String]) -> Result<(), String> {
    let options = ProductionMessageSendPrepareOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let plaintext = std::fs::read(&options.plaintext_path)
        .map_err(|_| "production message send-prepare failed: plaintext read failed".to_string())?;
    let summary = another_dimension_core::production::production_message_send_prepare(
        &options.store_path,
        options.profile,
        &passphrase,
        options.message_number,
        &plaintext,
    )
    .map_err(redacted_production_message_send_prepare_error)?;

    println!(
        "production message send prepared: storage_opened={} runtime_material_reconstructable={} outbound_envelope_io_ready={} plaintext_accepted={} message_number_reserved={} local_message_index_written={} pending_message_record_written={} envelope_encryption_ready={} network_send_attempted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.outbound_envelope_io_ready(),
        summary.plaintext_accepted(),
        summary.message_number_reserved(),
        summary.local_message_index_written(),
        summary.pending_message_record_written(),
        summary.envelope_encryption_ready(),
        summary.network_send_attempted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production message send-prepare is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_message_pending_status_command(args: &[String]) -> Result<(), String> {
    let options = ProductionMessagePendingStatusOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_message_pending_status(
        &options.store_path,
        options.profile,
        &passphrase,
        options.message_number,
    )
    .map_err(redacted_production_message_pending_status_error)?;

    println!(
        "production message pending status: storage_opened={} runtime_material_reconstructable={} local_message_index_present={} pending_message_record_present={} pending_message_record_decodable={} local_message_index_matches_pending={} plaintext_exposed={} envelope_encryption_ready={} network_send_attempted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.local_message_index_present(),
        summary.pending_message_record_present(),
        summary.pending_message_record_decodable(),
        summary.local_message_index_matches_pending(),
        summary.plaintext_exposed(),
        summary.envelope_encryption_ready(),
        summary.network_send_attempted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production message pending-status is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_message_outbound_encrypt_prepare_command(args: &[String]) -> Result<(), String> {
    let options = ProductionMessagePendingStatusOptions::parse_with_help(
        args,
        production_message_outbound_encrypt_prepare_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_message_outbound_encrypt_prepare(
        &options.store_path,
        options.profile,
        &passphrase,
        options.message_number,
    )
    .map_err(redacted_production_message_outbound_encrypt_prepare_error)?;

    println!(
        "production message outbound encrypt prepared: storage_opened={} runtime_material_reconstructable={} local_message_index_present={} pending_message_record_present={} pending_message_record_decodable={} local_message_index_matches_pending={} pending_plaintext_loaded={} plaintext_exposed={} session_transport_ready={} envelope_encryption_ready={} encrypted_envelope_written={} network_send_attempted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.local_message_index_present(),
        summary.pending_message_record_present(),
        summary.pending_message_record_decodable(),
        summary.local_message_index_matches_pending(),
        summary.pending_plaintext_loaded(),
        summary.plaintext_exposed(),
        summary.session_transport_ready(),
        summary.envelope_encryption_ready(),
        summary.encrypted_envelope_written(),
        summary.network_send_attempted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production message outbound-encrypt-prepare is storage-only and not a secure messenger release"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_message_outbound_envelope_export_command(args: &[String]) -> Result<(), String> {
    let options = ProductionMessageOutboundEnvelopeExportOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_message_outbound_envelope_export(
        &options.store_path,
        options.profile,
        &passphrase,
        options.message_number,
    )
    .map_err(redacted_production_message_outbound_envelope_export_error)?;
    std::fs::write(&options.out_path, summary.export_payload()).map_err(|_| {
        "production message outbound-envelope-export failed: out write failed".to_string()
    })?;

    println!(
        "production message outbound envelope exported: storage_opened={} runtime_material_reconstructable={} encrypted_envelope_present={} envelope_decodable={} envelope_message_number_matches={} envelope_message_type_data={} envelope_written={} plaintext_exposed={} network_send_attempted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.encrypted_envelope_present(),
        summary.envelope_decodable(),
        summary.envelope_message_number_matches(),
        summary.envelope_message_type_data(),
        !summary.export_payload().is_empty(),
        summary.plaintext_exposed(),
        summary.network_send_attempted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production message outbound-envelope-export writes encrypted envelope bytes only to --out and does not print plaintext"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_message_inbound_decrypt_import_command(args: &[String]) -> Result<(), String> {
    let options = ProductionMessageInboundDecryptImportOptions::parse(args)?;
    let passphrase = read_production_passphrase()?;
    let envelope_payload = std::fs::read_to_string(&options.in_path).map_err(|_| {
        "production message inbound-decrypt-import failed: in read failed".to_string()
    })?;
    let summary = another_dimension_core::production::production_message_inbound_decrypt_import(
        &options.store_path,
        options.profile,
        &passphrase,
        &envelope_payload,
    )
    .map_err(redacted_production_message_inbound_decrypt_import_error)?;
    println!(
        "production message inbound decrypt imported: storage_opened={} runtime_material_reconstructable={} envelope_read={} envelope_decodable={} session_transport_ready={} replay_window_loaded={} replay_accepted={} plaintext_decrypted={} plaintext_exposed={} received_message_written={} replay_window_committed={} network_receive_attempted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.envelope_read(),
        summary.envelope_decodable(),
        summary.session_transport_ready(),
        summary.replay_window_loaded(),
        summary.replay_accepted(),
        summary.plaintext_decrypted(),
        summary.plaintext_exposed(),
        summary.received_message_written(),
        summary.replay_window_committed(),
        summary.network_receive_attempted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production message inbound-decrypt-import is storage-only and does not print plaintext"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_message_received_status_command(args: &[String]) -> Result<(), String> {
    let options = ProductionMessagePendingStatusOptions::parse_with_help(
        args,
        production_message_received_status_help,
    )?;
    let passphrase = read_production_passphrase()?;
    let summary = another_dimension_core::production::production_message_received_status(
        &options.store_path,
        options.profile,
        &passphrase,
        options.message_number,
    )
    .map_err(redacted_production_message_received_status_error)?;

    println!(
        "production message received status: storage_opened={} runtime_material_reconstructable={} received_message_record_present={} received_message_record_decodable={} received_message_matches_session={} plaintext_exposed={} network_receive_attempted={} key_material_exposed={} transport_io_opened={} runtime_messaging={}",
        summary.storage_opened(),
        summary.runtime_material_reconstructable(),
        summary.received_message_record_present(),
        summary.received_message_record_decodable(),
        summary.received_message_matches_session(),
        summary.plaintext_exposed(),
        summary.network_receive_attempted(),
        summary.key_material_exposed(),
        summary.transport_io_opened(),
        summary.runtime_messaging_enabled()
    );
    eprintln!(
        "warning: production message received-status is storage-only and does not print plaintext"
    );
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionProfileInitOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionProfileInitOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        Self::parse_with_help(args, production_profile_init_help)
    }

    fn parse_with_help(args: &[String], help: fn() -> String) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(args.get(index).ok_or_else(help).and_then(|value| {
                        another_dimension_identity::ProfileName::new(value)
                            .map_err(|_| "invalid production profile name".to_string())
                    })?);
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(help());
        }

        Ok(Self {
            profile: profile.ok_or_else(help)?,
            store_path: store_path.ok_or_else(help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionPairingPayloadCreateOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    rendezvous_endpoint: String,
    out_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionPairingSessionPrepareOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    local_payload_path: std::path::PathBuf,
    remote_payload_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionMessageSendPrepareOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    message_number: u64,
    plaintext_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionMessagePendingStatusOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    message_number: u64,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionPairingSessionHandshakeInitExportOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    out_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionPairingSessionHandshakeInitImportOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    in_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionPairingSessionHandshakeReplyExportOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    in_path: std::path::PathBuf,
    out_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionPairingSessionHandshakeFinishExportOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    in_path: std::path::PathBuf,
    out_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionPairingSessionHandshakeFinishImportOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    in_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionMessageInboundDecryptImportOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    in_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
struct ProductionMessageOutboundEnvelopeExportOptions {
    profile: another_dimension_identity::ProfileName,
    store_path: std::path::PathBuf,
    message_number: u64,
    out_path: std::path::PathBuf,
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionPairingPayloadCreateOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut rendezvous_endpoint = None;
        let mut out_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_pairing_payload_create_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_payload_create_help)?,
                    );
                }
                "--rendezvous-endpoint" => {
                    index += 1;
                    rendezvous_endpoint = Some(
                        args.get(index)
                            .cloned()
                            .ok_or_else(production_pairing_payload_create_help)?,
                    );
                }
                "--out" => {
                    index += 1;
                    out_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_payload_create_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_pairing_payload_create_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_pairing_payload_create_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_pairing_payload_create_help)?,
            store_path: store_path.ok_or_else(production_pairing_payload_create_help)?,
            rendezvous_endpoint: rendezvous_endpoint
                .ok_or_else(production_pairing_payload_create_help)?,
            out_path: out_path.ok_or_else(production_pairing_payload_create_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionPairingSessionPrepareOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        Self::parse_with_help(args, production_pairing_session_prepare_help)
    }

    fn parse_with_help(args: &[String], help: fn() -> String) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut local_payload_path = None;
        let mut remote_payload_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(args.get(index).ok_or_else(help).and_then(|value| {
                        another_dimension_identity::ProfileName::new(value)
                            .map_err(|_| "invalid production profile name".to_string())
                    })?);
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(help)?,
                    );
                }
                "--local-payload" => {
                    index += 1;
                    local_payload_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(help)?,
                    );
                }
                "--remote-payload" => {
                    index += 1;
                    remote_payload_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(help());
        }

        Ok(Self {
            profile: profile.ok_or_else(help)?,
            store_path: store_path.ok_or_else(help)?,
            local_payload_path: local_payload_path.ok_or_else(help)?,
            remote_payload_path: remote_payload_path.ok_or_else(help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionPairingSessionHandshakeInitExportOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut out_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_pairing_session_handshake_init_export_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_init_export_help)?,
                    );
                }
                "--out" => {
                    index += 1;
                    out_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_init_export_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_pairing_session_handshake_init_export_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_pairing_session_handshake_init_export_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_pairing_session_handshake_init_export_help)?,
            store_path: store_path
                .ok_or_else(production_pairing_session_handshake_init_export_help)?,
            out_path: out_path.ok_or_else(production_pairing_session_handshake_init_export_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionPairingSessionHandshakeInitImportOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut in_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_pairing_session_handshake_init_import_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_init_import_help)?,
                    );
                }
                "--in" => {
                    index += 1;
                    in_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_init_import_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_pairing_session_handshake_init_import_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_pairing_session_handshake_init_import_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_pairing_session_handshake_init_import_help)?,
            store_path: store_path
                .ok_or_else(production_pairing_session_handshake_init_import_help)?,
            in_path: in_path.ok_or_else(production_pairing_session_handshake_init_import_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionPairingSessionHandshakeReplyExportOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut in_path = None;
        let mut out_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_pairing_session_handshake_reply_export_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_reply_export_help)?,
                    );
                }
                "--in" => {
                    index += 1;
                    in_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_reply_export_help)?,
                    );
                }
                "--out" => {
                    index += 1;
                    out_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_reply_export_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_pairing_session_handshake_reply_export_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_pairing_session_handshake_reply_export_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_pairing_session_handshake_reply_export_help)?,
            store_path: store_path
                .ok_or_else(production_pairing_session_handshake_reply_export_help)?,
            in_path: in_path.ok_or_else(production_pairing_session_handshake_reply_export_help)?,
            out_path: out_path
                .ok_or_else(production_pairing_session_handshake_reply_export_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionPairingSessionHandshakeFinishExportOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut in_path = None;
        let mut out_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_pairing_session_handshake_finish_export_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_finish_export_help)?,
                    );
                }
                "--in" => {
                    index += 1;
                    in_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_finish_export_help)?,
                    );
                }
                "--out" => {
                    index += 1;
                    out_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_finish_export_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_pairing_session_handshake_finish_export_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_pairing_session_handshake_finish_export_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_pairing_session_handshake_finish_export_help)?,
            store_path: store_path
                .ok_or_else(production_pairing_session_handshake_finish_export_help)?,
            in_path: in_path.ok_or_else(production_pairing_session_handshake_finish_export_help)?,
            out_path: out_path
                .ok_or_else(production_pairing_session_handshake_finish_export_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionPairingSessionHandshakeFinishImportOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut in_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_pairing_session_handshake_finish_import_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_finish_import_help)?,
                    );
                }
                "--in" => {
                    index += 1;
                    in_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_pairing_session_handshake_finish_import_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_pairing_session_handshake_finish_import_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_pairing_session_handshake_finish_import_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_pairing_session_handshake_finish_import_help)?,
            store_path: store_path
                .ok_or_else(production_pairing_session_handshake_finish_import_help)?,
            in_path: in_path.ok_or_else(production_pairing_session_handshake_finish_import_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionMessageSendPrepareOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut message_number = None;
        let mut plaintext_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_message_send_prepare_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_message_send_prepare_help)?,
                    );
                }
                "--message-number" => {
                    index += 1;
                    message_number = Some(
                        args.get(index)
                            .ok_or_else(production_message_send_prepare_help)?
                            .parse::<u64>()
                            .map_err(|_| production_message_send_prepare_help())?,
                    );
                }
                "--plaintext" => {
                    index += 1;
                    plaintext_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_message_send_prepare_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_message_send_prepare_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_message_send_prepare_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_message_send_prepare_help)?,
            store_path: store_path.ok_or_else(production_message_send_prepare_help)?,
            message_number: message_number.ok_or_else(production_message_send_prepare_help)?,
            plaintext_path: plaintext_path.ok_or_else(production_message_send_prepare_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionMessagePendingStatusOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        Self::parse_with_help(args, production_message_pending_status_help)
    }

    fn parse_with_help(args: &[String], help: fn() -> String) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut message_number = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(args.get(index).ok_or_else(help).and_then(|value| {
                        another_dimension_identity::ProfileName::new(value)
                            .map_err(|_| "invalid production profile name".to_string())
                    })?);
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(help)?,
                    );
                }
                "--message-number" => {
                    index += 1;
                    message_number = Some(
                        args.get(index)
                            .ok_or_else(help)?
                            .parse::<u64>()
                            .map_err(|_| help())?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(help());
        }

        Ok(Self {
            profile: profile.ok_or_else(help)?,
            store_path: store_path.ok_or_else(help)?,
            message_number: message_number.ok_or_else(help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionMessageOutboundEnvelopeExportOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut message_number = None;
        let mut out_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_message_outbound_envelope_export_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_message_outbound_envelope_export_help)?,
                    );
                }
                "--message-number" => {
                    index += 1;
                    message_number = Some(
                        args.get(index)
                            .ok_or_else(production_message_outbound_envelope_export_help)?
                            .parse::<u64>()
                            .map_err(|_| production_message_outbound_envelope_export_help())?,
                    );
                }
                "--out" => {
                    index += 1;
                    out_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_message_outbound_envelope_export_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_message_outbound_envelope_export_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_message_outbound_envelope_export_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_message_outbound_envelope_export_help)?,
            store_path: store_path.ok_or_else(production_message_outbound_envelope_export_help)?,
            message_number: message_number
                .ok_or_else(production_message_outbound_envelope_export_help)?,
            out_path: out_path.ok_or_else(production_message_outbound_envelope_export_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
impl ProductionMessageInboundDecryptImportOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        let mut profile = None;
        let mut store_path = None;
        let mut in_path = None;
        let mut passphrase_stdin = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--profile" => {
                    index += 1;
                    profile = Some(
                        args.get(index)
                            .ok_or_else(production_message_inbound_decrypt_import_help)
                            .and_then(|value| {
                                another_dimension_identity::ProfileName::new(value)
                                    .map_err(|_| "invalid production profile name".to_string())
                            })?,
                    );
                }
                "--store" => {
                    index += 1;
                    store_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_message_inbound_decrypt_import_help)?,
                    );
                }
                "--in" => {
                    index += 1;
                    in_path = Some(
                        args.get(index)
                            .map(std::path::PathBuf::from)
                            .ok_or_else(production_message_inbound_decrypt_import_help)?,
                    );
                }
                "--passphrase-stdin" => {
                    passphrase_stdin = true;
                }
                _ => return Err(production_message_inbound_decrypt_import_help()),
            }
            index += 1;
        }

        if !passphrase_stdin {
            return Err(production_message_inbound_decrypt_import_help());
        }

        Ok(Self {
            profile: profile.ok_or_else(production_message_inbound_decrypt_import_help)?,
            store_path: store_path.ok_or_else(production_message_inbound_decrypt_import_help)?,
            in_path: in_path.ok_or_else(production_message_inbound_decrypt_import_help)?,
        })
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn production_profile_init_help() -> String {
    "usage:
  another-dimension production profile init --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Creates or unlocks an encrypted local profile store and writes a profile marker. This does not enable messaging, pairing, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_profile_status_help() -> String {
    "usage:
  another-dimension production profile status --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store and checks for a profile marker. This does not enable messaging, pairing, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_identity_init_help() -> String {
    "usage:
  another-dimension production identity init --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store and writes a production pairwise identity private key. This requires an initialized profile marker and does not enable messaging, pairing, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_identity_status_help() -> String {
    "usage:
  another-dimension production identity status --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store and checks whether a production pairwise identity private key is present and usable. This does not enable messaging, pairing, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_payload_create_help() -> String {
    "usage:
  another-dimension production pairing payload create --profile <name> --store <path> --rendezvous-endpoint <onion> --out <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, signs a production pairing payload with the stored pairwise identity key, stores the matching Noise static private key, and writes the QR payload to --out. This does not enable messaging, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_prepare_help() -> String {
    "usage:
  another-dimension production pairing session prepare --profile <name> --store <path> --local-payload <path> --remote-payload <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, verifies the local and remote production pairing payloads, reloads the local Noise static private key, and checks that it matches the local payload. This does not enable messaging, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_save_draft_help() -> String {
    "usage:
  another-dimension production pairing session save-draft --profile <name> --store <path> --local-payload <path> --remote-payload <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, verifies the local and remote production pairing payloads, reloads the local Noise static private key, and persists a session draft, remote endpoint state, and initial replay window. This does not enable messaging, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_status_help() -> String {
    "usage:
  another-dimension production pairing session status --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store and checks whether the latest persisted session draft, remote endpoint state, and replay window are present. This does not enable messaging, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_load_runtime_help() -> String {
    "usage:
  another-dimension production pairing session load-runtime --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, reloads the latest persisted session draft, local Noise static private key, remote endpoint state, and replay window, then checks whether in-memory runtime material can be reconstructed. This does not enable messaging, transport, or a long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_open_runtime_help() -> String {
    "usage:
  another-dimension production pairing session open-runtime --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, reloads runtime material, binds it to high-risk onion outbound stream gates and fail-closed envelope I/O boundaries, and performs no dial, send, receive, or long-lived unlock session."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_transport_prepare_help() -> String {
    "usage:
  another-dimension production pairing session transport-prepare --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, reloads session runtime material, checks local and remote Noise static inputs, and confirms session transport persistence policy without creating transport state. This does not persist transport state, open transport, or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_handshake_init_help() -> String {
    "usage:
  another-dimension production pairing session handshake-init --profile <name> --store <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, reloads the session draft and local Noise static key, and checks whether the canonical dialer can create the first Noise handshake message without printing or persisting handshake bytes. This does not open transport or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_handshake_init_export_help() -> String {
    "usage:
  another-dimension production pairing session handshake-init-export --profile <name> --store <path> --out <path> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, creates the first Noise handshake message when the local profile is the canonical dialer, and writes handshake bytes only to --out. This does not print handshake bytes, open transport, or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_handshake_init_import_help() -> String {
    "usage:
  another-dimension production pairing session handshake-init-import --profile <name> --store <path> --in <path> --passphrase-stdin

Reads the profile passphrase from stdin and handshake bytes only from --in. Opens an encrypted local profile store, reloads the session draft, and validates the imported first Noise handshake message envelope without printing bytes, creating responder state, opening transport, or enabling runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_handshake_reply_export_help() -> String {
    "usage:
  another-dimension production pairing session handshake-reply-export --profile <name> --store <path> --in <path> --out <path> --passphrase-stdin

Reads the profile passphrase from stdin and init handshake bytes only from --in. Opens an encrypted local profile store, validates the init message as the responder, and writes reply bytes only to --out. This does not print handshake bytes, persist responder state, open transport, or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_handshake_finish_export_help() -> String {
    "usage:
  another-dimension production pairing session handshake-finish-export --profile <name> --store <path> --in <path> --out <path> --passphrase-stdin

Reads the profile passphrase from stdin and reply handshake bytes only from --in. Opens an encrypted local profile store, reloads pending initiator handshake state, persists verified transport state metadata, and writes finish bytes only to --out. This does not print handshake bytes, open transport, or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_handshake_finish_import_help() -> String {
    "usage:
  another-dimension production pairing session handshake-finish-import --profile <name> --store <path> --in <path> --passphrase-stdin

Reads the profile passphrase from stdin and finish handshake bytes only from --in. Opens an encrypted local profile store, reloads pending responder handshake state, and persists verified transport state metadata without printing bytes, opening transport, or enabling runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_message_send_prepare_help() -> String {
    "usage:
  another-dimension production message send-prepare --profile <name> --store <path> --message-number <n> --plaintext <path> --passphrase-stdin

Reads the profile passphrase from stdin and plaintext from --plaintext. Opens an encrypted local profile store, reloads production session runtime material, validates fail-closed outbound readiness, and records a local message index without encrypting an envelope, opening transport, or enabling runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_message_pending_status_help() -> String {
    "usage:
  another-dimension production message pending-status --profile <name> --store <path> --message-number <n> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store and checks whether a queued outbound message record and local message index exist and match, without exposing plaintext, opening transport, or enabling runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_message_outbound_encrypt_prepare_help() -> String {
    "usage:
  another-dimension production message outbound-encrypt-prepare --profile <name> --store <path> --message-number <n> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store, loads pending plaintext, and overwrites it with an encrypted outbound envelope when authenticated session transport metadata exists. This does not expose plaintext, open transport, or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_message_outbound_envelope_export_help() -> String {
    "usage:
  another-dimension production message outbound-envelope-export --profile <name> --store <path> --message-number <n> --out <path> --passphrase-stdin

Reads the profile passphrase from stdin and writes an encrypted outbound envelope only to --out. This does not expose plaintext, open transport, send over the network, or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_message_inbound_decrypt_import_help() -> String {
    "usage:
  another-dimension production message inbound-decrypt-import --profile <name> --store <path> --in <path> --passphrase-stdin

Reads the profile passphrase from stdin and an encrypted envelope only from --in. Opens an encrypted local profile store, decrypts the envelope using authenticated session transport metadata, stores the received message encrypted-at-rest, and commits replay state. This does not print plaintext, open transport, or enable runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn production_message_received_status_help() -> String {
    "usage:
  another-dimension production message received-status --profile <name> --store <path> --message-number <n> --passphrase-stdin

Reads the profile passphrase from stdin. Opens an encrypted local profile store and checks whether a received message is stored and decodable, without exposing plaintext, opening transport, or enabling runtime messaging."
        .to_string()
}

#[cfg(not(feature = "dev-insecure"))]
fn read_production_pairing_payload(
    path: &std::path::Path,
) -> Result<another_dimension_pairing::PairingPayload, String> {
    let encoded = std::fs::read_to_string(path).map_err(|_| {
        "production pairing session prepare failed: payload read failed".to_string()
    })?;
    another_dimension_pairing::PairingPayload::decode(&encoded)
        .map_err(|_| "production pairing session prepare failed: invalid payload".to_string())
}

#[cfg(not(feature = "dev-insecure"))]
fn read_production_passphrase(
) -> Result<another_dimension_storage::production::ProfilePassphrase, String> {
    let passphrase = read_passphrase_from_stdin()?;
    another_dimension_storage::production::ProfilePassphrase::new(passphrase)
        .map_err(|_| "invalid production profile passphrase".to_string())
}

#[cfg(not(feature = "dev-insecure"))]
fn read_passphrase_from_stdin() -> Result<String, String> {
    use std::io::Read;

    let mut passphrase = String::new();
    std::io::stdin()
        .read_to_string(&mut passphrase)
        .map_err(|_| "failed to read production profile passphrase".to_string())?;
    Ok(passphrase.trim_end_matches(['\r', '\n']).to_string())
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_profile_init_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production profile init failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production profile init failed: storage error".to_string()
        }
        _ => "production profile init failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_profile_status_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production profile status failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production profile status failed: storage error".to_string()
        }
        _ => "production profile status failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_identity_init_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::ProfileMarkerMissing => {
            "production identity init failed: profile marker missing".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production identity init failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production identity init failed: storage error".to_string()
        }
        _ => "production identity init failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_identity_status_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::ProfileMarkerMissing => {
            "production identity status failed: profile marker missing".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production identity status failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production identity status failed: storage error".to_string()
        }
        _ => "production identity status failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_payload_create_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::ProfileMarkerMissing => {
            "production pairing payload create failed: profile marker missing".to_string()
        }
        ProductionSessionError::IdentityPrivateKeyMissing => {
            "production pairing payload create failed: identity private key missing".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production pairing payload create failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production pairing payload create failed: storage error".to_string()
        }
        _ => "production pairing payload create failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_prepare_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::ProfileMarkerMissing => {
            "production pairing session prepare failed: profile marker missing".to_string()
        }
        ProductionSessionError::NoiseStaticPrivateKeyMissing => {
            "production pairing session prepare failed: local noise static key missing".to_string()
        }
        ProductionSessionError::LocalPairingPayloadMismatch => {
            "production pairing session prepare failed: local payload mismatch".to_string()
        }
        ProductionSessionError::SamePairwiseIdentity => {
            "production pairing session prepare failed: same pairwise identity".to_string()
        }
        ProductionSessionError::SameRendezvousEndpoint => {
            "production pairing session prepare failed: same rendezvous endpoint".to_string()
        }
        ProductionSessionError::NonProductionPairingPayload => {
            "production pairing session prepare failed: non-production payload".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production pairing session prepare failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production pairing session prepare failed: storage error".to_string()
        }
        _ => "production pairing session prepare failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_save_draft_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_prepare_error(error)
        .replace("session prepare", "session save-draft")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_status_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::ProfileMarkerMissing => {
            "production pairing session status failed: profile marker missing".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production pairing session status failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production pairing session status failed: storage error".to_string()
        }
        _ => "production pairing session status failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_load_runtime_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::ProfileMarkerMissing => {
            "production pairing session load-runtime failed: profile marker missing".to_string()
        }
        ProductionSessionError::SessionDraftMissing => {
            "production pairing session load-runtime failed: session draft missing".to_string()
        }
        ProductionSessionError::NoiseStaticPrivateKeyMissing => {
            "production pairing session load-runtime failed: local noise static key missing"
                .to_string()
        }
        ProductionSessionError::NoiseStaticKeyMismatch => {
            "production pairing session load-runtime failed: local noise static key mismatch"
                .to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production pairing session load-runtime failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production pairing session load-runtime failed: storage error".to_string()
        }
        _ => "production pairing session load-runtime failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_open_runtime_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "open-runtime")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_transport_prepare_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "transport-prepare")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_handshake_init_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "handshake-init")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_handshake_init_export_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "handshake-init-export")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_handshake_init_import_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "handshake-init-import")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_handshake_reply_export_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "handshake-reply-export")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_handshake_finish_export_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "handshake-finish-export")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_pairing_session_handshake_finish_import_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_pairing_session_load_runtime_error(error)
        .replace("load-runtime", "handshake-finish-import")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_message_send_prepare_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    use another_dimension_core::production::ProductionSessionError;
    use another_dimension_storage::production::{
        ProductionStorageError, ProductionStoragePolicyError,
    };

    match error {
        ProductionSessionError::ProfileMarkerMissing => {
            "production message send-prepare failed: profile marker missing".to_string()
        }
        ProductionSessionError::SessionDraftMissing => {
            "production message send-prepare failed: session draft missing".to_string()
        }
        ProductionSessionError::NoiseStaticPrivateKeyMissing => {
            "production message send-prepare failed: local noise static key missing".to_string()
        }
        ProductionSessionError::NoiseStaticKeyMismatch => {
            "production message send-prepare failed: local noise static key mismatch".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::UnlockFailed) => {
            "production message send-prepare failed: unlock failed".to_string()
        }
        ProductionSessionError::Storage(ProductionStorageError::Policy(
            ProductionStoragePolicyError::InvalidPassphrase,
        )) => "invalid production profile passphrase".to_string(),
        ProductionSessionError::Storage(_) => {
            "production message send-prepare failed: storage error".to_string()
        }
        _ => "production message send-prepare failed".to_string(),
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_message_pending_status_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_message_send_prepare_error(error).replace("send-prepare", "pending-status")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_message_outbound_encrypt_prepare_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_message_send_prepare_error(error)
        .replace("send-prepare", "outbound-encrypt-prepare")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_message_outbound_envelope_export_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_message_send_prepare_error(error)
        .replace("send-prepare", "outbound-envelope-export")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_message_inbound_decrypt_import_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_message_send_prepare_error(error)
        .replace("send-prepare", "inbound-decrypt-import")
}

#[cfg(not(feature = "dev-insecure"))]
fn redacted_production_message_received_status_error(
    error: another_dimension_core::production::ProductionSessionError,
) -> String {
    redacted_production_message_send_prepare_error(error).replace("send-prepare", "received-status")
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_self_test() -> Result<(), String> {
    use another_dimension_core::production::{
        establish_envelope_session_from_setup_drafts, production_setup_draft_with_defaults,
    };
    use another_dimension_identity::ProfileName;
    use another_dimension_protocol::{ProtocolError, ReplayWindow};
    use another_dimension_transport::{
        EnvelopeTransport, OnionEnvelopeTransport, TransportError, TransportRoute,
        TransportSendRequest,
    };

    let alice = production_setup_draft_with_defaults(
        &ProfileName::new("alice").map_err(|_| "invalid built-in profile")?,
        "alice.onion",
    )
    .map_err(|_| "production setup failed")?;
    let bob = production_setup_draft_with_defaults(
        &ProfileName::new("bob").map_err(|_| "invalid built-in profile")?,
        "bob.onion",
    )
    .map_err(|_| "production setup failed")?;
    let plaintext = b"production boundary self-test";
    let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
        .map_err(|_| "production session failed")?;
    let envelope = session
        .encrypt_from_canonical_dialer(1, plaintext)
        .map_err(|_| "production envelope encryption failed")?;
    let mut replay_window = ReplayWindow::new(8).map_err(|_| "production replay failed")?;
    let decrypted = session
        .decrypt_at_responder_with_replay(&envelope, &mut replay_window)
        .map_err(|_| "production envelope decryption failed")?;
    let replay_result = session.decrypt_at_responder_with_replay(&envelope, &mut replay_window);
    let valid_after_tamper = session
        .encrypt_from_canonical_dialer(2, b"tamper boundary")
        .map_err(|_| "production envelope encryption failed")?;
    let mut tampered = valid_after_tamper.clone();
    let last = tampered
        .padded_ciphertext
        .last_mut()
        .ok_or_else(|| "production tamper boundary failed".to_string())?;
    *last ^= 0x01;
    let tamper_result = session.decrypt_at_responder_with_replay(&tampered, &mut replay_window);
    let replay_after_tamper = replay_window.highest_seen();
    let valid_after_tamper_result =
        session.decrypt_at_responder_with_replay(&valid_after_tamper, &mut replay_window);
    let transport = OnionEnvelopeTransport::fail_closed_high_risk();
    let direct_route =
        TransportRoute::direct_peer("peer.example").map_err(|_| "invalid direct route")?;
    let onion_route = TransportRoute::onion("bob.onion").map_err(|_| "invalid onion route")?;
    let direct_send_result = transport.send_envelope(TransportSendRequest {
        route: &direct_route,
        envelope: &envelope,
    });
    let onion_send_result = transport.send_envelope(TransportSendRequest {
        route: &onion_route,
        envelope: &envelope,
    });
    if decrypted == plaintext
        && matches!(
            replay_result,
            Err(
                another_dimension_core::production::ProductionSessionError::Protocol(
                    ProtocolError::ReplayMessage
                )
            )
        )
        && tamper_result.is_err()
        && replay_after_tamper == 1
        && valid_after_tamper_result.is_ok()
        && matches!(direct_send_result, Err(TransportError::PolicyViolation))
        && matches!(onion_send_result, Err(TransportError::Unavailable))
    {
        Ok(())
    } else {
        Err("production boundary self-test failed".to_string())
    }
}

#[cfg(not(feature = "dev-insecure"))]
fn print_production_self_test_summary() {
    let summary = another_dimension_core::production::production_session_evaluation_summary();

    println!(
        "production session candidate: {}",
        summary.protocol_candidate()
    );
    println!(
        "production session guard coverage: pairing={} safety_transcript={} canonical_dialer={} tamper_rejection={} replay_before_decrypt={} in_memory_only={}",
        summary.production_pairing_required(),
        summary.safety_transcript_bound(),
        summary.canonical_dialer_stable(),
        summary.ciphertext_tamper_rejected(),
        summary.replay_guard_before_decrypt(),
        summary.session_state_in_memory_only()
    );
    println!(
        "production session non-readiness: production_e2ee={} durable_session_persistence={} tauri_production_messaging_command={} usable_async_messaging={}",
        summary.production_e2ee_ready(),
        summary.durable_session_persistence_ready(),
        summary.tauri_production_messaging_command_ready(),
        summary.usable_async_messaging_ready()
    );
}

#[cfg(not(feature = "dev-insecure"))]
fn print_production_skeleton_preflight_summary() {
    let summary = another_dimension_core::production::production_skeleton_preflight_summary();

    println!("production skeleton preflight summary:");
    println!(
        "session: pairing_required={} safety_transcript_bound={} production_e2ee={}",
        summary.session_pairing_required(),
        summary.session_safety_transcript_bound(),
        summary.session_e2ee_ready()
    );
    println!(
        "transport: route_kind={:?} route_allowed={} send_receive={}",
        summary.transport_route_kind(),
        summary.transport_route_allowed_by_policy(),
        summary.transport_send_receive_available()
    );
    println!(
        "storage: message_envelope={:?} session_transport={:?} replay_commit_after_decrypt={} rollback_protection={:?}",
        summary.storage_message_envelope_protection(),
        summary.storage_session_transport_protection(),
        summary.storage_replay_commit_after_decrypt(),
        summary.storage_rollback_protection()
    );
    println!(
        "runtime command surface: default_closed={} production_messaging_ready={}",
        summary.default_runtime_command_surface_closed(),
        summary.production_messaging_ready()
    );
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn run_manual_bootstrap_command(args: &[String]) -> Result<(), String> {
    use another_dimension_transport::arti_adapter_spike::{
        BoundedArtiBootstrapAdapterSpike, ManualArtiBootstrapAttemptGate,
    };
    use another_dimension_transport::{
        InMemoryTransportRuntimeEventSink, TransportBootstrapExecutionSkeleton,
        TransportBootstrapPolicy, TransportRuntimeReady,
    };

    let options = ManualBootstrapCommandOptions::parse(args)?;
    let execute_network = options.execute_network;
    let dirs = options.resolve_dirs()?;
    let adapter = BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
        dirs,
        TransportBootstrapExecutionSkeleton::new(
            TransportRuntimeReady,
            TransportBootstrapPolicy::high_risk_default(),
        ),
    )
    .map_err(|_| "failed to build app-private Arti config for manual bootstrap".to_string())?;
    let gate = if execute_network {
        ManualArtiBootstrapAttemptGate::explicitly_enabled_for_manual_spike(adapter)
    } else {
        ManualArtiBootstrapAttemptGate::disabled(adapter)
    };
    let mut sink = InMemoryTransportRuntimeEventSink::default();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_time()
        .build()
        .map_err(|_| "failed to create manual bootstrap runtime".to_string())?;
    let result = runtime.block_on(gate.bootstrap_once_and_drop_client(&mut sink));

    for event in sink.events() {
        println!("{event}");
    }
    let bootstrap_status = match &result {
        Ok(()) => "bootstrapped",
        Err(error) => manual_bootstrap_status(*error),
    };
    println!(
        "manual bootstrap attempt summary: permission={:?} bootstrap_status={} timeout_seconds={} usable_transport=false",
        gate.summary().network_permission(),
        bootstrap_status,
        gate.summary().timeout_seconds()
    );

    result.map_err(|error| format!("manual bootstrap attempt failed: {error:?}"))
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn run_manual_lifecycle_bootstrap_command(args: &[String]) -> Result<(), String> {
    use another_dimension_transport::arti_adapter_spike::{
        BoundedArtiBootstrapAdapterSpike, ManualArtiBootstrapNetworkPermission,
        PersistentArtiClientOwner,
    };
    use another_dimension_transport::{
        InMemoryTransportRuntimeEventSink, TransportBootstrapExecutionSkeleton,
        TransportBootstrapPolicy, TransportRuntimeReady,
    };

    let options = ManualBootstrapCommandOptions::parse_with_help(args, manual_lifecycle_help)?;
    let network_permission = if options.execute_network {
        ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
    } else {
        ManualArtiBootstrapNetworkPermission::Disabled
    };
    let dirs = options.resolve_dirs()?;
    let adapter = BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
        dirs,
        TransportBootstrapExecutionSkeleton::new(
            TransportRuntimeReady,
            TransportBootstrapPolicy::high_risk_default(),
        ),
    )
    .map_err(|_| "failed to build app-private Arti config for manual lifecycle".to_string())?;
    let mut owner = PersistentArtiClientOwner::new_unbootstrapped(adapter);
    let mut sink = InMemoryTransportRuntimeEventSink::default();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_time()
        .build()
        .map_err(|_| "failed to create manual lifecycle runtime".to_string())?;
    let result = runtime.block_on(owner.bootstrap_and_keep_client(network_permission, &mut sink));

    for event in sink.events() {
        println!("{event}");
    }
    let bootstrap_status = match &result {
        Ok(()) => "bootstrapped",
        Err(error) => manual_lifecycle_bootstrap_status(error),
    };
    println!(
        "manual lifecycle summary: permission={network_permission:?} bootstrap_status={} state={:?} client_owned={} timeout_seconds={} usable_transport=false",
        bootstrap_status,
        owner.summary().state(),
        owner.summary().client_owned(),
        owner.summary().timeout_seconds()
    );

    result.map_err(|error| format!("manual lifecycle bootstrap failed: {error:?}"))
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_bootstrap_status(
    error: another_dimension_transport::TransportRuntimeError,
) -> &'static str {
    match error {
        another_dimension_transport::TransportRuntimeError::RuntimeNetworkDisabled => {
            "network-disabled"
        }
        another_dimension_transport::TransportRuntimeError::CensorshipOrBridgeRequired => {
            "censorship-or-bridge-required"
        }
        another_dimension_transport::TransportRuntimeError::BootstrapTimeout => {
            "timeout-or-transient-network-failure"
        }
        another_dimension_transport::TransportRuntimeError::BootstrapCancelled => "cancelled",
        _ => "failed",
    }
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_lifecycle_bootstrap_status(
    error: &another_dimension_transport::arti_adapter_spike::PersistentArtiClientLifecycleError,
) -> &'static str {
    use another_dimension_transport::arti_adapter_spike::PersistentArtiClientLifecycleError;

    match error {
        PersistentArtiClientLifecycleError::RuntimeNetworkDisabled => "network-disabled",
        PersistentArtiClientLifecycleError::BootstrapFailed(error) => {
            manual_bootstrap_status(*error)
        }
        PersistentArtiClientLifecycleError::AlreadyShutdown => "owner-shutdown",
        PersistentArtiClientLifecycleError::BootstrapAlreadyInProgress => "already-bootstrapping",
        PersistentArtiClientLifecycleError::ClientAlreadyBootstrapped => "already-bootstrapped",
    }
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
struct ManualBootstrapCommandOptions {
    dirs: ManualBootstrapDirectoryInput,
    execute_network: bool,
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
enum ManualBootstrapDirectoryInput {
    Explicit {
        state_dir: std::path::PathBuf,
        cache_dir: std::path::PathBuf,
    },
    ProfileScoped {
        profile: another_dimension_identity::ProfileName,
        app_data_root: std::path::PathBuf,
    },
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
impl ManualBootstrapCommandOptions {
    fn parse(args: &[String]) -> Result<Self, String> {
        Self::parse_with_help(args, manual_bootstrap_help)
    }

    fn parse_with_help(args: &[String], help: fn() -> String) -> Result<Self, String> {
        let mut state_dir = None;
        let mut cache_dir = None;
        let mut profile = None;
        let mut app_data_root = None;
        let mut execute_network = false;
        let mut index = 0;

        while index < args.len() {
            match args[index].as_str() {
                "--state-dir" => {
                    index += 1;
                    state_dir = args.get(index).map(std::path::PathBuf::from);
                }
                "--cache-dir" => {
                    index += 1;
                    cache_dir = args.get(index).map(std::path::PathBuf::from);
                }
                "--profile" => {
                    index += 1;
                    profile = args
                        .get(index)
                        .map(|value| {
                            another_dimension_identity::ProfileName::new(value).map_err(|_| {
                                "invalid profile name for manual bootstrap".to_string()
                            })
                        })
                        .transpose()?;
                }
                "--app-data-root" => {
                    index += 1;
                    app_data_root = args.get(index).map(std::path::PathBuf::from);
                }
                "--execute-network" => {
                    execute_network = true;
                }
                _ => {
                    return Err(help());
                }
            }
            index += 1;
        }

        let explicit = match (state_dir, cache_dir) {
            (Some(state_dir), Some(cache_dir)) => Some(ManualBootstrapDirectoryInput::Explicit {
                state_dir,
                cache_dir,
            }),
            (None, None) => None,
            _ => return Err(help()),
        };
        let profile_scoped = match (profile, app_data_root) {
            (Some(profile), Some(app_data_root)) => {
                Some(ManualBootstrapDirectoryInput::ProfileScoped {
                    profile,
                    app_data_root,
                })
            }
            (None, None) => None,
            _ => return Err(help()),
        };

        let dirs = match (profile_scoped, explicit) {
            (Some(dirs), None) | (None, Some(dirs)) => dirs,
            (None, None) | (Some(_), Some(_)) => return Err(help()),
        };

        Ok(Self {
            dirs,
            execute_network,
        })
    }

    fn resolve_dirs(
        self,
    ) -> Result<another_dimension_transport::arti_adapter_spike::ArtiAppPrivateDirs, String> {
        match self.dirs {
            ManualBootstrapDirectoryInput::Explicit {
                state_dir,
                cache_dir,
            } => another_dimension_transport::arti_adapter_spike::ArtiAppPrivateDirs::new(
                state_dir, cache_dir,
            )
            .map_err(|_| {
                "invalid app-private Arti state/cache directories for manual bootstrap".to_string()
            }),
            ManualBootstrapDirectoryInput::ProfileScoped {
                profile,
                app_data_root,
            } => another_dimension_transport::arti_adapter_spike::ProfileScopedTransportDirs::from_app_data_root(
                app_data_root,
                &profile,
            )
            .map(another_dimension_transport::arti_adapter_spike::ProfileScopedTransportDirs::into_arti_dirs)
            .map_err(|_| "invalid profile-scoped transport directory root".to_string()),
        }
    }
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_bootstrap_help() -> String {
    "usage:
  another-dimension transport bootstrap --state-dir <absolute-app-private-dir> --cache-dir <absolute-app-private-dir> [--execute-network]
  another-dimension transport bootstrap --profile <name> --app-data-root <absolute-app-private-root> [--execute-network]

This is a local-only manual Arti bootstrap spike. It is not messaging, send/receive, or onion hosting."
        .to_string()
}

#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_lifecycle_help() -> String {
    "usage:
  another-dimension transport lifecycle bootstrap --state-dir <absolute-app-private-dir> --cache-dir <absolute-app-private-dir> [--execute-network]
  another-dimension transport lifecycle bootstrap --profile <name> --app-data-root <absolute-app-private-root> [--execute-network]

This is a local-only manual persistent Arti lifecycle spike. It is not messaging, send/receive, or onion hosting."
        .to_string()
}

#[cfg(feature = "dev-insecure")]
fn dev_main() -> Result<(), String> {
    use another_dimension_core::dev_insecure::DevApp;
    use another_dimension_crypto::dev_insecure::WARNING;
    use another_dimension_identity::{ContactId, ProfileName};
    use another_dimension_pairing::PairingPayload;
    use std::env;
    use std::fs;

    eprintln!("{WARNING}");

    let args = env::args().skip(1).collect::<Vec<_>>();
    let app = DevApp::new(dev_root());
    match args.as_slice() {
        [cmd, sub] if cmd == "demo" && sub == "local" => {
            run_dev_local_demo()?;
        }
        [cmd, sub, args @ ..] if cmd == "demo" && sub == "local-loop" => {
            run_dev_local_loop(parse_local_loop_messages(args)?)?;
        }
        [cmd, sub, name] if cmd == "profile" && sub == "init" => {
            let profile = ProfileName::new(name).map_err(|_| "invalid profile name")?;
            println!("{}", app.init_profile(profile).map_err(format_error)?);
        }
        [cmd, sub, flag, name] if cmd == "pairing" && sub == "start" && flag == "--profile" => {
            let profile = ProfileName::new(name).map_err(|_| "invalid profile name")?;
            println!("{}", app.pairing_start(profile).map_err(format_error)?);
        }
        [cmd, sub, flag, name, payload_file]
            if cmd == "pairing" && sub == "scan" && flag == "--profile" =>
        {
            let profile = ProfileName::new(name).map_err(|_| "invalid profile name")?;
            let payload_text = fs::read_to_string(payload_file)
                .map_err(|error| format!("failed to read payload: {error}"))?;
            let payload = PairingPayload::decode(&payload_text).map_err(|_| "invalid payload")?;
            let result = app.pairing_scan(profile, payload).map_err(format_error)?;
            eprintln!("pending contact: {}", result.contact_id);
            eprintln!("safety number: {}", result.safety_number);
            eprintln!("safety phrase: {}", result.safety_phrase);
            println!("{}", result.response_payload);
        }
        [cmd, sub, flag_profile, profile_name, flag_contact, contact]
            if cmd == "pairing"
                && sub == "confirm"
                && flag_profile == "--profile"
                && flag_contact == "--contact" =>
        {
            let profile = ProfileName::new(profile_name).map_err(|_| "invalid profile name")?;
            let contact = ContactId::new(contact).map_err(|_| "invalid contact id")?;
            println!(
                "{}",
                app.pairing_confirm(profile, contact)
                    .map_err(format_error)?
            );
        }
        [cmd, sub, flag_profile, profile_name, flag_contact, contact]
            if cmd == "pairing"
                && sub == "cancel"
                && flag_profile == "--profile"
                && flag_contact == "--contact" =>
        {
            let profile = ProfileName::new(profile_name).map_err(|_| "invalid profile name")?;
            let contact = ContactId::new(contact).map_err(|_| "invalid contact id")?;
            println!(
                "{}",
                app.pairing_cancel(profile, contact).map_err(format_error)?
            );
        }
        [cmd, sub, flag, name] if cmd == "pairing" && sub == "expire" && flag == "--profile" => {
            let profile = ProfileName::new(name).map_err(|_| "invalid profile name")?;
            println!("{}", app.pairing_expire(profile).map_err(format_error)?);
        }
        [cmd, sub, flag_from, from, flag_to, to, message @ ..]
            if cmd == "message" && sub == "send" && flag_from == "--from" && flag_to == "--to" =>
        {
            if message.is_empty() {
                return Err("missing message text".to_string());
            }
            let sender = ProfileName::new(from).map_err(|_| "invalid sender profile")?;
            let contact = ContactId::new(to).map_err(|_| "invalid contact id")?;
            println!(
                "{}",
                app.message_send(sender, contact, message.join(" "))
                    .map_err(format_error)?
            );
        }
        [cmd, sub, flag, name] if cmd == "message" && sub == "receive" && flag == "--profile" => {
            let profile = ProfileName::new(name).map_err(|_| "invalid profile name")?;
            let messages = app.message_receive(profile).map_err(format_error)?;
            for message in messages {
                println!("{message}");
            }
        }
        [cmd, sub, flag, name] if cmd == "message" && sub == "expire" && flag == "--profile" => {
            let profile = ProfileName::new(name).map_err(|_| "invalid profile name")?;
            println!("{}", app.message_expire(profile).map_err(format_error)?);
        }
        _ => {
            return Err(help());
        }
    }
    Ok(())
}

#[cfg(feature = "dev-insecure")]
fn run_dev_local_demo() -> Result<(), String> {
    use another_dimension_core::dev_insecure::DevApp;
    use another_dimension_identity::{ContactId, ProfileName};
    use another_dimension_pairing::PairingPayload;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    const MESSAGE: &str = "hello from the dev-insecure local demo";

    struct DemoWorkspace {
        root: PathBuf,
    }

    impl Drop for DemoWorkspace {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    let observed_at_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "system clock unavailable")?
        .as_millis();
    let root = std::env::temp_dir().join(format!(
        "another-dimension-demo-{}-{observed_at_ms}",
        std::process::id()
    ));
    fs::create_dir_all(&root).map_err(|_| "failed to create demo workspace")?;
    let workspace = DemoWorkspace { root };
    let app = DevApp::new(workspace.root.join("home"));
    let alice = ProfileName::new("alice").map_err(|_| "invalid demo profile")?;
    let bob = ProfileName::new("bob").map_err(|_| "invalid demo profile")?;
    let alice_contact = ContactId::new("alice").map_err(|_| "invalid demo contact")?;
    let bob_contact = ContactId::new("bob").map_err(|_| "invalid demo contact")?;

    println!("Another Dimension Chat dev-insecure local demo");
    println!();
    println!("This demonstrates the local prototype flow only.");
    println!("It is not a secure messenger release and does not use real transport.");

    println!();
    println!("== Create local profiles ==");
    println!("{}", app.init_profile(alice.clone()).map_err(format_error)?);
    println!("{}", app.init_profile(bob.clone()).map_err(format_error)?);

    println!();
    println!("== Exchange pairing payloads ==");
    let alice_payload = app.pairing_start(alice.clone()).map_err(format_error)?;
    let bob_scan = app
        .pairing_scan(
            bob.clone(),
            PairingPayload::decode(&alice_payload).map_err(|_| "invalid demo payload")?,
        )
        .map_err(format_error)?;
    let alice_scan = app
        .pairing_scan(
            alice.clone(),
            PairingPayload::decode(&bob_scan.response_payload)
                .map_err(|_| "invalid demo response payload")?,
        )
        .map_err(format_error)?;

    if bob_scan.safety_number != alice_scan.safety_number {
        return Err("demo safety numbers do not match".to_string());
    }
    if bob_scan.safety_phrase != alice_scan.safety_phrase {
        return Err("demo safety phrases do not match".to_string());
    }

    println!("safety number: {}", bob_scan.safety_number);
    println!("safety phrase: {}", bob_scan.safety_phrase);

    println!();
    println!("== Confirm pairing ==");
    println!(
        "{}",
        app.pairing_confirm(alice.clone(), bob_contact)
            .map_err(format_error)?
    );
    println!(
        "{}",
        app.pairing_confirm(bob.clone(), alice_contact)
            .map_err(format_error)?
    );

    println!();
    println!("== Send message ==");
    println!(
        "{}",
        app.message_send(
            alice,
            ContactId::new("bob").map_err(|_| "invalid demo contact")?,
            MESSAGE.to_string()
        )
        .map_err(format_error)?
    );

    println!();
    println!("== Receive as Bob ==");
    let received = app.message_receive(bob.clone()).map_err(format_error)?;
    for message in &received {
        println!("{message}");
    }
    if received != [MESSAGE.to_string()] {
        return Err("received message did not match demo message".to_string());
    }

    println!();
    println!("== Replay check ==");
    let replayed = app.message_receive(bob).map_err(format_error)?;
    if !replayed.is_empty() {
        return Err("second receive returned a replayed message".to_string());
    }
    println!("second receive returned no replayed messages");

    println!();
    println!("== Demo complete ==");
    println!("dev-insecure local CLI flow completed");
    Ok(())
}

#[cfg(feature = "dev-insecure")]
fn parse_local_loop_messages(args: &[String]) -> Result<Vec<String>, String> {
    let mut messages = Vec::new();
    let mut index = 0;
    while index < args.len() {
        match args[index].as_str() {
            "--message" => {
                index += 1;
                let message = args
                    .get(index)
                    .ok_or_else(|| local_loop_help())?
                    .trim()
                    .to_string();
                if message.is_empty() {
                    return Err("local loop message must not be empty".to_string());
                }
                messages.push(message);
            }
            _ => return Err(local_loop_help()),
        }
        index += 1;
    }

    if messages.is_empty() {
        return Err(local_loop_help());
    }
    Ok(messages)
}

#[cfg(feature = "dev-insecure")]
fn run_dev_local_loop(messages: Vec<String>) -> Result<(), String> {
    use another_dimension_core::dev_insecure::DevApp;
    use another_dimension_identity::{ContactId, ProfileName};
    use another_dimension_pairing::PairingPayload;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct LoopWorkspace {
        root: PathBuf,
    }

    impl Drop for LoopWorkspace {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    let observed_at_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "system clock unavailable")?
        .as_millis();
    let root = std::env::temp_dir().join(format!(
        "another-dimension-loop-{}-{observed_at_ms}",
        std::process::id()
    ));
    fs::create_dir_all(&root).map_err(|_| "failed to create local loop workspace")?;
    let workspace = LoopWorkspace { root };
    let app = DevApp::new(workspace.root.join("home"));
    let alice = ProfileName::new("alice").map_err(|_| "invalid loop profile")?;
    let bob = ProfileName::new("bob").map_err(|_| "invalid loop profile")?;
    let alice_contact = ContactId::new("alice").map_err(|_| "invalid loop contact")?;
    let bob_contact = ContactId::new("bob").map_err(|_| "invalid loop contact")?;

    println!("Another Dimension Chat dev-insecure local message loop");
    println!();
    println!("This demonstrates repeatable local prototype messaging only.");
    println!("It is not a secure messenger release and does not use real transport.");

    println!();
    println!("== Create local profiles ==");
    println!("{}", app.init_profile(alice.clone()).map_err(format_error)?);
    println!("{}", app.init_profile(bob.clone()).map_err(format_error)?);

    println!();
    println!("== Exchange pairing payloads ==");
    let alice_payload = app.pairing_start(alice.clone()).map_err(format_error)?;
    let bob_scan = app
        .pairing_scan(
            bob.clone(),
            PairingPayload::decode(&alice_payload).map_err(|_| "invalid loop payload")?,
        )
        .map_err(format_error)?;
    let alice_scan = app
        .pairing_scan(
            alice.clone(),
            PairingPayload::decode(&bob_scan.response_payload)
                .map_err(|_| "invalid loop response payload")?,
        )
        .map_err(format_error)?;

    if bob_scan.safety_number != alice_scan.safety_number {
        return Err("local loop safety numbers do not match".to_string());
    }
    if bob_scan.safety_phrase != alice_scan.safety_phrase {
        return Err("local loop safety phrases do not match".to_string());
    }
    println!("safety number: {}", bob_scan.safety_number);
    println!("safety phrase: {}", bob_scan.safety_phrase);

    println!();
    println!("== Confirm pairing ==");
    println!(
        "{}",
        app.pairing_confirm(alice.clone(), bob_contact)
            .map_err(format_error)?
    );
    println!(
        "{}",
        app.pairing_confirm(bob.clone(), alice_contact)
            .map_err(format_error)?
    );

    for (index, message) in messages.iter().enumerate() {
        let message_number = index + 1;
        println!();
        println!("== Local message {message_number} ==");
        println!(
            "{}",
            app.message_send(
                alice.clone(),
                ContactId::new("bob").map_err(|_| "invalid loop contact")?,
                message.clone()
            )
            .map_err(format_error)?
        );
        let received = app.message_receive(bob.clone()).map_err(format_error)?;
        if received != [message.clone()] {
            return Err(format!(
                "received message {message_number} did not match local loop message"
            ));
        }
        println!("received by bob: {message}");
        let replayed = app.message_receive(bob.clone()).map_err(format_error)?;
        if !replayed.is_empty() {
            return Err(format!("message {message_number} replayed after receive"));
        }
        println!("replay check: no replayed messages after message {message_number}");
    }

    println!();
    println!("== Expire received queue ==");
    println!("{}", app.message_expire(bob).map_err(format_error)?);

    for message in &messages {
        if path_contains_bytes(&workspace.root, message.as_bytes()) {
            return Err("local loop plaintext body persisted in dev store".to_string());
        }
    }
    println!("dev store plaintext guard passed");

    println!();
    println!("== Loop complete ==");
    println!(
        "dev-insecure local message loop completed: {} messages",
        messages.len()
    );
    Ok(())
}

#[cfg(feature = "dev-insecure")]
fn path_contains_bytes(root: &std::path::Path, needle: &[u8]) -> bool {
    if needle.is_empty() || !root.exists() {
        return false;
    }
    let Ok(entries) = std::fs::read_dir(root) else {
        return false;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if path_contains_bytes(&path, needle) {
                return true;
            }
        } else if path.is_file() {
            if let Ok(bytes) = std::fs::read(&path) {
                if bytes.windows(needle.len()).any(|window| window == needle) {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(feature = "dev-insecure")]
fn local_loop_help() -> String {
    "usage:
  another-dimension demo local-loop --message <text> [--message <text> ...]

boundary:
  dev-insecure local loop only
  no real transport, production E2EE, or secure messenger release behavior"
        .to_string()
}

#[cfg(feature = "dev-insecure")]
fn dev_root() -> std::path::PathBuf {
    std::env::var_os("AD_DEV_HOME")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::path::PathBuf::from(".another-dimension-prototype"))
}

#[cfg(feature = "dev-insecure")]
fn format_error(error: another_dimension_core::dev_insecure::CoreError) -> String {
    use another_dimension_core::dev_insecure::CoreError;
    match error {
        CoreError::ProfileMissing(profile) => format!("profile not found: {profile}"),
        CoreError::ContactNotActive(contact) => {
            format!("contact is not active yet: {contact}. Confirm pairing before sending.")
        }
        CoreError::PairingAlreadyPending(contact) => {
            format!("pending pairing already exists: {contact}. Confirm, cancel, or expire it before retrying.")
        }
        CoreError::ContactAlreadyActive(contact) => {
            format!("contact already active: {contact}. New pairing is not allowed for an active contact.")
        }
        CoreError::Pairing(another_dimension_pairing::PairingError::ExpiredPayload) => {
            "pairing payload expired. Start a fresh pairing.".to_string()
        }
        CoreError::Pairing(another_dimension_pairing::PairingError::InvalidPayload) => {
            "invalid pairing payload".to_string()
        }
        CoreError::Pairing(another_dimension_pairing::PairingError::PayloadTooLarge) => {
            "pairing payload exceeds QR budget".to_string()
        }
        CoreError::Pairing(another_dimension_pairing::PairingError::RandomnessUnavailable) => {
            "secure randomness unavailable".to_string()
        }
        CoreError::Pairing(another_dimension_pairing::PairingError::ClockUnavailable) => {
            "system clock unavailable".to_string()
        }
        CoreError::Storage(_) => "storage operation failed".to_string(),
        CoreError::Transport(_) => "transport operation failed".to_string(),
        CoreError::Crypto(_) => "crypto operation failed".to_string(),
        CoreError::Protocol(_) => "protocol operation failed".to_string(),
        CoreError::InvalidInput => "invalid input".to_string(),
    }
}

#[cfg(feature = "dev-insecure")]
fn help() -> String {
    "usage:
  another-dimension demo local
  another-dimension demo local-loop --message <text> [--message <text> ...]
  another-dimension profile init <name>
  another-dimension pairing start --profile <name>
  another-dimension pairing scan --profile <name> <payload-file>
  another-dimension pairing confirm --profile <name> --contact <id>
  another-dimension pairing cancel --profile <name> --contact <id>
  another-dimension pairing expire --profile <name>
  another-dimension message send --from <profile> --to <contact> <text>
  another-dimension message receive --profile <name>
  another-dimension message expire --profile <name>

pairing retry:
  pending contact: confirm, cancel, or expire before scanning again
  active contact: new pairing is rejected in this prototype"
        .to_string()
}

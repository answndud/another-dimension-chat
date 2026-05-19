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
        [cmd, sub] if cmd == "production" && sub == "self-test" => {
            run_production_self_test()?;
            eprintln!("warning: production self-test is not a secure messenger release");
            println!("production boundary self-test passed");
        }
        #[cfg(feature = "arti-manual-bootstrap")]
        [cmd, sub, args @ ..] if cmd == "transport" && sub == "bootstrap" => {
            run_manual_bootstrap_command(args)?;
        }
        _ => {
            return Err(
                "another-dimension prototype commands require --features dev-insecure".to_string(),
            );
        }
    }
    Ok(())
}

#[cfg(not(feature = "dev-insecure"))]
fn run_production_self_test() -> Result<(), String> {
    use another_dimension_core::production::{
        establish_envelope_session_from_setup_drafts, production_setup_draft_with_defaults,
    };
    use another_dimension_identity::ProfileName;
    use another_dimension_protocol::{ProtocolError, ReplayWindow};

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
    if decrypted == plaintext
        && matches!(
            replay_result,
            Err(
                another_dimension_core::production::ProductionSessionError::Protocol(
                    ProtocolError::ReplayMessage
                )
            )
        )
    {
        Ok(())
    } else {
        Err("production boundary self-test failed".to_string())
    }
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
    println!(
        "manual bootstrap attempt summary: permission={:?} timeout_seconds={} usable_transport=false",
        gate.summary().network_permission(),
        gate.summary().timeout_seconds()
    );

    result.map_err(|error| format!("manual bootstrap attempt failed: {error:?}"))
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
                    return Err(manual_bootstrap_help());
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
            _ => return Err(manual_bootstrap_help()),
        };
        let profile_scoped = match (profile, app_data_root) {
            (Some(profile), Some(app_data_root)) => {
                Some(ManualBootstrapDirectoryInput::ProfileScoped {
                    profile,
                    app_data_root,
                })
            }
            (None, None) => None,
            _ => return Err(manual_bootstrap_help()),
        };

        let dirs = match (profile_scoped, explicit) {
            (Some(dirs), None) | (None, Some(dirs)) => dirs,
            (None, None) | (Some(_), Some(_)) => return Err(manual_bootstrap_help()),
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

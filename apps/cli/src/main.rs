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

#[cfg(not(feature = "dev-insecure"))]
use std::process::Stdio;
use std::process::{Command, Output};

#[cfg(feature = "dev-insecure")]
use std::path::{Path, PathBuf};

fn binary() -> &'static str {
    env!("CARGO_BIN_EXE_another-dimension")
}

fn run(args: &[&str]) -> Output {
    Command::new(binary())
        .args(args)
        .output()
        .expect("failed to run another-dimension binary")
}

#[cfg(not(feature = "dev-insecure"))]
fn run_with_stdin(args: &[&str], stdin: &str) -> Output {
    use std::io::Write;

    let mut child = Command::new(binary())
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("failed to spawn another-dimension binary");
    child
        .stdin
        .as_mut()
        .expect("stdin pipe")
        .write_all(stdin.as_bytes())
        .expect("failed to write stdin");
    child
        .wait_with_output()
        .expect("failed to run another-dimension binary")
}

#[cfg(feature = "dev-insecure")]
fn run_with_home(home: &Path, args: &[&str]) -> Output {
    Command::new(binary())
        .env("AD_DEV_HOME", home)
        .args(args)
        .output()
        .expect("failed to run another-dimension binary")
}

fn stderr(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).into_owned()
}

fn stdout(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).into_owned()
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn default_build_rejects_prototype_commands() {
    let output = run(&["profile", "init", "alice"]);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    let error = stderr(&output);
    assert!(error.contains("default build exposes only boundary commands"));
    assert!(error.contains("production self-test"));
    assert!(error.contains("not a secure messenger release"));
    assert!(error.contains("performs no network I/O and opens no local storage"));
    assert!(error.contains("require --features dev-insecure"));
    assert!(!error.contains("Start chat"));
    assert!(!error.contains("Send message"));
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn default_build_help_lists_only_boundary_commands() {
    let output = run(&["--help"]);

    assert!(output.status.success());
    assert!(stderr(&output).is_empty());
    let out = stdout(&output);
    assert!(out.contains("production self-test"));
    assert!(out.contains("production preflight"));
    assert!(out.contains("production profile init"));
    assert!(out.contains("production profile status"));
    assert!(out.contains("production identity init"));
    assert!(out.contains("production identity status"));
    assert!(out.contains("production pairing payload create"));
    assert!(out.contains("production pairing session prepare"));
    assert!(out.contains("production pairing session save-draft"));
    assert!(out.contains("production pairing session status"));
    assert!(out.contains("production pairing session load-runtime"));
    assert!(out.contains("production pairing session open-runtime"));
    assert!(out.contains("production pairing session transport-prepare"));
    assert!(out.contains("production pairing session handshake-init"));
    assert!(out.contains("production pairing session handshake-init-export"));
    assert!(out.contains("production pairing session handshake-init-import"));
    assert!(out.contains("production pairing session handshake-reply-export"));
    assert!(out.contains("production pairing session handshake-finish-export"));
    assert!(out.contains("production pairing session handshake-finish-import"));
    assert!(out.contains("production message send-prepare"));
    assert!(out.contains("production message local-roundtrip"));
    assert!(out.contains("production message pending-status"));
    assert!(out.contains("production message outbound-encrypt-prepare"));
    assert!(out.contains("production message outbound-envelope-export"));
    assert!(out.contains("production message inbound-decrypt-import"));
    assert!(out.contains("production message received-status"));
    assert!(out.contains("production message received-export"));
    assert!(out.contains("not a secure messenger release"));
    assert!(out.contains("no usable messaging"));
    assert!(out.contains("performs no network I/O and opens no local storage"));
    assert!(out.contains("preflight is read-only"));
    assert!(out.contains("storage-only"));
    assert!(out.contains("require --features dev-insecure"));
    assert!(!out.contains("pairing start"));
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn default_build_rejects_production_skeleton_commands() {
    let forbidden_commands = [
        &["message", "send", "--from", "alice", "--to", "bob", "hello"][..],
        &["message", "receive", "--profile", "bob"],
        &["pairing", "start", "--profile", "alice"],
        &[
            "pairing",
            "confirm",
            "--profile",
            "alice",
            "--contact",
            "bob",
        ],
        &["storage", "unlock", "--profile", "alice"],
        &["transport", "send", "--to", "bob.onion"],
        &["transport", "receive", "--profile", "alice"],
        &["transport", "bootstrap"],
        &["profile", "init", "alice"],
    ];

    for args in forbidden_commands {
        let output = run(args);

        assert!(
            !output.status.success(),
            "command unexpectedly succeeded: {args:?}"
        );
        assert!(stdout(&output).is_empty(), "command wrote stdout: {args:?}");
        let error = stderr(&output);
        assert!(
            error.contains("default build exposes only boundary commands"),
            "missing boundary error for {args:?}: {error}"
        );
        assert!(
            error.contains("no usable messaging, pairing, transport bootstrap, or long-lived storage unlock command is exposed"),
            "missing default non-command boundary for {args:?}: {error}"
        );
        assert!(
            error.contains(
                "prototype profile/pairing/message commands require --features dev-insecure"
            ),
            "missing dev-insecure feature boundary for {args:?}: {error}"
        );
    }
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn production_profile_init_creates_encrypted_store_without_opening_messaging() {
    let root = temp_cli_path("production-profile-init");
    if root.exists() {
        std::fs::remove_dir_all(&root).expect("remove stale root");
    }
    std::fs::create_dir_all(&root).expect("create root");
    let store = root.join("profile.db");
    let store_arg = store.to_str().expect("store path");

    let output = run_with_stdin(
        &[
            "production",
            "profile",
            "init",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let out = stdout(&output);
    let error = stderr(&output);

    assert!(output.status.success(), "stdout: {out}\nstderr: {error}");
    assert!(out.contains("production profile initialized:"));
    assert!(out.contains("storage_opened=true"));
    assert!(out.contains("profile_marker_written=true"));
    assert!(out.contains("key_material_exposed=false"));
    assert!(out.contains("transport_io_opened=false"));
    assert!(out.contains("runtime_messaging=false"));
    assert!(error.contains("storage-only"));
    assert!(store.exists());
    assert!(!out.contains("alice"));
    assert!(!out.contains(store_arg));
    assert!(!out.contains("correct horse"));
    assert!(!error.contains("alice"));
    assert!(!error.contains(store_arg));
    assert!(!error.contains("correct horse"));

    let wrong = run_with_stdin(
        &[
            "production",
            "profile",
            "init",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "wrong passphrase\n",
    );
    let wrong_out = stdout(&wrong);
    let wrong_error = stderr(&wrong);

    assert!(!wrong.status.success());
    assert!(wrong_out.is_empty());
    assert!(wrong_error.contains("unlock failed"));
    assert!(!wrong_error.contains("alice"));
    assert!(!wrong_error.contains(store_arg));
    assert!(!wrong_error.contains("wrong passphrase"));

    let _ = std::fs::remove_dir_all(root);
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn production_profile_status_reopens_encrypted_store_without_opening_messaging() {
    let root = temp_cli_path("production-profile-status");
    if root.exists() {
        std::fs::remove_dir_all(&root).expect("remove stale root");
    }
    std::fs::create_dir_all(&root).expect("create root");
    let store = root.join("profile.db");
    let store_arg = store.to_str().expect("store path");

    let missing = run_with_stdin(
        &[
            "production",
            "profile",
            "status",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let missing_out = stdout(&missing);
    let missing_error = stderr(&missing);

    assert!(
        missing.status.success(),
        "stdout: {missing_out}\nstderr: {missing_error}"
    );
    assert!(missing_out.contains("production profile status:"));
    assert!(missing_out.contains("storage_opened=true"));
    assert!(missing_out.contains("profile_marker_present=false"));
    assert!(missing_out.contains("key_material_exposed=false"));
    assert!(missing_out.contains("transport_io_opened=false"));
    assert!(missing_out.contains("runtime_messaging=false"));
    assert!(missing_error.contains("storage-only"));
    assert!(!missing_out.contains("alice"));
    assert!(!missing_out.contains(store_arg));
    assert!(!missing_error.contains("correct horse"));

    let init = run_with_stdin(
        &[
            "production",
            "profile",
            "init",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    assert!(init.status.success());

    let present = run_with_stdin(
        &[
            "production",
            "profile",
            "status",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let present_out = stdout(&present);
    let present_error = stderr(&present);

    assert!(
        present.status.success(),
        "stdout: {present_out}\nstderr: {present_error}"
    );
    assert!(present_out.contains("profile_marker_present=true"));
    assert!(present_out.contains("runtime_messaging=false"));
    assert!(!present_out.contains("alice"));
    assert!(!present_out.contains(store_arg));
    assert!(!present_error.contains("correct horse"));

    let wrong = run_with_stdin(
        &[
            "production",
            "profile",
            "status",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "wrong passphrase\n",
    );
    let wrong_error = stderr(&wrong);

    assert!(!wrong.status.success());
    assert!(stdout(&wrong).is_empty());
    assert!(wrong_error.contains("unlock failed"));
    assert!(!wrong_error.contains("alice"));
    assert!(!wrong_error.contains(store_arg));
    assert!(!wrong_error.contains("wrong passphrase"));

    let _ = std::fs::remove_dir_all(root);
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn production_identity_init_and_status_use_encrypted_store_without_opening_messaging() {
    let root = temp_cli_path("production-identity");
    if root.exists() {
        std::fs::remove_dir_all(&root).expect("remove stale root");
    }
    std::fs::create_dir_all(&root).expect("create root");
    let store = root.join("profile.db");
    let store_arg = store.to_str().expect("store path");

    let missing_profile = run_with_stdin(
        &[
            "production",
            "identity",
            "status",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let missing_profile_error = stderr(&missing_profile);
    assert!(!missing_profile.status.success());
    assert!(stdout(&missing_profile).is_empty());
    assert!(missing_profile_error.contains("profile marker missing"));
    assert!(!missing_profile_error.contains("alice"));
    assert!(!missing_profile_error.contains(store_arg));
    assert!(!missing_profile_error.contains("correct horse"));

    let init_profile = run_with_stdin(
        &[
            "production",
            "profile",
            "init",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    assert!(init_profile.status.success());

    let missing_identity = run_with_stdin(
        &[
            "production",
            "identity",
            "status",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let missing_identity_out = stdout(&missing_identity);
    let missing_identity_error = stderr(&missing_identity);
    assert!(missing_identity.status.success());
    assert!(missing_identity_out.contains("production identity status:"));
    assert!(missing_identity_out.contains("storage_opened=true"));
    assert!(missing_identity_out.contains("identity_private_key_present=false"));
    assert!(missing_identity_out.contains("identity_public_key_derivable=false"));
    assert!(missing_identity_out.contains("key_material_exposed=false"));
    assert!(missing_identity_out.contains("transport_io_opened=false"));
    assert!(missing_identity_out.contains("runtime_messaging=false"));
    assert!(missing_identity_error.contains("storage-only"));
    assert!(!missing_identity_out.contains("alice"));
    assert!(!missing_identity_out.contains(store_arg));
    assert!(!missing_identity_error.contains("correct horse"));

    let init_identity = run_with_stdin(
        &[
            "production",
            "identity",
            "init",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let init_identity_out = stdout(&init_identity);
    let init_identity_error = stderr(&init_identity);
    assert!(
        init_identity.status.success(),
        "stdout: {init_identity_out}\nstderr: {init_identity_error}"
    );
    assert!(init_identity_out.contains("production identity initialized:"));
    assert!(init_identity_out.contains("identity_private_key_written=true"));
    assert!(init_identity_out.contains("identity_public_key_derivable=true"));
    assert!(init_identity_out.contains("key_material_exposed=false"));
    assert!(init_identity_out.contains("transport_io_opened=false"));
    assert!(init_identity_out.contains("runtime_messaging=false"));
    assert!(init_identity_error.contains("storage-only"));
    assert!(!init_identity_out.contains("alice"));
    assert!(!init_identity_out.contains(store_arg));
    assert!(!init_identity_out.contains("ed25519"));
    assert!(!init_identity_error.contains("correct horse"));

    let present = run_with_stdin(
        &[
            "production",
            "identity",
            "status",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let present_out = stdout(&present);
    let present_error = stderr(&present);
    assert!(present.status.success());
    assert!(present_out.contains("identity_private_key_present=true"));
    assert!(present_out.contains("identity_public_key_derivable=true"));
    assert!(present_out.contains("runtime_messaging=false"));
    assert!(!present_out.contains("alice"));
    assert!(!present_out.contains(store_arg));
    assert!(!present_out.contains("ed25519"));
    assert!(!present_error.contains("correct horse"));

    let wrong = run_with_stdin(
        &[
            "production",
            "identity",
            "status",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "wrong passphrase\n",
    );
    let wrong_error = stderr(&wrong);
    assert!(!wrong.status.success());
    assert!(stdout(&wrong).is_empty());
    assert!(wrong_error.contains("unlock failed"));
    assert!(!wrong_error.contains("alice"));
    assert!(!wrong_error.contains(store_arg));
    assert!(!wrong_error.contains("wrong passphrase"));

    let _ = std::fs::remove_dir_all(root);
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_payload_create_uses_stored_identity_without_opening_messaging() {
    let root = temp_cli_path("production-pairing-payload");
    if root.exists() {
        std::fs::remove_dir_all(&root).expect("remove stale root");
    }
    std::fs::create_dir_all(&root).expect("create root");
    let store = root.join("profile.db");
    let payload = root.join("alice-pairing.txt");
    let store_arg = store.to_str().expect("store path");
    let payload_arg = payload.to_str().expect("payload path");

    let missing_profile = run_with_stdin(
        &[
            "production",
            "pairing",
            "payload",
            "create",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--rendezvous-endpoint",
            "alice.onion",
            "--out",
            payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let missing_profile_error = stderr(&missing_profile);
    assert!(!missing_profile.status.success());
    assert!(stdout(&missing_profile).is_empty());
    assert!(missing_profile_error.contains("profile marker missing"));
    assert!(!missing_profile_error.contains("alice"));
    assert!(!missing_profile_error.contains(store_arg));
    assert!(!missing_profile_error.contains(payload_arg));
    assert!(!payload.exists());

    let init_profile = run_with_stdin(
        &[
            "production",
            "profile",
            "init",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    assert!(init_profile.status.success());

    let missing_identity = run_with_stdin(
        &[
            "production",
            "pairing",
            "payload",
            "create",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--rendezvous-endpoint",
            "alice.onion",
            "--out",
            payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let missing_identity_error = stderr(&missing_identity);
    assert!(!missing_identity.status.success());
    assert!(stdout(&missing_identity).is_empty());
    assert!(missing_identity_error.contains("identity private key missing"));
    assert!(!missing_identity_error.contains("alice"));
    assert!(!missing_identity_error.contains(store_arg));
    assert!(!payload.exists());

    let init_identity = run_with_stdin(
        &[
            "production",
            "identity",
            "init",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    assert!(init_identity.status.success());

    let create = run_with_stdin(
        &[
            "production",
            "pairing",
            "payload",
            "create",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--rendezvous-endpoint",
            "alice.onion",
            "--out",
            payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let create_out = stdout(&create);
    let create_error = stderr(&create);
    assert!(
        create.status.success(),
        "stdout: {create_out}\nstderr: {create_error}"
    );
    assert!(create_out.contains("production pairing payload created:"));
    assert!(create_out.contains("storage_opened=true"));
    assert!(create_out.contains("identity_private_key_loaded=true"));
    assert!(create_out.contains("noise_static_private_key_written=true"));
    assert!(create_out.contains("payload_written=true"));
    assert!(create_out.contains("key_material_exposed=false"));
    assert!(create_out.contains("transport_io_opened=false"));
    assert!(create_out.contains("runtime_messaging=false"));
    assert!(create_error.contains("storage-only"));
    assert!(!create_out.contains("alice"));
    assert!(!create_out.contains(store_arg));
    assert!(!create_out.contains(payload_arg));
    assert!(!create_out.contains("ed25519"));
    assert!(!create_error.contains("correct horse"));

    let encoded = std::fs::read_to_string(&payload).expect("payload file");
    let decoded =
        another_dimension_pairing::PairingPayload::decode(&encoded).expect("payload decodes");
    assert_eq!(decoded.owner_profile.as_str(), "alice");
    assert_eq!(decoded.rendezvous_endpoint, "alice.onion");
    assert!(decoded
        .pairwise_public_key
        .as_str()
        .starts_with("ed25519-dalek-v2:"));
    assert!(decoded
        .pairwise_signature
        .as_str()
        .starts_with("ed25519-dalek-v2:"));
    assert!(decoded.prekey_bundle.starts_with("adnoise1:"));

    let wrong = run_with_stdin(
        &[
            "production",
            "pairing",
            "payload",
            "create",
            "--profile",
            "alice",
            "--store",
            store_arg,
            "--rendezvous-endpoint",
            "alice.onion",
            "--out",
            payload_arg,
            "--passphrase-stdin",
        ],
        "wrong passphrase\n",
    );
    let wrong_error = stderr(&wrong);
    assert!(!wrong.status.success());
    assert!(stdout(&wrong).is_empty());
    assert!(wrong_error.contains("unlock failed"));
    assert!(!wrong_error.contains("alice"));
    assert!(!wrong_error.contains(store_arg));
    assert!(!wrong_error.contains(payload_arg));
    assert!(!wrong_error.contains("wrong passphrase"));

    let _ = std::fs::remove_dir_all(root);
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn production_pairing_session_prepare_uses_stored_noise_key_without_opening_transport() {
    let root = temp_cli_path("production-session-prepare");
    if root.exists() {
        std::fs::remove_dir_all(&root).expect("remove stale root");
    }
    std::fs::create_dir_all(&root).expect("create root");
    let alice_store = root.join("alice.db");
    let bob_store = root.join("bob.db");
    let alice_payload = root.join("alice-pairing.txt");
    let bob_payload = root.join("bob-pairing.txt");
    let plaintext = root.join("message.txt");
    let handshake_init_export = root.join("handshake-init.txt");
    let bob_handshake_init_export = root.join("bob-handshake-init.txt");
    let handshake_reply_export = root.join("handshake-reply.txt");
    let handshake_finish_export = root.join("handshake-finish.txt");
    let encrypted_envelope_export = root.join("encrypted-envelope.txt");
    let received_plaintext_export = root.join("received-message.txt");
    let alice_store_arg = alice_store.to_str().expect("alice store path");
    let bob_store_arg = bob_store.to_str().expect("bob store path");
    let alice_payload_arg = alice_payload.to_str().expect("alice payload path");
    let bob_payload_arg = bob_payload.to_str().expect("bob payload path");
    let plaintext_arg = plaintext.to_str().expect("plaintext path");
    let handshake_init_export_arg = handshake_init_export
        .to_str()
        .expect("handshake init export path");
    let bob_handshake_init_export_arg = bob_handshake_init_export
        .to_str()
        .expect("bob handshake init export path");
    let handshake_reply_export_arg = handshake_reply_export
        .to_str()
        .expect("handshake reply export path");
    let handshake_finish_export_arg = handshake_finish_export
        .to_str()
        .expect("handshake finish export path");
    let encrypted_envelope_export_arg = encrypted_envelope_export
        .to_str()
        .expect("encrypted envelope export path");
    let received_plaintext_export_arg = received_plaintext_export
        .to_str()
        .expect("received plaintext export path");

    let missing_profile = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "prepare",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--local-payload",
            alice_payload_arg,
            "--remote-payload",
            bob_payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let missing_profile_error = stderr(&missing_profile);
    assert!(!missing_profile.status.success());
    assert!(stdout(&missing_profile).is_empty());
    assert!(missing_profile_error.contains("payload read failed"));
    assert!(!missing_profile_error.contains("alice"));
    assert!(!missing_profile_error.contains(alice_store_arg));
    assert!(!missing_profile_error.contains(alice_payload_arg));

    for (profile, store_arg) in [("alice", alice_store_arg), ("bob", bob_store_arg)] {
        let init_profile = run_with_stdin(
            &[
                "production",
                "profile",
                "init",
                "--profile",
                profile,
                "--store",
                store_arg,
                "--passphrase-stdin",
            ],
            "correct horse battery staple\n",
        );
        assert!(init_profile.status.success());

        let init_identity = run_with_stdin(
            &[
                "production",
                "identity",
                "init",
                "--profile",
                profile,
                "--store",
                store_arg,
                "--passphrase-stdin",
            ],
            "correct horse battery staple\n",
        );
        assert!(init_identity.status.success());
    }

    let alice_create = run_with_stdin(
        &[
            "production",
            "pairing",
            "payload",
            "create",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--rendezvous-endpoint",
            "alice.onion",
            "--out",
            alice_payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    assert!(alice_create.status.success());

    let bob_create = run_with_stdin(
        &[
            "production",
            "pairing",
            "payload",
            "create",
            "--profile",
            "bob",
            "--store",
            bob_store_arg,
            "--rendezvous-endpoint",
            "bob.onion",
            "--out",
            bob_payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    assert!(bob_create.status.success());

    let prepare = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "prepare",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--local-payload",
            alice_payload_arg,
            "--remote-payload",
            bob_payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let prepare_out = stdout(&prepare);
    let prepare_error = stderr(&prepare);
    assert!(
        prepare.status.success(),
        "stdout: {prepare_out}\nstderr: {prepare_error}"
    );
    assert!(prepare_out.contains("production pairing session prepared:"));
    assert!(prepare_out.contains("storage_opened=true"));
    assert!(prepare_out.contains("session_plan_created=true"));
    assert!(prepare_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(prepare_out.contains("local_noise_static_matches_payload=true"));
    assert!(prepare_out.contains("safety_transcript_bound=true"));
    assert!(prepare_out.contains("canonical_dialer_selected=true"));
    assert!(prepare_out.contains("key_material_exposed=false"));
    assert!(prepare_out.contains("transport_io_opened=false"));
    assert!(prepare_out.contains("runtime_messaging=false"));
    assert!(prepare_error.contains("storage-only"));
    assert!(!prepare_out.contains("alice"));
    assert!(!prepare_out.contains(alice_store_arg));
    assert!(!prepare_out.contains(alice_payload_arg));
    assert!(!prepare_out.contains("ed25519"));
    assert!(!prepare_error.contains("correct horse"));

    let empty_status = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "status",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let empty_status_out = stdout(&empty_status);
    let empty_status_error = stderr(&empty_status);
    assert!(
        empty_status.status.success(),
        "stdout: {empty_status_out}\nstderr: {empty_status_error}"
    );
    assert!(empty_status_out.contains("production pairing session status:"));
    assert!(empty_status_out.contains("session_draft_present=false"));
    assert!(empty_status_out.contains("channel_id_derivable=false"));
    assert!(empty_status_out.contains("remote_endpoint_state_present=false"));
    assert!(empty_status_out.contains("replay_window_present=false"));
    assert!(empty_status_out.contains("transport_io_opened=false"));
    assert!(empty_status_out.contains("runtime_messaging=false"));
    assert!(!empty_status_out.contains("alice"));
    assert!(!empty_status_out.contains(alice_store_arg));
    assert!(!empty_status_error.contains("correct horse"));

    let save_draft = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "save-draft",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--local-payload",
            alice_payload_arg,
            "--remote-payload",
            bob_payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let save_draft_out = stdout(&save_draft);
    let save_draft_error = stderr(&save_draft);
    assert!(
        save_draft.status.success(),
        "stdout: {save_draft_out}\nstderr: {save_draft_error}"
    );
    assert!(save_draft_out.contains("production pairing session draft saved:"));
    assert!(save_draft_out.contains("storage_opened=true"));
    assert!(save_draft_out.contains("session_plan_created=true"));
    assert!(save_draft_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(save_draft_out.contains("local_noise_static_matches_payload=true"));
    assert!(save_draft_out.contains("session_draft_written=true"));
    assert!(save_draft_out.contains("remote_endpoint_state_written=true"));
    assert!(save_draft_out.contains("replay_window_written=true"));
    assert!(save_draft_out.contains("channel_id_derivable=true"));
    assert!(save_draft_out.contains("key_material_exposed=false"));
    assert!(save_draft_out.contains("transport_io_opened=false"));
    assert!(save_draft_out.contains("runtime_messaging=false"));
    assert!(save_draft_error.contains("storage-only"));
    assert!(!save_draft_out.contains("alice"));
    assert!(!save_draft_out.contains(alice_store_arg));
    assert!(!save_draft_out.contains(alice_payload_arg));
    assert!(!save_draft_out.contains("ed25519"));
    assert!(!save_draft_error.contains("correct horse"));

    let bob_save_draft = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "save-draft",
            "--profile",
            "bob",
            "--store",
            bob_store_arg,
            "--local-payload",
            bob_payload_arg,
            "--remote-payload",
            alice_payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let bob_save_draft_out = stdout(&bob_save_draft);
    let bob_save_draft_error = stderr(&bob_save_draft);
    assert!(
        bob_save_draft.status.success(),
        "stdout: {bob_save_draft_out}\nstderr: {bob_save_draft_error}"
    );
    assert!(bob_save_draft_out.contains("session_draft_written=true"));
    assert!(!bob_save_draft_out.contains("bob"));
    assert!(!bob_save_draft_out.contains(bob_store_arg));
    assert!(!bob_save_draft_error.contains("correct horse"));

    let status = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "status",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let status_out = stdout(&status);
    let status_error = stderr(&status);
    assert!(
        status.status.success(),
        "stdout: {status_out}\nstderr: {status_error}"
    );
    assert!(status_out.contains("production pairing session status:"));
    assert!(status_out.contains("storage_opened=true"));
    assert!(status_out.contains("session_draft_present=true"));
    assert!(status_out.contains("channel_id_derivable=true"));
    assert!(status_out.contains("local_role_available=true"));
    assert!(status_out.contains("remote_contact_present=true"));
    assert!(status_out.contains("remote_endpoint_state_present=true"));
    assert!(status_out.contains("replay_window_present=true"));
    assert!(status_out.contains("key_material_exposed=false"));
    assert!(status_out.contains("transport_io_opened=false"));
    assert!(status_out.contains("runtime_messaging=false"));
    assert!(status_error.contains("storage-only"));
    assert!(!status_out.contains("alice"));
    assert!(!status_out.contains(alice_store_arg));
    assert!(!status_out.contains("adchan1"));
    assert!(!status_error.contains("correct horse"));

    let runtime = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "load-runtime",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let runtime_out = stdout(&runtime);
    let runtime_error = stderr(&runtime);
    assert!(
        runtime.status.success(),
        "stdout: {runtime_out}\nstderr: {runtime_error}"
    );
    assert!(runtime_out.contains("production pairing session runtime loaded:"));
    assert!(runtime_out.contains("storage_opened=true"));
    assert!(runtime_out.contains("session_draft_loaded=true"));
    assert!(runtime_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(runtime_out.contains("local_noise_static_matches_draft=true"));
    assert!(runtime_out.contains("remote_noise_static_public_key_loaded=true"));
    assert!(runtime_out.contains("remote_endpoint_state_loaded=true"));
    assert!(runtime_out.contains("replay_window_loaded=true"));
    assert!(runtime_out.contains("runtime_material_reconstructable=true"));
    assert!(runtime_out.contains("key_material_exposed=false"));
    assert!(runtime_out.contains("transport_io_opened=false"));
    assert!(runtime_out.contains("runtime_messaging=false"));
    assert!(runtime_error.contains("storage-only"));
    assert!(!runtime_out.contains("alice"));
    assert!(!runtime_out.contains(alice_store_arg));
    assert!(!runtime_out.contains("adchan1"));
    assert!(!runtime_out.contains("ed25519"));
    assert!(!runtime_error.contains("correct horse"));

    let open_runtime = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "open-runtime",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let open_runtime_out = stdout(&open_runtime);
    let open_runtime_error = stderr(&open_runtime);
    assert!(
        open_runtime.status.success(),
        "stdout: {open_runtime_out}\nstderr: {open_runtime_error}"
    );
    assert!(open_runtime_out.contains("production pairing session runtime opened:"));
    assert!(open_runtime_out.contains("storage_opened=true"));
    assert!(open_runtime_out.contains("runtime_material_reconstructable=true"));
    assert!(open_runtime_out.contains("outbound_stream_gate_ready=true"));
    assert!(open_runtime_out.contains("outbound_fail_closed_adapter_ready=true"));
    assert!(open_runtime_out.contains("outbound_stream_preparation_ready=true"));
    assert!(open_runtime_out.contains("session_binding_ready=true"));
    assert!(open_runtime_out.contains("remote_peer_authentication_ready=true"));
    assert!(open_runtime_out.contains("outbound_envelope_io_ready=true"));
    assert!(open_runtime_out.contains("key_material_exposed=false"));
    assert!(open_runtime_out.contains("transport_io_opened=false"));
    assert!(open_runtime_out.contains("runtime_messaging=false"));
    assert!(open_runtime_error.contains("storage-only"));
    assert!(!open_runtime_out.contains("alice"));
    assert!(!open_runtime_out.contains(alice_store_arg));
    assert!(!open_runtime_out.contains("adchan1"));
    assert!(!open_runtime_out.contains("ed25519"));
    assert!(!open_runtime_error.contains("correct horse"));

    let transport_prepare = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "transport-prepare",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let transport_prepare_out = stdout(&transport_prepare);
    let transport_prepare_error = stderr(&transport_prepare);
    assert!(
        transport_prepare.status.success(),
        "stdout: {transport_prepare_out}\nstderr: {transport_prepare_error}"
    );
    assert!(transport_prepare_out.contains("production pairing session transport prepared:"));
    assert!(transport_prepare_out.contains("storage_opened=true"));
    assert!(transport_prepare_out.contains("runtime_material_reconstructable=true"));
    assert!(transport_prepare_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(transport_prepare_out.contains("remote_noise_static_public_key_loaded=true"));
    assert!(transport_prepare_out.contains("remote_endpoint_state_loaded=true"));
    assert!(transport_prepare_out.contains("replay_window_loaded=true"));
    assert!(transport_prepare_out.contains("authenticated_handshake_required=true"));
    assert!(transport_prepare_out.contains("session_transport_state_created=false"));
    assert!(transport_prepare_out.contains("session_transport_persistence_allowed=true"));
    assert!(transport_prepare_out.contains("key_material_exposed=false"));
    assert!(transport_prepare_out.contains("transport_io_opened=false"));
    assert!(transport_prepare_out.contains("runtime_messaging=false"));
    assert!(transport_prepare_error.contains("storage-only"));
    assert!(!transport_prepare_out.contains("alice"));
    assert!(!transport_prepare_out.contains(alice_store_arg));
    assert!(!transport_prepare_out.contains("adchan1"));
    assert!(!transport_prepare_out.contains("ed25519"));
    assert!(!transport_prepare_error.contains("correct horse"));

    let handshake_init = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "handshake-init",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let handshake_init_out = stdout(&handshake_init);
    let handshake_init_error = stderr(&handshake_init);
    assert!(
        handshake_init.status.success(),
        "stdout: {handshake_init_out}\nstderr: {handshake_init_error}"
    );
    assert!(handshake_init_out.contains("production pairing session handshake initialized:"));
    assert!(handshake_init_out.contains("storage_opened=true"));
    assert!(handshake_init_out.contains("session_draft_loaded=true"));
    assert!(handshake_init_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(handshake_init_out.contains("local_noise_static_matches_draft=true"));
    assert!(handshake_init_out.contains("safety_transcript_loaded=true"));
    assert!(handshake_init_out.contains("local_role_can_initiate="));
    assert!(handshake_init_out.contains("handshake_message_created="));
    assert!(handshake_init_out.contains("handshake_message_len="));
    assert!(handshake_init_out.contains("handshake_message_exposed=false"));
    assert!(handshake_init_out.contains("key_material_exposed=false"));
    assert!(handshake_init_out.contains("transport_io_opened=false"));
    assert!(handshake_init_out.contains("runtime_messaging=false"));
    assert!(handshake_init_error.contains("storage-only"));
    assert!(!handshake_init_out.contains("alice"));
    assert!(!handshake_init_out.contains(alice_store_arg));
    assert!(!handshake_init_out.contains("adchan1"));
    assert!(!handshake_init_out.contains("ed25519"));
    assert!(!handshake_init_error.contains("correct horse"));

    let handshake_export = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "handshake-init-export",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--out",
            handshake_init_export_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let handshake_export_out = stdout(&handshake_export);
    let handshake_export_error = stderr(&handshake_export);
    assert!(
        handshake_export.status.success(),
        "stdout: {handshake_export_out}\nstderr: {handshake_export_error}"
    );
    assert!(handshake_export_out.contains("production pairing session handshake init exported:"));
    assert!(handshake_export_out.contains("storage_opened=true"));
    assert!(handshake_export_out.contains("session_draft_loaded=true"));
    assert!(handshake_export_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(handshake_export_out.contains("local_noise_static_matches_draft=true"));
    assert!(handshake_export_out.contains("safety_transcript_loaded=true"));
    assert!(handshake_export_out.contains("local_role_can_initiate="));
    assert!(handshake_export_out.contains("handshake_message_created="));
    assert!(handshake_export_out.contains("handshake_message_len="));
    assert!(handshake_export_out.contains("handshake_message_written="));
    assert!(handshake_export_out.contains("handshake_message_exposed=false"));
    assert!(handshake_export_out.contains("initiator_state_written="));
    assert!(handshake_export_out.contains("key_material_exposed=false"));
    assert!(handshake_export_out.contains("transport_io_opened=false"));
    assert!(handshake_export_out.contains("runtime_messaging=false"));
    assert!(handshake_export_error.contains("--out"));
    assert!(!handshake_export_out.contains("ADNOISEXXINIT1"));
    assert!(!handshake_export_out.contains("alice"));
    assert!(!handshake_export_out.contains(alice_store_arg));
    assert!(!handshake_export_out.contains(handshake_init_export_arg));
    assert!(!handshake_export_out.contains("adchan1"));
    assert!(!handshake_export_out.contains("ed25519"));
    assert!(!handshake_export_error.contains("correct horse"));
    assert!(!handshake_export_error.contains(alice_store_arg));
    let (valid_init_arg, reply_profile, reply_store_arg, finish_profile, finish_store_arg) =
        if handshake_export_out.contains("handshake_message_written=true") {
            let exported = std::fs::read_to_string(&handshake_init_export).expect("read export");
            assert!(exported.starts_with("ADNOISEXXINIT1|"));
            assert!(handshake_export_out.contains("initiator_state_written=true"));
            (
                handshake_init_export_arg,
                "bob",
                bob_store_arg,
                "alice",
                alice_store_arg,
            )
        } else {
            let bob_handshake_export = run_with_stdin(
                &[
                    "production",
                    "pairing",
                    "session",
                    "handshake-init-export",
                    "--profile",
                    "bob",
                    "--store",
                    bob_store_arg,
                    "--out",
                    bob_handshake_init_export_arg,
                    "--passphrase-stdin",
                ],
                "correct horse battery staple\n",
            );
            let bob_handshake_export_out = stdout(&bob_handshake_export);
            let bob_handshake_export_error = stderr(&bob_handshake_export);
            assert!(
                bob_handshake_export.status.success(),
                "stdout: {bob_handshake_export_out}\nstderr: {bob_handshake_export_error}"
            );
            assert!(bob_handshake_export_out.contains("handshake_message_written=true"));
            assert!(bob_handshake_export_out.contains("initiator_state_written=true"));
            let exported =
                std::fs::read_to_string(&bob_handshake_init_export).expect("read bob export");
            assert!(exported.starts_with("ADNOISEXXINIT1|"));
            assert!(!bob_handshake_export_out.contains("bob"));
            assert!(!bob_handshake_export_out.contains(bob_store_arg));
            assert!(!bob_handshake_export_out.contains(bob_handshake_init_export_arg));
            assert!(!bob_handshake_export_error.contains("correct horse"));
            (
                bob_handshake_init_export_arg,
                "alice",
                alice_store_arg,
                "bob",
                bob_store_arg,
            )
        };

    let handshake_import = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "handshake-init-import",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--in",
            valid_init_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let handshake_import_out = stdout(&handshake_import);
    let handshake_import_error = stderr(&handshake_import);
    assert!(
        handshake_import.status.success(),
        "stdout: {handshake_import_out}\nstderr: {handshake_import_error}"
    );
    assert!(handshake_import_out.contains("production pairing session handshake init imported:"));
    assert!(handshake_import_out.contains("storage_opened=true"));
    assert!(handshake_import_out.contains("session_draft_loaded=true"));
    assert!(handshake_import_out.contains("safety_transcript_loaded=true"));
    assert!(handshake_import_out.contains("local_role_can_accept="));
    assert!(handshake_import_out.contains("handshake_message_read=true"));
    assert!(handshake_import_out.contains("handshake_message_decodable=true"));
    assert!(handshake_import_out.contains("handshake_message_len="));
    assert!(handshake_import_out.contains("handshake_message_exposed=false"));
    assert!(handshake_import_out.contains("responder_state_created=false"));
    assert!(handshake_import_out.contains("key_material_exposed=false"));
    assert!(handshake_import_out.contains("transport_io_opened=false"));
    assert!(handshake_import_out.contains("runtime_messaging=false"));
    assert!(handshake_import_error.contains("storage-only"));
    assert!(!handshake_import_out.contains("ADNOISEXXINIT1"));
    assert!(!handshake_import_out.contains("alice"));
    assert!(!handshake_import_out.contains(alice_store_arg));
    assert!(!handshake_import_out.contains(valid_init_arg));
    assert!(!handshake_import_out.contains("adchan1"));
    assert!(!handshake_import_out.contains("ed25519"));
    assert!(!handshake_import_error.contains("correct horse"));
    assert!(!handshake_import_error.contains(alice_store_arg));
    assert!(!handshake_import_error.contains(valid_init_arg));

    let handshake_reply = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "handshake-reply-export",
            "--profile",
            reply_profile,
            "--store",
            reply_store_arg,
            "--in",
            valid_init_arg,
            "--out",
            handshake_reply_export_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let handshake_reply_out = stdout(&handshake_reply);
    let handshake_reply_error = stderr(&handshake_reply);
    assert!(
        handshake_reply.status.success(),
        "stdout: {handshake_reply_out}\nstderr: {handshake_reply_error}"
    );
    assert!(handshake_reply_out.contains("production pairing session handshake reply exported:"));
    assert!(handshake_reply_out.contains("storage_opened=true"));
    assert!(handshake_reply_out.contains("session_draft_loaded=true"));
    assert!(handshake_reply_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(handshake_reply_out.contains("local_noise_static_matches_draft=true"));
    assert!(handshake_reply_out.contains("safety_transcript_loaded=true"));
    assert!(handshake_reply_out.contains("local_role_can_accept=true"));
    assert!(handshake_reply_out.contains("init_message_read=true"));
    assert!(handshake_reply_out.contains("init_message_decodable=true"));
    assert!(handshake_reply_out.contains("init_message_len="));
    assert!(handshake_reply_out.contains("reply_message_created=true"));
    assert!(handshake_reply_out.contains("reply_message_len="));
    assert!(handshake_reply_out.contains("reply_message_written=true"));
    assert!(handshake_reply_out.contains("reply_message_exposed=false"));
    assert!(handshake_reply_out.contains("responder_state_persisted=true"));
    assert!(handshake_reply_out.contains("key_material_exposed=false"));
    assert!(handshake_reply_out.contains("transport_io_opened=false"));
    assert!(handshake_reply_out.contains("runtime_messaging=false"));
    assert!(handshake_reply_error.contains("--out"));
    let reply_exported = std::fs::read_to_string(&handshake_reply_export).expect("read reply");
    assert!(reply_exported.starts_with("ADNOISEXXREPLY1|"));
    assert!(!handshake_reply_out.contains("ADNOISEXXINIT1"));
    assert!(!handshake_reply_out.contains("ADNOISEXXREPLY1"));
    assert!(!handshake_reply_out.contains(reply_profile));
    assert!(!handshake_reply_out.contains(reply_store_arg));
    assert!(!handshake_reply_out.contains(valid_init_arg));
    assert!(!handshake_reply_out.contains(handshake_reply_export_arg));
    assert!(!handshake_reply_out.contains("adchan1"));
    assert!(!handshake_reply_out.contains("ed25519"));
    assert!(!handshake_reply_error.contains("correct horse"));
    assert!(!handshake_reply_error.contains(reply_store_arg));
    assert!(!handshake_reply_error.contains(valid_init_arg));
    assert!(!handshake_reply_error.contains(handshake_reply_export_arg));

    let handshake_finish = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "handshake-finish-export",
            "--profile",
            finish_profile,
            "--store",
            finish_store_arg,
            "--in",
            handshake_reply_export_arg,
            "--out",
            handshake_finish_export_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let handshake_finish_out = stdout(&handshake_finish);
    let handshake_finish_error = stderr(&handshake_finish);
    assert!(
        handshake_finish.status.success(),
        "stdout: {handshake_finish_out}\nstderr: {handshake_finish_error}"
    );
    assert!(handshake_finish_out.contains("production pairing session handshake finish exported:"));
    assert!(handshake_finish_out.contains("storage_opened=true"));
    assert!(handshake_finish_out.contains("session_draft_loaded=true"));
    assert!(handshake_finish_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(handshake_finish_out.contains("local_noise_static_matches_draft=true"));
    assert!(handshake_finish_out.contains("safety_transcript_loaded=true"));
    assert!(handshake_finish_out.contains("local_role_can_finish=true"));
    assert!(handshake_finish_out.contains("initiator_state_loaded=true"));
    assert!(handshake_finish_out.contains("reply_message_read=true"));
    assert!(handshake_finish_out.contains("reply_message_decodable=true"));
    assert!(handshake_finish_out.contains("reply_message_len="));
    assert!(handshake_finish_out.contains("finish_message_created=true"));
    assert!(handshake_finish_out.contains("finish_message_len="));
    assert!(handshake_finish_out.contains("finish_message_written=true"));
    assert!(handshake_finish_out.contains("finish_message_exposed=false"));
    assert!(handshake_finish_out.contains("transport_state_persisted=true"));
    assert!(handshake_finish_out.contains("key_material_exposed=false"));
    assert!(handshake_finish_out.contains("transport_io_opened=false"));
    assert!(handshake_finish_out.contains("runtime_messaging=false"));
    assert!(handshake_finish_error.contains("--out"));
    let finish_exported = std::fs::read_to_string(&handshake_finish_export).expect("read finish");
    assert!(finish_exported.starts_with("ADNOISEXXFINISH1|"));
    assert!(!handshake_finish_out.contains("ADNOISEXXREPLY1"));
    assert!(!handshake_finish_out.contains("ADNOISEXXFINISH1"));
    assert!(!handshake_finish_out.contains(finish_profile));
    assert!(!handshake_finish_out.contains(finish_store_arg));
    assert!(!handshake_finish_out.contains(handshake_reply_export_arg));
    assert!(!handshake_finish_out.contains(handshake_finish_export_arg));
    assert!(!handshake_finish_out.contains("adchan1"));
    assert!(!handshake_finish_out.contains("ed25519"));
    assert!(!handshake_finish_error.contains("correct horse"));
    assert!(!handshake_finish_error.contains(finish_store_arg));
    assert!(!handshake_finish_error.contains(handshake_reply_export_arg));
    assert!(!handshake_finish_error.contains(handshake_finish_export_arg));

    let handshake_finish_import = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "handshake-finish-import",
            "--profile",
            reply_profile,
            "--store",
            reply_store_arg,
            "--in",
            handshake_finish_export_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let handshake_finish_import_out = stdout(&handshake_finish_import);
    let handshake_finish_import_error = stderr(&handshake_finish_import);
    assert!(
        handshake_finish_import.status.success(),
        "stdout: {handshake_finish_import_out}\nstderr: {handshake_finish_import_error}"
    );
    assert!(handshake_finish_import_out
        .contains("production pairing session handshake finish imported:"));
    assert!(handshake_finish_import_out.contains("storage_opened=true"));
    assert!(handshake_finish_import_out.contains("session_draft_loaded=true"));
    assert!(handshake_finish_import_out.contains("local_noise_static_private_key_loaded=true"));
    assert!(handshake_finish_import_out.contains("local_noise_static_matches_draft=true"));
    assert!(handshake_finish_import_out.contains("safety_transcript_loaded=true"));
    assert!(handshake_finish_import_out.contains("local_role_can_complete=true"));
    assert!(handshake_finish_import_out.contains("responder_state_loaded=true"));
    assert!(handshake_finish_import_out.contains("finish_message_read=true"));
    assert!(handshake_finish_import_out.contains("finish_message_decodable=true"));
    assert!(handshake_finish_import_out.contains("finish_message_len="));
    assert!(handshake_finish_import_out.contains("remote_static_verified=true"));
    assert!(handshake_finish_import_out.contains("transport_state_created=true"));
    assert!(handshake_finish_import_out.contains("transport_state_persisted=true"));
    assert!(handshake_finish_import_out.contains("key_material_exposed=false"));
    assert!(handshake_finish_import_out.contains("transport_io_opened=false"));
    assert!(handshake_finish_import_out.contains("runtime_messaging=false"));
    assert!(handshake_finish_import_error.contains("transport state metadata"));
    assert!(!handshake_finish_import_out.contains("ADNOISEXXFINISH1"));
    assert!(!handshake_finish_import_out.contains(reply_profile));
    assert!(!handshake_finish_import_out.contains(reply_store_arg));
    assert!(!handshake_finish_import_out.contains(handshake_finish_export_arg));
    assert!(!handshake_finish_import_out.contains("adchan1"));
    assert!(!handshake_finish_import_out.contains("ed25519"));
    assert!(!handshake_finish_import_error.contains("correct horse"));
    assert!(!handshake_finish_import_error.contains(reply_store_arg));
    assert!(!handshake_finish_import_error.contains(handshake_finish_export_arg));

    std::fs::write(&plaintext, "hello from canonical dialer").expect("write plaintext");
    let send_prepare = run_with_stdin(
        &[
            "production",
            "message",
            "send-prepare",
            "--profile",
            finish_profile,
            "--store",
            finish_store_arg,
            "--message-number",
            "1",
            "--plaintext",
            plaintext_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let send_prepare_out = stdout(&send_prepare);
    let send_prepare_error = stderr(&send_prepare);
    assert!(
        send_prepare.status.success(),
        "stdout: {send_prepare_out}\nstderr: {send_prepare_error}"
    );
    assert!(send_prepare_out.contains("production message send prepared:"));
    assert!(send_prepare_out.contains("storage_opened=true"));
    assert!(send_prepare_out.contains("runtime_material_reconstructable=true"));
    assert!(send_prepare_out.contains("outbound_envelope_io_ready=true"));
    assert!(send_prepare_out.contains("plaintext_accepted=true"));
    assert!(send_prepare_out.contains("message_number_reserved=true"));
    assert!(send_prepare_out.contains("local_message_index_written=true"));
    assert!(send_prepare_out.contains("pending_message_record_written=true"));
    assert!(send_prepare_out.contains("envelope_encryption_ready=false"));
    assert!(send_prepare_out.contains("network_send_attempted=false"));
    assert!(send_prepare_out.contains("key_material_exposed=false"));
    assert!(send_prepare_out.contains("transport_io_opened=false"));
    assert!(send_prepare_out.contains("runtime_messaging=false"));
    assert!(send_prepare_error.contains("storage-only"));
    assert!(!send_prepare_out.contains(finish_profile));
    assert!(!send_prepare_out.contains(finish_store_arg));
    assert!(!send_prepare_out.contains(plaintext_arg));
    assert!(!send_prepare_out.contains("hello from canonical dialer"));
    assert!(!send_prepare_out.contains("adchan1"));
    assert!(!send_prepare_out.contains("ed25519"));
    assert!(!send_prepare_error.contains("correct horse"));
    assert!(!send_prepare_error.contains(finish_store_arg));
    assert!(!send_prepare_error.contains(plaintext_arg));
    assert!(!send_prepare_error.contains("hello from canonical dialer"));

    let pending_status = run_with_stdin(
        &[
            "production",
            "message",
            "pending-status",
            "--profile",
            finish_profile,
            "--store",
            finish_store_arg,
            "--message-number",
            "1",
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let pending_status_out = stdout(&pending_status);
    let pending_status_error = stderr(&pending_status);
    assert!(
        pending_status.status.success(),
        "stdout: {pending_status_out}\nstderr: {pending_status_error}"
    );
    assert!(pending_status_out.contains("production message pending status:"));
    assert!(pending_status_out.contains("storage_opened=true"));
    assert!(pending_status_out.contains("runtime_material_reconstructable=true"));
    assert!(pending_status_out.contains("local_message_index_present=true"));
    assert!(pending_status_out.contains("pending_message_record_present=true"));
    assert!(pending_status_out.contains("pending_message_record_decodable=true"));
    assert!(pending_status_out.contains("local_message_index_matches_pending=true"));
    assert!(pending_status_out.contains("plaintext_exposed=false"));
    assert!(pending_status_out.contains("envelope_encryption_ready=false"));
    assert!(pending_status_out.contains("network_send_attempted=false"));
    assert!(pending_status_out.contains("key_material_exposed=false"));
    assert!(pending_status_out.contains("transport_io_opened=false"));
    assert!(pending_status_out.contains("runtime_messaging=false"));
    assert!(pending_status_error.contains("storage-only"));
    assert!(!pending_status_out.contains(finish_profile));
    assert!(!pending_status_out.contains(finish_store_arg));
    assert!(!pending_status_out.contains(plaintext_arg));
    assert!(!pending_status_out.contains("hello from canonical dialer"));
    assert!(!pending_status_out.contains("adchan1"));
    assert!(!pending_status_error.contains("correct horse"));
    assert!(!pending_status_error.contains(finish_store_arg));
    assert!(!pending_status_error.contains("hello from canonical dialer"));

    let encrypt_prepare = run_with_stdin(
        &[
            "production",
            "message",
            "outbound-encrypt-prepare",
            "--profile",
            finish_profile,
            "--store",
            finish_store_arg,
            "--message-number",
            "1",
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let encrypt_prepare_out = stdout(&encrypt_prepare);
    let encrypt_prepare_error = stderr(&encrypt_prepare);
    assert!(
        encrypt_prepare.status.success(),
        "stdout: {encrypt_prepare_out}\nstderr: {encrypt_prepare_error}"
    );
    assert!(encrypt_prepare_out.contains("production message outbound encrypt prepared:"));
    assert!(encrypt_prepare_out.contains("storage_opened=true"));
    assert!(encrypt_prepare_out.contains("runtime_material_reconstructable=true"));
    assert!(encrypt_prepare_out.contains("local_message_index_present=true"));
    assert!(encrypt_prepare_out.contains("pending_message_record_present=true"));
    assert!(encrypt_prepare_out.contains("pending_message_record_decodable=true"));
    assert!(encrypt_prepare_out.contains("local_message_index_matches_pending=true"));
    assert!(encrypt_prepare_out.contains("pending_plaintext_loaded=true"));
    assert!(encrypt_prepare_out.contains("plaintext_exposed=false"));
    assert!(encrypt_prepare_out.contains("session_transport_ready=true"));
    assert!(encrypt_prepare_out.contains("envelope_encryption_ready=true"));
    assert!(encrypt_prepare_out.contains("encrypted_envelope_written=true"));
    assert!(encrypt_prepare_out.contains("network_send_attempted=false"));
    assert!(encrypt_prepare_out.contains("key_material_exposed=false"));
    assert!(encrypt_prepare_out.contains("transport_io_opened=false"));
    assert!(encrypt_prepare_out.contains("runtime_messaging=false"));
    assert!(encrypt_prepare_error.contains("storage-only"));
    assert!(!encrypt_prepare_out.contains(finish_profile));
    assert!(!encrypt_prepare_out.contains(finish_store_arg));
    assert!(!encrypt_prepare_out.contains(plaintext_arg));
    assert!(!encrypt_prepare_out.contains("hello from canonical dialer"));
    assert!(!encrypt_prepare_out.contains("adchan1"));
    assert!(!encrypt_prepare_error.contains("correct horse"));
    assert!(!encrypt_prepare_error.contains(finish_store_arg));
    assert!(!encrypt_prepare_error.contains("hello from canonical dialer"));

    let envelope_export = run_with_stdin(
        &[
            "production",
            "message",
            "outbound-envelope-export",
            "--profile",
            finish_profile,
            "--store",
            finish_store_arg,
            "--message-number",
            "1",
            "--out",
            encrypted_envelope_export_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let envelope_export_out = stdout(&envelope_export);
    let envelope_export_error = stderr(&envelope_export);
    assert!(
        envelope_export.status.success(),
        "stdout: {envelope_export_out}\nstderr: {envelope_export_error}"
    );
    assert!(envelope_export_out.contains("production message outbound envelope exported:"));
    assert!(envelope_export_out.contains("storage_opened=true"));
    assert!(envelope_export_out.contains("runtime_material_reconstructable=true"));
    assert!(envelope_export_out.contains("encrypted_envelope_present=true"));
    assert!(envelope_export_out.contains("envelope_decodable=true"));
    assert!(envelope_export_out.contains("envelope_message_number_matches=true"));
    assert!(envelope_export_out.contains("envelope_message_type_data=true"));
    assert!(envelope_export_out.contains("envelope_written=true"));
    assert!(envelope_export_out.contains("plaintext_exposed=false"));
    assert!(envelope_export_out.contains("network_send_attempted=false"));
    assert!(envelope_export_out.contains("key_material_exposed=false"));
    assert!(envelope_export_out.contains("transport_io_opened=false"));
    assert!(envelope_export_out.contains("runtime_messaging=false"));
    assert!(envelope_export_error.contains("--out"));
    assert!(!envelope_export_out.contains(finish_profile));
    assert!(!envelope_export_out.contains(finish_store_arg));
    assert!(!envelope_export_out.contains(encrypted_envelope_export_arg));
    assert!(!envelope_export_out.contains("hello from canonical dialer"));
    assert!(!envelope_export_out.contains("ADENV1"));
    assert!(!envelope_export_out.contains("adchan1"));
    assert!(!envelope_export_error.contains("correct horse"));
    assert!(!envelope_export_error.contains(finish_store_arg));
    assert!(!envelope_export_error.contains("hello from canonical dialer"));
    let exported_envelope =
        std::fs::read_to_string(&encrypted_envelope_export).expect("read encrypted envelope");
    assert!(exported_envelope.starts_with("ADENV1|"));
    assert!(!exported_envelope.contains("hello from canonical dialer"));

    let inbound_import = run_with_stdin(
        &[
            "production",
            "message",
            "inbound-decrypt-import",
            "--profile",
            reply_profile,
            "--store",
            reply_store_arg,
            "--in",
            encrypted_envelope_export_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let inbound_import_out = stdout(&inbound_import);
    let inbound_import_error = stderr(&inbound_import);
    assert!(
        inbound_import.status.success(),
        "stdout: {inbound_import_out}\nstderr: {inbound_import_error}"
    );
    assert!(inbound_import_out.contains("production message inbound decrypt imported:"));
    assert!(inbound_import_out.contains("storage_opened=true"));
    assert!(inbound_import_out.contains("runtime_material_reconstructable=true"));
    assert!(inbound_import_out.contains("envelope_read=true"));
    assert!(inbound_import_out.contains("envelope_decodable=true"));
    assert!(inbound_import_out.contains("session_transport_ready=true"));
    assert!(inbound_import_out.contains("replay_window_loaded=true"));
    assert!(inbound_import_out.contains("replay_accepted=true"));
    assert!(inbound_import_out.contains("plaintext_decrypted=true"));
    assert!(inbound_import_out.contains("plaintext_exposed=false"));
    assert!(inbound_import_out.contains("received_message_written=true"));
    assert!(inbound_import_out.contains("replay_window_committed=true"));
    assert!(inbound_import_out.contains("network_receive_attempted=false"));
    assert!(inbound_import_out.contains("key_material_exposed=false"));
    assert!(inbound_import_out.contains("transport_io_opened=false"));
    assert!(inbound_import_out.contains("runtime_messaging=false"));
    assert!(inbound_import_error.contains("storage-only"));
    assert!(!inbound_import_out.contains(reply_profile));
    assert!(!inbound_import_out.contains(reply_store_arg));
    assert!(!inbound_import_out.contains(encrypted_envelope_export_arg));
    assert!(!inbound_import_out.contains("hello from canonical dialer"));
    assert!(!inbound_import_out.contains("ADENV1"));
    assert!(!inbound_import_out.contains("adchan1"));
    assert!(!inbound_import_error.contains("correct horse"));
    assert!(!inbound_import_error.contains(reply_store_arg));
    assert!(!inbound_import_error.contains("hello from canonical dialer"));

    let received_status = run_with_stdin(
        &[
            "production",
            "message",
            "received-status",
            "--profile",
            reply_profile,
            "--store",
            reply_store_arg,
            "--message-number",
            "1",
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let received_status_out = stdout(&received_status);
    let received_status_error = stderr(&received_status);
    assert!(
        received_status.status.success(),
        "stdout: {received_status_out}\nstderr: {received_status_error}"
    );
    assert!(received_status_out.contains("production message received status:"));
    assert!(received_status_out.contains("storage_opened=true"));
    assert!(received_status_out.contains("runtime_material_reconstructable=true"));
    assert!(received_status_out.contains("received_message_record_present=true"));
    assert!(received_status_out.contains("received_message_record_decodable=true"));
    assert!(received_status_out.contains("received_message_matches_session=true"));
    assert!(received_status_out.contains("plaintext_exposed=false"));
    assert!(received_status_out.contains("network_receive_attempted=false"));
    assert!(received_status_out.contains("key_material_exposed=false"));
    assert!(received_status_out.contains("transport_io_opened=false"));
    assert!(received_status_out.contains("runtime_messaging=false"));
    assert!(received_status_error.contains("storage-only"));
    assert!(!received_status_out.contains(reply_profile));
    assert!(!received_status_out.contains(reply_store_arg));
    assert!(!received_status_out.contains("hello from canonical dialer"));
    assert!(!received_status_out.contains("ADRECEIVEDMSG1"));
    assert!(!received_status_out.contains("adchan1"));
    assert!(!received_status_error.contains("correct horse"));
    assert!(!received_status_error.contains(reply_store_arg));
    assert!(!received_status_error.contains("hello from canonical dialer"));

    let received_export = run_with_stdin(
        &[
            "production",
            "message",
            "received-export",
            "--profile",
            reply_profile,
            "--store",
            reply_store_arg,
            "--message-number",
            "1",
            "--out",
            received_plaintext_export_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let received_export_out = stdout(&received_export);
    let received_export_error = stderr(&received_export);
    assert!(
        received_export.status.success(),
        "stdout: {received_export_out}\nstderr: {received_export_error}"
    );
    assert!(received_export_out.contains("production message received exported:"));
    assert!(received_export_out.contains("storage_opened=true"));
    assert!(received_export_out.contains("runtime_material_reconstructable=true"));
    assert!(received_export_out.contains("received_message_record_present=true"));
    assert!(received_export_out.contains("received_message_record_decodable=true"));
    assert!(received_export_out.contains("received_message_matches_session=true"));
    assert!(received_export_out.contains("plaintext_written=true"));
    assert!(received_export_out.contains("plaintext_exposed=false"));
    assert!(received_export_out.contains("network_receive_attempted=false"));
    assert!(received_export_out.contains("key_material_exposed=false"));
    assert!(received_export_out.contains("transport_io_opened=false"));
    assert!(received_export_out.contains("runtime_messaging=false"));
    assert!(received_export_error.contains("--out"));
    assert_eq!(
        std::fs::read_to_string(&received_plaintext_export).expect("read received plaintext"),
        "hello from canonical dialer"
    );
    assert!(!received_export_out.contains(reply_profile));
    assert!(!received_export_out.contains(reply_store_arg));
    assert!(!received_export_out.contains(received_plaintext_export_arg));
    assert!(!received_export_out.contains("hello from canonical dialer"));
    assert!(!received_export_out.contains("ADRECEIVEDMSG1"));
    assert!(!received_export_out.contains("adchan1"));
    assert!(!received_export_error.contains("correct horse"));
    assert!(!received_export_error.contains(reply_store_arg));
    assert!(!received_export_error.contains("hello from canonical dialer"));

    let roundtrip_plaintext = root.join("roundtrip-message.txt");
    let roundtrip_received = root.join("roundtrip-received.txt");
    std::fs::write(&roundtrip_plaintext, "hello via local roundtrip")
        .expect("write local roundtrip plaintext");
    let roundtrip_plaintext_arg = roundtrip_plaintext
        .to_str()
        .expect("roundtrip plaintext path");
    let roundtrip_received_arg = roundtrip_received
        .to_str()
        .expect("roundtrip received path");
    let local_roundtrip = run_with_stdin(
        &[
            "production",
            "message",
            "local-roundtrip",
            "--sender-profile",
            finish_profile,
            "--sender-store",
            finish_store_arg,
            "--receiver-profile",
            reply_profile,
            "--receiver-store",
            reply_store_arg,
            "--message-number",
            "2",
            "--plaintext",
            roundtrip_plaintext_arg,
            "--received-out",
            roundtrip_received_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let local_roundtrip_out = stdout(&local_roundtrip);
    let local_roundtrip_error = stderr(&local_roundtrip);
    assert!(
        local_roundtrip.status.success(),
        "stdout: {local_roundtrip_out}\nstderr: {local_roundtrip_error}"
    );
    assert!(local_roundtrip_out.contains("production message local roundtrip completed:"));
    assert!(local_roundtrip_out.contains("selected_message_number=2"));
    assert!(local_roundtrip_out.contains("auto_message_number=false"));
    assert!(local_roundtrip_out.contains("auto_counter_written=false"));
    assert!(local_roundtrip_out.contains("existing_message_slot_skipped=false"));
    assert!(local_roundtrip_out.contains("sender_runtime_material_reconstructable=true"));
    assert!(local_roundtrip_out.contains("sender_message_number_reserved=true"));
    assert!(local_roundtrip_out.contains("sender_pending_record_present=true"));
    assert!(local_roundtrip_out.contains("sender_session_transport_ready=true"));
    assert!(local_roundtrip_out.contains("encrypted_envelope_exported=true"));
    assert!(local_roundtrip_out.contains("receiver_inbound_message_stored=true"));
    assert!(local_roundtrip_out.contains("receiver_received_status_verified=true"));
    assert!(local_roundtrip_out.contains("received_written=true"));
    assert!(local_roundtrip_out.contains("received_export_matches_input=true"));
    assert!(local_roundtrip_out.contains("plaintext_exposed=false"));
    assert!(local_roundtrip_out.contains("network_send_attempted=false"));
    assert!(local_roundtrip_out.contains("network_receive_attempted=false"));
    assert!(local_roundtrip_out.contains("key_material_exposed=false"));
    assert!(local_roundtrip_out.contains("transport_io_opened=false"));
    assert!(local_roundtrip_out.contains("runtime_messaging=false"));
    assert!(local_roundtrip_error.contains("encrypted local stores only"));
    assert_eq!(
        std::fs::read_to_string(&roundtrip_received).expect("read local roundtrip received"),
        "hello via local roundtrip"
    );
    assert!(!local_roundtrip_out.contains(finish_profile));
    assert!(!local_roundtrip_out.contains(finish_store_arg));
    assert!(!local_roundtrip_out.contains(reply_profile));
    assert!(!local_roundtrip_out.contains(reply_store_arg));
    assert!(!local_roundtrip_out.contains(roundtrip_plaintext_arg));
    assert!(!local_roundtrip_out.contains(roundtrip_received_arg));
    assert!(!local_roundtrip_out.contains("hello via local roundtrip"));
    assert!(!local_roundtrip_out.contains("ADENV1"));
    assert!(!local_roundtrip_error.contains("correct horse"));
    assert!(!local_roundtrip_error.contains(finish_store_arg));
    assert!(!local_roundtrip_error.contains(reply_store_arg));
    assert!(!local_roundtrip_error.contains("hello via local roundtrip"));

    let auto_roundtrip_plaintext = root.join("auto-roundtrip-message.txt");
    let auto_roundtrip_received = root.join("auto-roundtrip-received.txt");
    std::fs::write(&auto_roundtrip_plaintext, "hello via auto local roundtrip")
        .expect("write auto local roundtrip plaintext");
    let auto_roundtrip_plaintext_arg = auto_roundtrip_plaintext
        .to_str()
        .expect("auto roundtrip plaintext path");
    let auto_roundtrip_received_arg = auto_roundtrip_received
        .to_str()
        .expect("auto roundtrip received path");
    let auto_local_roundtrip = run_with_stdin(
        &[
            "production",
            "message",
            "local-roundtrip",
            "--sender-profile",
            finish_profile,
            "--sender-store",
            finish_store_arg,
            "--receiver-profile",
            reply_profile,
            "--receiver-store",
            reply_store_arg,
            "--auto-message-number",
            "--plaintext",
            auto_roundtrip_plaintext_arg,
            "--received-out",
            auto_roundtrip_received_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let auto_local_roundtrip_out = stdout(&auto_local_roundtrip);
    let auto_local_roundtrip_error = stderr(&auto_local_roundtrip);
    assert!(
        auto_local_roundtrip.status.success(),
        "stdout: {auto_local_roundtrip_out}\nstderr: {auto_local_roundtrip_error}"
    );
    assert!(auto_local_roundtrip_out.contains("production message local roundtrip completed:"));
    assert!(auto_local_roundtrip_out.contains("selected_message_number=3"));
    assert!(auto_local_roundtrip_out.contains("auto_message_number=true"));
    assert!(auto_local_roundtrip_out.contains("auto_counter_written=true"));
    assert!(auto_local_roundtrip_out.contains("existing_message_slot_skipped=true"));
    assert!(auto_local_roundtrip_out.contains("sender_message_number_reserved=true"));
    assert!(auto_local_roundtrip_out.contains("receiver_inbound_message_stored=true"));
    assert!(auto_local_roundtrip_out.contains("received_export_matches_input=true"));
    assert!(auto_local_roundtrip_out.contains("network_send_attempted=false"));
    assert!(auto_local_roundtrip_out.contains("network_receive_attempted=false"));
    assert!(auto_local_roundtrip_out.contains("transport_io_opened=false"));
    assert!(auto_local_roundtrip_out.contains("runtime_messaging=false"));
    assert!(auto_local_roundtrip_error.contains("encrypted local stores only"));
    assert_eq!(
        std::fs::read_to_string(&auto_roundtrip_received)
            .expect("read auto local roundtrip received"),
        "hello via auto local roundtrip"
    );
    assert!(!auto_local_roundtrip_out.contains(finish_profile));
    assert!(!auto_local_roundtrip_out.contains(finish_store_arg));
    assert!(!auto_local_roundtrip_out.contains(reply_profile));
    assert!(!auto_local_roundtrip_out.contains(reply_store_arg));
    assert!(!auto_local_roundtrip_out.contains(auto_roundtrip_plaintext_arg));
    assert!(!auto_local_roundtrip_out.contains(auto_roundtrip_received_arg));
    assert!(!auto_local_roundtrip_out.contains("hello via auto local roundtrip"));
    assert!(!auto_local_roundtrip_out.contains("ADENV1"));
    assert!(!auto_local_roundtrip_error.contains("correct horse"));
    assert!(!auto_local_roundtrip_error.contains(finish_store_arg));
    assert!(!auto_local_roundtrip_error.contains(reply_store_arg));
    assert!(!auto_local_roundtrip_error.contains("hello via auto local roundtrip"));

    let swapped = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "prepare",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--local-payload",
            bob_payload_arg,
            "--remote-payload",
            alice_payload_arg,
            "--passphrase-stdin",
        ],
        "correct horse battery staple\n",
    );
    let swapped_error = stderr(&swapped);
    assert!(!swapped.status.success());
    assert!(stdout(&swapped).is_empty());
    assert!(swapped_error.contains("local payload mismatch"));
    assert!(!swapped_error.contains("alice"));
    assert!(!swapped_error.contains(alice_store_arg));
    assert!(!swapped_error.contains(bob_payload_arg));

    let wrong = run_with_stdin(
        &[
            "production",
            "pairing",
            "session",
            "prepare",
            "--profile",
            "alice",
            "--store",
            alice_store_arg,
            "--local-payload",
            alice_payload_arg,
            "--remote-payload",
            bob_payload_arg,
            "--passphrase-stdin",
        ],
        "wrong passphrase\n",
    );
    let wrong_error = stderr(&wrong);
    assert!(!wrong.status.success());
    assert!(stdout(&wrong).is_empty());
    assert!(wrong_error.contains("unlock failed"));
    assert!(!wrong_error.contains("alice"));
    assert!(!wrong_error.contains(alice_store_arg));
    assert!(!wrong_error.contains("wrong passphrase"));

    let _ = std::fs::remove_dir_all(root);
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn default_build_rejects_production_unlock_with_redacted_error() {
    let output = run(&[
        "production",
        "unlock",
        "--profile",
        "alice",
        "--passphrase",
        "correct horse battery staple",
    ]);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    let error = stderr(&output);
    assert!(error.contains("production unlock is disabled"));
    assert!(error.contains("unlock_error=product-unlock-disabled"));
    assert!(error.contains("retry_after_user_action=false"));
    assert!(error.contains("storage_opened=false"));
    assert!(error.contains("session_records_written=false"));
    assert!(error.contains("key_material_exposed=false"));
    assert!(error.contains("runtime_messaging=false"));
    assert!(!error.contains("alice"));
    assert!(!error.contains("correct horse battery staple"));
    assert!(!error.contains("SQLCipher"));
    assert!(!error.contains("keychain"));
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn default_build_prints_read_only_production_preflight_without_secrets() {
    let output = run(&["production", "preflight"]);

    assert!(output.status.success());
    let out = stdout(&output);
    assert!(out.contains("production skeleton preflight summary:"));
    assert!(out.contains("session: pairing_required=true"));
    assert!(out.contains("safety_transcript_bound=true"));
    assert!(out.contains("production_e2ee=false"));
    assert!(out.contains("transport: route_kind=OnionService"));
    assert!(out.contains("route_allowed=true"));
    assert!(out.contains("send_receive=false"));
    assert!(out.contains("storage: message_envelope=EncryptedAtRestRequired"));
    assert!(out.contains("session_transport=EncryptedAtRestRequired"));
    assert!(out.contains("replay_commit_after_decrypt=true"));
    assert!(out.contains("rollback_protection=NotProvided"));
    assert!(out.contains("runtime command surface: default_closed=true"));
    assert!(out.contains("production_messaging_ready=false"));
    let error = stderr(&output);
    assert!(error.contains("production preflight is read-only"));
    assert!(error.contains("not a secure messenger release"));
    assert!(!out.contains("preflight.onion"));
    assert!(!out.contains("ADPAIR2|"));
    assert!(!out.contains("adnoise1:"));
    assert!(!out.contains("ADENV1|"));
    assert!(!error.contains("preflight.onion"));
}

#[test]
#[cfg(not(feature = "dev-insecure"))]
fn default_build_runs_production_boundary_self_test_without_secrets() {
    let output = run(&["production", "self-test"]);

    assert!(output.status.success());
    let out = stdout(&output);
    assert!(out.contains("production boundary self-test passed"));
    assert!(out.contains("production session candidate: snow Noise XX synchronous boundary"));
    assert!(out.contains("production session guard coverage: pairing=true"));
    assert!(out.contains("safety_transcript=true"));
    assert!(out.contains("canonical_dialer=true"));
    assert!(out.contains("tamper_rejection=true"));
    assert!(out.contains("replay_before_decrypt=true"));
    assert!(out.contains("in_memory_only=true"));
    assert!(out.contains("production session non-readiness: production_e2ee=false"));
    assert!(out.contains("durable_session_persistence=false"));
    assert!(out.contains("tauri_production_messaging_command=false"));
    assert!(out.contains("usable_async_messaging=false"));
    let error = stderr(&output);
    assert!(error.contains("not a secure messenger release"));
    assert!(!error.contains("private"));
    assert!(!error.contains("ADPAIR2|"));
    assert!(!error.contains("adnoise1:"));
    assert!(!error.contains("ADENV1|"));
    assert!(!error.contains("tamper boundary"));
    assert!(!out.contains("tamper boundary"));
}

#[test]
#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_bootstrap_cli_gate_is_disabled_without_execute_network_flag() {
    let root = temp_cli_path("manual-bootstrap-disabled");
    let state_dir = root.join("arti-state");
    let cache_dir = root.join("arti-cache");
    let output = run(&[
        "transport",
        "bootstrap",
        "--state-dir",
        state_dir.to_str().expect("state path"),
        "--cache-dir",
        cache_dir.to_str().expect("cache path"),
    ]);
    let out = stdout(&output);
    let error = stderr(&output);

    let _ = std::fs::remove_dir_all(root);

    assert!(!output.status.success());
    assert!(out.contains("BootstrapFailed"));
    assert!(out.contains("RuntimeNetworkDisabled"));
    assert!(out.contains("bootstrap_status=network-disabled"));
    assert!(out.contains("usable_transport=false"));
    assert!(error.contains("manual bootstrap attempt failed: RuntimeNetworkDisabled"));
    assert!(!out.contains("arti-state"));
    assert!(!out.contains("arti-cache"));
    assert!(!error.contains("arti-state"));
    assert!(!error.contains("arti-cache"));
}

#[test]
#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_bootstrap_cli_can_use_profile_scoped_transport_dirs_without_leaking_paths() {
    let root = temp_cli_path("manual-bootstrap-profile-scoped");
    let output = run(&[
        "transport",
        "bootstrap",
        "--profile",
        "alice",
        "--app-data-root",
        root.to_str().expect("app data root"),
    ]);
    let out = stdout(&output);
    let error = stderr(&output);

    let _ = std::fs::remove_dir_all(root);

    assert!(!output.status.success());
    assert!(out.contains("BootstrapFailed"));
    assert!(out.contains("RuntimeNetworkDisabled"));
    assert!(out.contains("bootstrap_status=network-disabled"));
    assert!(out.contains("usable_transport=false"));
    assert!(error.contains("manual bootstrap attempt failed: RuntimeNetworkDisabled"));
    assert!(!out.contains("alice"));
    assert!(!out.contains("profiles"));
    assert!(!out.contains("arti-state"));
    assert!(!out.contains("arti-cache"));
    assert!(!error.contains("alice"));
    assert!(!error.contains("profiles"));
    assert!(!error.contains("arti-state"));
    assert!(!error.contains("arti-cache"));
}

#[test]
#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_bootstrap_cli_requires_explicit_app_private_dirs() {
    let output = run(&["transport", "bootstrap"]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("usage:"));
    assert!(error.contains("local-only manual Arti bootstrap spike"));
}

#[test]
#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_bootstrap_cli_rejects_mixed_directory_modes() {
    let root = temp_cli_path("manual-bootstrap-mixed");
    let state_dir = root.join("state");
    let cache_dir = root.join("cache");
    let output = run(&[
        "transport",
        "bootstrap",
        "--profile",
        "alice",
        "--app-data-root",
        root.to_str().expect("app data root"),
        "--state-dir",
        state_dir.to_str().expect("state path"),
        "--cache-dir",
        cache_dir.to_str().expect("cache path"),
    ]);
    let error = stderr(&output);

    let _ = std::fs::remove_dir_all(root);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("usage:"));
}

#[test]
#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_lifecycle_cli_gate_is_disabled_without_execute_network_flag() {
    let root = temp_cli_path("manual-lifecycle-disabled");
    let output = run(&[
        "transport",
        "lifecycle",
        "bootstrap",
        "--profile",
        "alice",
        "--app-data-root",
        root.to_str().expect("app data root"),
    ]);
    let out = stdout(&output);
    let error = stderr(&output);

    let _ = std::fs::remove_dir_all(root);

    assert!(!output.status.success());
    assert!(out.contains("BootstrapFailed"));
    assert!(out.contains("RuntimeNetworkDisabled"));
    assert!(out.contains("manual lifecycle summary"));
    assert!(out.contains("bootstrap_status=network-disabled"));
    assert!(out.contains("state=Unbootstrapped"));
    assert!(out.contains("client_owned=false"));
    assert!(out.contains("usable_transport=false"));
    assert!(error.contains("manual lifecycle bootstrap failed: RuntimeNetworkDisabled"));
    assert!(!out.contains("alice"));
    assert!(!out.contains("profiles"));
    assert!(!out.contains("arti-state"));
    assert!(!out.contains("arti-cache"));
    assert!(!error.contains("alice"));
    assert!(!error.contains("profiles"));
    assert!(!error.contains("arti-state"));
    assert!(!error.contains("arti-cache"));
}

#[test]
#[cfg(all(not(feature = "dev-insecure"), feature = "arti-manual-bootstrap"))]
fn manual_lifecycle_cli_requires_profile_or_explicit_dirs() {
    let output = run(&["transport", "lifecycle", "bootstrap"]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("usage:"));
    assert!(error.contains("manual persistent Arti lifecycle spike"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn malformed_command_prints_help_and_fails() {
    let output = run(&["pairing", "start", "--wrong", "alice"]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("usage:"));
    assert!(error.contains("pairing retry:"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn local_demo_runs_complete_flow() {
    let output = run(&["demo", "local"]);
    let out = stdout(&output);
    let error = stderr(&output);

    assert!(output.status.success());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(out.contains("Another Dimension Chat dev-insecure local demo"));
    assert!(out.contains("not a secure messenger release"));
    assert!(out.contains("does not use real transport"));
    assert!(out.contains("safety number: "));
    assert!(out.contains("safety phrase: "));
    assert!(out.contains("hello from the dev-insecure local demo"));
    assert!(out.contains("second receive returned no replayed messages"));
    assert!(out.contains("dev-insecure local CLI flow completed"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn local_loop_demo_runs_multiple_messages() {
    let output = run(&[
        "demo",
        "local-loop",
        "--message",
        "first local loop message",
        "--message",
        "second local loop message",
    ]);
    let out = stdout(&output);
    let error = stderr(&output);

    assert!(output.status.success());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(out.contains("Another Dimension Chat dev-insecure local message loop"));
    assert!(out.contains("not a secure messenger release"));
    assert!(out.contains("does not use real transport"));
    assert!(out.contains("== Local message 1 =="));
    assert!(out.contains("== Local message 2 =="));
    assert!(out.contains("received by bob: first local loop message"));
    assert!(out.contains("received by bob: second local loop message"));
    assert!(out.contains("replay check: no replayed messages after message 1"));
    assert!(out.contains("replay check: no replayed messages after message 2"));
    assert!(out.contains("expired envelopes: 2"));
    assert!(out.contains("dev store plaintext guard passed"));
    assert!(out.contains("dev-insecure local message loop completed: 2 messages"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn local_loop_demo_requires_messages() {
    let output = run(&["demo", "local-loop"]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("demo local-loop --message <text>"));
    assert!(error.contains("dev-insecure local loop only"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn message_send_without_text_fails() {
    let output = run(&["message", "send", "--from", "alice", "--to", "bob"]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("missing message text"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn invalid_pairing_payload_fails_without_response_payload() {
    let payload = temp_payload_path("invalid-pairing-payload.txt");
    std::fs::write(&payload, "not-a-pairing-payload").expect("failed to write invalid payload");

    let output = Command::new(binary())
        .args([
            "pairing",
            "scan",
            "--profile",
            "alice",
            payload.to_str().expect("payload path must be valid utf-8"),
        ])
        .output()
        .expect("failed to run another-dimension binary");

    let _ = std::fs::remove_file(payload);

    let error = stderr(&output);
    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("invalid payload"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn invalid_profile_name_fails_without_stdout() {
    let output = run(&["profile", "init", "bad/name"]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("invalid profile name"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn invalid_sender_profile_fails_without_stdout() {
    let output = run(&[
        "message", "send", "--from", "bad/name", "--to", "bob", "hello",
    ]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("invalid sender profile"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn invalid_contact_id_fails_without_stdout() {
    let output = run(&[
        "pairing",
        "confirm",
        "--profile",
        "alice",
        "--contact",
        "bad/name",
    ]);
    let error = stderr(&output);

    assert!(!output.status.success());
    assert!(stdout(&output).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("invalid contact id"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn duplicate_pending_pairing_scan_fails_without_response_payload() {
    let workspace = TestWorkspace::new("duplicate-pending-scan");
    let pairing = scan_alice_and_bob(&workspace);

    let duplicate = run_with_home(
        &workspace.home,
        &[
            "pairing",
            "scan",
            "--profile",
            "alice",
            pairing.bob_payload.to_str().expect("valid path"),
        ],
    );

    let error = stderr(&duplicate);
    assert!(!duplicate.status.success());
    assert!(stdout(&duplicate).is_empty());
    assert!(error.contains("pending pairing already exists: bob"));
    assert!(error.contains("Confirm, cancel, or expire it before retrying."));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn active_contact_pairing_scan_fails_without_response_payload() {
    let workspace = TestWorkspace::new("active-contact-scan");
    let pairing = confirm_alice_and_bob(&workspace);

    let duplicate = run_with_home(
        &workspace.home,
        &[
            "pairing",
            "scan",
            "--profile",
            "alice",
            pairing.bob_payload.to_str().expect("valid path"),
        ],
    );

    let error = stderr(&duplicate);
    assert!(!duplicate.status.success());
    assert!(stdout(&duplicate).is_empty());
    assert!(error.contains("contact already active: bob"));
    assert!(error.contains("New pairing is not allowed for an active contact."));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn cancelled_pending_pairing_cannot_be_confirmed_from_cli() {
    let workspace = TestWorkspace::new("cancelled-pending-pairing");
    scan_alice_and_bob(&workspace);

    let cancel = run_with_home(
        &workspace.home,
        &[
            "pairing",
            "cancel",
            "--profile",
            "alice",
            "--contact",
            "bob",
        ],
    );
    assert_success(cancel.clone());
    assert_eq!(stdout(&cancel), "pending pairing cancelled: bob\n");

    let second_cancel = run_with_home(
        &workspace.home,
        &[
            "pairing",
            "cancel",
            "--profile",
            "alice",
            "--contact",
            "bob",
        ],
    );
    assert_success(second_cancel.clone());
    assert_eq!(stdout(&second_cancel), "pending pairing not found: bob\n");

    let confirm = run_with_home(
        &workspace.home,
        &[
            "pairing",
            "confirm",
            "--profile",
            "alice",
            "--contact",
            "bob",
        ],
    );

    let error = stderr(&confirm);
    assert!(!confirm.status.success());
    assert!(stdout(&confirm).is_empty());
    assert!(error.contains("WARNING: dev-insecure build. Not for real communication."));
    assert!(error.contains("storage operation failed"));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn fresh_pending_pairing_expire_reports_zero_and_keeps_pairing_confirmable() {
    let workspace = TestWorkspace::new("fresh-pending-pairing-expire");
    scan_alice_and_bob(&workspace);

    let expire = run_with_home(
        &workspace.home,
        &["pairing", "expire", "--profile", "alice"],
    );
    assert_success(expire.clone());
    assert_eq!(stdout(&expire), "expired pending pairings: 0\n");

    assert_success(run_with_home(
        &workspace.home,
        &[
            "pairing",
            "confirm",
            "--profile",
            "alice",
            "--contact",
            "bob",
        ],
    ));
}

#[test]
#[cfg(feature = "dev-insecure")]
fn replayed_message_envelope_is_not_displayed_twice() {
    let workspace = TestWorkspace::new("replayed-message-envelope");
    confirm_alice_and_bob(&workspace);
    let message = "hello once";

    assert_success(run_with_home(
        &workspace.home,
        &["message", "send", "--from", "alice", "--to", "bob", message],
    ));

    let first_receive = run_with_home(&workspace.home, &["message", "receive", "--profile", "bob"]);
    assert_success(first_receive.clone());
    assert_eq!(stdout(&first_receive), format!("{message}\n"));

    let second_receive =
        run_with_home(&workspace.home, &["message", "receive", "--profile", "bob"]);
    assert_success(second_receive.clone());
    assert!(stdout(&second_receive).is_empty());
}

#[test]
#[cfg(feature = "dev-insecure")]
fn message_expire_removes_pending_envelopes_before_receive() {
    let workspace = TestWorkspace::new("message-expire-before-receive");
    confirm_alice_and_bob(&workspace);

    assert_success(run_with_home(
        &workspace.home,
        &[
            "message",
            "send",
            "--from",
            "alice",
            "--to",
            "bob",
            "discard before receive",
        ],
    ));

    let expire = run_with_home(&workspace.home, &["message", "expire", "--profile", "bob"]);
    assert_success(expire.clone());
    assert_eq!(stdout(&expire), "expired envelopes: 1\n");

    let receive = run_with_home(&workspace.home, &["message", "receive", "--profile", "bob"]);
    assert_success(receive.clone());
    assert!(stdout(&receive).is_empty());

    let second_expire = run_with_home(&workspace.home, &["message", "expire", "--profile", "bob"]);
    assert_success(second_expire.clone());
    assert_eq!(stdout(&second_expire), "expired envelopes: 0\n");
}

#[test]
#[cfg(feature = "dev-insecure")]
fn sent_message_plaintext_is_not_persisted_in_dev_store() {
    let workspace = TestWorkspace::new("message-plaintext-not-persisted");
    confirm_alice_and_bob(&workspace);
    let message = "plaintext should not be stored";

    assert_success(run_with_home(
        &workspace.home,
        &["message", "send", "--from", "alice", "--to", "bob", message],
    ));

    assert!(
        !path_contains(&workspace.home, message.as_bytes()),
        "dev store contains plaintext message"
    );
}

#[cfg(feature = "dev-insecure")]
fn temp_payload_path(name: &str) -> std::path::PathBuf {
    temp_cli_path(name)
}

fn temp_cli_path(name: &str) -> std::path::PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!(
        "another-dimension-cli-test-{}-{name}",
        std::process::id()
    ));
    path
}

#[cfg(feature = "dev-insecure")]
fn assert_success(output: Output) {
    assert!(
        output.status.success(),
        "command failed\nstdout: {}\nstderr: {}",
        stdout(&output),
        stderr(&output)
    );
}

#[cfg(feature = "dev-insecure")]
fn write_stdout(path: &Path, output: Output) {
    assert_success(Output {
        status: output.status,
        stdout: Vec::new(),
        stderr: output.stderr.clone(),
    });
    std::fs::write(path, output.stdout).expect("failed to write command stdout");
}

#[cfg(feature = "dev-insecure")]
fn scan_alice_and_bob(workspace: &TestWorkspace) -> PairingFiles {
    let alice_payload = workspace.file("alice.pair");
    let bob_payload = workspace.file("bob.pair");

    assert_success(run_with_home(
        &workspace.home,
        &["profile", "init", "alice"],
    ));
    assert_success(run_with_home(&workspace.home, &["profile", "init", "bob"]));
    write_stdout(
        &alice_payload,
        run_with_home(&workspace.home, &["pairing", "start", "--profile", "alice"]),
    );
    write_stdout(
        &bob_payload,
        run_with_home(
            &workspace.home,
            &[
                "pairing",
                "scan",
                "--profile",
                "bob",
                alice_payload.to_str().expect("valid path"),
            ],
        ),
    );
    assert_success(run_with_home(
        &workspace.home,
        &[
            "pairing",
            "scan",
            "--profile",
            "alice",
            bob_payload.to_str().expect("valid path"),
        ],
    ));

    PairingFiles { bob_payload }
}

#[cfg(feature = "dev-insecure")]
fn confirm_alice_and_bob(workspace: &TestWorkspace) -> PairingFiles {
    let pairing = scan_alice_and_bob(workspace);
    assert_success(run_with_home(
        &workspace.home,
        &[
            "pairing",
            "confirm",
            "--profile",
            "alice",
            "--contact",
            "bob",
        ],
    ));
    assert_success(run_with_home(
        &workspace.home,
        &[
            "pairing",
            "confirm",
            "--profile",
            "bob",
            "--contact",
            "alice",
        ],
    ));
    pairing
}

#[cfg(feature = "dev-insecure")]
fn path_contains(root: &Path, needle: &[u8]) -> bool {
    if !root.exists() {
        return false;
    }
    let entries = std::fs::read_dir(root).expect("failed to read directory");
    for entry in entries {
        let path = entry.expect("failed to read directory entry").path();
        if path.is_dir() {
            if path_contains(&path, needle) {
                return true;
            }
            continue;
        }
        if path.is_file() {
            let bytes = std::fs::read(&path).expect("failed to read file");
            if bytes.windows(needle.len()).any(|window| window == needle) {
                return true;
            }
        }
    }
    false
}

#[cfg(feature = "dev-insecure")]
struct PairingFiles {
    bob_payload: PathBuf,
}

#[cfg(feature = "dev-insecure")]
struct TestWorkspace {
    root: PathBuf,
    home: PathBuf,
}

#[cfg(feature = "dev-insecure")]
impl TestWorkspace {
    fn new(name: &str) -> Self {
        let root = temp_payload_path(name);
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).expect("failed to create test workspace");
        let home = root.join("home");
        Self { root, home }
    }

    fn file(&self, name: &str) -> PathBuf {
        self.root.join(name)
    }
}

#[cfg(feature = "dev-insecure")]
impl Drop for TestWorkspace {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

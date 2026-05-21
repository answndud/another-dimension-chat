mod status;

pub use status::PrototypeStatus;

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

#[tauri::command]
fn prototype_status() -> PrototypeStatus {
    status::redacted_prototype_status()
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

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            prototype_status,
            dev_local_demo,
            dev_local_message_loop
        ])
        .run(tauri::generate_context!())
        .expect("failed to run desktop prototype shell");
}

#[cfg(test)]
mod tests {
    use super::{
        build_demo_simulation, parse_demo_steps, parse_loop_messages, sanitize_loop_messages,
    };

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
}

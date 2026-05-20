import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

const fields = {
  releaseClaim: document.querySelector("#release-claim"),
  messaging: document.querySelector("#messaging"),
  core: document.querySelector("#core"),
  profile: document.querySelector("#profile"),
  pairing: document.querySelector("#pairing"),
  transport: document.querySelector("#transport"),
  networkExecution: document.querySelector("#network-execution"),
  storage: document.querySelector("#storage"),
  verification: document.querySelector("#verification"),
  runDemo: document.querySelector("#run-demo"),
  demoOutput: document.querySelector("#demo-output"),
};

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

async function renderPrototypeStatus() {
  try {
    const status = await invoke("prototype_status");

    setText(
      fields.releaseClaim,
      status.secure_release ? "Unexpected release claim" : "No secure-release claim",
    );
    setText(
      fields.messaging,
      status.usable_messaging ? "Unexpected messaging status" : "Disabled in prototype",
    );
    setText(fields.core, status.core_status);
    setText(fields.profile, status.profile_status);
    setText(fields.pairing, status.pairing_status);
    setText(fields.transport, status.transport_status);
    setText(fields.networkExecution, status.network_execution_status);
    setText(fields.storage, status.storage_status);
    setText(fields.verification, status.verification_status);
  } catch (_error) {
    setText(fields.releaseClaim, "No secure-release claim");
    setText(fields.messaging, "Disabled in prototype");
    setText(fields.core, "Core boundary only");
    setText(fields.profile, "Profile boundary only");
    setText(fields.pairing, "Pairing boundary only");
    setText(fields.transport, "Pre-network fail-closed only");
    setText(fields.networkExecution, "Network execution disabled");
    setText(fields.storage, "ADREC1 storage spike only");
    setText(fields.verification, "Lightweight checks only");
  }
}

async function runLocalDemo() {
  setText(fields.demoOutput, "Running local dev-insecure demo...");
  if (fields.runDemo) {
    fields.runDemo.disabled = true;
  }
  try {
    const result = await invoke("dev_local_demo");
    setText(fields.demoOutput, `${result.warning}${result.transcript}`);
  } catch (error) {
    setText(fields.demoOutput, `Local demo failed:\n${error}`);
  } finally {
    if (fields.runDemo) {
      fields.runDemo.disabled = false;
    }
  }
}

if (fields.runDemo) {
  fields.runDemo.addEventListener("click", runLocalDemo);
}

renderPrototypeStatus();

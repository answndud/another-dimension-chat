import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

const fields = {
  releaseClaim: document.querySelector("#release-claim"),
  messaging: document.querySelector("#messaging"),
  core: document.querySelector("#core"),
  profile: document.querySelector("#profile"),
  pairing: document.querySelector("#pairing"),
  transport: document.querySelector("#transport"),
  storage: document.querySelector("#storage"),
  verification: document.querySelector("#verification"),
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
    setText(fields.storage, status.storage_status);
    setText(fields.verification, status.verification_status);
  } catch (_error) {
    setText(fields.releaseClaim, "No secure-release claim");
    setText(fields.messaging, "Disabled in prototype");
    setText(fields.core, "Core boundary only");
    setText(fields.profile, "Profile boundary only");
    setText(fields.pairing, "Pairing boundary only");
    setText(fields.transport, "Tauri command unavailable");
    setText(fields.storage, "Storage boundary only");
    setText(fields.verification, "Lightweight checks only");
  }
}

renderPrototypeStatus();

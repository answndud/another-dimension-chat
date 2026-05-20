import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

const fields = {
  secureRelease: document.querySelector("#secure-release"),
  messaging: document.querySelector("#messaging"),
  profile: document.querySelector("#profile"),
  pairing: document.querySelector("#pairing"),
  transport: document.querySelector("#transport"),
  storage: document.querySelector("#storage"),
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
      fields.secureRelease,
      status.secure_release ? "Unexpected secure-release status" : "Not a secure release",
    );
    setText(
      fields.messaging,
      status.usable_messaging ? "Unexpected messaging status" : "Not available",
    );
    setText(fields.profile, status.profile_status);
    setText(fields.pairing, status.pairing_status);
    setText(fields.transport, status.transport_status);
    setText(fields.storage, status.storage_status);
  } catch (_error) {
    setText(fields.secureRelease, "Not a secure release");
    setText(fields.messaging, "Not available");
    setText(fields.profile, "Prototype boundary");
    setText(fields.pairing, "Prototype boundary");
    setText(fields.transport, "Tauri command unavailable");
    setText(fields.storage, "Prototype boundary");
  }
}

renderPrototypeStatus();

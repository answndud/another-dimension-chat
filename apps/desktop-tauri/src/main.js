import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

const fields = {
  secureRelease: document.querySelector("#secure-release"),
  messaging: document.querySelector("#messaging"),
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

    setText(fields.secureRelease, status.secure_release ? "Yes" : "No");
    setText(fields.messaging, status.usable_messaging ? "Available" : "Unavailable");
    setText(fields.transport, status.transport_status);
    setText(fields.storage, status.storage_status);
  } catch (_error) {
    setText(fields.secureRelease, "No");
    setText(fields.messaging, "Unavailable");
    setText(fields.transport, "Tauri command unavailable");
    setText(fields.storage, "Prototype boundary");
  }
}

renderPrototypeStatus();

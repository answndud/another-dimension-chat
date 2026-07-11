import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function requireText(path, text) {
  const body = read(path);
  if (!body.includes(text)) {
    throw new Error(`missing Windows local runtime boundary text in ${path}: ${text}`);
  }
}

function requireAnyText(path, label, texts) {
  const body = read(path);
  if (!texts.some((text) => body.includes(text))) {
    throw new Error(`missing Windows local runtime boundary text in ${path}: ${label}`);
  }
}

function rejectText(path, text) {
  const body = read(path);
  if (body.includes(text)) {
    throw new Error(`forbidden Windows local runtime boundary text in ${path}: ${text}`);
  }
}

function requireSensitivePublicNonclaim(path) {
  const body = read(path);
  if (body.includes("sensitive communication prohibited")) return;
  if (
    path === "README.md" &&
    (body.includes("it for sensitive communication.") ||
      body.includes("safety for sensitive communication"))
  ) {
    return;
  }
  throw new Error(`missing Windows local runtime boundary sensitive non-claim in ${path}`);
}

for (const file of ["SECURITY.md", "apps/desktop-tauri/README.md"]) {
  requireText(file, "Windows local runtime smoke boundary");
  requireText(file, "WebView2 runtime smoke");
  requireText(file, "app-data path review");
  requireText(file, "path separator review");
  requireText(file, "local deletion behavior");
  requireText(file, "redacted diagnostics");
  requireText(file, "diagnostics behavior");
  requireText(file, "explicit user action");
  requireText(file, "local build candidate only");
  requireText(file, "Windows local usable criteria are source-defined before artifact work");
  requireText(file, "Windows public artifact prerequisites");
  requireText(file, "release request");
  requireText(file, "local-manual envelope default path");
  requireText(file, "no public Windows artifact");
  requireText(file, "no Windows installer");
  requireText(file, "no public artifact");
  requireText(file, "public artifact upload");
  requireText(file, "not production-ready");
  requireSensitivePublicNonclaim(file);
  rejectText(file, "Windows local runtime smoke passed=true");
  rejectText(file, "Windows public-ready");
  rejectText(file, "Windows production-ready");
}

requireText("README.md", "Windows");
requireAnyText("README.md", "Windows local build candidate", [
  "Local build candidate only",
  "local desktop build candidate only",
  "Windows remains a local build candidate",
]);
requireAnyText("README.md", "no public Windows artifact or installer", [
  "no public artifact or installer",
  "no public Windows artifact",
]);
requireAnyText("README.md", "no Windows installer", [
  "no public artifact or installer",
  "no Windows installer",
]);
requireText("README.md", "not production-ready");
requireSensitivePublicNonclaim("README.md");
rejectText("README.md", "Windows local runtime smoke passed=true");
rejectText("README.md", "Windows public-ready");
rejectText("README.md", "Windows production-ready");

requireText("apps/desktop-tauri/package.json", '"test:windows-boundary"');
requireText("apps/desktop-tauri/package.json", "verify-windows-local-runtime-boundary.mjs");
requireText("apps/desktop-tauri/package.json", '"tauri:build:windows-nsis:shell"');
requireText("apps/desktop-tauri/package.json", "windows-public-shell");
requireText("apps/desktop-tauri/package.json", '"engine:prepare-sidecar:release"');
requireText("apps/desktop-tauri/package.json", '"engine:prepare-sidecar:release:full"');
requireText("apps/desktop-tauri/package.json", "prepare-engine-sidecar.mjs");
requireText("apps/desktop-tauri/src-tauri/tauri.conf.json", '"targets": "all"');
requireText("apps/desktop-tauri/src-tauri/tauri.sidecar.conf.json", '"externalBin"');
requireText("apps/desktop-tauri/src-tauri/tauri.sidecar.conf.json", "binaries/another-dimension-engine");
requireText("apps/desktop-tauri/scripts/prepare-engine-sidecar.mjs", "another-dimension-engine-");
requireText("apps/desktop-tauri/scripts/prepare-engine-sidecar.mjs", "x86_64-pc-windows-msvc");
requireText("apps/engine/src/main.rs", "ad-engine-sidecar-status-v1");
requireText("apps/engine/src/main.rs", "ad-engine-json-stdio-v1");
requireText("apps/engine/Cargo.toml", "full-runtime = [\"dep:another-dimension-core\"]");
requireText("apps/engine/src/main.rs", "contract-only-engine-sidecar");
requireText("apps/engine/src/main.rs", "manual-e2ee-engine-sidecar");
requireText("apps/engine/src/main.rs", "cfg!(feature = \"full-runtime\")");
requireText("apps/engine/src/main.rs", "app_launch_network_allowed: false");
requireText("apps/engine/src/main.rs", "room_open_network_allowed: false");
requireText("apps/engine/src/main.rs", "production_ready_claim: false");
requireText("apps/engine/src/main.rs", "high_risk_claim: false");
requireText("apps/engine/src/main.rs", "sensitive_communication_allowed: false");
requireText(".gitignore", "apps/desktop-tauri/src-tauri/binaries/another-dimension-engine-*");

requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "windows_is_local_build_candidate_only");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "tauri_app_data_resolver_required: true");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "tauri_app_cache_resolver_required: true");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "app_private_data_dir_required: true");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "user_synced_storage_location_allowed: false");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "encrypted_store_required: true");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "local_storage_paths_in_diagnostics_allowed: false");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "local_deletion_controls_required: true");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "explicit_user_action_required: true");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "automatic_network_on_launch_allowed: false");
requireText("apps/desktop-tauri/src-tauri/src/lib.rs", "auto_update_channel: false");

requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_runtime_smoke_required=true");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_local_runtime_smoke_status=source-boundary-only");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "artifact_type=windows-shell-nsis-exe-installer-candidate");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "runtime_mode=shell-sidecar-pending");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "onion_runtime_compiled=false");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_app_data_path_review_required=false");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_path_separator_review_required=false");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_local_deletion_behavior_review_required=false");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_redacted_diagnostics_behavior_review_required=false");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_explicit_user_action_review_required=true");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "public_artifact_upload_allowed=false");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "remaining_blocker=real-windows-artifact-runtime-manifest-evidence");
requireText("apps/desktop-tauri/src-tauri/src/main.rs", "engine_sidecar_contract_version");
requireText("apps/desktop-tauri/src-tauri/src/main.rs", "engine_sidecar_protocol");
requireText("apps/desktop-tauri/src-tauri/src/main.rs", "engine_sidecar_raw_path_returned: false");
requireText("apps/desktop-tauri/src-tauri/src/main.rs", "contract-only-engine-sidecar");

requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_app_data_path_review_required=true");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_path_separator_review_required=true");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_local_runtime_smoke_status=source-boundary-only");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_local_deletion_behavior_review_required=true");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_redacted_diagnostics_behavior_review_required=true");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_explicit_user_action_review_required=true");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_release_blocker=local-build-smoke-and-release-boundary-review");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "excluded_fields=${publicSupportDiagnosticsExcludedFieldsValue()}");
requireText("apps/desktop-tauri/src/private-delivery-state.test.js", "windows_app_data_path_review_required=true");
requireText("apps/desktop-tauri/src/private-delivery-state.test.js", "windows_path_separator_review_required=true");
requireText("apps/desktop-tauri/src/ui-smoke.test.js", "windows_release_blocker=local-build-smoke-and-release-boundary-review");

requireText("apps/desktop-tauri/src/main.js", "deleteProductionConversation");
requireText("apps/desktop-tauri/src/main.js", "deleteProductionProfile");
requireText("apps/desktop-tauri/src/main.js", "deleteProductionSessionLifecycle");
requireText("apps/desktop-tauri/src/main.js", "secure_delete_claim=false");
requireText("apps/desktop-tauri/src/main.js", "Public diagnostics copied");
requireText("apps/desktop-tauri/src/main.js", "windows_blocker=local-build-smoke-and-release-boundary-review");
rejectText("apps/desktop-tauri/src/main.js", "Windows local runtime smoke passed");

console.log("status=desktop-windows-local-runtime-smoke-boundary-ready");
console.log("windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary");
console.log("windows_local_runtime_smoke_status=source-boundary-only");
console.log("windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows");
console.log("windows_runtime_smoke_required=true");
console.log("windows_webview2_required=true");
console.log("windows_app_data_path_review_required=true");
console.log("windows_path_separator_review_required=true");
console.log("windows_local_deletion_behavior_review_required=true");
console.log("windows_redacted_diagnostics_behavior_review_required=true");
console.log("windows_explicit_user_action_review_required=true");
console.log("windows_public_artifact_ready=false");
console.log("windows_installer_ready=false");
console.log("windows_public_artifact_upload_allowed=false");
console.log("production_ready_claim=false");
console.log("sensitive_communication_allowed=false");

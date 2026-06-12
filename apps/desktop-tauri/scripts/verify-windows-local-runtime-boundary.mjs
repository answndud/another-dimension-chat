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

function rejectText(path, text) {
  const body = read(path);
  if (body.includes(text)) {
    throw new Error(`forbidden Windows local runtime boundary text in ${path}: ${text}`);
  }
}

const publicFiles = ["README.md", "SECURITY.md", "apps/desktop-tauri/README.md"];

for (const file of publicFiles) {
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
  requireText(file, "sensitive communication prohibited");
  rejectText(file, "Windows local runtime smoke passed=true");
  rejectText(file, "Windows public-ready");
  rejectText(file, "Windows production-ready");
}

requireText("apps/desktop-tauri/package.json", '"test:windows-boundary"');
requireText("apps/desktop-tauri/package.json", "verify-windows-local-runtime-boundary.mjs");
requireText("apps/desktop-tauri/src-tauri/tauri.conf.json", '"targets": "all"');

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
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_app_data_path_review_required=true");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "windows_path_separator_review_required=true");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "public_artifact_upload_allowed=false");
requireText("apps/desktop-tauri/src-tauri/src/status.rs", "remaining_blocker=windows-local-build-smoke-and-release-boundary-review");

requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_app_data_path_review_required=true");
requireText("apps/desktop-tauri/src/private-delivery-state.js", "windows_path_separator_review_required=true");
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

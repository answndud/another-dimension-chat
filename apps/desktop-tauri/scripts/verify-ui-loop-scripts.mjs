import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(new URL("..", import.meta.url).pathname);
const packageJson = JSON.parse(readFileSync(resolve(appRoot, "package.json"), "utf8"));
const scripts = packageJson.scripts || {};

const uiOnlyScripts = ["dev", "dev:ui", "dev:ui:peer-a", "dev:ui:peer-b", "build", "test", "test:state", "test:ui-fast"];
const nativeMarkers = /\b(?:tauri|cargo|with-cargo-target|engine:prepare-sidecar)\b|src-tauri/u;

function fail(message) {
  console.error(`ui_loop_scripts_valid=false reason=${message}`);
  process.exit(1);
}

for (const name of uiOnlyScripts) {
  const command = scripts[name];
  if (!command) fail(`missing-${name}`);
  if (nativeMarkers.test(command)) fail(`ui-only-script-calls-native-${name}`);
}

for (const alias of ["test:state", "test:ui-fast"]) {
  if (scripts[alias] !== "npm test") {
    fail(`${alias}-must-alias-all-js-tests`);
  }
}

const nativeShell = scripts["test:native-shell"] || "";
if (!/cargo check --manifest-path src-tauri\/Cargo\.toml/u.test(nativeShell)) {
  fail("native-shell-test-must-be-cargo-check");
}

if (!scripts["tauri:dev"]?.includes("tauri dev")) {
  fail("tauri-dev-native-shell-entry-missing");
}

console.log("ui_loop_scripts_valid=true");

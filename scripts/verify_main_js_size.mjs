#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const mainJsPath = resolve(rootDir, "apps/desktop-tauri/src/main.js");

const maxMainJsLines = 19800;
const mainJs = readFileSync(mainJsPath, "utf8");
const lineCount = mainJs.endsWith("\n")
  ? mainJs.slice(0, -1).split("\n").length
  : mainJs.split("\n").length;

if (lineCount > maxMainJsLines) {
  console.error(
    [
      `main.js line-count guard failed: ${lineCount} > ${maxMainJsLines}`,
      "Move new behavior into a focused module/controller instead of growing main.js.",
      "If a deliberate extraction temporarily changes the baseline, lower or reset maxMainJsLines in this script in the same change.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`main_js_line_count=${lineCount}`);
console.log(`main_js_line_count_limit=${maxMainJsLines}`);
console.log("main_js_size_status=ok");

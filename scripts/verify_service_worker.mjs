#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "apps/web/public/sw.js"), "utf8");
const required = [
  ["integrity manifest", /asset-integrity\.json/],
  ["no-store manifest fetch", /fetch\(INTEGRITY_URL, \{ cache: "no-store" \}\)/],
  ["asset digest verification", /static asset integrity mismatch/],
  ["install shell population", /event\.waitUntil\([\s\S]*caches\.open\(CACHE\)/],
  ["stale cache cleanup", /names\.filter\(\(name\) => name !== CACHE\)\.map\(\(name\) => caches\.delete\(name\)\)/],
  ["navigation network revalidation", /event\.request\.mode === "navigate"[\s\S]*fetch\(event\.request, \{ cache: "no-store" \}\)/],
  ["API bypass", /url\.pathname\.startsWith\("\/api\/"\)/],
  ["cached fallback", /caches\.match\("\/"\)/],
];
for (const [label, pattern] of required) {
  if (!pattern.test(source)) throw new Error(`service worker verifier: missing ${label}`);
}
if (/skipWaiting\s*\(/.test(source)) throw new Error("service worker verifier: skipWaiting would replace live tabs unexpectedly");
console.log(`service worker verifier passed: ${required.length} lifecycle and cache boundaries`);

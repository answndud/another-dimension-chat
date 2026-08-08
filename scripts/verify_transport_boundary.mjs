import { readFile } from "node:fs/promises";
import { loadProductBoundary } from "./product_boundary.mjs";

const boundary = await loadProductBoundary(".");
const transport = boundary.transportPolicy;
const files = new Map([
  ["apps/server/routes.mjs", ["highRiskAllowed: false", "highRiskTransport: \"disabled\"", "supportedTransports"]],
  ["apps/daemon/src/relay_http.rs", ["does not accept an HTTPS endpoint without a configured trust pin"]],
  ["apps/web/src/main.js", ["고위험 통신을 시작하려면 터미널에서 발급한 일회성 주소"]],
  ["scripts/configure_local_server.mjs", ["Onion/Tor public URLs are not supported"]],
  ["reference/PRODUCT_BOUNDARY.md", ["high-risk route is permanently disabled"]],
  ["reference/TRANSPORT_DECISION.md", ["permanently disabled in the v0.1 web product"]],
]);
const failures = [];
if (boundary.highRiskAllowed !== false) failures.push("product boundary enables high-risk transport");
if (!boundary.nonClaims.includes("anonymity")) failures.push("anonymity is missing from product non-claims");
if (!transport || transport.highRiskMode !== "disabled") failures.push("transport policy must keep high-risk mode disabled");
if (!Array.isArray(transport?.visibleMetadata) || transport.visibleMetadata.length < 4) failures.push("transport policy must enumerate visible metadata");
const routes = new Map((transport?.supportedRoutes || []).map((route) => [route.id, route]));
for (const routeId of ["loopback", "direct-https-low-risk"]) {
  const route = routes.get(routeId);
  if (!route || route.risk !== "low-risk" || route.anonymity !== false) failures.push(`${routeId} must be explicitly low-risk and non-anonymous`);
}
const bounds = transport?.relayBounds;
for (const [field, minimum] of [["maxEnvelopeBytes", 1], ["maxInboxItems", 1], ["maxEnvelopePostsPerMinute", 1], ["maxBlobBytes", 1], ["maxBlobTtlDays", 1]]) {
  if (!Number.isSafeInteger(bounds?.[field]) || bounds[field] < minimum) failures.push(`transport relay bound is invalid: ${field}`);
}
for (const feature of ["onion routing", "traffic padding", "dummy traffic", "timing obfuscation"]) {
  if (!transport.notImplemented.includes(feature)) failures.push(`unsupported transport feature is not declared: ${feature}`);
}
for (const [file, markers] of files) {
  const source = await readFile(file, "utf8");
  for (const marker of markers) if (!source.includes(marker)) failures.push(`${file}: missing transport boundary marker: ${marker}`);
}
const currentProductSources = ["apps/daemon/src/relay_http.rs", "apps/web/src/main.js", "apps/server/server.mjs", "apps/server/routes.mjs"];
for (const file of currentProductSources) {
  const source = await readFile(file, "utf8");
  if (/production_onion|TransportRoute::OnionService|arti-adapter-spike/.test(source)) failures.push(`${file}: legacy onion implementation leaked into current product source`);
}
const server = await readFile("apps/server/server.mjs", "utf8");
const runtimeBounds = [
  ["MAX_ENVELOPE_BYTES", "96 * 1024", bounds.maxEnvelopeBytes],
  ["MAX_INBOX_ITEMS", "256", bounds.maxInboxItems],
  ["MAX_POSTS_PER_WINDOW", "30", bounds.maxEnvelopePostsPerMinute],
  ["MAX_BLOB_BYTES", "32 * 1024 * 1024", bounds.maxBlobBytes],
];
for (const [constant, expression, expected] of runtimeBounds) {
  const match = server.match(new RegExp(`const ${constant} = ([^;]+);`));
  if (!match || match[1].trim() !== expression || Function(`return ${match[1]}`)() !== expected) failures.push(`server ${constant} does not match declared transport bound`);
}
if (!/const MAX_BLOB_TTL_MS = 7 \* 24 \* 60 \* 60 \* 1000;/.test(server) || bounds.maxBlobTtlDays !== 7) failures.push("server blob TTL does not match declared seven-day bound");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("transport boundary passed: high-risk/onion routes are explicitly disabled in the web product");

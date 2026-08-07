import { readFile } from "node:fs/promises";
import { loadProductBoundary } from "./product_boundary.mjs";

const boundary = await loadProductBoundary(".");
const files = new Map([
  ["apps/server/routes.mjs", ["highRiskAllowed: false", "highRiskTransport: \"disabled\"", "supportedTransports"]],
  ["apps/daemon/src/relay_http.rs", ["does not accept an HTTPS endpoint without a configured trust pin"]],
  ["apps/web/src/main.js", ["고위험 통신을 시작하려면 CLI 데몬"]],
  ["scripts/configure_local_server.mjs", ["Onion/Tor public URLs are not supported"]],
  ["reference/PRODUCT_BOUNDARY.md", ["high-risk route is permanently disabled"]],
  ["reference/TRANSPORT_DECISION.md", ["permanently disabled in the v0.1 web product"]],
]);
const failures = [];
if (boundary.highRiskAllowed !== false) failures.push("product boundary enables high-risk transport");
if (!boundary.nonClaims.includes("anonymity")) failures.push("anonymity is missing from product non-claims");
for (const [file, markers] of files) {
  const source = await readFile(file, "utf8");
  for (const marker of markers) if (!source.includes(marker)) failures.push(`${file}: missing transport boundary marker: ${marker}`);
}
const currentProductSources = ["apps/daemon/src/relay_http.rs", "apps/web/src/main.js", "apps/server/server.mjs", "apps/server/routes.mjs"];
for (const file of currentProductSources) {
  const source = await readFile(file, "utf8");
  if (/production_onion|TransportRoute::OnionService|arti-adapter-spike/.test(source)) failures.push(`${file}: legacy onion implementation leaked into current product source`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("transport boundary passed: high-risk/onion routes are explicitly disabled in the web product");

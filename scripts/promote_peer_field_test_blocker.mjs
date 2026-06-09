#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const resultsFile = process.argv[2] ?? path.join(root, "docs/BETA_FIELD_TEST_RESULTS.md");
const outputFile = process.argv[3] ?? path.join(root, "docs/PEER_FIELD_TEST_BLOCKER.md");

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

if (!fs.existsSync(resultsFile)) {
  fail(`missing results file: ${resultsFile}`);
}

const text = fs.readFileSync(resultsFile, "utf8");
const sections = text
  .split(/^## External Peer Summary - /m)
  .slice(1)
  .map((section) => `## External Peer Summary - ${section.trim()}`)
  .filter(Boolean);

if (sections.length === 0) {
  fail("no external peer summary sections found");
}

const latest = sections.at(-1);
const heading = latest.match(/^## External Peer Summary - ([^\n]+)/)?.[1]?.trim() ?? "unknown";
const peerBlocks = latest
  .split(/^## /m)
  .slice(1)
  .map((block) => `## ${block.trim()}`)
  .filter((block) => /^## peer-[a-z0-9_-]+\.md\b/i.test(block));

if (peerBlocks.length < 2) {
  fail("latest summary does not contain two peer blocks");
}

const blockers = peerBlocks.map((block) => {
  const peer = block.match(/^## ([^\n]+)/)?.[1]?.trim() ?? "unknown-peer";
  const firstBlocker = block.match(/^- First blocker:\s*(.*)$/m)?.[1]?.trim() ?? "missing";
  const nonOkFields = block.match(/^- Non-OK fields:\s*(.*)$/m)?.[1]?.trim() ?? "missing";
  return { peer, firstBlocker, nonOkFields };
});

const actionable = blockers.filter(({ firstBlocker, nonOkFields }) => {
  const normalizedBlocker = firstBlocker.toLowerCase();
  const normalizedNonOk = nonOkFields.toLowerCase();
  return (
    normalizedBlocker !== "missing" ||
    (normalizedNonOk !== "none" && normalizedNonOk !== "missing")
  );
});

const status = actionable.length === 0 ? "no-first-blocker-found" : "first-blocker-candidate";

const body = [
  "# Peer Field-Test Blocker Candidate",
  "",
  "This file is generated only from the safe summary in `docs/BETA_FIELD_TEST_RESULTS.md`.",
  "It must not contain raw bridge lines, onion endpoints, invite codes, payloads, safety phrases, passphrases, profile names, message text, local paths, raw logs, or key material.",
  "",
  `- Source summary: ${heading}`,
  `- Status: ${status}`,
  "",
  "## Peer Summaries",
  "",
  ...blockers.flatMap(({ peer, firstBlocker, nonOkFields }) => [
    `### ${peer}`,
    "",
    `- First blocker: ${firstBlocker}`,
    `- Non-OK fields: ${nonOkFields}`,
    "",
  ]),
  "## Promotion Decision",
  "",
  actionable.length === 0
    ? "- No first blocker candidate was found in the latest safe summary. Do not create a functionality phase from this file alone."
    : "- Promote the earliest shared non-OK delivery step into the next concrete functionality phase.",
  "- Keep bridge/censorship wording limited to verified configurations.",
  "- Keep public claims as unsigned experimental public beta, sensitive communication prohibited, not audited, not production-ready.",
  "",
].join("\n");

fs.writeFileSync(outputFile, body, "utf8");
console.log(`blocker_file=${outputFile}`);
console.log(`status=${status}`);

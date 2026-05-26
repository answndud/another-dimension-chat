import assert from "node:assert/strict";
import test from "node:test";

import { transcriptRetentionView } from "./transcript-retention.js";

test("transcriptRetentionView reports active TTLs with compact units", () => {
  assert.deepEqual(transcriptRetentionView({ ttlSeconds: 3600 }), {
    label: "retention: 1h active",
    state: "is-active",
  });
  assert.deepEqual(transcriptRetentionView({ ttl_seconds: 604800 }), {
    label: "retention: 7d active",
    state: "is-active",
  });
  assert.deepEqual(transcriptRetentionView({ ttlSeconds: 90 }), {
    label: "retention: 90s active",
    state: "is-active",
  });
});

test("transcriptRetentionView marks expired entries before TTL formatting", () => {
  assert.deepEqual(transcriptRetentionView({ ttlSeconds: 604800, expired: true }), {
    label: "retention: expired",
    state: "is-expired",
  });
});

test("transcriptRetentionView treats missing or invalid TTL as legacy", () => {
  assert.deepEqual(transcriptRetentionView(null), {
    label: "retention: legacy",
    state: "is-unknown",
  });
  assert.deepEqual(transcriptRetentionView({ ttlSeconds: 0 }), {
    label: "retention: legacy",
    state: "is-unknown",
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { combinedTwoProfileTranscriptTsv } from "./transcript-export.js";

const header = "direction\tmessage_number\tcreated_at_ms\tttl_seconds\texpires_at_ms\tmessage";

test("combinedTwoProfileTranscriptTsv merges both profile exports in conversation order", () => {
  const alice = {
    transcript_tsv: [
      header,
      "sent\t2\t300\t604800\t604900\tsecond from alice",
      "received\t1\t100\t604800\t604900\tfirst from bob",
      "",
    ].join("\n"),
  };
  const bob = {
    transcript_tsv: [
      header,
      "received\t2\t301\t604800\t604901\tsecond from alice",
      "sent\t1\t99\t604800\t604899\tfirst from bob",
      "",
    ].join("\n"),
  };

  assert.equal(
    combinedTwoProfileTranscriptTsv("alice", alice, "bob", bob),
    [
      "source_profile\tdirection\tmessage_number\tcreated_at_ms\tttl_seconds\texpires_at_ms\tmessage",
      "bob\tsent\t1\t99\t604800\t604899\tfirst from bob",
      "alice\treceived\t1\t100\t604800\t604900\tfirst from bob",
      "alice\tsent\t2\t300\t604800\t604900\tsecond from alice",
      "bob\treceived\t2\t301\t604800\t604901\tsecond from alice",
      "",
    ].join("\n"),
  );
});

test("combinedTwoProfileTranscriptTsv keeps a header for empty or missing exports", () => {
  assert.equal(
    combinedTwoProfileTranscriptTsv("alice", null, "bob", { transcript_tsv: `${header}\n` }),
    "source_profile\tdirection\tmessage_number\tcreated_at_ms\tttl_seconds\texpires_at_ms\tmessage\n",
  );
});

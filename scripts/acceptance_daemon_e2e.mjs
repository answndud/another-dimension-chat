#!/usr/bin/env node

// The implementation lives in the repair scenario so existing operator and CI
// entrypoints keep working. Importing it executes the complete isolated flow.
await import("./acceptance_daemon_repair.mjs");

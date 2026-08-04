#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const cli = await readFile("apps/daemon/src/cli.rs", "utf8");
const main = await readFile("apps/daemon/src/main.rs", "utf8");
const failures = [];
for (const marker of ["init", "identity show", "doctor", "recovery export", "recovery import", "ADRECOVERY1", "ADIDENTITY1", "UnsafeSecretArgument", "read_to_string", "release readiness blocked"]) {
  if (!cli.includes(marker) && !main.includes(marker)) failures.push(`CLI workflow marker missing: ${marker}`);
}
for (const forbidden of ["println!(\"passphrase", "localStorage", "IndexedDB"]) {
  if (cli.includes(forbidden) || main.includes(forbidden)) failures.push(`CLI contains forbidden secret/storage surface: ${forbidden}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("CLI workflow boundary passed: stdin passphrase, init/doctor/identity/recovery, and secret-argument rejection present");

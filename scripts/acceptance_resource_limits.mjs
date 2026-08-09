import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const limits = JSON.parse(await readFile(join(root, "reference/RESOURCE_LIMITS.json"), "utf8")).limits;
const files = new Map(await Promise.all([
  ["bridge", "apps/daemon/src/bridge_http.rs"],
  ["session", "apps/daemon/src/mls_session.rs"],
  ["attachment", "apps/daemon/src/attachment.rs"],
  ["storage", "apps/daemon/src/storage.rs"],
  ["authority", "apps/daemon/src/authority_routes.rs"],
  ["server", "apps/daemon/src/http_server.rs"],
  ["maintenance", "apps/daemon/src/maintenance.rs"],
  ["controller", "apps/web/src/daemon-controller.js"],
].map(async ([name, file]) => [name, await readFile(join(root, file), "utf8")])))
  ;
const failures = [];
const expect = (name, pattern, message) => {
  if (!pattern.test(files.get(name))) failures.push(message);
};

expect("bridge", /MAX_REQUEST_BYTES: usize = 192 \* 1024/, "daemon request limit changed without updating RESOURCE_LIMITS.json");
expect("session", /MAX_MESSAGE_BYTES: usize = 64 \* 1024/, "MLS message limit changed without updating RESOURCE_LIMITS.json");
expect("attachment", /CHUNK_SIZE: usize = 64 \* 1024/, "attachment chunk size changed without updating RESOURCE_LIMITS.json");
expect("attachment", /MAX_ATTACHMENT_BYTES: usize = 32 \* 1024 \* 1024/, "attachment size limit changed without updating RESOURCE_LIMITS.json");
expect("storage", new RegExp(`MAX_RECORDS: usize = ${limits.encryptedRecordCount}`), "encrypted record count limit changed without updating RESOURCE_LIMITS.json");
expect("storage", /MAX_VALUE_BYTES: usize = 4 \* 1024 \* 1024/, "encrypted record value limit changed without updating RESOURCE_LIMITS.json");
expect("authority", /\.clamp\(1, 200\)/, "message page size is no longer bounded to 200 records");
expect("authority", /records_with_prefix_page\(/, "message history no longer uses paged encrypted storage reads");
expect("bridge", new RegExp(`MAX_AUTOMATIC_RETRIES_PER_TICK: usize = ${limits.automaticRetriesPerTick}`), "retry-per-tick bound changed without updating RESOURCE_LIMITS.json");
expect("maintenance", /\.take\(MAX_AUTOMATIC_RETRIES_PER_TICK\)/, "automatic retries are no longer bounded per maintenance tick");
expect("server", /Duration::from_secs\(15\)/, "maintenance interval changed without updating RESOURCE_LIMITS.json");
expect("controller", /maxLength = 65536/, "browser message input has no bounded length");

if (failures.length) {
  console.error("resource-limit acceptance failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("resource-limit acceptance passed: request, message, attachment, storage, pagination, retry, and maintenance bounds are enforced");

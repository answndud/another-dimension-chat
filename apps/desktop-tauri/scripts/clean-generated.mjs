import { removeGeneratedArtifacts } from "./storage-budget.mjs";

const removed = removeGeneratedArtifacts();

for (const path of removed) {
  console.log(`removed=${path}`);
}

console.log(`removed_count=${removed.length}`);

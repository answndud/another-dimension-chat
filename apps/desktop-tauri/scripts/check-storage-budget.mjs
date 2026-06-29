import { checkStorageBudget } from "./storage-budget.mjs";

try {
  console.log(checkStorageBudget());
} catch (error) {
  if (error && typeof error === "object" && "report" in error && error.report) {
    console.error(error.report);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkStorageBudget, removeGeneratedArtifacts } from "./storage-budget.mjs";

function runCommand(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: options.shell ?? process.platform === "win32",
      stdio: options.stdio ?? "inherit",
    });

    const cleanup = () => {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    };

    const finish = (result) => {
      cleanup();
      resolveRun(result);
    };

    const fail = (error) => {
      cleanup();
      rejectRun(error);
    };

    const terminate = (signal) => {
      if (!child.killed) {
        child.kill(signal);
      }
      finish({ code: 128, signal: null });
    };

    const onSigint = () => terminate("SIGINT");
    const onSigterm = () => terminate("SIGTERM");

    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);

    child.on("exit", (code, signal) => {
      if (signal) {
        finish({ code: 128, signal });
        return;
      }
      finish({ code: code ?? 1, signal: null });
    });

    child.on("error", fail);
  });
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isCli) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.error("usage: node scripts/run-clean-build.mjs <command> [...args]");
    process.exit(2);
  }

  const repoRoot = resolve(
    process.env.AD_REPO_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
  );
  removeGeneratedArtifacts(repoRoot);

  let result;
  try {
    result = await runCommand(command, args, { cwd: repoRoot, env: process.env });
  } finally {
    removeGeneratedArtifacts(repoRoot);
  }

  if (result.code === 0 && process.env.AD_SKIP_STORAGE_BUDGET !== "1") {
    checkStorageBudget({ repoRoot });
  }

  process.exit(result.code);
}

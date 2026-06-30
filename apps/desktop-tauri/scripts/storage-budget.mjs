import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const generatedSidecarPrefix = "another-dimension-engine-";
export const budgetLimitBytes = 500 * 1024 * 1024;
export const trackedFileLimit = 180;
export const trackedDirectoryLimit = 45;
export const frontendSourceFileLimit = 32;
export const referenceFileLimit = 4;
export const scriptFileLimit = 4;

function resolveLayout(root = repoRoot) {
  const desktopRoot = resolve(root, "apps/desktop-tauri");
  return {
    repoRoot: root,
    desktopRoot,
    generatedTargetPaths: [
      resolve(root, "target"),
      resolve(desktopRoot, "src-tauri/target"),
      resolve(root, ".build-cache"),
      resolve(desktopRoot, "dist"),
      resolve(desktopRoot, ".vite"),
      resolve(root, ".vite"),
    ],
    generatedSidecarDir: resolve(desktopRoot, "src-tauri/binaries"),
  };
}

function pathSizeBytes(path) {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function pathParent(path) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function listTrackedSourcePaths(root = repoRoot) {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status === 0) {
    return result.stdout.toString("utf8").split("\0").filter(Boolean);
  }

  const { desktopRoot, generatedTargetPaths, generatedSidecarDir } = resolveLayout(root);
  const excludedRoots = new Set([
    resolve(root, ".git"),
    resolve(root, "node_modules"),
    resolve(desktopRoot, "node_modules"),
    ...generatedTargetPaths,
    generatedSidecarDir,
  ]);

  const paths = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(current, entry.name);
      if ([...excludedRoots].some((excludedRoot) => entryPath === excludedRoot || entryPath.startsWith(`${excludedRoot}/`))) {
        continue;
      }
      const entryStat = statSync(entryPath);
      if (entryStat.isDirectory()) {
        stack.push(entryPath);
      } else if (entryStat.isFile()) {
        paths.push(entryPath.slice(root.length + 1));
      }
    }
  }

  return paths;
}

function directorySizeBytes(root) {
  if (!existsSync(root)) {
    return 0;
  }

  let total = 0;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(current, entry.name);
      const entryStat = statSync(entryPath);
      if (entryStat.isDirectory()) {
        stack.push(entryPath);
      } else if (entryStat.isFile()) {
        total += entryStat.size;
      }
    }
  }
  return total;
}

function trackedSourceSizeBytes(root = repoRoot) {
  const files = listTrackedSourcePaths(root);
  let total = 0;
  for (const relativePath of files) {
    total += pathSizeBytes(resolve(root, relativePath));
  }
  return total;
}

function directoryFileCounts(paths) {
  const counts = new Map();
  for (const relativePath of paths) {
    let current = pathParent(relativePath);
    while (current) {
      counts.set(current, (counts.get(current) ?? 0) + 1);
      current = pathParent(current);
    }
  }
  return counts;
}

function listTrackedDirectorySummaries(paths, limit = 10) {
  return [...directoryFileCounts(paths).entries()]
    .map(([directory, trackedFileCount]) => ({ directory, trackedFileCount }))
    .sort((left, right) => {
      if (right.trackedFileCount !== left.trackedFileCount) {
        return right.trackedFileCount - left.trackedFileCount;
      }
      return left.directory.localeCompare(right.directory);
    })
    .slice(0, limit);
}

function countTrackedFilesUnderPrefix(paths, prefix) {
  const normalizedPrefix = `${prefix}/`;
  return paths.filter((path) => path.startsWith(normalizedPrefix)).length;
}

function measureRepositoryStructure(root = repoRoot) {
  const trackedPaths = listTrackedSourcePaths(root);
  return {
    trackedFileCount: trackedPaths.length,
    trackedDirectoryCount: directoryFileCounts(trackedPaths).size,
    frontendSourceFileCount: countTrackedFilesUnderPrefix(trackedPaths, "apps/desktop-tauri/src"),
    referenceFileCount: countTrackedFilesUnderPrefix(trackedPaths, "reference"),
    scriptFileCount: countTrackedFilesUnderPrefix(trackedPaths, "scripts"),
    largestTrackedDirectories: listTrackedDirectorySummaries(trackedPaths),
  };
}

export { measureRepositoryStructure };

function gitMetadataSizeBytes(root = repoRoot) {
  return directorySizeBytes(resolve(root, ".git"));
}

function dependencySizeBytes(root = repoRoot) {
  const { desktopRoot } = resolveLayout(root);
  const dependencyRoots = [
    resolve(root, "node_modules"),
    resolve(desktopRoot, "node_modules"),
  ];
  return dependencyRoots.reduce((total, path) => total + directorySizeBytes(path), 0);
}

function generatedSidecarSizeBytes(root = repoRoot) {
  const { generatedSidecarDir } = resolveLayout(root);
  if (!existsSync(generatedSidecarDir)) {
    return 0;
  }
  let total = 0;
  for (const entry of readdirSync(generatedSidecarDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.startsWith(generatedSidecarPrefix)) {
      total += pathSizeBytes(join(generatedSidecarDir, entry.name));
    }
  }
  return total;
}

function generatedArtifactSizeBytes(root = repoRoot) {
  const { generatedTargetPaths } = resolveLayout(root);
  let total = 0;
  for (const generatedPath of generatedTargetPaths) {
    total += directorySizeBytes(generatedPath);
  }
  total += generatedSidecarSizeBytes(root);
  return total;
}

export function listForbiddenGeneratedPaths(root = repoRoot) {
  const { generatedTargetPaths, generatedSidecarDir } = resolveLayout(root);
  const paths = [];
  for (const generatedPath of generatedTargetPaths) {
    if (existsSync(generatedPath)) {
      paths.push(generatedPath);
    }
  }
  if (existsSync(generatedSidecarDir)) {
    for (const entry of readdirSync(generatedSidecarDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.startsWith(generatedSidecarPrefix)) {
        paths.push(join(generatedSidecarDir, entry.name));
      }
    }
  }
  return paths;
}

export function removeGeneratedArtifacts(root = repoRoot) {
  const { generatedTargetPaths, generatedSidecarDir } = resolveLayout(root);
  const removed = [];
  for (const generatedPath of generatedTargetPaths) {
    if (existsSync(generatedPath)) {
      rmSync(generatedPath, { recursive: true, force: true });
      removed.push(generatedPath);
    }
  }

  if (existsSync(generatedSidecarDir)) {
    for (const entry of readdirSync(generatedSidecarDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.startsWith(generatedSidecarPrefix)) {
        rmSync(join(generatedSidecarDir, entry.name), { force: true });
        removed.push(join(generatedSidecarDir, entry.name));
      }
    }
  }

  return removed;
}

export function measureStorageBudget(root = repoRoot) {
  const sourceBytes = trackedSourceSizeBytes(root);
  const gitBytes = gitMetadataSizeBytes(root);
  const dependenciesBytes = dependencySizeBytes(root);
  const generatedBytes = generatedArtifactSizeBytes(root);
  return {
    sourceBytes,
    gitBytes,
    dependenciesBytes,
    generatedBytes,
    checkoutBytes: sourceBytes + gitBytes + generatedBytes,
  };
}

export function formatStorageBudgetReport(stats) {
  return [
    `source_bytes=${stats.sourceBytes}`,
    `git_bytes=${stats.gitBytes}`,
    `dependencies_bytes=${stats.dependenciesBytes}`,
    `generated_bytes=${stats.generatedBytes}`,
    `checkout_bytes=${stats.checkoutBytes}`,
  ].join("\n");
}

export function formatRepositoryStructureReport(structure) {
  const lines = [
    `tracked_file_count=${structure.trackedFileCount}`,
    `tracked_directory_count=${structure.trackedDirectoryCount}`,
    `frontend_source_file_count=${structure.frontendSourceFileCount}`,
    `reference_file_count=${structure.referenceFileCount}`,
    `script_file_count=${structure.scriptFileCount}`,
  ];
  for (const entry of structure.largestTrackedDirectories) {
    lines.push(`largest_tracked_directory=${entry.directory} tracked_file_count=${entry.trackedFileCount}`);
  }
  return lines.join("\n");
}

export function checkStorageBudget({ repoRoot: root = repoRoot, budgetBytes = budgetLimitBytes } = {}) {
  const stats = measureStorageBudget(root);
  const structure = measureRepositoryStructure(root);
  const forbiddenPaths = listForbiddenGeneratedPaths(root);
  const lines = [formatStorageBudgetReport(stats), formatRepositoryStructureReport(structure)];

  if (forbiddenPaths.length > 0) {
    lines.push(`forbidden_generated_paths=${forbiddenPaths.length}`);
    for (const path of forbiddenPaths) {
      lines.push(`forbidden_path=${path}`);
    }
    const error = new Error("forbidden-generated-paths-present");
    error.report = lines.join("\n");
    throw error;
  }

  const structureBudgetExceeded =
    structure.trackedFileCount > trackedFileLimit ||
    structure.trackedDirectoryCount > trackedDirectoryLimit ||
    structure.frontendSourceFileCount > frontendSourceFileLimit ||
    structure.referenceFileCount > referenceFileLimit ||
    structure.scriptFileCount > scriptFileLimit;

  if (structureBudgetExceeded) {
    lines.push(`tracked_file_limit=${trackedFileLimit}`);
    lines.push(`tracked_directory_limit=${trackedDirectoryLimit}`);
    lines.push(`frontend_source_file_limit=${frontendSourceFileLimit}`);
    lines.push(`reference_file_limit=${referenceFileLimit}`);
    lines.push(`script_file_limit=${scriptFileLimit}`);
    const error = new Error("structure-budget-exceeded");
    error.report = lines.join("\n");
    throw error;
  }

  if (stats.checkoutBytes > budgetBytes) {
    lines.push(`budget_limit_bytes=${budgetBytes}`);
    const error = new Error("checkout-budget-exceeded");
    error.report = lines.join("\n");
    throw error;
  }

  return lines.join("\n");
}

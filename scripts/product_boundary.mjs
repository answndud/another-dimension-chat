import { readFile } from "node:fs/promises";
import path from "node:path";

export const PRODUCT_BOUNDARY_FILE = "reference/product_boundary.json";

export async function loadProductBoundary(root = ".") {
  const file = path.join(root, PRODUCT_BOUNDARY_FILE);
  const boundary = JSON.parse(await readFile(file, "utf8"));
  if (boundary.format !== "another-dimension-product-boundary" || boundary.version !== 1) {
    throw new Error("unsupported product boundary format");
  }
  if (
    typeof boundary.supportedProduct !== "string"
    || !boundary.supportedProduct.includes("local OpenMLS daemon")
    || boundary.candidateProductPath !== "apps/daemon"
    || boundary.highRiskAllowed !== false
  ) {
    throw new Error("product boundary must fail closed for high-risk mode");
  }
  for (const field of ["forbiddenReleasePaths", "developmentOnlyModes", "requiredReleaseFiles", "nonClaims"]) {
    if (!Array.isArray(boundary[field]) || boundary[field].some((value) => typeof value !== "string" || !value)) {
      throw new Error(`product boundary field is invalid: ${field}`);
    }
  }
  return boundary;
}

export function isForbiddenReleasePath(relativePath, forbiddenPaths) {
  const normalized = relativePath.split(path.sep).join("/");
  return forbiddenPaths.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

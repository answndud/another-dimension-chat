import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const serverDir = resolve("dist", "server");
await mkdir(serverDir, { recursive: true });
await writeFile(
  resolve(serverDir, "index.js"),
  `const assetResponse = (request, env) => env.ASSETS.fetch(request);\n\nexport default {\n  async fetch(request, env) {\n    const response = await assetResponse(request, env);\n    if (response.status !== 404 || request.method !== "GET") return response;\n\n    const fallback = new URL(request.url);\n    fallback.pathname = "/";\n    return assetResponse(new Request(fallback, request), env);\n  },\n};\n`,
  "utf8",
);

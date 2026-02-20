import { build } from "esbuild";

await build({
  entryPoints: ["src/mcp-server.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outdir: "dist",
  format: "cjs",
  sourcemap: true,
  external: ["@modelcontextprotocol/sdk", "zod", "@aws-sdk/*"],
  banner: { js: "#!/usr/bin/env node" },
});

console.log("Build complete → dist/mcp-server.js");

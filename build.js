import { build } from "esbuild";
import path from "path";
import fs from "fs";

const packages = fs.readdirSync("dist").filter(f => fs.statSync(`dist/${f}`).isDirectory());

for (const pkg of packages) {
  build({
    entryPoints: [`dist/${pkg}/index.js`],
outfile: `dist/${pkg}/index.js`,
    bundle: true,
    minify: true,
    platform: "node",
    format: "esm",
    target: ["node20"],
    sourcemap: true,
    allowOverwrite: true
  }).catch(() => process.exit(1));
}

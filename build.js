import { build } from "esbuild";
import path from "path";
import fs from "fs";

const distDir = path.resolve("dist");
const packages = fs.readdirSync(distDir).filter(f =>
  fs.statSync(path.join(distDir, f)).isDirectory()
);

(async () => {
  for (const pkg of packages) {
    try {
      await build({
        entryPoints: [path.join(distDir, pkg, "index.js")],
        outfile: path.join(distDir, pkg, "index.js"), 
        bundle: true,
        minify: true,
        platform: "node",
        format: "esm",
        target: ["node20"],
        sourcemap:"external",
        sourcesContent:false,
        logLevel: "info",
        allowOverwrite:true
      });
      console.log(`Built ${pkg}`);
    } catch (err) {
      console.error(`Failed to build ${pkg}`, err);
      process.exit(1);
    }
  }
})();

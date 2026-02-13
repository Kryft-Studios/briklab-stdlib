import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const args = new Set(process.argv.slice(2));

const configureOnly = args.has("--configure-only");
const nativeOnly = args.has("--native-only");
const skipNative = args.has("--skip-native");

const shouldMinify = !configureOnly && !nativeOnly;
const shouldNative = !skipNative;

const nodeGypBin = process.platform === "win32" ? "node-gyp.cmd" : "node-gyp";

function runCommand(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed (${command} ${commandArgs.join(" ")}) in ${cwd}`);
  }
}

function findNativeSubmodules() {
  if (!fs.existsSync(srcDir)) return [];

  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(srcDir, name, "node", "binding.gyp")));
}

function copyBuiltAddon(submodule) {
  const nodeDir = path.join(srcDir, submodule, "node");
  const releaseDir = path.join(nodeDir, "build", "Release");
  if (!fs.existsSync(releaseDir)) return;

  const files = fs.readdirSync(releaseDir).filter((f) => f.endsWith(".node"));
  if (files.length === 0) return;

  const preferred = files.find((f) => path.parse(f).name === submodule) ?? files[0];
  const from = path.join(releaseDir, preferred);
  const toDir = path.join(distDir, submodule, "native");
  const to = path.join(toDir, `${submodule}.node`);

  fs.mkdirSync(toDir, { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`[native] copied ${submodule} -> ${path.relative(rootDir, to)}`);
}

async function minifyDist() {
  if (!fs.existsSync(distDir)) {
    console.warn("[minify] dist directory not found. Run tsc first.");
    return;
  }

  const packages = fs
    .readdirSync(distDir)
    .filter((f) => fs.statSync(path.join(distDir, f)).isDirectory());

  for (const pkg of packages) {
    const entry = path.join(distDir, pkg, "index.js");
    if (!fs.existsSync(entry)) continue;

    await build({
      entryPoints: [entry],
      outfile: entry,
      minify: true,
      bundle: false,
      platform: "node",
      format: "esm",
      target: ["node20"],
      sourcemap: "external",
      sourcesContent: false,
      logLevel: "info",
      allowOverwrite: true,
    });
    console.log(`[minify] ${pkg}`);
  }
}

function buildNativeAddons({ configureOnly: onlyConfigure }) {
  const submodules = findNativeSubmodules();
  if (submodules.length === 0) {
    console.log("[native] no submodules with binding.gyp found");
    return;
  }

  for (const submodule of submodules) {
    const nodeDir = path.join(srcDir, submodule, "node");
    console.log(`[native] configuring ${submodule}`);
    runCommand(nodeGypBin, ["configure"], nodeDir);

    if (onlyConfigure) continue;

    console.log(`[native] cleaning ${submodule}`);
    runCommand(nodeGypBin, ["clean"], nodeDir);
    console.log(`[native] re-configuring ${submodule}`);
    runCommand(nodeGypBin, ["configure"], nodeDir);
    console.log(`[native] building ${submodule}`);
    runCommand(nodeGypBin, ["build"], nodeDir);
    copyBuiltAddon(submodule);
  }
}

(async () => {
  try {
    if (shouldMinify) {
      await minifyDist();
    }

    if (shouldNative) {
      buildNativeAddons({ configureOnly });
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();

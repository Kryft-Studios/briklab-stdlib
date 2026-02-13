import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

type NativeAddon = Record<string, unknown>;

export function loadNativeAddon(moduleUrl: string, addonName: string): NativeAddon | null {
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));
  const addonFile = `${addonName}.node`;

  const candidates = [
    path.join(moduleDir, "native", addonFile),
    path.join(moduleDir, "..", "native", addonFile),
    path.join(moduleDir, "build", "Release", addonFile),
    path.join(moduleDir, "node", "build", "Release", addonFile),
    path.join(moduleDir, "..", "..", "..", "src", addonName, "node", "build", "Release", addonFile),
    path.join(moduleDir, "..", "..", "src", addonName, "node", "build", "Release", addonFile),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      return require(candidate) as NativeAddon;
    } catch {
      return null;
    }
  }

  return null;
}

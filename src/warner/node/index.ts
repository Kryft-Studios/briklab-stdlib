import JsWarner, { type WarnerOptions, type WarningLevel } from "../index.js";
import { loadNativeAddon } from "../../native/load.js";

export const native = loadNativeAddon(import.meta.url, "warner");
export const Warner = (native?.Warner as typeof JsWarner | undefined) ?? JsWarner;
export default Warner;

const getDefaultLevel = (): WarningLevel => {
  if (typeof process !== "undefined" && process.env?.BRIKLAB_WARNING_LEVEL) {
    const level = process.env.BRIKLAB_WARNING_LEVEL.toLowerCase();
    if (["silent", "summary", "full"].includes(level)) return level as WarningLevel;
  }
  return "summary";
};

export const warner = new Warner({ level: getDefaultLevel() } as WarnerOptions);
export function createWarner(packageName: string, options?: WarnerOptions | WarningLevel): JsWarner {
  const opts: WarnerOptions =
    typeof options === "string" ? { packageName, level: options as WarningLevel } : { packageName, ...options };
  return new Warner(opts as any) as JsWarner;
}

export const formatWarning = (message: string, hint?: string, source?: string): string => {
  const w = new Warner({ level: "silent" } as WarnerOptions) as any;
  if (typeof w.formatWarning === "function") return w.formatWarning(message, hint, source);
  return `${source ? `[${source}] ` : ""}${message}${hint ? `\nHint: ${hint}` : ""}`;
};

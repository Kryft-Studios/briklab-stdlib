/**
 * Warning collector for briklab modules with Protection Levels
 */

import JSTC from "../jstc/index.js";

const IS_BROWSER = typeof window !== "undefined" && typeof window?.console !== "undefined";
const IS_NODE = typeof process !== "undefined" && !!process.stdout;

const NODE_STYLES = {
    label: "\x1b[35m",  
    tag: "\x1b[36m",
    msg: "\x1b[0m",
    hint: "\x1b[2m",
    reset: "\x1b[0m",
    bold: "\x1b[1m",
};

/**
 * # Protection Level
 * Defines the security/validation level for operations
 */
export type ProtectionLevel =
  | "none"        // raw, fast, unsafe
  | "boundary"    // validate inputs only
  | "sandbox"     // isolate + freeze
  | "hardened";   // prod, untrusted code

/**
 * Warning Severity for Warner
 * 
 * **silent**: ""
 * 
 * **summary**: "**90** warnings detected"
 * 
 * **full**: *displays all errors*
 * 
 */
export type WarningLevel = "silent" | "summary" | "full"

/**
 * Interface of how a warning looks like
 */
export interface Warning {
    /**
     * Displayed message for the warnings
     */
    message: string,
    source?:string,
    /**
     * Displayed hint for the warning
     */
    hint?: string,
    /**
     * Whether to instantly warn or not
     */
    instantlyWarn?:boolean,
    /**
     * Tag
     */
    tag?:string,
    /**
     * documentation
     */
    documentation?:string
}

export interface WarnerOptions {
  /** Debug level */
  level?: WarningLevel;

  /** Max warnings */
  maxWarnings?: number;

  /** Custom output handler */
  onWarn?: (warning: Warning) => unknown;

  /** Custom summary handler */
  onSummary?: (count: number, warnings: Warning[]) => unknown;

  /**Package name */
  packageName?: string;

  /** Protection level */
  protectionLevel?: ProtectionLevel;
}
JSTC.addCustomHandler("WarnerOptions", (p: any) => {
  return (
    p &&
    typeof p === "object" &&
    ((typeof p.level === "string"&&"silent summary full".split(" ").includes(p.level)) || !(p.level)) &&
    (typeof p.maxWarnings === "number"||!(p.maxWarnings)) &&
    (typeof p.onWarn === "function"||!(p.onWarn))&&
    (typeof p.onSummary === "function"||!(p.onSummary))&&
    (typeof p.packageName==="string"||!(p.packageName))
  );
});
JSTC.addCustomHandler("Warning",(p:any)=>{
    return (
        p&&
        typeof p.message === "string"&&
        (typeof p.source === "string"||!p.source)&&
        (typeof p.hint === "string"||!p.hint)&&
        (typeof p.instantlyWarn=== "boolean"||!p.instantlyWarn)&&
        (typeof p.tag=== "string"||!p.tag)&&
        (typeof p.documentation=== "string"||!p.documentation)
    )
})
/**
 * A Warner instance
 */
export default class Warner {
    #warnings: Warning[] = [];
    #options: WarnerOptions = {};
    #protectionLevel: ProtectionLevel = "boundary";

    constructor(options: WarnerOptions = {}) {
        options.level = options.level ?? "summary";
        options.maxWarnings = Number(options.maxWarnings ?? 20);
        options.onWarn = options.onWarn ?? (() => {});
        options.onSummary = options.onSummary ?? (() => {});
        options.packageName = options.packageName ?? "";
        options.protectionLevel = options.protectionLevel ?? "boundary";
        this.#protectionLevel = options.protectionLevel;
        this.#options = options;
    }

    get warnings(): Warning[] {
        return this.#warnings;
    }

    setLevel(level: WarningLevel) {
        if (["silent", "summary", "full"].includes(level)) this.#options.level = level;
    }

    setProtectionLevel(level: ProtectionLevel) {
        if (["none", "boundary", "sandbox", "hardened"].includes(level)) {
            this.#protectionLevel = level;
            this.#options.protectionLevel = level;
        }
    }

    getProtectionLevel(): ProtectionLevel {
        return this.#protectionLevel;
    }

    setPackageName(name: string) {
        this.#options.packageName = String(name);
    }

    clear() {
        this.#warnings = [];
    }

    count(): number {
        return this.#warnings.length;
    }

    warn(warning: Warning) {
        if (!JSTC.for([warning]).check(["Warning"])) return;
        if (this.#options.maxWarnings && this.#warnings.length < this.#options.maxWarnings) {
            this.#warnings.push(warning);
        }
        try {
            this.#options.onWarn?.(warning);
        } catch (e) {
        }

        if (warning.instantlyWarn) {
            this.#print(warning);
            return;
        }
    }

  /**
   * Finalize all warnings and log summary if needed
   */
  finalize() {
    this.flush();
  }

  #formatForBrowser(w: Warning) {
    const lines: any[] = [];
    const label = this.#options.packageName ? `${this.#options.packageName}: ` : "";
    const tagOrSource = w.tag ? `[${w.tag}] ` : w.source ? `[${w.source}] ` : "";
    const header = `${tagOrSource}${label}${w.message}`;
    const cssHeader = "background:#222;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;";
    lines.push(header, cssHeader);
    if (w.hint) {
      lines.push(`\nHint: ${w.hint}`, "color:#888;font-style:italic;");
    }
    if (w.documentation) {
      lines.push(`\nDocumentation: ${w.documentation}`, "color:#0af;font-weight:600;");
    }
    return lines;
  }

  #formatSummaryForBrowser() {
    const count = this.#warnings.length;
    const max = this.#options.maxWarnings;
    const displayCount = max ? (count > max ? `${max}+` : String(count)) : String(count);
    const msg = `${displayCount} warnings collected`;
    const css = "background:#f9a825;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;";
    return [msg, css];
  }

  #formatSummaryForNode() {
    const count = this.#warnings.length;
    const max = this.#options.maxWarnings;
    const displayCount = max ? (count > max ? `${max}+` : String(count)) : String(count);
    return `${NODE_STYLES.bold}${NODE_STYLES.label}[SUMMARY]${NODE_STYLES.reset} ${displayCount} warnings collected${NODE_STYLES.reset}`;
  }

  #formatForNode(w: Warning) {
    const parts: string[] = [];
    const t = w.tag ? `${NODE_STYLES.tag}[${w.tag}]${NODE_STYLES.reset} ` : w.source ? `${NODE_STYLES.tag}[${w.source}]${NODE_STYLES.reset} ` : "";
    const pkg = this.#options.packageName ? `${NODE_STYLES.label}${this.#options.packageName}${NODE_STYLES.reset}: ` : "";
    parts.push(`${t}${pkg}${NODE_STYLES.bold}${w.message}${NODE_STYLES.reset}`);
    if (w.hint) parts.push(`${NODE_STYLES.hint}Hint: ${w.hint}${NODE_STYLES.reset}`);
    if (w.documentation) parts.push(`Documentation: ${w.documentation}`);
    return parts.join("\n");
  }

  #print(w: Warning) {
        if (IS_BROWSER) {
            const args = this.#formatForBrowser(w);
            let fmt = "%c" + args[0];
            const cssArgs: string[] = [args[1]];
            let extraFmt = "";
            for (let i = 2; i < args.length; i += 2) {
                extraFmt += "%c" + args[i];
                cssArgs.push(args[i + 1]);
            }
            if (extraFmt) fmt += extraFmt;
            console.warn(fmt, ...cssArgs);
            return;
        }

        if (IS_NODE) {
            console.warn(this.#formatForNode(w));
            return;
        }

        console.warn(`${this.#options.packageName ? this.#options.packageName + ': ' : ''}${w.message}`);
    }

    flush() {
        if (this.#options.level === "full") {
            this.#warnings.forEach((w) => {
                if (!w.instantlyWarn) this.#print(w);
            });
        }
        if (this.#options.level === "summary") {
            try {
                this.#options.onSummary?.(this.#warnings.length, [...this.#warnings]);
            } catch (e) {}
            if (IS_BROWSER) {
                const [msg, css] = this.#formatSummaryForBrowser();
                console.log(`%c${msg}`, css);
            } else {
                console.log(this.#formatSummaryForNode());
            }
        }
    }
}
const getDefaultLevel = (): WarningLevel => {
  if (typeof process !== "undefined" && process.env?.BRIKLAB_WARNING_LEVEL) {
    const level = process.env.BRIKLAB_WARNING_LEVEL.toLowerCase();
    if (["silent", "summary", "full"].includes(level)) return level as WarningLevel;
  }
  return "summary";
};
export const warner = new Warner({ level: getDefaultLevel() });
export function createWarner(packageName: string, options?: WarnerOptions | WarningLevel): Warner {
  // Support both old API (level as second param) and new API (options object)
  const opts: WarnerOptions = typeof options === "string"
    ? { packageName, level: options as WarningLevel }
    : { packageName, ...options };
  return new Warner(opts);
}

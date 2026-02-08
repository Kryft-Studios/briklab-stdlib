/**
 * Warning collector for briklab modules
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
  packageName?: string
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

    constructor(options: WarnerOptions = {}) {
        options.level = options.level ?? "summary";
        options.maxWarnings = Number(options.maxWarnings ?? 20);
        options.onWarn = options.onWarn ?? (() => {});
        options.onSummary = options.onSummary ?? (() => {});
        options.packageName = options.packageName ?? "";
        this.#options = options;
    }

    get warnings(): Warning[] {
        return this.#warnings;
    }

    setLevel(level: WarningLevel) {
        if (["silent", "summary", "full"].includes(level)) this.#options.level = level;
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

        if (this.#options.level === "full") this.#print(warning);
        if (this.#options.level === "summary") {
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
                extraFmt += "%c" + args[i - 1];
                cssArgs.push(args[i]);
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
            this.#warnings.forEach((w) => this.#print(w));
        }
        if (this.#options.level === "summary") {
            try {
                this.#options.onSummary?.(this.#warnings.length, [...this.#warnings]);
            } catch (e) {}
            const count = this.#warnings.length;
            const max = this.#options.maxWarnings;
            if (IS_BROWSER) {
                console.log(`${max ? (count > max ? `${max}+` : String(count)) : String(count)} warnings collected`);
            } else {
                console.log(`${count} warnings collected`);
            }
        }
    }
}

export const warner = new Warner({ level: "summary" });
// TODO: complete this warner bro

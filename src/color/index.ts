/**
 * Easy way to use colors with Protection Levels
 */

import { createWarner } from "../warner/index.js";
import type { ProtectionLevel } from "../jstc/index.js";
import { loadNativeAddon } from "../native/load.js";

const colorWarner = createWarner("@briklab/lib/color");
export const native = loadNativeAddon(import.meta.url, "color");

function formatColorMessage(
  scope: string,
  message: string,
  hint?: string,
  otherMessage?: string,
): string {
  return [
    `[${scope}] @briklab/lib/color: ${message}`,
    hint ? `Hint: ${hint}` : undefined,
    otherMessage,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

type ColorFormat =
  | "auto"
  | "rgb"
  | "rgba"
  | "hsl"
  | "hsla"
  | "hex"
  | "css"
  | "rgbaobj"
  | "rgbaarray"
  | "unitrgba"
  | "unitrgbaobj"
  | "hslaobj"
  | "hslaarray";

type ColorInput =
  | string
  | Color
  | number[]
  | { r?: number; g?: number; b?: number; a?: number }
  | { h?: number; s?: number; l?: number; a?: number };

const NAMED_COLORS: Record<string, string> = {
  red: "#ff0000",
  blue: "#0000ff",
  green: "#00ff00",
  yellow: "#ffff00",
  orange: "#ffa500",
  black: "#000000",
  white: "#ffffff",
  gray: "#808080",
};

export class Color {
  static AUTO: ColorFormat = "auto";
  static RGB: ColorFormat = "rgb";
  static RGBA: ColorFormat = "rgba";
  static HSL: ColorFormat = "hsl";
  static HSLA: ColorFormat = "hsla";
  static HEX: ColorFormat = "hex";
  static CSS: ColorFormat = "css";

  static RGBAOBJ: ColorFormat = "rgbaobj";
  static RGBAARRAY: ColorFormat = "rgbaarray";
  static UNITRGBA: ColorFormat = "unitrgba";
  static UNITRGBAOBJ: ColorFormat = "unitrgbaobj";
  static HSLAOBJ: ColorFormat = "hslaobj";
  static HSLAARRAY: ColorFormat = "hslaarray";

  private r: number = 0;
  private g: number = 0;
  private b: number = 0;
  private a: number = 1;
  private protectionLevel: ProtectionLevel = "boundary";

  constructor(
    input: ColorInput,
    formatOrProtection?: ColorFormat | ProtectionLevel,
    protectionLevel?: ProtectionLevel,
  ) {
    let format: ColorFormat = "auto";

    if (typeof formatOrProtection === "string") {
      const protLevels = ["none", "boundary", "sandbox", "hardened"];
      if (protLevels.includes(formatOrProtection)) {
        protectionLevel = formatOrProtection as ProtectionLevel;
      } else {
        format = formatOrProtection as ColorFormat;
      }
    }

    if (protectionLevel && ["none", "boundary", "sandbox", "hardened"].includes(protectionLevel)) {
      this.protectionLevel = protectionLevel;
    }

    if (typeof input === "string") {
      this.#parseString(input);
    } else if (input instanceof Color) {
      this.r = input.r;
      this.g = input.g;
      this.b = input.b;
      this.a = input.a;
    } else if (Array.isArray(input)) {
      this.#parseArray(input, format);
    } else if (typeof input === "object" && input !== null) {
      const obj = input as {
        r?: number;
        g?: number;
        b?: number;
        a?: number;
        h?: number;
        s?: number;
        l?: number;
      };

      if (format === "unitrgbaobj") {
        this.r = this.#unitTo255(obj.r ?? 0);
        this.g = this.#unitTo255(obj.g ?? 0);
        this.b = this.#unitTo255(obj.b ?? 0);
        this.a = obj.a ?? 1;
      } else if (format === "rgbaobj") {
        this.r = this.#clamp(obj.r ?? 0);
        this.g = this.#clamp(obj.g ?? 0);
        this.b = this.#clamp(obj.b ?? 0);
        this.a = obj.a ?? 1;
      } else if (format === "hslaobj") {
        const { r, g, b } = this.#hslToRgb(obj.h ?? 0, obj.s ?? 0, obj.l ?? 0);
        this.r = r ?? 0;
        this.g = g ?? 0;
        this.b = b ?? 0;
        this.a = obj.a ?? 1;
      } else if ("r" in obj && "g" in obj && "b" in obj) {
        this.r = this.#clamp(obj.r ?? 0);
        this.g = this.#clamp(obj.g ?? 0);
        this.b = this.#clamp(obj.b ?? 0);
        this.a = obj.a ?? 1;
      } else if ("h" in obj && "s" in obj && "l" in obj) {
        const { r, g, b } = this.#hslToRgb(obj.h ?? 0, obj.s ?? 0, obj.l ?? 0);
        this.r = r ?? 0;
        this.g = g ?? 0;
        this.b = b ?? 0;
        this.a = obj.a ?? 1;
      } else {
        this.#handleInvalidInput();
      }
    } else {
      this.#handleInvalidInput();
    }
  }

  #handleInvalidInput(): void {
    if (this.protectionLevel === "hardened") {
      throw new Error(
        formatColorMessage(
          "Color.constructor",
          "Invalid color input.",
          "Expected a string, an RGB object, or an HSL object.",
        )
      );
    } else if (this.protectionLevel === "sandbox") {
      colorWarner.warn({
        message: formatColorMessage(
          "Color.constructor",
          "Invalid color input.",
          "Expected a string, an RGB object, or an HSL object.",
        ),
      });
    } else if (this.protectionLevel === "boundary") {
      colorWarner.warn({
        message: formatColorMessage(
          "Color.constructor",
          "Invalid color input.",
          "Expected a string, an RGB object, or an HSL object.",
          "Using black as fallback.",
        ),
      });
    }
    // "none" - silent fallback
  }

  // -----------------------
  // Public Methods
  // -----------------------
  hex(): string {
    return `#${this.#toHex(this.r)}${this.#toHex(this.g)}${this.#toHex(this.b)}`;
  }

  rgb(): string {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  rgba(): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  hsl(): string {
    const { h, s, l } = this.#rgbToHsl(this.r, this.g, this.b);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  hsla(): string {
    const { h, s, l } = this.#rgbToHsl(this.r, this.g, this.b);
    return `hsla(${h}, ${s}%, ${l}%, ${this.a})`;
  }

  css(): string {
    return this.a === 1 ? this.hex() : this.rgba();
  }

  static RESET = "\x1b[0m";
  static BOLD = "\x1b[1m";
  static UNDERLINE = "\x1b[4m";

  /** Return a 24-bit (truecolor) ANSI sequence for this color (foreground) */
  ansiTruecolor(): string {
    return `\x1b[38;2;${this.r};${this.g};${this.b}m`;
  }

  /** Return a 24-bit (truecolor) ANSI sequence for background */
  ansiTruecolorBg(): string {
    return `\x1b[48;2;${this.r};${this.g};${this.b}m`;
  }

  /** Convert RGB to the nearest 256-color palette index */
  #rgbToAnsi256Index(r: number, g: number, b: number): number {
    // grayscale range
    if (r === g && g === b) {
      if (r < 8) return 16;
      if (r > 248) return 231;
      return Math.round(((r - 8) / 247) * 24) + 232;
    }
    const to6 = (v: number) => Math.round((v / 255) * 5);
    const ri = to6(r);
    const gi = to6(g);
    const bi = to6(b);
    return 16 + 36 * ri + 6 * gi + bi;
  }

  /** Return a 256-color ANSI sequence for this color (foreground) */
  ansi256(): string {
    const idx = this.#rgbToAnsi256Index(this.r, this.g, this.b);
    return `\x1b[38;5;${idx}m`;
  }

  /** Return a 256-color ANSI sequence for background */
  ansi256Bg(): string {
    const idx = this.#rgbToAnsi256Index(this.r, this.g, this.b);
    return `\x1b[48;5;${idx}m`;
  }

  /** Wrap text with this color (truecolor by default). Options: {background?: boolean, use256?: boolean, bold?: boolean, underline?: boolean} */
  wrapAnsi(text: string, opts: { background?: boolean; use256?: boolean; bold?: boolean; underline?: boolean } = {}) {
    const use256 = Boolean(opts.use256);
    const seq = opts.background
      ? use256
        ? this.ansi256Bg()
        : this.ansiTruecolorBg()
      : use256
      ? this.ansi256()
      : this.ansiTruecolor();
    const mods = `${opts.bold ? Color.BOLD : ""}${opts.underline ? Color.UNDERLINE : ""}`;
    return `${mods}${seq}${text}${Color.RESET}`;
  }
  rgbaArray():[number,number,number,number]{
    return [this.r||0,this.g||0,this.b||0,this.a||1]
  }
  hslaArray():[number,number,number,number]{
    const {h,s,l} = this.#rgbToHsl(this.r,this.g,this.b)
    return [h||0,s||0,l||0,this.a||1]
  }
  hslaObj(){
    return {a:this.a,...this.#rgbToHsl(this.r,this.g,this.b)}
  }
  rgbaObj(){
     const {r,g,b,a}=this;
     return {r,g,b,a}
  }
  unitRgbaObj(){
    const {r,g,b,a}=this;
    return {r:r/255,g:g/255,b:b/255,a}
  }
  unitRgbaArray():[number,number,number,number] {
    const {r,g,b,a} = this;
    return [r/255,g/255,b/255,a]
  }
  #clamp(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  #toHex(value: number): string {
    return value.toString(16).padStart(2, "0");
  }

  #parseString(str: string) {
    str = str.trim().toLowerCase();

    if (str === "transparent") {
      this.r = 0;
      this.g = 0;
      this.b = 0;
      this.a = 0;
      return;
    }

    if (NAMED_COLORS[str]) {
      str = NAMED_COLORS[str];
    }

    if (str.startsWith("#")) {
      return this.#parseHex(str);
    }

    if (str.startsWith("rgb")) {
      return this.#parseRgbCss(str);
    }

    if (str.startsWith("hsl")) {
      return this.#parseHslCss(str);
    }

    this.#warnInvalidString(str);
  }

  #parseHex(str: string) {
    const hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      this.r = parseInt(hex[0] + hex[0], 16);
      this.g = parseInt(hex[1] + hex[1], 16);
      this.b = parseInt(hex[2] + hex[2], 16);
      if (hex.length === 4) {
        this.a = parseInt(hex[3] + hex[3], 16) / 255;
      }
      return;
    }

    if (hex.length === 6 || hex.length === 8) {
      this.r = parseInt(hex.slice(0, 2), 16);
      this.g = parseInt(hex.slice(2, 4), 16);
      this.b = parseInt(hex.slice(4, 6), 16);
      if (hex.length === 8) {
        this.a = parseInt(hex.slice(6, 8), 16) / 255;
      }
      return;
    }

    this.#warnInvalidString(str, "Pass a valid 3-, 4-, 6- or 8-digit hex string.");
  }

  #parseArray(input: number[], format: ColorFormat) {
    const [a, b, c, d] = input;

    if (format === "hslaarray") {
      const h = a ?? 0;
      const s = b ?? 0;
      const l = c ?? 0;
      const { r, g, b: bi } = this.#hslToRgb(h, s, l);
      this.r = r;
      this.g = g;
      this.b = bi;
      this.a = d ?? 1;
      return;
    }

    if (format === "unitrgba") {
      this.r = this.#unitTo255(a ?? 0);
      this.g = this.#unitTo255(b ?? 0);
      this.b = this.#unitTo255(c ?? 0);
      this.a = d ?? 1;
      return;
    }

    if (format === "rgbaarray") {
      this.r = this.#clamp(a ?? 0);
      this.g = this.#clamp(b ?? 0);
      this.b = this.#clamp(c ?? 0);
      this.a = d ?? 1;
      return;
    }

    if (format === "hsl") {
      const h = a ?? 0;
      const s = b ?? 0;
      const l = c ?? 0;
      const { r, g, b: bi } = this.#hslToRgb(h, s, l);
      this.r = r;
      this.g = g;
      this.b = bi;
      this.a = 1;
      return;
    }

    if (format === "hsla") {
      const h = a ?? 0;
      const s = b ?? 0;
      const l = c ?? 0;
      const { r, g, b: bi } = this.#hslToRgb(h, s, l);
      this.r = r;
      this.g = g;
      this.b = bi;
      this.a = d ?? 1;
      return;
    }

    // Treat as RGB/RGBA by default
    const r = a ?? 0;
    const g = b ?? 0;
    const bVal = c ?? 0;
    const alpha = d ?? 1;

    // If format is explicitly RGB, ignore potential fourth value
    if (format === "rgb") {
      this.r = this.#clamp(r);
      this.g = this.#clamp(g);
      this.b = this.#clamp(bVal);
      this.a = 1;
      return;
    }

    // RGBA (or auto/detected)
    this.r = this.#clamp(r);
    this.g = this.#clamp(g);
    this.b = this.#clamp(bVal);
    this.a = alpha;
  }

  #parseRgbCss(str: string) {
    const body = str.slice(str.indexOf("(") + 1, str.lastIndexOf(")"));
    const [colorPart, alphaPart] = body.split("/").map((p) => p.trim());
    const parts = colorPart.split(/[\s,]+/).filter(Boolean);

    if (parts.length < 3) {
      return this.#warnInvalidString(str);
    }

    const r = this.#parseRgbComponent(parts[0]);
    const g = this.#parseRgbComponent(parts[1]);
    const b = this.#parseRgbComponent(parts[2]);

    if (r === null || g === null || b === null) {
      return this.#warnInvalidString(str);
    }

    this.r = r;
    this.g = g;
    this.b = b;

    const alphaSource = alphaPart ?? parts[3];
    if (alphaSource !== undefined) {
      const a = this.#parseAlpha(alphaSource);
      if (a !== null) this.a = a;
    }
  }

  #parseHslCss(str: string) {
    const body = str.slice(str.indexOf("(") + 1, str.lastIndexOf(")"));
    const [colorPart, alphaPart] = body.split("/").map((p) => p.trim());
    const parts = colorPart.split(/[\s,]+/).filter(Boolean);

    if (parts.length < 3) {
      return this.#warnInvalidString(str);
    }

    const h = this.#parseHue(parts[0]);
    const s = this.#parsePercentage(parts[1]);
    const l = this.#parsePercentage(parts[2]);

    if (h === null || s === null || l === null) {
      return this.#warnInvalidString(str);
    }

    const { r, g, b } = this.#hslToRgb(h, s, l);
    this.r = r;
    this.g = g;
    this.b = b;

    const alphaSource = alphaPart ?? parts[3];
    if (alphaSource !== undefined) {
      const a = this.#parseAlpha(alphaSource);
      if (a !== null) this.a = a;
    }
  }

  #unitTo255(value: number): number {
    // Accept both 0..1 unit values and 0..255 values.
    if (value >= 0 && value <= 1) {
      return this.#clamp(Math.round(value * 255));
    }
    return this.#clamp(Math.round(value));
  }

  #parseRgbComponent(component: string): number | null {
    component = component.trim();
    if (component.endsWith("%")) {
      const pct = parseFloat(component.slice(0, -1));
      if (Number.isNaN(pct)) return null;
      return this.#clamp(Math.round((pct / 100) * 255));
    }

    const value = parseFloat(component);
    if (Number.isNaN(value)) return null;

    // Support CSS unit rgb values in [0,1], where 1 -> 255
    if (value >= 0 && value <= 1) {
      return this.#clamp(Math.round(value * 255));
    }

    return this.#clamp(Math.round(value));
  }

  #parseAlpha(value: string): number | null {
    value = value.trim();
    if (value.endsWith("%")) {
      const pct = parseFloat(value.slice(0, -1));
      if (Number.isNaN(pct)) return null;
      return Math.max(0, Math.min(1, pct / 100));
    }
    const num = parseFloat(value);
    if (Number.isNaN(num)) return null;
    return Math.max(0, Math.min(1, num));
  }

  #parseHue(value: string): number | null {
    value = value.trim().replace(/deg$/, "");
    const num = parseFloat(value);
    if (Number.isNaN(num)) return null;
    // Normalize to [0, 360)
    return ((num % 360) + 360) % 360;
  }

  #parsePercentage(value: string): number | null {
    value = value.trim();
    if (value.endsWith("%")) {
      const num = parseFloat(value.slice(0, -1));
      if (Number.isNaN(num)) return null;
      return Math.max(0, Math.min(100, num));
    }
    const num = parseFloat(value);
    if (Number.isNaN(num)) return null;
    return Math.max(0, Math.min(100, num));
  }

  #warnInvalidString(str: string, hint?: string) {
    const message = formatColorMessage(
      "Color.parseString",
      `Unknown color string "${str}".`,
      "The value must be a valid color string.",
      hint ?? "Using black as fallback.",
    );
    colorWarner.warn({ message });
  }

  #hslToRgb(h: number, s: number, l: number) {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
  }

  #rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
}
export namespace Color {
  export function fromHex(hex:string){
    return new Color(hex)
  }
  export function fromRgba(rgba:{ r?: number; g?: number; b?: number; a?: number }={}){
    return new Color(rgba)
  }
  export function fromHsla(hsla:{ h?: number; s?: number; l?: number; a?: number }={}){
    return new Color(hsla)
  }
}
export default Color;



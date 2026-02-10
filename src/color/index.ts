/**
 * Easy way to use colors with Protection Levels
 */

import { createWarner } from "../warner/index.js";
import type { ProtectionLevel } from "../jstc/index.js";

const colorWarner = createWarner("@briklab/lib/color");

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

type ColorInput =
  | string
  | { r: number; g: number; b: number; a?: number }
  | { h: number; s: number; l: number; a?: number };

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

export default class Color {
  private r: number = 0;
  private g: number = 0;
  private b: number = 0;
  private a: number = 1;
  private protectionLevel: ProtectionLevel = "boundary";

  constructor(input: ColorInput, protectionLevel?: ProtectionLevel) {
    if (protectionLevel && ["none", "boundary", "sandbox", "hardened"].includes(protectionLevel)) {
      this.protectionLevel = protectionLevel;
    }
    
    if (typeof input === "string") {
      this.#parseString(input);
    } else if ("r" in input && "g" in input && "b" in input) {
      this.r = this.#clamp(input.r);
      this.g = this.#clamp(input.g);
      this.b = this.#clamp(input.b);
      this.a = input.a ?? 1;
    } else if ("h" in input && "s" in input && "l" in input) {
      const { r, g, b } = this.#hslToRgb(input.h, input.s, input.l);
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = input.a ?? 1;
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

  #clamp(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  #toHex(value: number): string {
    return value.toString(16).padStart(2, "0");
  }

  #parseString(str: string) {
    str = str.trim().toLowerCase();

    if (NAMED_COLORS[str]) {
      str = NAMED_COLORS[str];
    }

    if (str.startsWith("#")) {
      const hex = str.slice(1);
      if (hex.length === 3) {
        this.r = parseInt(hex[0] + hex[0], 16);
        this.g = parseInt(hex[1] + hex[1], 16);
        this.b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        this.r = parseInt(hex.slice(0, 2), 16);
        this.g = parseInt(hex.slice(2, 4), 16);
        this.b = parseInt(hex.slice(4, 6), 16);
      } else {
        colorWarner.warn({
          message: formatColorMessage(
            "Color.parseString",
            "Invalid hex color string.",
            "Pass a valid 3-digit or 6-digit hex string.",
            "Using black as fallback.",
          ),
        });
      }
    } else if (str.startsWith("rgb")) {
      const vals = str.match(/[\d.]+/g)?.map(Number);
      if (vals && vals.length >= 3) {
        [this.r, this.g, this.b] = vals;
        this.a = vals[3] ?? 1;
      }
    } else if (str.startsWith("hsl")) {
      const vals = str.match(/[\d.]+/g)?.map(Number);
      if (vals && vals.length >= 3) {
        const { r, g, b } = this.#hslToRgb(vals[0], vals[1], vals[2]);
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = vals[3] ?? 1;
      }
    } else {
      colorWarner.warn({
        message: formatColorMessage(
          "Color.parseString",
          `Unknown color string "${str}".`,
          "The value must be a valid color string.",
          "Using black as fallback.",
        ),
      });
    }
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

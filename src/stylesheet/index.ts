/**
 * # @briklab/lib/stylesheet
 * Create inline styles in JS/TS with Protection Levels
 */

import JSTC from "../jstc/index.js";
import { CSSStyleDeclaration as UUIII } from "cssom";
import Color from "../color/index.js";
import { createWarner } from "../warner/index.js";
import type { ProtectionLevel } from "../jstc/index.js";
import { loadNativeAddon } from "../native/load.js";

const stylesheetWarner = createWarner("@briklab/lib/stylesheet");
export const native = loadNativeAddon(import.meta.url, "stylesheet");

function formatStylesheetMessage(
  scope: string,
  message: string,
  hint?: string,
  otherMessage?: string,
): string {
  return [
    `[${scope}] @briklab/lib/stylesheet: ${message}`,
    hint ? `Hint: ${hint}` : undefined,
    otherMessage,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
/**
 * # InlineStyle
 * @classdesc Create a CSS Inline style with protection levels.
 * @class
 */
export class InlineStyle {
  #protectionLevel: ProtectionLevel = "boundary";

  /**
   * ## constructor
   * construct a InlineStyle with optional protection level
   */
  constructor(styleObject: { [key: string]: string }, protectionLevel?: ProtectionLevel) {
    if (protectionLevel && ["none", "boundary", "sandbox", "hardened"].includes(protectionLevel)) {
      this.#protectionLevel = protectionLevel;
    }

    if (!JSTC.for([styleObject]).check(["object|undefined"])) {
      this.#handleInvalidStyleObject(styleObject);
      styleObject = { imeMode: `${styleObject}` };
    }
    this.#styleObject = styleObject;
    this.#cssStyleDec = new UUIII();
  }

  #handleInvalidStyleObject(input: any): void {
    if (this.#protectionLevel === "hardened") {
      throw new Error(
        formatStylesheetMessage(
          "InlineStyle.constructor",
          "Invalid style object.",
          "Expected a plain object with CSS properties.",
        )
      );
    } else if (this.#protectionLevel === "sandbox") {
      stylesheetWarner.warn({
        message: formatStylesheetMessage(
          "InlineStyle.constructor",
          "Invalid style object.",
          "Expected a plain object with CSS properties.",
        ),
      });
    } else if (this.#protectionLevel === "boundary") {
      stylesheetWarner.warn({
        message: formatStylesheetMessage(
          "InlineStyle.constructor",
          "Invalid style object.",
          "Expected a plain object with CSS properties.",
          "Using a fallback style object.",
        ),
      });
    }
  }
  #cssStyleDec: UUIII;
  generate() {
    let a = this.#cssStyleDec;
    let b = this.#styleObject;
    let c = Object.keys(b);
    let d = Object.values(b);
    for (let i = 0; i < c.length; i++) {
      const prop = c[i];
      let val = d[i];
      if (val == null) {
        stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.generate",
          `Skipping property "${prop}" with ${JSON.stringify(val)} value.`,
          "Avoid null or undefined style values.",
        )});
        continue;
      }
      if (typeof val !== "string") {
        stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.generate",
          `Non-string style value for "${prop}" (type=${typeof val}).`,
          "Provide style values as strings.",
          "Coercing value to string.",
        )});
        val = String(val);
      }
      a.setProperty(prop, val);
    }
    return a.cssText;
  }
  get text() {
    return this.generate();
  }

  get ansi(): string {
    const s: any = this.#styleObject || {};
    let parts: string[] = [];

    if (s["font-weight"] === "bold" || s.fontWeight === "bold") parts.push(Color.BOLD);
    if ((s["text-decoration"] || s.textDecoration || "").includes("underline")) parts.push(Color.UNDERLINE);

    const colorVal = s.color || s["color"];
    if (colorVal) {
      try {
        const c = new Color(String(colorVal));
        parts.push(c.ansiTruecolor());
      } catch (e) {
        stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.ansi",
          `Invalid color value "${JSON.stringify(colorVal)}".`,
          "Use a valid hex, rgb(), hsl(), or named color.",
          "Ignoring this color value.",
        )});
      }
    }

    const bgVal = s["background-color"] || s.backgroundColor;
    if (bgVal) {
      try {
        const c = new Color(String(bgVal));
        parts.push(c.ansiTruecolorBg());
      } catch (e) {
        stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.ansi",
          `Invalid background-color value "${JSON.stringify(bgVal)}".`,
          "Use a valid hex, rgb(), hsl(), or named color.",
          "Ignoring this background color value.",
        )});
      }
    }

    return parts.join("");
  }

  addStyleWithObject(styleObject: object) {
    if (!JSTC.for([styleObject]).check(["object"])) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.addStyleWithObject",
          "Invalid first argument.",
          `Expected a plain object with CSS properties. Received: ${JSON.stringify(styleObject)}.`,
          "Returning without changes.",
        )});
      return this;
    }
    this.#styleObject = { ...this.#styleObject, ...styleObject };
    this.generate();
    return this;
  }
  addStyleWithInlineCSS(inlineCSS: string) {
    if (!JSTC.for([inlineCSS]).check(["string"])) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
        "InlineStyle.addStyleWithInlineCSS",
        "Invalid first argument.",
        "The first argument must be a valid inline CSS string.",
        "Returning without changes.",
      )});
      return this;
    }
    let s = new UUIII();
    s.cssText = this.#convertKeysToValidCSS(inlineCSS);
    let o: { [key: string]: string } = {};
    for (let i: number = 0; i < s.length; i++) {
      const a = s[i];
      const v = s.getPropertyValue(a);
      o[a] = v;
    }
    this.addStyleWithObject(o);
    return this;
  }
  #convertFieldToHyphenCase(string: string) {
    return string.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
  }
  #convertKeysToValidCSS(string: string) {
    const parts = string.split(";");
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      const raw = parts[i].trim();
      if (!raw) continue;
      const kv = raw.split(":");
      if (kv.length < 2) {
        stylesheetWarner.warn({message: formatStylesheetMessage(
            "InlineStyle.convertKeysToValidCSS",
            `Skipping malformed rule: "${raw}".`,
            'Expected "property: value" pairs separated by ";".',
          )});
        continue;
      }
      const k = kv[0].trim();
      const v = kv.slice(1).join(":").trim();
      if (!k || !v) {
        stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.convertKeysToValidCSS",
          `Skipping empty property or value in rule: "${raw}".`,
        )});
        continue;
      }
      out += `${this.#convertFieldToHyphenCase(k)}:${v};`;
    }
    return out;
  }
  removeStyle(styles: string[] | string) {
    if (!JSTC.for([styles]).check(["string[]|string"])) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.removeStyle",
          "Invalid first argument.",
          `Expected a string or an array of strings. Received: ${JSON.stringify(styles)}.`,
          "Returning without changes.",
        )});
      return this;
    }
    if (typeof styles === "string") {
      styles = [styles];
    }
    for (let i: number = 0; i < styles.length; i++) {
      const prop = styles[i];
      if (typeof prop !== "string") {
        stylesheetWarner.warn({message: formatStylesheetMessage(
            "InlineStyle.removeStyle",
            `Ignoring non-string style name at index ${i}: ${JSON.stringify(prop)}.`,
          )});
        continue;
      }
      delete this.#styleObject[prop];
    }
    return this;
  }
  applyTo(element: HTMLElement) {
    if (!JSTC.for([element]).check(["object"])) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.applyTo",
          "Invalid first argument.",
          "Expected an HTMLElement.",
          "No operation was performed.",
        )});
      return this;
    }
    if (!element || typeof (element as any).style !== "object") {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "InlineStyle.applyTo",
          "The given object does not look like an HTMLElement (missing .style).",
          undefined,
          "No operation was performed.",
        )});
      return this;
    }
    element.style.cssText = this.generate();
    return this;
  }

  #styleObject: { [key: string]: string };
}

export class StyleSheet {
  constructor() {
    this.#styles = {};
  }
#styles: { [key: string]: InlineStyle } 

  /**
   * Add or update a rule in the stylesheet.
   * @param name The rule name or selector (string).
   * @param style An InlineStyle instance.
   */
  set(name: string, style: InlineStyle) {
    if (!JSTC.for([name, style]).check(["string", "object"])) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "StyleSheet.set",
          "Invalid arguments.",
          `Call .set("ruleName", new InlineStyle({...})). Received name=${JSON.stringify(name)}, style=${JSON.stringify(style)}.`,
          "Returning without changes.",
        )});
      return this;
    }
    if (!(style instanceof InlineStyle)) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "StyleSheet.set",
          "The provided style is not an InlineStyle instance.",
          `Create the style with new InlineStyle({...}). Received: ${JSON.stringify(style)}.`,
          "Returning without changes.",
        )});
      return this;
    }

    this.#styles[name] = style;
    return this;
  }

  /**
   * Get a rule by name.
   */
  get(name: string) {
    if (!JSTC.for([name]).check(["string"])) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "StyleSheet.get",
          "Invalid argument.",
          `Name must be a string. Received: ${JSON.stringify(name)}.`,
          "Returning undefined.",
        )});
      return undefined;
    }
    return this.#styles[name];
  }

  /**
   * Remove a rule by name.
   */
  remove(name: string) {
    if (!JSTC.for([name]).check(["string"])) {
      stylesheetWarner.warn({message: formatStylesheetMessage(
          "StyleSheet.remove",
          "Invalid argument.",
          `Name must be a string. Received: ${JSON.stringify(name)}.`,
          "No operation was performed.",
        )});
      return this;
    }
    delete this.#styles[name];
    return this;
  }

  /**
   * Generate CSS text for the whole stylesheet.
   */
  generate(): string {
    let css = "";
    for (const key in this.#styles) {
      const style = this.#styles[key];
      if (style) {
        css += `${key} { ${style.text} }\n`;
      }
    }
    return css.trim();
  }

  /**
   * Export as a string for inline style usage or injection.
   */
  toString(): string {
    return this.generate();
  }
}

export default InlineStyle;

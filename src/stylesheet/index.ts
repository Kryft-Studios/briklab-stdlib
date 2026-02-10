/**
 * # @briklab/lib/stylesheet
 * Create inline styles in JS/TS with Protection Levels
 */

import JSTC from "../jstc/index.js";
import { CSSStyleDeclaration as UUIII } from "cssom";
import Color from "../color/index.js";
import { createWarner } from "../warner/index.js";
import type { ProtectionLevel } from "../jstc/index.js";

const stylesheetWarner = createWarner("@briklab/lib/stylesheet");
/**
 * # InlineStyle
 * @classdesc Create a CSS Inline style with protection levels.
 * @class
 */
export default class InlineStyle {
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
        `[InlineStyle constructor] Invalid style object provided!`
      );
    } else if (this.#protectionLevel === "sandbox") {
      stylesheetWarner.warn({
        message: `[InlineStyle class] Invalid style object provided.`,
      });
    } else if (this.#protectionLevel === "boundary") {
      stylesheetWarner.warn({
        message: `[InlineStyle class] Invalid style object! Using fallback.`,
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
        stylesheetWarner.warn({message:`[InlineStyle.generate] @briklab/lib/stylesheet: Skipping property "${prop}" with ${String(
          val,
        )} value. Hint: avoid null/undefined style values.`});
        continue;
      }
      if (typeof val !== "string") {
        stylesheetWarner.warn({message:`[InlineStyle.generate] @briklab/lib/stylesheet: Non-string style value for "${prop}" (type=${typeof val}). Coercing to string.`});
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
        stylesheetWarner.warn({message:`[InlineStyle.ansi] @briklab/lib/stylesheet: Invalid color value "${String(
            colorVal,
          )}" — ignoring. Hint: use a valid hex, rgb(), hsl() or named color.`});
      }
    }

    const bgVal = s["background-color"] || s.backgroundColor;
    if (bgVal) {
      try {
        const c = new Color(String(bgVal));
        parts.push(c.ansiTruecolorBg());
      } catch (e) {
        stylesheetWarner.warn({message:`[InlineStyle.ansi] @briklab/lib/stylesheet: Invalid background-color value "${String(
            bgVal,
          )}" — ignoring. Hint: use a valid hex, rgb(), hsl() or named color.`});
      }
    }

    return parts.join("");
  }

  addStyleWithObject(styleObject: object) {
    if (!JSTC.for([styleObject]).check(["object"])) {
      stylesheetWarner.warn({message:`[InlineStyle.addStyleWithObject] @briklab/lib/stylesheet: Invalid first argument!\n` +
          `Hint: expected a plain object with CSS properties. Received: ${String(styleObject)}\n` +
          `Returned with no operations.`});
      return this;
    }
    this.#styleObject = { ...this.#styleObject, ...styleObject };
    this.generate();
    return this;
  }
  addStyleWithInlineCSS(inlineCSS: string) {
    if (!JSTC.for([inlineCSS]).check(["string"])) {
      stylesheetWarner.warn({message:`[InlineStyle.addStyleWithInlineCSS] @briklab/lib/stylesheet: Invalid first argument!
        Hint: The first argument must be a valid inline css string!
        Returned with no operations.`});
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
    const parts = String(string).split(";");
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      const raw = parts[i].trim();
      if (!raw) continue;
      const kv = raw.split(":");
      if (kv.length < 2) {
        stylesheetWarner.warn({message:`[InlineStyle.#convertKeysToValidCSS] @briklab/lib/stylesheet: Skipping malformed rule: "${raw}". ` +
            `Hint: expected "property: value" pairs separated by ";"`});
        continue;
      }
      const k = kv[0].trim();
      const v = kv.slice(1).join(":").trim();
      if (!k || !v) {
        stylesheetWarner.warn({message:`[InlineStyle.#convertKeysToValidCSS] @briklab/lib/stylesheet: Skipping empty property or value in rule: "${raw}".`});
        continue;
      }
      out += `${this.#convertFieldToHyphenCase(k)}:${v};`;
    }
    return out;
  }
  removeStyle(styles: string[] | string) {
    if (!JSTC.for([styles]).check(["string[]|string"])) {
      stylesheetWarner.warn({message:`[InlineStyle.removeStyle] @briklab/lib/stylesheet: Invalid first argument!\n` +
          `Hint: expected a string or array of strings. Returned with no operations. Received: ${String(styles)}`});
      return this;
    }
    if (typeof styles === "string") {
      styles = [styles];
    }
    for (let i: number = 0; i < styles.length; i++) {
      const prop = styles[i];
      if (typeof prop !== "string") {
        stylesheetWarner.warn({message:`[InlineStyle.removeStyle] @briklab/lib/stylesheet: Ignoring non-string style name at index ${i}: ${String(
            prop,
          )}`});
        continue;
      }
      delete this.#styleObject[prop];
    }
    return this;
  }
  applyTo(element: HTMLElement) {
    if (!JSTC.for([element]).check(["object"])) {
      stylesheetWarner.warn({message:`[InlineStyle.applyTo] @briklab/lib/stylesheet: Invalid first argument!\n` +
          `Hint: expected an HTMLElement. No operation was performed.`});
      return this;
    }
    if (!element || typeof (element as any).style !== "object") {
      stylesheetWarner.warn({message:`[InlineStyle.applyTo] @briklab/lib/stylesheet: Given object does not look like an HTMLElement (missing .style). No operation was performed.`});
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
      stylesheetWarner.warn({message:`[StyleSheet.set] @briklab/lib/stylesheet: Invalid arguments!\n` +
          `Hint: call .set("ruleName", new InlineStyle({...})). Received name=${String(name)}, style=${String(
            style,
          )}. Returned with no operations.`});
      return this;
    }
    if (!(style instanceof InlineStyle)) {
      stylesheetWarner.warn({message:`[StyleSheet.set] @briklab/lib/stylesheet: Provided style is not an InlineStyle instance!\n` +
          `Hint: create the style with new InlineStyle({...}). Received: ${String(style)}. Returned with no operations.`});
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
      stylesheetWarner.warn({message:`[StyleSheet.get] @briklab/lib/stylesheet: Invalid argument!\n` +
          `Hint: name must be a string. Received: ${String(name)}. Returned undefined.`});
      return undefined;
    }
    return this.#styles[name];
  }

  /**
   * Remove a rule by name.
   */
  remove(name: string) {
    if (!JSTC.for([name]).check(["string"])) {
      stylesheetWarner.warn({message:`[StyleSheet.remove] @briklab/lib/stylesheet: Invalid argument!\n` +
          `Hint: name must be a string. Received: ${String(name)}. No-op.`});
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
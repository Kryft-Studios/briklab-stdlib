/**
 * # JSTC
 * @packageDocumentation
 * Runtime JS Type Checker with Protection Levels
 * @module JSTC
 */

import { createWarner } from "../warner/index.js";
import { loadNativeAddon } from "../native/load.js";

const jstcWarner = createWarner("@briklab/lib/jstc");
export const native = loadNativeAddon(import.meta.url, "jstc");

/**
 * # Protection Level
 * Defines the security/validation level for operations
 */
export type ProtectionLevel =
  | "none"       
  | "boundary"   
  | "sandbox"   
  | "hardened";   

/**
 * # Primitive Type
 */
type PrimitiveType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "function"
  | "undefined"
  | "symbol"
  | "bigint";

/**
 * JS constructor type
 */
type ConstructorType = Function;

/**
 * # JSType
 * A Valid Javascript Type
 */
export type JSType = PrimitiveType | ConstructorType | string;

/**
 * # JSType
 * A Valid JavaScript Type or a Valid JavaScript Type Array
 */
export type JSTypeOrArray = JSType | JSType[];

function formatJSTCMessage(
  scope: string,
  message: string,
  hint?: string,
  otherMessage?: string,
): string {
  const lines = [
    `[${scope}] @briklab/lib/jstc: ${message}`,
    hint ? `Hint: ${hint}` : undefined,
    otherMessage,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

function warnJSTC(scope: string, message: string, hint?: string, otherMessage?: string): void {
  console.warn(formatJSTCMessage(scope, message, hint, otherMessage));
}

function createJSTCError(scope: string, message: string, hint?: string, otherMessage?: string): Error {
  return new Error(formatJSTCMessage(scope, message, hint, otherMessage));
}

/**
 * # JSTypeChecker
 * A JS Type Checker. Add type checking to your javascript files as well
 */
export class JSTypeChecker {
  #__CustomHandler: Record<string, (value: unknown) => boolean> = {
    Array: (value: unknown) => Array.isArray(value),
    "string[]": (value: unknown) =>
      Array.isArray(value) && value.every((v) => typeof v === "string"),
  };
  #protectionLevel: ProtectionLevel = "boundary";
  #frozenHandlers = false;

  /**
   * ### JSTypeChecker.setProtectionLevel
   * Set the protection level for type checking strictness
   */
  setProtectionLevel(level: ProtectionLevel): void {
    if (["none", "boundary", "sandbox", "hardened"].includes(level)) {
      this.#protectionLevel = level;
      if (level === "sandbox" || level === "hardened") {
        Object.freeze(this.#__CustomHandler);
        this.#frozenHandlers = true;
      }
    }
  }

  /**
   * ### JSTypeChecker.getProtectionLevel
   * Get the current protection level
   */
  getProtectionLevel(): ProtectionLevel {
    return this.#protectionLevel;
  }

  /**
   * ### JSTypeChecker.for
   * check if specific arguments are of a specific type, class, etc.
   * @param {unknown[]} args
   */
  for(args: unknown[]) {
    if(!Array.isArray(args)){
      warnJSTC(
        "JSTC.for",
        "Invalid first argument.",
        "The first argument must be an array.",
        "Using [givenValue] as fallback.",
      );
      args = [args];
    }
    return {
      /**
       * ### JSTypeChecker.for().check
       * Check the given arguments with corresponding given types
       */
      check: (types: JSTypeOrArray[]): boolean => {
        if (args.length < types.length) return false;
        for (let i = 0; i < types.length; i++) {
          const value = args[i];
          const expected = types[i];
          const expectedTypes = Array.isArray(expected) ? expected : [expected];
          let matched = false;
          for (const tRaw of expectedTypes) {
            const unionTypes = typeof tRaw === "string" ? tRaw.split("|") : [tRaw];

            for (const t of unionTypes) {
              if (typeof t === "function") {
                if (value instanceof t) {
                  matched = true;
                  break;
                }
              } else if (typeof t === "string" && this.#__CustomHandler[t]) {
                if (this.#__CustomHandler[t](value)) {
                  matched = true;
                  break;
                }
              } else if (typeof value === t) {
                matched = true;
                break;
              }
            }
            if (matched) break;
          }

          if (!matched) return false;
        }

        return true;
      },
    };
  }

  /**
   * ### JSTypeChecker.addCustomHandler
   * Create a custom handler for checking types.
   */
  addCustomHandler(name: string, handler: (value: unknown) => boolean): void {
    if (this.#protectionLevel === "sandbox" && this.#frozenHandlers) {
      warnJSTC(
        "JSTC.addCustomHandler",
        "Custom handlers are frozen in sandbox mode.",
      );
      return;
    }

    if (this.#protectionLevel === "hardened" && this.#frozenHandlers) {
      throw createJSTCError(
        "JSTC.addCustomHandler",
        "Custom handlers cannot be modified in hardened mode.",
      );
    }

    if (!(typeof name === "string" && typeof handler === "function")) {
      if (this.#protectionLevel === "boundary" || this.#protectionLevel === "hardened") {
        throw createJSTCError(
          "JSTC.addCustomHandler",
          "Invalid arguments.",
          "The first argument must be a string and the second must be a function.",
        );
      }
      if (this.#protectionLevel !== "none") {
        warnJSTC(
          "JSTC.addCustomHandler",
          "Invalid arguments.",
          "The first argument should be a string and the second should be a function.",
        );
      }
      name =  JSON.stringify(name);
      handler = () => false;
    }
    this.#__CustomHandler[name] = handler;
  }
}

const JSTC = new JSTypeChecker();
export default JSTC;

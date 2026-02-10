/**
 * # JSTC
 * @packageDocumentation
 * Runtime JS Type Checker with Protection Levels
 * @module JSTC
 */

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
      console.warn(`[JSTC.for] @briklab/lib/jstc: Invalid first argument!
        Hint: The first argument must be a array.
        Using [givenValue] as fallback`)
        args = [args]
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
      console.warn(
        `[JSTC.addCustomHandler] @briklab/lib/jstc: Protection level is "sandbox" - custom handlers are frozen!`
      );
      return;
    }

    if (this.#protectionLevel === "hardened" && this.#frozenHandlers) {
      throw new Error(
        `[JSTC.addCustomHandler] @briklab/lib/jstc: Protection level is "hardened" - custom handlers cannot be modified!`
      );
    }

    if (!(typeof name === "string" && typeof handler === "function")) {
      if (this.#protectionLevel === "boundary" || this.#protectionLevel === "hardened") {
        throw new Error(
          `[JSTC.addCustomHandler] @briklab/lib/jstc: Invalid Arguments! First must be string, second must be function`
        );
      }
      if (this.#protectionLevel !== "none") {
        console.warn(
          `[JSTC.addCustomHandler] @briklab/lib/jstc: Invalid Arguments!`
        );
      }
      name = String(name);
      handler = () => false;
    }
    this.#__CustomHandler[name] = handler;
  }
}

const JSTC = new JSTypeChecker();
export default JSTC;

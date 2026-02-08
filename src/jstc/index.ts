/**
 * # JSTC
 * @packageDocumentation
 * Runtime JS Type Checker
 * @module JSTC
 */

import { warner } from "../warner/index.js";

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

  /**
   * ### JSTypeChecker.for
   * check if specific arguments are of a specific type, class, etc.
   * @param {unknown[]} args
   */
  for(args: unknown[]) {
    if(!Array.isArray(args)){
      warner.warn({message:`[JSTC.for] @briklab/lib/jstc: Invalid first argument!
        Hint: The first argument must be a array.
        Using [givenValue] as fallback`} )
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
    if(!(typeof name === "string" && typeof handler === "function")){
      warner.warn({message:`[JSTC.addCustomHandler] @briklab/lib/jstc: Invalid Arguments!
        Hint: The first argument must be a string, and the second argument must be a function
        Using String(argument1) and ()=>false as fallbacks`} )
        name = String(name)
        handler = () => false
    }
    this.#__CustomHandler[name] = handler;
  }
}

const JSTC = new JSTypeChecker();
export default JSTC;

/**
 * @packageDocumentation
 * Runtime JS Type Checker
 * @module JSTC
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

type ConstructorType = Function;

export type JSType = PrimitiveType | ConstructorType | string;
export type JSTypeOrArray = JSType | JSType[];

export class JSTypeChecker {
  #__CustomHandler: Record<string, (value: unknown) => boolean> = {
    Array: (value: unknown) => Array.isArray(value),
    "string[]": (value: unknown) =>
      Array.isArray(value) && value.every((v) => typeof v === "string"),
  };

  /**
   * check if specific arguments are of a specific type, class, etc.
   * @param {unknown[]} args
   */
  for(args: unknown[]) {
    return {
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

  addCustomHandler(name: string, handler: (value: unknown) => boolean): void {
    this.#__CustomHandler[name] = handler;
  }
}

const JSTC = new JSTypeChecker();
export default JSTC;

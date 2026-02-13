import JsJSTC, { JSTypeChecker as JsJSTypeChecker } from "../index.js";
import { loadNativeAddon } from "../../native/load.js";

export const native = loadNativeAddon(import.meta.url, "jstc");
export const JSTypeChecker = (native?.JSTypeChecker as typeof JsJSTypeChecker | undefined) ?? JsJSTypeChecker;
const JSTC = new JSTypeChecker();
export default JSTC;

export const getNativeInfo =
  typeof native?.getInfo === "function" ? (native.getInfo as () => unknown) : () => null;

export const formatMessage = (
  scope: string,
  message: string,
  hint?: string,
  otherMessage?: string,
): string => {
  const checker: any = JSTC;
  if (typeof checker.formatMessage === "function") {
    return checker.formatMessage(scope, message, hint, otherMessage);
  }
  return `[${scope}] @briklab/lib/jstc/node: ${message}${hint ? `\nHint: ${hint}` : ""}${
    otherMessage ? `\n${otherMessage}` : ""
  }`;
};

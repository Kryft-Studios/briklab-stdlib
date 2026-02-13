import JsInlineStyle, { StyleSheet as JsStyleSheet } from "../index.js";
import { loadNativeAddon } from "../../native/load.js";

export const native = loadNativeAddon(import.meta.url, "stylesheet");
export const InlineStyle = (native?.InlineStyle as typeof JsInlineStyle | undefined) ?? JsInlineStyle;
export const StyleSheet = (native?.StyleSheet as typeof JsStyleSheet | undefined) ?? JsStyleSheet;
export default InlineStyle;

export const normalizeInlineCss = (css: string): string => {
  const style: any = new InlineStyle({});
  if (typeof style.addStyleWithInlineCSS === "function" && typeof style.generate === "function") {
    style.addStyleWithInlineCSS(css);
    return style.generate();
  }
  return css;
};

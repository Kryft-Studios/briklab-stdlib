import { loadNativeAddon } from "../../native/load.js";
import JsColor from "../index.js";

export const native = loadNativeAddon(import.meta.url, "color");
export const Color = (native?.Color as typeof JsColor | undefined) ?? JsColor;
export default Color;

export const hexFromRgb = (r: number, g: number, b: number): string => {
  if (native?.Color) {
    const c = new (native.Color as any)({ r, g, b });
    return c.hex();
  }
  return new JsColor({ r, g, b }).hex();
};

export const ansiTruecolor = (r: number, g: number, b: number): string => {
  if (native?.Color) {
    const c = new (native.Color as any)({ r, g, b });
    return c.ansiTruecolor();
  }
  return new JsColor({ r, g, b }).ansiTruecolor();
};

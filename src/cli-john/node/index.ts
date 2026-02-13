import { loadNativeAddon } from "../../native/load.js";
import { CLI as JsCLI } from "../index.js";

export const native = loadNativeAddon(import.meta.url, "cli-john");
export const CLI = (native?.CLI as typeof JsCLI | undefined) ?? JsCLI;
export default CLI;

export const parseArgv = (argv: string[]) => {
  if (native?.CLI) {
    const cli: any = new (native.CLI as any)();
    return cli.parse(argv);
  }
  const cli: any = new JsCLI(process as any);
  if (typeof cli.parse === "function") return cli.parse(argv);
  return {};
};

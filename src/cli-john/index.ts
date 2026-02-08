/**
 * @packageDocumentation
 *
 * # CLI John
 *
 * **CLI John** is a **Node.js CLI framework** designed to create **fully functional CLIs** quickly.
 * It hooks into a given NodeJS process, automatically listens for commands, parses arguments,
 * and allows beautiful console messages. Its design is **modular**, using Commands and Options as sub-classes.
 *
 * ## Features
 * - Auto-listening to commands
 * - Command parsing
 * - Beautiful console messages
 * - One CLI per file
 * - Add your file to `bin` in package.json → CLI works seamlessly
 * - Event-driven command handling
 *
 * ## Usage
 * ```ts
 * import { CLI as CLI } from "@briklab/lib/cli-john"
 * import * as process from "node:process"
 *
 * const cli = new CLI(process);
 *
 * const cmd = cli.command("myCommand");
 * const opt = cmd.option("force");
 *
 * cmd.on("run", ({commandArgs}) => {
 *   CJ.notice("Hey, this is my CLI!");
 *   CJ.message("Do you like it?");
 *   CJ.error("Invalid args:", ...commandArgs.map(a => a.name));
 * });
 *
 * cli.run();
 * ```
 *
 * ## Limitations
 * - Only **one CLI per file** is allowed (CLI enforces this)
 * - CLI file must be manually added to `bin` in package.json
 *
 * ## Hierarchy
 * ```
 * CLI
 * ├─ Command
 * │   └─ Option
 * └─ CLIErrors
 * ```
 *
 * ## Error Handling
 * - All errors are instances of `CLIErrors`
 * - Dynamic names allow easy identification of which part of the CLI threw the error
 *
 * @module cli-john
 */

// -------------------------------------------------------------------------------------------------------
//#region Defination of custom JSTC handler
import JSTC from "../jstc/index.js";
import InlineStyle, { StyleSheet } from "../stylesheet/index.js";
import Color from "../color/index.js";
import { warner } from "../warner/index.js";
JSTC.addCustomHandler("NodeJS Process", (p: any) => {
  return (
    p &&
    typeof p === "object" &&
    typeof p.pid === "number" &&
    typeof p.cwd === "function" &&
    typeof p.exit === "function"
  );
});
//#endregion
// -------------------------------------------------------------------------------------------------------
//#region The Main Class
/**
 * # CLI
 * @classdesc The main class for **CLI**.
 * @example
 * import * as process from "node:process"
 * import {CLI} from "@briklab/lib/cli-john"
 * const cli = new CLI(process)
 * cli.run()
 */
export class CLI {
  /**
   * ## CLI: Constructor
   * @param {NodeJS.Process} process - **The main process**
   * @constructor
   * @constructs CLI
   * @example
   * import * as process from "node:process"
   * import {CLI} from "@briklab/lib/cli-john"
   * const cli = new CLI(process)
   * cli.run()
   */
  constructor(process: NodeJS.Process) {
    if (!JSTC.for([process]).check(["NodeJS Process"])) {
      throw this.#createErr(
        "Invalid First Argument!",
        "You must pass a valid NodeJS process (imported from node:process) while constructing a CLI Class!",
      );
    }
    this.#process = process;
  }
  #commands: CLI.Command[] = [];
  /**
   * ### CLI.command
   * create a new command in a CLI.
   *
   * @param {string} name
   */
  command(name: string) {
    if (!JSTC.for([name]).check(["string"])) {
      this.#createWarn(
        "Invalid First Argument!",
        "CLI.option expects a string as the first argument.",
        "Using String(given argument) as fallback.",
      );
      name = String(name);
    }
    let c = new CLI.Command(name);
    let f = this.#commands.findIndex((a) => a.name === name);
    if (f !== -1) this.#commands[f] = c;
    else this.#commands.push(c);
    return c;
  }
  #onCmdFunctions: Function[] = [];
  on(event: CLI.ValidEvent, func: Function) {
    if (!JSTC.for([event, func]).check(["string", "function"]))
      throw this.#createErr(
        "Arguments in CLI.on are invalid!",
        "The first argument must be a string, and the second argument must be a function.",
      );
    switch (event.toLowerCase()) {
      case "command":
        this.#onCmdFunctions.push(func);
        break;
      default:
        this.#createWarn(
          "Invalid event in CLI.on",
          "Please enter a valid event from CLI.ValidEvents (array)",
        );
    }
  }
  run() {
    let { options, commandArgs, command, failed } = this.#figureOutCommand();
    if (failed) return;
    for (let i = 0; i < this.#onCmdFunctions.length; i++) {
      this.#onCmdFunctions[i]({ options, commandArgs, command });
    }
  }
  #figureOutCommand() {
    // for eg. we have nodepath filepath cli build
    let [, , ...commands] = this.#process.argv; // now its cli build. clear
    if (commands.length === 0)
      return { options: [], command: "", commandArgs: [], failed: true };
    let command = this.#commands.find((a) => a.name === commands[0]); // find the command
    if (!command)
      return { options: [], command: "", commandArgs: [], failed: true }; // command not found?
    let commandArgs: string[] = [];
    const args = commands.slice(1);
    for (let i: number = 0; i < args.length; i++) {
      let arg = args[i];
      if (arg.startsWith("--")) break;
      commandArgs.push(arg);
    }
    let leftover = args.slice(commandArgs.length); // args = [1,2,3]; command args = [1,2] command args length is 2, therefore .slice(2) results in [3]
    let options: { option: string; arguments: string[] }[] = [];

    for (let i = 0; i < leftover.length; i++) {
      const opt = leftover[i];
      if (!opt.startsWith("--")) continue;

      const values = [];
      for (let j = i + 1; j < leftover.length; j++) {
        if (leftover[j].startsWith("--")) break;
        values.push(leftover[j]);
      }

      options.push({ option: opt, arguments: values });
    }

    return {
      options,
      commandArgs,
      command,
      failed: false,
    };
  }
  #process: NodeJS.Process;
  #ErrorClass = class extends CLIErrors {
    constructor(message: string) {
      super(message);
      this.setName = "CLI";
    }
  };
  #createErr(message: string, hint: string) {
    return new this.#ErrorClass(`${message}
        Hint: ${hint}`);
  }
  #createWarn(message: string, hint: string, otherMessage?: string) {
    warner.warn({message:`[Class CLI] ${message}
        Hint: ${hint}
        ${otherMessage}`});
    return;
  }
}
//#endregion
// -------------------------------------------------------------------------------------------------------
//#region Error Class
class CLIErrors extends Error {
  constructor(message: string) {
    super(message);
    this.name = `[] @briklab/lib/cli-john`;
    Error.captureStackTrace(this, CLIErrors);
  }
  set setName(name: string) {
    this.name = `[${name}] @briklab/lib/cli-john`;
  }
}
//#endregion
// -------------------------------------------------------------------------------------------------------
//#region CLI.Command
interface ArrayObj {
  [key: string]: Function[];
}
export namespace CLI {
  export const ValidEvents = ["command"] as const;
  export type ValidEvent = (typeof ValidEvents)[number];
  /**
   * ## CLI.Command
   * A command in a CLI Command
   */
  export class Command {
    #name: string;
    /**
     * ### Command Constructor
     * @param name The name of the command
     * @constructor
     */
    constructor(name: string) {
      this.#name = name;
      return this;
    }
    #createWarn(message: string, hint: string, otherMessage?: string) {
      warner.warn({message:`[Class CLI.Command] ${message}
        Hint: ${hint}
        ${otherMessage}`});
      return;
    }
    #options: CLI.Command.Option[] = [];
    /**
     * The name of the Command
     * @returns {string}
     */
    get name(): String {
      return this.#name;
    }
    /**
     * the metadata of the Command
     * @returns {object}
     */
    get metadata(): Object {
      let metadata = {
        options: this.#options.map((a) => a.metadata),
        name: this.name,
      };
      return metadata;
    }
    option(name: string) {
      if (!JSTC.for([name]).check(["string"])) {
        this.#createWarn(
          "First argument is invalid!",
          "The first argument must be a string",
          "Using String(argument) as fallback",
        );
        name = String(name);
      }
      let o = new CLI.Command.Option(name);
      let f = this.#options.findIndex((a) => a.name === name);
      if (f !== -1) this.#options[f] = o;
      else this.#options.push(o);
      return o;
    }
  }
}
//#endregion
// -------------------------------------------------------------------------------------------------------
//#region CLI.Command.Option
export namespace CLI.Command {
  /**
   * ## CLI.Command.Option
   * A option for a CLI.Command
   */
  export class Option {
    get metadata() {
      let metadata = {
        name: `${this.#name}`, // <-- Templates TO NOT reference the actual variable
      };
      return metadata;
    }
    #name: string;
    constructor(name: string) {
      this.#name = name;
      return this;
    }
    get name() {
      return this.#name;
    }
  }
}
//#endregion
// -------------------------------------------------------------------------------------------------------
//#region CLI Utilities
JSTC.addCustomHandler("Utilities Tag Config", (p: any) => {
  return (
    p &&
    typeof p === "object" &&
    typeof p.tag === "string" &&
    typeof p.showErrorInTag === "boolean" &&
    typeof p.paddingLeft === "number" &&
    typeof p.paddingRight === "number" &&
    (typeof p.styleName === "string" || p.styleName === undefined)
  );
});

class UtilitiesClass {
  styleSheet = new StyleSheet();

  tags: Record<
    string,
    {
      tag: string;
      showErrorInTag: boolean;
      paddingLeft: number;
      paddingRight: number;
      styleName: string;
    }
  > = {};

  constructor() {
    this.addTag("error", {
      tag: "ERROR",
      showErrorInTag: false,
      paddingLeft: 0,
      paddingRight: 0,
    });
    this.addTag("warning", {
      tag: "WARNING",
      showErrorInTag: true,
      paddingLeft: 0,
      paddingRight: 0,
    });
    this.addTag("info", {
      tag: "INFO",
      showErrorInTag: true,
      paddingLeft: 0,
      paddingRight: 0,
    });

    this.setTagStyle(
      "error",
      new InlineStyle({ color: "red", fontWeight: "bold" }),
    );
    this.setTagStyle(
      "warning",
      new InlineStyle({ color: "orange", fontWeight: "bold" }),
    );
    this.setTagStyle("info", new InlineStyle({ color: "blue" }));
  }

  /** Add a new tag */
  addTag(name: string, config: Partial<(typeof this.tags)["error"]> = {}) {
    if (!JSTC.for([name, config]).check(["string", "object"])) {
      warner.warn({message:`[UtilitiesClass.addTag] @briklab/lib/cli-john: Invalid Arguments!
        Hint: The first argument must be a string, and the second argument must be a object.
        Using String(argument1) and {} as fallback.`});
      name = String(name);
      config = {};
    }
    const fullConfig = {
      tag: name.toUpperCase(),
      showErrorInTag: false,
      paddingLeft: 0,
      paddingRight: 0,
      styleName: "",
      ...config,
    };

    if (!JSTC.for([fullConfig]).check(["Utilities Tag Config"])) {
      warner.warn({message:`[UtilitiesClass.addTag] @briklab/lib/cli-john: Invalid tag config passed for "${name}"
        Hint: The config must be in format {tag?: string, showErrorInTag?:boolean, paddingLeft?:number, paddingRight?:number, styleName?:string}`});
      warner.warn({message: JSON.stringify(fullConfig, null, 2)});
      return this;
    }

    this.tags[name] = fullConfig;
    return this;
  }

  /** Set style for a tag */
  setTagStyle(tagName: string, style: InlineStyle) {
    if (typeof tagName !== "string" || !(style instanceof InlineStyle)) {
      warner.warn({message:`[UtilitiesClass.setTagStyle] @briklab/lib/cli-john: Invalid arguments!
        Hint: The first argument must be a string and the second argument must be a instance of InlineStyle
        Using String(firstArgument) and new InlineStyle({}) as fallback`});
      tagName = String(tagName);
      style = new InlineStyle({});
    }
    if (!this.tags[tagName]) {
      warner.warn({message:`[UtilitiesClass.setTagStyle] @briklab/lib/cli-john: Tag "${tagName}" does not exist! 
        Hint: Use a valid tag that you have defined or use "error"|"warn"|"info"`});
      return this;
    }
    const styleName = `${tagName} Tag Color`;
    this.styleSheet.set(styleName, style);
    this.tags[tagName].styleName = styleName;
    return this;
  }

  log(tagName: string, ...messages: any[]) {
    if (!JSTC.for([tagName]).check(["string"])) {
      warner.warn({message:`[UtilitiesClass.log] @briklab/lib/cli-john: Invalid Arguments!
        Hint: The first argument must be a string
        Using String(argument1) as fallback`});
      tagName = String(tagName);
    }

    if (!messages || messages.length === 0) messages = [""];

    const tag = this.tags[tagName];
    if (!tag) {
      warner.warn({message:`[UtilitiesClass.log] @briklab/lib/cli-john: Tag "${tagName}" does not exist! 
        Hint: Use a valid tag that you have defined or use "error"|"warn"|"info"`});
      console.log(...messages);
      return;
    }

    const inlineStyle = this.styleSheet.get(tag.styleName);
    const style = inlineStyle?.text ?? "";
    const leftPad = " ".repeat(tag.paddingLeft);
    const rightPad = " ".repeat(tag.paddingRight);

    const isNodeTTY =
      typeof process !== "undefined" &&
      typeof process.stdout !== "undefined" &&
      Boolean((process.stdout as any).isTTY);

    if (isNodeTTY) {
      const ansi = inlineStyle?.ansi ?? "";
      const reset = Color.RESET;

      if (tag.showErrorInTag) {
        console.log("[" + ansi + leftPad + tag.tag + rightPad + reset + "]:", ...messages);
      } else {
        console.log(ansi + "[" + leftPad + tag.tag + rightPad + "]" + reset + ":", ...messages);
      }
    } else {
      if (tag.showErrorInTag) {
        console.log(`[%c${leftPad}${tag.tag}${rightPad}%c]:`, style, ...messages);
      } else {
        console.log(`%c[${leftPad}${tag.tag}${rightPad}]%c:`, style, ...messages);
      }
    }
  }

  error(...msg: any[]) {
    if (!msg || msg.length === 0) msg = [""];
    this.log("error", ...msg);
    return this;
  }

  warning(...msg: any[]) {
    if (!msg || msg.length === 0) msg = [""];
    this.log("warning", ...msg);
    return this;
  }

  info(...msg: any[]) {
    if (!msg || msg.length === 0) msg = [""];
    this.log("info", ...msg);
    return this;
  }
}

export const Utilities = new UtilitiesClass();
//#endregion
// -------------------------------------------------------------------------------------------------------
//#region TODO
// TODO: Wire Options to Commands
// TODO: Create metadata getter-s in both commands and options
//#endregion

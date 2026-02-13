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
import JSTC, { type ProtectionLevel } from "../jstc/index.js";
import InlineStyle, { StyleSheet } from "../stylesheet/index.js";
import Color from "../color/index.js";
import { createWarner } from "../warner/index.js";
import { loadNativeAddon } from "../native/load.js";

const cliWarner = createWarner("@briklab/lib/cli-john");
export const native = loadNativeAddon(import.meta.url, "cli-john");

function formatCLIMessage(
  scope: string,
  message: string,
  hint?: string,
  otherMessage?: string,
): string {
  return [
    `[${scope}] @briklab/lib/cli-john: ${message}`,
    hint ? `Hint: ${hint}` : undefined,
    otherMessage,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
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
   * @param {Object} options - Optional configuration
   * @param {WarningLevel} options.warningLevel - Warning display level: 'silent', 'summary', or 'full'
   * @param {ProtectionLevel} options.protectionLevel - Protection level for input validation
   * @constructor
   * @constructs CLI
   * @example
   * import * as process from "node:process"
   * import {CLI} from "@briklab/lib/cli-john"
   * const cli = new CLI(process, { warningLevel: "full", protectionLevel: "hardened" })
   * cli.run()
   */
  constructor(
    process: NodeJS.Process,
    options?: {
      warningLevel?: "silent" | "summary" | "full";
      protectionLevel?: ProtectionLevel;
    },
  ) {
    if (!JSTC.for([process]).check(["NodeJS Process"])) {
      throw this.#createErr(
        "Invalid first argument.",
        "You must pass a valid NodeJS process (imported from node:process) while constructing a CLI Class!",
      );
    }
    this.#process = process;
    this.#protectionLevel = options?.protectionLevel ?? "boundary";
    if (options?.warningLevel) {
      cliWarner.setLevel(options.warningLevel);
    }
    if (options?.protectionLevel) {
      JSTC.setProtectionLevel(options.protectionLevel);
      cliWarner.setProtectionLevel(options.protectionLevel);
    }
  }
  #protectionLevel: ProtectionLevel = "boundary";
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
        "Invalid first argument.",
        "CLI.command expects a string as the first argument.",
        "Using  JSON.stringify(given argument) as fallback.",
      );
      name = JSON.stringify(name);
    }
    if (name.includes(" ")) {
      this.#createWarn(
        "The given argument includes a space.",
        "CLI.command expects the given argument to not have a space in it.",
        "Using (given argument).replace(' ','')",
      );
      name = name.replace(" ", "");
    }
    let c = new CLI.Command(name, this.command.bind(this));
    let f = this.#commands.findIndex((a) => a.name === name);
    if (f !== -1) this.#commands[f] = c;
    else this.#commands.push(c);
    return c;
  }
  #onCmdFunctions: Function[] = [];
  on(
    event: CLI.ValidEvent,
    func: ({
      commandArgs,
      command,
      options,
    }: {
      commandArgs: string[];
      command: string;
      options: { arguments: string[]; optionName: string }[];
    }) => any,
  ) {
    if (!JSTC.for([event, func]).check(["string", "function"]))
      throw this.#createErr(
        "Invalid arguments in CLI.on.",
        "The first argument must be a string, and the second argument must be a function.",
      );
    switch (event.toLowerCase()) {
      case "command":
        this.#onCmdFunctions.push(func);
        break;
      default:
        this.#createWarn(
          "Invalid event in CLI.on.",
          "Please enter a valid event from CLI.ValidEvents (array)",
        );
    }
  }
  run() {
    let { options, commandArgs, commandName, commandMetadata, failed } =
      this.#figureOutCommand();
    if (failed) return;
    for (let i = 0; i < this.#onCmdFunctions.length; i++) {
      this.#onCmdFunctions[i]({ options, commandArgs, command: commandName });
    }
    const onCmdFunctions = (commandMetadata as any)?.onCmdFunctions ?? [];
    for (let i = 0; i < onCmdFunctions.length; i++) {
      onCmdFunctions[i]({ options, commandArgs });
    }

    cliWarner.flush();
  }
  #figureOutCommand() {
    // for eg. we have nodepath filepath cli build
    let [, , ...commands] = this.#process.argv; // now its cli build. clear
    if (commands.length === 0)
      return {
        options: [],
        commandName: "",
        commandMetadata: null,
        commandArgs: [],
        failed: true,
      };
    const command = this.#commands.find((a) => a.name === commands[0]); // find the command
    if (!command)
      return {
        options: [],
        commandName: "",
        commandMetadata: null,
        commandArgs: [],
        failed: true,
      }; // command not found?
    const commandName = commands[0];
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
      commandName,
      commandMetadata: command.metadata(),
      commandArgs,
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
  #createErr(message: string, hint: string, otherMessage?: string) {
    return new this.#ErrorClass(formatCLIMessage("Class CLI", message, hint, otherMessage));
  }
  #createWarn(message: string, hint: string, otherMessage?: string) {
    cliWarner.warn({
      message: formatCLIMessage("Class CLI", message, hint, otherMessage),
    });
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
    #commandcreatorfunction: Function;
    /**
     * ### Command Constructor
     * @param name The name of the command
     * @constructor
     */
    constructor(name: string, commandcreatorfunction: Function) {
      this.#name = name;
      this.#commandcreatorfunction = commandcreatorfunction;
      return this;
    }
    #ErrorClass = class extends CLIErrors {
      constructor(message: string) {
        super(message);
        this.setName = "CLI.Command";
      }
    };
    #createErr(message: string, hint: string, otherMessage?: string) {
      return new this.#ErrorClass(
        formatCLIMessage("Class CLI.Command", message, hint, otherMessage),
      );
    }
    #onCmdFunctions: Function[] = [];
    /**
     * What to do when an specific event happens
     */
    on(
      event: CLI.ValidEvent,
      func: ({
        commandArgs,
        options,
      }: {
        commandArgs: string[];
        options: { arguments: string[]; optionName: string }[];
      }) => any,
    ) {
      if (!JSTC.for([event, func]).check(["string", "function"]))
        throw this.#createErr(
          "Invalid arguments in CLI.Command.on.",
          "The first argument must be a string, and the second argument must be a function.",
        );
      switch (event.toLowerCase()) {
        case "command":
          this.#onCmdFunctions.push(func);
          break;
        default:
          this.#createWarn(
            "Invalid event in CLI.Command.on.",
            "Please enter a valid event from CLI.ValidEvents (array)",
          );
      }
    }
    #createWarn(message: string, hint: string, otherMessage?: string) {
      cliWarner.warn({
        message: formatCLIMessage("Class CLI.Command", message, hint, otherMessage),
      });
      return;
    }
    #options: CLI.Command.Option[] = [];
    /**
     * The name of the Command
     * @returns {string}
     */
    get name(): String {
      return `${this.#name}`;
    }
    /**
     * the metadata of the Command
     * @returns {object}
     */
    metadata(): Object {
      let meta = {
        options: this.#options.map((a) => a.metadata),
        name: `${this.name}`,
        onCmdFunctions: [...this.#onCmdFunctions],
      };
      return meta;
    }
    option(name: string) {
      if (!JSTC.for([name]).check(["string"])) {
        this.#createWarn(
          "Invalid first argument.",
          "The first argument in CLI.command.option must be a string",
          "Using JSON.stringify(argument) as fallback",
        );
        name = JSON.stringify(name);
      }
      if (name.includes(" ")) {
        this.#createWarn(
          "The given argument includes a space.",
          "CLI.command.option expects the given argument to not have a space in it.",
          "Using (given argument).replace(' ','')",
        );
        name = name.replace(" ", "");
      }
      let o = new CLI.Command.Option(
        name,
        this.option.bind(this),
        this.#commandcreatorfunction,
      );
      let f = this.#options.findIndex((a) => a.name === name);
      if (f !== -1) this.#options[f] = o;
      else this.#options.push(o);
      return o;
    }

    command(...args: any[]) {
      this.#commandcreatorfunction(...args);
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
    #name: string;
    #optioncreatorfunction: Function;
    #commandcreatorfunction: Function;
    #onCmdFunctions: Function[] = [];

    constructor(
      name: string,
      optioncreatorfunc: Function,
      commandcreatorfunction: Function,
    ) {
      this.#name = name;
      this.#optioncreatorfunction = optioncreatorfunc;
      this.#commandcreatorfunction = commandcreatorfunction;
      return this;
    }

    get name() {
      return this.#name;
    }

    get metadata() {
      let metadata = {
        name: `${this.#name}`,
        onCmdFunctions: [...this.#onCmdFunctions],
      };
      return metadata;
    }

    /**
     * What to do when an specific event happens for this option
     */
    on(
      event: CLI.ValidEvent,
      func: ({
        commandArgs,
        options,
      }: {
        commandArgs: string[];
        options: { arguments: string[]; optionName: string }[];
      }) => any,
    ) {
      if (!JSTC.for([event, func]).check(["string", "function"]))
        throw this.#createErr(
          "Invalid arguments in CLI.Command.Option.on.",
          "The first argument must be a string, and the second argument must be a function.",
        );
      switch (event.toLowerCase()) {
        case "command":
          this.#onCmdFunctions.push(func);
          break;
        default:
          this.#createWarn(
            "Invalid event in CLI.Command.Option.on.",
            "Please enter a valid event from CLI.ValidEvents (array)",
          );
      }
    }

    #ErrorClass = class extends CLIErrors {
      constructor(message: string) {
        super(message);
        this.setName = "CLI.Command.Option";
      }
    };

    #createErr(message: string, hint: string, otherMessage?: string) {
      return new this.#ErrorClass(
        formatCLIMessage("Class CLI.Command.Option", message, hint, otherMessage),
      );
    }

    #createWarn(message: string, hint: string, otherMessage?: string) {
      cliWarner.warn({
        message: formatCLIMessage("Class CLI.Command.Option", message, hint, otherMessage),
      });
      return;
    }

    command(...args: any[]) {
      this.#commandcreatorfunction(...args);
    }

    option(...args: any[]) {
      this.#optioncreatorfunction(...args);
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
      cliWarner.warn({
        message: formatCLIMessage(
          "UtilitiesClass.addTag",
          "Invalid arguments.",
          "The first argument must be a string and the second argument must be an object.",
          "Using JSON.stringify(argument1) and {} as fallback.",
        ),
      });
      name = JSON.stringify(name);
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
      cliWarner.warn({
        message: formatCLIMessage(
          "UtilitiesClass.addTag",
          `Invalid tag config for "${name}".`,
          "The config must match {tag?: string, showErrorInTag?: boolean, paddingLeft?: number, paddingRight?: number, styleName?: string}.",
          JSON.stringify(fullConfig, null, 2),
        ),
      });
      return this;
    }

    this.tags[name] = fullConfig;
    return this;
  }

  /** Set style for a tag */
  setTagStyle(tagName: string, style: InlineStyle) {
    if (typeof tagName !== "string" || !(style instanceof InlineStyle)) {
      cliWarner.warn({
        message: formatCLIMessage(
          "UtilitiesClass.setTagStyle",
          "Invalid arguments.",
          "The first argument must be a string and the second argument must be an InlineStyle instance.",
          "Using JSON.stringify(firstArgument) and new InlineStyle({}) as fallback.",
        ),
      });
      tagName = JSON.stringify(tagName);
      style = new InlineStyle({});
    }
    if (!this.tags[tagName]) {
      cliWarner.warn({
        message: formatCLIMessage(
          "UtilitiesClass.setTagStyle",
          `Tag "${tagName}" does not exist.`,
          'Use a defined tag or one of "error"|"warn"|"info".',
        ),
      });
      return this;
    }
    const styleName = `${tagName} Tag Color`;
    this.styleSheet.set(styleName, style);
    this.tags[tagName].styleName = styleName;
    return this;
  }

  log(tagName: string, ...messages: any[]) {
    if (!JSTC.for([tagName]).check(["string"])) {
      cliWarner.warn({
        message: formatCLIMessage(
          "UtilitiesClass.log",
          "Invalid arguments.",
          "The first argument must be a string.",
          "Using JSON.stringify(argument1) as fallback.",
        ),
      });
      tagName = JSON.stringify(tagName);
    }

    if (!messages || messages.length === 0) messages = [""];

    const tag = this.tags[tagName];
    if (!tag) {
      cliWarner.warn({
        message: formatCLIMessage(
          "UtilitiesClass.log",
          `Tag "${tagName}" does not exist.`,
          'Use a defined tag or one of "error"|"warn"|"info".',
        ),
      });
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
        console.log(
          "[" + ansi + leftPad + tag.tag + rightPad + reset + "]:",
          ...messages,
        );
      } else {
        console.log(
          ansi + "[" + leftPad + tag.tag + rightPad + "]" + reset + ":",
          ...messages,
        );
      }
    } else {
      if (tag.showErrorInTag) {
        console.log(
          `[%c${leftPad}${tag.tag}${rightPad}%c]:`,
          style,
          ...messages,
        );
      } else {
        console.log(
          `%c[${leftPad}${tag.tag}${rightPad}]%c:`,
          style,
          ...messages,
        );
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

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
import { warn } from "node:console";
import JSTC from "../jstc";
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
  #onCmdFunctions: Function[]= []
  on(event:CLI.ValidEvent,func:Function){
    if(!JSTC.for([event,func]).check(["string","function"]))throw this.#createErr(
      "Arguments in CLI.on are invalid!",
      "The first argument must be a string, and the second argument must be a function."
    )
    switch(event.toLowerCase()){
      case "command":
      this.#onCmdFunctions.push(func)
      break
      default: 
      this.#createWarn("Invalid event in CLI.on","Please enter a valid event from CLI.ValidEvents (array)");
    }
  }
  run() {
    let { options, commandArgs, command, failed } = this.#figureOutCommand();
    if (failed) return;
   for(let i = 0; i< this.#onCmdFunctions.length;i++){
    this.#onCmdFunctions[i]({options,commandArgs,command})
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
    let commandArgs: string[]  = [];
    const args = commands.slice(1);
    for (let i: number = 0; i < args.length; i++) {
      let arg = args[i];
      if (arg.startsWith("--")) break;
      commandArgs.push(arg);
    }
    let leftover = args.slice(commandArgs.length); // args = [1,2,3]; command args = [1,2] command args length is 2, therefore .slice(2) results in [3]
    let options: { option: string; arguments: string[] }[]  = [];

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
    return console.warn(`[Class CLI] ${message}
        Hint: ${hint}
        ${otherMessage}`);
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
  export const ValidEvents = [
    "command"
  ] as const;
  export type ValidEvent = typeof ValidEvents[number]
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
      return console.warn(`[Class CLI.Command] ${message}
        Hint: ${hint}
        ${otherMessage}`);
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

/**
 * Will be implemented in v1.2.0
 * @experimental v1.2.0
 */
export namespace Utilities {
}
//#endregion
// -------------------------------------------------------------------------------------------------------
//#region TODO
// TODO: Wire Options to Commands
// TODO: Create metadata getter-s in both commands and options
//#endregion

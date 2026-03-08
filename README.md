[Read Docs Here](https://briklab-docs.pages.dev/packages/lib/introduction)
[Github Repository](https://github.com/Kryft-Studios/briklab-stdlib)

# @briklab/lib

`@briklab/lib` is a TypeScript-first utility collection for runtime validation, warnings, styling helpers, color utilities, and CLI tooling.

## Install

Follow the [common installation tutorial](https://briklab-docs.pages.dev/packages/common-installation-tutorial)

## Modules

- **[jstc](https://briklab-docs.pages.dev/packages/lib/jstc/introduction)**: Runtime type checking with `JSTypeChecker` and `JSTC` singleton
- **[warner](https://briklab-docs.pages.dev/packages/lib/warner/introduction)**: Structured warning collection and reporting
- **[stylesheet](https://briklab-docs.pages.dev/packages/lib/stylesheet/introduction)**: CSS-in-JS with `InlineStyle` and `StyleSheet` helpers
- **[color](https://briklab-docs.pages.dev/packages/lib/color/introduction)**: Color parsing, formatting, and ANSI terminal output
- **[cli-john](https://briklab-docs.pages.dev/packages/lib/cli-john/introduction)**: Node.js CLI framework with command routing

## Quick Start
```ts
import { Warner } from "@briklab/lib/warner";
import { JSTC } from "@briklab/lib/jstc";

const warner = new Warner({ level: "summary", packageName: "my-package" });
warner.warn({ message: "Deprecated option used", hint: "Use --strict instead." });
warner.finalize();

JSTC.setProtectionLevel("boundary");
const ok = JSTC.for([42]).check(["number"]);
console.log(ok); // true
```
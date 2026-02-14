# @briklab/lib

### @briklab/lib is the core package for briklab packages

[Read Docs](https://briklab-docs.pages.dev/packages/lib/)
**It Introduces:**
- **@briklab/lib/cli-john:** Generate a [CLI](https://en.wikipedia.org/wiki/Command-line_interface) with ease.
- **@briklab/lib/jstc:** Add Type Checking for JavaScript.
- **@briklab/lib/color:** A color manipulation library.
- **@briklab/lib/stylesheet:** A CSS-in-JS library for styling components.
- **@briklab/lib/warner:** A set of utilities for creating and managing warnings in your code.

## Exports

The root package export currently exposes warning utilities:

```ts
import { warner, createWarner, Warner } from "@briklab/lib";
```

Other modules are exposed through subpath imports:

```ts
import JSTC from "@briklab/lib/jstc";
import Color from "@briklab/lib/color";
import InlineStyle, { StyleSheet } from "@briklab/lib/stylesheet";
import { CLI } from "@briklab/lib/cli-john";
```

## Installation
Normally, the format is:
```bash
[packageManager] [install/add/i] @briklab/lib
```
**Examples:**
- **pnpm:**`pnpm add @briklab/lib`
- **npm:**`npm i @briklab/lib`


# @briklab/lib

### @briklab/lib is the core package for briklab packages

**It Introduces:**
- **@briklab/cli-john:** Generate a [CLI](https://en.wikipedia.org/wiki/Command-line_interface) with ease.
- **@briklab/jstc:** Add Type Checking for JavaScript.

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


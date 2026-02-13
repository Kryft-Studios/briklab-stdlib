# How to contribute to this package

## 1. Fork & Clone
```bash
git clone https://github.com/Kryft-Studios/briklab-stdlib.git
cd briklab-stdlib
git checkout -b my-feature
```
## 2. Install dependencies
```bash
<packageManager> install
```

# Important Note for VSCode users
In your enviorment variables, you must do
```json
setx NODE_GYP_CACHE "C:/Users/<YourUsername>/AppData/Local/node-gyp/<NodeVersion>"
```
or else VSCode will throw errors

# How to build
Just use the build command:
```bash
pnpm build
```

# Don't:
### 1. Never commit/publish node_modules or dist!
**Common mistake!**
never remove node_modules or dist from .gitignore or .npmignore

### 2. Never commit private things!
**Uh oh**
never commit your api key, or any private stuff!

# Pull Requests
- Please name your PR clearly: `[Feature] Add _____`
- Describe what you changed and why
- Link issues if applicable

# NO to trying to break this library!
Do not try to break this library (*pls*)

# Code Guidelines
- Please format your code using extensions like **Prettier**
- Keep *src/* clean and understandable

# Build Guide - Fixing Memory Issues

## Problem
The build is failing with "JavaScript heap out of memory" error. This happens because the project is large and Node.js runs out of memory during the build process.

## Solutions

### Option 1: Use the Updated Build Script (Recommended)
I've updated the `package.json` to include increased memory limits. Run:

```bash
npm run build
```

This will use 4GB of memory. If it still fails, try:

```bash
npm run build:prod
```

This uses 8GB of memory.

### Option 2: Manual Command with Memory Increase
Run the build directly with increased memory:

**On macOS/Linux:**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**On Windows (PowerShell):**
```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run build
```

**On Windows (Command Prompt):**
```cmd
set NODE_OPTIONS=--max-old-space-size=4096 && npm run build
```

### Option 3: Install cross-env for Cross-Platform Support
If you need cross-platform compatibility, install `cross-env`:

```bash
npm install --save-dev cross-env
```

Then update `package.json` scripts to:
```json
"build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 react-app-rewired build"
```

### Option 4: Increase Memory Further
If 4GB isn't enough, try 8GB or 16GB:

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run build
# or
NODE_OPTIONS=--max-old-space-size=16384 npm run build
```

## Additional Tips

1. **Close other applications** to free up system memory
2. **Clear node_modules and reinstall** if you have issues:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. **Clear build folder** before building:
   ```bash
   rm -rf build
   npm run build
   ```
4. **Check available system memory** - Make sure you have enough RAM available

## After Successful Build

Once the build completes successfully:
1. The `build/` folder will contain your production-ready files
2. To serve the build locally, run:
   ```bash
   npm run serve
   ```
3. Or deploy the `build/` folder to your hosting service

## Troubleshooting

If you still encounter issues:
- Check Node.js version: `node --version` (should be v14+)
- Check npm version: `npm --version`
- Try clearing npm cache: `npm cache clean --force`
- Check if you have enough disk space: `df -h` (macOS/Linux)


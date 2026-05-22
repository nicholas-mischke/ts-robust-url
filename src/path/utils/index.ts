/**
 * Environment-aware re-exports for `path` and file-URL helpers.
 *
 * This module is the single import surface for the rest of the package:
 *
 *   import { fileURLToPath, pathToFileURL, path } from "./utils";
 *
 * It always *re-exports from `./node`* at the source level. In Node that's
 * exactly what gets loaded. For browser builds, the `"browser"` field in
 * `package.json` instructs the bundler to substitute this file's compiled
 * output (`dist/path/utils/index.js`) with `dist/path/utils/browser.js`,
 * so the Node implementation is never resolved or shipped.
 *
 * Consumers should not import `./node` or `./browser` directly; always go
 * through this index so the swap remains transparent.
 *
 * See `package.json` → `"browser"` field for the bundler mapping.
 */
export { fileURLToPath, pathToFileURL, path } from "./node";

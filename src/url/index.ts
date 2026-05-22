/**
 * Environment-aware entry for `RobustURL`.
 *
 * This module is the single import surface for `RobustURL`:
 *
 *   import { RobustURL } from "./url";
 *
 * It re-exports the Node implementation from `./node` at the source level.
 * In Node that's exactly what gets loaded. For browser builds, the
 * `"browser"` field in `package.json` instructs the bundler to substitute
 * this file's compiled output (`dist/url/index.js`) with
 * `dist/url/browser.js`, so the Node implementation (which pulls in
 * `node:path` and file-path helpers) is never resolved or shipped.
 *
 * Only symbols common to both implementations are re-exported here.
 * Node-only helpers (file-path conversion, `fileExists`, etc.) must be
 * imported from `./node` directly by Node-only callers.
 *
 * See `package.json` → `"browser"` field for the bundler mapping.
 */
export { RobustURL } from "./node";

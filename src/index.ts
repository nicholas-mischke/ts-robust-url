// Environment-aware: package.json "browser" swaps dist/url/index.js → dist/url/browser.js
export { RobustURL } from "./url";
export { type Options } from "./url/base";

// Node-only
export { fileExists } from "./url/node";

export {
  normalizeURL,
  DEFAULT_NORMALIZE_OPTIONS,
  type NormalizeOptions,
} from "./url/utils/normalize";
export { urlsAreEqual, type EqualityOptions } from "./url/utils/equality";
export {
  isURL,
  URLtoString,
  isWindowsDriveScheme,
  normalizeProtocol,
} from "./url/utils/utils";

export {
  isIPv4,
  isIPv6,
  normalizeIPv6,
  bracketIPv6,
  isCanonicalLocalhost,
} from "./ip";

export {
  isFilePath,
  isFileURL,
  filePathToURL,
  urlToFilePath,
} from "./path/filepath";

// Environment-aware: package.json "browser" swaps dist/path/utils/index.js → dist/path/utils/browser.js
export { fileURLToPath, pathToFileURL, path } from "./path/utils";

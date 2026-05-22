// 3rd 🎉
import normalizeUrl, {
  type Options as NormalizeUrlOptions,
} from "normalize-url";

// local
import { isCanonicalLocalhost } from "../ip";
import { isURL } from "./utils";

/**
 * Options accepted by `normalizeURL`.
 *
 * Extends `normalize-url`'s `Options` with `localhost` — when set, any host
 * matching a canonical localhost form (`127.0.0.1`, `::1`, etc.) is rewritten
 * to this string. Pass `false` / `null` to skip the rewrite.
 */
export type NormalizeOptions = NormalizeUrlOptions & {
  localhost?: string | false | null;
};

/**
 * Default normalize options used across the package.
 *
 * Sourced from this project's conventions, not `normalize-url`'s own defaults:
 *   - `defaultProtocol: "https"` — prefer HTTPS on protocol-less inputs
 *   - `stripWWW: true`, `stripHash: true`, etc. — aggressive canonicalization
 *   - `removeQueryParameters: [/^utm_\w+/i]` — drop UTM tracking params
 *   - `localhost: "localhost"` — collapse loopback aliases
 */
export const DEFAULT_NORMALIZE_OPTIONS: NormalizeOptions = {
  defaultProtocol: "https",
  normalizeProtocol: true,
  forceHttp: false,
  forceHttps: false,
  stripAuthentication: true,
  stripHash: true,
  stripTextFragment: true,
  stripWWW: true,
  removeQueryParameters: [/^utm_\w+/i],
  removeTrailingSlash: true,
  removeSingleSlash: true,
  removeDirectoryIndex: false,
  removeExplicitPort: false,
  sortQueryParameters: true,
  localhost: "localhost",
};

/**
 * Normalize a URL string using `normalize-url` plus a localhost rewrite.
 *
 * Caller-supplied options are merged onto `DEFAULT_NORMALIZE_OPTIONS`, so
 * passing `{ stripWWW: false }` only overrides that one field.
 *
 * @param url - URL string or URL object to normalize
 * @param options - Partial overrides on top of the project defaults
 * @returns Normalized URL string
 * @throws {TypeError} If `url` is not a valid URL
 */
export const normalizeURL = (
  url: string | URL,
  options: NormalizeOptions = {},
): string => {
  isURL(url, { throwError: true });

  const { localhost, ...normalizeUrlOptions } = {
    ...DEFAULT_NORMALIZE_OPTIONS,
    ...options,
  };

  const normalized = new URL(normalizeUrl(String(url), normalizeUrlOptions));

  if (localhost && isCanonicalLocalhost(normalized.hostname)) {
    normalized.hostname = localhost;
  }

  return normalized.toString();
};

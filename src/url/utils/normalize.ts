// 3rd 🎉
import normalizeUrl, {
  type Options as NormalizeUrlOptions,
} from "normalize-url";

// local
import { isCanonicalLocalhost } from "../../ip";
import { isURL } from "./utils";

/**
 * Project options for `normalizeURL`.
 *
 * Includes every `normalize-url` option and adds `localhost`, which controls
 * canonical loopback rewriting after URL normalization. A string value replaces
 * canonical localhost hosts (`localhost`, `127.0.0.1`, `::1`, and IPv4-mapped
 * loopback forms) with that host. `false` and `null` disable the rewrite.
 */
export type NormalizeOptions = NormalizeUrlOptions & {
  localhost?: string | false | null;
};

/**
 * Project canonicalization policy for URLs.
 *
 * These defaults intentionally differ from `normalize-url`'s defaults. The
 * package prefers HTTPS for protocol-relative inputs, strips authentication,
 * hashes, text fragments, leading `www.`, trailing slashes, and single root
 * slashes, removes `utm_*` query parameters, sorts remaining query parameters,
 * preserves explicit ports, and rewrites canonical loopback hosts to
 * `localhost`.
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
 * Canonicalizes a URL for storage, comparison, and de-duplication.
 *
 * `normalizeURL` validates the input, applies `normalize-url` with
 * `DEFAULT_NORMALIZE_OPTIONS`, and then applies this package's localhost
 * rewrite. Option overrides are shallow-merged over the defaults for this call.
 *
 * The returned string is the normalized WHATWG URL serialization. This function
 * normalizes URL shape; it is not a security sanitizer or an origin allowlist.
 *
 * @param url - URL string or URL object to normalize.
 * @param options - Per-call overrides for the project defaults.
 * @returns Normalized URL string.
 * @throws {TypeError} When `url` is not a valid URL.
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

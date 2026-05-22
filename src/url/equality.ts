// local
import {
  DEFAULT_NORMALIZE_OPTIONS,
  type NormalizeOptions,
  normalizeURL,
} from "./normalize";

/**
 * Options accepted by `urlsAreEqual`.
 *
 * Extends `NormalizeOptions` with `httpOrHttps` — when true (default), HTTP
 * and HTTPS variants of the same URL are treated as equivalent by forcing
 * both sides to HTTPS before comparison.
 */
export type EqualityOptions = NormalizeOptions & {
  httpOrHttps?: boolean;
};

/**
 * Compares two URLs after applying the same normalization rules to both.
 *
 * Localhost loopback aliases (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) collapse
 * to the configured `localhost` value (defaults to `"localhost"`) so they
 * compare equal.
 *
 * @param urlA - First URL
 * @param urlB - Second URL
 * @param options - Partial overrides on top of `DEFAULT_NORMALIZE_OPTIONS`,
 *   plus `httpOrHttps` (default `true`) to treat HTTP/HTTPS as equivalent.
 * @returns True when both URLs normalize to the same string.
 * @throws {TypeError} If either input is not a valid URL.
 */
export const urlsAreEqual = (
  urlA: string | URL,
  urlB: string | URL,
  options: EqualityOptions = {},
): boolean => {
  const { httpOrHttps = true, ...rest } = options;

  // When treating http/https as the same resource, force both sides to https.
  // Otherwise honor the caller's forceHttp/forceHttps (or the defaults).
  const normalizeOptions: NormalizeOptions = {
    ...DEFAULT_NORMALIZE_OPTIONS,
    ...rest,
    ...(httpOrHttps ? { forceHttp: false, forceHttps: true } : {}),
  };

  return (
    normalizeURL(urlA, normalizeOptions) ===
    normalizeURL(urlB, normalizeOptions)
  );
};

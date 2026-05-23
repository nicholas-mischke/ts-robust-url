// local
import {
  DEFAULT_NORMALIZE_OPTIONS,
  type NormalizeOptions,
  normalizeURL,
} from "./normalize";
import { isURL } from "./utils";

/**
 * Compares two URLs using this package's canonical URL policy.
 *
 * Both inputs are normalized with `normalizeURL` before comparison. By default,
 * canonical localhost aliases compare equal through the `localhost` rewrite,
 * query parameters are sorted, and tracking parameters are stripped. The
 * scheme is preserved as-is, so `http://` and `https://` URLs compare unequal
 * by default — pass `{ forceHttps: true }` (or `{ forceHttp: true }`) to
 * treat them as equivalent.
 *
 * The comparison is a normalized string comparison, not a network identity or
 * origin authorization check.
 *
 * @param urlA - First URL string or URL object.
 * @param urlB - Second URL string or URL object.
 * @param options - Per-call normalization overrides.
 * @returns True when both URLs normalize to the same string.
 * @throws {TypeError} When either input is not a valid URL.
 */
export const equalURLs = (
  urlA: string | URL,
  urlB: string | URL,
  options: NormalizeOptions = {},
): boolean => {
  const normalizeOptions: NormalizeOptions = {
    ...DEFAULT_NORMALIZE_OPTIONS,
    ...options,
  };

  return (
    normalizeURL(urlA, normalizeOptions) ===
    normalizeURL(urlB, normalizeOptions)
  );
};

/**
 * Strict string-equality check for two URL strings.
 *
 * Both arguments must be primitive strings and must parse as valid URLs —
 * anything else throws a `TypeError`. No normalization is applied, so
 * `"http://example.com/"` and `"https://example.com/"` are not equal.
 *
 * Trailing-slash behavior: because no parsing happens, the inputs are compared
 * byte-for-byte. `"https://example.com"` and `"https://example.com/"` compare
 * **unequal** here — unlike `RobustURL#isEqualString`, which routes through
 * `URL.href` and always appends an origin-level `/` (so the same two strings
 * compare equal there). If you want origin-slash collapse, use
 * `RobustURL#isEqualString` or pre-normalize with `new URL(...).href`.
 *
 * @param urlA - First URL string.
 * @param urlB - Second URL string.
 * @returns True when both strings are exactly equal.
 * @throws {TypeError} When either argument is not a string or does not parse as a URL.
 */
export const equalURLStrings = (urlA: string, urlB: string): boolean => {
  if (typeof urlA !== "string" || typeof urlB !== "string") {
    throw new TypeError(
      `equalURLStrings expects two strings, got ${typeof urlA} and ${typeof urlB}`,
    );
  }

  const aValid = isURL(urlA);
  const bValid = isURL(urlB);
  if (!aValid || !bValid) {
    const invalid: string[] = [];
    if (!aValid) invalid.push(`urlA=${JSON.stringify(urlA)}`);
    if (!bValid) invalid.push(`urlB=${JSON.stringify(urlB)}`);
    throw new TypeError(
      `equalURLStrings: invalid URL string(s): ${invalid.join(", ")}`,
    );
  }

  return urlA === urlB;
};

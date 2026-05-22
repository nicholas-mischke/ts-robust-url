// local
import {
  DEFAULT_NORMALIZE_OPTIONS,
  type NormalizeOptions,
  normalizeURL,
} from "./normalize";

/**
 * Project options for `urlsAreEqual`.
 *
 * Includes every `normalizeURL` option and adds `httpOrHttps`. When
 * `httpOrHttps` is `true`, the comparison treats HTTP and HTTPS variants as
 * the same URL by normalizing both sides to HTTPS. Set it to `false` when the
 * scheme must match exactly.
 */
export type EqualityOptions = NormalizeOptions & {
  httpOrHttps?: boolean;
};

/**
 * Compares two URLs using this package's canonical URL policy.
 *
 * Both inputs are normalized with `normalizeURL` before comparison. By default,
 * canonical localhost aliases compare equal through the `localhost` rewrite,
 * query parameters are sorted, tracking parameters are stripped, and HTTP/HTTPS
 * variants compare equal. Pass `normalizeURL` options to override the
 * canonicalization policy for this comparison.
 *
 * The comparison is a normalized string comparison, not a network identity or
 * origin authorization check.
 *
 * @param urlA - First URL string or URL object.
 * @param urlB - Second URL string or URL object.
 * @param options - Per-call equality and normalization overrides.
 * @returns True when both URLs normalize to the same string.
 * @throws {TypeError} When either input is not a valid URL.
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

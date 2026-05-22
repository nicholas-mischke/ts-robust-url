/*
NOTE ON URL VALIDATION:

The URL constructor performs implicit type coercion. Any non-string
argument is converted using arg.toString() before parsing.

Example:
  new URL(["https://example.com"])
Array.prototype.toString() joins elements with commas, so:
  ["https://example.com"].toString()
becomes:
  "https://example.com"

That means a single-element array containing a valid URL string will
silently pass validation, even though the input is not actually a string.

Example:
  new URL(["https://a.com"])        // works
  new URL(["https://a.com","b"])    // becomes "https://a.com,b" → throws

To avoid accidental acceptance of arrays or other coercible objects,
we explicitly restrict validation to:
  - instances of URL
  - primitive strings

This prevents JavaScript’s implicit coercion rules from producing false positives.
*/
export const isURL = (
  url: unknown,
  { throwError = false }: { throwError?: boolean } = {},
): boolean => {
  if (url instanceof URL) {
    return true;
  }

  if (typeof url === "string") {
    try {
      return !!new URL(url);
    } catch (_error) {
      if (throwError) {
        throw new TypeError(`Invalid URL: ${url}, type: ${typeof url}`);
      }
      return false;
    }
  }

  if (throwError) {
    throw new TypeError(`Invalid URL: ${url}, type: ${typeof url}`);
  }

  return false;
};

export const URLtoString = (url: string | URL): string => {
  isURL(url, { throwError: true });
  return String(url);
};

/**
 * Detects Windows drive-letter paths (e.g. `C:\foo`, `d:/bar`) that the URL
 * constructor mistakes for valid URLs.
 *
 * Per RFC 3986 a scheme is any letter followed by letters/digits/`+`/`-`/`.`,
 * so `C:` is a syntactically legal scheme — `new URL("C:\\Windows\\file.txt")`
 * parses cleanly with `protocol: "c:"`. In practice no real URL scheme is one
 * character (the shortest registered schemes are 2+ chars: `bb`, `ws`, etc.),
 * so a single ASCII letter followed by `:` and a separator is overwhelmingly
 * a Windows path, not a URL.
 *
 * Use alongside `isURL` to disambiguate: `isURL(x) && !isWindowsDriveScheme(x)`.
 *
 * @param value - Value to check
 * @returns True if `value` is a string starting with a Windows drive-letter
 *          path (e.g. `C:\`, `c:/`)
 */
export const isWindowsDriveScheme = (value: unknown): boolean => {
  return typeof value === "string" && /^[A-Za-z]:[/\\]/.test(value);
};

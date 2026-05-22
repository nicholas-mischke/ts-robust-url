/// <reference types="node" />

// local
import { isURL, isWindowsDriveScheme } from "../url/utils/utils";
import { fileURLToPath, path, pathToFileURL } from "./utils";

// Cross-platform filename rules (strict superset of Linux/macOS/Windows).
// Hoisted from sindresorhus/filename-reserved-regex (de facto standard):
//   reserved chars: < > : " / \ | ? * and control chars \x00-\x1F
//   reserved Windows names: CON, PRN, AUX, NUL, COM0-9, LPT0-9
// `/` and `\` are excluded here since we split on them as separators.
const RESERVED_CHARS = /[<>:"|?*\x00-\x1f]/;
const RESERVED_WIN_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * Checks if a string has valid file path format (no null bytes, no reserved
 * characters, no Windows reserved names, segments <= 255 chars).
 * Does not check whether the path exists on the filesystem.
 *
 * @param filePath - Value to check
 * @returns True if it's a string with valid file path format
 */
export const isFilePath = (filePath: string): boolean => {
  // Must be a non-empty string
  if (typeof filePath !== "string" || filePath.length === 0) return false;

  // Null byte check (critical)
  if (filePath.includes("\0")) return false;

  // URLs aren't valid file paths in this function, even if `file:` protocol.
  // Windows drive-letter paths (`C:\...`) parse as URLs with scheme `c:`, so
  // exempt them: they're paths, not URLs.
  if (isURL(filePath) && !isWindowsDriveScheme(filePath)) return false;

  // Validate each segment individually.
  // Split on both separators so Windows-style paths work on POSIX too.
  const segments = filePath.split(/[/\\]/);
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue; // allow leading separator
    if (segment === "." || segment === "..") continue; // navigation segments
    if (i === 0 && /^[A-Za-z]:$/.test(segment)) continue; // Windows drive root
    if (segment.length > 255) return false;
    if (RESERVED_CHARS.test(segment)) return false;
    if (RESERVED_WIN_NAMES.test(segment.replace(/\..*$/, ""))) return false;
    if (segment.endsWith(".") || segment.endsWith(" ")) return false;
  }

  return true;
};

export const isFileURL = (url: string | URL): boolean => {
  if (!isURL(url)) return false;
  return new URL(String(url)).protocol === "file:";
};

/**
 * Converts a file path string to a file:// URL.
 * Only accepts strings; callers passing a URL should typecheck first.
 *
 * @param filePath - File path to convert
 * @returns file:// URL object
 * @throws {TypeError} If the file path is invalid
 */
export const filePathToURL = (filePath: string): URL => {
  if (!isFilePath(filePath)) {
    throw new TypeError(
      `Invalid file path: ${filePath}, type: ${typeof filePath}`,
    );
  }

  return pathToFileURL(path.resolve(filePath));
};

/**
 * Converts a file:// URL to a file path.
 * Accepts a string or URL object; anything else, or a non-file URL, throws.
 * Callers passing arbitrary input should typecheck first.
 *
 * @param url - file:// URL to convert
 * @returns File path
 * @throws {TypeError} If the input is not a valid file:// URL
 */
export const urlToFilePath = (url: string | URL): string => {
  if (!isFileURL(url)) {
    throw new TypeError(
      `Invalid file URL: ${String(url)}, type: ${typeof url}`,
    );
  }

  return path.resolve(fileURLToPath(new URL(String(url))));
};

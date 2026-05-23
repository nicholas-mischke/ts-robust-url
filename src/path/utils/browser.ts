// @ts-expect-error - no bundled types
import pathBrowserify from "path-browserify";

// path-browserify falls back to process.cwd() when resolving relative paths;
// browser and extension contexts have no process global.
const resolvePath = (...segments: string[]): string => {
  const args = segments.filter((segment) => segment.length > 0);
  if (args.length === 0) {
    return "/";
  }
  if (!args.some((segment) => pathBrowserify.isAbsolute(segment))) {
    return pathBrowserify.resolve("/", ...args);
  }
  return pathBrowserify.resolve(...args);
};

export const path = Object.assign({}, pathBrowserify, { resolve: resolvePath });

/**
 * File URI to Path function.
 *
 * @param {String | URL} input
 * @return {String} path
 * @api public
 */
export const fileURLToPath = (input: string | URL): string => {
  const uri = typeof input === "string" ? input : input.href;
  if (
    typeof uri !== "string" ||
    uri.length <= 7 ||
    uri.substring(0, 7) !== "file://"
  ) {
    throw new TypeError("must pass in a file:// URI to convert to a file path");
  }
  const rest = decodeURI(uri.substring(7));
  const firstSlash = rest.indexOf("/");
  let host = rest.substring(0, firstSlash);
  let p = rest.substring(firstSlash + 1);
  // 2.  Scheme Definition
  // As a special case, <host> can be the string "localhost" or the empty
  // string; this is interpreted as "the machine from which the URL is
  // being interpreted".
  if (host === "localhost") {
    host = "";
  }
  if (host) {
    host = path.sep + path.sep + host;
  }
  // 3.2  Drives, drive letters, mount points, file system root
  // Drive letters are mapped into the top of a file URI in various ways,
  // depending on the implementation; some applications substitute
  // vertical bar ("|") for the colon after the drive letter, yielding
  // "file:///c|/tmp/test.txt".  In some cases, the colon is left
  // unchanged, as in "file:///c:/tmp/test.txt".  In other cases, the
  // colon is simply omitted, as in "file:///c/tmp/test.txt".
  p = p.replace(/^(.+)\|/, "$1:");
  // for Windows, we need to invert the path separators from what a URI uses
  if (path.sep === "\\") {
    p = p.replace(/\//g, "\\");
  }
  if (/^.+:/.test(p)) {
    // has Windows drive at beginning of path
  } else {
    // unix path…
    p = path.sep + p;
  }
  return host + p;
};

export const pathToFileURL = (
  filepath: string,
  options: { resolve?: boolean } = {},
): URL => {
  if (typeof filepath !== "string") {
    throw new TypeError(`Expected a string, got ${typeof filepath}`);
  }

  const { resolve = true } = options;

  let pathName = filepath;
  if (resolve) {
    pathName = path.resolve(filepath);
  }

  pathName = pathName.replace(/\\/g, "/");

  // Windows drive letter must be prefixed with a slash.
  if (pathName[0] !== "/") {
    pathName = `/${pathName}`;
  }

  // Escape required characters for path components.
  // See: https://tools.ietf.org/html/rfc3986#section-3.3
  return new URL(
    encodeURI(`file://${pathName}`).replace(/[?#]/g, encodeURIComponent),
  );
};

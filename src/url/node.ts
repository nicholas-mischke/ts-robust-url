// Built-in modules
import fs from "node:fs";

import { RobustURL as BaseRobustURL, type Options } from "./base";
import {
  filePathToURL,
  isFilePath,
  isFileURL,
  urlToFilePath,
} from "../path/filepath";
import { pathToFileURL } from "../path/utils";

export { filePathToURL, isFilePath, isFileURL, urlToFilePath };
export { isCanonicalLocalhost } from "../ip";

/**
 * Returns true if `filePath` is a string pointing to an existing file on disk.
 */
export const fileExists = (filePath: string | undefined | null): boolean => {
  if (typeof filePath !== "string") return false;
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
};

export class RobustURL extends BaseRobustURL {
  /**
   * Construct a RobustURL from a URL, a relative URL plus base, or a file path.
   *
   * In Node, string inputs are ambiguous: the same constructor position can be
   * a URL string (`https://example.com/page`) or a filesystem path
   * (`/tmp/file.txt`). Auto mode resolves that ambiguity conservatively: parse
   * as a URL first, and only treat the input as a file path if URL parsing
   * fails and the resolved path exists on disk. A missing path is rejected in
   * auto mode because it is neither a valid URL nor a known file.
   *
   * Use `{ filePath: true }` when the input must be treated as a path and must
   * exist. Use `{ filePath: true, missingOk: true }` when the caller is the
   * source of truth for a path that may not exist yet; this converts the path
   * to a `file:` URL without an existence check. Use `{ filePath: false }` for
   * URL-only mode; file URLs and unparseable strings are rejected.
   *
   * Signatures:
   *   new RobustURL(url)
   *   new RobustURL(url, base)
   *   new RobustURL(url, options)
   *   new RobustURL(url, base, options)
   */
  constructor(
    url: string | URL,
    base?: string | URL | Options,
    options?: Options,
  );
  constructor(...args: Array<string | URL | Options | undefined>) {
    const { _url, _ip, _absoluteFilePath, _opts } =
      BaseRobustURL._constructorArgParser(
        ...(args as [string | URL, (string | URL)?, Options?]),
      );

    // Resolve to an href to hand to `super()`. Four mutually exclusive
    // branches, mirroring the table in the docstring.
    let href: string;

    if (_opts === null) {
      // Auto: URL first, existing file path second.
      if (_url) {
        href = String(_url);
      } else if (fileExists(_absoluteFilePath)) {
        href = String(filePathToURL(_absoluteFilePath));
      } else {
        throw new TypeError(
          `Invalid input: '${String(args[0])}' is neither a parseable URL nor an existing file path.`,
        );
      }
    } else if (_opts.filePath === false) {
      // URL-only: URL must parse and must not resolve to a file URL.
      if (!_url) {
        throw new TypeError(`Invalid URL: '${String(args[0])}'.`);
      }
      if (_url.protocol === "file:") {
        throw new TypeError(
          `filePath: false but input resolved to file URL: '${String(_url)}'.`,
        );
      }
      href = String(_url);
    } else if (_opts.filePath === true && _opts.missingOk === true) {
      // Caller-asserted path: existence is not checked. Format validation is
      // warn-only, then conversion goes directly through `pathToFileURL`.
      if (!isFilePath(_absoluteFilePath)) {
        console.warn(
          `RobustURL: file path '${_absoluteFilePath}' failed format validation. Accepting because caller passed { filePath: true, missingOk: true }; caller is source of truth.`,
        );
      }
      href = String(pathToFileURL(_absoluteFilePath));
    } else {
      // Strict file path: caller asserts a path and it must exist on disk.
      if (!fileExists(_absoluteFilePath)) {
        throw new TypeError(
          `file path does not exist on disk: '${_absoluteFilePath}'.`,
        );
      }
      href = String(filePathToURL(_absoluteFilePath));
    }

    try {
      super(href);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid URL")) {
        throw new TypeError(`Invalid URL: '${href}'.`);
      }
      throw error;
    }

    this._fileOpts = _opts;
    this._ip = _ip ?? null;
  }
}

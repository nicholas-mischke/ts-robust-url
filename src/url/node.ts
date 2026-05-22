// Built-in modules
import fs from "node:fs";

import { RobustURL as BaseRobustURL, type Options } from "./base";
import { isFilePath, urlToFilePath } from "../path/filepath";
import { pathToFileURL } from "../path/utils";

type OptsWithFile = { filePath?: boolean; missingOk?: boolean };

/**
 * Returns true if `filePath` is a string pointing to an existing file on disk.
 */
export const fileExists = (filePath: string | undefined | null): boolean => {
  if (typeof filePath !== "string") return false;
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
};

export class RobustURL extends BaseRobustURL {
  /**
   * Construct a RobustURL from a parseable URL or a plain path string. Node
   * can stat the filesystem, so disk existence is part of the contract.
   *
   *
   * Misaligned options:
   *   `missingOk` is only meaningful with `filePath: true` — it picks
   *   between filesystem as source of truth (`missingOk: false`) and caller
   *   as source of truth (`missingOk: true`). Using `missingOk` without
   *   `filePath: true` is rejected up front, before any mode runs.
   *
   *   new RobustURL("https://example.com", { missingOk: true })                   // throws (missingOk requires filePath: true)
   *   new RobustURL("https://example.com", { filePath: false, missingOk: true })  // throws (missingOk requires filePath: true)
   *
   *
   * Auto mode:
   *   Accepts any parseable URL. When the resolved URL uses the `file:`
   *   protocol — whether the input was a `file:` URL or a path string that
   *   fell back to one — the referenced file must exist on disk.
   *
   *   new RobustURL("https://example.com").href                  // ok
   *
   *   new RobustURL("file:///fixtures/exists.txt").href          // ok
   *   new RobustURL("/fixtures/exists.txt").href                 // ok
   *
   *   new RobustURL("file:///fixtures/does-not-exists.txt").href // throws
   *   new RobustURL("/fixtures/does-not-exists.txt").href        // throws
   *
   *
   * File-path mode:
   *   Resolved URL must use the `file:` protocol — web URLs are rejected as
   *   misaligned. The resolved path is then disk-checked unless the caller
   *   asserts source-of-truth with `missingOk: true`. Under `missingOk: true`,
   *   paths that fail `isFilePath` format validation (e.g. Windows reserved
   *   names like `CON`) are still coerced but a `console.warn` is emitted so
   *   the looseness is not silent.
   *
   *   new RobustURL("https://example.com", { filePath: true })                                    // throws "not a file URL"
   *
   *   new RobustURL("file:///fixtures/exists.txt", { filePath: true })                            // ok
   *   new RobustURL("file:///fixtures/does-not-exists.txt", { filePath: true })                   // throws "does not exist"
   *   new RobustURL("file:///fixtures/does-not-exists.txt", { filePath: true, missingOk: true })  // ok
   *
   *   new RobustURL("/fixtures/exists.txt", { filePath: true })                                   // ok
   *   new RobustURL("/fixtures/does-not-exists.txt", { filePath: true })                          // throws "does not exist"
   *   new RobustURL("/fixtures/does-not-exists.txt", { filePath: true, missingOk: true })         // ok
   *   new RobustURL("/fixtures/CON.txt", { filePath: true, missingOk: true })                     // "file:///fixtures/CON.txt" (+ console.warn)
   *
   *
   * URL-only mode:
   *   Resolved URL must NOT use the `file:` protocol. Path strings always
   *   fall back to `file:` URLs in the parser, so no path string passes.
   *
   *   new RobustURL("https://example.com", { filePath: false })       // ok
   *
   *   new RobustURL("file:///fixtures/exists.txt", { filePath: false })    // throws
   *   new RobustURL("/fixtures/exists.txt", { filePath: false })           // throws
   *
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
    const { webURL, ip, absoluteFilePath, fileURL, opts } =
      BaseRobustURL._constructorArgParser(
        ...(args as [string | URL, (string | URL)?, Options?]),
      );

    // Misalignment guard: missingOk only carries meaning with filePath: true.
    if (
      opts &&
      "missingOk" in opts &&
      (opts as OptsWithFile).filePath !== true
    ) {
      throw new TypeError(
        `missingOk requires filePath: true. Got: ${JSON.stringify(opts)}.`,
      );
    }

    const filePathOpt = opts ? (opts as OptsWithFile).filePath : undefined;
    const missingOk = opts ? (opts as OptsWithFile).missingOk === true : false;

    let href: string;
    if (filePathOpt === undefined) {
      // Auto: any parseable URL is fine. file: protocol — whether direct or
      // via fileURL fallback — must point at an existing file on disk.
      const resolved = webURL ?? fileURL;
      if (!resolved) {
        throw new TypeError(
          `Invalid input: '${String(args[0])}' is neither a parseable URL nor an existing file path.`,
        );
      }
      if (resolved.protocol === "file:") {
        const diskPath = urlToFilePath(resolved);
        if (!fileExists(diskPath)) {
          throw new TypeError(
            `file path does not exist on disk: '${diskPath}'.`,
          );
        }
      }
      href = String(resolved);
    } else if (filePathOpt === true) {
      // File-path mode. Web URL input is misaligned. file: URL input is
      // disk-checked at its decoded path; path-string input is disk-checked
      // at the parser's absoluteFilePath.
      if (webURL && webURL.protocol !== "file:") {
        throw new TypeError(
          `filePath: true but resolved URL is not a file URL: '${String(webURL)}'.`,
        );
      }

      let diskPath: string;
      if (webURL) {
        diskPath = urlToFilePath(webURL);
      } else if (absoluteFilePath) {
        diskPath = absoluteFilePath;
      } else {
        throw new TypeError(`Invalid URL: '${String(args[0])}'.`);
      }

      if (missingOk) {
        // Caller is source of truth. Warn if format check fails, then coerce.
        if (!isFilePath(diskPath)) {
          console.warn(
            `RobustURL: file path '${diskPath}' failed format validation. Coercing because caller passed { filePath: true, missingOk: true }.`,
          );
        }
        href = String(pathToFileURL(diskPath));
      } else {
        // Filesystem is source of truth.
        if (!fileExists(diskPath)) {
          throw new TypeError(
            `file path does not exist on disk: '${diskPath}'.`,
          );
        }
        href = String(pathToFileURL(diskPath));
      }
    } else {
      // URL-only mode. Resolved URL must not be file:.
      const resolved = webURL ?? fileURL;
      if (!resolved) {
        throw new TypeError(`Invalid URL: '${String(args[0])}'.`);
      }
      if (resolved.protocol === "file:") {
        throw new TypeError(
          `filePath: false but resolved URL is a file URL: '${String(resolved)}'.`,
        );
      }
      href = String(resolved);
    }

    try {
      super(href);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid URL")) {
        throw new TypeError(`Invalid URL: '${href}'.`);
      }
      throw error;
    }

    this._opts = opts;
    this._ip = ip ?? null;
  }
}

import {
  RobustURL as BaseRobustURL,
  type Options,
  type ParsedOptions,
} from "./base";
import { isFilePath } from "../path/filepath";
import { pathToFileURL } from "../path/utils";

export class RobustURL extends BaseRobustURL {
  /**
   * Construct a RobustURL from a URL, a relative URL plus base, or an asserted
   * file path.
   *
   * The browser build cannot inspect the filesystem, so plain path strings are
   * never auto-detected. Auto mode accepts parseable URLs, including `file:`
   * URLs, and rejects unparseable strings such as `/tmp/file.txt`. To convert a
   * path string in the browser build, the caller must pass
   * `{ filePath: true, missingOk: true }`, which asserts the string is a path
   * without requiring an existence check.
   *
   * `{ filePath: true }` and `{ filePath: true, missingOk: false }` are
   * rejected because they request a disk check the browser cannot perform.
   * `{ filePath: false }` is URL-only mode; file URLs and unparseable strings
   * are rejected.
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
    const {
      _url,
      _ip,
      _absoluteFilePath,
      _opts: parsedOpts,
    } = BaseRobustURL._constructorArgParser(
      ...(args as [string | URL, (string | URL)?, Options?]),
    );

    // missingOk gates disk existence checks, which the browser cannot perform.
    // Reject requests that require a check, then strip the flag once browser
    // behavior is decided.
    if (parsedOpts?.filePath === true && parsedOpts?.missingOk === false) {
      throw new TypeError(
        `filePath assertion requires verifying the file exists on disk, which the browser cannot do. Pass { filePath: true, missingOk: true } to assert a path without checking existence.`,
      );
    }

    const _opts: ParsedOptions =
      parsedOpts === null ? null : { filePath: parsedOpts.filePath };

    // Three branches remain after browser-specific option handling.
    let href: string;

    if (_opts === null) {
      // Auto: URL only. No on-disk file-path fallback exists in the browser.
      if (!_url) {
        throw new TypeError(
          `Invalid URL: '${String(args[0])}'. Browser cannot auto-detect file paths; pass { filePath: true, missingOk: true } to treat this as a path.`,
        );
      }
      href = String(_url);
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
    } else {
      // Caller-asserted path: no existence check is possible. Format validation
      // is warn-only, then conversion goes directly through `pathToFileURL`.
      if (!isFilePath(_absoluteFilePath)) {
        console.warn(
          `RobustURL: file path '${_absoluteFilePath}' failed format validation. Accepting because caller passed filePath: true; caller is source of truth.`,
        );
      }
      href = String(pathToFileURL(_absoluteFilePath));
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

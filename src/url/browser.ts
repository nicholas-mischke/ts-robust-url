import { RobustURL as BaseRobustURL, type Options } from "./base";
import { isFilePath } from "../path/filepath";
import { pathToFileURL } from "../path/utils";

type OptsWithFile = { filePath?: boolean; missingOk?: boolean };

export class RobustURL extends BaseRobustURL {
  /**
   * Construct a RobustURL from a parseable URL or a plain path string.
   *
   *
   * Auto mode:
   *   Accepts parseable URLs with any protocol, including `file:`.
   *   Does not accept plain path strings even if they could be coerced into `file:` URLs.
   *
   *   new RobustURL("https://example.com/page").href // "https://example.com/page"
   *   new RobustURL("file:///tmp/file.txt").href     // "file:///tmp/file.txt"
   *   new RobustURL("/tmp/file.txt").href            // throws
   *
   * File-path mode:
   *   Accepts parseable URLs with the `file:` protocol.
   *   Coerces plain path strings into URLs with the `file:` protocol.
   *   Paths that fail `isFilePath` format validation (e.g. Windows reserved
   *   names like `CON`) are still coerced — `filePath: true` asserts
   *   caller-as-source-of-truth — but `console.warn` is emitted so the
   *   looseness is not silent.
   *
   *   new RobustURL("https://example.com/page", { filePath: true }).href // throws
   *   new RobustURL("file:///tmp/file.txt", { filePath: true }).href     // "file:///tmp/file.txt"
   *   new RobustURL("/tmp/file.txt", { filePath: true }).href            // "file:///tmp/file.txt"
   *   new RobustURL("/tmp/CON.txt", { filePath: true }).href             // "file:///tmp/CON.txt" (+ console.warn)
   *
   * URL-only mode:
   *   Accepts parseable URLs with any protocol except `file:`.
   *   Plain path strings always fall back to `file:` URLs in the parser, so
   *   no plain path string passes this mode.
   *
   *   new RobustURL("https://example.com/page", { filePath: false }).href // "https://example.com/page"
   *   new RobustURL("file:///tmp/file.txt", { filePath: false }).href     // throws
   *   new RobustURL("/tmp/file.txt", { filePath: false }).href            // throws
   *
   *
   * missingOk Option:
   *    `missingOk: false` always throws in browser builds.
   *    In Node, that option can mean "treat this as a file path, but require that it exists."
   *    Browser code cannot verify whether a file exists, so any explicit `{ missingOk: false }`
   *    is invalid regardless of `filePath`.
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

    // missingOk: false requests a disk check the browser cannot do — fatal.
    // Any other missingOk is irrelevant; drop the key so downstream sees a
    // clean opts shape with only `filePath` (if anything).
    if (opts && (opts as OptsWithFile).missingOk === false) {
      throw new TypeError(
        `missingOk: false requested but browser cannot verify file existence. Drop missingOk or pass missingOk: true to assert the path without a disk check.`,
      );
    }
    if (opts && "missingOk" in opts) {
      delete (opts as OptsWithFile).missingOk;
    }

    // webURL first, fileURL fallback. Auto mode forbids the fallback because
    // accepting it would silently treat an unparseable string as a file path
    // without disk verification.
    const resolvedURL = webURL ?? fileURL;
    const filePathOpt = opts ? (opts as OptsWithFile).filePath : undefined;

    let href: string;
    if (filePathOpt === undefined) {
      if (!webURL) {
        throw new TypeError(
          `Invalid URL: '${String(args[0])}'. Parser had to fall back to a file URL, which requires a disk check the browser cannot perform. Pass { filePath: true } to assert the input is a file path.`,
        );
      }
      href = String(webURL);
    } else if (filePathOpt === true) {
      // file: URL passed → use it; web URL passed → misaligned, throw.
      if (webURL) {
        if (webURL.protocol !== "file:") {
          throw new TypeError(
            `filePath: true but resolved URL is not a file URL: '${String(webURL)}'.`,
          );
        }
        href = String(webURL);
      } else if (absoluteFilePath) {
        // Path string. Coerce unconditionally — caller asserted filePath:
        // true — but warn when the format check fails so the looseness is
        // not silent.
        if (!isFilePath(absoluteFilePath)) {
          console.warn(
            `RobustURL: file path '${absoluteFilePath}' failed format validation. Coercing because caller passed filePath: true.`,
          );
        }
        href = String(pathToFileURL(absoluteFilePath));
      } else {
        throw new TypeError(`Invalid URL: '${String(args[0])}'.`);
      }
    } else {
      if (!resolvedURL) {
        throw new TypeError(`Invalid URL: '${String(args[0])}'.`);
      }
      if (resolvedURL.protocol === "file:") {
        throw new TypeError(
          `filePath: false but resolved URL is a file URL: '${String(resolvedURL)}'.`,
        );
      }
      href = String(resolvedURL);
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

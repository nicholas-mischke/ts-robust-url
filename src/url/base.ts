// local
import isPlainObject from "lodash-es/isPlainObject";
import { bracketIPv6, isIPv4, isIPv6 } from "../ip";
import {
  filePathToURL,
  isFilePath,
  isFileURL,
  urlToFilePath,
} from "../path/filepath";
import { path } from "../path/utils";
import { type EqualityOptions, urlsAreEqual } from "./utils/equality";
import { type NormalizeOptions, normalizeURL } from "./utils/normalize";
import { isURL, normalizeProtocol } from "./utils/utils";
import typeDetect from "type-detect";
import { inspect } from "loupe";

/**
 * Constructor options shared by the Node and browser RobustURL builds.
 *
 * `filePath` selects URL-only, file-path-only, or auto-detect behavior in the
 * concrete constructor. `missingOk` is valid only with `filePath: true`; it
 * tells the concrete constructor to accept a caller-asserted path without a
 * filesystem existence check.
 */
export type Options = {
  filePath?: boolean;
  missingOk?: boolean;
};

/**
 * Canonical constructor mode returned by `parseOptions`.
 *
 * `null` means auto-detect. A non-null value pins interpretation to either
 * file-path mode or URL-only mode, with `missingOk` resolved to an explicit
 * boolean for constructors that perform filesystem checks.
 */
export type ParsedOptions = {
  filePath: boolean;
  missingOk?: boolean;
} | null;

/**
 * Parses caller-facing constructor options into a single constructor mode.
 *
 * Accepted inputs are `undefined`, `null`, an empty plain object, or a plain
 * object containing `filePath` and optionally `missingOk`. `missingOk` is only
 * meaningful with `filePath: true`; all other combinations are rejected.
 *
 * @throws {TypeError} When the options value is not a plain object, contains
 * non-boolean option values, or uses `missingOk` outside file-path mode.
 */
export const parseOptions = (opts: unknown): ParsedOptions => {
  // Not provided: auto-detect.
  if (opts === undefined || opts === null) return null;

  if (!isPlainObject(opts)) {
    throw new TypeError(
      `expected undefined or plain object. Got: '${inspect(opts)}' of type: '${typeDetect(opts)}'.`,
    );
  }

  // Empty plain object also means auto-detect.
  if (Object.keys(opts).length === 0) return null;

  const o = opts as Record<string, unknown>;
  const { filePath, missingOk } = o as Options;

  // Both flags omitted: auto-detect. `{}` is identical to `undefined`.
  if (filePath === undefined && missingOk === undefined) return null;

  // missingOk only carries meaning alongside filePath: true. Reject any
  // other combination so the option's intent stays unambiguous.
  if (missingOk !== undefined && filePath !== true) {
    throw new TypeError(
      `missingOk is only valid with filePath: true. Got: '${inspect(opts)}'.`,
    );
  }

  if (filePath !== undefined && typeof filePath !== "boolean") {
    throw new TypeError(
      `expected filePath to be a boolean. Got: '${inspect(filePath)}' of type: '${typeDetect(filePath)}'.`,
    );
  }

  if (missingOk !== undefined && typeof missingOk !== "boolean") {
    throw new TypeError(
      `expected missingOk to be a boolean. Got: '${inspect(missingOk)}' of type: '${typeDetect(missingOk)}'.`,
    );
  }

  // filePath: false: URL-only, no auto-detect fallback. missingOk is
  // irrelevant here (the case above already rejected it being set).
  if (filePath === false) {
    return { filePath: false, missingOk: false };
  }

  // filePath: true: caller asserts a path. Default missingOk to false
  // (must exist) unless the caller explicitly opted out.
  return { filePath: true, missingOk: missingOk === true };
};

/**
 * Environment-agnostic core of RobustURL. Extends the WHATWG `URL` class and
 * layers on package conventions: numeric `port` with scheme defaults, an
 * authority accessor that includes userinfo, a `domain` getter that excludes
 * IP literals, file-URL helpers, normalization, equality, and origin glob
 * generation.
 *
 * This class is abstract in spirit: it has no constructor of its own and is
 * not instantiated directly. The `node` and `browser` entry points subclass
 * it and supply the constructor, because file-path handling differs between
 * environments  Node can stat the filesystem to auto-detect existing
 * files, the browser cannot. Both subclasses funnel their args through
 * `_constructorArgParser` below to keep parsing identical across builds.
 *
 * Not a drop-in WHATWG `URL` replacement. Several accessors (`port`,
 * `domain`, `authority`, `portHref`) intentionally diverge from the spec to
 * be more useful in package code; each documents its own non-WHATWG behavior.
 */
export class RobustURL extends URL {
  declare protected _ip: string | null;
  declare protected _fileOpts: ParsedOptions;

  /**
   * Build a minimal RobustURL from protocol, host, port, and userinfo parts.
   *
   * Intentionally narrow: this helper exists to rebuild a URL with swapped
   * protocol, host, port, username, or password components (e.g. promoting
   * `http` to `https`, adding credentials, or swapping a domain for its
   * resolved IPv4). It does not accept paths, query strings, or fragments; for
   * anything richer, construct via `new RobustURL(...)` directly.
   *
   * Assumes inputs are already split into protocol, host, port, and userinfo
   * fields; no full-URL parsing or path handling is performed.
   *
   * Protocol:
   * - `http`, `http:`, and `http://` all normalize to `http` (case-insensitive).
   * - Must be non-empty after normalization.
   *
   * Host:
   * - Domain (e.g. `example.com`), IPv4 (e.g. `127.0.0.1`), or IPv6
   *   (bare `::1` or bracketed `[::1]`) — bare IPv6 is auto-bracketed.
   *
   * Userinfo:
   * - `username` and `password` are optional authority components.
   * - A password requires a username.
   * - Both values are percent-encoded before insertion into the authority.
   *
   * Port:
   * - For IP hosts: port is required, either explicitly or via the protocol's
   *   implicit default (`http` to 80, `https` to 443). If neither is available
   *   the call throws.
   * - For domain hosts: port is ignored. Domains don't get an explicit port
   *   appended (so the result is `http://example.com/`, not
   *   `http://example.com:80/`). Pass a domain through `new RobustURL(...)`
   *   if you need to attach a non-default port.
   * - When provided, port is coerced to an integer and must be in [1, 65535].
   *
   * @throws {TypeError} If protocol is empty, hostname is empty, port is out
   *   of range, an IP host has no explicit or implicit port, or password is
   *   provided without username.
   */
  static fromParts(
    protocol: string,
    hostname: string,
    port?: string | number,
    {
      username = "",
      password = "",
    }: { username?: string; password?: string } = {},
  ): RobustURL {
    // Protocol — must be non-empty after normalization.
    const _protocol = normalizeProtocol(protocol);
    if (!_protocol) {
      throw new TypeError(`protocol must be a non-empty string.`);
    }

    // Hostname — must be non-empty. Classify as IP vs domain so we know
    // whether a port is meaningful. `isIPv6` accepts both bare (`::1`) and
    // bracketed (`[::1]`) forms.
    if (typeof hostname !== "string" || hostname.length === 0) {
      throw new TypeError(`hostname must be a non-empty string.`);
    }
    const _hostnameIsIPv6 = isIPv6(hostname);
    const _hostnameIsIP = isIPv4(hostname) || _hostnameIsIPv6;

    // Port — implicit (scheme default) vs explicit (caller-provided).
    const _implicitPort =
      _protocol === "http" ? 80 : _protocol === "https" ? 443 : null;
    const _explicitPort =
      port === undefined || port === "" ? null : Number(port);

    if (
      _explicitPort !== null &&
      (!Number.isInteger(_explicitPort) ||
        _explicitPort < 1 ||
        _explicitPort > 65535)
    ) {
      throw new TypeError(
        `port must be an integer in [1, 65535]. Got: ${port}.`,
      );
    }

    // Userinfo — `user`, `user:pass`, or empty. A password without a username
    // is meaningless in URL syntax, so reject it.
    if (password && !username) {
      throw new TypeError(`password requires a username.`);
    }
    const userInfo = username
      ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ""}@`
      : "";

    // Resolve the host segment. IPv6 is normalized and bracketed for URL syntax.
    const host = _hostnameIsIPv6 ? bracketIPv6(hostname) : hostname;

    // Resolve the port segment. IP hosts require a port (explicit or
    // implicit); domain hosts never get one appended.
    let portSegment = "";
    if (_hostnameIsIP) {
      const resolved = _explicitPort ?? _implicitPort;
      if (resolved === null) {
        throw new TypeError(
          `port is required for IP host with protocol '${_protocol}' — no default port is known.`,
        );
      }
      portSegment = `:${resolved}`;
    }

    return new this(`${_protocol}://${userInfo}${host}${portSegment}/`);
  }

  /**
   * Parses constructor arguments shared by the Node and browser builds.
   *
   * The result contains the WHATWG URL parse result when available, the parsed
   * IP hostname for IPv4/IPv6 inputs, the absolute path interpretation of the
   * first argument, and canonical constructor options. Concrete constructors
   * use these fields to decide whether to accept a URL, convert a file path, or
   * reject the input for their environment.
   *
   * A trailing plain object is always treated as options. Remaining positional
   * arguments must be URL constructor arguments. If URL parsing fails, only a
   * single positional argument is valid because base resolution no longer has a
   * URL to resolve against.
   *
   * @throws {TypeError} When options are invalid or URL parsing fails with more
   * than one positional argument.
   */
  static _constructorArgParser(
    url: string | URL,
    base?: string | URL | Options,
    options?: Options,
  ) {
    const args = [url, base, options].filter((arg) => arg !== undefined);

    // Pop the optional trailing options bag.
    let _opts = parseOptions(undefined);
    if (isPlainObject(args[args.length - 1])) {
      _opts = parseOptions(args.pop());
    }

    // Anything still in args must be string | URL.
    let _url;
    try {
      _url = new URL(...(args as [string | URL, (string | URL)?]));
    } catch (e) {
      _url = null;
    }

    // If a url was passed explicitly, we can use it to determine the ip address.
    // host is ip:port or null
    // hostname is domain name or null
    let _ip;
    if (_url) {
      if (isIPv4(_url.hostname)) {
        _ip = _url.hostname;
      } else if (isIPv6(_url.hostname)) {
        _ip = bracketIPv6(_url.hostname);
      }
    }

    // Without a parsed URL, only a single file-path candidate can remain.
    if (!_url && args.length !== 1) {
      throw new TypeError(
        "Invalid arguments: when URL construction fails, expected exactly one argument (the URL string or file path).",
      );
    }

    // Resolve the path interpretation without touching the filesystem.
    const _absoluteFilePath = path.resolve(String(args[0]));

    return { _url, _ip, _absoluteFilePath, _opts };
  }

  /**
   * Origin-scoped wildcard pattern: `<origin>/*`.
   *
   * Shape matches Chrome extension match patterns and other host-permission
   * formats (MV3 `host_permissions`, content-script `matches`). The native
   * `URL.origin` is `scheme://host[:port]` with no trailing slash on most
   * inputs, but some serializations include one; we strip it unconditionally
   * so the result is always `<origin>/*` and never `<origin>//*`.
   *
   * Examples:
   * - `https://example.com:8443/a` → `https://example.com:8443/*`
   * - `http://127.0.0.1:3000/`     → `http://127.0.0.1:3000/*`
   */
  get originGlob() {
    return `${this.origin.replace(/\/$/, "")}/*`;
  }

  /**
   * True when this URL uses the `file:` scheme.
   *
   * Example: `file:///tmp/file.txt` returns true; `https://example.com/page`
   * returns false.
   */
  get isFileURL() {
    return this.protocol === "file:";
  }

  /**
   * Filesystem path for a `file:` URL, or `null` for any other scheme.
   * Conversion goes through `urlToFilePath`, which applies RFC 8089
   * decoding rules (percent-decoded path, drive-letter handling on
   * Windows). Non-file URLs return `null` rather than throwing  callers
   * can use this as a "is this a file URL with a usable path" check in
   * one step.
   */
  get filePath() {
    try {
      return urlToFilePath(this);
    } catch {
      return null;
    }
  }

  /**
   * Serialized `file:` URI when this URL has a usable file path, otherwise
   * `null`. Effectively a typed alias of `toString()` gated on file-scheme
   * membership  useful when a caller wants to pass a value only if it's
   * a file URI, without a separate `isFileURL` branch.
   */
  get fileURI() {
    if (this.filePath) {
      return this.toString();
    }
    return null;
  }

  /**
   * Parsed IP hostname captured by the concrete constructor, or null for DNS
   * hosts and non-host URLs.
   *
   * Examples: `https://127.0.0.1:4443/page` returns `127.0.0.1`,
   * `https://[::1]:8443/page` returns `[::1]`, and
   * `https://example.com/page` returns null.
   */
  get ip() {
    const ip = this._ip ?? null;
    if (!ip) return null;
    return isIPv6(ip) ? bracketIPv6(ip) : ip;
  }

  /**
   * IPv4 hostname when this URL was constructed with an IPv4 host, otherwise
   * null.
   *
   * Example: `https://127.0.0.1:4443/page` returns `127.0.0.1`;
   * `https://example.com/page` and `https://[::1]:8443/page` return null.
   */
  get ipv4() {
    return isIPv4(this.ip) ? this.ip : null;
  }

  /**
   * IPv6 hostname when this URL was constructed with an IPv6 host, otherwise
   * null.
   *
   * Example: `https://[::1]:8443/page` returns `[::1]`;
   * `https://example.com/page` and `https://127.0.0.1:4443/page` return null.
   */
  get ipv6() {
    return isIPv6(this.ip) ? this.ip : null;
  }

  /**
   * Numeric port accessor.
   *
   * Non-WHATWG behavior:
   * - Returns a number instead of the native URL API's string value.
   * - Returns default ports for HTTP/HTTPS (`80` / `443`) when no explicit
   *   port is present.
   * - Returns null for protocols without a package-defined default.
   *
   * Native `URL.port` returns an empty string for absent/default ports.
   */
  get port(): any {
    if (super.port) return Number(super.port);
    if (this.protocol === "https:") return 443;
    if (this.protocol === "http:") return 80;
    return null;
  }

  /**
   * Returns this URL's authority.
   *
   * authority is the portion between the protocol delimiter and the path:
   *
   *   `scheme://[username[:password]@]host[:port]/path`
   *             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   *
   * For example:
   * - `https://example.com/page` has authority `example.com`.
   * - `https://user:pass@example.com/page` has authority `user:pass@example.com`.
   * - `https://127.0.0.1:4443/page` has authority `127.0.0.1:4443`.
   * - `https://[::1]:8443/page` has authority `[::1]:8443`.
   *
   * Native `URL.host` is used for the host portion so domain ports, IPv4 ports,
   * and bracketed IPv6 hosts are serialized consistently with WHATWG URL
   * parsing. Default ports normalized away by the native parser are not
   * reintroduced here.
   *
   * @returns The authority string, or null when the URL has no authority.
   */
  get authority() {
    if (!super.host) {
      return null;
    }

    const userInfo = super.username
      ? `${super.username}${super.password ? `:${super.password}` : ""}@`
      : "";

    return `${userInfo}${super.host}`;
  }

  /**
   * Returns the DNS-style hostname when this URL has a domain host.
   *
   * A domain is a named host such as `example.com`, not an IPv4 or IPv6
   * address. IP hosts return null:
   *
   * - `https://example.com/page` returns `example.com`.
   * - `https://127.0.0.1:4443/page` returns null.
   * - `https://[::1]:8443/page` returns null.
   */
  get domain() {
    // Return hostname only if it's not an IP address
    if (isIPv4(super.hostname) || isIPv6(super.hostname)) {
      return null;
    }
    return super.hostname || null;
  }

  /**
   * Returns href with an explicit port when one is known.
   *
   * Native `URL.href` removes default ports such as `:80` for HTTP and `:443`
   * for HTTPS. This getter keeps `href` standard while offering an opt-in
   * serialization for callers that need endpoint-style URLs with explicit
   * ports.
   *
   * Examples:
   * - `https://example.com/a` returns `https://example.com:443/a`.
   * - `http://127.0.0.1/a` returns `http://127.0.0.1:80/a`.
   * - `http://[::1]/a` returns `http://[::1]:80/a`.
   *
   * @returns Standard href for URLs without an authority or known port;
   *          otherwise href with an explicit port.
   */
  get portHref() {
    if (!super.host || !this.port) {
      return super.href;
    }

    const userInfo = super.username
      ? `${super.username}${super.password ? `:${super.password}` : ""}@`
      : "";
    const host = super.port ? super.host : `${super.hostname}:${this.port}`;

    return `${this.protocol}//${userInfo}${host}${this.pathname}${this.search}${this.hash}`;
  }

  /**
   * Returns a new RobustURL with normalization applied. Delegates to
   * `normalizeURL`  see [./utils/normalize](./utils/normalize) for the
   * full option set (scheme coercion, default-port stripping, case folding,
   * trailing-slash and `www.` handling, query parameter sorting, etc.).
   * The receiver is not mutated.
   */
  normalize(options: NormalizeOptions = {}): RobustURL {
    return new RobustURL(normalizeURL(this, options));
  }

  /**
   * Tests whether this URL and `other` refer to the same resource under the
   * package's normalization rules. The comparison is delegated to
   * `urlsAreEqual`; see [./utils/equality](./utils/equality) for the full
   * option set and defaults (including HTTP/HTTPS equivalence and localhost
   * loopback aliasing).
   *
   * `other` is coerced to RobustURL when needed so callers can pass a
   * string, a native `URL`, or a RobustURL interchangeably.
   */
  isEqual(
    other: string | URL | RobustURL,
    options: EqualityOptions = {},
  ): boolean {
    const otherUrl = other instanceof RobustURL ? other : new RobustURL(other);
    return urlsAreEqual(this, otherUrl, options);
  }

  /**
   * Serializes the URL. Defaults to WHATWG-standard `href` (default ports
   * omitted). Pass `{ port: true }` to force an explicit port via
   * `portHref`  useful when emitting endpoint-style URLs that downstream
   * tools won't reconstruct the default from.
   *
   * Note: this overrides `URL.prototype.toString`, which takes no arguments
   * in the spec. The options bag is additive; calling `toString()` with no
   * args remains spec-compatible.
   */
  toString({ port = false }: { port?: boolean } = {}): string {
    return port ? this.portHref : this.href;
  }
}

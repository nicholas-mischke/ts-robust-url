# robust-url

URL and file-path utilities for Node and browser environments. The package centers on `RobustURL`, a small extension of the native WHATWG `URL` class with file-path handling, URL normalization, equality checks, and IP helpers.

> Package name in `package.json`: `robust-url`

## Install

```sh
npm install
```

### File Paths

#### Node

In Node, `RobustURL` can receive a URL string, a relative URL plus a base, or a filesystem path. Because Node can stat the filesystem, disk existence is part of the contract.

```ts
import { RobustURL } from "robust-url";

new RobustURL("https://example.com/page").href;
// "https://example.com/page"

new RobustURL("page", "https://example.com/").href;
// "https://example.com/page"
```

**Misaligned options.** `missingOk` is only meaningful with `filePath: true` — it picks between filesystem-as-source-of-truth (`missingOk: false`) and caller-as-source-of-truth (`missingOk: true`). Using `missingOk` without `filePath: true` is rejected up front, before any mode runs.

```ts
new RobustURL("https://example.com", { missingOk: true });
// throws (missingOk requires filePath: true)

new RobustURL("https://example.com", { filePath: false, missingOk: true });
// throws (missingOk requires filePath: true)
```

**Auto mode** accepts any parseable URL. When the resolved URL uses the `file:` protocol — whether the input was a `file:` URL or a path string that fell back to one — the referenced file must exist on disk.

```ts
new RobustURL("https://example.com").href;                  // ok

new RobustURL("file:///fixtures/exists.txt").href;          // ok
new RobustURL("/fixtures/exists.txt").href;                 // ok

new RobustURL("file:///fixtures/does-not-exists.txt").href; // throws
new RobustURL("/fixtures/does-not-exists.txt").href;        // throws
```

**File-path mode** requires the resolved URL to use the `file:` protocol — web URLs are rejected as misaligned. The resolved path is then disk-checked unless the caller asserts source-of-truth with `missingOk: true`. Under `missingOk: true`, paths that fail `isFilePath` format validation are still coerced but a `console.warn` is emitted so the looseness is not silent.

```ts
new RobustURL("https://example.com", { filePath: true });
// throws "not a file URL"

new RobustURL("file:///fixtures/exists.txt", { filePath: true }).href;
// ok

new RobustURL("file:///fixtures/does-not-exists.txt", { filePath: true });
// throws "does not exist"

new RobustURL("file:///fixtures/does-not-exists.txt", {
  filePath: true,
  missingOk: true,
}).href;
// ok

new RobustURL("/fixtures/exists.txt", { filePath: true }).href;
// ok

new RobustURL("/fixtures/does-not-exists.txt", { filePath: true });
// throws "does not exist"

new RobustURL("/fixtures/does-not-exists.txt", {
  filePath: true,
  missingOk: true,
}).href;
// ok

new RobustURL("/fixtures/CON.txt", { filePath: true, missingOk: true }).href;
// "file:///fixtures/CON.txt" (with console.warn)
```

**URL-only mode** requires the resolved URL to NOT use the `file:` protocol. Path strings always fall back to `file:` URLs in the parser, so no path string passes.

```ts
new RobustURL("https://example.com", { filePath: false }).href;
// "https://example.com/"

new RobustURL("file:///fixtures/exists.txt", { filePath: false });
// throws

new RobustURL("/fixtures/exists.txt", { filePath: false });
// throws
```

#### Browser

Browser builds cannot inspect the filesystem. Auto mode accepts parseable URLs with any protocol, including `file:`, but plain path strings are accepted only when the caller opts into file-path mode with `{ filePath: true }`.

```ts
import { RobustURL } from "robust-url";
```

Auto mode accepts parseable URLs with any protocol, including `file:`. It does not accept plain path strings even if they could be coerced into `file:` URLs.

```ts
new RobustURL("https://example.com/page").href;
// "https://example.com/page"

new RobustURL("file:///tmp/file.txt").href;
// "file:///tmp/file.txt"

new RobustURL("/tmp/file.txt").href;
// throws
```

File-path mode accepts parseable URLs with the `file:` protocol. It coerces plain path strings into URLs with the `file:` protocol. Paths that fail `isFilePath` format validation (e.g. Windows reserved names like `CON`) are still coerced — `filePath: true` asserts caller-as-source-of-truth — but `console.warn` is emitted so the looseness is not silent.

```ts
new RobustURL("https://example.com/page", { filePath: true }).href;
// throws

new RobustURL("file:///tmp/file.txt", { filePath: true }).href;
// "file:///tmp/file.txt"

new RobustURL("/tmp/file.txt", { filePath: true }).href;
// "file:///tmp/file.txt"

new RobustURL("/tmp/CON.txt", { filePath: true }).href;
// "file:///tmp/CON.txt" (with console.warn)
```

URL-only mode accepts parseable URLs with any protocol except `file:`. Plain path strings always fall back to `file:` URLs in the parser, so no plain path string passes this mode.

```ts
new RobustURL("https://example.com/page", { filePath: false }).href;
// "https://example.com/page"

new RobustURL("file:///tmp/file.txt", { filePath: false }).href;
// throws

new RobustURL("/tmp/file.txt", { filePath: false }).href;
// throws
```

`missingOk: false` always throws in browser builds. In Node, that option can mean "treat this as a file path, but require that it exists." Browser code cannot verify whether a file exists, so any explicit `{ missingOk: false }` is invalid regardless of `filePath`.

### URL Normalization

`normalizeURL(...)` returns a normalized URL string. `new RobustURL(...).normalize()` applies the same rules and returns a new `RobustURL` instance.

Default normalization options:

```ts
{
  defaultProtocol: "https",
  normalizeProtocol: true,
  forceHttp: false,
  forceHttps: false,
  stripAuthentication: true,
  stripHash: true,
  stripTextFragment: true,
  stripWWW: true,
  removeQueryParameters: [/^utm_\w+/i],
  removeTrailingSlash: true,
  removeSingleSlash: true,
  removeDirectoryIndex: false,
  removeExplicitPort: false,
  sortQueryParameters: true,
  localhost: "localhost",
}
```

#### `normalizeURL`

Localhost aliases are rewritten to `localhost` by default.

```ts
import { normalizeURL } from "robust-url";

normalizeURL("https://127.0.0.1:4443/page");
// "https://localhost:4443/page"

normalizeURL("https://[::1]:8443/page");
// "https://localhost:8443/page"
```

Query parameters are sorted, `utm_*` parameters are removed, `www.` is stripped, and hashes are stripped.

```ts
normalizeURL("https://www.example.com/page/user?z=26&a=1&utm_source=x#hash");
// "https://example.com/page/user?a=1&z=26"
```

Options can override the defaults for a single call.

```ts
normalizeURL("https://www.example.com/page/user?z=26&a=1#hash", {
  stripWWW: false,
  stripHash: false,
  sortQueryParameters: false,
});
// "https://www.example.com/page/user?z=26&a=1#hash"
```

#### `RobustURL.normalize`

`RobustURL.normalize()` uses the same options as `normalizeURL`, but keeps the result as a `RobustURL`.

```ts
import { RobustURL } from "robust-url";

const url = new RobustURL("https://www.example.com/page/");
const normalized = url.normalize();

normalized.href;
// "https://example.com/page"

normalized instanceof RobustURL;
// true

normalized === url;
// false
```

### URL Equality

`urlsAreEqual(...)` compares two URL strings or `URL` objects after applying the package normalization rules. `RobustURL.isEqual(...)` uses the same comparison from an existing `RobustURL` instance.

Equality options include every `normalizeURL` option plus:

```ts
{
  httpOrHttps: true,
}
```

When `httpOrHttps` is `true`, HTTP and HTTPS variants compare equal by normalizing both sides to HTTPS. Set it to `false` when the protocol must match exactly.

#### `urlsAreEqual`

Localhost aliases compare equal by default.

```ts
import { urlsAreEqual } from "robust-url";

urlsAreEqual("https://localhost:4443/page", "https://127.0.0.1:4443/page");
// true

urlsAreEqual("https://localhost:8443/page", "https://[::1]:8443/page");
// true

urlsAreEqual("https://localhost:4443/page", "https://127.0.0.1:4443/page", {
  localhost: false,
});
// false
```

HTTP and HTTPS compare equal by default.

```ts
urlsAreEqual("http://example.com/page", "https://example.com/page");
// true

urlsAreEqual("http://example.com/page", "https://example.com/page", {
  httpOrHttps: false,
});
// false
```

Because equality uses normalization, URLs with different surface forms can still compare equal.

```ts
urlsAreEqual(
  "https://www.example.com/page/user?z=26&a=1#hash",
  "https://example.com/page/user?a=1&z=26",
);
// true

urlsAreEqual("https://www.example.com/page", "https://example.com/page", {
  stripWWW: false,
});
// false
```

#### `RobustURL.isEqual`

`RobustURL.isEqual(...)` compares the receiver with a string, native `URL`, or another `RobustURL`. It accepts the same options as `urlsAreEqual(...)`.

```ts
import { RobustURL } from "robust-url";

const url = new RobustURL("http://example.com/page");

url.isEqual("https://example.com/page");
// true

url.isEqual("https://example.com/page", { httpOrHttps: false });
// false
```

# robust-url

URL and file-path utilities for Node and browser environments. The package centers on `RobustURL`, a small extension of the native WHATWG `URL` class with file-path handling, URL normalization, equality checks, and IP helpers.

> Package name in `package.json`: `robust-url`

## Install

```sh
npm install
```

### File Paths

#### Node

In Node, `RobustURL` can receive a URL string, a relative URL plus a base, or a filesystem path. With no options, it parses as a URL first. If that fails, it treats the input as a file path only when the resolved path exists on disk.

```ts
import { RobustURL } from "robust-url";

new RobustURL("https://example.com/page").href;
// "https://example.com/page"

new RobustURL("page", "https://example.com/").href;
// "https://example.com/page"

new RobustURL("/tmp/file.txt", { filePath: true, missingOk: true }).href;
// "file:///tmp/file.txt"
```

Node file-path modes:

- No options: auto mode. Existing file paths become `file:` URLs; missing paths throw because they are neither valid URLs nor existing files.
- `{ filePath: true }`: strict file mode. The path must exist on disk.
- `{ filePath: true, missingOk: true }`: caller-asserted file mode. The path may be missing; it is still converted to a `file:` URL.
- `{ filePath: false }`: URL-only mode. Regular URLs are accepted, but `file:` URLs and unparseable path strings are rejected.

#### Browser

In browser builds, `RobustURL` cannot inspect the filesystem. Auto mode accepts parseable URLs, including `file:` URLs, but it does not auto-detect plain path strings such as `/tmp/file.txt`.

```ts
import { RobustURL } from "robust-url";

new RobustURL("https://example.com/page").href;
// "https://example.com/page"

new RobustURL("file:///tmp/file.txt").href;
// "file:///tmp/file.txt"

new RobustURL("/tmp/file.txt", { filePath: true, missingOk: true }).href;
// "file:///tmp/file.txt"
```

Browser file-path modes:

- No options: URL auto mode only. Plain path strings throw because the browser cannot check the disk.
- `{ filePath: true, missingOk: true }`: caller-asserted file mode. This is the browser-safe way to convert a path string to a `file:` URL.
- `{ filePath: true }` and `{ filePath: true, missingOk: false }`: rejected because they require verifying that the file exists on disk.
- `{ filePath: false }`: URL-only mode. Regular URLs are accepted, but `file:` URLs and unparseable path strings are rejected.

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

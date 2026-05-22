import fileUriToPath from "file-uri-to-path";
import fileUrl from "file-url";
// @ts-expect-error - no bundled types
import path from "path-browserify";

export function fileURLToPath(input: string | URL): string {
  const href = typeof input === "string" ? input : input.href;
  return fileUriToPath(href);
}

export function pathToFileURL(filepath: string): URL {
  return new URL(fileUrl(filepath));
}

export { path };

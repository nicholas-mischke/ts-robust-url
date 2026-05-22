import { describe, expect, it } from "vitest";

import {
  filePathToURL,
  isFilePath,
  isFileURL,
  urlToFilePath,
} from "@src/filepath";

describe("isFilePath", () => {
  const cases: { input: unknown; expected: boolean }[] = [
    // valid — one per accepted shape
    { input: "/home/user/documents/file.txt", expected: true }, // POSIX absolute
    { input: "./relative/path.md", expected: true }, // relative
    { input: "C:\\Windows\\file.txt", expected: true }, // Windows-style
    { input: "report (v2).pdf", expected: true }, // parens/spaces ok

    // invalid — one per rejection branch
    { input: null, expected: false }, // non-string (also covers undefined)
    { input: "", expected: false }, // empty string
    { input: "/home/user/\0file.txt", expected: false }, // null byte
    { input: "https://example.com", expected: false }, // URL
    { input: "file://file.txt", expected: false }, // file:// URL
    { input: `${"a".repeat(256)}.txt`, expected: false }, // segment > 255
    { input: "a<b.txt", expected: false }, // reserved char
    { input: "CON.txt", expected: false }, // Windows reserved name
    { input: "foo.", expected: false }, // trailing dot
    { input: "foo ", expected: false }, // trailing space
  ];

  for (const { input, expected } of cases) {
    it(`returns ${expected} for ${JSON.stringify(input)}`, () => {
      expect(isFilePath(input as string)).toBe(expected);
    });
  }
});

describe("isFileURL", () => {
  const cases: { input: unknown; expected: boolean }[] = [
    // valid
    { input: new URL("file:///tmp/file.txt"), expected: true }, // URL object
    { input: "file://file.txt", expected: true }, // file:// string

    // invalid
    { input: "https://example.com", expected: false }, // non-file URL
    { input: "/home/user/file.txt", expected: false }, // file path
    { input: null, expected: false }, // non-string (also covers undefined)
    { input: "", expected: false }, // empty string
  ];

  for (const { input, expected } of cases) {
    it(`returns ${expected} for ${String(input)}`, () => {
      expect(isFileURL(input as string | URL)).toBe(expected);
    });
  }
});

describe("filePathToURL", () => {
  it("converts an absolute file path to a file:// URL", () => {
    expect(filePathToURL("/tmp/file.txt").href).toBe("file:///tmp/file.txt");
  });

  it("throws TypeError for an invalid file path", () => {
    expect(() => filePathToURL("https://example.com")).toThrow(TypeError);
  });
});

describe("urlToFilePath", () => {
  it("converts a file:// URL string to a file path", () => {
    expect(urlToFilePath("file:///tmp/file.txt")).toBe("/tmp/file.txt");
  });

  it("converts a file:// URL object to a file path", () => {
    expect(urlToFilePath(new URL("file:///tmp/file.txt"))).toBe(
      "/tmp/file.txt",
    );
  });

  it("round-trips with filePathToURL", () => {
    const original = "/tmp/file.txt";
    expect(urlToFilePath(filePathToURL(original))).toBe(original);
  });

  it.each([
    ["non-file URL", "https://example.com/file.html"],
    ["plain file path", "/tmp/file.txt"],
    ["empty string", ""],
    ["malformed URL", "not a url"],
  ])("throws TypeError for %s", (_label, input) => {
    expect(() => urlToFilePath(input)).toThrow(TypeError);
  });
});

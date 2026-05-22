import { describe, expect, it } from "vitest";

import {
  filePathToURL,
  isFilePath,
  isFileURL,
  urlToFilePath,
} from "@src/path/filepath";

describe("isFilePath", () => {
  const cases: { input: unknown; expected: boolean }[] = [
    { input: "/tmp/file.txt", expected: true },
    { input: "file:///tmp/file.txt", expected: false },
    { input: "https://example.com", expected: false },
    { input: "https://127.0.0.1:4443", expected: false },
    { input: null, expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`returns ${expected} for ${String(input)}`, () => {
      expect(isFilePath(input as string)).toBe(expected);
    });
  }
});

describe("isFileURL", () => {
  const cases: { input: unknown; expected: boolean }[] = [
    { input: "file:///tmp/file.txt", expected: true },
    { input: new URL("file:///tmp/file.txt"), expected: true },
    { input: "https://example.com", expected: false },
    { input: "/tmp/file.txt", expected: false },
    { input: null, expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`returns ${expected} for ${String(input)}`, () => {
      expect(isFileURL(input as string | URL)).toBe(expected);
    });
  }
});

describe("filePathToURL", () => {
  it("converts a file path to a file:// URL", () => {
    expect(filePathToURL("/tmp/file.txt").href).toBe("file:///tmp/file.txt");
  });

  it("throws TypeError for URL input", () => {
    expect(() => filePathToURL("https://example.com")).toThrow(TypeError);
  });
});

describe("urlToFilePath", () => {
  it("converts a file:// URL to a file path", () => {
    expect(urlToFilePath("file:///tmp/file.txt")).toBe("/tmp/file.txt");
  });

  const invalidURLs = [
    "https://example.com",
    "https://127.0.0.1:4443",
    "/tmp/file.txt",
    null,
  ];

  for (const input of invalidURLs) {
    it(`throws TypeError for ${String(input)}`, () => {
      expect(() => urlToFilePath(input as string)).toThrow(TypeError);
    });
  }
});

it("round-trips with filePathToURL", () => {
  expect(urlToFilePath(filePathToURL("/tmp/file.txt"))).toBe("/tmp/file.txt");
});

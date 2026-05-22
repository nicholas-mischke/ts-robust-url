// 3rd
import { describe, expect, it, vi } from "vitest";

// Mock `node:fs` so the literal `/fixtures/exists.txt` path used in the
// docstring examples reports as an existing file, and everything else does
// not. The hoist in vitest moves vi.mock above the local imports below.
vi.mock("node:fs", () => {
  const EXISTING = "/fixtures/exists.txt";
  return {
    default: {
      existsSync: (p: string) => p === EXISTING,
      statSync: (p: string) => ({
        isFile: () => p === EXISTING,
      }),
    },
  };
});

// local
import { RobustURL } from "@src/url/node";

const EXISTS_PATH = "/fixtures/exists.txt";
const EXISTS_URL = "file:///fixtures/exists.txt";
const MISSING_PATH = "/fixtures/does-not-exists.txt";
const MISSING_URL = "file:///fixtures/does-not-exists.txt";
const CON_PATH = "/fixtures/CON.txt";
const CON_URL = "file:///fixtures/CON.txt";
const WEB_URL = "https://example.com";
const WEB_URL_HREF = "https://example.com/";

describe("RobustURL (node)", () => {
  // missingOk is only meaningful with filePath: true. Using it without
  // filePath: true is rejected up front, before any mode runs.
  describe("misaligned options", () => {
    it("throws when missingOk is set without filePath", () => {
      expect(() => new RobustURL(WEB_URL, { missingOk: true })).toThrow(
        /missingOk requires filePath: true/,
      );
    });

    it("throws when missingOk is combined with filePath: false", () => {
      expect(
        () => new RobustURL(WEB_URL, { filePath: false, missingOk: true }),
      ).toThrow(/missingOk requires filePath: true/);
    });
  });

  // Auto: accepts any parseable URL. file: protocol (whether direct input or
  // path-string fallback) requires the file to exist on disk.
  describe("auto mode (no filePath option)", () => {
    it("accepts a webURL", () => {
      expect(new RobustURL(WEB_URL).href).toBe(WEB_URL_HREF);
    });

    it("accepts a file: URL when the file exists", () => {
      expect(new RobustURL(EXISTS_URL).href).toBe(EXISTS_URL);
    });

    it("accepts a path string when the file exists", () => {
      expect(new RobustURL(EXISTS_PATH).href).toBe(EXISTS_URL);
    });

    it("rejects a file: URL when the file does not exist", () => {
      expect(() => new RobustURL(MISSING_URL)).toThrow(/does not exist/);
    });

    it("rejects a path string when the file does not exist", () => {
      expect(() => new RobustURL(MISSING_PATH)).toThrow(
        /does not exist|neither a parseable URL nor an existing file path/,
      );
    });
  });

  // filePath: true → resolved URL must be file:. Disk check unless caller
  // asserts source-of-truth with missingOk: true.
  describe("file-path mode (filePath: true)", () => {
    it("throws for a web URL (misaligned: not a file URL)", () => {
      expect(() => new RobustURL(WEB_URL, { filePath: true })).toThrow(
        /not a file URL/,
      );
    });

    it("accepts a file: URL when the file exists", () => {
      expect(new RobustURL(EXISTS_URL, { filePath: true }).href).toBe(
        EXISTS_URL,
      );
    });

    it("rejects a file: URL when the file does not exist", () => {
      expect(() => new RobustURL(MISSING_URL, { filePath: true })).toThrow(
        /does not exist/,
      );
    });

    it("accepts a file: URL for a missing file under missingOk: true", () => {
      expect(
        new RobustURL(MISSING_URL, { filePath: true, missingOk: true }).href,
      ).toBe(MISSING_URL);
    });

    it("accepts a path string when the file exists", () => {
      expect(new RobustURL(EXISTS_PATH, { filePath: true }).href).toBe(
        EXISTS_URL,
      );
    });

    it("rejects a path string when the file does not exist", () => {
      expect(() => new RobustURL(MISSING_PATH, { filePath: true })).toThrow(
        /does not exist/,
      );
    });

    it("accepts a path string for a missing file under missingOk: true", () => {
      expect(
        new RobustURL(MISSING_PATH, { filePath: true, missingOk: true }).href,
      ).toBe(MISSING_URL);
    });

    it("warns but accepts a format-invalid path under missingOk: true", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const url = new RobustURL(CON_PATH, {
          filePath: true,
          missingOk: true,
        });
        expect(url.href).toBe(CON_URL);
        expect(warn).toHaveBeenCalledWith(
          expect.stringMatching(/failed format validation/),
        );
      } finally {
        warn.mockRestore();
      }
    });
  });

  // filePath: false → resolved URL must NOT be file:.
  describe("URL-only mode (filePath: false)", () => {
    it("accepts a webURL", () => {
      expect(new RobustURL(WEB_URL, { filePath: false }).href).toBe(
        WEB_URL_HREF,
      );
    });

    it("rejects a file: URL", () => {
      expect(() => new RobustURL(EXISTS_URL, { filePath: false })).toThrow(
        /filePath: false but/,
      );
    });

    it("rejects a path string", () => {
      expect(() => new RobustURL(EXISTS_PATH, { filePath: false })).toThrow(
        /filePath: false but/,
      );
    });
  });
});

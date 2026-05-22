// built-in
import path from "node:path";

// 3rd
import { describe, expect, it, vi } from "vitest";

// local
import { RobustURL } from "@src/url/node";

const FIXTURE = path.resolve("tests/src/url/fixtures/file.txt");
const FIXTURE_URL = new URL(`file://${FIXTURE}`).href;

const MISSING = path.resolve("tests/src/url/fixtures/does-not-exist.txt");
const MISSING_URL = new URL(`file://${MISSING}`).href;

describe("RobustURL (node)", () => {
  describe("URL inputs", () => {
    it("accepts a plain URL string", () => {
      expect(new RobustURL("https://example.com/page").href).toBe(
        "https://example.com/page",
      );
    });

    it("resolves a relative reference against a base", () => {
      expect(new RobustURL("page", "https://example.com/").href).toBe(
        "https://example.com/page",
      );
    });
  });

  describe("auto mode (no options)", () => {
    it("auto-detects an existing file path and converts to file://", () => {
      let url = new RobustURL(FIXTURE);
      expect(url.href).toBe(FIXTURE_URL);
      expect(url.isFileURL).toBe(true);
    });

    it("throws when input is neither a URL nor an existing file path", () => {
      expect(() => new RobustURL(MISSING)).toThrow(
        /neither a parseable URL nor an existing file path/,
      );
    });
  });

  describe("strict file mode  { filePath: true }", () => {
    it("accepts an existing file path", () => {
      expect(new RobustURL(FIXTURE, { filePath: true }).href).toBe(FIXTURE_URL);
    });

    it("throws when the path does not exist", () => {
      expect(() => new RobustURL(MISSING, { filePath: true })).toThrow(
        /file path does not exist on disk/,
      );
    });
  });

  describe("caller-asserted missing path mode  { filePath: true, missingOk: true }", () => {
    it("accepts a non-existent path", () => {
      expect(
        new RobustURL(MISSING, { filePath: true, missingOk: true }).href,
      ).toBe(MISSING_URL);
    });

    it("warns but accepts a malformed-looking path", () => {
      let warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        new RobustURL("/tmp/CON.txt", { filePath: true, missingOk: true });
        expect(warn).toHaveBeenCalledWith(
          expect.stringMatching(/failed format validation/),
        );
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe("no-files mode  { filePath: false }", () => {
    it("accepts a regular URL", () => {
      expect(
        new RobustURL("https://example.com/page", { filePath: false }).href,
      ).toBe("https://example.com/page");
    });

    it("rejects a file:// input", () => {
      expect(() => new RobustURL(FIXTURE_URL, { filePath: false })).toThrow(
        /filePath: false but input resolved to file URL/,
      );
    });

    it("rejects an unparseable input (no path fallback)", () => {
      expect(() => new RobustURL(MISSING, { filePath: false })).toThrow(
        /Invalid URL/,
      );
    });
  });
});

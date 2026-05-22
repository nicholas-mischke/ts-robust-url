// 3rd
import { describe, expect, it, vi } from "vitest";

// local
import { RobustURL } from "@src/url/browser";

const FILE_PATH = "/tmp/file.txt";
const FILE_URL = "file:///tmp/file.txt";
const MISSING_PATH = "/tmp/missing.txt";
const MISSING_URL = "file:///tmp/missing.txt";
const WEB_URL = "https://example.com/page";

describe("RobustURL (browser)", () => {
  // missingOk: false requests a disk check the browser cannot perform. Any
  // other missingOk value (true, omitted) is irrelevant and is stripped from
  // opts before the filePath branches run.
  describe("missingOk guard", () => {
    it("throws when missingOk is explicitly false (with filePath: true)", () => {
      expect(
        () => new RobustURL(FILE_PATH, { filePath: true, missingOk: false }),
      ).toThrow(/missingOk: false/);
    });

    it("throws when missingOk is explicitly false (with filePath: false)", () => {
      expect(
        () => new RobustURL(WEB_URL, { filePath: false, missingOk: false }),
      ).toThrow(/missingOk: false/);
    });

    it("throws when missingOk is explicitly false (no filePath option)", () => {
      expect(() => new RobustURL(WEB_URL, { missingOk: false })).toThrow(
        /missingOk: false/,
      );
    });

    it("strips missingOk: true and proceeds (auto mode)", () => {
      expect(new RobustURL(WEB_URL, { missingOk: true }).href).toBe(WEB_URL);
    });

    it("strips missingOk: true and proceeds (filePath: true)", () => {
      expect(
        new RobustURL(FILE_PATH, { filePath: true, missingOk: true }).href,
      ).toBe(FILE_URL);
    });
  });

  // Auto mode: webURL must parse on its own. Any protocol is fine (including
  // file:). If parsing required falling back to a file-URL conversion of a
  // path string, the call throws because the browser cannot verify disk.
  describe("auto mode (no filePath option)", () => {
    it("accepts a webURL", () => {
      expect(new RobustURL(WEB_URL).href).toBe(WEB_URL);
    });

    it("accepts a file: URL (any protocol that parses is OK)", () => {
      const url = new RobustURL(FILE_URL);
      expect(url.href).toBe(FILE_URL);
      expect(url.isFileURL).toBe(true);
    });

    it("accepts a URL instance", () => {
      expect(new RobustURL(new URL(WEB_URL)).href).toBe(WEB_URL);
    });

    it("resolves a relative reference against a base", () => {
      expect(new RobustURL("user", "https://example.com/page/").href).toBe(
        "https://example.com/page/user",
      );
    });

    it("treats empty options as auto mode", () => {
      expect(new RobustURL(WEB_URL, {}).href).toBe(WEB_URL);
    });

    it("rejects path strings (parser would need a fileURL fallback)", () => {
      expect(() => new RobustURL(FILE_PATH)).toThrow(/fall back to a file URL/);
    });

    it("rejects unparseable garbage", () => {
      expect(() => new RobustURL("not a url at all")).toThrow(/Invalid URL/);
    });
  });

  // filePath: true → resolvedURL (webURL ?? fileURL) must use file: protocol.
  describe("filePath: true → must resolve to file:", () => {
    it("accepts a plain path string (fileURL fallback, file: protocol)", () => {
      const url = new RobustURL(FILE_PATH, { filePath: true });
      expect(url.href).toBe(FILE_URL);
      expect(url.isFileURL).toBe(true);
    });

    it("accepts a path that may not exist", () => {
      expect(new RobustURL(MISSING_PATH, { filePath: true }).href).toBe(
        MISSING_URL,
      );
    });

    it("accepts a file: URL (webURL parses, file: protocol)", () => {
      expect(new RobustURL(FILE_URL, { filePath: true }).href).toBe(FILE_URL);
    });

    it("rejects a webURL (resolved protocol is not file:)", () => {
      expect(() => new RobustURL(WEB_URL, { filePath: true })).toThrow(
        /filePath: true but resolved URL is not a file URL/,
      );
    });

    it("resolves a relative reference against a base", () => {
      expect(
        new RobustURL("file.txt", "file:///tmp/", { filePath: true }).href,
      ).toBe("file:///tmp/file.txt");
    });

    it("warns but accepts a format-invalid path under filePath: true", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        expect(new RobustURL("/tmp/CON.txt", { filePath: true }).href).toMatch(
          /^file:\/\/\/.*CON\.txt$/,
        );
        expect(warn).toHaveBeenCalledWith(
          expect.stringMatching(/failed format validation/),
        );
      } finally {
        warn.mockRestore();
      }
    });
  });

  // filePath: false → resolvedURL (webURL ?? fileURL) must NOT use file:.
  describe("filePath: false → must NOT resolve to file:", () => {
    it("accepts a webURL", () => {
      expect(new RobustURL(WEB_URL, { filePath: false }).href).toBe(WEB_URL);
    });

    it("rejects a file: URL (webURL parses, file: protocol)", () => {
      expect(() => new RobustURL(FILE_URL, { filePath: false })).toThrow(
        /filePath: false but resolved URL is a file URL/,
      );
    });

    it("rejects a plain path string (fileURL fallback, file: protocol)", () => {
      expect(() => new RobustURL(FILE_PATH, { filePath: false })).toThrow(
        /filePath: false but resolved URL is a file URL/,
      );
    });

    it("resolves a relative reference against a base", () => {
      expect(
        new RobustURL("user", "https://example.com/page/", { filePath: false })
          .href,
      ).toBe("https://example.com/page/user");
    });

    it("rejects unparseable garbage (coerces to file URL, which is forbidden)", () => {
      expect(
        () => new RobustURL("not a url at all", { filePath: false }),
      ).toThrow(/filePath: false but resolved URL is a file URL/);
    });
  });
});

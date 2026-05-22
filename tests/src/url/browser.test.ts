// 3rd
import { describe, expect, it, vi } from "vitest";

// local
import { RobustURL } from "@src/url/browser";

const FILE_PATH = "/tmp/file.txt";
const FILE_URL = "file:///tmp/file.txt";
const MISSING_URL = "file:///tmp/missing.txt";
const WEB_URL = "https://example.com/page";

describe("RobustURL (browser)", () => {
  describe("URL inputs", () => {
    it("accepts a plain URL string", () => {
      expect(new RobustURL(WEB_URL).href).toBe(WEB_URL);
    });

    it("accepts a file URL string", () => {
      const url = new RobustURL(FILE_URL);
      expect(url.href).toBe(FILE_URL);
      expect(url.isFileURL).toBe(true);
    });

    it("resolves a relative reference against a base", () => {
      expect(new RobustURL("user", "https://example.com/page/").href).toBe(
        "https://example.com/page/user",
      );
    });
  });

  describe("auto mode (no options)", () => {
    it("rejects path strings because the browser cannot check disk", () => {
      expect(() => new RobustURL(FILE_PATH)).toThrow(
        /Browser cannot auto-detect file paths/,
      );
    });
  });

  describe("caller-asserted path mode  { filePath: true, missingOk: true }", () => {
    it("converts an asserted path to a file URL", () => {
      const url = new RobustURL(FILE_PATH, {
        filePath: true,
        missingOk: true,
      });
      expect(url.href).toBe(FILE_URL);
      expect(url.isFileURL).toBe(true);
    });

    it("accepts paths that may not exist", () => {
      expect(
        new RobustURL("/tmp/missing.txt", {
          filePath: true,
          missingOk: true,
        }).href,
      ).toBe(MISSING_URL);
    });

    it("warns but accepts a malformed-looking path", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
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

  describe("URL-only mode  { filePath: false }", () => {
    it("accepts a regular URL", () => {
      expect(new RobustURL(WEB_URL, { filePath: false }).href).toBe(WEB_URL);
    });

    it("rejects a file URL", () => {
      expect(() => new RobustURL(FILE_URL, { filePath: false })).toThrow(
        /filePath: false but input resolved to file URL/,
      );
    });

    it("rejects an unparseable string", () => {
      expect(() => new RobustURL(FILE_PATH, { filePath: false })).toThrow(
        /Invalid URL/,
      );
    });
  });

  describe("rejected file assertion modes", () => {
    it("rejects { filePath: true } because it requires a disk check", () => {
      expect(() => new RobustURL(FILE_PATH, { filePath: true })).toThrow(
        /requires verifying the file exists on disk/,
      );
    });

    it("rejects { filePath: true, missingOk: false }", () => {
      expect(
        () =>
          new RobustURL(FILE_PATH, {
            filePath: true,
            missingOk: false,
          }),
      ).toThrow(/requires verifying the file exists on disk/);
    });

    it("rejects missingOk without filePath: true", () => {
      expect(
        () =>
          new RobustURL(WEB_URL, {
            missingOk: true,
          }),
      ).toThrow(/missingOk is only valid with filePath: true/);
    });
  });
});

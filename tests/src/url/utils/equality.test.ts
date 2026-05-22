// 3rd
import { describe, expect, it, test } from "vitest";

// local
import { urlsAreEqual } from "@src/url/utils/equality";

describe("urlsAreEqual", () => {
  describe("package behavior", () => {
    test.each([
      ["https://localhost:4443/page", "https://127.0.0.1:4443/page"],
      ["https://localhost:8443/page", "https://[::1]:8443/page"],
    ])("normalizes localhost aliases for %s", (a, b) => {
      expect(urlsAreEqual(a, b)).toBe(true);
      expect(urlsAreEqual(b, a)).toBe(true);
    });

    it("does not normalize localhost aliases when disabled", () => {
      expect(
        urlsAreEqual(
          "https://localhost:4443/page",
          "https://127.0.0.1:4443/page",
          { localhost: false },
        ),
      ).toBe(false);
    });

    it("treats http and https as equal by default", () => {
      expect(
        urlsAreEqual("http://example.com/page", "https://example.com/page"),
      ).toBe(true);
    });

    it("requires matching protocols when httpOrHttps is false", () => {
      expect(
        urlsAreEqual(
          "http://example.com/page",
          "https://example.com/page",
          { httpOrHttps: false },
        ),
      ).toBe(false);
    });

    it("accepts URL objects", () => {
      expect(
        urlsAreEqual(
          new URL("https://example.com/page"),
          "https://example.com/page",
        ),
      ).toBe(true);
    });

    test.each([
      ["not a url", "https://example.com/page"],
      ["https://example.com/page", null as unknown as string],
    ])("throws TypeError for %o and %o", (a, b) => {
      expect(() => urlsAreEqual(a, b)).toThrow(TypeError);
    });
  });

  describe("normalizeURL behavior documentation", () => {
    // These document normalization behavior inherited from normalizeURL; the
    // equality wrapper behavior is covered above.
    it("compares normalized URL strings", () => {
      expect(
        urlsAreEqual(
          "https://www.example.com/page/user?z=26&a=1#hash",
          "https://example.com/page/user?a=1&z=26",
        ),
      ).toBe(true);
    });

    it("passes normalize options through", () => {
      expect(
        urlsAreEqual(
          "https://www.example.com/page",
          "https://example.com/page",
          { stripWWW: false },
        ),
      ).toBe(false);
    });
  });
});

// 3rd
import { describe, expect, it, test } from "vitest";

// local
import { equalURLStrings, equalURLs } from "@src/url/utils/equality";

describe("equalURLs", () => {
  describe("package behavior", () => {
    test.each([
      ["https://localhost:4443/page", "https://127.0.0.1:4443/page"],
      ["https://localhost:8443/page", "https://[::1]:8443/page"],
    ])("normalizes localhost aliases for %s", (a, b) => {
      expect(equalURLs(a, b)).toBe(true);
      expect(equalURLs(b, a)).toBe(true);
    });

    it("does not normalize localhost aliases when disabled", () => {
      expect(
        equalURLs(
          "https://localhost:4443/page",
          "https://127.0.0.1:4443/page",
          { localhost: false },
        ),
      ).toBe(false);
    });

    it("treats http and https as different by default", () => {
      expect(
        equalURLs("http://example.com/page", "https://example.com/page"),
      ).toBe(false);
    });

    it("treats http and https as equal when forceHttps is enabled", () => {
      expect(
        equalURLs(
          "http://example.com/page",
          "https://example.com/page",
          { forceHttps: true },
        ),
      ).toBe(true);
    });

    it("accepts URL objects", () => {
      expect(
        equalURLs(
          new URL("https://example.com/page"),
          "https://example.com/page",
        ),
      ).toBe(true);
    });

    test.each([
      ["not a url", "https://example.com/page"],
      ["https://example.com/page", null as unknown as string],
    ])("throws TypeError for %o and %o", (a, b) => {
      expect(() => equalURLs(a, b)).toThrow(TypeError);
    });
  });

  describe("normalizeURL behavior documentation", () => {
    // These document normalization behavior inherited from normalizeURL; the
    // equality wrapper behavior is covered above.
    it("compares normalized URL strings", () => {
      expect(
        equalURLs(
          "https://www.example.com/page/user?z=26&a=1#hash",
          "https://example.com/page/user?a=1&z=26",
        ),
      ).toBe(true);
    });

    it("passes normalize options through", () => {
      expect(
        equalURLs(
          "https://www.example.com/page",
          "https://example.com/page",
          { stripWWW: false },
        ),
      ).toBe(false);
    });
  });
});

describe("equalURLStrings", () => {
  it("returns true for identical strings", () => {
    expect(
      equalURLStrings("https://example.com/page", "https://example.com/page"),
    ).toBe(true);
  });

  it("returns false for differing schemes (no normalization)", () => {
    expect(
      equalURLStrings("http://example.com/page", "https://example.com/page"),
    ).toBe(false);
  });

  // Trailing-slash behavior: equalURLStrings does a raw byte comparison.
  // RobustURL#isEqualString routes through URL.href, which appends an
  // origin-level "/" — so the same two inputs compare equal there. This is
  // the key distinction between the two methods.
  it("treats origin without trailing slash as different from with (raw comparison)", () => {
    expect(
      equalURLStrings("https://example.com", "https://example.com/"),
    ).toBe(false);
  });

  it("preserves path-level trailing slash differences", () => {
    expect(
      equalURLStrings("https://example.com/path", "https://example.com/path/"),
    ).toBe(false);
  });

  it("throws TypeError when an argument is not a string", () => {
    expect(() =>
      equalURLStrings("https://example.com/", 123 as unknown as string),
    ).toThrow(TypeError);
  });

  it("throws TypeError when an argument is not a valid URL", () => {
    expect(() =>
      equalURLStrings("not a url", "https://example.com/"),
    ).toThrow(TypeError);
  });

  it("identifies both invalid arguments in the error message", () => {
    expect(() => equalURLStrings("not a url", "also not")).toThrow(
      /urlA=.*urlB=/,
    );
  });
});

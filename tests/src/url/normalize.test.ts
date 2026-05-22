// 3rd 🎉
import { describe, expect, it, test } from "vitest";

// local
import { DEFAULT_NORMALIZE_OPTIONS, normalizeURL } from "@src/url/normalize";

describe("normalizeURL", () => {
  describe("invalid input", () => {
    test.each([
      ["not a valid url"],
      [""],
      [123 as unknown as string],
      [null as unknown as string],
      [undefined as unknown as string],
      [{} as unknown as string],
      [[] as unknown as string],
    ])("throws TypeError for %s", (input) => {
      expect(() => normalizeURL(input)).toThrow(TypeError);
    });
  });

  describe("accepts URL and string inputs", () => {
    test.each<[string, string | URL]>([
      ["string input", "https://example.com/page"],
      ["URL object input", new URL("https://example.com/page")],
    ])("%s", (_label, input) => {
      expect(normalizeURL(input)).toBe("https://example.com/page");
    });
  });

  describe("query parameter handling", () => {
    test.each<[string, string, string]>([
      [
        "sorts query parameters",
        "https://example.com/page?z=1&a=2&m=3",
        "https://example.com/page?a=2&m=3&z=1",
      ],
      [
        "removes utm_ parameters",
        "https://example.com/page?utm_source=test&id=123",
        "https://example.com/page?id=123",
      ],
      [
        "removes mixed-case utm_ parameters",
        "https://example.com/page?UTM_Source=x&id=1",
        "https://example.com/page?id=1",
      ],
      [
        "produces identical output for reordered params",
        "https://example.com/page?type=article&id=123",
        "https://example.com/page?id=123&type=article",
      ],
    ])("%s", (_label, input, expected) => {
      expect(normalizeURL(input)).toBe(expected);
    });
  });

  describe("hostname / path / auth stripping", () => {
    test.each<[string, string, string]>([
      [
        "strips www",
        "https://www.example.com/page",
        "https://example.com/page",
      ],
      [
        "strips authentication",
        "https://user:pass@example.com/page",
        "https://example.com/page",
      ],
      [
        "strips hash fragments",
        "https://example.com/page#section",
        "https://example.com/page",
      ],
      [
        "removes trailing slash",
        "https://example.com/page/",
        "https://example.com/page",
      ],
      [
        "preserves http protocol",
        "http://example.com/page",
        "http://example.com/page",
      ],
      [
        "preserves https protocol",
        "https://example.com/page",
        "https://example.com/page",
      ],
    ])("%s", (_label, input, expected) => {
      expect(normalizeURL(input)).toBe(expected);
    });
  });

  describe("localhost normalization", () => {
    const port = "8080";
    const pathname = "/status";

    test.each(["127.0.0.1", "[::1]", "[::ffff:127.0.0.1]"])(
      "rewrites %s to 'localhost' by default",
      (host) => {
        const input = `http://${host}:${port}${pathname}`;
        expect(normalizeURL(input)).toBe(`http://localhost:${port}${pathname}`);
      },
    );

    test.each(["127.0.0.1", "[::1]"])(
      "leaves %s untouched when localhost is false",
      (host) => {
        const input = `http://${host}:${port}${pathname}`;
        expect(normalizeURL(input, { localhost: false })).toBe(input);
      },
    );

    test.each(["127.0.0.1", "[::1]"])(
      "leaves %s untouched when localhost is null",
      (host) => {
        const input = `http://${host}:${port}${pathname}`;
        expect(normalizeURL(input, { localhost: null })).toBe(input);
      },
    );

    it("rewrites to a custom localhost label", () => {
      const input = `http://127.0.0.1:${port}${pathname}`;
      expect(normalizeURL(input, { localhost: "my-host" })).toBe(
        `http://my-host:${port}${pathname}`,
      );
    });

    it("does not rewrite non-loopback hosts", () => {
      const input = "http://example.com:8080/status";
      expect(normalizeURL(input)).toBe(input);
    });
  });

  describe("option overrides", () => {
    it("respects stripWWW: false override", () => {
      expect(
        normalizeURL("https://www.example.com/page", { stripWWW: false }),
      ).toBe("https://www.example.com/page");
    });

    it("respects sortQueryParameters: false override", () => {
      expect(
        normalizeURL("https://example.com/page?z=1&a=2", {
          sortQueryParameters: false,
        }),
      ).toBe("https://example.com/page?z=1&a=2");
    });

    it("respects stripHash: false override", () => {
      expect(
        normalizeURL("https://example.com/page#frag", { stripHash: false }),
      ).toBe("https://example.com/page#frag");
    });
  });

  describe("DEFAULT_NORMALIZE_OPTIONS", () => {
    test.each<[string, unknown]>([
      ["defaultProtocol", "https"],
      ["stripWWW", true],
      ["stripHash", true],
      ["stripAuthentication", true],
      ["sortQueryParameters", true],
      ["removeTrailingSlash", true],
      ["localhost", "localhost"],
    ])("has %s = %s", (key, expected) => {
      expect(
        DEFAULT_NORMALIZE_OPTIONS[
          key as keyof typeof DEFAULT_NORMALIZE_OPTIONS
        ],
      ).toBe(expected);
    });
  });

  it("returns a string", () => {
    expect(typeof normalizeURL("https://example.com/page")).toBe("string");
  });
});

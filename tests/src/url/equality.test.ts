// 3rd 🎉
import { describe, expect, it, test } from "vitest";

// local
import { urlsAreEqual } from "@src/url/equality";

describe("urlsAreEqual", () => {
  describe("invalid input", () => {
    test.each<[string, unknown, unknown]>([
      ["both invalid", "not a url", "also not a url"],
      ["left invalid", "not a url", "https://example.com"],
      ["right invalid", "https://example.com", "not a url"],
      ["null left", null, "https://example.com"],
      ["undefined right", "https://example.com", undefined],
    ])("throws TypeError when %s", (_label, a, b) => {
      expect(() =>
        urlsAreEqual(a as string, b as string),
      ).toThrow(TypeError);
    });
  });

  describe("equal URLs (default options)", () => {
    test.each<[string, string | URL, string | URL]>([
      [
        "identical strings",
        "https://example.com/page",
        "https://example.com/page",
      ],
      [
        "reordered query params",
        "https://example.com/page?id=123&type=article",
        "https://example.com/page?type=article&id=123",
      ],
      [
        "utm_ params stripped on one side",
        "https://example.com/page?utm_source=x&id=1",
        "https://example.com/page?id=1",
      ],
      [
        "www stripped",
        "https://www.example.com/page",
        "https://example.com/page",
      ],
      [
        "auth stripped",
        "https://user:pass@example.com/page",
        "https://example.com/page",
      ],
      [
        "hash ignored",
        "https://example.com/page#a",
        "https://example.com/page#b",
      ],
      [
        "trailing slash ignored",
        "https://example.com/page/",
        "https://example.com/page",
      ],
      [
        "URL object vs string",
        new URL("https://example.com/page"),
        "https://example.com/page",
      ],
      [
        "http vs https (default httpOrHttps: true)",
        "http://example.com/page",
        "https://example.com/page",
      ],
    ])("%s", (_label, a, b) => {
      expect(urlsAreEqual(a, b)).toBe(true);
      expect(urlsAreEqual(b, a)).toBe(true);
    });
  });

  describe("unequal URLs (default options)", () => {
    test.each<[string, string | URL, string | URL]>([
      [
        "different paths",
        "https://example.com/page1",
        "https://example.com/page2",
      ],
      [
        "different hosts",
        "https://example.com/page",
        "https://other.com/page",
      ],
      [
        "different protocols (ws vs http)",
        "ws://example.com/page",
        "http://example.com/page",
      ],
      [
        "different query values",
        "https://example.com/page?id=1",
        "https://example.com/page?id=2",
      ],
      [
        "different ports",
        "http://example.com:8080/page",
        "http://example.com:9090/page",
      ],
    ])("%s", (_label, a, b) => {
      expect(urlsAreEqual(a, b)).toBe(false);
      expect(urlsAreEqual(b, a)).toBe(false);
    });
  });

  describe("httpOrHttps option", () => {
    const http = "http://example.com/page";
    const https = "https://example.com/page";

    it("treats http and https as equal when true (default)", () => {
      expect(urlsAreEqual(http, https)).toBe(true);
      expect(urlsAreEqual(http, https, { httpOrHttps: true })).toBe(true);
    });

    it("requires same protocol when false", () => {
      expect(urlsAreEqual(http, https, { httpOrHttps: false })).toBe(false);
      expect(urlsAreEqual(https, http, { httpOrHttps: false })).toBe(false);
    });

    it("still matches identical http when httpOrHttps is false", () => {
      expect(urlsAreEqual(http, http, { httpOrHttps: false })).toBe(true);
    });
  });

  describe("localhost loopback aliases", () => {
    const port = "8080";
    const pathname = "/status";
    const reference = `http://localhost:${port}${pathname}`;

    test.each([
      "127.0.0.1",
      "[::1]",
      "[::ffff:127.0.0.1]",
    ])("%s equals localhost", (host) => {
      const variant = `http://${host}:${port}${pathname}`;
      expect(urlsAreEqual(reference, variant)).toBe(true);
      expect(urlsAreEqual(variant, reference)).toBe(true);
    });

    it("does NOT collapse loopback when localhost is false", () => {
      expect(
        urlsAreEqual(reference, `http://127.0.0.1:${port}${pathname}`, {
          localhost: false,
        }),
      ).toBe(false);
    });
  });

  describe("normalize option passthrough", () => {
    it("stripWWW: false makes www and non-www unequal", () => {
      expect(
        urlsAreEqual(
          "https://www.example.com/page",
          "https://example.com/page",
          { stripWWW: false },
        ),
      ).toBe(false);
    });

    it("stripHash: false makes different hashes unequal", () => {
      expect(
        urlsAreEqual(
          "https://example.com/page#a",
          "https://example.com/page#b",
          { stripHash: false },
        ),
      ).toBe(false);
    });
  });

  it("returns a boolean", () => {
    expect(typeof urlsAreEqual("https://a.com", "https://a.com")).toBe(
      "boolean",
    );
  });
});

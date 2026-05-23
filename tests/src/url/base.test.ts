// 3rd
import { describe, expect, it, test } from "vitest";

// local
import { parseOptions, type ParsedOptions, RobustURL } from "@src/url/base";

type WithProtectedFields = RobustURL & {
  _fileOpts: ParsedOptions;
  _ip: string | null;
};

const makeBase = (href: string, ip: string | null = null): RobustURL => {
  const url = new RobustURL(href) as WithProtectedFields;
  url._fileOpts = null;
  url._ip = ip;
  return url;
};



describe("RobustURL ( base ) ", () => {
  describe("static", () => {
    describe("fromParts", () => {
      test.each([
        ["DNS", ["https", "example.com"] as const, "https://example.com/"],
        [
          "IPv4",
          ["https", "127.0.0.1", 4443] as const,
          "https://127.0.0.1:4443/",
        ],
        ["IPv6 bare", ["https", "::1", 8443] as const, "https://[::1]:8443/"],
        [
          "IPv6 bracketed",
          ["https", "[::1]", 8443] as const,
          "https://[::1]:8443/",
        ],
        [
          "IPv6 expanded",
          ["https", "0:0:0:0:0:0:0:1", 8443] as const,
          "https://[::1]:8443/",
        ],
      ])("builds %s URLs", (_label, args, expected) => {
        const [protocol, hostname, port] = args;
        expect(RobustURL.fromParts(protocol, hostname, port).href).toBe(
          expected,
        );
      });

      test.each([
        ["", "example.com", 443],
        ["https", "", 443],
        ["ftp", "127.0.0.1", undefined],
        ["https", "127.0.0.1", 65536],
      ] as const)("throws for invalid parts %o", (protocol, host, port) => {
        expect(() => RobustURL.fromParts(protocol, host, port)).toThrow(
          TypeError,
        );
      });

      it("encodes userinfo and rejects password-only userinfo", () => {
        expect(
          RobustURL.fromParts("https", "example.com", undefined, {
            username: "a@b",
            password: "p:w/d",
          }).href,
        ).toBe("https://a%40b:p%3Aw%2Fd@example.com/");

        expect(() =>
          RobustURL.fromParts("https", "example.com", undefined, {
            password: "secret",
          }),
        ).toThrow(/password requires a username/);
      });
    });

  });

  describe("originGlob", () => {
    it("returns an origin-scoped wildcard", () => {
      expect(new RobustURL("https://example.com/page").originGlob).toBe(
        "https://example.com/*",
      );
    });
  });

  describe("file state getters", () => {
    describe("isFileURL", () => {
      test.each([
        ["file:///tmp/file.txt", true],
        ["https://example.com/page", false],
      ])("%s -> %s", (input, expected) => {
        expect(new RobustURL(input).isFileURL).toBe(expected);
      });
    });

    describe("filePath", () => {
      test.each([
        ["file:///tmp/file.txt", "/tmp/file.txt"],
        ["https://example.com/page", null],
      ])("%s -> %s", (input, expected) => {
        expect(new RobustURL(input).filePath).toBe(expected);
      });
    });

    describe("fileURI", () => {
      test.each([
        ["file:///tmp/file.txt", "file:///tmp/file.txt"],
        ["https://example.com/page", null],
      ])("%s -> %s", (input, expected) => {
        expect(new RobustURL(input).fileURI).toBe(expected);
      });
    });
  });

  describe("ip getters", () => {
    describe("ip", () => {
      test.each([
        ["IPv4", "https://127.0.0.1:4443/page", "127.0.0.1", "127.0.0.1"],
        ["IPv6", "https://[::1]:8443/page", "[::1]", "[::1]"],
        ["DNS", "https://example.com/page", null, null],
      ])("%s", (_label, href, storedIp, expected) => {
        expect(makeBase(href, storedIp).ip).toBe(expected);
      });
    });

    describe("ipv4", () => {
      test.each([
        ["IPv4", "https://127.0.0.1:4443/page", "127.0.0.1", "127.0.0.1"],
        ["IPv6", "https://[::1]:8443/page", "[::1]", null],
        ["DNS", "https://example.com/page", null, null],
      ])("%s", (_label, href, storedIp, expected) => {
        expect(makeBase(href, storedIp).ipv4).toBe(expected);
      });
    });

    describe("ipv6", () => {
      test.each([
        ["IPv4", "https://127.0.0.1:4443/page", "127.0.0.1", null],
        ["IPv6", "https://[::1]:8443/page", "[::1]", "[::1]"],
        ["DNS", "https://example.com/page", null, null],
      ])("%s", (_label, href, storedIp, expected) => {
        expect(makeBase(href, storedIp).ipv6).toBe(expected);
      });

      test.each([
        ["::1", "[::1]"],
        ["[::1]", "[::1]"],
        ["0:0:0:0:0:0:0:1", "[::1]"],
      ])(
        "normalizes stored IPv6 _ip to bracketed form for %s",
        (storedIp, expectedIp) => {
          const url = makeBase("https://[::1]:8443/page", storedIp);
          expect(url.ip).toBe(expectedIp);
          expect(url.ipv6).toBe(expectedIp);
        },
      );
    });
  });

  describe("port", () => {
    test.each([
      ["HTTPS implied", "https://example.com/page", 443],
      ["HTTP implied", "http://example.com/page", 80],
      ["explicit IPv4", "https://127.0.0.1:4443/page", 4443],
      ["explicit IPv6", "https://[::1]:8443/page", 8443],
      ["file", "file:///tmp/file.txt", null],
    ])("%s", (_label, input, expected) => {
      expect(new RobustURL(input).port).toBe(expected);
    });
  });

  describe("authority", () => {
    test.each([
      ["https://example.com/page", "example.com"],
      ["https://user:pass@example.com/page", "user:pass@example.com"],
      ["https://127.0.0.1:4443/page", "127.0.0.1:4443"],
      ["https://[::1]:8443/page", "[::1]:8443"],
      ["file:///tmp/file.txt", null],
    ])("%s -> %s", (input, expected) => {
      expect(new RobustURL(input).authority).toBe(expected);
    });
  });

  describe("domain", () => {
    test.each([
      ["https://example.com/page", "example.com"],
      ["https://127.0.0.1:4443/page", null],
      ["https://[::1]:8443/page", null],
      ["file:///tmp/file.txt", null],
    ])("%s -> %s", (input, expected) => {
      expect(new RobustURL(input).domain).toBe(expected);
    });
  });

  describe("portHref", () => {
    test.each([
      ["https://example.com/page", "https://example.com:443/page"],
      ["http://example.com/page", "http://example.com:80/page"],
      ["https://127.0.0.1:4443/page", "https://127.0.0.1:4443/page"],
      ["https://[::1]:8443/page", "https://[::1]:8443/page"],
      ["file:///tmp/file.txt", "file:///tmp/file.txt"],
    ])("%s -> %s", (input, expected) => {
      expect(new RobustURL(input).portHref).toBe(expected);
    });
  });

  describe("normalize", () => {
    it("returns a new RobustURL", () => {
      const url = new RobustURL("https://www.example.com/page/");
      const normalized = url.normalize();
      expect(normalized).toBeInstanceOf(RobustURL);
      expect(normalized.href).toBe("https://example.com/page");
      expect(normalized).not.toBe(url);
    });
  });

  describe("isEqual", () => {
    it("compares through equalURLs", () => {
      const url = new RobustURL("http://example.com/page");
      expect(url.isEqual("https://example.com/page")).toBe(false);
      expect(
        url.isEqual("https://example.com/page", { forceHttps: true }),
      ).toBe(true);
    });
  });

  describe("isEqualString", () => {
    it("returns true for equal hrefs", () => {
      const url = new RobustURL("https://example.com/page");
      expect(url.isEqualString("https://example.com/page")).toBe(true);
    });

    it("returns false for differing schemes", () => {
      const url = new RobustURL("http://example.com/page");
      expect(url.isEqualString("https://example.com/page")).toBe(false);
    });

    // Trailing-slash behavior: both sides flow through URL.href, which adds
    // an origin-level "/" — so a host without a trailing slash compares
    // equal to the same host with one. This is the key distinction from
    // equalURLStrings, which does a raw byte comparison and returns false.
    it("treats origin without trailing slash as equal to with (URL.href normalization)", () => {
      const url = new RobustURL("https://example.com");
      expect(url.isEqualString("https://example.com/")).toBe(true);
      const url2 = new RobustURL("https://example.com/");
      expect(url2.isEqualString("https://example.com")).toBe(true);
    });

    it("preserves path-level trailing slash differences", () => {
      const url = new RobustURL("https://example.com/path");
      expect(url.isEqualString("https://example.com/path/")).toBe(false);
    });

    it("returns false rather than throwing on invalid input", () => {
      const url = new RobustURL("https://example.com/");
      expect(url.isEqualString("not a url")).toBe(false);
    });
  });

  describe("toString", () => {
    it("serializes with or without explicit default ports", () => {
      const url = new RobustURL("https://example.com/page");
      expect(url.toString()).toBe("https://example.com/page");
      expect(url.toString({ port: true })).toBe("https://example.com:443/page");
    });
  });
});

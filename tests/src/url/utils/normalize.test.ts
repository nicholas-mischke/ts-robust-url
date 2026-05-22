// 3rd
import { describe, expect, it, test } from "vitest";

// local
import {
  DEFAULT_NORMALIZE_OPTIONS,
  normalizeURL,
} from "@src/url/utils/normalize";

describe("normalizeURL", () => {
  describe("package behavior", () => {
    test.each([
      ["https://127.0.0.1:4443/page", "https://localhost:4443/page"],
      ["https://[::1]:8443/page", "https://localhost:8443/page"],
      ["https://example.com/page", "https://example.com/page"],
    ])("normalizes localhost for %s", (input, expected) => {
      expect(normalizeURL(input)).toBe(expected);
    });

    it("leaves localhost addresses untouched when disabled", () => {
      expect(
        normalizeURL("https://127.0.0.1:4443/page", {
          localhost: false,
        }),
      ).toBe("https://127.0.0.1:4443/page");
    });

    it("rewrites localhost addresses to a custom host", () => {
      expect(
        normalizeURL("https://127.0.0.1:4443/page", {
          localhost: "dev.local",
        }),
      ).toBe("https://dev.local:4443/page");
    });

    test.each(["not a url", null as unknown as string])(
      "throws TypeError for %o",
      (input) => {
        expect(() => normalizeURL(input)).toThrow(TypeError);
      },
    );

    it("accepts URL objects", () => {
      expect(normalizeURL(new URL("https://example.com/page"))).toBe(
        "https://example.com/page",
      );
    });

    it("exposes the package defaults", () => {
      expect(DEFAULT_NORMALIZE_OPTIONS).toMatchObject({
        defaultProtocol: "https",
        localhost: "localhost",
        removeExplicitPort: false,
        sortQueryParameters: true,
      });
    });
  });

  describe("normalize-url behavior documentation", () => {
    // These document the dependency behavior we rely on; the wrapper logic is
    // covered above.
    it("applies the configured normalize-url defaults", () => {
      expect(
        normalizeURL(
          "https://www.example.com/page/user?z=26&a=1&utm_source=x#hash",
        ),
      ).toBe("https://example.com/page/user?a=1&z=26");
    });

    it("passes option overrides through to normalize-url", () => {
      expect(
        normalizeURL("https://www.example.com/page/user?z=26&a=1#hash", {
          stripWWW: false,
          stripHash: false,
          sortQueryParameters: false,
        }),
      ).toBe("https://www.example.com/page/user?z=26&a=1#hash");
    });
  });
});

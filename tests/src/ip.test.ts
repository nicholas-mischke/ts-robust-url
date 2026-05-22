import { isCanonicalLocalhost, isIPv4, isIPv6, normalizeIPv6 } from "@src/ip";
import { describe, expect, test } from "vitest";

describe("isIPv4", () => {
  test.each([
    ["127.0.0.1", true],
    ["::1", false],
    ["localhost", false],
    [null, false],
  ])("%o -> %s", (input, expected) => {
    expect(isIPv4(input)).toBe(expected);
  });
});

describe("isIPv6", () => {
  test.each([
    ["[::1]", true],
    ["::1", true],
    ["127.0.0.1", false],
    ["localhost", false],
    [null, false],
  ])("%o -> %s", (input, expected) => {
    expect(isIPv6(input)).toBe(expected);
  });
});

describe("normalizeIPv6", () => {
  test.each([
    ["::1", "::1"],
    ["[::1]", "::1"],
    ["2001:0db8:0000:0000:0000:0000:0000:0001", "2001:db8::1"],
  ])("%o -> %s", (input, expected) => {
    expect(normalizeIPv6(input)).toBe(expected);
  });

  test("throws for non-IPv6 input", () => {
    expect(() => normalizeIPv6("localhost")).toThrow(/Invalid IPv6 address/);
  });
});

describe("isCanonicalLocalhost", () => {
  test.each([
    ["localhost", true],
    ["api.localhost.", true],
    ["127.0.0.1", true],
    ["[::1]", true],
    ["::ffff:7f00:1", true],
    ["127.0.0.2", false],
    ["::ffff:127.0.0.2", false],
    ["localhost.com", false],
    [null, false],
  ])("%o -> %s", (input, expected) => {
    expect(isCanonicalLocalhost(input)).toBe(expected);
  });
});

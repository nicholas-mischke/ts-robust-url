import { isCanonicalLocalhost } from "@src/ip";
import { describe, expect, test } from "vitest";

describe("isCanonicalLocalhost", () => {
  test.each([
    // Accepted (per docstring)
    ["localhost", true],
    ["foo.localhost", true],
    ["localhost.", true],
    ["127.0.0.1", true],
    ["::1", true],
    ["[::1]", true],
    ["::ffff:127.0.0.1", true],
    ["::ffff:7f00:1", true],
    // Rejected (per docstring)
    ["127.0.0.2", false],
    ["::ffff:127.0.0.2", false],
    ["localhost.com", false],
    ["localhost.evil", false],
    ["", false],
    [null, false],
    [undefined, false],
    [123, false],
  ])("%o -> %s", (input, expected) => {
    expect(isCanonicalLocalhost(input)).toBe(expected);
  });
});

import ipaddr from "ipaddr.js";

/**
 * Returns true when `value` is a valid IPv4 address.
 *
 * This is a strict IP-address check, not a hostname check. Invalid strings
 * and non-IPv4 addresses return false.
 */
export const isIPv4 = (value: string | null): boolean => {
  if (typeof value !== "string") return false;

  return ipaddr.isValid(value) && ipaddr.parse(value).kind() === "ipv4";
};

/**
 * Returns true when `value` is a valid IPv6 address.
 *
 * Accepts both bare IPv6 addresses (`::1`) and URL/Host-header bracketed IPv6
 * addresses (`[::1]`). Invalid strings and non-IPv6 addresses return false.
 */
export const isIPv6 = (value: string | null): boolean => {
  if (typeof value !== "string") return false;

  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }

  return ipaddr.isValid(value) && ipaddr.parse(value).kind() === "ipv6";
};

/**
 * Returns a normalized bare IPv6 address.
 *
 * Accepts bare or bracketed IPv6 input. The returned value is always the
 * normalized IPv6 address without brackets if `value` is valid IPv6. Throws
 * when `value` is not a valid IPv6 address.
 */
export const normalizeIPv6 = (value: string): string => {
  if (!isIPv6(value)) {
    throw new Error(`Invalid IPv6 address: ${value}`);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }

  return ipaddr.parse(value).toString();
};

/**
 * Returns a normalized, URL-safe bracketed IPv6 address.
 *
 * Accepts bare or bracketed IPv6 input. The returned value is always
 * `[<normalized-ipv6>]` suitable for URL authority segments and the
 * `RobustURL.ip` accessor.
 */
export const bracketIPv6 = (value: string): string => {
  return `[${normalizeIPv6(value)}]`;
};

const LOCALHOST_IPV4_OCTETS = [127, 0, 0, 1] as const;
const LOCALHOST_IPV6_PARTS = [0, 0, 0, 0, 0, 0, 0, 1] as const;

const isLocalhostIPv4 = (addr: ipaddr.IPv4): boolean =>
  LOCALHOST_IPV4_OCTETS.every((octet, index) => addr.octets[index] === octet);

const isLocalhostIPv6 = (addr: ipaddr.IPv6): boolean =>
  LOCALHOST_IPV6_PARTS.every((part, index) => addr.parts[index] === part);

/**
 * Returns true only for canonical localhost hostnames/addresses.
 *
 * This intentionally does NOT treat the entire IPv4 loopback range
 * (`127.0.0.0/8`) as localhost. Only canonical localhost forms are accepted.
 *
 * Accepted:
 * - "localhost"
 * - "*.localhost"
 * - "127.0.0.1"
 * - "::1"
 * - "::ffff:127.0.0.1"
 * - "::ffff:7f00:1"
 *
 * Rejected:
 * - "127.0.0.2"
 * - "::ffff:127.0.0.2"
 * - "localhost.com"
 * - "localhost.evil"
 *
 * Notes:
 * - IPv6 bracket notation like "[::1]" is supported.
 * - Trailing dots like "localhost." are normalized.
 * - Uses ipaddr.js parsing and numeric address comparisons to handle edge-case
 *   IP formats safely.
 */
export const isCanonicalLocalhost = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

  let host = value.trim().toLowerCase();
  if (!host) return false;

  // Accept fully-qualified localhost names.
  // Example: "localhost." -> "localhost"
  if (host.endsWith(".")) {
    host = host.slice(0, -1);
  }

  // Hostname localhost, including subdomains reserved under .localhost
  if (host === "localhost" || host.endsWith(".localhost")) {
    return true;
  }

  // Strip IPv6 brackets if caller passes Host-header style input: "[::1]"
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }

  if (!ipaddr.isValid(host)) {
    return false;
  }

  const addr = ipaddr.parse(host);

  if (addr.kind() === "ipv4") {
    return isLocalhostIPv4(addr as ipaddr.IPv4);
  }

  if (addr.kind() === "ipv6") {
    const ipv6Addr = addr as ipaddr.IPv6;

    if (isLocalhostIPv6(ipv6Addr)) {
      return true;
    }

    if (ipv6Addr.isIPv4MappedAddress()) {
      return isLocalhostIPv4(ipv6Addr.toIPv4Address());
    }
  }

  return false;
};

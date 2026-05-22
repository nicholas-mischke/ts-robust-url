import ipaddr from "ipaddr.js";

const parseIPAddress = (
  value: string | null,
): ipaddr.IPv4 | ipaddr.IPv6 | null => {
  if (!value) return null;

  const host =
    value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;

  return ipaddr.isValid(host) ? ipaddr.parse(host) : null;
};

export const isIPv4 = (value: string | null): boolean =>
  parseIPAddress(value)?.kind() === "ipv4";

export const isIPv6 = (value: string | null): boolean =>
  parseIPAddress(value)?.kind() === "ipv6";

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
 * - Uses ipaddr.js normalization/parsing to handle edge-case IP formats safely.
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
    return addr.toString() === "127.0.0.1";
  }

  if (addr.kind() === "ipv6") {
    if (addr.toString() === "::1") {
      return true;
    }

    const ipv6Addr = addr as ipaddr.IPv6;
    if (ipv6Addr.isIPv4MappedAddress()) {
      return ipv6Addr.toIPv4Address().toString() === "127.0.0.1";
    }
  }

  return false;
};

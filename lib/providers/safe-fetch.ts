import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const verifiedHosts = new Map<string, number>();
const HOST_CACHE_MS = 5 * 60 * 1000;

export async function safeProviderFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = requestUrl(input);
  await assertSafeProviderUrl(url);
  return fetch(input, { ...init, redirect: "error" });
}

export async function assertSafeProviderUrl(value: string | URL): Promise<void> {
  const url = typeof value === "string" ? new URL(value) : value;
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error("Provider URLs must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Provider URLs cannot contain embedded credentials.");
  }
  if (process.env.NODE_ENV !== "development" && url.protocol !== "https:") {
    throw new Error("Provider URLs must use HTTPS in production.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    if (process.env.NODE_ENV === "development") return;
    throw new Error("Provider URLs cannot target local or internal hosts.");
  }

  if (process.env.NODE_ENV === "development") return;

  const cachedUntil = verifiedHosts.get(hostname) ?? 0;
  if (cachedUntil > Date.now()) return;

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Provider URLs cannot target private or reserved IP addresses.");
    }
  } else {
    let addresses: LookupAddress[];
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("Provider hostname could not be resolved.");
    }
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new Error("Provider hostname resolves to a private or reserved IP address.");
    }
  }

  verifiedHosts.set(hostname, Date.now() + HOST_CACHE_MS);
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input);
  return new URL(input.url);
}

function isPrivateAddress(address: string): boolean {
  if (address.includes(":")) return isPrivateIpv6(address);
  return isPrivateIpv4(address);
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value))) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff")
  );
}

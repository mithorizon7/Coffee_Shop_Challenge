import type { Request } from "express";

export const PRODUCTION_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "form-action 'self' https://replit.com",
  "upgrade-insecure-requests",
].join("; ");

export function allowedHosts(raw = process.env.REPLIT_DOMAINS ?? ""): string[] {
  return raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter((host) => {
      if (!host || /[\s/@?#:]/.test(host)) return false;
      return /^[a-z0-9.-]+$/.test(host);
    });
}

export function authOriginForHost(
  host: string,
  production = process.env.NODE_ENV === "production",
  domains = allowedHosts()
): string {
  if (!host || /[\s/@?#\\]/.test(host)) throw new Error("Invalid authentication host");
  const url = new URL(`http://${host}`);
  const hostname = url.hostname.toLowerCase();
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (!domains.includes(hostname) && (production || !local)) {
    throw new Error("Authentication host is not configured");
  }
  url.protocol = !production && local ? "http:" : "https:";
  return url.origin;
}

export function isTrustedRequestOrigin(req: Request): boolean {
  if (req.get("sec-fetch-site") === "cross-site") return false;
  const host = req.get("host");
  if (!host || !["http", "https"].includes(req.protocol)) return false;
  const source = req.get("origin") || req.get("referer");
  if (!source) return false;
  try {
    const url = new URL(source);
    return (
      !url.username && !url.password && url.origin === `${req.protocol}://${host.toLowerCase()}`
    );
  } catch {
    return false;
  }
}

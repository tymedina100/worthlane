import { timingSafeEqual } from "crypto";
import { isIP } from "net";
import { NextRequest } from "next/server";
import { err } from "./response";

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Periodically prune expired entries to avoid memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

function secretsMatch(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

function trustedDesktopClientIp(req: NextRequest): string | null {
  const expectedSecret = process.env.WORTHLANE_DESKTOP_PROXY_SECRET;
  const receivedSecret = req.headers.get("x-worthlane-proxy-secret");
  if (
    !expectedSecret ||
    !receivedSecret ||
    !secretsMatch(expectedSecret, receivedSecret)
  ) {
    return null;
  }

  const clientIp = req.headers.get("x-worthlane-client-ip")?.trim();
  return clientIp && isIP(clientIp) ? clientIp : null;
}

function getIp(req: NextRequest): string {
  return (
    trustedDesktopClientIp(req) ??
    req.headers.get("x-real-ip")?.trim() ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

/**
 * Returns an error response if the request exceeds the rate limit, otherwise null.
 * @param key     Unique bucket identifier (e.g. "login:1.2.3.4")
 * @param max     Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): ReturnType<typeof err> | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (entry.count >= max) {
    return err("Too many requests. Please try again later.", 429);
  }

  entry.count++;
  return null;
}

export function ipKey(req: NextRequest, prefix: string): string {
  return `${prefix}:${getIp(req)}`;
}

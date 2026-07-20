import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { ipKey } from "./rate-limit";

const originalProxySecret = process.env.WORTHLANE_DESKTOP_PROXY_SECRET;

function request(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as NextRequest;
}

afterEach(() => {
  if (originalProxySecret === undefined) {
    delete process.env.WORTHLANE_DESKTOP_PROXY_SECRET;
  } else {
    process.env.WORTHLANE_DESKTOP_PROXY_SECRET = originalProxySecret;
  }
});

describe("ipKey", () => {
  it("prefers the platform-provided real IP over an untrusted forwarded chain", () => {
    const req = request({
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.20",
    });

    expect(ipKey(req, "register")).toBe("register:203.0.113.10");
  });

  it("accepts a valid desktop client IP when the proxy secret matches", () => {
    process.env.WORTHLANE_DESKTOP_PROXY_SECRET = "shared-test-secret";
    const req = request({
      "x-real-ip": "203.0.113.10",
      "x-worthlane-client-ip": "198.51.100.20",
      "x-worthlane-proxy-secret": "shared-test-secret",
    });

    expect(ipKey(req, "register")).toBe("register:198.51.100.20");
  });

  it("ignores desktop proxy headers when the secret does not match", () => {
    process.env.WORTHLANE_DESKTOP_PROXY_SECRET = "shared-test-secret";
    const req = request({
      "x-real-ip": "203.0.113.10",
      "x-worthlane-client-ip": "198.51.100.20",
      "x-worthlane-proxy-secret": "wrong-secret",
    });

    expect(ipKey(req, "register")).toBe("register:203.0.113.10");
  });

  it("ignores a signed desktop proxy header with an invalid IP", () => {
    process.env.WORTHLANE_DESKTOP_PROXY_SECRET = "shared-test-secret";
    const req = request({
      "x-real-ip": "203.0.113.10",
      "x-worthlane-client-ip": "not-an-ip",
      "x-worthlane-proxy-secret": "shared-test-secret",
    });

    expect(ipKey(req, "register")).toBe("register:203.0.113.10");
  });
});

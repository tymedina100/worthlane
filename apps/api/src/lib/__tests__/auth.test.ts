import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getAuthUser,
} from "../auth";
import type { NextRequest } from "next/server";

function mockRequest(authHeader?: string): NextRequest {
  return {
    headers: {
      get: (name: string) => (name === "authorization" ? (authHeader ?? null) : null),
    },
  } as unknown as NextRequest;
}

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
    await expect(verifyPassword("secret123", hash)).resolves.toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct");
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });
});

describe("signAccessToken / verifyAccessToken", () => {
  it("signs and verifies a token with correct payload", () => {
    const payload = { sub: "user-123", email: "user@example.com" };
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe("user-123");
    expect(decoded.email).toBe("user@example.com");
    expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it("throws when verifying a tampered token", () => {
    const token = signAccessToken({ sub: "user-123", email: "x@x.com" });
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe("signRefreshToken / verifyRefreshToken", () => {
  it("signs and verifies a refresh token", () => {
    const token = signRefreshToken("user-456", "session-1", "family-1");
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe("user-456");
    expect(decoded.sid).toBe("session-1");
    expect(decoded.fid).toBe("family-1");
    expect(decoded.typ).toBe("refresh");
  });
});

describe("getAuthUser", () => {
  it("extracts user payload from a valid Bearer token", () => {
    const token = signAccessToken({ sub: "user-789", email: "a@b.com" });
    const req = mockRequest(`Bearer ${token}`);
    const payload = getAuthUser(req);
    expect(payload.sub).toBe("user-789");
  });

  it("throws when Authorization header is missing", () => {
    const req = mockRequest();
    expect(() => getAuthUser(req)).toThrow();
  });

  it("throws when header is not Bearer format", () => {
    const req = mockRequest("Basic sometoken");
    expect(() => getAuthUser(req)).toThrow();
  });
});

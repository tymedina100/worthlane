import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  refreshSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@worthlane/db", () => ({ prisma: db }));

import {
  RefreshSessionError,
  createRefreshSession,
  hashRefreshToken,
  revokeRefreshSession,
  rotateRefreshSession,
  signRefreshToken,
  verifyRefreshToken,
} from "../auth";

function sessionFor(token: string) {
  const claims = verifyRefreshToken(token);
  return {
    id: claims.sid,
    userId: claims.sub,
    familyId: claims.fid,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(claims.exp * 1000),
    rotatedAt: null as Date | null,
    revokedAt: null as Date | null,
  };
}

describe("refresh session lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (callback: (client: typeof db) => unknown) =>
      callback(db)
    );
  });

  it("persists only a SHA-256 digest when a session is created", async () => {
    db.refreshSession.create.mockResolvedValue({});

    const token = await createRefreshSession("user-1");
    const stored = db.refreshSession.create.mock.calls[0]?.[0]?.data;

    expect(stored.userId).toBe("user-1");
    expect(stored.tokenHash).toBe(hashRefreshToken(token));
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyRefreshToken(token).sid).toBe(stored.id);
  });

  it("consumes a refresh token once and stores a hashed successor in the same family", async () => {
    const token = signRefreshToken("user-1", "session-1", "family-1");
    db.refreshSession.findUnique.mockResolvedValue(sessionFor(token));
    db.user.findUnique.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    db.refreshSession.updateMany.mockResolvedValue({ count: 1 });
    db.refreshSession.create.mockResolvedValue({});

    const result = await rotateRefreshSession(token);
    const nextClaims = verifyRefreshToken(result.refreshToken);
    const consumeCall = db.refreshSession.updateMany.mock.calls[0]?.[0];
    const successor = db.refreshSession.create.mock.calls[0]?.[0]?.data;

    expect(result.user).toEqual({ id: "user-1", email: "user@example.com" });
    expect(nextClaims.sid).not.toBe("session-1");
    expect(nextClaims.fid).toBe("family-1");
    expect(consumeCall.where).toMatchObject({
      id: "session-1",
      tokenHash: hashRefreshToken(token),
      rotatedAt: null,
      revokedAt: null,
    });
    expect(consumeCall.data.replacedById).toBe(nextClaims.sid);
    expect(successor.familyId).toBe("family-1");
    expect(successor.tokenHash).toBe(hashRefreshToken(result.refreshToken));
    expect(successor.tokenHash).not.toBe(result.refreshToken);
  });

  it("revokes every active successor when a rotated token is replayed", async () => {
    const token = signRefreshToken("user-1", "session-1", "family-1");
    db.refreshSession.findUnique.mockResolvedValue({
      ...sessionFor(token),
      rotatedAt: new Date(),
      revokedAt: new Date(),
    });
    db.refreshSession.updateMany.mockResolvedValue({ count: 1 });

    await expect(rotateRefreshSession(token)).rejects.toMatchObject<RefreshSessionError>({
      code: "REUSED",
    });
    expect(db.refreshSession.updateMany).toHaveBeenCalledWith({
      where: { familyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("treats a lost conditional-update race as replay and revokes the family", async () => {
    const token = signRefreshToken("user-1", "session-1", "family-1");
    db.refreshSession.findUnique.mockResolvedValue(sessionFor(token));
    db.user.findUnique.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    db.refreshSession.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(rotateRefreshSession(token)).rejects.toMatchObject<RefreshSessionError>({
      code: "REUSED",
    });
    expect(db.refreshSession.create).not.toHaveBeenCalled();
    expect(db.refreshSession.updateMany).toHaveBeenLastCalledWith({
      where: { familyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("revokes the complete session family on logout and checks the expected user", async () => {
    const token = signRefreshToken("user-1", "session-1", "family-1");
    db.refreshSession.findUnique.mockResolvedValue(sessionFor(token));
    db.refreshSession.updateMany.mockResolvedValue({ count: 2 });

    await expect(revokeRefreshSession(token, "user-1")).resolves.toBe(true);
    expect(db.refreshSession.updateMany).toHaveBeenCalledWith({
      where: { familyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });

    vi.clearAllMocks();
    await expect(revokeRefreshSession(token, "another-user")).resolves.toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

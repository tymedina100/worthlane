import { createHash, randomUUID } from "crypto";
import jwt, { type JwtPayload as JsonWebTokenPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { Prisma, prisma } from "@worthlane/db";
import type { JwtPayload } from "@worthlane/types";
import { env } from "./env";

const JWT_SECRET = env.JWT_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const REFRESH_TOKEN_TTL = "30d";

export type RefreshTokenPayload = JsonWebTokenPayload & {
  sub: string;
  sid: string;
  fid: string;
  typ: "refresh";
  exp: number;
};

export type RefreshSessionFailureCode = "INVALID" | "EXPIRED" | "REUSED";

export class RefreshSessionError extends Error {
  constructor(
    readonly code: RefreshSessionFailureCode,
    message = "Invalid or expired refresh token"
  ) {
    super(message);
    this.name = "RefreshSessionError";
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(
  userId: string,
  sessionId: string,
  familyId: string
): string {
  return jwt.sign(
    { sub: userId, sid: sessionId, fid: familyId, typ: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(
  token: string,
  options: { ignoreExpiration?: boolean } = {}
): RefreshTokenPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
    ignoreExpiration: options.ignoreExpiration ?? false,
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.sid !== "string" ||
    typeof decoded.fid !== "string" ||
    decoded.typ !== "refresh" ||
    typeof decoded.exp !== "number"
  ) {
    throw new RefreshSessionError("INVALID");
  }

  return decoded as RefreshTokenPayload;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function refreshTokenExpiry(token: string): Date {
  return new Date(verifyRefreshToken(token).exp * 1000);
}

export async function createRefreshSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  const familyId = randomUUID();
  const refreshToken = signRefreshToken(userId, sessionId, familyId);

  await prisma.refreshSession.create({
    data: {
      id: sessionId,
      userId,
      familyId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry(refreshToken),
    },
  });

  return refreshToken;
}

type RotationOutcome =
  | {
      kind: "success";
      user: { id: string; email: string };
      refreshToken: string;
    }
  | { kind: "failure"; code: RefreshSessionFailureCode };

/**
 * Consumes a refresh credential exactly once and returns its successor.
 * A conditional update is the race boundary: if another request consumed the
 * same row first, every still-active row in the family is revoked before the
 * replay error is returned.
 */
export async function rotateRefreshSession(
  presentedToken: string
): Promise<{ user: { id: string; email: string }; refreshToken: string }> {
  let claims: RefreshTokenPayload;
  try {
    claims = verifyRefreshToken(presentedToken);
  } catch {
    throw new RefreshSessionError("INVALID");
  }

  const presentedHash = hashRefreshToken(presentedToken);
  const now = new Date();

  const outcome = await prisma.$transaction<RotationOutcome>(async (tx) => {
    const session = await tx.refreshSession.findUnique({
      where: { id: claims.sid },
      select: {
        id: true,
        userId: true,
        familyId: true,
        tokenHash: true,
        expiresAt: true,
        rotatedAt: true,
        revokedAt: true,
      },
    });

    if (
      !session ||
      session.userId !== claims.sub ||
      session.familyId !== claims.fid ||
      session.tokenHash !== presentedHash
    ) {
      return { kind: "failure", code: "INVALID" };
    }

    if (session.expiresAt <= now) {
      await tx.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      return { kind: "failure", code: "EXPIRED" };
    }

    if (session.rotatedAt || session.revokedAt) {
      await tx.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      return { kind: "failure", code: "REUSED" };
    }

    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true },
    });
    if (!user) return { kind: "failure", code: "INVALID" };

    const nextSessionId = randomUUID();
    const nextRefreshToken = signRefreshToken(
      session.userId,
      nextSessionId,
      session.familyId
    );

    const consumed = await tx.refreshSession.updateMany({
      where: {
        id: session.id,
        tokenHash: presentedHash,
        rotatedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        rotatedAt: now,
        revokedAt: now,
        lastUsedAt: now,
        replacedById: nextSessionId,
      },
    });

    if (consumed.count !== 1) {
      await tx.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      return { kind: "failure", code: "REUSED" };
    }

    await tx.refreshSession.create({
      data: {
        id: nextSessionId,
        userId: session.userId,
        familyId: session.familyId,
        tokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt: refreshTokenExpiry(nextRefreshToken),
      },
    });

    return { kind: "success", user, refreshToken: nextRefreshToken };
  });

  if (outcome.kind === "failure") {
    throw new RefreshSessionError(outcome.code);
  }

  return { user: outcome.user, refreshToken: outcome.refreshToken };
}

/** Revokes the full device/session family represented by a refresh token. */
export async function revokeRefreshSession(
  presentedToken: string,
  expectedUserId?: string
): Promise<boolean> {
  let claims: RefreshTokenPayload;
  try {
    // Logout must remain possible after the JWT's access window has elapsed.
    claims = verifyRefreshToken(presentedToken, { ignoreExpiration: true });
  } catch {
    return false;
  }

  if (expectedUserId && claims.sub !== expectedUserId) return false;
  const presentedHash = hashRefreshToken(presentedToken);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.refreshSession.findUnique({
      where: { id: claims.sid },
      select: { userId: true, familyId: true, tokenHash: true },
    });

    if (
      !session ||
      session.userId !== claims.sub ||
      session.familyId !== claims.fid ||
      session.tokenHash !== presentedHash
    ) {
      return false;
    }

    await tx.refreshSession.updateMany({
      where: { familyId: session.familyId, revokedAt: null },
      data: { revokedAt: now },
    });
    return true;
  });
}

export function revokeAllUserSessions(
  userId: string,
  client: Pick<Prisma.TransactionClient, "refreshSession"> = prisma
) {
  return client.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function getAuthUser(req: NextRequest): JwtPayload {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

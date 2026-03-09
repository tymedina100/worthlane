import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma, mockGenerateNudges } = vi.hoisted(() => {
  const mockPrisma = {
    user: { findMany: vi.fn() },
  };
  const mockGenerateNudges = vi.fn();
  return { mockPrisma, mockGenerateNudges };
});

vi.mock("@finance/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/nudge-engine", () => ({
  generateNudgesForUser: mockGenerateNudges,
}));

import { GET } from "../nudges/route";

const SECRET = "test-cron-secret";

function makeReq(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/nudges", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/nudges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });

  it("returns 401 when authorization header is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is wrong", async () => {
    const res = await GET(makeReq("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("calls generateNudgesForUser for each user with a push token", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ]);
    mockGenerateNudges.mockResolvedValue(undefined);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as { data: { processed: number; failed: number } };

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ processed: 2, failed: 0 });
    expect(mockGenerateNudges).toHaveBeenCalledTimes(2);
    expect(mockGenerateNudges).toHaveBeenCalledWith("user-1");
    expect(mockGenerateNudges).toHaveBeenCalledWith("user-2");
  });

  it("increments failed count when generateNudgesForUser throws, and continues processing remaining users", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
      { id: "user-3" },
    ]);
    mockGenerateNudges
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce(undefined);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as { data: { processed: number; failed: number } };

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ processed: 2, failed: 1 });
    expect(mockGenerateNudges).toHaveBeenCalledTimes(3);
  });

  it("returns processed:0 when no users have push tokens", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as { data: { processed: number; failed: number } };

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ processed: 0, failed: 0 });
    expect(mockGenerateNudges).not.toHaveBeenCalled();
  });
});

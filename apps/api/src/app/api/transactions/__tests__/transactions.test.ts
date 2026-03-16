import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma, mockGetAuthUser } = vi.hoisted(() => {
  const mockPrisma = {
    transaction: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    account: { findFirst: vi.fn() },
  };
  const mockGetAuthUser = vi.fn();
  return { mockPrisma, mockGetAuthUser };
});

vi.mock("@finance/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ getAuthUser: mockGetAuthUser }));

import { GET, POST } from "../route";

const USER_ID = "user-123";

function makeReq(method: string, url: string, body?: object) {
  return new NextRequest(url, {
    method,
    headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeTx(overrides = {}) {
  return {
    id: "tx-1",
    userId: USER_ID,
    accountId: "acc-1",
    amount: "25.00",
    date: new Date("2026-03-10"),
    merchantName: "Starbucks",
    isImpulse: false,
    isManual: false,
    categoryId: "cat-1",
    category: { id: "cat-1", name: "Food", icon: "🍔", color: "#34D399", isSystem: true },
    account: { id: "acc-1", name: "Checking" },
    ...overrides,
  };
}

describe("GET /api/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockImplementation(() => { throw new Error("Unauthorized"); });
    const res = await GET(makeReq("GET", "http://localhost/api/transactions"));
    expect(res.status).toBe(401);
  });

  it("returns paginated transactions", async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([makeTx()]);
    mockPrisma.transaction.count.mockResolvedValue(1);

    const res = await GET(makeReq("GET", "http://localhost/api/transactions?page=1&limit=50"));
    const body = await res.json() as { data: any };

    expect(res.status).toBe(200);
    expect(body.data.transactions).toHaveLength(1);
    expect(body.data.total).toBe(1);
    expect(body.data.page).toBe(1);
  });

  it("filters by categoryId when provided", async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);

    await GET(makeReq("GET", "http://localhost/api/transactions?categoryId=cat-1"));

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: "cat-1" }),
      })
    );
  });

  it("filters by search query when provided", async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);

    await GET(makeReq("GET", "http://localhost/api/transactions?search=starbucks"));

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          merchantName: { contains: "starbucks", mode: "insensitive" },
        }),
      })
    );
  });

  it("filters by date range when from/to provided", async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);

    await GET(makeReq("GET", "http://localhost/api/transactions?from=2026-03-01&to=2026-03-31"));

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: expect.any(Object) }),
      })
    );
  });
});

describe("POST /api/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
    mockPrisma.account.findFirst.mockResolvedValue({ id: "acc-1", userId: USER_ID });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockImplementation(() => { throw new Error("Unauthorized"); });
    const res = await POST(makeReq("POST", "http://localhost/api/transactions", {
      accountId: "acc-1",
      amount: 25,
      date: "2026-03-10T00:00:00.000Z",
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeReq("POST", "http://localhost/api/transactions", {
      accountId: "acc-1",
      // missing amount and date
    }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when account not found", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);
    const res = await POST(makeReq("POST", "http://localhost/api/transactions", {
      accountId: "nonexistent",
      amount: 25,
      date: "2026-03-10T00:00:00.000Z",
    }));
    expect(res.status).toBe(404);
  });

  it("creates and returns a transaction", async () => {
    const tx = makeTx();
    mockPrisma.transaction.create.mockResolvedValue(tx);

    const res = await POST(makeReq("POST", "http://localhost/api/transactions", {
      accountId: "acc-1",
      amount: 25,
      date: "2026-03-10T00:00:00.000Z",
      merchantName: "Starbucks",
    }));
    const body = await res.json() as { data: any };

    expect(res.status).toBe(201);
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID, isManual: true }),
      })
    );
    expect(body.data.id).toBe("tx-1");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma, mockGetAuthUser } = vi.hoisted(() => {
  const mockPrisma = {
    budget: { findMany: vi.fn(), upsert: vi.fn() },
    transaction: { aggregate: vi.fn() },
    budgetPeriod: { findMany: vi.fn(), upsert: vi.fn() },
  };
  const mockGetAuthUser = vi.fn();
  return { mockPrisma, mockGetAuthUser };
});

vi.mock("@finance/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ getAuthUser: mockGetAuthUser }));

import { GET, POST } from "../route";

const USER_ID = "user-123";

function makeReq(method: string, body?: object, url = "http://localhost/api/budgets") {
  return new NextRequest(url, {
    method,
    headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCategory(overrides = {}) {
  return {
    id: "cat-1",
    name: "Food",
    icon: "🍔",
    color: "#34D399",
    isSystem: true,
    userId: null,
    ...overrides,
  };
}

function makeBudget(overrides = {}) {
  return {
    id: "budget-1",
    userId: USER_ID,
    categoryId: "cat-1",
    amount: { toNumber: () => 500, toString: () => "500" },
    period: "MONTHLY",
    rollover: false,
    category: makeCategory(),
    ...overrides,
  };
}

describe("GET /api/budgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    mockPrisma.budgetPeriod.findMany.mockResolvedValue([]);
    mockPrisma.budgetPeriod.upsert.mockResolvedValue({});
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockImplementation(() => { throw new Error("Unauthorized"); });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns empty array when user has no budgets", async () => {
    const res = await GET(makeReq("GET"));
    const body = await res.json() as { data: any };
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns budgets with calculated spent and history", async () => {
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget()]);
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: "120.00" } }) // current spent
      .mockResolvedValueOnce({ _sum: { amount: "300.00" } }); // prev spent
    mockPrisma.budgetPeriod.findMany.mockResolvedValue([
      { startDate: new Date("2026-02-01"), spent: "300.00" },
    ]);

    const res = await GET(makeReq("GET"));
    const body = await res.json() as { data: any };

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "budget-1",
      categoryName: "Food",
      amount: 500,
      spent: 120,
      remaining: 380,
    });
    expect(body.data[0].history).toHaveLength(1);
    expect(body.data[0].history[0].spent).toBe(300);
  });

  it("upserts previous month BudgetPeriod on each GET", async () => {
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget()]);
    mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    mockPrisma.budgetPeriod.findMany.mockResolvedValue([]);

    await GET(makeReq("GET"));

    expect(mockPrisma.budgetPeriod.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/budgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockImplementation(() => { throw new Error("Unauthorized"); });
    const res = await POST(makeReq("POST", { categoryId: "cat-1", amount: 500 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeReq("POST", { amount: -50 }));
    expect(res.status).toBe(400);
  });

  it("creates or upserts a budget", async () => {
    const budget = makeBudget();
    mockPrisma.budget.upsert.mockResolvedValue(budget);

    const res = await POST(makeReq("POST", { categoryId: "cat-1", amount: 500 }));
    const body = await res.json() as { data: any };

    expect(res.status).toBe(201);
    expect(mockPrisma.budget.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_categoryId: { userId: USER_ID, categoryId: "cat-1" } },
      })
    );
    expect(body.data.id).toBe("budget-1");
  });
});

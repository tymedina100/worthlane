import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma, mockGetAuthUser } = vi.hoisted(() => {
  const mockPrisma = {
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    budget: { findFirst: vi.fn() },
    transaction: { findFirst: vi.fn() },
  };
  const mockGetAuthUser = vi.fn();
  return { mockPrisma, mockGetAuthUser };
});

vi.mock("@worthlane/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ getAuthUser: mockGetAuthUser }));

import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[id]/route";

const USER_ID = "user-123";

function makeReq(method: string, url: string, body?: object) {
  return new NextRequest(url, {
    method,
    headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCategory(overrides = {}) {
  return {
    id: "cat-1",
    name: "Gym",
    icon: "💪",
    color: "#34D399",
    isSystem: false,
    userId: USER_ID,
    ...overrides,
  };
}

describe("GET /api/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockImplementation(() => { throw new Error("Unauthorized"); });
    const res = await GET(makeReq("GET", "http://localhost/api/categories"));
    expect(res.status).toBe(401);
  });

  it("returns system + user categories", async () => {
    const system = makeCategory({ id: "sys-1", name: "Food", isSystem: true, userId: null });
    const user = makeCategory({ id: "user-1", name: "Gym" });
    mockPrisma.category.findMany.mockResolvedValue([system, user]);

    const res = await GET(makeReq("GET", "http://localhost/api/categories"));
    const body = await res.json() as { data: any };

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ isSystem: true }, { userId: USER_ID }] },
      })
    );
  });
});

describe("POST /api/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
    mockPrisma.category.findUnique.mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockImplementation(() => { throw new Error("Unauthorized"); });
    const res = await POST(makeReq("POST", "http://localhost/api/categories", { name: "Gym", icon: "💪", color: "#34D399" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeReq("POST", "http://localhost/api/categories", { name: "", icon: "💪", color: "#34D399" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid color format", async () => {
    const res = await POST(makeReq("POST", "http://localhost/api/categories", { name: "Gym", icon: "💪", color: "notacolor" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate name", async () => {
    mockPrisma.category.findUnique.mockResolvedValue(makeCategory());
    const res = await POST(makeReq("POST", "http://localhost/api/categories", { name: "Gym", icon: "💪", color: "#34D399" }));
    expect(res.status).toBe(409);
  });

  it("creates and returns new category", async () => {
    const newCat = makeCategory({ id: "new-1" });
    mockPrisma.category.create.mockResolvedValue(newCat);

    const res = await POST(makeReq("POST", "http://localhost/api/categories", { name: "Gym", icon: "💪", color: "#34D399" }));
    const body = await res.json() as { data: any };

    expect(res.status).toBe(201);
    expect(mockPrisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Gym", isSystem: false, userId: USER_ID }),
      })
    );
    expect(body.data.id).toBe("new-1");
  });
});

describe("PATCH /api/categories/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
    mockPrisma.category.findUnique.mockResolvedValue(makeCategory());
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockImplementation(() => { throw new Error("Unauthorized"); });
    const res = await PATCH(makeReq("PATCH", "http://localhost/api/categories/cat-1", { name: "Updated" }), { params: { id: "cat-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when editing a system category", async () => {
    mockPrisma.category.findUnique.mockResolvedValue(makeCategory({ isSystem: true, userId: null }));
    const res = await PATCH(makeReq("PATCH", "http://localhost/api/categories/cat-1", { name: "Updated" }), { params: { id: "cat-1" } });
    expect(res.status).toBe(403);
  });

  it("returns 404 when category belongs to another user", async () => {
    mockPrisma.category.findUnique.mockResolvedValue(makeCategory({ userId: "other-user" }));
    const res = await PATCH(makeReq("PATCH", "http://localhost/api/categories/cat-1", { name: "Updated" }), { params: { id: "cat-1" } });
    expect(res.status).toBe(404);
  });

  it("updates and returns the category", async () => {
    const updated = makeCategory({ name: "Updated" });
    mockPrisma.category.findUnique
      .mockResolvedValueOnce(makeCategory()) // ownership check
      .mockResolvedValueOnce(null); // duplicate name check
    mockPrisma.category.update.mockResolvedValue(updated);

    const res = await PATCH(makeReq("PATCH", "http://localhost/api/categories/cat-1", { name: "Updated" }), { params: { id: "cat-1" } });
    const body = await res.json() as { data: any };

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Updated");
  });
});

describe("DELETE /api/categories/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: USER_ID, email: "user@test.com" });
    mockPrisma.category.findUnique.mockResolvedValue(makeCategory());
    mockPrisma.budget.findFirst.mockResolvedValue(null);
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
  });

  it("returns 403 when deleting a system category", async () => {
    mockPrisma.category.findUnique.mockResolvedValue(makeCategory({ isSystem: true, userId: null }));
    const res = await DELETE(makeReq("DELETE", "http://localhost/api/categories/cat-1"), { params: { id: "cat-1" } });
    expect(res.status).toBe(403);
  });

  it("returns 400 when category is in use by a budget", async () => {
    mockPrisma.budget.findFirst.mockResolvedValue({ id: "budget-1" });
    const res = await DELETE(makeReq("DELETE", "http://localhost/api/categories/cat-1"), { params: { id: "cat-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 when category is in use by a transaction", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({ id: "tx-1" });
    const res = await DELETE(makeReq("DELETE", "http://localhost/api/categories/cat-1"), { params: { id: "cat-1" } });
    expect(res.status).toBe(400);
  });

  it("deletes and returns confirmation", async () => {
    mockPrisma.category.delete.mockResolvedValue({});
    const res = await DELETE(makeReq("DELETE", "http://localhost/api/categories/cat-1"), { params: { id: "cat-1" } });
    const body = await res.json() as { data: any };

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
  });
});

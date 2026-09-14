import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@worthlane/db", () => ({ prisma: { $queryRaw: query } }));
import { GET } from "../route";

describe("deployment readiness", () => {
  beforeEach(() => vi.resetAllMocks());

  it("checks the database again after a successful request", async () => {
    query.mockResolvedValueOnce([{ "?column?": 1 }])
      .mockRejectedValueOnce(new Error("database unavailable"));
    const ready = await GET();
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ data: { status: "ready" } });
    expect(ready.headers.get("Cache-Control")).toBe("no-store");
    expect((await GET()).status).toBe(503);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("fails closed without exposing database error details and recovers", async () => {
    query.mockRejectedValueOnce(new Error("postgres://private-host credential detail"))
      .mockResolvedValueOnce([{ "?column?": 1 }]);
    const unavailable = await GET();
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Cache-Control")).toBe("no-store");
    expect(await unavailable.json()).toEqual({ error: {
      message: "Service unavailable", code: "NOT_READY",
    } });
    expect((await GET()).status).toBe(200);
  });
});

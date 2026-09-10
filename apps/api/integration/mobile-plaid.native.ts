import { describe, expect, it, vi } from "vitest";
import { completePlaidLink } from "../../mobile/src/lib/plaid-completion";
describe("mobile Link completion", () => {
  it("syncs the existing Item after update without a public token", async () => {
    const post = vi.fn().mockResolvedValue({});
    expect(await completePlaidLink({ mode: "update", plaidItemId: "owned-item", publicToken: null, isCurrentUser: () => true, post })).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/plaid/sync", { plaidItemId: "owned-item", refresh: true });
  });
  it("exchanges a new connection only with a public token", async () => {
    const post = vi.fn().mockResolvedValue({});
    await completePlaidLink({ mode: "create", publicToken: "synthetic", institutionName: "Sandbox", isCurrentUser: () => true, post });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/plaid/exchange", { publicToken: "synthetic", institutionName: "Sandbox" });
    post.mockClear();
    await expect(completePlaidLink({ mode: "create", isCurrentUser: () => true, post })).rejects.toThrow("token");
    expect(post).not.toHaveBeenCalled();
  });
  it("does not act on a stale session or missing update Item", async () => {
    const post = vi.fn();
    await expect(completePlaidLink({ mode: "create", publicToken: "synthetic", isCurrentUser: () => false, post })).rejects.toThrow("session");
    await expect(completePlaidLink({ mode: "update", isCurrentUser: () => true, post })).rejects.toThrow("connection");
    expect(post).not.toHaveBeenCalled();
  });
  it("suppresses publication after a session changes during the request", async () => {
    let current = true;
    const post = vi.fn(async () => { current = false; });
    expect(await completePlaidLink({ mode: "update", plaidItemId: "owned-item", isCurrentUser: () => current, post })).toBe(false);
  });
});

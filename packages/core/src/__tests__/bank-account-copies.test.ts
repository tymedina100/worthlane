import { describe, expect, it } from "vitest";
import { countedBankAccountIds } from "../banking";

describe("confirmed bank account copies", () => {
  it("uses the viewer's connection regardless of input order", () => {
    const accounts = [{ id: "a", userId: "partner", bankIdentity: "joint" }, { id: "b", userId: "viewer", bankIdentity: "joint" }];
    expect([...countedBankAccountIds(accounts, "viewer")]).toEqual(["b"]);
    expect([...countedBankAccountIds([...accounts].reverse(), "viewer")]).toEqual(["b"]);
    expect([...countedBankAccountIds(accounts, "partner")]).toEqual(["a"]);
  });
  it("does not infer matches when identity is missing or different", () => {
    const accounts = [{ id: "a", userId: "viewer" }, { id: "b", userId: "viewer", bankIdentity: null }, { id: "c", userId: "viewer", bankIdentity: "one" }, { id: "d", userId: "partner", bankIdentity: "two" }];
    expect(countedBankAccountIds(accounts, "viewer").size).toBe(4);
  });
});

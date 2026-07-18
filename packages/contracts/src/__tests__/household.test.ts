import { describe, expect, it } from "vitest";
import {
  acceptHouseholdPartnerInviteSchema,
  createHouseholdGoalSchema,
  createHouseholdGoalContributionSchema,
  createHouseholdResponsibilitySchema,
  householdSummarySchema,
  linkHouseholdPartnerSchema,
  setHouseholdAccountVisibilitySchema,
} from "../household";

describe("household contribution contract", () => {
  it("accepts integer minor units and an optional note", () => {
    expect(
      createHouseholdGoalContributionSchema.parse({
        amountMinor: 12_345,
        note: "July transfer",
      })
    ).toEqual({ amountMinor: 12_345, note: "July transfer" });
  });

  it("rejects fractional, negative, and spoofed contributor fields", () => {
    expect(() =>
      createHouseholdGoalContributionSchema.parse({ amountMinor: 100.5 })
    ).toThrow();
    expect(() =>
      createHouseholdGoalContributionSchema.parse({ amountMinor: -100 })
    ).toThrow();
    expect(() =>
      createHouseholdGoalContributionSchema.parse({
        amountMinor: 100,
        memberId: "spoofed-member",
      })
    ).toThrow();
  });
});

describe("household summary privacy contract", () => {
  it("does not allow detailed summary-only account fields", () => {
    const parsed = householdSummarySchema.parse({
      household: {
        id: "household-1",
        name: "Demo household",
        timezone: "America/Phoenix",
        currency: "USD",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
      viewerMemberId: "member-1",
      members: [],
      finances: {
        scope: "VISIBLE_TO_CALLER",
        visibleNetWorthMinor: 50_000,
        detailedAccounts: [],
        summaryOnlyByOwner: [
          {
            ownerMemberId: "member-2",
            ownerName: "Rachel",
            assetsMinor: 75_000,
            liabilitiesMinor: 25_000,
            netWorthMinor: 50_000,
          },
        ],
      },
      responsibilities: [],
      sharedGoals: [],
    });

    expect(parsed.finances.summaryOnlyByOwner[0]).toEqual({
      ownerMemberId: "member-2",
      ownerName: "Rachel",
      assetsMinor: 75_000,
      liabilitiesMinor: 25_000,
      netWorthMinor: 50_000,
    });
    expect(parsed.finances.summaryOnlyByOwner[0]).not.toHaveProperty("accountId");
  });
});

describe("household management contracts", () => {
  it("accepts all three responsibility assignment modes", () => {
    const common = { name: "Housing", monthlyAmountMinor: 240_000 };
    expect(
      createHouseholdResponsibilitySchema.parse({
        ...common,
        assignment: { mode: "ASSIGNED", memberId: "member-1" },
      }).assignment.mode
    ).toBe("ASSIGNED");
    expect(
      createHouseholdResponsibilitySchema.parse({
        ...common,
        assignment: { mode: "EQUAL", memberIds: ["member-1", "member-2"] },
      }).assignment.mode
    ).toBe("EQUAL");
    expect(
      createHouseholdResponsibilitySchema.parse({
        ...common,
        assignment: {
          mode: "PERCENTAGE",
          shares: [
            { memberId: "member-1", basisPoints: 6_000 },
            { memberId: "member-2", basisPoints: 4_000 },
          ],
        },
      }).assignment.mode
    ).toBe("PERCENTAGE");
  });

  it("rejects duplicate or incomplete percentage allocations", () => {
    const common = { name: "Housing", monthlyAmountMinor: 240_000 };
    expect(() =>
      createHouseholdResponsibilitySchema.parse({
        ...common,
        assignment: {
          mode: "PERCENTAGE",
          shares: [
            { memberId: "member-1", basisPoints: 6_000 },
            { memberId: "member-2", basisPoints: 3_999 },
          ],
        },
      })
    ).toThrow();
    expect(() =>
      createHouseholdResponsibilitySchema.parse({
        ...common,
        assignment: {
          mode: "PERCENTAGE",
          shares: [
            { memberId: "member-1", basisPoints: 5_000 },
            { memberId: "member-1", basisPoints: 5_000 },
          ],
        },
      })
    ).toThrow();
  });

  it("validates equal, custom, and income-proportional goal plans", () => {
    const common = { name: "Universal Orlando", targetAmountMinor: 800_000 };
    expect(
      createHouseholdGoalSchema.parse({
        ...common,
        contributionMode: "EQUAL",
        participants: [{ memberId: "member-1" }, { memberId: "member-2" }],
      }).contributionMode
    ).toBe("EQUAL");
    expect(
      createHouseholdGoalSchema.parse({
        ...common,
        contributionMode: "INCOME_PROPORTIONAL",
        participants: [{ memberId: "member-1" }, { memberId: "member-2" }],
      }).contributionMode
    ).toBe("INCOME_PROPORTIONAL");
    expect(
      createHouseholdGoalSchema.parse({
        ...common,
        contributionMode: "CUSTOM",
        participants: [
          { memberId: "member-1", customTargetAmountMinor: 500_000 },
          { memberId: "member-2", customTargetAmountMinor: 300_000 },
        ],
      }).contributionMode
    ).toBe("CUSTOM");
  });

  it("rejects custom plans that do not equal the goal target", () => {
    expect(() =>
      createHouseholdGoalSchema.parse({
        name: "Universal Orlando",
        targetAmountMinor: 800_000,
        contributionMode: "CUSTOM",
        participants: [
          { memberId: "member-1", customTargetAmountMinor: 500_000 },
          { memberId: "member-2", customTargetAmountMinor: 299_999 },
        ],
      })
    ).toThrow();
  });

  it("keeps visibility and partner-link bodies strict", () => {
    expect(setHouseholdAccountVisibilitySchema.parse({ visibility: "SHARED" })).toEqual({
      visibility: "SHARED",
    });
    expect(() =>
      setHouseholdAccountVisibilitySchema.parse({
        visibility: "SHARED",
        accountId: "spoofed",
      })
    ).toThrow();
    expect(
      linkHouseholdPartnerSchema.parse({ email: "  RACHEL@EXAMPLE.COM  " }).email
    ).toBe("rachel@example.com");
    expect(
      acceptHouseholdPartnerInviteSchema.parse({ invitationId: "invite-1" })
    ).toEqual({ invitationId: "invite-1" });
    expect(() => acceptHouseholdPartnerInviteSchema.parse({})).toThrow();
  });
});

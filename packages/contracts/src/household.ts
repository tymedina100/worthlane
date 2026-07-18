import { z } from "zod";

const signedMinorUnitsSchema = z.number().int().safe();
const nonNegativeMinorUnitsSchema = signedMinorUnitsSchema.nonnegative();
const positiveMinorUnitsSchema = signedMinorUnitsSchema.positive();
const percentSchema = z.number().finite().min(0);
const isoDateTimeSchema = z.string().datetime();
const identifierSchema = z.string().trim().min(1).max(191);
const nameSchema = z.string().trim().min(1).max(100);

export const createHouseholdSchema = z
  .object({
    name: nameSchema,
    displayName: z.string().trim().min(1).max(80),
    timezone: z.string().trim().min(1).max(100),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
    incomeBasisMinor: positiveMinorUnitsSchema.max(999_999_999_999).optional(),
  })
  .strict();

export const createHouseholdResultSchema = z.object({
  householdId: identifierSchema,
  memberId: identifierSchema,
  name: nameSchema,
  timezone: z.string(),
  currency: z.string().length(3),
});

export const householdRoleSchema = z.enum(["OWNER", "MEMBER"]);
export const accountVisibilitySchema = z.enum(["PERSONAL", "SUMMARY", "SHARED"]);
export const responsibilityModeSchema = z.enum(["MEMBER", "EQUAL", "PERCENTAGE"]);
export const goalContributionModeSchema = z.enum([
  "EQUAL",
  "CUSTOM",
  "INCOME_PROPORTIONAL",
]);

export const householdMemberSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  role: householdRoleSchema,
  isCurrentUser: z.boolean(),
  incomeBasisMinor: nonNegativeMinorUnitsSchema.nullable(),
});

export const householdAccountSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  institutionName: z.string().nullable(),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "LOAN", "OTHER"]),
  currentBalanceMinor: signedMinorUnitsSchema,
  ownerMemberId: z.string(),
  ownerName: z.string(),
  visibility: accountVisibilitySchema,
  isOwner: z.boolean(),
  updatedAt: isoDateTimeSchema,
});

export const responsibilityAllocationSummarySchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  shareBasisPoints: z.number().int().min(0).max(10_000),
  assignedMinor: nonNegativeMinorUnitsSchema,
  appliedSpendMinor: nonNegativeMinorUnitsSchema,
  remainingMinor: signedMinorUnitsSchema,
  percentUsed: percentSchema,
});

export const householdResponsibilitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string(),
  mode: responsibilityModeSchema,
  monthlyAmountMinor: nonNegativeMinorUnitsSchema,
  allocations: z.array(responsibilityAllocationSummarySchema),
  updatedAt: isoDateTimeSchema,
});

export const householdGoalParticipantSummarySchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  plannedContributionMinor: nonNegativeMinorUnitsSchema,
  contributedAmountMinor: nonNegativeMinorUnitsSchema,
  remainingMinor: signedMinorUnitsSchema,
  percentComplete: percentSchema,
});

export const householdGoalContributionSchema = z.object({
  id: z.string(),
  memberId: z.string().nullable(),
  contributorName: z.string(),
  amountMinor: positiveMinorUnitsSchema,
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

export const householdGoalSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmountMinor: positiveMinorUnitsSchema,
  currentAmountMinor: nonNegativeMinorUnitsSchema,
  remainingMinor: signedMinorUnitsSchema,
  percentComplete: percentSchema,
  targetDate: isoDateTimeSchema.nullable(),
  icon: z.string().nullable(),
  contributionMode: goalContributionModeSchema,
  participants: z.array(householdGoalParticipantSummarySchema),
  recentContributions: z.array(householdGoalContributionSchema),
  updatedAt: isoDateTimeSchema,
});

export const householdSummarySchema = z.object({
  household: z.object({
    id: z.string(),
    name: z.string(),
    timezone: z.string(),
    currency: z.string().length(3),
    updatedAt: isoDateTimeSchema,
  }),
  viewerMemberId: z.string(),
  members: z.array(householdMemberSummarySchema),
  finances: z.object({
    scope: z.literal("VISIBLE_TO_CALLER"),
    visibleNetWorthMinor: signedMinorUnitsSchema,
    detailedAccounts: z.array(householdAccountSummarySchema),
    summaryOnlyByOwner: z.array(
      z.object({
        ownerMemberId: z.string(),
        ownerName: z.string(),
        assetsMinor: signedMinorUnitsSchema,
        liabilitiesMinor: signedMinorUnitsSchema,
        netWorthMinor: signedMinorUnitsSchema,
      })
    ),
  }),
  responsibilities: z.array(householdResponsibilitySummarySchema),
  sharedGoals: z.array(householdGoalSummarySchema),
});

export const createHouseholdGoalContributionSchema = z
  .object({
    amountMinor: positiveMinorUnitsSchema.max(999_999_999_999),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const householdGoalContributionResultSchema = z.object({
  contribution: householdGoalContributionSchema,
  goal: z.object({
    id: z.string(),
    currentAmountMinor: nonNegativeMinorUnitsSchema,
    remainingMinor: signedMinorUnitsSchema,
    percentComplete: percentSchema,
    updatedAt: isoDateTimeSchema,
  }),
});

export const setHouseholdAccountVisibilitySchema = z
  .object({
    visibility: accountVisibilitySchema,
  })
  .strict();

export const householdAccountVisibilityResultSchema = z.object({
  accountId: identifierSchema,
  visibility: accountVisibilitySchema,
  sharedWithMemberIds: z.array(identifierSchema),
  householdUpdatedAt: isoDateTimeSchema,
});

export const householdAccountTransactionSchema = z.object({
  id: identifierSchema,
  amountMinor: signedMinorUnitsSchema,
  date: isoDateTimeSchema,
  merchantName: z.string().nullable(),
  category: z
    .object({
      id: identifierSchema,
      name: z.string(),
      icon: z.string(),
      color: z.string(),
    })
    .nullable(),
  isManual: z.boolean(),
  isImpulse: z.boolean(),
  note: z.string().nullable(),
});

export const householdAccountDetailSchema = householdAccountSummarySchema.extend({
  transactions: z.array(householdAccountTransactionSchema),
});

const assignedResponsibilitySchema = z
  .object({
    mode: z.literal("ASSIGNED"),
    memberId: identifierSchema,
  })
  .strict();

const equalResponsibilitySchema = z
  .object({
    mode: z.literal("EQUAL"),
    memberIds: z.array(identifierSchema).min(1).max(20),
  })
  .strict();

const percentageResponsibilitySchema = z
  .object({
    mode: z.literal("PERCENTAGE"),
    shares: z
      .array(
        z
          .object({
            memberId: identifierSchema,
            basisPoints: z.number().int().min(1).max(10_000),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict();

export const householdResponsibilityAssignmentSchema = z
  .discriminatedUnion("mode", [
    assignedResponsibilitySchema,
    equalResponsibilitySchema,
    percentageResponsibilitySchema,
  ])
  .superRefine((assignment, ctx) => {
    const memberIds =
      assignment.mode === "ASSIGNED"
        ? [assignment.memberId]
        : assignment.mode === "EQUAL"
          ? assignment.memberIds
          : assignment.shares.map((share) => share.memberId);

    if (new Set(memberIds).size !== memberIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each household member may appear only once",
      });
    }

    if (
      assignment.mode === "PERCENTAGE" &&
      assignment.shares.reduce((total, share) => total + share.basisPoints, 0) !==
        10_000
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage shares must total 10000 basis points",
      });
    }
  });

export const createHouseholdResponsibilitySchema = z
  .object({
    name: nameSchema,
    categoryId: identifierSchema.nullable().optional(),
    monthlyAmountMinor: positiveMinorUnitsSchema.max(999_999_999_999),
    assignment: householdResponsibilityAssignmentSchema,
  })
  .strict();

export const updateHouseholdResponsibilitySchema =
  createHouseholdResponsibilitySchema;

export const deleteHouseholdResponsibilityResultSchema = z.object({
  id: identifierSchema,
  deleted: z.literal(true),
  householdUpdatedAt: isoDateTimeSchema,
});

const householdGoalCommonShape = {
  name: nameSchema,
  targetAmountMinor: positiveMinorUnitsSchema.max(999_999_999_999),
  targetDate: isoDateTimeSchema.nullable().optional(),
  icon: z.string().trim().min(1).max(32).nullable().optional(),
  type: z
    .enum(["SAVINGS", "DEBT_PAYOFF", "PURCHASE", "EMERGENCY_FUND"])
    .optional(),
};

const goalParticipantSchema = z.object({ memberId: identifierSchema }).strict();
const customGoalParticipantSchema = z
  .object({
    memberId: identifierSchema,
    customTargetAmountMinor: nonNegativeMinorUnitsSchema.max(999_999_999_999),
  })
  .strict();

export const putHouseholdGoalSchema = z
  .discriminatedUnion("contributionMode", [
    z
      .object({
        ...householdGoalCommonShape,
        contributionMode: z.literal("EQUAL"),
        participants: z.array(goalParticipantSchema).min(1).max(20),
      })
      .strict(),
    z
      .object({
        ...householdGoalCommonShape,
        contributionMode: z.literal("CUSTOM"),
        participants: z.array(customGoalParticipantSchema).min(1).max(20),
      })
      .strict(),
    z
      .object({
        ...householdGoalCommonShape,
        contributionMode: z.literal("INCOME_PROPORTIONAL"),
        participants: z.array(goalParticipantSchema).min(1).max(20),
      })
      .strict(),
  ])
  .superRefine((goal, ctx) => {
    const memberIds = goal.participants.map((participant) => participant.memberId);
    if (new Set(memberIds).size !== memberIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each goal participant may appear only once",
      });
    }

    if (
      goal.contributionMode === "CUSTOM" &&
      goal.participants.reduce(
        (total, participant) => total + participant.customTargetAmountMinor,
        0
      ) !== goal.targetAmountMinor
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom participant targets must equal the goal target",
      });
    }
  });

export const createHouseholdGoalSchema = putHouseholdGoalSchema;
export const updateHouseholdGoalSchema = putHouseholdGoalSchema;

export const linkHouseholdPartnerSchema = z
  .object({
    email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
    displayName: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const householdPartnerInviteResultSchema = z.object({
  status: z.literal("PENDING"),
  message: z.string(),
});

export const householdPartnerInvitationSummarySchema = z.object({
  id: identifierSchema,
  householdId: identifierSchema,
  householdName: z.string(),
  invitedByName: z.string(),
  invitedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
});

export const householdPartnerInvitationsSchema = z.array(
  householdPartnerInvitationSummarySchema
);

export const acceptHouseholdPartnerInviteSchema = z
  .object({ invitationId: identifierSchema })
  .strict();

export const acceptHouseholdPartnerInviteResultSchema = z.object({
  member: householdMemberSummarySchema,
  householdUpdatedAt: isoDateTimeSchema,
});

export const setHouseholdIncomeBasesSchema = z
  .object({
    members: z
      .array(
        z
          .object({
            memberId: identifierSchema,
            incomeBasisMinor: positiveMinorUnitsSchema.max(999_999_999_999),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    const memberIds = value.members.map((member) => member.memberId);
    if (new Set(memberIds).size !== memberIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each household member may appear only once",
      });
    }
  });

export const setHouseholdIncomeBasesResultSchema = z.object({
  members: z.array(
    z.object({
      memberId: identifierSchema,
      incomeBasisMinor: positiveMinorUnitsSchema,
    })
  ),
  householdUpdatedAt: isoDateTimeSchema,
});

export type HouseholdRole = z.infer<typeof householdRoleSchema>;
export type CreateHousehold = z.infer<typeof createHouseholdSchema>;
export type CreateHouseholdResult = z.infer<typeof createHouseholdResultSchema>;
export type AccountVisibility = z.infer<typeof accountVisibilitySchema>;
export type ResponsibilityMode = z.infer<typeof responsibilityModeSchema>;
export type GoalContributionMode = z.infer<typeof goalContributionModeSchema>;
export type HouseholdSummary = z.infer<typeof householdSummarySchema>;
export type CreateHouseholdGoalContribution = z.infer<
  typeof createHouseholdGoalContributionSchema
>;
export type HouseholdGoalContributionResult = z.infer<
  typeof householdGoalContributionResultSchema
>;
export type SetHouseholdAccountVisibility = z.infer<
  typeof setHouseholdAccountVisibilitySchema
>;
export type HouseholdAccountVisibilityResult = z.infer<
  typeof householdAccountVisibilityResultSchema
>;
export type HouseholdAccountDetail = z.infer<typeof householdAccountDetailSchema>;
export type HouseholdResponsibilityAssignment = z.infer<
  typeof householdResponsibilityAssignmentSchema
>;
export type CreateHouseholdResponsibility = z.infer<
  typeof createHouseholdResponsibilitySchema
>;
export type UpdateHouseholdResponsibility = z.infer<
  typeof updateHouseholdResponsibilitySchema
>;
export type PutHouseholdGoal = z.infer<typeof putHouseholdGoalSchema>;
export type CreateHouseholdGoal = z.infer<typeof createHouseholdGoalSchema>;
export type UpdateHouseholdGoal = z.infer<typeof updateHouseholdGoalSchema>;
export type LinkHouseholdPartner = z.infer<typeof linkHouseholdPartnerSchema>;
export type HouseholdPartnerInviteResult = z.infer<
  typeof householdPartnerInviteResultSchema
>;
export type HouseholdPartnerInvitationSummary = z.infer<
  typeof householdPartnerInvitationSummarySchema
>;
export type AcceptHouseholdPartnerInviteResult = z.infer<
  typeof acceptHouseholdPartnerInviteResultSchema
>;
export type SetHouseholdIncomeBases = z.infer<
  typeof setHouseholdIncomeBasesSchema
>;
export type SetHouseholdIncomeBasesResult = z.infer<
  typeof setHouseholdIncomeBasesResultSchema
>;

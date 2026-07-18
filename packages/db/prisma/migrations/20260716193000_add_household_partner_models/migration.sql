-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "HouseholdMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "AccountVisibility" AS ENUM ('PERSONAL', 'SUMMARY', 'SHARED');

-- CreateEnum
CREATE TYPE "ResponsibilityMode" AS ENUM ('MEMBER', 'EQUAL', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "GoalContributionMode" AS ENUM ('EQUAL', 'CUSTOM', 'INCOME_PROPORTIONAL');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'MEMBER',
    "status" "HouseholdMemberStatus" NOT NULL DEFAULT 'INVITED',
    "incomeBasis" DECIMAL(12,2),
    "joinedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdAccountAccess" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "visibility" "AccountVisibility" NOT NULL DEFAULT 'PERSONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdAccountAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdResponsibility" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "categoryId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyAmount" DECIMAL(12,2) NOT NULL,
    "mode" "ResponsibilityMode" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdResponsibilityAllocation" (
    "id" TEXT NOT NULL,
    "responsibilityId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "shareBasisPoints" INTEGER,

    CONSTRAINT "HouseholdResponsibilityAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdGoal" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "type" "GoalType" NOT NULL DEFAULT 'SAVINGS',
    "icon" TEXT,
    "contributionMode" "GoalContributionMode" NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdGoalParticipant" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "customTargetAmount" DECIMAL(12,2),

    CONSTRAINT "HouseholdGoalParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdGoalContribution" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "memberId" TEXT,
    "contributorName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdGoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Household_slug_key" ON "Household"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_userId_key" ON "HouseholdMember"("householdId", "userId");
CREATE INDEX "HouseholdMember_userId_status_idx" ON "HouseholdMember"("userId", "status");
CREATE INDEX "HouseholdMember_householdId_status_idx" ON "HouseholdMember"("householdId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdAccountAccess_accountId_memberId_key" ON "HouseholdAccountAccess"("accountId", "memberId");
CREATE INDEX "HouseholdAccountAccess_householdId_memberId_visibility_idx" ON "HouseholdAccountAccess"("householdId", "memberId", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdResponsibility_householdId_slug_key" ON "HouseholdResponsibility"("householdId", "slug");
CREATE INDEX "HouseholdResponsibility_householdId_isActive_idx" ON "HouseholdResponsibility"("householdId", "isActive");
CREATE INDEX "HouseholdResponsibility_categoryId_idx" ON "HouseholdResponsibility"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdResponsibilityAllocation_responsibilityId_memberId_key" ON "HouseholdResponsibilityAllocation"("responsibilityId", "memberId");
CREATE INDEX "HouseholdResponsibilityAllocation_memberId_idx" ON "HouseholdResponsibilityAllocation"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdGoal_householdId_slug_key" ON "HouseholdGoal"("householdId", "slug");
CREATE INDEX "HouseholdGoal_householdId_isArchived_idx" ON "HouseholdGoal"("householdId", "isArchived");
CREATE INDEX "HouseholdGoal_householdId_targetDate_idx" ON "HouseholdGoal"("householdId", "targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdGoalParticipant_goalId_memberId_key" ON "HouseholdGoalParticipant"("goalId", "memberId");
CREATE INDEX "HouseholdGoalParticipant_memberId_idx" ON "HouseholdGoalParticipant"("memberId");

-- CreateIndex
CREATE INDEX "HouseholdGoalContribution_goalId_createdAt_idx" ON "HouseholdGoalContribution"("goalId", "createdAt");
CREATE INDEX "HouseholdGoalContribution_memberId_createdAt_idx" ON "HouseholdGoalContribution"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HouseholdAccountAccess" ADD CONSTRAINT "HouseholdAccountAccess_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdAccountAccess" ADD CONSTRAINT "HouseholdAccountAccess_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdAccountAccess" ADD CONSTRAINT "HouseholdAccountAccess_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibility" ADD CONSTRAINT "HouseholdResponsibility_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibility" ADD CONSTRAINT "HouseholdResponsibility_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibilityAllocation" ADD CONSTRAINT "HouseholdResponsibilityAllocation_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "HouseholdResponsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibilityAllocation" ADD CONSTRAINT "HouseholdResponsibilityAllocation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdGoal" ADD CONSTRAINT "HouseholdGoal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdGoalParticipant" ADD CONSTRAINT "HouseholdGoalParticipant_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "HouseholdGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdGoalParticipant" ADD CONSTRAINT "HouseholdGoalParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdGoalContribution" ADD CONSTRAINT "HouseholdGoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "HouseholdGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdGoalContribution" ADD CONSTRAINT "HouseholdGoalContribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Household" ADD CONSTRAINT "Household_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_incomeBasis_check" CHECK ("incomeBasis" IS NULL OR "incomeBasis" >= 0);
ALTER TABLE "HouseholdResponsibility" ADD CONSTRAINT "HouseholdResponsibility_monthlyAmount_check" CHECK ("monthlyAmount" > 0);
ALTER TABLE "HouseholdResponsibilityAllocation" ADD CONSTRAINT "HouseholdResponsibilityAllocation_shareBasisPoints_check" CHECK ("shareBasisPoints" IS NULL OR ("shareBasisPoints" >= 0 AND "shareBasisPoints" <= 10000));
ALTER TABLE "HouseholdGoal" ADD CONSTRAINT "HouseholdGoal_targetAmount_check" CHECK ("targetAmount" > 0);
ALTER TABLE "HouseholdGoalParticipant" ADD CONSTRAINT "HouseholdGoalParticipant_customTargetAmount_check" CHECK ("customTargetAmount" IS NULL OR "customTargetAmount" >= 0);
ALTER TABLE "HouseholdGoalContribution" ADD CONSTRAINT "HouseholdGoalContribution_amount_check" CHECK ("amount" > 0);

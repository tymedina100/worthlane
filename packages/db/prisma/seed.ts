import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: "Food & Drink",     icon: "🍔", color: "#FF6B6B" },
  { name: "Transportation",   icon: "🚗", color: "#4ECDC4" },
  { name: "Shopping",         icon: "🛍️", color: "#45B7D1" },
  { name: "Entertainment",    icon: "🎬", color: "#96CEB4" },
  { name: "Health & Fitness", icon: "💪", color: "#FFEAA7" },
  { name: "Personal Care",    icon: "💅", color: "#DDA0DD" },
  { name: "Home",             icon: "🏠", color: "#98D8C8" },
  { name: "Travel",           icon: "✈️", color: "#F7DC6F" },
  { name: "Utilities",        icon: "⚡", color: "#85C1E9" },
  { name: "Subscriptions",    icon: "📱", color: "#BB8FCE" },
  { name: "Income",           icon: "💰", color: "#58D68D" },
  { name: "Transfer",         icon: "↔️", color: "#ABB2B9" },
  { name: "Loan Payments",    icon: "🏦", color: "#EC7063" },
  { name: "Medical",          icon: "🏥", color: "#76D7C4" },
  { name: "Education",        icon: "📚", color: "#F0B27A" },
  { name: "Other",            icon: "📦", color: "#CCD1D1" },
];

const DEMO_PASSWORD = "WorthlaneDemo!2026";

async function seedDemoHousehold() {
  console.log("Seeding Tyler and Rachel demo household...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const [tyler, rachel] = await Promise.all([
    prisma.user.upsert({
      where: { email: "tyler.demo@worthlane.local" },
      update: { passwordHash },
      create: { id: "demo_user_tyler", email: "tyler.demo@worthlane.local", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "rachel.demo@worthlane.local" },
      update: { passwordHash },
      create: { id: "demo_user_rachel", email: "rachel.demo@worthlane.local", passwordHash },
    }),
  ]);

  const household = await prisma.household.upsert({
    where: { slug: "tyler-rachel-demo" },
    update: { name: "Tyler & Rachel", timezone: "America/Phoenix", currency: "USD" },
    create: {
      id: "demo_household_tyler_rachel",
      slug: "tyler-rachel-demo",
      name: "Tyler & Rachel",
      timezone: "America/Phoenix",
      currency: "USD",
    },
  });

  const [tylerMember, rachelMember] = await Promise.all([
    prisma.householdMember.upsert({
      where: { householdId_userId: { householdId: household.id, userId: tyler.id } },
      update: {
        displayName: "Tyler",
        role: "OWNER",
        status: "ACTIVE",
        incomeBasis: "6000.00",
        endedAt: null,
      },
      create: {
        id: "demo_member_tyler",
        householdId: household.id,
        userId: tyler.id,
        displayName: "Tyler",
        role: "OWNER",
        status: "ACTIVE",
        incomeBasis: "6000.00",
        joinedAt: new Date(),
      },
    }),
    prisma.householdMember.upsert({
      where: { householdId_userId: { householdId: household.id, userId: rachel.id } },
      update: {
        displayName: "Rachel",
        role: "MEMBER",
        status: "ACTIVE",
        incomeBasis: "4000.00",
        endedAt: null,
      },
      create: {
        id: "demo_member_rachel",
        householdId: household.id,
        userId: rachel.id,
        displayName: "Rachel",
        role: "MEMBER",
        status: "ACTIVE",
        incomeBasis: "4000.00",
        joinedAt: new Date(),
      },
    }),
  ]);

  const demoAccounts = [
    {
      id: "demo_account_tyler_checking",
      userId: tyler.id,
      name: "Tyler Everyday Checking",
      institutionName: "Worthlane Demo Bank",
      type: "CHECKING" as const,
      currentBalance: "4250.00",
    },
    {
      id: "demo_account_tyler_credit",
      userId: tyler.id,
      name: "Tyler Personal Card",
      institutionName: "Worthlane Demo Bank",
      type: "CREDIT" as const,
      currentBalance: "640.00",
    },
    {
      id: "demo_account_rachel_checking",
      userId: rachel.id,
      name: "Rachel Everyday Checking",
      institutionName: "Worthlane Demo Bank",
      type: "CHECKING" as const,
      currentBalance: "3100.00",
    },
    {
      id: "demo_account_rachel_savings",
      userId: rachel.id,
      name: "Rachel Travel Savings",
      institutionName: "Worthlane Demo Bank",
      type: "SAVINGS" as const,
      currentBalance: "8600.00",
    },
    {
      id: "demo_account_joint_savings",
      userId: tyler.id,
      name: "Universal Orlando Savings",
      institutionName: "Worthlane Demo Bank",
      type: "SAVINGS" as const,
      currentBalance: "3200.00",
    },
  ];

  for (const account of demoAccounts) {
    await prisma.account.upsert({
      where: { id: account.id },
      update: { ...account, source: "MANUAL" },
      create: { ...account, source: "MANUAL" },
    });
  }

  const accessPolicies = [
    ["demo_access_tyler_credit_rachel", "demo_account_tyler_credit", rachelMember.id, "PERSONAL"],
    ["demo_access_tyler_checking_rachel", "demo_account_tyler_checking", rachelMember.id, "SUMMARY"],
    ["demo_access_joint_rachel", "demo_account_joint_savings", rachelMember.id, "SHARED"],
    ["demo_access_rachel_checking_tyler", "demo_account_rachel_checking", tylerMember.id, "SUMMARY"],
    ["demo_access_rachel_savings_tyler", "demo_account_rachel_savings", tylerMember.id, "SHARED"],
  ] as const;
  for (const [id, accountId, memberId, visibility] of accessPolicies) {
    await prisma.householdAccountAccess.upsert({
      where: { accountId_memberId: { accountId, memberId } },
      update: { householdId: household.id, visibility },
      create: { id, householdId: household.id, accountId, memberId, visibility },
    });
  }

  const categories = new Map<string, string>();
  for (const name of ["Utilities", "Travel", "Home", "Food & Drink"]) {
    const category = await prisma.category.findFirst({ where: { name, isSystem: true } });
    if (!category) throw new Error(`Missing seeded category: ${name}`);
    categories.set(name, category.id);
  }

  const responsibilities = [
    {
      id: "demo_responsibility_utilities",
      slug: "utilities",
      name: "Utilities",
      categoryName: "Utilities",
      monthlyAmount: "400.00",
      mode: "MEMBER" as const,
      allocations: [{ memberId: tylerMember.id, shareBasisPoints: 10_000 }],
    },
    {
      id: "demo_responsibility_travel",
      slug: "travel",
      name: "Travel planning",
      categoryName: "Travel",
      monthlyAmount: "600.00",
      mode: "MEMBER" as const,
      allocations: [{ memberId: rachelMember.id, shareBasisPoints: 10_000 }],
    },
    {
      id: "demo_responsibility_home",
      slug: "home",
      name: "Home expenses",
      categoryName: "Home",
      monthlyAmount: "2400.00",
      mode: "EQUAL" as const,
      allocations: [
        { memberId: tylerMember.id, shareBasisPoints: null },
        { memberId: rachelMember.id, shareBasisPoints: null },
      ],
    },
    {
      id: "demo_responsibility_food",
      slug: "food",
      name: "Groceries & dining",
      categoryName: "Food & Drink",
      monthlyAmount: "1000.00",
      mode: "PERCENTAGE" as const,
      allocations: [
        { memberId: tylerMember.id, shareBasisPoints: 6000 },
        { memberId: rachelMember.id, shareBasisPoints: 4000 },
      ],
    },
  ];

  for (const item of responsibilities) {
    const responsibility = await prisma.householdResponsibility.upsert({
      where: { householdId_slug: { householdId: household.id, slug: item.slug } },
      update: {
        categoryId: categories.get(item.categoryName),
        name: item.name,
        monthlyAmount: item.monthlyAmount,
        mode: item.mode,
        isActive: true,
      },
      create: {
        id: item.id,
        householdId: household.id,
        categoryId: categories.get(item.categoryName),
        slug: item.slug,
        name: item.name,
        monthlyAmount: item.monthlyAmount,
        mode: item.mode,
      },
    });
    await prisma.householdResponsibilityAllocation.deleteMany({
      where: {
        responsibilityId: responsibility.id,
        memberId: { notIn: item.allocations.map((allocation) => allocation.memberId) },
      },
    });
    for (const allocation of item.allocations) {
      await prisma.householdResponsibilityAllocation.upsert({
        where: {
          responsibilityId_memberId: {
            responsibilityId: responsibility.id,
            memberId: allocation.memberId,
          },
        },
        update: { shareBasisPoints: allocation.shareBasisPoints },
        create: {
          id: `${responsibility.id}_${allocation.memberId}`,
          responsibilityId: responsibility.id,
          memberId: allocation.memberId,
          shareBasisPoints: allocation.shareBasisPoints,
        },
      });
    }
  }

  const goal = await prisma.householdGoal.upsert({
    where: { householdId_slug: { householdId: household.id, slug: "universal-orlando" } },
    update: {
      name: "Universal Orlando",
      targetAmount: "8000.00",
      targetDate: new Date("2027-06-01T12:00:00.000Z"),
      icon: "🎢",
      contributionMode: "INCOME_PROPORTIONAL",
      isArchived: false,
    },
    create: {
      id: "demo_goal_universal_orlando",
      householdId: household.id,
      slug: "universal-orlando",
      name: "Universal Orlando",
      targetAmount: "8000.00",
      targetDate: new Date("2027-06-01T12:00:00.000Z"),
      icon: "🎢",
      contributionMode: "INCOME_PROPORTIONAL",
    },
  });
  for (const member of [tylerMember, rachelMember]) {
    await prisma.householdGoalParticipant.upsert({
      where: { goalId_memberId: { goalId: goal.id, memberId: member.id } },
      update: { customTargetAmount: null },
      create: {
        id: `${goal.id}_${member.id}`,
        goalId: goal.id,
        memberId: member.id,
      },
    });
  }

  const openingContributions = [
    {
      id: "demo_goal_contribution_tyler",
      memberId: tylerMember.id,
      contributorName: "Tyler",
      amount: "1900.00",
      note: "Opening Universal Orlando savings",
    },
    {
      id: "demo_goal_contribution_rachel",
      memberId: rachelMember.id,
      contributorName: "Rachel",
      amount: "1300.00",
      note: "Opening Universal Orlando savings",
    },
  ];
  for (const contribution of openingContributions) {
    await prisma.householdGoalContribution.upsert({
      where: { id: contribution.id },
      update: { ...contribution, goalId: goal.id },
      create: { ...contribution, goalId: goal.id },
    });
  }

  const now = new Date();
  const demoDate = (daysAgo: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.max(1, now.getUTCDate() - daysAgo), 12));
  const transactions = [
    ["demo_tx_utilities_tyler", tyler.id, "demo_account_tyler_checking", "Utilities", "320.00", 8],
    ["demo_tx_home_tyler", tyler.id, "demo_account_tyler_checking", "Home", "1100.00", 7],
    ["demo_tx_home_rachel", rachel.id, "demo_account_rachel_checking", "Home", "900.00", 6],
    ["demo_tx_food_tyler", tyler.id, "demo_account_tyler_checking", "Food & Drink", "420.00", 5],
    ["demo_tx_food_rachel", rachel.id, "demo_account_rachel_checking", "Food & Drink", "280.00", 4],
    ["demo_tx_travel_rachel", rachel.id, "demo_account_rachel_savings", "Travel", "250.00", 3],
  ] as const;
  for (const [id, userId, accountId, categoryName, amount, daysAgo] of transactions) {
    await prisma.transaction.upsert({
      where: { id },
      update: {
        userId,
        accountId,
        categoryId: categories.get(categoryName),
        amount,
        date: demoDate(daysAgo),
        merchantName: `Demo ${categoryName}`,
        isManual: true,
      },
      create: {
        id,
        userId,
        accountId,
        categoryId: categories.get(categoryName),
        amount,
        date: demoDate(daysAgo),
        merchantName: `Demo ${categoryName}`,
        isManual: true,
      },
    });
  }

  console.log("Demo users: tyler.demo@worthlane.local and rachel.demo@worthlane.local");
  console.log(`Demo password: ${DEMO_PASSWORD}`);
}

async function main() {
  console.log("Seeding system categories...");
  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isSystem: true },
    });
    if (!existing) {
      await prisma.category.create({ data: { ...cat, isSystem: true } });
      console.log(`  Created: ${cat.name}`);
    } else {
      console.log(`  Exists:  ${cat.name}`);
    }
  }
  if (process.env.SEED_DEMO_DATA === "true") {
    await seedDemoHousehold();
  } else {
    console.log("Skipping demo household. Set SEED_DEMO_DATA=true to create it.");
  }
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

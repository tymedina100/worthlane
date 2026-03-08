import { prisma } from "@finance/db";

// Map Plaid's personal finance category to our internal category
const PLAID_CATEGORY_MAP: Record<string, { name: string; icon: string; color: string }> = {
  FOOD_AND_DRINK: { name: "Food & Drink", icon: "🍔", color: "#FF6B6B" },
  TRANSPORTATION: { name: "Transportation", icon: "🚗", color: "#4ECDC4" },
  SHOPPING: { name: "Shopping", icon: "🛍️", color: "#45B7D1" },
  ENTERTAINMENT: { name: "Entertainment", icon: "🎬", color: "#96CEB4" },
  HEALTH_AND_FITNESS: { name: "Health & Fitness", icon: "💪", color: "#FFEAA7" },
  PERSONAL_CARE: { name: "Personal Care", icon: "💅", color: "#DDA0DD" },
  HOME_IMPROVEMENT: { name: "Home", icon: "🏠", color: "#98D8C8" },
  TRAVEL: { name: "Travel", icon: "✈️", color: "#F7DC6F" },
  UTILITIES: { name: "Utilities", icon: "⚡", color: "#85C1E9" },
  SUBSCRIPTION: { name: "Subscriptions", icon: "📱", color: "#BB8FCE" },
  INCOME: { name: "Income", icon: "💰", color: "#58D68D" },
  TRANSFER: { name: "Transfer", icon: "↔️", color: "#ABB2B9" },
  LOAN_PAYMENTS: { name: "Loan Payments", icon: "🏦", color: "#EC7063" },
  MEDICAL: { name: "Medical", icon: "🏥", color: "#76D7C4" },
  EDUCATION: { name: "Education", icon: "📚", color: "#F0B27A" },
  OTHER: { name: "Other", icon: "📦", color: "#CCD1D1" },
};

const categoryCache = new Map<string, string>();

export async function mapPlaidCategory(
  plaidCategory: string | null,
  userId: string
): Promise<string | null> {
  const key = plaidCategory ?? "OTHER";
  const mapped = PLAID_CATEGORY_MAP[key] ?? PLAID_CATEGORY_MAP.OTHER;

  const cacheKey = `${userId}:${mapped.name}`;
  if (categoryCache.has(cacheKey)) return categoryCache.get(cacheKey)!;

  // Find or create system category
  let category = await prisma.category.findFirst({
    where: { name: mapped.name, isSystem: true },
  });

  if (!category) {
    category = await prisma.category.create({
      data: { name: mapped.name, icon: mapped.icon, color: mapped.color, isSystem: true },
    });
  }

  categoryCache.set(cacheKey, category.id);
  return category.id;
}

export async function getSystemCategories() {
  return prisma.category.findMany({ where: { isSystem: true }, orderBy: { name: "asc" } });
}

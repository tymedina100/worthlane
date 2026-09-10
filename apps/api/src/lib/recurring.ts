import { personalLedger } from "@/lib/personal-ledger";
import { prisma, RecurringFrequency } from "@worthlane/db";

// Recurring-charge detection. Pure heuristics over the user's transaction
// history: group by normalized merchant, cluster by amount, infer cadence
// from the median gap between occurrences.

export interface TransactionLike {
  amount: number;
  date: Date;
  merchantName: string | null;
  categoryId: string | null;
  accountId: string | null;
}

export interface DetectedRecurring {
  normalizedMerchant: string;
  displayName: string;
  categoryId: string | null;
  accountId: string | null;
  averageAmount: number;
  frequency: RecurringFrequency;
  lastSeenDate: Date;
  nextDueDate: Date;
  occurrenceCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const CADENCES: { frequency: RecurringFrequency; min: number; max: number; minOccurrences: number }[] = [
  { frequency: RecurringFrequency.WEEKLY, min: 5, max: 9, minOccurrences: 3 },
  { frequency: RecurringFrequency.BIWEEKLY, min: 12, max: 17, minOccurrences: 3 },
  { frequency: RecurringFrequency.MONTHLY, min: 26, max: 35, minOccurrences: 3 },
  { frequency: RecurringFrequency.QUARTERLY, min: 80, max: 100, minOccurrences: 2 },
  { frequency: RecurringFrequency.YEARLY, min: 350, max: 380, minOccurrences: 2 },
];

const CADENCE_DAYS: Record<RecurringFrequency, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
  QUARTERLY: 91,
  YEARLY: 365,
};

/** Lowercases, strips store numbers / reference codes / punctuation. */
export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .replace(/[#*][\w-]*/g, " ") // "#1234", "*ref"
    .replace(/\b\d{3,}\b/g, " ") // long digit runs (store/invoice numbers)
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Clusters a merchant's charges by amount (within max($3, 12%) of the cluster mean). */
function clusterByAmount(txns: TransactionLike[]): TransactionLike[][] {
  const clusters: { mean: number; items: TransactionLike[] }[] = [];
  for (const tx of txns) {
    let placed = false;
    for (const cluster of clusters) {
      const tolerance = Math.max(3, cluster.mean * 0.12);
      if (Math.abs(tx.amount - cluster.mean) <= tolerance) {
        cluster.items.push(tx);
        cluster.mean =
          cluster.items.reduce((s, t) => s + t.amount, 0) / cluster.items.length;
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ mean: tx.amount, items: [tx] });
  }
  return clusters.map((c) => c.items);
}

function classifyGaps(gapsDays: number[]): RecurringFrequency | null {
  if (gapsDays.length === 0) return null;
  const med = median(gapsDays);

  for (const cadence of CADENCES) {
    if (med < cadence.min || med > cadence.max) continue;
    // Require the gaps to be reasonably regular (within ±20% of the median).
    const irregular = gapsDays.some((g) => Math.abs(g - med) > med * 0.2 + 2);
    if (irregular) return null;
    if (gapsDays.length + 1 < cadence.minOccurrences) return null;
    return cadence.frequency;
  }
  return null;
}

/**
 * Pure detection over a transaction list (expenses only, most recent last).
 * Exported separately from the DB wrapper so it can be unit-tested.
 */
export function detectRecurring(transactions: TransactionLike[]): DetectedRecurring[] {
  const byMerchant = new Map<string, { displayName: string; items: TransactionLike[] }>();

  for (const tx of transactions) {
    if (!tx.merchantName || tx.amount <= 0) continue;
    const key = normalizeMerchant(tx.merchantName);
    if (key.length < 2) continue;
    const entry = byMerchant.get(key);
    if (entry) entry.items.push(tx);
    else byMerchant.set(key, { displayName: tx.merchantName, items: [tx] });
  }

  const results: DetectedRecurring[] = [];

  for (const [normalizedMerchant, { displayName, items }] of byMerchant) {
    if (items.length < 2) continue;

    for (const cluster of clusterByAmount(items)) {
      if (cluster.length < 2) continue;
      const sorted = [...cluster].sort((a, b) => a.date.getTime() - b.date.getTime());
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / DAY_MS);
      }

      const frequency = classifyGaps(gaps);
      if (!frequency) continue;

      const last = sorted[sorted.length - 1];
      const medGap = median(gaps);
      const nextDueDate = new Date(last.date.getTime() + Math.round(medGap) * DAY_MS);
      const averageAmount =
        Math.round((sorted.reduce((s, t) => s + t.amount, 0) / sorted.length) * 100) / 100;

      results.push({
        normalizedMerchant,
        displayName,
        categoryId: last.categoryId,
        accountId: last.accountId,
        averageAmount,
        frequency,
        lastSeenDate: last.date,
        nextDueDate,
        occurrenceCount: sorted.length,
      });
    }
  }

  return results;
}

/** Runs detection over the user's last 6 months and syncs RecurringTransaction rows. */
export async function detectRecurringForUser(userId: string): Promise<void> {
  const ledger = await personalLedger(userId);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: {
      ...ledger.transactionWhere,
      amount: { gt: 0 },
      merchantName: { not: null },
      date: { gte: sixMonthsAgo },
    },
    select: { amount: true, date: true, merchantName: true, categoryId: true, accountId: true },
    orderBy: { date: "asc" },
  });

  const detected = detectRecurring(
    transactions.map((t) => ({
      amount: t.amount.toNumber(),
      date: t.date,
      merchantName: t.merchantName,
      categoryId: t.categoryId,
      accountId: t.accountId,
    }))
  );

  const now = new Date();
  const seenKeys = new Set<string>();

  for (const item of detected) {
    seenKeys.add(`${item.normalizedMerchant}|${item.frequency}`);
    await prisma.recurringTransaction.upsert({
      where: {
        userId_normalizedMerchant_frequency: {
          userId,
          normalizedMerchant: item.normalizedMerchant,
          frequency: item.frequency,
        },
      },
      create: { userId, ...item },
      update: {
        // Never overwrite user edits to displayName/categoryId or the mute flag.
        averageAmount: item.averageAmount,
        lastSeenDate: item.lastSeenDate,
        nextDueDate: item.nextDueDate,
        occurrenceCount: item.occurrenceCount,
        accountId: item.accountId,
        isActive: true,
      },
    });
  }

  // Deactivate entries that stopped recurring: not re-detected and overdue
  // by more than 1.5 intervals.
  const existing = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true },
  });
  for (const row of existing) {
    if (seenKeys.has(`${row.normalizedMerchant}|${row.frequency}`)) continue;
    const graceMs = CADENCE_DAYS[row.frequency] * 1.5 * DAY_MS;
    if (now.getTime() - row.lastSeenDate.getTime() > graceMs) {
      await prisma.recurringTransaction.update({
        where: { id: row.id },
        data: { isActive: false },
      });
    }
  }
}

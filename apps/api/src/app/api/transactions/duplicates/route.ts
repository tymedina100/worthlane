import { NextRequest } from "next/server";
import { Prisma, prisma } from "@worthlane/db";
import { confirmTransactionDuplicateSchema, transactionDuplicatesSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { err, notFound, ok, unauthorized } from "@/lib/response";

const windowMs = 3 * 86_400_000;
const entrySelect = { id: true, updatedAt: true, amount: true, date: true, merchantName: true, account: { select: { name: true } } } as const;
type Entry = Prisma.TransactionGetPayload<{ select: typeof entrySelect }>;
const entry = (row: Entry) => ({ id: row.id, updatedAt: row.updatedAt.toISOString(), amount: row.amount.toNumber(), date: row.date.toISOString(), merchantName: row.merchantName, accountName: row.account.name });

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const cursor = req.nextUrl.searchParams.get("cursor");
  if (cursor && cursor.length > 191) return err("Invalid review cursor.");
  const after = cursor ? await prisma.transaction.findFirst({ where: { id: cursor, userId, isManual: true }, select: { id: true, date: true } }) : null;
  if (cursor && !after) return notFound();
  const rows = await prisma.transaction.findMany({
    where: { userId, isManual: true, spendingTreatment: { not: "EXCLUDED" },
      ...(after ? { OR: [{ date: { lt: after.date } }, { date: after.date, id: { lt: after.id } }] } : {}),
    }, orderBy: [{ date: "desc" }, { id: "desc" }], take: 21, select: entrySelect,
  });
  const page = rows.slice(0, 20);
  const candidates = await Promise.all(page.map(async manual => {
    const matches = await prisma.transaction.findMany({ where: {
      userId, isManual: false, account: { userId, source: "PLAID" }, spendingTreatment: { not: "EXCLUDED" },
      amount: manual.amount, date: { gte: new Date(manual.date.getTime() - windowMs), lte: new Date(manual.date.getTime() + windowMs) },
    }, orderBy: [{ date: "desc" }, { id: "desc" }], take: 6, select: entrySelect });
    return { manual: entry(manual), bankMatches: matches.slice(0, 5).map(entry), moreMatches: matches.length > 5 };
  }));
  return ok(transactionDuplicatesSchema.parse({ entries: candidates.filter(row => row.bankMatches.length), nextCursor: rows.length > 20 ? page[page.length - 1].id : null, reviewedCount: page.length }));
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const parsed = confirmTransactionDuplicateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Choose two entries from a current duplicate review.");
  try {
    const result = await prisma.$transaction(async db => {
      const manual = await db.transaction.findFirst({ where: { id: parsed.data.manualId, userId, isManual: true } });
      const bank = await db.transaction.findFirst({ where: { id: parsed.data.bankId, userId, isManual: false, account: { userId, source: "PLAID" } } });
      if (!manual || !bank) return "missing";
      if (manual.updatedAt.toISOString() !== parsed.data.manualUpdatedAt || bank.updatedAt.toISOString() !== parsed.data.bankUpdatedAt ||
        !manual.amount.equals(bank.amount) || Math.abs(manual.date.getTime() - bank.date.getTime()) > windowMs || bank.spendingTreatment === "EXCLUDED") return "changed";
      await db.transaction.update({ where: { id: manual.id }, data: { spendingTreatment: "EXCLUDED", treatmentOverridden: true } });
      return "saved";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "missing") return notFound();
    if (result === "changed") return err("An entry changed. Refresh the review before confirming.", 409);
    return ok({ message: "Manual copy excluded. Both entries remain in Activity; restore it there if needed." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(error.code)) return err("An entry changed. Refresh the review before confirming.", 409);
    throw error;
  }
}

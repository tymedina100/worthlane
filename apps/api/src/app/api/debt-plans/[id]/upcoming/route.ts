import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ok, err, notFound, unauthorized } from "@/lib/response";
import { parseDateOnly, toDateOnly } from "@/lib/upcoming";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const parsed = z.object({ entryId: z.string().min(1).max(100), revision: z.number().int().positive() }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Choose a saved debt and current plan revision.");
  const result = await prisma.$transaction(async db => {
    // Claim the revision to serialize against concurrent edits before reading entries.
    const claimed = await db.debtPlan.updateMany({ where: { id: params.id, userId, revision: parsed.data.revision }, data: { revision: { increment: 0 } } });
    if (!claimed.count) return { error: await db.debtPlan.findFirst({ where: { id: params.id, userId } }) ? "CONFLICT" : "MISSING" } as const;
    const debt = await db.debtPlanEntry.findUnique({ where: { planId_entryId: { planId: params.id, entryId: parsed.data.entryId } } });
    if (!debt) return { error: "MISSING" } as const;
    if (!debt.dueDate || debt.minimumPayment.lte(0)) return { error: "DETAILS" } as const;
    const sourceKey = createHash("sha256").update(JSON.stringify([userId, params.id, debt.entryId, debt.dueDate])).digest("hex");
    const existing = await db.upcomingObligation.findUnique({ where: { sourceKey } });
    if (existing) return { item: existing, existed: true };
    const item = await db.upcomingObligation.create({ data: { userId, sourceKey, name: `${debt.name} minimum payment`, amount: debt.minimumPayment, dueDate: parseDateOnly(debt.dueDate), anchorDay: parseDateOnly(debt.dueDate).getUTCDate(), type: "BILL", frequency: null, reminderTiming: "NONE" } });
    return { item, existed: false };
  });
  if ("error" in result) {
    if (result.error === "MISSING") return notFound();
    return result.error === "CONFLICT" ? err("Reload the saved plan before adding its due date.", 409) : err("Save a confirmed due date and a positive minimum payment first.");
  }
  return ok({ id: result.item.id, dueDate: toDateOnly(result.item.dueDate), amount: result.item.amount.toNumber(), alreadyExists: result.existed, message: result.existed ? "This due-date item already exists. Manage changes in Upcoming." : "Added to Upcoming with reminders off. This does not make a payment." });
}

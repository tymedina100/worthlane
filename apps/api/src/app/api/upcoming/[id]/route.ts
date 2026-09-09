import { financialTimeZone } from "@/lib/budget-period";
import { NextRequest } from "next/server";
import { prisma, type Prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { err, notFound, ok, unauthorized } from "@/lib/response";
import { nextFutureObligationDate, parseDateOnly, toDateOnly, obligationStatus } from "@/lib/upcoming";
import { upcomingEditSchema, upcomingActionSchema } from "@worthlane/contracts";

function serialize(row: any, timeZone: string) {
  return { id: row.id, name: row.name, amount: row.amount.toNumber(), dueDate: toDateOnly(row.dueDate), type: row.type, frequency: row.frequency, accountName: row.accountName, reminderTiming: row.reminderTiming, isPaid: row.isPaid, isActive: row.isActive, lastPaidAt: row.lastPaidAt?.toISOString() ?? null, status: obligationStatus(row.dueDate, row.isPaid, new Date(), timeZone), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

async function ownItem(req: NextRequest, id: string) {
  let userId: string;
  try { ({ sub: userId } = getAuthUser(req)); } catch { return { response: unauthorized() }; }
  const item = await prisma.upcomingObligation.findFirst({ where: { id, userId } });
  return item ? { userId, item } : { response: notFound("Upcoming item not found") };
}

async function updateVersion(id: string, userId: string, expected: string, data: Prisma.UpcomingObligationUpdateManyMutationInput) {
  return prisma.$transaction(async tx => {
    const updated = await tx.upcomingObligation.updateMany({
      where: { id, userId, updatedAt: new Date(expected) },
      data: { ...data, updatedAt: new Date(Math.max(Date.now(), new Date(expected).getTime() + 1)) },
    });
    return updated.count === 1 ? tx.upcomingObligation.findUniqueOrThrow({ where: { id } }) : null;
  });
}
const conflict = () => err("This item changed. Refresh Upcoming and reopen it before retrying; your changes were not applied.", 409, "CONFLICT");

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await ownItem(req, params.id);
  if ("response" in owned) return owned.response;
  const parsed = upcomingEditSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Enter valid upcoming-item details.");
  const { expectedUpdatedAt, ...data } = parsed.data;
  if (expectedUpdatedAt !== owned.item.updatedAt.toISOString()) return conflict();
  const row = await updateVersion(params.id, owned.userId, expectedUpdatedAt, { ...data, ...(data.dueDate ? { dueDate: parseDateOnly(data.dueDate), ...(data.dueDate !== toDateOnly(owned.item.dueDate) ? { anchorDay: parseDateOnly(data.dueDate).getUTCDate() } : {}) } : {}), accountName: data.accountName?.trim() || data.accountName });
  if (!row) return conflict();
  return ok(serialize(row, await financialTimeZone(owned.userId)));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await ownItem(req, params.id);
  if ("response" in owned) return owned.response;
  const parsed = upcomingActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Refresh Upcoming before recording a payment.");
  const body = parsed.data;
  if (body.expectedUpdatedAt !== owned.item.updatedAt.toISOString()) return conflict();

  const markPaid = body.action === "markPaid";
  const now = new Date();
  const data = markPaid && owned.item.frequency
    ? { dueDate: nextFutureObligationDate(owned.item.dueDate, owned.item.frequency, now, await financialTimeZone(owned.userId), owned.item.anchorDay ?? owned.item.dueDate.getUTCDate()), isPaid: false, lastPaidAt: now }
    : { isPaid: markPaid, lastPaidAt: markPaid ? now : null };
  const row = await updateVersion(params.id, owned.userId, body.expectedUpdatedAt, data);
  if (!row) return conflict();
  return ok(serialize(row, await financialTimeZone(owned.userId)));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await ownItem(req, params.id);
  if ("response" in owned) return owned.response;
  await prisma.upcomingObligation.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}

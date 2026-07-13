import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { err, notFound, ok, unauthorized } from "@/lib/response";
import { nextFutureObligationDate, parseDateOnly, toDateOnly, obligationStatus } from "@/lib/upcoming";
import { upcomingInputSchema } from "../route";

function serialize(row: any) {
  return { id: row.id, name: row.name, amount: row.amount.toNumber(), dueDate: toDateOnly(row.dueDate), type: row.type, frequency: row.frequency, accountName: row.accountName, reminderTiming: row.reminderTiming, isPaid: row.isPaid, isActive: row.isActive, lastPaidAt: row.lastPaidAt?.toISOString() ?? null, status: obligationStatus(row.dueDate, row.isPaid), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

async function ownItem(req: NextRequest, id: string) {
  let userId: string;
  try { ({ sub: userId } = getAuthUser(req)); } catch { return { response: unauthorized() }; }
  const item = await prisma.upcomingObligation.findFirst({ where: { id, userId } });
  return item ? { userId, item } : { response: notFound("Upcoming item not found") };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await ownItem(req, params.id);
  if ("response" in owned) return owned.response;
  const parsed = upcomingInputSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Enter valid upcoming-item details.");
  const data = parsed.data;
  const row = await prisma.upcomingObligation.update({
    where: { id: params.id },
    data: { ...data, ...(data.dueDate ? { dueDate: parseDateOnly(data.dueDate) } : {}), accountName: data.accountName?.trim() || data.accountName },
  });
  return ok(serialize(row));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await ownItem(req, params.id);
  if ("response" in owned) return owned.response;
  const body = await req.json().catch(() => null) as { action?: string } | null;
  if (body?.action !== "markPaid" && body?.action !== "markUnpaid") return err("Unsupported upcoming-item action.");

  const markPaid = body.action === "markPaid";
  const now = new Date();
  const data = markPaid && owned.item.frequency
    ? { dueDate: nextFutureObligationDate(owned.item.dueDate, owned.item.frequency, now), isPaid: false, lastPaidAt: now }
    : { isPaid: markPaid, lastPaidAt: markPaid ? now : null };
  const row = await prisma.upcomingObligation.update({ where: { id: params.id }, data });
  return ok(serialize(row));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await ownItem(req, params.id);
  if ("response" in owned) return owned.response;
  await prisma.upcomingObligation.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}

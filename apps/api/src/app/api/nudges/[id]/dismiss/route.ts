import { NextRequest } from "next/server";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, notFound } from "@/lib/response";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const nudge = await prisma.nudge.findFirst({ where: { id: params.id, userId } });
  if (!nudge) return notFound();

  await prisma.nudge.update({ where: { id: params.id }, data: { dismissed: true } });
  return ok({ dismissed: true });
}

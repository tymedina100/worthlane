import { NextRequest } from "next/server";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { generateNudgesForUser } from "@/lib/nudge-engine";

// GET: fetch undismissed nudges for user
export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  // Auto-generate nudges if none exist today
  await generateNudgesForUser(userId);

  const nudges = await prisma.nudge.findMany({
    where: { userId, dismissed: false },
    orderBy: { sentAt: "desc" },
    take: 10,
  });

  return ok(nudges.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    sentAt: n.sentAt.toISOString(),
  })));
}

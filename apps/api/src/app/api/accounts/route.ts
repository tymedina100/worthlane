import { NextRequest } from "next/server";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return ok(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      institutionName: a.institutionName,
      type: a.type,
      currentBalance: a.currentBalance.toNumber(),
      lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
    }))
  );
}

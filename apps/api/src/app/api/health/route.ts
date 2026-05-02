import { prisma } from "@worthlane/db";
import { ok } from "@/lib/response";

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  return ok({ status: "ok" });
}

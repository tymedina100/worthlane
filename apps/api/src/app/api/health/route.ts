import { prisma } from "@worthlane/db";
import { err, ok } from "@/lib/response";

// Deployment readiness must execute against the database, never a build-time cache.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const response = ok({ status: "ready" });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    // This public probe must not disclose database addresses or driver errors.
    const response = err("Service unavailable", 503, "NOT_READY");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { listResponsibilityHistory } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { err, ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  if (cursor !== undefined && (!cursor || cursor.length > 191)) return err("Invalid history cursor");
  try { return ok(await listResponsibilityHistory(userId, cursor)); }
  catch (error) { return householdErrorResponse(error, "households/current/responsibility-history", "Unable to load agreement history", "HOUSEHOLD_HISTORY_FAILED"); }
}

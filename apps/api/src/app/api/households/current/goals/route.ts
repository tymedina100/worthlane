import { NextRequest } from "next/server";
import { createHouseholdGoalSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { createHouseholdGoal, listHouseholdGoals } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { err, ok, unauthorized } from "@/lib/response";

function userIdFrom(req: NextRequest): string | null {
  try { return getAuthUser(req).sub; } catch { return null; }
}

export async function GET(req: NextRequest) {
  const userId = userIdFrom(req);
  if (!userId) return unauthorized();
  try {
    return ok(await listHouseholdGoals(userId));
  } catch (error) {
    return householdErrorResponse(error, "households/current/goals", "Unable to load household goals", "HOUSEHOLD_GOALS_FAILED");
  }
}

export async function POST(req: NextRequest) {
  const userId = userIdFrom(req);
  if (!userId) return unauthorized();
  const parsed = createHouseholdGoalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Invalid request body");
  try {
    return ok(await createHouseholdGoal(userId, parsed.data), 201);
  } catch (error) {
    return householdErrorResponse(error, "households/current/goals", "Unable to create household goal", "HOUSEHOLD_GOAL_CREATE_FAILED");
  }
}

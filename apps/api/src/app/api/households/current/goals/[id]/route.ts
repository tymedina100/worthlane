import { NextRequest } from "next/server";
import { updateHouseholdGoalSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { updateHouseholdGoal } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { err, ok, unauthorized } from "@/lib/response";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try { ({ sub: userId } = getAuthUser(req)); } catch { return unauthorized(); }
  const parsed = updateHouseholdGoalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Invalid request body");
  try {
    return ok(await updateHouseholdGoal(userId, params.id, parsed.data));
  } catch (error) {
    return householdErrorResponse(error, "households/current/goals/update", "Unable to update household goal", "HOUSEHOLD_GOAL_UPDATE_FAILED");
  }
}

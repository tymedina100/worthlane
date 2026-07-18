import { NextRequest } from "next/server";
import { createHouseholdGoalContributionSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import {
  addHouseholdGoalContribution,
  HouseholdConflictError,
  HouseholdNotFoundError,
} from "@/lib/household";
import { captureServerException } from "@/lib/sentry";
import { err, notFound, ok, unauthorized } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const parsed = createHouseholdGoalContributionSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid request body");
  }

  try {
    return ok(
      await addHouseholdGoalContribution(userId, params.id, parsed.data),
      201
    );
  } catch (error) {
    if (error instanceof HouseholdNotFoundError) {
      return notFound(error.message);
    }
    if (error instanceof HouseholdConflictError) {
      return err(error.message, 409, "HOUSEHOLD_CONFLICT");
    }
    captureServerException(error, {
      tags: { route: "households/current/goals/contributions" },
    });
    return err("Unable to add contribution", 500, "HOUSEHOLD_CONTRIBUTION_FAILED");
  }
}

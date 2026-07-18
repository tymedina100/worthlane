import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getHouseholdSummary,
  HouseholdNotFoundError,
} from "@/lib/household";
import { captureServerException } from "@/lib/sentry";
import { err, notFound, ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  try {
    return ok(await getHouseholdSummary(userId));
  } catch (error) {
    if (error instanceof HouseholdNotFoundError) {
      return notFound(error.message);
    }
    captureServerException(error, { tags: { route: "households/current/summary" } });
    return err("Unable to load household summary", 500, "HOUSEHOLD_SUMMARY_FAILED");
  }
}

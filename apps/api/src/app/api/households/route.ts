import { NextRequest } from "next/server";
import { createHouseholdSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { createHouseholdForUser } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { err, ok, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }
  const parsed = createHouseholdSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Invalid request body");
  try {
    return ok(await createHouseholdForUser(userId, parsed.data), 201);
  } catch (error) {
    return householdErrorResponse(
      error,
      "households",
      "Unable to create household",
      "HOUSEHOLD_CREATE_FAILED"
    );
  }
}

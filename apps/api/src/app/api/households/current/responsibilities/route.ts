import { NextRequest } from "next/server";
import { createHouseholdResponsibilitySchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import {
  createHouseholdResponsibility,
  listHouseholdResponsibilities,
} from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { err, ok, unauthorized } from "@/lib/response";

function userIdFrom(req: NextRequest): string | null {
  try {
    return getAuthUser(req).sub;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = userIdFrom(req);
  if (!userId) return unauthorized();
  try {
    return ok(await listHouseholdResponsibilities(userId));
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/current/responsibilities",
      "Unable to load household responsibilities",
      "HOUSEHOLD_RESPONSIBILITIES_FAILED"
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = userIdFrom(req);
  if (!userId) return unauthorized();
  const parsed = createHouseholdResponsibilitySchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) return err("Invalid request body");
  try {
    return ok(await createHouseholdResponsibility(userId, parsed.data), 201);
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/current/responsibilities",
      "Unable to create household responsibility",
      "HOUSEHOLD_RESPONSIBILITY_CREATE_FAILED"
    );
  }
}

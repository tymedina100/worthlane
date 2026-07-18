import { NextRequest } from "next/server";
import { updateHouseholdResponsibilitySchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import {
  deleteHouseholdResponsibility,
  updateHouseholdResponsibility,
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = userIdFrom(req);
  if (!userId) return unauthorized();
  const parsed = updateHouseholdResponsibilitySchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) return err("Invalid request body");
  try {
    return ok(
      await updateHouseholdResponsibility(userId, params.id, parsed.data)
    );
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/current/responsibilities/update",
      "Unable to update household responsibility",
      "HOUSEHOLD_RESPONSIBILITY_UPDATE_FAILED"
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = userIdFrom(req);
  if (!userId) return unauthorized();
  try {
    return ok(await deleteHouseholdResponsibility(userId, params.id));
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/current/responsibilities/delete",
      "Unable to delete household responsibility",
      "HOUSEHOLD_RESPONSIBILITY_DELETE_FAILED"
    );
  }
}

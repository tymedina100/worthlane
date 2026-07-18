import { NextRequest } from "next/server";
import { acceptHouseholdPartnerInviteSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { acceptHouseholdPartnerInvite } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { checkRateLimit, ipKey } from "@/lib/rate-limit";
import { err, ok, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }
  const limited = checkRateLimit(
    ipKey(req, `household-partner-accept:${userId}`),
    10,
    60 * 60 * 1000
  );
  if (limited) return limited;
  const parsed = acceptHouseholdPartnerInviteSchema.safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) return err("Invalid request body");

  try {
    return ok(
      await acceptHouseholdPartnerInvite(userId, parsed.data.invitationId)
    );
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/invitations/accept",
      "Unable to accept partner invitation",
      "HOUSEHOLD_INVITE_ACCEPT_FAILED"
    );
  }
}

import { NextRequest } from "next/server";
import { linkHouseholdPartnerSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { linkHouseholdPartner } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { checkRateLimit, ipKey } from "@/lib/rate-limit";
import { err, ok, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  let userId: string;
  try { ({ sub: userId } = getAuthUser(req)); } catch { return unauthorized(); }
  const limited = checkRateLimit(
    ipKey(req, `household-partner-invite:${userId}`),
    10,
    60 * 60 * 1000
  );
  if (limited) return limited;
  const parsed = linkHouseholdPartnerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Invalid request body");
  try {
    return ok(await linkHouseholdPartner(userId, parsed.data), 202);
  } catch (error) {
    return householdErrorResponse(error, "households/current/partners/link", "Unable to link household partner", "HOUSEHOLD_PARTNER_LINK_FAILED");
  }
}

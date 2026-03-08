import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createLinkToken } from "@/lib/plaid";
import { ok, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const linkToken = await createLinkToken(userId);
  return ok({ linkToken });
}

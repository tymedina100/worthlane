import { createHouseholdSchema } from "@worthlane/contracts";
import { cookies } from "next/headers";
import {
  authenticatedServerRequest,
  errorResponse,
  jsonResponse,
  readJson,
  sameOriginMutationError,
  upstreamUnavailableResponse,
} from "@/src/lib/server-api";

export async function POST(request: Request) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;
  const parsed = createHouseholdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("Invalid household setup", 400, "VALIDATION_ERROR");
  }
  try {
    const upstream = await authenticatedServerRequest(await cookies(), "/households", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    return jsonResponse(await readJson(upstream), upstream.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

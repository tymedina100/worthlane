import {
  createHouseholdGoalContributionSchema,
  householdGoalContributionResultSchema,
} from "@worthlane/contracts";
import { cookies } from "next/headers";
import {
  authenticatedServerRequest,
  errorResponse,
  jsonResponse,
  readJson,
  sameOriginMutationError,
  upstreamUnavailableResponse,
} from "@/src/lib/server-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;

  const body = await request.json().catch(() => null);
  const parsedBody = createHouseholdGoalContributionSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Invalid request body", 400, "INVALID_REQUEST");
  }

  const { id } = await params;

  try {
    const response = await authenticatedServerRequest(
      await cookies(),
      `/households/current/goals/${encodeURIComponent(id)}/contributions`,
      {
        method: "POST",
        body: JSON.stringify(parsedBody.data),
      }
    );
    const payload = await readJson(response);

    if (!response.ok) {
      return payload
        ? jsonResponse(payload, response.status)
        : upstreamUnavailableResponse();
    }

    const parsedResult = householdGoalContributionResultSchema.safeParse(
      (payload as { data?: unknown } | null)?.data
    );
    if (!parsedResult.success) return upstreamUnavailableResponse();

    return jsonResponse({ data: parsedResult.data }, response.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

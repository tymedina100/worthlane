import { householdSummarySchema } from "@worthlane/contracts";
import { cookies } from "next/headers";
import {
  authenticatedServerRequest,
  jsonResponse,
  readJson,
  upstreamUnavailableResponse,
} from "@/src/lib/server-api";

export async function GET() {
  try {
    const response = await authenticatedServerRequest(
      await cookies(),
      "/households/current/summary",
      { method: "GET" }
    );
    const payload = await readJson(response);

    if (!response.ok) {
      return payload
        ? jsonResponse(payload, response.status)
        : upstreamUnavailableResponse();
    }

    const parsed = householdSummarySchema.safeParse(
      (payload as { data?: unknown } | null)?.data
    );
    if (!parsed.success) return upstreamUnavailableResponse();

    return jsonResponse({ data: parsed.data }, response.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

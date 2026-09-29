import { cookies } from "next/headers";
import { authenticatedServerRequest, jsonResponse, sameOriginMutationError, upstreamUnavailableResponse } from "@/src/lib/server-api";

// Only the browser's exclusive session lock calls this route. Other BFF routes
// never rotate credentials, even when deployed to separate function instances.
export async function POST(request: Request) {
  const denied = sameOriginMutationError(request);
  if (denied) return denied;
  try {
    // Probe first: a different tab may already have refreshed these cookies.
    const result = await authenticatedServerRequest(await cookies(), "/accounts", {}, true);
    return jsonResponse(result.ok ? { data: { success: true } } : {
      error: { message: result.status === 401 ? "Session expired" : "Session unavailable" },
    }, result.status);
  } catch { return upstreamUnavailableResponse(); }
}

import { cookies } from "next/headers";
import {
  clearSessionCookies, desktopProxyHeaders, errorResponse, jsonResponse,
  publicServerRequest, readJson, sameOriginMutationError, upstreamUnavailableResponse,
} from "./server-api";

export async function passwordRecoveryRequest(request: Request, action: "forgot-password" | "reset-password") {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return errorResponse("Invalid request body", 400, "INVALID_REQUEST");
  const fields = action === "forgot-password" ? ["email"] : ["token", "newPassword"];
  if (fields.some(field => typeof body[field] !== "string")) {
    return errorResponse("Invalid request body", 400, "INVALID_REQUEST");
  }
  try {
    const response = await publicServerRequest(`/auth/${action}`, {
      method: "POST",
      headers: desktopProxyHeaders(request),
      body: JSON.stringify(Object.fromEntries(fields.map(field => [field, body[field]]))),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await readJson(response);
    if (!payload) return upstreamUnavailableResponse();
    if (response.ok && action === "reset-password") clearSessionCookies(await cookies());
    const result = jsonResponse(payload, response.status);
    result.headers.set("Cache-Control", "no-store");
    return result;
  } catch {
    return upstreamUnavailableResponse();
  }
}

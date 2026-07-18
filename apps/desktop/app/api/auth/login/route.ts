import { cookies } from "next/headers";
import {
  errorResponse,
  getSessionTokens,
  jsonResponse,
  publicServerRequest,
  readJson,
  sameOriginMutationError,
  setSessionCookies,
  upstreamUnavailableResponse,
} from "@/src/lib/server-api";

type LoginPayload = {
  data?: {
    user?: {
      id?: unknown;
      email?: unknown;
    };
  };
};

export async function POST(request: Request) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse("Invalid request body", 400, "INVALID_REQUEST");
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return errorResponse("Invalid request body", 400, "INVALID_REQUEST");
  }

  try {
    const response = await publicServerRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return payload
        ? jsonResponse(payload, response.status)
        : upstreamUnavailableResponse();
    }

    const tokens = getSessionTokens(payload);
    const user = (payload as LoginPayload | null)?.data?.user;
    if (
      !tokens ||
      !user ||
      typeof user.id !== "string" ||
      typeof user.email !== "string"
    ) {
      return upstreamUnavailableResponse();
    }

    setSessionCookies(await cookies(), tokens.accessToken, tokens.refreshToken);

    // Tokens are intentionally removed from the browser-visible response.
    return jsonResponse({ data: { user: { id: user.id, email: user.email } } });
  } catch {
    return upstreamUnavailableResponse();
  }
}

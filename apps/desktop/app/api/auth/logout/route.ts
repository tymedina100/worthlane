import { cookies } from "next/headers";
import {
  authenticatedServerRequest,
  clearSessionCookies,
  jsonResponse,
  REFRESH_TOKEN_COOKIE,
  sameOriginMutationError,
} from "@/src/lib/server-api";

export async function POST(request: Request) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    try {
      // Revoke the server-side token family before removing the only browser
      // copy of the refresh credential. Cookie clearing still completes if the
      // API is temporarily unavailable so the local device is signed out.
      await authenticatedServerRequest(cookieStore, "/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Local cookie removal is the safe fallback for an unavailable backend.
    }
  }
  clearSessionCookies(cookieStore);
  return jsonResponse({ data: { success: true } });
}

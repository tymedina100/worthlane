import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, PLAID_OAUTH_COOKIE } from "@/src/lib/session-cookies";
import type { NextRequest } from "next/server";
import {
  authenticatedServerRequest,
  errorResponse,
  jsonResponse,
  readJson,
  sameOriginMutationError,
  upstreamUnavailableResponse,
} from "@/src/lib/server-api";

// This fingerprint is an extra login-boundary check, never authentication.
// The upstream API still verifies the JWT before any bank mutation. Using the
// stable subject also allows ordinary token refresh during the OAuth round trip.
function sessionOwner(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const token = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  try {
    const subject = JSON.parse(Buffer.from(token?.split(".")[1] ?? "", "base64url").toString()).sub;
    return typeof subject === "string" && subject ? createHash("sha256").update(subject).digest("hex") : null;
  } catch { return null; }
}
function matchesSession(cookieStore: Awaited<ReturnType<typeof cookies>>, nonce: unknown): boolean {
  const owner = sessionOwner(cookieStore);
  return typeof nonce === "string" && Boolean(owner) && nonce.endsWith(`.${owner}`) && cookieStore.get(PLAID_OAUTH_COOKIE)?.value === nonce;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function targetFor(segments: string[], body: unknown) {
  if (segments.length === 1 && segments[0] === "link-token") {
    if (!isRecord(body) || Object.keys(body).some((key) => !["platform", "mode", "plaidItemId", "includeLiabilities"].includes(key))) return null;
    if (body.includeLiabilities !== undefined && typeof body.includeLiabilities !== "boolean") return null;
    if (body.platform !== "web" || !["create", "update"].includes(String(body.mode))) return null;
    if (body.mode === "update" && (typeof body.plaidItemId !== "string" || !body.plaidItemId)) return null;
    if (body.mode === "create" && body.plaidItemId !== undefined) return null;
    return { path: "/plaid/link-token", body };
  }
  if (segments.length === 1 && segments[0] === "exchange") {
    if (!isRecord(body) || Object.keys(body).some((key) => !["publicToken", "institutionName"].includes(key))) return null;
    if (typeof body.publicToken !== "string" || !body.publicToken || body.publicToken.length > 1024) return null;
    if (body.institutionName !== undefined && (typeof body.institutionName !== "string" || body.institutionName.length > 200)) return null;
    return { path: "/plaid/exchange", body };
  }
  if (segments.length === 1 && segments[0] === "sync") {
    if (!isRecord(body) || Object.keys(body).some((key) => !["plaidItemId", "refresh"].includes(key))) return null;
    if (body.plaidItemId !== undefined && (typeof body.plaidItemId !== "string" || !body.plaidItemId)) return null;
    if (body.refresh !== undefined && typeof body.refresh !== "boolean") return null;
    return { path: "/plaid/sync", body };
  }
  if (
    segments.length === 3 &&
    segments[0] === "items" &&
    segments[1] &&
    ["unlink", "liabilities"].includes(segments[2] ?? "") &&
    isRecord(body) &&
    Object.keys(body).length === 0
  ) {
    return {
      path: `/plaid/items/${encodeURIComponent(segments[1])}/${segments[2]}`,
      body,
    };
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ segments: string[] }> }
) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;

  const segments = (await params).segments;
  const body = await request.json().catch(() => null);
  const cookieStore = await cookies();
  if (segments.length === 1 && segments[0] === "oauth-session") {
    if (!isRecord(body) || typeof body.oauthSession !== "string" || !body.oauthSession ||
        !matchesSession(cookieStore, body.oauthSession) ||
        !(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || cookieStore.get(REFRESH_TOKEN_COOKIE)?.value)) {
      return errorResponse("This bank-link session expired or belongs to a previous sign-in. Start again from Accounts.", 409, "OAUTH_SESSION_EXPIRED");
    }
    return jsonResponse({ data: { valid: true } });
  }
  const flowMutation = segments.length === 1 && (segments[0] === "exchange" || (segments[0] === "sync" && isRecord(body) && "oauthSession" in body));
  const nonce = isRecord(body) ? body.oauthSession : undefined;
  const cleanBody = isRecord(body) ? { ...body } : body;
  if (flowMutation && isRecord(cleanBody)) delete cleanBody.oauthSession;
  const target = targetFor(segments, cleanBody);
  if (!target) return errorResponse("Invalid Plaid management request", 400, "VALIDATION_ERROR");
  if (flowMutation) {
    if (!(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || cookieStore.get(REFRESH_TOKEN_COOKIE)?.value)) return errorResponse("Sign in to connect a bank.", 401, "UNAUTHORIZED");
    if (!matchesSession(cookieStore, nonce)) return errorResponse("Bank-link sign-in changed. Start again from Accounts.", 409, "OAUTH_SESSION_EXPIRED");
  }

  try {
    const upstream = await authenticatedServerRequest(cookieStore, target.path, {
      method: "POST",
      body: JSON.stringify(target.body),
    });
    const payload = await readJson(upstream);
    if (upstream.ok && target.path === "/plaid/link-token" && isRecord(payload) && isRecord(payload.data) && typeof payload.data.linkToken === "string") {
      const owner = sessionOwner(cookieStore);
      if (!owner) return errorResponse("Sign in again before connecting a bank.", 401, "UNAUTHORIZED");
      const oauthSession = `${randomUUID()}.${owner}`;
      cookieStore.set(PLAID_OAUTH_COOKIE, oauthSession, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 1800 });
      return jsonResponse({ ...payload, data: { ...payload.data, oauthSession } }, upstream.status);
    }
    return jsonResponse(payload, upstream.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

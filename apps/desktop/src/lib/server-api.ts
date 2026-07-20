import "server-only";

import { createHash } from "crypto";
import { isIP } from "net";
import type { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "./session-cookies";

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./session-cookies";

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_API_URL = "http://localhost:3001/api";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

type SessionPayload = {
  data?: {
    accessToken?: unknown;
    refreshToken?: unknown;
  };
};

type SessionTokens = { accessToken: string; refreshToken: string };
type RefreshAttempt = { status: number; tokens: SessionTokens | null };

const MAX_REFRESH_FLIGHTS = 256;
const refreshFlights = new Map<string, Promise<RefreshAttempt>>();

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

function apiUrl(path: string): string {
  const baseUrl = (process.env.WORTHLANE_API_URL ?? DEFAULT_API_URL).replace(
    /\/+$/,
    ""
  );
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function desktopProxyHeaders(
  request: Request
): HeadersInit | undefined {
  if (process.env.VERCEL !== "1") return undefined;

  const secret = process.env.WORTHLANE_DESKTOP_PROXY_SECRET;
  if (!secret) {
    throw new Error("WORTHLANE_DESKTOP_PROXY_SECRET is required on Vercel");
  }

  // Vercel overwrites these inbound headers, so browser callers cannot spoof
  // the address that is relayed to Worthlane's API.
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim();
  if (!clientIp || !isIP(clientIp)) {
    throw new Error("A valid Vercel client IP header is required");
  }

  return {
    "X-Worthlane-Client-IP": clientIp,
    "X-Worthlane-Proxy-Secret": secret,
  };
}

function sessionTokens(
  payload: unknown
): SessionTokens | null {
  if (!payload || typeof payload !== "object") return null;

  const data = (payload as SessionPayload).data;
  if (
    !data ||
    typeof data.accessToken !== "string" ||
    typeof data.refreshToken !== "string"
  ) {
    return null;
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

async function performRefresh(refreshToken: string): Promise<RefreshAttempt> {
  const response = await requestUpstream("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  return {
    status: response.status,
    tokens: sessionTokens(await readJson(response)),
  };
}

function refreshSessionSingleFlight(refreshToken: string): Promise<RefreshAttempt> {
  const digest = createHash("sha256").update(refreshToken, "utf8").digest("hex");
  const existing = refreshFlights.get(digest);
  if (existing) return existing;

  if (refreshFlights.size >= MAX_REFRESH_FLIGHTS) {
    throw new Error("Too many refresh requests are already in flight");
  }

  const flight = performRefresh(refreshToken).finally(() => {
    refreshFlights.delete(digest);
  });
  refreshFlights.set(digest, flight);
  return flight;
}

function requestHeaders(init: RequestInit, accessToken?: string): Headers {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

function requestUpstream(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    cache: "no-store",
    headers: requestHeaders(init, accessToken),
  });
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function jsonResponse(payload: unknown, status = 200): NextResponse {
  return NextResponse.json(payload, { status });
}

export function errorResponse(
  message: string,
  status: number,
  code: string
): NextResponse {
  return jsonResponse({ error: { message, code } }, status);
}

export function sameOriginMutationError(request: Request): NextResponse | null {
  const origin = request.headers.get("Origin");
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return errorResponse("Request origin is invalid", 403, "ORIGIN_MISMATCH");
  }

  if (!origin) {
    return errorResponse("Request origin is required", 403, "ORIGIN_REQUIRED");
  }

  try {
    if (new URL(origin).origin !== requestOrigin) {
      return errorResponse("Cross-origin request rejected", 403, "ORIGIN_MISMATCH");
    }
  } catch {
    return errorResponse("Request origin is invalid", 403, "ORIGIN_MISMATCH");
  }

  const mediaType = request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return errorResponse(
      "Mutations require application/json",
      415,
      "UNSUPPORTED_MEDIA_TYPE"
    );
  }

  return null;
}

export function upstreamUnavailableResponse(): NextResponse {
  return errorResponse(
    "Worthlane API is unavailable",
    502,
    "UPSTREAM_UNAVAILABLE"
  );
}

export function setSessionCookies(
  cookieStore: CookieStore,
  accessToken: string,
  refreshToken: string
): void {
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(cookieStore: CookieStore): void {
  cookieStore.set(ACCESS_TOKEN_COOKIE, "", {
    ...cookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, "", {
    ...cookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function publicServerRequest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return requestUpstream(path, init);
}

export async function authenticatedServerRequest(
  cookieStore: CookieStore,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  let response = await requestUpstream(path, init, accessToken);
  if (response.status !== 401 || !refreshToken) return response;

  const refreshAttempt = await refreshSessionSingleFlight(refreshToken);
  const refreshedTokens = refreshAttempt.tokens;

  if (refreshAttempt.status < 200 || refreshAttempt.status >= 300 || !refreshedTokens) {
    if (refreshAttempt.status >= 400 && refreshAttempt.status < 500) {
      clearSessionCookies(cookieStore);
      return new Response(
        JSON.stringify({
          error: { message: "Session expired", code: "UNAUTHORIZED" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        error: {
          message: "Worthlane API is unavailable",
          code: "UPSTREAM_UNAVAILABLE",
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  setSessionCookies(
    cookieStore,
    refreshedTokens.accessToken,
    refreshedTokens.refreshToken
  );
  response = await requestUpstream(path, init, refreshedTokens.accessToken);

  if (response.status === 401) clearSessionCookies(cookieStore);
  return response;
}

export function getSessionTokens(
  payload: unknown
): SessionTokens | null {
  return sessionTokens(payload);
}

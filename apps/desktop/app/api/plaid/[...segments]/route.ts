import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  authenticatedServerRequest,
  errorResponse,
  jsonResponse,
  readJson,
  sameOriginMutationError,
  upstreamUnavailableResponse,
} from "@/src/lib/server-api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function targetFor(segments: string[], body: unknown) {
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
    segments[2] === "unlink" &&
    isRecord(body) &&
    Object.keys(body).length === 0
  ) {
    return {
      path: `/plaid/items/${encodeURIComponent(segments[1])}/unlink`,
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

  const target = targetFor((await params).segments, await request.json().catch(() => null));
  if (!target) return errorResponse("Invalid Plaid management request", 400, "VALIDATION_ERROR");

  try {
    const upstream = await authenticatedServerRequest(await cookies(), target.path, {
      method: "POST",
      body: JSON.stringify(target.body),
    });
    return jsonResponse(await readJson(upstream), upstream.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

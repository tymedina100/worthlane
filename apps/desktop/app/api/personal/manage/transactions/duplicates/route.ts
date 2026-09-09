import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { confirmTransactionDuplicateSchema } from "@worthlane/contracts";
import { authenticatedServerRequest, errorResponse, jsonResponse, readJson, sameOriginMutationError, upstreamUnavailableResponse } from "@/src/lib/server-api";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor");
  if (cursor && cursor.length > 191) return errorResponse("Invalid review cursor", 400, "VALIDATION_ERROR");
  try {
    const upstream = await authenticatedServerRequest(await cookies(), `/transactions/duplicates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
    return jsonResponse(await readJson(upstream), upstream.status);
  } catch { return upstreamUnavailableResponse(); }
}

export async function POST(request: NextRequest) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;
  const parsed = confirmTransactionDuplicateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Choose two entries from a current review", 400, "VALIDATION_ERROR");
  try {
    const upstream = await authenticatedServerRequest(await cookies(), "/transactions/duplicates", { method: "POST", body: JSON.stringify(parsed.data) });
    return jsonResponse(await readJson(upstream), upstream.status);
  } catch { return upstreamUnavailableResponse(); }
}

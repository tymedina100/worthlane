import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { debtPlanInputSchema } from "@worthlane/contracts";
import { z } from "zod";
import { authenticatedServerRequest, errorResponse, jsonResponse, readJson, sameOriginMutationError, upstreamUnavailableResponse } from "@/src/lib/server-api";
type Context = { params: Promise<{ segments?: string[] }> };
async function proxy(request: NextRequest, context: Context) {
  if (request.method !== "GET") { const error = sameOriginMutationError(request); if (error) return error; }
  const { segments = [] } = await context.params;
  const upcoming = segments.length === 2 && segments[1] === "upcoming" && request.method === "POST";
  if (!upcoming && (segments.length > 1 || (request.method === "POST" && segments.length) || (request.method === "PATCH" && segments.length !== 1))) return errorResponse("Plan route not found", 404, "NOT_FOUND");
  let body: unknown;
  if (request.method !== "GET") {
    const schema = upcoming ? z.object({ entryId: z.string().min(1).max(100), revision: z.number().int().positive() }).strict() : request.method === "POST" ? debtPlanInputSchema : z.object({ revision: z.number().int().positive(), input: debtPlanInputSchema }).strict();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse("Check the plan details.", 400, "VALIDATION_ERROR");
    body = parsed.data;
  }
  try {
    const response = await authenticatedServerRequest(await cookies(), `/debt-plans${segments.length ? `/${encodeURIComponent(segments[0]!)}` : ""}${upcoming ? "/upcoming" : ""}`, { method: request.method, ...(body ? { body: JSON.stringify(body) } : {}) });
    return jsonResponse(await readJson(response), response.status);
  } catch { return upstreamUnavailableResponse(); }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;

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

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function validMoney(value: unknown, allowZero = false) {
  return typeof value === "number" && Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);
}

function validatePatch(resource: string, body: unknown): Record<string, unknown> | null {
  if (!isRecord(body) || !Object.keys(body).length) return null;
  if (resource === "goals") {
    if (!hasOnlyKeys(body, ["name", "currentAmount", "targetAmount", "targetDate", "icon"])) return null;
    if (
      (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) ||
      (body.currentAmount !== undefined && !validMoney(body.currentAmount, true)) ||
      (body.targetAmount !== undefined && !validMoney(body.targetAmount)) ||
      (body.targetDate !== undefined && body.targetDate !== null && (typeof body.targetDate !== "string" || Number.isNaN(Date.parse(body.targetDate)))) ||
      (body.icon !== undefined && typeof body.icon !== "string")
    ) return null;
    return body;
  }
  if (resource === "accounts") {
    if (!hasOnlyKeys(body, ["name", "institutionName", "type", "currentBalance"])) return null;
    if (
      (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) ||
      (body.institutionName !== undefined && body.institutionName !== null && typeof body.institutionName !== "string") ||
      (body.type !== undefined && !["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "LOAN", "OTHER"].includes(String(body.type))) ||
      (body.currentBalance !== undefined && !validMoney(body.currentBalance, true))
    ) return null;
    return body;
  }
  return null;
}

async function proxy(
  request: NextRequest,
  params: Promise<{ resource: string; id: string }>
) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;
  const { resource, id } = await params;
  if (resource !== "goals" && resource !== "accounts") {
    return errorResponse("Personal finance mutation not found", 404, "NOT_FOUND");
  }

  let body: Record<string, unknown> | undefined;
  if (request.method === "PATCH") {
    body = validatePatch(resource, await request.json().catch(() => null)) ?? undefined;
    if (!body) return errorResponse("Invalid personal finance request", 400, "VALIDATION_ERROR");
  }

  try {
    const upstream = await authenticatedServerRequest(
      await cookies(),
      `/${resource}/${encodeURIComponent(id)}`,
      {
        method: request.method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      }
    );
    return jsonResponse(await readJson(upstream), upstream.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

type Context = { params: Promise<{ resource: string; id: string }> };

export function PATCH(request: NextRequest, context: Context) {
  return proxy(request, context.params);
}

export function DELETE(request: NextRequest, context: Context) {
  return proxy(request, context.params);
}

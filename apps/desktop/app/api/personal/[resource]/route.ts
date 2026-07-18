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

const resourcePaths = {
  accounts: "/accounts",
  budgets: "/budgets",
  categories: "/categories",
  goals: "/goals",
  transactions: "/transactions",
} as const;

type PersonalResource = keyof typeof resourcePaths;

function isPersonalResource(value: string): value is PersonalResource {
  return value in resourcePaths;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function validMoney(value: unknown, { allowZero = false }: { allowZero?: boolean } = {}) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isSafeInteger(Math.round(value * 100)) &&
    (allowZero ? value >= 0 : value > 0)
  );
}

function validateCollectionMutation(resource: string, body: unknown): Record<string, unknown> | null {
  if (!isRecord(body)) return null;
  if (resource === "budgets") {
    if (!hasOnlyKeys(body, ["categoryId", "amount", "period", "rollover"])) return null;
    if (
      typeof body.categoryId !== "string" || !body.categoryId.trim() ||
      !validMoney(body.amount) ||
      (body.period !== "MONTHLY" && body.period !== "WEEKLY") ||
      typeof body.rollover !== "boolean"
    ) return null;
    return body;
  }
  if (resource === "goals") {
    if (!hasOnlyKeys(body, ["name", "targetAmount", "currentAmount", "targetDate", "type", "icon", "linkedBudgetCategoryId"])) return null;
    if (
      typeof body.name !== "string" || !body.name.trim() ||
      !validMoney(body.targetAmount) || !validMoney(body.currentAmount, { allowZero: true }) ||
      !["SAVINGS", "DEBT_PAYOFF", "PURCHASE", "EMERGENCY_FUND"].includes(String(body.type)) ||
      (body.targetDate !== undefined && (typeof body.targetDate !== "string" || Number.isNaN(Date.parse(body.targetDate)))) ||
      (body.icon !== undefined && typeof body.icon !== "string") ||
      (body.linkedBudgetCategoryId !== undefined && typeof body.linkedBudgetCategoryId !== "string")
    ) return null;
    return body;
  }
  if (resource === "accounts") {
    if (!hasOnlyKeys(body, ["name", "institutionName", "type", "currentBalance"])) return null;
    if (
      typeof body.name !== "string" || !body.name.trim() ||
      (body.institutionName !== undefined && typeof body.institutionName !== "string") ||
      !["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "LOAN", "OTHER"].includes(String(body.type)) ||
      !validMoney(body.currentBalance, { allowZero: true })
    ) return null;
    return body;
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  if (!isPersonalResource(resource)) {
    return errorResponse("Personal finance resource not found", 404, "NOT_FOUND");
  }

  const upstreamPath = `${resourcePaths[resource]}${request.nextUrl.search}`;

  try {
    const cookieStore = await cookies();
    const upstream = await authenticatedServerRequest(cookieStore, upstreamPath);
    const payload = await readJson(upstream);
    return jsonResponse(payload, upstream.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;

  const { resource } = await params;
  if (!(["accounts", "budgets", "goals"] as string[]).includes(resource)) {
    return errorResponse("Personal finance mutation not found", 404, "NOT_FOUND");
  }
  const body = validateCollectionMutation(resource, await request.json().catch(() => null));
  if (!body) return errorResponse("Invalid personal finance request", 400, "VALIDATION_ERROR");

  try {
    const cookieStore = await cookies();
    const upstream = await authenticatedServerRequest(cookieStore, `/${resource}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return jsonResponse(await readJson(upstream), upstream.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

import {
  acceptHouseholdPartnerInviteSchema,
  createHouseholdGoalSchema,
  createHouseholdResponsibilitySchema,
  linkHouseholdPartnerSchema,
  setHouseholdIncomeBasesSchema,
  setHouseholdAccountVisibilitySchema,
  updateHouseholdGoalSchema,
  updateHouseholdResponsibilitySchema,
} from "@worthlane/contracts";
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

type MutationKind =
  | "account-visibility"
  | "create-responsibility"
  | "update-responsibility"
  | "create-goal"
  | "update-goal"
  | "link-partner"
  | "accept-partner"
  | "income-bases";

type ProxyTarget = {
  path: string;
  mutationKind?: MutationKind;
};

function targetFor(method: string, segments: string[]): ProxyTarget | null {
  if (segments.length === 1 && segments[0] === "responsibilities") {
    if (method === "GET") return { path: "/households/current/responsibilities" };
    if (method === "POST") {
      return {
        path: "/households/current/responsibilities",
        mutationKind: "create-responsibility",
      };
    }
  }
  if (segments.length === 2 && segments[0] === "responsibilities") {
    const id = encodeURIComponent(segments[1]);
    if (method === "PUT") {
      return {
        path: `/households/current/responsibilities/${id}`,
        mutationKind: "update-responsibility",
      };
    }
    if (method === "DELETE") {
      return { path: `/households/current/responsibilities/${id}` };
    }
  }
  if (segments.length === 1 && segments[0] === "goals") {
    if (method === "GET") return { path: "/households/current/goals" };
    if (method === "POST") {
      return { path: "/households/current/goals", mutationKind: "create-goal" };
    }
  }
  if (segments.length === 2 && segments[0] === "goals" && method === "PUT") {
    return {
      path: `/households/current/goals/${encodeURIComponent(segments[1])}`,
      mutationKind: "update-goal",
    };
  }
  if (
    segments.length === 3 &&
    segments[0] === "accounts" &&
    segments[2] === "visibility" &&
    method === "PATCH"
  ) {
    return {
      path: `/households/current/accounts/${encodeURIComponent(segments[1])}/visibility`,
      mutationKind: "account-visibility",
    };
  }
  if (segments.length === 2 && segments[0] === "accounts" && method === "GET") {
    return { path: `/households/current/accounts/${encodeURIComponent(segments[1])}` };
  }
  if (
    segments.length === 2 &&
    segments[0] === "partners" &&
    segments[1] === "link" &&
    method === "POST"
  ) {
    return { path: "/households/current/partners/link", mutationKind: "link-partner" };
  }
  if (segments.length === 1 && segments[0] === "invitations" && method === "GET") {
    return { path: "/households/invitations" };
  }
  if (segments.length === 1 && segments[0] === "income-bases" && method === "PATCH") {
    return {
      path: "/households/current/income-bases",
      mutationKind: "income-bases",
    };
  }
  if (
    segments.length === 2 &&
    segments[0] === "invitations" &&
    segments[1] === "accept" &&
    method === "POST"
  ) {
    return {
      path: "/households/invitations/accept",
      mutationKind: "accept-partner",
    };
  }
  return null;
}

function validateMutation(kind: MutationKind, body: unknown) {
  if (kind === "account-visibility") return setHouseholdAccountVisibilitySchema.safeParse(body);
  if (kind === "create-responsibility") return createHouseholdResponsibilitySchema.safeParse(body);
  if (kind === "update-responsibility") return updateHouseholdResponsibilitySchema.safeParse(body);
  if (kind === "create-goal") return createHouseholdGoalSchema.safeParse(body);
  if (kind === "update-goal") return updateHouseholdGoalSchema.safeParse(body);
  if (kind === "link-partner") return linkHouseholdPartnerSchema.safeParse(body);
  if (kind === "income-bases") return setHouseholdIncomeBasesSchema.safeParse(body);
  return acceptHouseholdPartnerInviteSchema.safeParse(body);
}

async function proxy(
  request: NextRequest,
  params: Promise<{ segments: string[] }>
) {
  if (request.method !== "GET") {
    const originError = sameOriginMutationError(request);
    if (originError) return originError;
  }

  const { segments } = await params;
  const target = targetFor(request.method, segments);
  if (!target) {
    return errorResponse("Household management route not found", 404, "NOT_FOUND");
  }

  let body: unknown;
  if (target.mutationKind) {
    body = await request.json().catch(() => null);
    const parsed = validateMutation(target.mutationKind, body);
    if (!parsed.success) {
      return errorResponse("Invalid household management request", 400, "VALIDATION_ERROR");
    }
    body = parsed.data;
  }

  try {
    const cookieStore = await cookies();
    const upstream = await authenticatedServerRequest(cookieStore, target.path, {
      method: request.method,
      ...(target.mutationKind ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await readJson(upstream);
    return jsonResponse(payload, upstream.status);
  } catch {
    return upstreamUnavailableResponse();
  }
}

type RouteContext = { params: Promise<{ segments: string[] }> };

export function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context.params);
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context.params);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context.params);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context.params);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context.params);
}

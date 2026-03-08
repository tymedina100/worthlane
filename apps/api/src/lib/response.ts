import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function err(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return err(message, 401, "UNAUTHORIZED");
}

export function notFound(message = "Not found") {
  return err(message, 404, "NOT_FOUND");
}

export function withAuth<T>(
  handler: (req: T, userId: string) => Promise<NextResponse>
) {
  return async (req: T & { headers: Headers }) => {
    const { getAuthUser } = await import("./auth");
    try {
      const user = getAuthUser(req as unknown as import("next/server").NextRequest);
      return handler(req, user.sub);
    } catch {
      return unauthorized();
    }
  };
}

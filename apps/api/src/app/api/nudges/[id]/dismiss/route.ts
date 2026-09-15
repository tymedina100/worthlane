import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog";
import { ok, unauthorized, notFound } from "@/lib/response";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const nudge = await prisma.nudge.findFirst({ where: { id: params.id, userId } });
  if (!nudge) return notFound();

  await prisma.nudge.update({ where: { id: params.id }, data: { dismissed: true } });

  await captureServerEvent({
    distinctId: userId,
    event: "nudge dismissed",
    properties: {
      nudgeId: nudge.id,
      nudgeType: nudge.type,
    },
  });

  return ok({ dismissed: true });
}

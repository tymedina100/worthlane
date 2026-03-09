import { NextRequest } from "next/server";
import Expo from "expo-server-sdk";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    const payload = getAuthUser(req);
    userId = payload.sub;
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const { token } = body as { token?: string };

  if (!token || !Expo.isExpoPushToken(token)) {
    return err("Invalid push token", 400);
  }

  await prisma.user.update({ where: { id: userId }, data: { pushToken: token } });

  return ok({ registered: true });
}

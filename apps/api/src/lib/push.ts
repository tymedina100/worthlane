import Expo, { ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@finance/db";

const expo = new Expo();

/**
 * Sends a push notification to a user if they have a registered push token.
 * Silently no-ops if the user has no token or if the token is invalid.
 */
export async function sendPushToUser(userId: string, message: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });

  if (!user?.pushToken) return;
  if (!Expo.isExpoPushToken(user.pushToken)) return;

  const msg: ExpoPushMessage = {
    to: user.pushToken,
    sound: "default",
    body: message,
    data: {},
  };

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([msg]);
    if (ticket.status === "error") {
      // Token may be expired — clear it so we don't keep trying
      if (ticket.details?.error === "DeviceNotRegistered") {
        await prisma.user.update({ where: { id: userId }, data: { pushToken: null } });
      }
    }
  } catch {
    // Non-fatal — nudge is still saved in DB
  }
}

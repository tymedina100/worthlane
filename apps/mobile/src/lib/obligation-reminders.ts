import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { ReminderTiming, UpcomingObligation } from "@worthlane/types";

// Serialize native notification changes so a permission prompt cannot race logout.
let activeUser: string | null = null;
// Expo otherwise suppresses notifications while the app is open. Decide from
// the current session synchronously so a previous login cannot show a reminder.
Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const data = notification.request.content.data;
    const owned = !!activeUser && data?.reminderUserId === activeUser &&
      (typeof data.obligationId === "string" || data.reminderTest === true);
    return { shouldShowBanner: owned, shouldShowList: owned, shouldPlaySound: owned, shouldSetBadge: false };
  },
});
let generation = 0;
let pending: Promise<unknown> = Promise.resolve();
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work, work);
  pending = result.catch(() => undefined);
  return result;
}
const defaultKey = (userId: string) => `worthlane:default-reminder:${userId}`;
const notificationKey = (userId: string, id: string) => `worthlane:obligation-reminder:${userId}:${id}`;

export function setReminderSession(userId: string | null): Promise<void> {
  activeUser = userId;
  generation++;
  return enqueue(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      const data = notification.content.data;
      if ((data?.obligationId || data?.reminderTest) && (!userId || data.reminderUserId !== userId)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notification of presented) {
      if (notification.request.content.data?.obligationId || notification.request.content.data?.reminderTest) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
    // Old unscoped defaults are deliberately not inherited by another login.
  });
}
export async function getDefaultReminder(userId: string | null): Promise<ReminderTiming> {
  if (!userId || userId !== activeUser) return "NONE";
  const value = await AsyncStorage.getItem(defaultKey(userId));
  return (["DUE_DATE", "ONE_DAY_BEFORE", "THREE_DAYS_BEFORE", "NONE"].includes(value ?? "") ? value : "NONE") as ReminderTiming;
}
export async function setDefaultReminder(userId: string | null, value: ReminderTiming) {
  if (!userId || userId !== activeUser) return;
  await AsyncStorage.setItem(defaultKey(userId), value);
}
async function cancel(userId: string, id: string) {
  const key = notificationKey(userId, id);
  const stored = await AsyncStorage.getItem(key);
  if (stored) await Notifications.cancelScheduledNotificationAsync(stored);
  await AsyncStorage.removeItem(key);
}
export function cancelObligationReminder(userId: string | null, id: string) {
  return enqueue(async () => { if (userId && userId === activeUser) await cancel(userId, id); });
}
async function schedule(userId: string | null, item: UpcomingObligation, started: number, requestPermission: boolean) {
    if (!userId || userId !== activeUser || started !== generation) return "not-scheduled" as const;
    await cancel(userId, item.id);
    const timing = item.reminderTiming ?? (await getDefaultReminder(userId));
    if (timing === "NONE" || item.isPaid || !item.isActive) return "not-scheduled" as const;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("obligations", { name: "Upcoming reminders", importance: Notifications.AndroidImportance.DEFAULT });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted" && requestPermission) permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") return "denied" as const;
    if (started !== generation || userId !== activeUser) return "not-scheduled" as const;

    const days = timing === "THREE_DAYS_BEFORE" ? 3 : timing === "ONE_DAY_BEFORE" ? 1 : 0;
    const [year, month, day] = item.dueDate.split("-").map(Number);
    const trigger = new Date(year, month - 1, day - days, 9, 0, 0);
    if (trigger <= new Date()) return "past" as const;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Upcoming payment", body: "Open Worthlane to review your upcoming items.", sound: "default", data: { obligationId: item.id, reminderUserId: userId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger, ...(Platform.OS === "android" ? { channelId: "obligations" } : {}) },
    });
    if (started !== generation || userId !== activeUser) {
      await Notifications.cancelScheduledNotificationAsync(id);
      return "not-scheduled" as const;
    }
    await AsyncStorage.setItem(notificationKey(userId, item.id), id);
    return "scheduled" as const;
}

export function scheduleObligationReminder(userId: string | null, item: UpcomingObligation) {
  const started = generation;
  return enqueue(() => schedule(userId, item, started, true));
}

// Fetch inside the same queue as edits: an older server snapshot cannot finish
// after a newer local schedule operation and overwrite it.
export function reconcileObligationReminders(userId: string, load: () => Promise<UpcomingObligation[]>) {
  const started = generation;
  return enqueue(async () => {
    if (userId !== activeUser || started !== generation) return "stale" as const;
    // A stalled network request must not indefinitely hold logout cleanup.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const items = await Promise.race([
      load(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Reminder refresh timed out")), 15_000); }),
    ]).finally(() => clearTimeout(timeout));
    if (userId !== activeUser || started !== generation) return "stale" as const;
    const ids = new Set(items.map(item => item.id));
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      const data = notification.content.data;
      if (data?.reminderUserId === userId && typeof data.obligationId === "string" && !ids.has(data.obligationId)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        await AsyncStorage.removeItem(notificationKey(userId, data.obligationId));
      }
    }
    let denied = false;
    for (const item of items) {
      if (userId !== activeUser || started !== generation) return "stale" as const;
      if (await schedule(userId, item, started, false) === "denied") denied = true;
    }
    return denied ? "denied" as const : "checked" as const;
  });
}


/** Let a signed-in person verify device delivery without exposing financial data. */
export function sendTestReminder(userId: string | null) {
  const started = generation;
  return enqueue(async () => {
    const current = () => !!userId && userId === activeUser && started === generation;
    if (!current()) return "not-scheduled" as const;
    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") return "denied" as const;
    if (!current()) return "not-scheduled" as const;
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("obligations", { name: "Upcoming reminders", importance: Notifications.AndroidImportance.DEFAULT });
    for (const notification of await Notifications.getAllScheduledNotificationsAsync()) {
      if (notification.content.data?.reminderTest) await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    for (const notification of await Notifications.getPresentedNotificationsAsync()) {
      if (notification.request.content.data?.reminderTest) await Notifications.dismissNotificationAsync(notification.request.identifier);
    }
    if (!current()) return "not-scheduled" as const;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Your test reminder", body: "Worthlane reminders can reach this device. No payment is due from this test.", sound: "default", data: { reminderTest: true, reminderUserId: userId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, repeats: false, ...(Platform.OS === "android" ? { channelId: "obligations" } : {}) },
    });
    if (!current()) { await Notifications.cancelScheduledNotificationAsync(id); return "not-scheduled" as const; }
    return "scheduled" as const;
  });
}

/** OS evidence only: absence is inconclusive because people can dismiss alerts. */
export function getTestReminderStatus(userId: string | null) {
  const started = generation;
  return enqueue(async () => {
    if (!userId || userId !== activeUser || started !== generation) return "stale" as const;
    const [scheduled, presented] = await Promise.all([
      Notifications.getAllScheduledNotificationsAsync(),
      Notifications.getPresentedNotificationsAsync(),
    ]);
    if (userId !== activeUser || started !== generation) return "stale" as const;
    const owned = (data: Record<string, unknown>) => data?.reminderTest === true && data?.reminderUserId === userId;
    if (scheduled.some(n => owned(n.content.data))) return "pending" as const;
    if (presented.some(n => owned(n.request.content.data))) return "presented" as const;
    return "unknown" as const;
  });
}

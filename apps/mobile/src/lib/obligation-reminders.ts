import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { ReminderTiming, UpcomingObligation } from "@worthlane/types";

const DEFAULT_KEY = "worthlane:default-reminder";
const notificationKey = (id: string) => `worthlane:obligation-reminder:${id}`;

export async function getDefaultReminder(): Promise<ReminderTiming> {
  return ((await AsyncStorage.getItem(DEFAULT_KEY)) as ReminderTiming | null) ?? "ONE_DAY_BEFORE";
}

export async function setDefaultReminder(value: ReminderTiming) {
  await AsyncStorage.setItem(DEFAULT_KEY, value);
}

export async function cancelObligationReminder(id: string) {
  const stored = await AsyncStorage.getItem(notificationKey(id));
  if (stored) await Notifications.cancelScheduledNotificationAsync(stored).catch(() => undefined);
  await AsyncStorage.removeItem(notificationKey(id));
}

export async function scheduleObligationReminder(item: UpcomingObligation) {
  await cancelObligationReminder(item.id);
  const timing = item.reminderTiming ?? (await getDefaultReminder());
  if (timing === "NONE" || item.isPaid || !item.isActive) return "not-scheduled" as const;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("obligations", { name: "Upcoming reminders", importance: Notifications.AndroidImportance.DEFAULT });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return "denied" as const;

  const days = timing === "THREE_DAYS_BEFORE" ? 3 : timing === "ONE_DAY_BEFORE" ? 1 : 0;
  const [year, month, day] = item.dueDate.split("-").map(Number);
  const trigger = new Date(year, month - 1, day - days, 9, 0, 0);
  if (trigger <= new Date()) return "past" as const;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: "Upcoming payment", body: `${item.name} is due ${days === 0 ? "today" : `in ${days} ${days === 1 ? "day" : "days"}`}.`, sound: "default", data: { obligationId: item.id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
  });
  await AsyncStorage.setItem(notificationKey(item.id), id);
  return "scheduled" as const;
}

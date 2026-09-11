import { useEffect, useState } from "react";
import { AppState, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { UpcomingObligationsResponse } from "@worthlane/types";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { reconcileObligationReminders } from "@/lib/obligation-reminders";

export function ReminderSync() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(state => state.userId);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    let disposed = false;
    let running = false;
    setWarning("");
    if (!userId) return;
    async function sync() {
      if (running || disposed) return;
      running = true;
      try {
        const result = await reconcileObligationReminders(userId!, async () =>
          (await api.get<UpcomingObligationsResponse>("/upcoming")).items);
        if (!disposed) setWarning(result === "denied" ? "Device reminders are disabled. Check notification settings." : "");
      } catch {
        if (!disposed) setWarning("Device reminders could not refresh. Check Upcoming before relying on a reminder.");
      } finally { running = false; }
    }
    void sync();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void sync(); });
    return () => { disposed = true; listener.remove(); };
  }, [userId]);
  return userId && warning ? <Text accessibilityRole="alert" style={{ backgroundColor: "#fff4dc", color: "#493b20", padding: 12, paddingTop: insets.top + 12 }}>{warning}</Text> : null;
}

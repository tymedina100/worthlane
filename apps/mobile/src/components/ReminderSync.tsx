import { useEffect, useState } from "react";
import { AppState, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { UpcomingObligationsResponse } from "@worthlane/types";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { reconcileObligationReminders } from "@/lib/obligation-reminders";

export function ReminderSync() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(state => state.userId);
  const [warning, setWarning] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [retryable, setRetryable] = useState(false);
  useEffect(() => {
    let disposed = false;
    let running = false;
    setWarning("");
    setRetryable(false);
    if (!userId) return;
    async function sync() {
      if (running || disposed) return;
      running = true;
      try {
        const result = await reconcileObligationReminders(userId!, async () =>
          (await api.get<UpcomingObligationsResponse>("/upcoming")).items);
        if (!disposed) {
          setWarning(result === "denied" ? "Device reminders are disabled. Check notification settings." : "");
          setRetryable(false);
        }
      } catch {
        if (!disposed) {
          setWarning("Device reminders could not refresh. Check Upcoming before relying on a reminder.");
          setRetryable(true);
        }
      } finally { running = false; }
    }
    void sync();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void sync(); });
    return () => { disposed = true; listener.remove(); };
  }, [userId, retryCount]);
  return userId && warning ? (
    <View style={{ backgroundColor: "#fff4dc", padding: 12, paddingTop: insets.top + 12 }}>
      <Text accessibilityRole="alert" style={{ color: "#493b20" }}>{warning}</Text>
      {retryable && <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Retry device reminder refresh"
        onPress={() => { setWarning(""); setRetryable(false); setRetryCount(count => count + 1); }}
        style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
      >
        <Text style={{ color: "#493b20", fontWeight: "700", textDecorationLine: "underline" }}>Retry reminder refresh</Text>
      </TouchableOpacity>}
    </View>
  ) : null;
}

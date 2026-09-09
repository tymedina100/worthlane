import { useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { upcomingInputSchema } from "@worthlane/contracts";
import type { UpcomingObligation, ReminderTiming } from "@worthlane/types";
import { useAuthStore } from "@/store/auth";
import { api, ApiError } from "@/lib/api";
import { scheduleObligationReminder } from "@/lib/obligation-reminders";
import { useTheme } from "@/lib/ThemeContext";

export function UpcomingEditor({ item, userId, onClose }: { item: UpcomingObligation; userId: string; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount.toFixed(2));
  const [dueDate, setDueDate] = useState(item.dueDate);
  const [frequency, setFrequency] = useState(item.frequency);
  const [timing, setTiming] = useState<ReminderTiming | null>(item.reminderTiming);
  const [active, setActive] = useState(item.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = name !== item.name || amount !== item.amount.toFixed(2) || dueDate !== item.dueDate || frequency !== item.frequency || timing !== item.reminderTiming || active !== item.isActive;
  const close = () => {
    if (busy) return;
    if (!dirty) return onClose();
    Alert.alert("Discard changes?", "Your saved item will stay as it was.", [{ text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: onClose }]);
  };
  async function save() {
    const parsed = upcomingInputSchema.partial().safeParse({ name, amount: Number(amount), dueDate, frequency, reminderTiming: timing, isActive: active });
    if (!parsed.success) { setError("Enter a name, a positive amount with at most two decimal places, and a valid date in YYYY-MM-DD format."); return; }
    if (useAuthStore.getState().userId !== userId) return;
    setBusy(true); setError("");
    try {
      const updated = await api.patch<UpcomingObligation>(`/upcoming/${encodeURIComponent(item.id)}`, { ...parsed.data, expectedUpdatedAt: item.updatedAt });
      if (useAuthStore.getState().userId !== userId) return;
      const reminder = await scheduleObligationReminder(userId, updated).catch(() => "unavailable" as const);
      await qc.invalidateQueries({ queryKey: ["upcoming"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (useAuthStore.getState().userId !== userId) return;
      onClose();
      Alert.alert("Saved", reminder === "denied" || reminder === "unavailable" ? "Your item was saved, but its device reminder is unavailable. Check notification settings." : reminder === "past" ? "Your item was saved. The selected reminder time has already passed, so no reminder was scheduled." : "Your upcoming item has been updated.");
    } catch (err) { if (err instanceof ApiError && err.status === 409) await qc.invalidateQueries({ queryKey: ["upcoming"] }); setError(err instanceof Error ? err.message : "Could not save. Your edits are still here."); }
    finally { setBusy(false); }
  }
  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, backgroundColor: colors.surface };
  const choices = <T extends string | null,>(label: string, selected: T, options: [T, string][], select: (value: T) => void) => <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: "600" }}>{label}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{options.map(([value, title]) => <TouchableOpacity key={String(value)} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: value === selected }} onPress={() => select(value)} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: value === selected ? colors.primary : colors.border }}><Text style={{ color: colors.text }}>{title}</Text></TouchableOpacity>)}</View></View>;
  return <Modal animationType="slide" onRequestClose={close}><ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30, gap: 16 }}>
    <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>Edit upcoming item</Text>
    <Text style={{ color: colors.text }}>Only you can see this item. Use a confirmed bill date; predictions are not due dates.</Text>
    <Text style={{ color: colors.text }}>Name</Text><TextInput accessibilityLabel="Name" value={name} onChangeText={setName} maxLength={120} editable={!busy} style={inputStyle} />
    <Text style={{ color: colors.text }}>Amount (USD)</Text><TextInput accessibilityLabel="Amount in USD" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy} style={inputStyle} />
    <Text style={{ color: colors.text }}>Confirmed due date (YYYY-MM-DD)</Text><TextInput accessibilityLabel="Confirmed due date" value={dueDate} onChangeText={setDueDate} autoCapitalize="none" editable={!busy} style={inputStyle} />
    {choices("Repeat", frequency, [[null, "One date only"], ["WEEKLY", "Weekly"], ["BIWEEKLY", "Every two weeks"], ["MONTHLY", "Monthly"], ["QUARTERLY", "Quarterly"], ["YEARLY", "Yearly"]], setFrequency)}
    {choices("Device reminder", timing, [[null, "Use my default"], ["NONE", "Off"], ["DUE_DATE", "On due date"], ["ONE_DAY_BEFORE", "One day before"], ["THREE_DAYS_BEFORE", "Three days before"]], setTiming)}
    <Text style={{ color: colors.text }}>Reminders use 9 a.m. in this device’s timezone. Desktop changes refresh when this app returns to the foreground. Logout clears this device’s reminders.</Text>
    <TouchableOpacity disabled={busy} accessibilityRole="switch" accessibilityState={{ checked: active }} onPress={() => setActive(value => !value)}><Text style={{ color: colors.primary, paddingVertical: 12 }}>Active: {active ? "Yes" : "No"}</Text></TouchableOpacity>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={() => void save()} style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 8 }}><Text style={{ color: colors.onPrimary, textAlign: "center", fontWeight: "700" }}>{busy ? "Saving…" : "Save changes"}</Text></TouchableOpacity>
    <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={close}><Text style={{ color: colors.primary, padding: 16, textAlign: "center" }}>Cancel</Text></TouchableOpacity>
  </ScrollView></Modal>;
}

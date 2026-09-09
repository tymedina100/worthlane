import { useState } from "react";
import { UpcomingEditor } from "@/components/UpcomingEditor";
import { useAuthStore } from "@/store/auth";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpcomingObligation, UpcomingObligationsResponse } from "@worthlane/types";
import { api } from "@/lib/api";
import { cancelObligationReminder, scheduleObligationReminder } from "@/lib/obligation-reminders";
import { spacing, radius } from "@/lib/theme";
import { useThemedStyles, type Theme } from "@/lib/ThemeContext";
import { captureV1Event } from "@/lib/v1-analytics";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const groups = (items: UpcomingObligation[]) => {
  const result: Record<string, UpcomingObligation[]> = { Overdue: [], Today: [], Upcoming: [], "Recently paid": [], Inactive: [] };
  for (const item of items) {
    if (!item.isActive) { result.Inactive.push(item); continue; }
    if (item.isPaid) { result["Recently paid"].push(item); continue; }
    if (item.status === "OVERDUE") result.Overdue.push(item);
    else if (item.status === "DUE_TODAY") result.Today.push(item);
    else result.Upcoming.push(item);
  }
  return result;
};

export default function UpcomingScreen() {
  const userId = useAuthStore(state => state.userId);
  return userId ? <UpcomingContent key={userId} userId={userId} /> : null;
}
function UpcomingContent({ userId }: { userId: string }) {
  const [editing, setEditing] = useState<UpcomingObligation | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["upcoming", userId], queryFn: () => api.get<UpcomingObligationsResponse>("/upcoming") });
  const update = useMutation({
    mutationFn: async ({ item, action }: { item: UpcomingObligation; action: "markPaid" | "markUnpaid" }) => {
      const updated = await api.post<UpcomingObligation>(`/upcoming/${item.id}`, { action });
      if (action === "markPaid") captureV1Event("upcoming_item_marked_paid");
      await scheduleObligationReminder(userId, updated).catch(() => { Alert.alert("Payment status saved", "The device reminder could not be updated. Check notification settings before relying on it."); });
      return updated;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["upcoming"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
  const remove = useMutation({
    mutationFn: async (item: UpcomingObligation) => { await cancelObligationReminder(userId, item.id); return api.delete(`/upcoming/${item.id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["upcoming"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
  const data = query.data?.items ?? [];
  const grouped = groups(data);
  return <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
    <View style={styles.header}><View><Text style={styles.title}>Upcoming</Text><Text style={styles.subtitle}>A simple view of what needs your attention next.</Text></View><TouchableOpacity style={styles.add} onPress={() => router.push("/quick-add?kind=bill" as any)} accessibilityLabel="Add upcoming item"><Text style={styles.addText}>Add</Text></TouchableOpacity></View>
    {query.isLoading ? <Text style={styles.muted}>Loading upcoming items…</Text> : null}
    {query.isError ? <View style={styles.card}><Text style={styles.error}>Could not load upcoming items.</Text><TouchableOpacity onPress={() => query.refetch()}><Text style={styles.link}>Try again</Text></TouchableOpacity></View> : null}
    {!query.isLoading && !query.isError && !data.length ? <View style={styles.card}><Text style={styles.emptyTitle}>Nothing is due yet.</Text><Text style={styles.muted}>Add a bill, card payment, subscription, or another recurring payment to see it here.</Text><TouchableOpacity onPress={() => router.push("/quick-add?kind=bill" as any)}><Text style={styles.link}>Add an upcoming bill</Text></TouchableOpacity></View> : null}
    {Object.entries(grouped).map(([title, items]) => items.length ? <View key={title} style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{items.map((item) => <View key={item.id} style={styles.row}><View style={styles.rowMain}><Text style={styles.name}>{item.name}</Text><Text style={styles.muted}>{item.type.replace("_", " ")} · {item.dueDate}{item.frequency ? ` · ${item.frequency.toLowerCase()}` : ""}</Text></View><View style={styles.actions}><TouchableOpacity accessibilityLabel={`Edit ${item.name}`} onPress={() => setEditing(item)} disabled={update.isPending || remove.isPending}><Text style={styles.link}>Edit</Text></TouchableOpacity><Text style={styles.amount}>{money(item.amount)}</Text><TouchableOpacity onPress={() => update.mutate({ item, action: item.isPaid ? "markUnpaid" : "markPaid" })} disabled={update.isPending}><Text style={styles.link}>{item.isPaid ? "Unpaid" : "Paid"}</Text></TouchableOpacity><TouchableOpacity onPress={() => Alert.alert("Delete this item?", "Its scheduled reminder will also be removed.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => remove.mutate(item) }])} disabled={remove.isPending}><Text style={styles.delete}>Delete</Text></TouchableOpacity></View></View>)}</View> : null)}{editing && <UpcomingEditor key={editing.id} item={editing} userId={userId} onClose={() => setEditing(null)} />}</ScrollView>;
}
const createStyles = ({ colors, typography }: Theme) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.bg }, content: { padding: spacing.md, paddingBottom: spacing.xxl }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg }, title: { ...typography.h2 }, subtitle: { ...typography.bodySmall, marginTop: spacing.xs, maxWidth: 260 }, add: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full }, addText: { color: colors.onPrimary, fontWeight: "700" }, section: { marginBottom: spacing.lg }, sectionTitle: { ...typography.label, color: colors.textMuted, textTransform: "uppercase", marginBottom: spacing.sm }, card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm }, row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, flexDirection: "row", marginBottom: spacing.sm }, rowMain: { flex: 1 }, name: { ...typography.label }, muted: { ...typography.caption, marginTop: 3 }, amount: { ...typography.label, textAlign: "right" }, actions: { alignItems: "flex-end", gap: 4 }, link: { color: colors.primary, fontWeight: "700", marginTop: spacing.sm }, delete: { color: colors.danger, fontWeight: "600" }, error: { ...typography.label, color: colors.danger }, emptyTitle: { ...typography.h3 } });

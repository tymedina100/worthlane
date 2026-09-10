import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionDuplicatesSchema, type TransactionDuplicates } from "@worthlane/contracts";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/lib/ThemeContext";

type Review = TransactionDuplicates["entries"][number];
function DuplicateReview({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const [cursor, setCursor] = useState<string | null>(null);
  const qc = useQueryClient();
  const review = useQuery({ queryKey: ["transactions", "duplicate-review", userId, cursor], queryFn: async () => transactionDuplicatesSchema.parse(await api.get(`/transactions/duplicates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`)) });
  const confirm = useMutation({
    mutationFn: ({ manual, bank }: { manual: Review["manual"]; bank: Review["bankMatches"][number] }) => {
      if (useAuthStore.getState().userId !== userId) throw new Error("Your session changed. Reopen the review.");
      return api.post("/transactions/duplicates", { manualId: manual.id, bankId: bank.id, manualUpdatedAt: manual.updatedAt, bankUpdatedAt: bank.updatedAt });
    },
    onSuccess: async () => {
      if (useAuthStore.getState().userId !== userId) return;
      await Promise.all(["transactions", "dashboard", "household-summary", "budgets", "goals"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      Alert.alert("Manual copy excluded", "Both entries remain in Activity. Use Budget treatment on the manual entry to restore it if needed. The bank entry keeps its own sharing rules.");
    },
    onError: async error => {
      if (useAuthStore.getState().userId !== userId) return;
      await review.refetch();
      if (useAuthStore.getState().userId === userId) Alert.alert("Not confirmed", error instanceof Error ? error.message : "Refresh and try again.");
    },
  });
  const button = (label: string, action: () => void) => <TouchableOpacity accessibilityRole="button" disabled={confirm.isPending} onPress={action} style={{ padding: 14, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, opacity: confirm.isPending ? 0.5 : 1 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>{label}</Text></TouchableOpacity>;
  const description = (row: Review["manual"]) => `${row.merchantName || "No description"} · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount)}\n${row.date.slice(0, 10)} · ${row.accountName}`;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
    {button("Back to Activity", () => router.back())}
    <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>Review possible duplicates</Text>
    <Text style={{ color: colors.text }}>Only your entries are compared. Equal amounts within three days are suggestions, not confirmed matches. Check the descriptions and accounts before excluding anything.</Text>
    <Text style={{ color: colors.textMuted }}>Positive amounts are expenses; negative amounts are credits. Review covers 20 manual entries per page across your history, with up to five bank suggestions per entry.</Text>
    {review.isPending && <Text style={{ color: colors.text }}>Loading review…</Text>}
    {review.isError && button("Could not load review. Retry", () => void review.refetch())}
    {review.data && !review.data.entries.length && <Text style={{ color: colors.text }}>No possible matches among these {review.data.reviewedCount} manual entries.</Text>}
    {review.data?.entries.map(row => <View key={row.manual.id} style={{ padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
      <Text style={{ fontWeight: "700", color: colors.text }}>Manual entry</Text><Text style={{ color: colors.text }}>{description(row.manual)}</Text>
      {row.bankMatches.map(bank => <View key={bank.id} style={{ gap: 8 }}><Text style={{ fontWeight: "700", color: colors.text }}>Possible bank match</Text><Text style={{ color: colors.text }}>{description(bank)}</Text>
        {button("Same transaction — exclude manual copy", () => Alert.alert("Confirm duplicate?", "Only confirm if these are the same transaction. Both records remain, but the manual copy stops counting. The bank entry's sharing rules apply, so household totals may change. If the bank entry disappears, review and restore the manual entry in Activity.", [{ text: "Keep both", style: "cancel" }, { text: "Exclude manual copy", onPress: () => confirm.mutate({ manual: row.manual, bank }) }]))}
      </View>)}
      {row.moreMatches && <Text style={{ color: colors.textMuted }}>More possible bank matches exist. Check Activity if none of these is the right match.</Text>}
    </View>)}
    {!!cursor && button("Review newest entries", () => setCursor(null))}
    {review.data?.nextCursor && button("Review older entries", () => setCursor(review.data!.nextCursor))}
  </ScrollView></SafeAreaView>;
}
export default function DuplicateReviewScreen() {
  const userId = useAuthStore(state => state.userId);
  const loading = useAuthStore(state => state.isLoading);
  if (loading) return null;
  return userId ? <DuplicateReview key={userId} userId={userId} /> : <Redirect href="/(auth)/login" />;
}

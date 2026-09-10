import { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createHouseholdResponsibilitySchema, type HouseholdSummary } from "@worthlane/contracts";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemedStyles, type Theme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";

type Budget = HouseholdSummary["responsibilities"][number];
type Mode = "ASSIGNED" | "EQUAL" | "PERCENTAGE";
function hundredths(raw: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw.trim())) return null;
  const [whole, decimal = ""] = raw.trim().split(".");
  const value = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(value) ? value : null;
}

export function HouseholdBudgetEditor({ summary }: { summary: HouseholdSummary }) {
  const styles = useThemedStyles(createStyles);
  const [editing, setEditing] = useState<Budget | "new" | null>(null);
  if (!summary.members.some(member => member.isCurrentUser && member.role === "OWNER")) {
    return <Text style={styles.helper}>The household owner manages category assignments. Both of you can view the agreed plan.</Text>;
  }
  return <View style={styles.card}>
    <Text style={styles.heading}>Manage category budgets</Text>
    <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => setEditing("new")}><Text style={styles.primaryText}>Add category budget</Text></TouchableOpacity>
    {summary.responsibilities.map(budget => <TouchableOpacity key={budget.id} accessibilityRole="button" style={styles.option} onPress={() => setEditing(budget)}><Text style={styles.text}>Edit {budget.name}</Text></TouchableOpacity>)}
    <Modal visible={editing !== null} animationType="slide" onRequestClose={() => setEditing(null)}>
      {editing ? <BudgetForm key={editing === "new" ? "new" : editing.id} summary={summary} budget={editing === "new" ? undefined : editing} close={() => setEditing(null)} /> : null}
    </Modal>
  </View>;
}

function BudgetForm({ summary, budget, close }: { summary: HouseholdSummary; budget?: Budget; close: () => void }) {
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore(state => state.userId);
  const client = useQueryClient();
  const [name, setName] = useState(budget?.name ?? "");
  const [amount, setAmount] = useState(budget ? (budget.monthlyAmountMinor / 100).toFixed(2) : "");
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [chooseCategory, setChooseCategory] = useState(false);
  const [mode, setMode] = useState<Mode>(budget?.mode === "MEMBER" ? "ASSIGNED" : budget?.mode ?? "EQUAL");
  const [memberId, setMemberId] = useState(budget?.allocations[0]?.memberId ?? summary.viewerMemberId);
  const [shares, setShares] = useState<Record<string, string>>(() => Object.fromEntries(summary.members.map(member => [member.id, budget ? String((budget.allocations.find(a => a.memberId === member.id)?.shareBasisPoints ?? 0) / 100) : String(100 / summary.members.length)])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categories = useQuery({ queryKey: ["categories", userId], queryFn: () => api.get<Array<{ id: string; name: string }>>("/categories"), enabled: Boolean(userId) });
  async function refresh() {
    await Promise.all([client.invalidateQueries({ queryKey: ["household-summary", userId] }), client.invalidateQueries({ queryKey: ["responsibility-history", userId] })]);
  }
  async function save() {
    if (busy) return;
    setError(null);
    if (mode === "PERCENTAGE" && summary.members.some(member => hundredths(shares[member.id] ?? "") === null)) {
      setError("Enter each percentage, including 0, with no more than two decimal places."); return;
    }
    if (mode === "PERCENTAGE" && summary.members.reduce((total, member) => total + (hundredths(shares[member.id] ?? "") ?? 0), 0) !== 10000) {
      setError("Your shares must total 100%. Adjust the percentages and try again."); return;
    }
    if (!categoryId || !hundredths(amount)) {
      setError("Choose a category and enter a monthly amount greater than zero, with no more than two decimal places."); return;
    }
    const assignment = mode === "ASSIGNED" ? { mode, memberId } : mode === "EQUAL" ? { mode, memberIds: summary.members.map(member => member.id) } : { mode, shares: summary.members.map(member => ({ memberId: member.id, basisPoints: hundredths(shares[member.id] ?? "") })) };
    const parsed = createHouseholdResponsibilitySchema.safeParse({ name, categoryId, monthlyAmountMinor: hundredths(amount), assignment });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the budget details."); return; }
    setBusy(true);
    try {
      if (budget) await api.put(`/households/current/responsibilities/${encodeURIComponent(budget.id)}`, parsed.data);
      else await api.post("/households/current/responsibilities", parsed.data);
      await refresh(); close();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The budget could not be saved."); }
    finally { setBusy(false); }
  }
  function remove() {
    if (!budget || busy) return;
    Alert.alert(`Remove ${budget.name}?`, "The previous agreement stays in history. Transactions are unchanged.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: async () => {
      setBusy(true); setError(null);
      try { await api.delete(`/households/current/responsibilities/${encodeURIComponent(budget.id)}`); await refresh(); close(); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "The budget could not be removed."); }
      finally { setBusy(false); }
    } }]);
  }
  const option = (label: string, selected: boolean, onPress: () => void) => <TouchableOpacity key={label} accessibilityRole="button" accessibilityState={{ selected }} disabled={busy} style={[styles.option, selected && styles.selected]} onPress={onPress}><Text style={styles.text}>{label}{selected ? " ✓" : ""}</Text></TouchableOpacity>;
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{budget ? "Edit category budget" : "Add category budget"}</Text>
        <Text style={styles.helper}>Changes recalculate this month’s allocations, including earlier spending. Previous agreements stay in history. Who paid and account visibility stay separate.</Text>
        <Text style={styles.label}>Name</Text><TextInput accessibilityLabel="Budget name" editable={!busy} style={styles.input} value={name} onChangeText={setName} maxLength={100} />
        <Text style={styles.label}>Transaction category</Text>
        {option(categories.data?.find(category => category.id === categoryId)?.name ?? "Choose category", false, () => setChooseCategory(value => !value))}
        {categories.isError ? <TouchableOpacity onPress={() => void categories.refetch()}><Text style={styles.helper}>Categories unavailable. Tap to retry.</Text></TouchableOpacity> : null}
        {categories.isLoading ? <Text style={styles.helper}>Loading categories…</Text> : null}
        {chooseCategory ? categories.data?.map(category => option(category.name, category.id === categoryId, () => { setCategoryId(category.id); setChooseCategory(false); })) : null}
        <Text style={styles.label}>Monthly amount ({summary.household.currency})</Text><TextInput accessibilityLabel="Monthly budget amount" editable={!busy} style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Text style={styles.label}>Responsibility</Text>
        <View style={styles.row}>{option("One person", mode === "ASSIGNED", () => setMode("ASSIGNED"))}{option("Equal", mode === "EQUAL", () => setMode("EQUAL"))}{option("Custom %", mode === "PERCENTAGE", () => setMode("PERCENTAGE"))}</View>
        {mode === "ASSIGNED" ? summary.members.map(member => option(member.displayName, member.id === memberId, () => setMemberId(member.id))) : null}
        {mode === "PERCENTAGE" ? <><Text style={styles.helper}>Shares must total 100%. Either person can have 0%.</Text>{summary.members.map(member => <View key={member.id}><Text style={styles.label}>{member.displayName} (%)</Text><TextInput accessibilityLabel={`${member.displayName} percentage`} editable={!busy} style={styles.input} keyboardType="decimal-pad" value={shares[member.id]} onChangeText={value => setShares(current => ({ ...current, [member.id]: value }))} /></View>)}</> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.primary} onPress={() => void save()}><Text style={styles.primaryText}>{busy ? "Saving…" : "Save budget"}</Text></TouchableOpacity>
        {option("Cancel", false, close)}
        {budget ? option("Remove budget", false, remove) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const createStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, form: { padding: spacing.lg, gap: spacing.sm },
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  heading: { ...typography.h3 }, helper: { ...typography.bodySmall, lineHeight: 21 }, label: { ...typography.label, marginTop: spacing.sm },
  input: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: 16 },
  option: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 44, justifyContent: "center" },
  selected: { backgroundColor: colors.primaryDim, borderColor: colors.primary }, text: { ...typography.body }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primary: { padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: "center", marginTop: spacing.sm }, primaryText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 }, error: { color: colors.danger, fontSize: 14 },
});

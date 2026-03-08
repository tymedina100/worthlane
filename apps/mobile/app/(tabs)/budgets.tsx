import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";
import type { BudgetWithSpent, Category } from "@finance/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function getBudgetColor(percentUsed: number): string {
  if (percentUsed >= 100) return colors.danger;
  if (percentUsed >= 80) return colors.warning;
  return colors.success;
}

// Loss-aversion framing: emphasize what's at stake, not what's spent
function getLossAversionMessage(b: BudgetWithSpent): { text: string; urgent: boolean } {
  if (b.remaining < 0) {
    return { text: `You're $${Math.abs(b.remaining).toFixed(0)} over. Every dollar here is a dollar stolen from your savings.`, urgent: true };
  }
  if (b.percentUsed >= 90) {
    return { text: `Almost gone — only $${b.remaining.toFixed(0)} stands between you and blowing this budget.`, urgent: true };
  }
  if (b.percentUsed >= 70) {
    return { text: `$${b.remaining.toFixed(0)} left. You've been consistent — don't lose your streak now.`, urgent: false };
  }
  return { text: `$${b.remaining.toFixed(0)} remaining. You're on track.`, urgent: false };
}

function BudgetCard({ budget }: { budget: BudgetWithSpent }) {
  const color = getBudgetColor(budget.percentUsed);
  const { text, urgent } = getLossAversionMessage(budget);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryIcon}>{budget.categoryIcon}</Text>
          <Text style={styles.categoryName}>{budget.categoryName}</Text>
        </View>
        <Text style={styles.budgetTotal}>{formatCurrency(budget.amount)}/mo</Text>
      </View>

      <Text style={[styles.remainingAmount, { color }]}>
        {budget.remaining < 0 ? "-" : ""}
        {formatCurrency(Math.abs(budget.remaining))}
        <Text style={styles.remainingLabel}> {budget.remaining < 0 ? "over" : "left"}</Text>
      </Text>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${Math.min(100, budget.percentUsed)}%`, backgroundColor: color }]} />
      </View>

      <Text style={[styles.message, urgent && styles.messageUrgent]}>{text}</Text>
      <Text style={styles.spent}>{formatCurrency(budget.spent)} spent of {formatCurrency(budget.amount)}</Text>

      {budget.history.length > 0 && (
        <View style={styles.historyRow}>
          {budget.history.map((h) => {
            const over = h.spent > h.amount;
            const label = new Date(h.startDate).toLocaleDateString("en-US", { month: "short" });
            return (
              <View key={h.startDate} style={styles.historyChip}>
                <Text style={[styles.historyLabel, { color: over ? colors.danger : colors.success }]}>
                  {label} {over ? "✗" : "✓"}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function CreateBudgetModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    enabled: visible,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/budgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setSelectedCategoryId(null); setAmount(""); setPeriod("MONTHLY");
      onClose();
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not create budget.");
    },
  });

  const handleSubmit = () => {
    if (!selectedCategoryId) return Alert.alert("Category required", "Please select a category.");
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return Alert.alert("Invalid amount", "Please enter a budget amount.");
    mutation.mutate({ categoryId: selectedCategoryId, amount: parsed, period });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>New Budget</Text>

          <Text style={styles.inputLabel}>Category</Text>
          {!categories && <Text style={typography.bodySmall}>Loading categories...</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
            <View style={styles.categoryRow}>
              {categories?.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.categoryChip, selectedCategoryId === c.id && { borderColor: c.color, backgroundColor: `${c.color}22` }]}
                  onPress={() => setSelectedCategoryId(c.id)}
                >
                  <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                  <Text style={[styles.categoryChipText, selectedCategoryId === c.id && { color: c.color }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.inputLabel}>Monthly Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.inputLabel}>Period</Text>
          <View style={styles.periodRow}>
            {(["MONTHLY", "WEEKLY"] as const).map((p) => (
              <TouchableOpacity key={p} style={[styles.periodOption, period === p && styles.periodOptionActive]} onPress={() => setPeriod(p)}>
                <Text style={[styles.periodOptionText, period === p && styles.periodOptionTextActive]}>{p.charAt(0) + p.slice(1).toLowerCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.submitButton, mutation.isPending && styles.buttonDisabled]} onPress={handleSubmit} disabled={mutation.isPending}>
            <Text style={styles.submitButtonText}>{mutation.isPending ? "Creating..." : "Create Budget"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function BudgetsScreen() {
  const [createVisible, setCreateVisible] = useState(false);
  const { data: budgets, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => api.get<BudgetWithSpent[]>("/budgets"),
  });

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Budget</Text>
            <Text style={styles.subtitle}>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setCreateVisible(true)}>
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <Text style={typography.body}>Loading budgets...</Text>}
        {budgets?.map((b) => <BudgetCard key={b.id} budget={b} />)}

        {budgets?.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>📊</Text>
            <Text style={typography.h3}>No budgets yet</Text>
            <Text style={[typography.bodySmall, { textAlign: "center" }]}>
              Set a budget to start tracking your spending with loss-aversion nudges.
            </Text>
            <TouchableOpacity style={styles.submitButton} onPress={() => setCreateVisible(true)}>
              <Text style={styles.submitButtonText}>Create a Budget</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CreateBudgetModal visible={createVisible} onClose={() => setCreateVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg },
  title: { ...typography.h2, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall },
  addButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addButtonText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  categoryTag: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  categoryIcon: { fontSize: 20 },
  categoryName: { ...typography.label },
  budgetTotal: { ...typography.bodySmall },
  remainingAmount: { fontSize: 36, fontWeight: "700", marginBottom: spacing.sm },
  remainingLabel: { fontSize: 18, fontWeight: "400" },
  barBg: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.full, overflow: "hidden", marginBottom: spacing.sm },
  barFill: { height: "100%", borderRadius: radius.full },
  message: { ...typography.bodySmall, lineHeight: 20, marginBottom: spacing.xs },
  messageUrgent: { color: colors.danger },
  spent: { ...typography.caption },
  historyRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  historyChip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  historyLabel: { fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingTop: spacing.xxl, gap: spacing.md },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { ...typography.h2, marginBottom: spacing.sm },
  inputLabel: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  categoryRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.xs },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  categoryChipText: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
  periodRow: { flexDirection: "row", gap: spacing.sm },
  periodOption: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, alignItems: "center" },
  periodOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  periodOptionText: { color: colors.textMuted, fontWeight: "600" },
  periodOptionTextActive: { color: colors.primary },
  submitButton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.lg },
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },
  cancelButton: { alignItems: "center", padding: spacing.sm, marginTop: spacing.xs },
  cancelButtonText: { ...typography.body, color: colors.textDim },
});

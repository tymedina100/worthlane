import { useState, useEffect } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { spacing, radius } from "@/lib/theme";
import { useTheme, useThemedStyles, type Theme } from "@/lib/ThemeContext";
import { EmptyState } from "@/components/EmptyState";
import { Ionicons } from "@expo/vector-icons";
import type { BudgetWithSpent, Category } from "@worthlane/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function getBudgetColor(percentUsed: number, colors: Theme["colors"]): string {
  if (percentUsed >= 100) return colors.danger;
  if (percentUsed >= 80) return colors.warning;
  return colors.success;
}

// Concrete status and a next step, without guilt or streak pressure.
function getBudgetMessage(b: BudgetWithSpent): { text: string; urgent: boolean } {
  if (b.remaining < 0) {
    return { text: `$${Math.abs(b.remaining).toFixed(2)} over the plan. Review activity or adjust the budget.`, urgent: true };
  }
  if (b.percentUsed >= 90) {
    return { text: `$${b.remaining.toFixed(2)} remaining. Check upcoming needs before your next purchase.`, urgent: true };
  }
  if (b.percentUsed >= 70) {
    return { text: `$${b.remaining.toFixed(2)} left. You can adjust the plan as your needs change.`, urgent: false };
  }
  return { text: `$${b.remaining.toFixed(2)} remaining in your plan.`, urgent: false };
}

function BudgetCard({ budget, onEdit, onDelete }: { budget: BudgetWithSpent; onEdit: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = getBudgetColor(budget.percentUsed, colors);
  const { text, urgent } = getBudgetMessage(budget);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryIcon}>{budget.categoryIcon}</Text>
          <Text style={styles.categoryName}>{budget.categoryName}</Text>
        </View>
        <View style={styles.cardActions}>
          <Text style={styles.budgetTotal}>{formatCurrency(budget.amount)}/mo</Text>
          <TouchableOpacity
            onPress={onEdit}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${budget.categoryName} budget`}
          >
            <Ionicons name="pencil" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${budget.categoryName} budget`}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
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

function EditBudgetModal({ budget, visible, onClose }: { budget: BudgetWithSpent | null; visible: boolean; onClose: () => void }) {
  const { colors, typography } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [amount, setAmount] = useState(budget?.amount.toString() ?? "");
  const [period, setPeriod] = useState<"MONTHLY" | "WEEKLY">((budget?.period as "MONTHLY" | "WEEKLY") ?? "MONTHLY");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (budget) {
      setAmount(budget.amount.toString());
      setPeriod(budget.period as "MONTHLY" | "WEEKLY");
    }
  }, [budget]);

  const mutation = useMutation({
    mutationFn: (data: object) => api.patch(`/budgets/${budget!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      onClose();
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not update budget.");
    },
  });

  const handleSubmit = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return Alert.alert("Invalid amount", "Please enter a budget amount.");
    mutation.mutate({ amount: parsed, period });
  };

  if (!budget) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Edit Budget</Text>
          <Text style={[typography.bodySmall, { marginBottom: spacing.md }]}>{budget.categoryIcon} {budget.categoryName}</Text>

          <Text style={styles.inputLabel}>Monthly Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
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
            <Text style={styles.submitButtonText}>{mutation.isPending ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CreateBudgetModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, typography } = useTheme();
  const styles = useThemedStyles(createStyles);
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
  const { colors, typography } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [createVisible, setCreateVisible] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetWithSpent | null>(null);
  const queryClient = useQueryClient();

  const { data: budgets, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => api.get<BudgetWithSpent[]>("/budgets"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    onError: (e: unknown) => Alert.alert("Error", e instanceof Error ? e.message : "Could not delete budget."),
  });

  const handleDelete = (budget: BudgetWithSpent) => {
    Alert.alert(
      "Delete Budget",
      `Delete the ${budget.categoryName} budget? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(budget.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
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
        {budgets?.map((b) => (
          <BudgetCard
            key={b.id}
            budget={b}
            onEdit={() => setEditBudget(b)}
            onDelete={() => handleDelete(b)}
          />
        ))}

        {budgets?.length === 0 && (
          <EmptyState
            icon="pie-chart"
            title="No budgets yet"
            body="Set a category budget to see spending, remaining amounts, and your next steps."
            actionLabel="Create a Budget"
            onAction={() => setCreateVisible(true)}
          />
        )}
      </ScrollView>

      <CreateBudgetModal visible={createVisible} onClose={() => setCreateVisible(false)} />
      <EditBudgetModal budget={editBudget} visible={!!editBudget} onClose={() => setEditBudget(null)} />
    </SafeAreaView>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg },
  title: { ...typography.h2, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall },
  addButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addButtonText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  cardActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actionButton: { padding: 2 },
  actionButtonText: { fontSize: 16 },
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

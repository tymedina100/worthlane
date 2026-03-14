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
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";
import type { GoalWithProgress } from "@finance/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const GOAL_TYPES = [
  { value: "SAVINGS", label: "Savings", icon: "💰" },
  { value: "DEBT_PAYOFF", label: "Debt Payoff", icon: "🏦" },
  { value: "PURCHASE", label: "Purchase", icon: "🛒" },
  { value: "EMERGENCY_FUND", label: "Emergency Fund", icon: "🛡️" },
] as const;

const PRESET_ICONS = ["🎯", "🏠", "🚗", "✈️", "📚", "💪", "🏖️", "💻", "🎓", "💍"];

const GOAL_TYPE_COLORS: Record<string, string> = {
  SAVINGS: colors.success,
  DEBT_PAYOFF: colors.danger,
  PURCHASE: colors.primary,
  EMERGENCY_FUND: colors.warning,
};

function ProgressRing({ percent, color, size = 80 }: { percent: number; color: string; size?: number }) {
  const strokeWidth = 8;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center", position: "relative" }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color, borderRightColor: "transparent", borderBottomColor: percent > 75 ? color : "transparent", borderLeftColor: percent > 50 ? color : "transparent", transform: [{ rotate: "-90deg" }] }} />
      <Text style={{ color, fontWeight: "700", fontSize: 14 }}>{Math.round(percent)}%</Text>
    </View>
  );
}

function CreateGoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [type, setType] = useState<"SAVINGS" | "DEBT_PAYOFF" | "PURCHASE" | "EMERGENCY_FUND">("SAVINGS");
  const [icon, setIcon] = useState("🎯");
  const [targetDate, setTargetDate] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/goals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setName(""); setTargetAmount(""); setType("SAVINGS"); setIcon("🎯"); setTargetDate("");
      onClose();
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not create goal.");
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) return Alert.alert("Name required", "Please enter a goal name.");
    const amount = parseFloat(targetAmount);
    if (!amount || amount <= 0) return Alert.alert("Invalid amount", "Please enter a target amount.");

    let parsedDate: string | undefined;
    if (targetDate.trim()) {
      const d = new Date(targetDate.trim());
      if (isNaN(d.getTime())) return Alert.alert("Invalid date", "Use format YYYY-MM-DD.");
      parsedDate = d.toISOString();
    }

    mutation.mutate({ name: name.trim(), targetAmount: amount, type, icon, targetDate: parsedDate });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>New Goal</Text>

          <Text style={styles.inputLabel}>Goal Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Emergency Fund" placeholderTextColor={colors.textDim} value={name} onChangeText={setName} autoFocus />

          <Text style={styles.inputLabel}>Target Amount</Text>
          <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={targetAmount} onChangeText={setTargetAmount} />

          <Text style={styles.inputLabel}>Type</Text>
          <View style={styles.pillRow}>
            {GOAL_TYPES.map((t) => (
              <TouchableOpacity key={t.value} style={[styles.pill, type === t.value && styles.pillActive]} onPress={() => setType(t.value)}>
                <Text style={styles.pillText}>{t.icon} {t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Icon</Text>
          <View style={styles.iconRow}>
            {PRESET_ICONS.map((e) => (
              <TouchableOpacity key={e} style={[styles.iconOption, icon === e && styles.iconOptionActive]} onPress={() => setIcon(e)}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Target Date <Text style={styles.optional}>(optional, YYYY-MM-DD)</Text></Text>
          <TextInput style={styles.input} placeholder="2025-12-31" placeholderTextColor={colors.textDim} value={targetDate} onChangeText={setTargetDate} keyboardType="numbers-and-punctuation" />

          <TouchableOpacity style={[styles.submitButton, mutation.isPending && styles.buttonDisabled]} onPress={handleSubmit} disabled={mutation.isPending}>
            <Text style={styles.submitButtonText}>{mutation.isPending ? "Creating..." : "Create Goal"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ContributionModal({ goal, visible, onClose }: { goal: GoalWithProgress; visible: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => api.post(`/goals/${goal.id}/contributions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setAmount(""); setNote(""); onClose();
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not add contribution.");
    },
  });

  const handleSubmit = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return Alert.alert("Invalid amount", "Please enter a positive amount.");
    mutation.mutate({ amount: parsed, note: note.trim() || undefined });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add to {goal.name}</Text>
          <Text style={styles.modalSubtitle}>{formatCurrency(goal.currentAmount)} saved · {formatCurrency(goal.targetAmount)} goal</Text>

          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />

          <Text style={styles.inputLabel}>Note (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. monthly transfer" placeholderTextColor={colors.textDim} value={note} onChangeText={setNote} />

          <TouchableOpacity style={[styles.submitButton, mutation.isPending && styles.buttonDisabled]} onPress={handleSubmit} disabled={mutation.isPending}>
            <Text style={styles.submitButtonText}>{mutation.isPending ? "Saving..." : "Add Contribution"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditGoalModal({ goal, visible, onClose }: { goal: GoalWithProgress | null; visible: boolean; onClose: () => void }) {
  const [name, setName] = useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() ?? "");
  const [icon, setIcon] = useState(goal?.icon ?? "🎯");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: object) => api.patch(`/goals/${goal!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onClose();
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not update goal.");
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) return Alert.alert("Name required", "Please enter a goal name.");
    const amount = parseFloat(targetAmount);
    if (!amount || amount <= 0) return Alert.alert("Invalid amount", "Please enter a target amount.");

    let parsedDate: string | null | undefined;
    if (targetDate.trim()) {
      const d = new Date(targetDate.trim());
      if (isNaN(d.getTime())) return Alert.alert("Invalid date", "Use format YYYY-MM-DD.");
      parsedDate = d.toISOString();
    } else {
      parsedDate = null;
    }

    mutation.mutate({ name: name.trim(), targetAmount: amount, icon, targetDate: parsedDate });
  };

  if (!goal) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Edit Goal</Text>

          <Text style={styles.inputLabel}>Goal Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Emergency Fund" placeholderTextColor={colors.textDim} value={name} onChangeText={setName} autoFocus />

          <Text style={styles.inputLabel}>Target Amount</Text>
          <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={targetAmount} onChangeText={setTargetAmount} />

          <Text style={styles.inputLabel}>Icon</Text>
          <View style={styles.iconRow}>
            {PRESET_ICONS.map((e) => (
              <TouchableOpacity key={e} style={[styles.iconOption, icon === e && styles.iconOptionActive]} onPress={() => setIcon(e)}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Target Date <Text style={styles.optional}>(optional, YYYY-MM-DD)</Text></Text>
          <TextInput style={styles.input} placeholder="2025-12-31" placeholderTextColor={colors.textDim} value={targetDate} onChangeText={setTargetDate} keyboardType="numbers-and-punctuation" />

          <TouchableOpacity style={[styles.submitButton, mutation.isPending && styles.buttonDisabled]} onPress={handleSubmit} disabled={mutation.isPending}>
            <Text style={styles.submitButtonText}>{mutation.isPending ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GoalCard({ goal, onEdit, onDelete }: { goal: GoalWithProgress; onEdit: () => void; onDelete: () => void }) {
  const [contributionVisible, setContributionVisible] = useState(false);
  const color = GOAL_TYPE_COLORS[goal.type] ?? colors.primary;
  const remaining = goal.targetAmount - goal.currentAmount;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ProgressRing percent={goal.percentComplete} color={color} />
          <View style={styles.cardInfo}>
            <Text style={styles.goalIcon}>{goal.icon ?? "🎯"}</Text>
            <Text style={styles.goalName}>{goal.name}</Text>
            <Text style={styles.goalType}>{goal.type.replace("_", " ")}</Text>
          </View>
          <View style={styles.goalActions}>
            <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Saved</Text>
            <Text style={[styles.amountValue, { color }]}>{formatCurrency(goal.currentAmount)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.amountLabel}>Target</Text>
            <Text style={styles.amountValue}>{formatCurrency(goal.targetAmount)}</Text>
          </View>
        </View>

        {remaining > 0 && (
          <Text style={styles.remainingText}>
            {formatCurrency(remaining)} to go{goal.targetDate && ` · Due ${formatDate(goal.targetDate)}`}
          </Text>
        )}

        {goal.targetDate && new Date(goal.targetDate) < new Date() && goal.percentComplete < 100 && (
          <View style={[styles.projectionBox, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
            <Text style={[styles.projectionText, { color: colors.danger }]}>Past due — target date has passed.</Text>
          </View>
        )}

        {goal.monthlyNeeded && goal.monthlyNeeded > 0 && !(goal.targetDate && new Date(goal.targetDate) < new Date()) && (
          <View style={styles.projectionBox}>
            <Text style={styles.projectionText}>Save {formatCurrency(goal.monthlyNeeded)}/month to hit your target on time.</Text>
          </View>
        )}

        {goal.projectedCompletionDate && !goal.monthlyNeeded && (
          <View style={styles.projectionBox}>
            <Text style={styles.projectionText}>At this rate, you'll reach your goal by {formatDate(goal.projectedCompletionDate)}.</Text>
          </View>
        )}

        {goal.percentComplete >= 100 && (
          <View style={[styles.projectionBox, { backgroundColor: "rgba(34,197,94,0.1)" }]}>
            <Text style={[styles.projectionText, { color: colors.success }]}>Goal complete! Time to set a new one.</Text>
          </View>
        )}

        {goal.percentComplete < 100 && (
          <TouchableOpacity style={[styles.contributeButton, { borderColor: color }]} onPress={() => setContributionVisible(true)}>
            <Text style={[styles.contributeButtonText, { color }]}>+ Add Contribution</Text>
          </TouchableOpacity>
        )}
      </View>

      <ContributionModal goal={goal} visible={contributionVisible} onClose={() => setContributionVisible(false)} />
    </>
  );
}

export default function GoalsScreen() {
  const [createVisible, setCreateVisible] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalWithProgress | null>(null);
  const queryClient = useQueryClient();

  const { data: goals, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["goals"],
    queryFn: () => api.get<GoalWithProgress[]>("/goals"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
    onError: (e: unknown) => Alert.alert("Error", e instanceof Error ? e.message : "Could not delete goal."),
  });

  const handleDelete = (goal: GoalWithProgress) => {
    Alert.alert(
      "Delete Goal",
      `Delete "${goal.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(goal.id) },
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
            <Text style={styles.title}>Goals</Text>
            <Text style={styles.subtitle}>What you're building toward</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setCreateVisible(true)}>
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <Text style={typography.body}>Loading goals...</Text>}
        {goals?.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onEdit={() => setEditGoal(g)}
            onDelete={() => handleDelete(g)}
          />
        ))}

        {goals?.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🎯</Text>
            <Text style={typography.h3}>No goals yet</Text>
            <Text style={[typography.bodySmall, { textAlign: "center" }]}>
              Create your first goal — saving for something concrete is the most powerful motivator.
            </Text>
            <TouchableOpacity style={styles.submitButton} onPress={() => setCreateVisible(true)}>
              <Text style={styles.submitButtonText}>Create a Goal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CreateGoalModal visible={createVisible} onClose={() => setCreateVisible(false)} />
      <EditGoalModal goal={editGoal} visible={!!editGoal} onClose={() => setEditGoal(null)} />
    </SafeAreaView>
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
  cardHeader: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "center" },
  goalActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  cardInfo: { flex: 1 },
  goalIcon: { fontSize: 20, marginBottom: 2 },
  goalName: { ...typography.h3, marginBottom: 2 },
  goalType: { ...typography.caption, textTransform: "uppercase", letterSpacing: 1 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  amountLabel: { ...typography.caption },
  amountValue: { ...typography.h3 },
  remainingText: { ...typography.bodySmall, marginBottom: spacing.sm },
  projectionBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  projectionText: { ...typography.bodySmall, lineHeight: 20 },
  contributeButton: { marginTop: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: "center" },
  contributeButtonText: { fontSize: 14, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingTop: spacing.xxl, gap: spacing.md },
  // Modal shared
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl },
  modalTitle: { ...typography.h2, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.bodySmall, marginBottom: spacing.md },
  inputLabel: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.xs },
  optional: { ...typography.caption, fontWeight: "400" },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  pillText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  iconRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  iconOption: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  iconOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  submitButton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.lg },
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },
  cancelButton: { alignItems: "center", padding: spacing.sm, marginTop: spacing.xs },
  cancelButtonText: { ...typography.body, color: colors.textDim },
});

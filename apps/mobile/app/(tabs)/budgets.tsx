import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";
import type { BudgetWithSpent } from "@finance/types";

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
    return {
      text: `You're $${Math.abs(b.remaining).toFixed(0)} over. Every dollar here is a dollar stolen from your savings.`,
      urgent: true,
    };
  }
  if (b.percentUsed >= 90) {
    return {
      text: `Almost gone — only $${b.remaining.toFixed(0)} stands between you and blowing this budget.`,
      urgent: true,
    };
  }
  if (b.percentUsed >= 70) {
    return {
      text: `$${b.remaining.toFixed(0)} left. You've been consistent — don't lose your streak now.`,
      urgent: false,
    };
  }
  return {
    text: `$${b.remaining.toFixed(0)} remaining. You're on track.`,
    urgent: false,
  };
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

      {/* Large remaining amount — front and center (loss framing) */}
      <Text style={[styles.remainingAmount, { color }]}>
        {budget.remaining < 0 ? "-" : ""}
        {formatCurrency(Math.abs(budget.remaining))}
        <Text style={styles.remainingLabel}> {budget.remaining < 0 ? "over" : "left"}</Text>
      </Text>

      {/* Progress bar */}
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.min(100, budget.percentUsed)}%`, backgroundColor: color },
          ]}
        />
      </View>

      <Text style={[styles.message, urgent && styles.messageUrgent]}>{text}</Text>

      <Text style={styles.spent}>
        {formatCurrency(budget.spent)} spent of {formatCurrency(budget.amount)}
      </Text>
    </View>
  );
}

export default function BudgetsScreen() {
  const { data: budgets, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => api.get<BudgetWithSpent[]>("/budgets"),
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>Budget</Text>
      <Text style={styles.subtitle}>
        {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </Text>

      {isLoading && <Text style={typography.body}>Loading budgets...</Text>}

      {budgets?.map((b) => <BudgetCard key={b.id} budget={b} />)}

      {budgets?.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={typography.h3}>No budgets yet</Text>
          <Text style={typography.bodySmall}>Set budgets to start tracking your spending.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.h2, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  categoryTag: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  categoryIcon: { fontSize: 20 },
  categoryName: { ...typography.label },
  budgetTotal: { ...typography.bodySmall },
  remainingAmount: { fontSize: 36, fontWeight: "700", marginBottom: spacing.sm },
  remainingLabel: { fontSize: 18, fontWeight: "400" },
  barBg: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  barFill: { height: "100%", borderRadius: radius.full },
  message: { ...typography.bodySmall, lineHeight: 20, marginBottom: spacing.xs },
  messageUrgent: { color: colors.danger },
  spent: { ...typography.caption },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
});

import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";
import type { DashboardSummary, BudgetWithSpent, StreakStatus, NudgeMessage } from "@finance/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function getBudgetColor(percentUsed: number): string {
  if (percentUsed >= 100) return colors.danger;
  if (percentUsed >= 80) return colors.warning;
  return colors.success;
}

function getBudgetMessage(b: BudgetWithSpent): string {
  if (b.remaining < 0) {
    return `$${Math.abs(b.remaining).toFixed(0)} over — that's less for savings`;
  }
  if (b.percentUsed >= 80) {
    return `Only $${b.remaining.toFixed(0)} left before you lose this budget`;
  }
  return `$${b.remaining.toFixed(0)} remaining`;
}

function StreakBadge({ streak }: { streak: StreakStatus }) {
  const label =
    streak.type === "DAILY_CHECKIN"
      ? "Daily Check-in"
      : streak.type === "WEEKLY_ON_BUDGET"
      ? "On Budget"
      : "No Impulse";

  return (
    <View style={[styles.streakBadge, !streak.isActiveToday && styles.streakAtRisk]}>
      <Text style={styles.streakCount}>{streak.currentCount}</Text>
      <Text style={styles.streakLabel}>{label}</Text>
      {!streak.isActiveToday && streak.currentCount > 0 && (
        <Text style={styles.streakWarning}>At risk!</Text>
      )}
    </View>
  );
}

function NudgeCard({ nudge, onDismiss }: { nudge: NudgeMessage; onDismiss: () => void }) {
  return (
    <View style={styles.nudgeCard}>
      <Text style={styles.nudgeText}>{nudge.message}</Text>
      <TouchableOpacity onPress={onDismiss}>
        <Text style={styles.nudgeDismiss}>Got it</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardScreen() {
  const qc = useQueryClient();

  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardSummary>("/dashboard"),
  });

  const { data: nudges } = useQuery({
    queryKey: ["nudges"],
    queryFn: () => api.get<NudgeMessage[]>("/nudges"),
  });

  const checkinMutation = useMutation({
    mutationFn: () => api.post("/streaks/checkin"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const dismissNudge = useMutation({
    mutationFn: (id: string) => api.post(`/nudges/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nudges"] }),
  });

  // Auto check-in on dashboard open
  useEffect(() => {
    checkinMutation.mutate();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={typography.body}>Loading your finances...</Text>
      </View>
    );
  }

  const d = dashboard;

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
      {/* Net Worth */}
      <View style={styles.netWorthCard}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={styles.netWorthAmount}>{formatCurrency(d?.netWorth ?? 0)}</Text>
        <View style={styles.cashFlowRow}>
          <View>
            <Text style={styles.cashFlowLabel}>Income</Text>
            <Text style={[styles.cashFlowAmount, { color: colors.success }]}>
              +{formatCurrency(d?.monthlyIncome ?? 0)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.cashFlowLabel}>Spending</Text>
            <Text style={[styles.cashFlowAmount, { color: colors.danger }]}>
              -{formatCurrency(d?.monthlySpending ?? 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Nudges */}
      {nudges && nudges.length > 0 && (
        <View style={styles.section}>
          {nudges.slice(0, 2).map((n) => (
            <NudgeCard
              key={n.id}
              nudge={n}
              onDismiss={() => dismissNudge.mutate(n.id)}
            />
          ))}
        </View>
      )}

      {/* Streaks */}
      {d?.streaks && d.streaks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.streaksRow}>
              {d.streaks.map((s) => (
                <StreakBadge key={s.type} streak={s} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Budget Overview */}
      {d?.budgets && d.budgets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budgets</Text>
          {d.budgets.map((b) => (
            <View key={b.id} style={styles.budgetItem}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetIcon}>{b.categoryIcon}</Text>
                <Text style={styles.budgetName}>{b.categoryName}</Text>
                <Text
                  style={[
                    styles.budgetAmount,
                    { color: getBudgetColor(b.percentUsed) },
                  ]}
                >
                  {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                </Text>
              </View>
              <View style={styles.budgetBarBg}>
                <View
                  style={[
                    styles.budgetBarFill,
                    {
                      width: `${Math.min(100, b.percentUsed)}%`,
                      backgroundColor: getBudgetColor(b.percentUsed),
                    },
                  ]}
                />
              </View>
              <Text style={styles.budgetMessage}>{getBudgetMessage(b)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Goals */}
      {d?.goals && d.goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals</Text>
          {d.goals.map((g) => (
            <View key={g.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalIcon}>{g.icon ?? "🎯"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  <Text style={styles.goalProgress}>
                    {formatCurrency(g.currentAmount)} of {formatCurrency(g.targetAmount)}
                  </Text>
                </View>
                <Text style={styles.goalPercent}>{Math.round(g.percentComplete)}%</Text>
              </View>
              <View style={styles.budgetBarBg}>
                <View
                  style={[
                    styles.budgetBarFill,
                    {
                      width: `${g.percentComplete}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  netWorthCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  netWorthLabel: { ...typography.bodySmall, marginBottom: spacing.xs },
  netWorthAmount: { ...typography.numberLarge, marginBottom: spacing.md },
  cashFlowRow: { flexDirection: "row", justifyContent: "space-between" },
  cashFlowLabel: { ...typography.caption },
  cashFlowAmount: { ...typography.h3 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  streaksRow: { flexDirection: "row", gap: spacing.sm },
  streakBadge: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakAtRisk: { borderColor: colors.warning },
  streakCount: { ...typography.h2, color: colors.primary },
  streakLabel: { ...typography.caption, textAlign: "center", marginTop: 2 },
  streakWarning: { color: colors.warning, fontSize: 10, marginTop: 2, fontWeight: "700" },
  nudgeCard: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nudgeText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  nudgeDismiss: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  budgetItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  budgetIcon: { fontSize: 18 },
  budgetName: { ...typography.label, flex: 1 },
  budgetAmount: { fontSize: 13, fontWeight: "600" },
  budgetBarBg: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  budgetBarFill: { height: "100%", borderRadius: radius.full },
  budgetMessage: { ...typography.caption, marginTop: spacing.xs },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  goalIcon: { fontSize: 24 },
  goalName: { ...typography.label },
  goalProgress: { ...typography.caption, marginTop: 2 },
  goalPercent: { ...typography.h3, color: colors.primary },
});

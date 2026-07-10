import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AccountsResponse } from "@/lib/finance";
import { spacing, radius } from "@/lib/theme";
import { useTheme, useThemedStyles, type Theme } from "@/lib/ThemeContext";
import type { DashboardSummary, BudgetWithSpent, StreakStatus, NudgeMessage, RecurringResponse } from "@worthlane/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatDueLabel(dateStr: string): string {
  const due = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function getBudgetColor(percentUsed: number, colors: Theme["colors"]): string {
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
  const styles = useThemedStyles(createStyles);
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
  const styles = useThemedStyles(createStyles);
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
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = useThemedStyles(createStyles);
  const qc = useQueryClient();

  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardSummary>("/dashboard"),
  });

  const { data: nudges } = useQuery({
    queryKey: ["nudges"],
    queryFn: () => api.get<NudgeMessage[]>("/nudges"),
  });

  const { data: accountData } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<AccountsResponse>("/accounts"),
  });

  const { data: recurring } = useQuery({
    queryKey: ["recurring"],
    queryFn: () => api.get<RecurringResponse>("/recurring"),
  });

  const checkinMutation = useMutation({
    mutationFn: () => api.post("/streaks/checkin"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
    // Auto check-in is best-effort; a failure shouldn't interrupt the
    // dashboard, but it should not be silently swallowed either.
    onError: (e) => console.warn("Daily check-in failed:", e),
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

  if (isError) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Dashboard unavailable</Text>
          <Text style={styles.errorBody}>
            We could not load your balances, budgets, and goals. Check the API connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const d = dashboard;
  const showFirstRunState =
    (accountData?.accounts.length ?? 0) === 0 &&
    (d?.budgets.length ?? 0) === 0 &&
    (d?.goals.length ?? 0) === 0 &&
    (d?.monthlyIncome ?? 0) === 0 &&
    (d?.monthlySpending ?? 0) === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Net Worth */}
      <TouchableOpacity
        style={styles.netWorthCard}
        onPress={() => router.push("/accounts")}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="View net worth history and accounts"
      >
        <View style={styles.netWorthHeader}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthLink}>Details ›</Text>
        </View>
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
      </TouchableOpacity>

      {showFirstRunState ? (
        <View style={styles.firstRunCard}>
          <Text style={styles.firstRunTitle}>Your finance picture starts here</Text>
          <Text style={styles.firstRunBody}>
            Connect a bank from Profile for automatic syncing, or add a manual account and log manual transactions to power budgets and goals right away.
          </Text>
        </View>
      ) : null}

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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Budgets</Text>
            <TouchableOpacity
              onPress={() => router.push("/reports")}
              accessibilityRole="button"
              accessibilityLabel="Open spending reports"
            >
              <Text style={styles.sectionLink}>Reports ›</Text>
            </TouchableOpacity>
          </View>
          {d.budgets.map((b) => (
            <View key={b.id} style={styles.budgetItem}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetIcon}>{b.categoryIcon}</Text>
                <Text style={styles.budgetName}>{b.categoryName}</Text>
                <Text
                  style={[
                    styles.budgetAmount,
                    { color: getBudgetColor(b.percentUsed, colors) },
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
                      backgroundColor: getBudgetColor(b.percentUsed, colors),
                    },
                  ]}
                />
              </View>
              <Text style={styles.budgetMessage}>{getBudgetMessage(b)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming bills */}
      {recurring && recurring.items.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Upcoming bills</Text>
            <TouchableOpacity
              onPress={() => router.push("/recurring")}
              accessibilityRole="button"
              accessibilityLabel="See all recurring bills"
            >
              <Text style={styles.sectionLink}>See all ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.billsCard}>
            {recurring.items.slice(0, 3).map((item, i) => (
              <View key={item.id}>
                {i > 0 ? <View style={styles.billsDivider} /> : null}
                <View style={styles.billRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.billName} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Text style={styles.billDue}>{formatDueLabel(item.nextDueDate)}</Text>
                  </View>
                  <Text style={styles.billAmount}>{formatCurrency(item.averageAmount)}</Text>
                </View>
              </View>
            ))}
          </View>
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

      {/* Impulse Spending */}
      {d?.impulse != null && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impulse Spending</Text>
          <View style={styles.impulseCard}>
            <View style={styles.impulseRow}>
              <View>
                <Text style={styles.impulseCount}>
                  {d.impulse.count} impulse {d.impulse.count === 1 ? "purchase" : "purchases"}
                </Text>
                <Text style={styles.impulseTotal}>{formatCurrency(d.impulse.total)} this month</Text>
              </View>
              {d.impulse.previousWeekTotal > 0 || d.impulse.total > 0 ? (
                <View style={styles.impulseTrend}>
                  <Text style={[
                    styles.impulseTrendArrow,
                    { color: d.impulse.total >= d.impulse.previousWeekTotal ? colors.danger : colors.success },
                  ]}>
                    {d.impulse.total >= d.impulse.previousWeekTotal ? "▲" : "▼"}
                  </Text>
                  <Text style={[
                    styles.impulseTrendLabel,
                    { color: d.impulse.total >= d.impulse.previousWeekTotal ? colors.danger : colors.success },
                  ]}>
                    {formatCurrency(Math.abs(d.impulse.total - d.impulse.previousWeekTotal))}{" "}
                    {d.impulse.total >= d.impulse.previousWeekTotal ? "more" : "less"} than last week
                  </Text>
                </View>
              ) : null}
            </View>
            {d.impulse.count > 0 && (
              <Text style={styles.impulseNote}>
                That&apos;s {formatCurrency(d.impulse.total)} that didn&apos;t go toward your goals.
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  errorCard: {
    width: "100%",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    padding: spacing.lg,
  },
  errorTitle: { ...typography.h3, color: colors.danger, marginBottom: spacing.xs },
  errorBody: { ...typography.bodySmall, marginBottom: spacing.md },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryButtonText: { color: colors.white, fontWeight: "700" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLink: { fontSize: 13, fontWeight: "600", color: colors.primary },
  billsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  billRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm + 4 },
  billName: { ...typography.body, fontWeight: "600" },
  billDue: { ...typography.caption, marginTop: 2 },
  billAmount: { ...typography.body, fontWeight: "700" },
  billsDivider: { height: 1, backgroundColor: colors.border },
  netWorthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netWorthLink: { fontSize: 13, fontWeight: "600", color: colors.primary },
  netWorthCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  firstRunCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  firstRunTitle: { ...typography.label, marginBottom: spacing.xs },
  firstRunBody: { ...typography.bodySmall },
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
  impulseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  impulseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  impulseCount: { ...typography.label },
  impulseTotal: { ...typography.bodySmall, marginTop: 2 },
  impulseTrend: { alignItems: "flex-end" },
  impulseTrendArrow: { fontSize: 18, fontWeight: "700" },
  impulseTrendLabel: { ...typography.caption, marginTop: 2, textAlign: "right" },
  impulseNote: { ...typography.caption, marginTop: spacing.sm, fontStyle: "italic" },
});

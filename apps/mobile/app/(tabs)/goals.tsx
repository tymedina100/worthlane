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
import type { GoalWithProgress } from "@finance/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const GOAL_TYPE_COLORS: Record<string, string> = {
  SAVINGS: colors.success,
  DEBT_PAYOFF: colors.danger,
  PURCHASE: colors.primary,
  EMERGENCY_FUND: colors.warning,
};

// Circular progress ring using SVG approximation with View
function ProgressRing({
  percent,
  color,
  size = 80,
}: {
  percent: number;
  color: string;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: colors.surfaceAlt,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Overlay arc (approximated) */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderRightColor: "transparent",
          borderBottomColor: percent > 75 ? color : "transparent",
          borderLeftColor: percent > 50 ? color : "transparent",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      <Text style={{ color, fontWeight: "700", fontSize: 14 }}>
        {Math.round(percent)}%
      </Text>
    </View>
  );
}

function GoalCard({ goal }: { goal: GoalWithProgress }) {
  const color = GOAL_TYPE_COLORS[goal.type] ?? colors.primary;
  const remaining = goal.targetAmount - goal.currentAmount;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ProgressRing percent={goal.percentComplete} color={color} />
        <View style={styles.cardInfo}>
          <Text style={styles.goalIcon}>{goal.icon ?? "🎯"}</Text>
          <Text style={styles.goalName}>{goal.name}</Text>
          <Text style={styles.goalType}>{goal.type.replace("_", " ")}</Text>
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
          {formatCurrency(remaining)} to go
          {goal.targetDate && ` · Due ${formatDate(goal.targetDate)}`}
        </Text>
      )}

      {goal.monthlyNeeded && goal.monthlyNeeded > 0 && (
        <View style={styles.projectionBox}>
          <Text style={styles.projectionText}>
            Save {formatCurrency(goal.monthlyNeeded)}/month to hit your target on time.
          </Text>
        </View>
      )}

      {goal.projectedCompletionDate && !goal.monthlyNeeded && (
        <View style={styles.projectionBox}>
          <Text style={styles.projectionText}>
            At this rate, you'll reach your goal by {formatDate(goal.projectedCompletionDate)}.
          </Text>
        </View>
      )}

      {goal.percentComplete >= 100 && (
        <View style={[styles.projectionBox, { backgroundColor: "rgba(34,197,94,0.1)" }]}>
          <Text style={[styles.projectionText, { color: colors.success }]}>
            Goal complete! Time to set a new one.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function GoalsScreen() {
  const { data: goals, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["goals"],
    queryFn: () => api.get<GoalWithProgress[]>("/goals"),
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
      <Text style={styles.title}>Goals</Text>
      <Text style={styles.subtitle}>What you're building toward</Text>

      {isLoading && <Text style={typography.body}>Loading goals...</Text>}

      {goals?.map((g) => <GoalCard key={g.id} goal={g} />)}

      {goals?.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>🎯</Text>
          <Text style={typography.h3}>No goals yet</Text>
          <Text style={[typography.bodySmall, { textAlign: "center" }]}>
            Create your first goal — saving for something concrete is the most powerful motivator.
          </Text>
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
    gap: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  goalIcon: { fontSize: 20, marginBottom: 2 },
  goalName: { ...typography.h3, marginBottom: 2 },
  goalType: { ...typography.caption, textTransform: "uppercase", letterSpacing: 1 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  amountLabel: { ...typography.caption },
  amountValue: { ...typography.h3 },
  remainingText: { ...typography.bodySmall, marginBottom: spacing.sm },
  projectionBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  projectionText: { ...typography.bodySmall, lineHeight: 20 },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
});

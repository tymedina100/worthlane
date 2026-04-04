import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/lib/theme";
import type { AccountSummary } from "@worthlane/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface BucketProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accounts: AccountSummary[];
  isDebt?: boolean;
}

function AccountBucket({ title, icon, accounts, isDebt = false }: BucketProps) {
  const [expanded, setExpanded] = useState(true);

  if (accounts.length === 0) return null;

  const subtotal = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const subtotalColor = isDebt ? colors.danger : colors.success;

  return (
    <View style={styles.bucket}>
      <TouchableOpacity
        style={styles.bucketHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.bucketLeft}>
          <View style={[styles.bucketIconWrap, { backgroundColor: isDebt ? colors.danger + "22" : colors.primary + "22" }]}>
            <Ionicons name={icon} size={14} color={isDebt ? colors.danger : colors.primary} />
          </View>
          <Text style={styles.bucketTitle}>{title}</Text>
        </View>
        <View style={styles.bucketRight}>
          <Text style={[styles.bucketSubtotal, { color: isDebt ? colors.danger : colors.text }]}>
            {isDebt ? "-" : ""}{formatCurrency(subtotal)}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.textDim}
            style={{ marginLeft: spacing.xs }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.bucketRows}>
          {accounts.map((a) => (
            <View key={a.id} style={styles.accountRow}>
              <View style={styles.accountLeft}>
                <Text style={styles.institutionName} numberOfLines={1}>
                  {a.institutionName ?? "—"}
                </Text>
                <Text style={styles.accountName} numberOfLines={1}>
                  {a.name}
                </Text>
              </View>
              <Text style={[styles.accountBalance, { color: subtotalColor }]}>
                {isDebt ? "-" : ""}{formatCurrency(a.currentBalance)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface AccountsSectionProps {
  accounts: AccountSummary[];
}

export function AccountsSection({ accounts }: AccountsSectionProps) {
  if (!accounts || accounts.length === 0) return null;

  const bank = accounts.filter((a) => a.type === "CHECKING" || a.type === "SAVINGS");
  const debt = accounts.filter((a) => a.type === "CREDIT" || a.type === "LOAN");
  const investments = accounts.filter((a) => a.type === "INVESTMENT");

  return (
    <View style={styles.container}>
      <AccountBucket title="Bank Accounts" icon="wallet-outline" accounts={bank} />
      <AccountBucket title="Credit & Debt" icon="card-outline" accounts={debt} isDebt />
      <AccountBucket title="Investments" icon="trending-up-outline" accounts={investments} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bucket: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  bucketLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  bucketIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  bucketTitle: {
    ...typography.label,
    fontSize: 13,
  },
  bucketRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  bucketSubtotal: {
    fontSize: 14,
    fontWeight: "700",
  },
  bucketRows: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "60",
  },
  accountLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  institutionName: {
    fontSize: 11,
    color: colors.textDim,
    marginBottom: 2,
  },
  accountName: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 13,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: "600",
  },
});

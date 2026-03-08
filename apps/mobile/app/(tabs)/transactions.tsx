import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";

interface Transaction {
  id: string;
  amount: number;
  date: string;
  merchantName: string | null;
  note: string | null;
  isImpulse: boolean;
  category: { id: string; name: string; icon: string; color: string } | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(amount));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TransactionRow({ tx, onToggleImpulse }: { tx: Transaction; onToggleImpulse: () => void }) {
  const isExpense = tx.amount > 0;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: tx.category?.color ?? colors.surfaceAlt }]}>
        <Text style={styles.txIconText}>{tx.category?.icon ?? "📦"}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>
          {tx.merchantName ?? "Unknown"}
        </Text>
        <Text style={styles.txMeta}>
          {formatDate(tx.date)}
          {tx.category && ` · ${tx.category.name}`}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isExpense ? colors.danger : colors.success }]}>
          {isExpense ? "-" : "+"}{formatCurrency(tx.amount)}
        </Text>
        <TouchableOpacity onPress={onToggleImpulse}>
          <Text style={[styles.impulseTag, tx.isImpulse && styles.impulseTagActive]}>
            {tx.isImpulse ? "⚡ Impulse" : "Flag"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TransactionsScreen() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["transactions", search],
    queryFn: () =>
      api.get<TransactionsResponse>(
        `/transactions?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`
      ),
    staleTime: 10_000,
  });

  const toggleImpulse = useMutation({
    mutationFn: ({ id, isImpulse }: { id: string; isImpulse: boolean }) =>
      api.patch(`/transactions/${id}`, { isImpulse }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TextInput
          style={styles.search}
          placeholder="Search merchants..."
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={data?.transactions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            onToggleImpulse={() =>
              toggleImpulse.mutate({ id: item.id, isImpulse: !item.isImpulse })
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={typography.body}>No transactions yet.</Text>
              <Text style={typography.bodySmall}>Connect a bank account to see your spending.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md, paddingTop: spacing.xl },
  title: { ...typography.h2, marginBottom: spacing.md },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { padding: spacing.md, gap: spacing.xs },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  txIconText: { fontSize: 18 },
  txInfo: { flex: 1 },
  txMerchant: { ...typography.label, marginBottom: 2 },
  txMeta: { ...typography.caption },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  impulseTag: {
    fontSize: 11,
    color: colors.textDim,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  impulseTagActive: {
    color: colors.warning,
    borderColor: colors.warning,
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
});

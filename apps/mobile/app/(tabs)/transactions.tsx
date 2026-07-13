import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api";
import {
  AccountSummary,
  AccountsResponse,
  CategorySummary,
  TransactionSummary,
  TransactionsResponse,
  formatShortDate,
  formatSignedTransactionAmount,
  toIsoDateInput,
  toTransactionIsoDate,
} from "@/lib/finance";
import { spacing, radius } from "@/lib/theme";
import { useTheme, useThemedStyles, type Theme } from "@/lib/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";

type ManualTransactionDraft = {
  id?: string;
  accountId: string;
  amount: string;
  flow: "expense" | "income";
  date: string;
  merchantName: string;
  categoryId: string;
  note: string;
  isImpulse: boolean;
};

const emptyDraft: ManualTransactionDraft = {
  accountId: "",
  amount: "",
  flow: "expense",
  date: new Date().toISOString().slice(0, 10),
  merchantName: "",
  categoryId: "",
  note: "",
  isImpulse: false,
};

function transactionErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "ACCOUNT_NOT_MANUAL") {
      return "Choose a manual account for manual transactions.";
    }
    if (error.code === "TRANSACTION_NOT_DELETABLE") {
      return "Imported Plaid transactions cannot be deleted.";
    }
    return error.message;
  }

  return error instanceof Error ? error.message : "Please try again.";
}

function ManualTransactionModal({
  visible,
  draft,
  manualAccounts,
  categories,
  saving,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: {
  visible: boolean;
  draft: ManualTransactionDraft;
  manualAccounts: AccountSummary[];
  categories: CategorySummary[];
  saving: boolean;
  onChange: (next: ManualTransactionDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDelete: (() => void) | null;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{draft.id ? "Edit manual transaction" : "Add manual transaction"}</Text>
          <Text style={styles.modalSubtitle}>
            Manual transactions keep budgets, goals, and the dashboard useful even without Plaid.
          </Text>

          <View style={styles.toggleRow}>
            {(["expense", "income"] as const).map((flow) => {
              const selected = draft.flow === flow;
              return (
                <Pressable
                  key={flow}
                  style={[styles.toggleButton, selected && styles.toggleButtonSelected]}
                  onPress={() => onChange({ ...draft, flow })}
                >
                  <Text style={[styles.toggleLabel, selected && styles.toggleLabelSelected]}>
                    {flow === "expense" ? "Expense" : "Income"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            value={draft.amount}
            onChangeText={(amount) => onChange({ ...draft, amount })}
            placeholder="Amount"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={styles.input}
            value={draft.date}
            onChangeText={(date) => onChange({ ...draft, date })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={draft.merchantName}
            onChangeText={(merchantName) => onChange({ ...draft, merchantName })}
            placeholder="Merchant or income source"
            placeholderTextColor={colors.textDim}
          />
          <TextInput
            style={styles.input}
            value={draft.note}
            onChangeText={(note) => onChange({ ...draft, note })}
            placeholder="Note (optional)"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.fieldLabel}>Manual account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {manualAccounts.map((account) => {
              const selected = draft.accountId === account.id;
              return (
                <Pressable
                  key={account.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => onChange({ ...draft, accountId: account.id })}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{account.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              style={[styles.chip, !draft.categoryId && styles.chipSelected]}
              onPress={() => onChange({ ...draft, categoryId: "" })}
            >
              <Text style={[styles.chipLabel, !draft.categoryId && styles.chipLabelSelected]}>Uncategorized</Text>
            </Pressable>
            {categories.map((category) => {
              const selected = draft.categoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    { borderColor: selected ? category.color : colors.border },
                  ]}
                  onPress={() => onChange({ ...draft, categoryId: category.id })}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {category.icon} {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.impulseToggle, draft.isImpulse && styles.impulseToggleSelected]}
            onPress={() => onChange({ ...draft, isImpulse: !draft.isImpulse })}
          >
            <Text style={[styles.impulseToggleText, draft.isImpulse && styles.impulseToggleTextSelected]}>
              {draft.isImpulse ? "Impulse purchase flagged" : "Mark as impulse purchase"}
            </Text>
          </Pressable>

          <View style={styles.modalActions}>
            {onDelete ? (
              <TouchableOpacity style={styles.modalDeleteButton} onPress={onDelete} disabled={saving}>
                <Text style={styles.modalDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose} disabled={saving}>
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, saving && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={saving}
            >
              <Text style={styles.modalPrimaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TransactionRow({
  tx,
  onToggleImpulse,
  onOpenManualEditor,
}: {
  tx: TransactionSummary;
  onToggleImpulse: () => void;
  onOpenManualEditor: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable style={styles.txRow} onPress={tx.isManual ? onOpenManualEditor : undefined}>
      <View style={[styles.txIcon, { backgroundColor: tx.category?.color ?? colors.surfaceAlt }]}>
        <Text style={styles.txIconText}>{tx.category?.icon ?? "$"}</Text>
      </View>

      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>
          {tx.merchantName ?? (tx.amount > 0 ? "Manual expense" : "Manual income")}
        </Text>
        <Text style={styles.txMeta} numberOfLines={1}>
          {formatShortDate(tx.date)}
          {tx.category ? ` · ${tx.category.name}` : ` · ${tx.account.name}`}
        </Text>
      </View>

      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: tx.amount > 0 ? colors.danger : colors.success }]}>
          {formatSignedTransactionAmount(tx.amount)}
        </Text>
        <TouchableOpacity onPress={onToggleImpulse}>
          <Text style={[styles.impulseTag, tx.isImpulse && styles.impulseTagActive]}>
            {tx.isImpulse ? "Impulse" : "Flag"}
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState<ManualTransactionDraft>(emptyDraft);
  const qc = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<AccountsResponse>("/accounts"),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<CategorySummary[]>("/categories"),
    staleTime: 60_000,
  });

  const transactionsQuery = useQuery({
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const manualTransactionMutation = useMutation({
    mutationFn: async (currentDraft: ManualTransactionDraft) => {
      const absoluteAmount = Number(currentDraft.amount);
      if (!currentDraft.accountId) throw new Error("Choose a manual account first.");
      if (!Number.isFinite(absoluteAmount) || absoluteAmount <= 0) {
        throw new Error("Enter an amount greater than zero.");
      }

      let date: string;
      try {
        date = toTransactionIsoDate(currentDraft.date);
      } catch {
        throw new Error("Enter a valid date in YYYY-MM-DD format.");
      }

      const payload = {
        accountId: currentDraft.accountId,
        amount: currentDraft.flow === "expense" ? absoluteAmount : -absoluteAmount,
        date,
        merchantName: currentDraft.merchantName.trim() || undefined,
        categoryId: currentDraft.categoryId || undefined,
        note: currentDraft.note.trim() || undefined,
        isImpulse: currentDraft.isImpulse,
      };

      if (currentDraft.id) {
        return api.patch(`/transactions/${currentDraft.id}`, payload);
      }

      return api.post("/transactions", payload);
    },
    onSuccess: () => {
      setModalVisible(false);
      setDraft(emptyDraft);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const deleteManualTransactionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      setModalVisible(false);
      setDraft(emptyDraft);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const manualAccounts = (accountsQuery.data?.accounts ?? []).filter((account) => account.source === "MANUAL");
  const categories = categoriesQuery.data ?? [];
  const transactions = transactionsQuery.data?.transactions ?? [];

  const openCreateModal = () => {
    if (manualAccounts.length === 0) {
      Alert.alert(
        "Add a manual account first",
        "Create a manual account in Profile before adding manual transactions."
      );
      return;
    }

    setDraft({
      ...emptyDraft,
      accountId: manualAccounts[0]?.id ?? "",
    });
    setModalVisible(true);
  };

  const openEditModal = (tx: TransactionSummary) => {
    if (!tx.isManual) return;
    setDraft({
      id: tx.id,
      accountId: tx.account.id,
      amount: String(Math.abs(tx.amount)),
      flow: tx.amount > 0 ? "expense" : "income",
      date: toIsoDateInput(tx.date),
      merchantName: tx.merchantName ?? "",
      categoryId: tx.category?.id ?? "",
      note: tx.note ?? "",
      isImpulse: tx.isImpulse,
    });
    setModalVisible(true);
  };

  const submitManualTransaction = async () => {
    try {
      await manualTransactionMutation.mutateAsync(draft);
    } catch (error) {
      Alert.alert("Could not save transaction", transactionErrorMessage(error));
    }
  };

  const confirmDeleteTransaction = () => {
    if (!draft.id) return;

    Alert.alert(
      "Delete transaction?",
      "This removes the manual transaction from budgets, goals, and the dashboard.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteManualTransactionMutation.mutateAsync(draft.id!);
            } catch (error) {
              Alert.alert("Could not delete transaction", transactionErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const listEmpty = !transactionsQuery.isLoading && !transactionsQuery.isError;

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Activity</Text>
              <Text style={styles.activitySubtitle}>Manually added spending and income</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Text style={styles.addButtonText}>Add transaction</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Search merchants..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {transactionsQuery.isError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Transactions are unavailable</Text>
            <Text style={styles.errorBody}>
              We could not load your ledger. Retry the API call or use manual entry once the connection is back.
            </Text>
            <TouchableOpacity style={styles.errorButton} onPress={() => transactionsQuery.refetch()}>
              <Text style={styles.errorButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionRow
              tx={item}
              onToggleImpulse={() => toggleImpulse.mutate({ id: item.id, isImpulse: !item.isImpulse })}
              onOpenManualEditor={() => openEditModal(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={transactionsQuery.isRefetching}
              onRefresh={transactionsQuery.refetch}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            listEmpty ? (
              <EmptyState
                icon="receipt"
                title="No activity yet"
                body="Use Add transaction to log an expense or income. Your Today totals update right away."
                actionLabel="Add transaction"
                onAction={openCreateModal}
              />
            ) : null
          }
        />
      </View>

      <ManualTransactionModal
        visible={modalVisible}
        draft={draft}
        manualAccounts={manualAccounts}
        categories={categories}
        saving={manualTransactionMutation.isPending || deleteManualTransactionMutation.isPending}
        onChange={setDraft}
        onClose={() => {
          if (manualTransactionMutation.isPending || deleteManualTransactionMutation.isPending) return;
          setModalVisible(false);
          setDraft(emptyDraft);
        }}
        onSubmit={submitManualTransaction}
        onDelete={draft.id ? confirmDeleteTransaction : null}
      />
    </>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md, paddingTop: spacing.xl, gap: spacing.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.h2 },
  activitySubtitle: { ...typography.caption, marginTop: 2 },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addButtonText: { color: colors.white, fontWeight: "700" },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { padding: spacing.md, gap: spacing.xs, flexGrow: 1 },
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
  txSource: { ...typography.caption, marginTop: 4, color: colors.textMuted },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
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
    justifyContent: "center",
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.label },
  emptyBody: { ...typography.bodySmall, textAlign: "center", maxWidth: 280 },
  emptyButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyButtonText: { color: colors.white, fontWeight: "700" },
  errorCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    padding: spacing.md,
  },
  errorTitle: { ...typography.label, color: colors.danger },
  errorBody: { ...typography.bodySmall, marginTop: spacing.xs },
  errorButton: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorButtonText: { color: colors.white, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { ...typography.h3 },
  modalSubtitle: { ...typography.bodySmall, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  chipSelected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  chipLabel: { color: colors.textMuted, fontWeight: "600" },
  chipLabelSelected: { color: colors.white },
  toggleRow: { flexDirection: "row", gap: spacing.sm },
  toggleButton: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
  },
  toggleButtonSelected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  toggleLabel: { color: colors.textMuted, fontWeight: "700" },
  toggleLabelSelected: { color: colors.white },
  impulseToggle: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  impulseToggleSelected: {
    borderColor: colors.warning,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  impulseToggleText: { color: colors.textMuted, fontWeight: "600" },
  impulseToggleTextSelected: { color: colors.warning },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalDeleteButton: {
    marginRight: "auto",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  modalDeleteButtonText: { color: colors.danger, fontWeight: "700" },
  modalSecondaryButton: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSecondaryButtonText: { color: colors.text },
  modalPrimaryButton: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  modalPrimaryButtonText: { color: colors.white, fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
});

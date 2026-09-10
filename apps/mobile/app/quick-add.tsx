import { useAuthStore } from "@/store/auth";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountsResponse, UpcomingObligation } from "@worthlane/types";
import type { CategorySummary } from "@/lib/finance";
import { ApiError, api } from "@/lib/api";
import { getDefaultReminder, scheduleObligationReminder } from "@/lib/obligation-reminders";
import { spacing, radius } from "@/lib/theme";
import { useThemedStyles, type Theme } from "@/lib/ThemeContext";
import { captureV1Event } from "@/lib/v1-analytics";

type Kind = "expense" | "income" | "bill" | "credit";

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "This item or account is no longer available. Refresh and try again.";
  }
  if (error instanceof ApiError && error.status >= 500) {
    return "The service is updating. Your entry was not saved—please try again in a moment.";
  }
  return error instanceof Error ? error.message : "Could not save. Please try again.";
}

export default function QuickAddScreen() {
  const userId = useAuthStore(state => state.userId);
  return userId ? <QuickAddContent key={userId} userId={userId} /> : null;
}

function QuickAddContent({ userId }: { userId: string }) {
  const { kind: initial } = useLocalSearchParams<{ kind?: Kind }>();
  const [kind, setKind] = useState<Kind>(
    initial === "bill" ? "bill" : initial === "credit" ? "credit" : initial === "income" ? "income" : "expense"
  );
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const accounts = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => api.get<AccountsResponse>("/accounts"),
  });
  const isUpcoming = kind === "bill" || kind === "credit";
  const categories = useQuery({
    queryKey: ["categories", userId],
    queryFn: () => api.get<CategorySummary[]>("/categories"),
    enabled: !isUpcoming,
  });
  const manualAccounts = accounts.data?.accounts.filter(entry => entry.source === "MANUAL") ?? [];
  const selectedAccountId = accountId || (manualAccounts.length === 1 ? manualAccounts[0].id : "");

  useEffect(() => {
    captureV1Event("quick_add_opened");
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!/^\d+(?:\.\d{1,2})?$/.test(amount.trim()) || !Number.isFinite(value) || value <= 0 || !name.trim()) {
        throw new Error("Enter a description and a positive amount with at most two decimal places.");
      }

      if (!isUpcoming) {
        const account = manualAccounts.find(entry => entry.id === selectedAccountId);
        if (!account) throw new Error("Choose a manual account for this entry.");
        return api.post("/transactions", {
          accountId: account.id,
          amount: kind === "income" ? -value : value,
          merchantName: name.trim(),
          categoryId: categoryId || undefined,
          date: new Date().toISOString(),
          isImpulse: false,
        });
      }

      const reminderTiming = await getDefaultReminder(userId);
      const item = await api.post<UpcomingObligation>("/upcoming", {
        name: name.trim(),
        amount: value,
        dueDate,
        type: kind === "credit" ? "CREDIT_CARD" : "BILL",
        reminderTiming,
      });
      const reminderResult = await scheduleObligationReminder(userId, item).catch(() => "unavailable" as const);
      return { item, reminderResult };
    },
    onSuccess: (result) => {
      if (useAuthStore.getState().userId !== userId) return;
      captureV1Event(isUpcoming ? "upcoming_item_created" : "manual_transaction_created");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["household-summary", userId] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      Alert.alert(
        "Saved",
        result && typeof result === "object" && "reminderResult" in result && (result.reminderResult === "denied" || result.reminderResult === "unavailable")
          ? "Your item was saved, but its device reminder could not be scheduled. Check notification settings before relying on a reminder."
          : "It’s now reflected in your Today view."
      );
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Close quick add">
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Quick add</Text>
        <Text style={styles.subtitle}>What would you like to add?</Text>
        <View style={styles.choices}>
          {(["expense", "income", "bill", "credit"] as Kind[]).map((value) => (
            <TouchableOpacity
              key={value}
              disabled={save.isPending}
              onPress={() => setKind(value)}
              style={[styles.choice, kind === value && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, kind === value && styles.choiceTextSelected]}>
                {value === "credit" ? "Card payment" : value[0].toUpperCase() + value.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          keyboardType="decimal-pad"
          placeholderTextColor={styles.placeholder.color}
          accessibilityLabel="Amount"
          editable={!save.isPending}
        />
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={isUpcoming ? "Bill or payment name" : "Merchant or description"}
          placeholderTextColor={styles.placeholder.color}
          accessibilityLabel="Description"
          editable={!save.isPending}
        />
        {!isUpcoming && <>
          <Text style={styles.fieldLabel}>Account</Text>
          {accounts.isPending && <Text style={styles.hint}>Loading accounts…</Text>}
          {accounts.isError && <TouchableOpacity onPress={() => accounts.refetch()}><Text style={styles.error}>Could not load accounts. Tap to retry.</Text></TouchableOpacity>}
          {!accounts.isPending && !accounts.isError && !manualAccounts.length && <TouchableOpacity onPress={() => router.push("/(tabs)/profile?addAccount=1" as any)}><Text style={styles.close}>Add a manual account</Text></TouchableOpacity>}
          <View style={styles.choices}>{manualAccounts.map(account => <TouchableOpacity key={account.id} disabled={save.isPending} accessibilityRole="radio" accessibilityState={{ checked: account.id === selectedAccountId }} onPress={() => setAccountId(account.id)} style={[styles.choice, account.id === selectedAccountId && styles.choiceSelected]}><Text style={styles.choiceText}>{account.name}</Text></TouchableOpacity>)}</View>
          <TouchableOpacity disabled={save.isPending} accessibilityRole="button" accessibilityState={{ expanded: showCategories }} onPress={() => setShowCategories(value => !value)}><Text style={styles.fieldLabel}>Category: {categories.data?.find(category => category.id === categoryId)?.name ?? "Uncategorized"} {showCategories ? "−" : "+"}</Text></TouchableOpacity>
          {showCategories && <>
            {categories.isPending && <Text style={styles.hint}>Loading categories…</Text>}
            {categories.isError && <TouchableOpacity onPress={() => categories.refetch()}><Text style={styles.error}>Could not load categories. Tap to retry.</Text></TouchableOpacity>}
            <View style={styles.choices}>{[{ id: "", name: "Uncategorized" }, ...(categories.data ?? [])].map(category => <TouchableOpacity key={category.id} disabled={save.isPending} accessibilityRole="radio" accessibilityState={{ checked: category.id === categoryId }} onPress={() => { setCategoryId(category.id); setShowCategories(false); }} style={[styles.choice, category.id === categoryId && styles.choiceSelected]}><Text style={styles.choiceText}>{category.name}</Text></TouchableOpacity>)}</View>
          </>}
        </>}
        {isUpcoming ? (
          <>
            <Text style={styles.fieldLabel}>Due date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={styles.placeholder.color}
              accessibilityLabel="Due date"
              editable={!save.isPending}
            />
          </>
        ) : null}
        <Text style={styles.hint}>
          {isUpcoming
            ? "Your reminder preference from Settings will be used."
            : "Choose the account that paid. Its sharing setting controls visibility; your agreed budget split stays the same. Avoid re-entering purchases that your bank imports. You can edit details in Activity."}
        </Text>
        <TouchableOpacity
          style={[styles.save, save.isPending && styles.disabled]}
          onPress={() => save.mutate()}
          disabled={save.isPending}
          accessibilityLabel="Save quick entry"
        >
          <Text style={styles.saveText}>{save.isPending ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
        {save.error ? <Text style={styles.error}>{saveErrorMessage(save.error)}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.md, paddingBottom: spacing.xxl },
    close: { color: colors.primary, fontWeight: "700", marginBottom: spacing.lg },
    title: { ...typography.h1 },
    subtitle: { ...typography.bodySmall, marginTop: spacing.xs, marginBottom: spacing.md },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
    choice: { minHeight: 44, justifyContent: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full },
    choiceSelected: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
    choiceText: { color: colors.textMuted, fontWeight: "600" },
    choiceTextSelected: { color: colors.text },
    input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, color: colors.text, fontSize: 16 },
    placeholder: { color: colors.textDim },
    fieldLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.xs },
    hint: { ...typography.caption, marginVertical: spacing.md },
    save: { backgroundColor: colors.primary, padding: spacing.md, alignItems: "center", borderRadius: radius.md },
    saveText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },
    disabled: { opacity: 0.6 },
    error: { color: colors.danger, marginTop: spacing.sm },
  });

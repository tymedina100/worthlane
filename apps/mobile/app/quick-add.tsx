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
import { ApiError, api } from "@/lib/api";
import { getDefaultReminder, scheduleObligationReminder } from "@/lib/obligation-reminders";
import { spacing, radius } from "@/lib/theme";
import { useThemedStyles, type Theme } from "@/lib/ThemeContext";
import { captureV1Event } from "@/lib/v1-analytics";

type Kind = "expense" | "income" | "bill" | "credit";

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "Bills and card payments are still being enabled. Please update shortly and try again.";
  }
  if (error instanceof ApiError && error.status >= 500) {
    return "The service is updating. Your entry was not saved—please try again in a moment.";
  }
  return error instanceof Error ? error.message : "Could not save. Please try again.";
}

export default function QuickAddScreen() {
  const { kind: initial } = useLocalSearchParams<{ kind?: Kind }>();
  const [kind, setKind] = useState<Kind>(
    initial === "bill" ? "bill" : initial === "credit" ? "credit" : initial === "income" ? "income" : "expense"
  );
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<AccountsResponse>("/accounts"),
  });
  const isUpcoming = kind === "bill" || kind === "credit";

  useEffect(() => {
    captureV1Event("quick_add_opened");
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0 || !name.trim()) {
        throw new Error("Enter a description and a positive amount.");
      }

      if (!isUpcoming) {
        const account = accounts.data?.accounts.find((entry) => entry.source === "MANUAL");
        if (!account) throw new Error("Add a manual account first so this transaction has a home.");
        return api.post("/transactions", {
          accountId: account.id,
          amount: kind === "income" ? -value : value,
          merchantName: name.trim(),
          date: new Date().toISOString(),
          isImpulse: false,
        });
      }

      const reminderTiming = await getDefaultReminder();
      const item = await api.post<UpcomingObligation>("/upcoming", {
        name: name.trim(),
        amount: value,
        dueDate,
        type: kind === "credit" ? "CREDIT_CARD" : "BILL",
        reminderTiming,
      });
      const reminderResult = await scheduleObligationReminder(item);
      return { item, reminderResult };
    },
    onSuccess: (result) => {
      captureV1Event(isUpcoming ? "upcoming_item_created" : "manual_transaction_created");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert(
        "Saved",
        result && typeof result === "object" && "reminderResult" in result && result.reminderResult === "denied"
          ? "Your item was saved. You can turn on reminders later in Settings."
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
        />
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={isUpcoming ? "Bill or payment name" : "Merchant or description"}
          placeholderTextColor={styles.placeholder.color}
          accessibilityLabel="Description"
        />
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
            />
          </>
        ) : null}
        <Text style={styles.hint}>
          {isUpcoming
            ? "Your reminder preference from Settings will be used."
            : "More details can be added later from Activity."}
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
    choice: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full },
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

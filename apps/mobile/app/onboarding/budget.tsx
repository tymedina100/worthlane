import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";
import type { Category } from "@worthlane/types";

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i < current ? styles.dotDone : i === current ? styles.dotCurrent : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

export default function OnboardingBudget() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const qc = useQueryClient();

  const skip = () => router.push("/onboarding/goal");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/budgets", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      router.push("/onboarding/goal");
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not create budget.");
    },
  });

  const handleSubmit = () => {
    if (!selectedCategoryId) return Alert.alert("Pick a category", "Select a spending category to budget.");
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return Alert.alert("Enter an amount", "How much do you want to spend in this category?");
    mutation.mutate({ categoryId: selectedCategoryId, amount: parsed, period: "MONTHLY" });
  };

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProgressDots current={1} total={3} />

          <View style={styles.header}>
            <Text style={styles.heading}>Set your first budget.</Text>
            <Text style={styles.subtitle}>
              Pick one category you tend to overspend in. You can add more later.
            </Text>
          </View>

          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {categories?.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.categoryChip,
                  selectedCategoryId === c.id && { borderColor: c.color, backgroundColor: `${c.color}22` },
                ]}
                onPress={() => setSelectedCategoryId(c.id)}
              >
                <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategoryId === c.id && { color: c.color },
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>
            Monthly limit
            {selectedCategory ? ` for ${selectedCategory.name}` : ""}
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySign}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, mutation.isPending && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {mutation.isPending ? "Creating…" : "Create Budget"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={skip}>
              <Text style={styles.skipText}>Do this later →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { padding: spacing.xl, flexGrow: 1 },
  dots: { flexDirection: "row", gap: spacing.xs, paddingTop: spacing.sm, marginBottom: spacing.xl },
  dot: { height: 4, borderRadius: radius.full },
  dotDone: { width: 24, backgroundColor: colors.primaryDim },
  dotCurrent: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.border },
  header: { marginBottom: spacing.xl },
  heading: { fontSize: 32, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, lineHeight: 40 },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 24 },
  label: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
  categoryScroll: { flexGrow: 0, marginBottom: spacing.xl },
  categoryRow: { flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.xs },
  categoryChip: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 80,
  },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  currencySign: { fontSize: 28, fontWeight: "700", color: colors.textMuted, marginRight: spacing.xs },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
    paddingVertical: spacing.md,
  },
  actions: { gap: spacing.sm, marginTop: "auto" as any },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.bg, fontSize: 16, fontWeight: "700" },
  skipButton: { alignItems: "center", padding: spacing.md },
  skipText: { color: colors.textMuted, fontSize: 15 },
});

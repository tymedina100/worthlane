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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";

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

const GOAL_PRESETS = [
  { icon: "🛡️", name: "Emergency Fund", type: "EMERGENCY_FUND" },
  { icon: "🏠", name: "Down Payment", type: "SAVINGS" },
  { icon: "✈️", name: "Vacation", type: "PURCHASE" },
  { icon: "🏦", name: "Pay Off Debt", type: "DEBT_PAYOFF" },
  { icon: "💻", name: "New Laptop", type: "PURCHASE" },
  { icon: "🎓", name: "Education", type: "SAVINGS" },
] as const;

export default function OnboardingGoal() {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const qc = useQueryClient();

  const skip = () => router.replace("/(tabs)/dashboard");

  const applyPreset = (preset: (typeof GOAL_PRESETS)[number]) => {
    setName(preset.name);
    setSelectedIcon(preset.icon);
  };

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/goals", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      router.replace("/(tabs)/dashboard");
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not create goal.");
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) return Alert.alert("Name required", "What are you saving for?");
    const amount = parseFloat(targetAmount);
    if (!amount || amount <= 0) return Alert.alert("Enter an amount", "How much do you want to save?");
    mutation.mutate({
      name: name.trim(),
      targetAmount: amount,
      type: "SAVINGS",
      icon: selectedIcon ?? "🎯",
    });
  };

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
          <ProgressDots current={2} total={3} />

          <View style={styles.header}>
            <Text style={styles.heading}>What are you{"\n"}saving for?</Text>
            <Text style={styles.subtitle}>
              Set a goal and Vantage will track your progress automatically.
            </Text>
          </View>

          {/* Presets */}
          <Text style={styles.label}>Quick pick</Text>
          <View style={styles.presetGrid}>
            {GOAL_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.name}
                style={[
                  styles.presetChip,
                  name === p.name && styles.presetChipActive,
                ]}
                onPress={() => applyPreset(p)}
              >
                <Text style={{ fontSize: 20 }}>{p.icon}</Text>
                <Text style={[styles.presetText, name === p.name && { color: colors.primary }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom name */}
          <Text style={styles.label}>Goal name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Emergency Fund"
            placeholderTextColor={colors.textDim}
            value={name}
            onChangeText={setName}
          />

          {/* Target amount */}
          <Text style={styles.label}>Target amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySign}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, mutation.isPending && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {mutation.isPending ? "Creating…" : "Create Goal"}
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
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  presetText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
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

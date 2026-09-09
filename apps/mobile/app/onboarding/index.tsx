import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, StyleSheet, TouchableOpacity, View } from "react-native";
import { Redirect, router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createHouseholdSchema, householdSummarySchema } from "@worthlane/contracts";
import { spacing, radius } from "@/lib/theme";
import { useThemedStyles, type Theme } from "@/lib/ThemeContext";
import { captureV1Event } from "@/lib/v1-analytics";
import { ApiError, api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AccountsResponse } from "@/lib/finance";

export default function OnboardingWelcome() {
  const styles = useThemedStyles(createStyles);
  const { userId, isLoading } = useAuthStore();
  const client = useQueryClient();
  const [mode, setMode] = useState<"solo" | "household" | "join" | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const household = useQuery({ queryKey: ["household-summary", userId], queryFn: async () => householdSummarySchema.parse(await api.get("/households/current/summary")), enabled: Boolean(userId), retry: false });
  const accounts = useQuery({ queryKey: ["accounts", userId], queryFn: () => api.get<AccountsResponse>("/accounts"), enabled: Boolean(userId) });
  const missing = household.error instanceof ApiError && household.error.status === 404;
  async function savePlan() {
    if (busy) return;
    const parsed = createHouseholdSchema.safeParse({ name, displayName, currency: "USD", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (mode !== "join" && !parsed.success) { setError("Enter your display name and a name for your plan."); return; }
    if (mode === "join" && !code.trim()) { setError("Enter the invitation code your partner shared with you."); return; }
    setBusy(true); setError(null);
    try {
      if (mode === "join") await api.post("/households/invitations/accept", { invitationCode: code.trim() });
      else if (parsed.success) await api.post("/households", parsed.data);
      await client.invalidateQueries({ queryKey: ["household-summary", userId] });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your plan could not be saved."); }
    finally { setBusy(false); }
  }
  const action = (label: string, onPress: () => void, primary = false) => <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.action, primary && styles.primary]} onPress={onPress}><Text style={primary ? styles.primaryText : styles.actionText}>{label}</Text></TouchableOpacity>;
  const go = (path: Href) => () => router.push(path);
  if (!isLoading && !userId) return <Redirect href="/(auth)/login" />;
  return <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>WORTHLANE</Text>
        <Text style={styles.heading}>{household.data ? "Build your money picture" : "A plan for your life"}</Text>
        <Text style={styles.subtitle}>Know what’s yours to cover, what’s available, and what’s next.</Text>
        {isLoading || household.isLoading ? <ActivityIndicator accessibilityLabel="Loading your setup" /> : null}
        {household.isError && !missing ? <View style={styles.card}><Text style={styles.text}>We couldn’t load your saved setup.</Text>{action("Try again", () => void household.refetch())}</View> : null}
        {missing ? <>
          <Text style={styles.label}>1. Choose how you’ll plan</Text>
          {action("Just me", () => { setMode("solo"); setName("My plan"); setError(null); }, mode === "solo")}
          {action("With a partner or family", () => { setMode("household"); setName("Our home"); setError(null); }, mode === "household")}
          {action("Join with an invitation code", () => { setMode("join"); setError(null); }, mode === "join")}
          {mode === "solo" || mode === "household" ? <View style={styles.card}>
            <Text style={styles.label}>{mode === "solo" ? "Your own plan" : "One plan, separate logins"}</Text>
            <Text style={styles.text}>{mode === "solo" ? "No invitation is needed. You can add a partner later if you choose." : "Start your plan now and invite one other adult when you’re ready. Family plans use at most two consenting logins."}</Text>
            <Text style={styles.label}>Your display name</Text><TextInput accessibilityLabel="Your display name" style={styles.input} editable={!busy} value={displayName} onChangeText={setDisplayName} maxLength={80} />
            <Text style={styles.label}>Plan name</Text><TextInput accessibilityLabel="Plan name" style={styles.input} editable={!busy} value={name} onChangeText={setName} maxLength={100} />
            <Text style={styles.text}>Amounts use USD. Monthly budgets follow your device’s time zone.</Text>
            <Text style={styles.text}>Accounts stay private. An invitation shares no account data; each owner chooses what their partner can see.</Text>
            {action(busy ? "Creating…" : "Create my plan", () => void savePlan(), true)}
          </View> : null}
          {mode === "join" ? <View style={styles.card}>
            <Text style={styles.label}>Join your partner’s plan</Text>
            <Text style={styles.text}>Use the email they invited. Accepting lets both of you see the shared plan; your accounts stay private until you choose to share them.</Text>
            <TextInput accessibilityLabel="Invitation code" style={styles.input} editable={!busy} value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} />
            {action(busy ? "Joining…" : "Accept invitation and join", () => void savePlan(), true)}
          </View> : null}
        </> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {household.data ? <>
          <View style={styles.card}><Text style={styles.label}>1. {household.data.household.name} is ready</Text><Text style={styles.text}>{household.data.members.length === 1 ? "You can use this plan on your own. Inviting someone is optional." : "You have separate logins and a shared plan. Account visibility stays under each owner’s control."}</Text>{action("Review plan and invitations", go("/household"))}</View>
          <View style={styles.card}><Text style={styles.label}>2. Add a money source</Text><Text style={styles.text}>{accounts.data?.accounts.length ? "Your saved account is ready. Add another whenever you need it." : "Start with an account and its current balance. Manual entry is always available."}</Text>{action("Add manual account", go("/(tabs)/profile?addAccount=1"), true)}{action("Bank connections and accounts", go("/(tabs)/profile"))}</View>
          <View style={styles.card}><Text style={styles.label}>3. Give each category a plan</Text><Text style={styles.text}>Assign a category to one person, split it evenly, or set percentages. Who pays does not change the agreed split.</Text>{action("Set category budgets", go("/household"))}</View>
          <View style={styles.card}><Text style={styles.label}>4. See what’s next</Text><Text style={styles.text}>Add a bill or plan debt payments. You can return to setup from Settings at any time.</Text>{action("Add an upcoming bill", go("/quick-add?kind=bill"))}{action("Explore debt plans", go("/debt-plans"))}</View>
          {action("Go to Today", () => { captureV1Event("onboarding_completed"); router.replace("/(tabs)/dashboard"); }, true)}
        </> : null}
        {!household.data ? action("I’ll set up later", () => router.replace("/(tabs)/dashboard")) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const createStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg }, inner: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  wordmark: { color: colors.primary, fontSize: 14, fontWeight: "700", letterSpacing: 4, marginTop: spacing.md }, heading: { ...typography.h1, marginTop: spacing.md }, subtitle: { ...typography.body, marginBottom: spacing.md },
  card: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, marginTop: spacing.sm },
  label: { ...typography.h3 }, text: { ...typography.bodySmall, lineHeight: 21 }, input: { padding: spacing.md, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  action: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: "center" }, primary: { backgroundColor: colors.primary, borderColor: colors.primary }, actionText: { color: colors.text, fontWeight: "600" }, primaryText: { color: colors.onPrimary, fontWeight: "700" }, error: { color: colors.danger, fontSize: 14 },
});

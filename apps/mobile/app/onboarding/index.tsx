import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import type { LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";
import { api } from "@/lib/api";
import { PLAID_ENABLED } from "@/lib/flags";
import { spacing, radius } from "@/lib/theme";
import { useTheme, useThemedStyles, type Theme } from "@/lib/ThemeContext";

function ProgressDots({ current, total }: { current: number; total: number }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i < current ? styles.dotActive : i === current ? styles.dotCurrent : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

export default function OnboardingWelcome() {
  const styles = useThemedStyles(createStyles);
  const [connecting, setConnecting] = useState(false);
  const qc = useQueryClient();

  const skip = () => router.push("/onboarding/budget");

  const handleConnectBank = async () => {
    setConnecting(true);
    try {
      const { linkToken: token } = await api.post<{ linkToken: string }>("/plaid/link-token", {
        platform: Platform.OS === "ios" ? "ios" : "android",
        mode: "create",
      });
      // Loaded lazily so the Plaid native module (excluded from the build for
      // v1, see expo.autolinking.exclude) is never referenced while bank
      // linking is disabled.
      const { openLink } = require("react-native-plaid-link-sdk") as typeof import("react-native-plaid-link-sdk");
      openLink({
        tokenConfig: { token, noLoadingState: false },
        onSuccess: async (success: LinkSuccess) => {
          try {
            await api.post("/plaid/exchange", {
              publicToken: success.publicToken,
              institutionName: success.metadata.institution?.name ?? "Unknown Bank",
            });
            await api.post("/plaid/sync", {});
            qc.invalidateQueries({ queryKey: ["accounts"] });
            router.push("/onboarding/budget");
          } catch {
            Alert.alert(
              "Almost there",
              "Account connected but sync failed — you can sync from Profile.",
              [{ text: "Continue", onPress: () => router.push("/onboarding/budget") }]
            );
          } finally {
            setConnecting(false);
          }
        },
        onExit: (_exit: LinkExit) => {
          setConnecting(false);
        },
      });
    } catch {
      Alert.alert("Error", "Could not start bank connection. You can connect from Profile later.");
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.inner}>
        <ProgressDots current={0} total={3} />

        <View style={styles.hero}>
          <Text style={styles.wordmark}>WORTHLANE</Text>
          <Text style={styles.heading}>Let's build your{"\n"}financial picture.</Text>
          <Text style={styles.subtitle}>
            {PLAID_ENABLED
              ? "Connect your bank to automatically track spending, budgets, and progress toward your goals."
              : "Track spending, budgets, and progress toward your goals - starting with a quick setup."}
          </Text>
        </View>

        <View style={styles.actions}>
          {PLAID_ENABLED ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, connecting && styles.buttonDisabled]}
                onPress={handleConnectBank}
                disabled={connecting}
              >
                <Text style={styles.primaryButtonText}>
                  {connecting ? "Opening…" : "Connect a Bank Account"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={skip}>
                <Text style={styles.skipText}>Do this later →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={skip}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: spacing.xl, justifyContent: "space-between" },
  dots: { flexDirection: "row", gap: spacing.xs, paddingTop: spacing.sm },
  dot: { height: 4, borderRadius: radius.full },
  dotActive: { width: 8, backgroundColor: colors.primary },
  dotCurrent: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.border },
  hero: { flex: 1, justifyContent: "center" },
  wordmark: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 24,
  },
  actions: { gap: spacing.sm },
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

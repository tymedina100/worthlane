import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { colors, spacing, radius, typography } from "@/lib/theme";

interface Account {
  id: string;
  name: string;
  institutionName: string | null;
  type: string;
  currentBalance: number;
  lastSyncedAt: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export default function ProfileScreen() {
  const { email, logout, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: () => api.post("/plaid/sync"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      Alert.alert("Synced", "Your accounts have been updated.");
    },
    onError: () => {
      Alert.alert("Sync failed", "Could not sync accounts. Please try again.");
    },
  });

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        setBiometricSupported(true);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricLabel("Face ID");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricLabel(Platform.OS === "ios" ? "Touch ID" : "Fingerprint");
        }
      }
    })();
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Verify biometric before enabling so we know it works.
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricLabel} for Finance`,
        fallbackLabel: "Cancel",
        disableDeviceFallback: true,
      });
      if (!result.success) return;
      await enableBiometric();
    } else {
      await disableBiometric();
    }
  };

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  });

  const handleSync = () => syncMutation.mutate();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Connected Accounts</Text>
        {accounts?.map((a) => (
          <View key={a.id} style={styles.accountRow}>
            <View>
              <Text style={styles.accountName}>{a.name}</Text>
              <Text style={styles.accountMeta}>
                {a.institutionName} · {a.type}
              </Text>
            </View>
            <Text style={styles.accountBalance}>{formatCurrency(a.currentBalance)}</Text>
          </View>
        ))}
        {accounts?.length === 0 && (
          <Text style={typography.bodySmall}>No accounts connected yet.</Text>
        )}
        <TouchableOpacity
          style={[styles.syncButton, syncMutation.isPending && { opacity: 0.6 }]}
          onPress={handleSync}
          disabled={syncMutation.isPending}
        >
          <Text style={styles.syncButtonText}>
            {syncMutation.isPending ? "Syncing…" : "Sync Accounts"}
          </Text>
        </TouchableOpacity>
      </View>

      {biometricSupported && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Security</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{biometricLabel}</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.border, true: colors.primaryDim }}
                thumbColor={biometricEnabled ? colors.primary : colors.textDim}
              />
            </View>
            <Text style={styles.settingDescription}>
              {biometricEnabled
                ? `Use ${biometricLabel} to sign in instead of your password.`
                : `Enable ${biometricLabel} for faster, secure sign-in.`}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
          <Text style={styles.dangerButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.h2, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm, textTransform: "uppercase", fontSize: 12, letterSpacing: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  email: { ...typography.body },
  accountRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  accountName: { ...typography.label },
  accountMeta: { ...typography.caption, marginTop: 2 },
  accountBalance: { ...typography.label, color: colors.success },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: { ...typography.label },
  settingDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  syncButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  syncButtonText: { color: colors.primary, fontWeight: "600" },
  dangerButton: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: { color: colors.danger, fontWeight: "600" },
});

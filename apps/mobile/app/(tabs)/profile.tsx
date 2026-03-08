import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
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
  const { email, logout } = useAuthStore();
  const syncMutation = { isPending: false }; // placeholder

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  });

  const handleSync = async () => {
    try {
      await api.post("/plaid/sync");
      Alert.alert("Synced", "Your accounts have been updated.");
    } catch {
      Alert.alert("Sync failed", "Could not sync accounts. Please try again.");
    }
  };

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
        <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
          <Text style={styles.syncButtonText}>Sync Accounts</Text>
        </TouchableOpacity>
      </View>

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

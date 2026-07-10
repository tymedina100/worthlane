import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as LocalAuthentication from "expo-local-authentication";
import type { LinkExit, LinkSuccess } from "react-native-plaid-link-sdk";
import { useAuthStore } from "@/store/auth";
import { ApiError, api } from "@/lib/api";
import { useSubscription } from "@/hooks/useSubscription";
import {
  ACCOUNT_TYPES,
  AccountSummary,
  AccountsResponse,
  PlaidItemSummary,
  formatCurrency,
  formatRelativeSyncTime,
  getPlaidStatusTone,
} from "@/lib/finance";
import { PLAID_ENABLED } from "@/lib/flags";
import { spacing, radius } from "@/lib/theme";
import { useTheme, useThemedStyles, type Theme } from "@/lib/ThemeContext";

type ManualAccountDraft = {
  id?: string;
  name: string;
  institutionName: string;
  type: (typeof ACCOUNT_TYPES)[number];
  currentBalance: string;
};

const emptyManualDraft: ManualAccountDraft = {
  name: "",
  institutionName: "",
  type: "CHECKING",
  currentBalance: "",
};

function accountTypeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function bankActionErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PLAID_ITEM_ALREADY_LINKED":
        return "That institution is already linked to another account.";
      case "ITEM_LOGIN_REQUIRED":
      case "USER_PERMISSION_REVOKED":
        return "Your institution needs to be re-linked before it can sync again.";
      case "INSTITUTION_DOWN":
      case "INSTITUTION_NOT_RESPONDING":
        return "That institution is temporarily unavailable. Try again later.";
      case "INVALID_LINK_TOKEN":
        return "This bank-link session expired. Start the connection again.";
      default:
        return error.message;
    }
  }

  return "Something went wrong while talking to Plaid. Please try again.";
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function StatusPill({ item }: { item: PlaidItemSummary }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = getPlaidStatusTone(item.status);
  const backgroundColor =
    tone.color === "success"
      ? "rgba(34,197,94,0.15)"
      : tone.color === "warning"
      ? "rgba(245,158,11,0.15)"
      : "rgba(239,68,68,0.15)";
  const textColor =
    tone.color === "success"
      ? colors.success
      : tone.color === "warning"
      ? colors.warning
      : colors.danger;

  return (
    <View style={[styles.statusPill, { backgroundColor }]}>
      <Text style={[styles.statusPillText, { color: textColor }]}>{tone.label}</Text>
    </View>
  );
}

function ManualAccountModal({
  visible,
  draft,
  saving,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: {
  visible: boolean;
  draft: ManualAccountDraft;
  saving: boolean;
  onChange: (next: ManualAccountDraft) => void;
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
          <Text style={styles.modalTitle}>{draft.id ? "Edit manual account" : "Add manual account"}</Text>
          <Text style={styles.modalSubtitle}>
            Manual accounts keep the app usable when Plaid is unavailable.
          </Text>

          <TextInput
            style={styles.input}
            value={draft.name}
            onChangeText={(name) => onChange({ ...draft, name })}
            placeholder="Account name"
            placeholderTextColor={colors.textDim}
          />
          <TextInput
            style={styles.input}
            value={draft.institutionName}
            onChangeText={(institutionName) => onChange({ ...draft, institutionName })}
            placeholder="Institution name (optional)"
            placeholderTextColor={colors.textDim}
          />
          <TextInput
            style={styles.input}
            value={draft.currentBalance}
            onChangeText={(currentBalance) => onChange({ ...draft, currentBalance })}
            placeholder="Current balance"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ACCOUNT_TYPES.map((type) => {
              const selected = draft.type === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => onChange({ ...draft, type })}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {accountTypeLabel(type)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { email, logout, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();
  const { isPremium } = useSubscription();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualAccountDraft>(emptyManualDraft);
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      setBiometricSupported(true);
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const types = Array.isArray(supportedTypes) ? supportedTypes : [];
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricLabel("Face ID");
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricLabel(Platform.OS === "ios" ? "Touch ID" : "Fingerprint");
      }
    })();
  }, []);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<AccountsResponse>("/accounts"),
  });

  const syncMutation = useMutation({
    mutationFn: (plaidItemId?: string) =>
      api.post("/plaid/sync", plaidItemId ? { plaidItemId, refresh: true } : { refresh: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const manualAccountMutation = useMutation({
    mutationFn: async (draft: ManualAccountDraft) => {
      const currentBalance = Number(draft.currentBalance);
      if (!draft.name.trim()) throw new Error("Account name is required.");
      if (!Number.isFinite(currentBalance)) throw new Error("Enter a valid balance.");

      if (draft.id) {
        return api.patch(`/accounts/${draft.id}`, {
          name: draft.name.trim(),
          institutionName: draft.institutionName.trim() || null,
          type: draft.type,
          currentBalance,
        });
      }

      return api.post("/accounts", {
        name: draft.name.trim(),
        institutionName: draft.institutionName.trim() || undefined,
        type: draft.type,
        currentBalance,
      });
    },
    onSuccess: () => {
      setManualModalVisible(false);
      setManualDraft(emptyManualDraft);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteManualAccountMutation = useMutation({
    mutationFn: (accountId: string) => api.delete(`/accounts/${accountId}`),
    onSuccess: () => {
      setManualModalVisible(false);
      setManualDraft(emptyManualDraft);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (plaidItemId: string) => api.post(`/plaid/items/${plaidItemId}/unlink`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const plaidItems = accountsQuery.data?.plaidItems ?? [];
  const manualAccounts = accounts.filter((account) => account.source === "MANUAL");
  const plaidAccounts = accounts.filter((account) => account.source === "PLAID");

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricLabel} for Worthlane`,
        fallbackLabel: "Cancel",
        disableDeviceFallback: true,
      });
      if (!result.success) return;
      await enableBiometric();
      return;
    }

    await disableBiometric();
  };

  const invalidateWorthlaneQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const launchPlaid = async (mode: "create" | "update", plaidItemId?: string) => {
    try {
      const { linkToken } = await api.post<{ linkToken: string }>("/plaid/link-token", {
        platform: Platform.OS === "ios" ? "ios" : "android",
        mode,
        plaidItemId,
      });

      // Loaded lazily so the Plaid native module (excluded from the build for
      // v1, see expo.autolinking.exclude) is never referenced while bank
      // linking is disabled.
      const { openLink } = require("react-native-plaid-link-sdk") as typeof import("react-native-plaid-link-sdk");
      await openLink({
        tokenConfig: {
          token: linkToken,
          noLoadingState: false,
        },
        onSuccess: async (success: LinkSuccess) => {
          await handlePlaidSuccess(success, mode);
        },
        onExit: (exit: LinkExit) => {
          handlePlaidExit(exit);
        },
      });
    } catch (error) {
      Alert.alert("Plaid unavailable", bankActionErrorMessage(error));
    }
  };

  const handlePlaidSuccess = async (success: LinkSuccess, mode: "create" | "update") => {
    try {
      await api.post("/plaid/exchange", {
        publicToken: success.publicToken,
        institutionName: success.metadata.institution?.name ?? undefined,
      });

      invalidateWorthlaneQueries();
      Alert.alert(
        mode === "update" ? "Connection repaired" : "Bank connected",
        mode === "update"
          ? "Your institution is linked again and ready to sync."
          : "Your institution was linked and synced successfully."
      );
    } catch (error) {
      Alert.alert("Connection failed", bankActionErrorMessage(error));
    }
  };

  const handlePlaidExit = (exit: LinkExit) => {
    if (exit.error) {
      Alert.alert("Plaid closed", bankActionErrorMessage(new ApiError(exit.error.displayMessage ?? exit.error.errorMessage ?? "Plaid exited with an error.", 400, exit.error.errorCode)));
    }
  };

  const openCreateManualAccount = () => {
    setManualDraft(emptyManualDraft);
    setManualModalVisible(true);
  };

  const openEditManualAccount = (account: AccountSummary) => {
    setManualDraft({
      id: account.id,
      name: account.name,
      institutionName: account.institutionName ?? "",
      type: account.type,
      currentBalance: String(account.currentBalance),
    });
    setManualModalVisible(true);
  };

  const submitManualAccount = async () => {
    try {
      await manualAccountMutation.mutateAsync(manualDraft);
    } catch (error) {
      Alert.alert("Could not save account", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const confirmDeleteManualAccount = () => {
    if (!manualDraft.id) return;

    Alert.alert(
      "Delete manual account?",
      "This also removes the manual transactions attached to it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteManualAccountMutation.mutateAsync(manualDraft.id!);
            } catch (error) {
              Alert.alert("Could not delete account", error instanceof Error ? error.message : "Please try again.");
            }
          },
        },
      ]
    );
  };

  const confirmUnlink = (plaidItem: PlaidItemSummary) => {
    Alert.alert(
      `Unlink ${plaidItem.institution ?? "institution"}?`,
      "This removes the linked accounts and imported transactions for that institution.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              await unlinkMutation.mutateAsync(plaidItem.id);
            } catch (error) {
              Alert.alert("Could not unlink", bankActionErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
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

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete("/auth/account"),
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and all data - accounts, transactions, budgets, goals, and streaks. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccountMutation.mutateAsync();
              await logout();
              router.replace("/(auth)/login");
            } catch (error) {
              Alert.alert(
                "Could not delete account",
                error instanceof Error ? error.message : "Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const syncingAll = syncMutation.isPending;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.section}>
          <SectionHeader title="Account" />
          <View style={styles.card}>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.accountHint}>Manage bank connections, fallback accounts, and sign-in settings.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Money sources"
            subtitle="Link a bank for automatic sync or add a manual account for backup tracking."
          />

          <View style={styles.actionRow}>
            {PLAID_ENABLED ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  if (!isPremium && plaidItems.length >= 1) {
                    router.push("/paywall" as any);
                    return;
                  }
                  launchPlaid("create");
                }}
              >
                <Text style={styles.primaryButtonText}>Connect bank</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={PLAID_ENABLED ? styles.secondaryButton : styles.primaryButton}
              onPress={openCreateManualAccount}
            >
              <Text style={PLAID_ENABLED ? styles.secondaryButtonText : styles.primaryButtonText}>
                Add manual account
              </Text>
            </TouchableOpacity>
          </View>

          {PLAID_ENABLED || plaidItems.length > 0 ? (
            <TouchableOpacity
              style={[styles.secondaryButton, styles.syncAllButton, syncingAll && styles.buttonDisabled]}
              onPress={() => syncMutation.mutate(undefined)}
              disabled={syncingAll}
            >
              <Text style={styles.secondaryButtonText}>{syncingAll ? "Syncing..." : "Sync every institution"}</Text>
            </TouchableOpacity>
          ) : null}

          {accountsQuery.isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading account connections...</Text>
            </View>
          ) : null}

          {accountsQuery.isError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Could not load your accounts</Text>
              <Text style={styles.errorBody}>
                The profile hub needs a healthy API connection to manage Plaid items and manual accounts.
              </Text>
              <TouchableOpacity style={styles.errorButton} onPress={() => accountsQuery.refetch()}>
                <Text style={styles.errorButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!accountsQuery.isLoading && !accountsQuery.isError && plaidItems.length === 0 && manualAccounts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nothing linked yet</Text>
              <Text style={styles.emptyBody}>
                {PLAID_ENABLED
                  ? "Connect a bank for automatic transactions, or add a manual account so budgets and goals still work if Plaid is unavailable."
                  : "Add a manual account to start tracking balances, budgets, and goals. Automatic bank sync is coming soon."}
              </Text>
            </View>
          ) : null}

          {plaidItems.length > 0 ? (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Linked institutions</Text>
              {plaidItems.map((item) => {
                const linkedAccounts = plaidAccounts.filter((account) => account.plaidItemId === item.id);
                return (
                  <View key={item.id} style={styles.bankCard}>
                    <View style={styles.bankCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bankName}>{item.institution ?? "Connected institution"}</Text>
                        <Text style={styles.bankMeta}>
                          {linkedAccounts.length} {linkedAccounts.length === 1 ? "account" : "accounts"} linked
                        </Text>
                      </View>
                      <StatusPill item={item} />
                    </View>

                    <Text style={styles.bankSyncText}>{formatRelativeSyncTime(item.lastSyncAt)}</Text>
                    {item.errorMessage ? <Text style={styles.bankError}>{item.errorMessage}</Text> : null}

                    {linkedAccounts.map((account) => (
                      <View key={account.id} style={styles.accountRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.accountName}>{account.name}</Text>
                          <Text style={styles.accountMeta}>
                            {accountTypeLabel(account.type)} - {formatCurrency(account.currentBalance)}
                          </Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.bankActions}>
                      <TouchableOpacity
                        style={[styles.inlineButton, syncMutation.isPending && styles.buttonDisabled]}
                        onPress={() => syncMutation.mutate(item.id)}
                        disabled={syncMutation.isPending}
                      >
                        <Text style={styles.inlineButtonText}>Sync now</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.inlineButton} onPress={() => launchPlaid("update", item.id)}>
                        <Text style={styles.inlineButtonText}>{item.needsRelink ? "Relink" : "Repair"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.inlineDangerButton} onPress={() => confirmUnlink(item)}>
                        <Text style={styles.inlineDangerButtonText}>Unlink</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {manualAccounts.length > 0 ? (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Manual accounts</Text>
              {manualAccounts.map((account) => (
                <Pressable key={account.id} style={styles.accountRow} onPress={() => openEditManualAccount(account)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountMeta}>
                      {account.institutionName ?? "Manual account"} - {accountTypeLabel(account.type)}
                    </Text>
                  </View>
                  <View style={styles.accountRight}>
                    <Text style={styles.accountBalance}>{formatCurrency(account.currentBalance)}</Text>
                    <Text style={styles.accountEditHint}>Tap to edit</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Preferences" />
          <TouchableOpacity
            style={[styles.card, { marginBottom: spacing.sm }]}
            onPress={() => router.push("/accounts")}
            accessibilityRole="button"
            accessibilityLabel="View net worth and accounts"
          >
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Net worth & accounts</Text>
              <Text style={styles.accountEditHint}>›</Text>
            </View>
            <Text style={styles.settingDescription}>
              See your net worth trend and every account in one place.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, { marginBottom: spacing.sm }]}
            onPress={() => router.push("/reports")}
            accessibilityRole="button"
            accessibilityLabel="View spending reports and cash flow"
          >
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Reports & cash flow</Text>
              <Text style={styles.accountEditHint}>›</Text>
            </View>
            <Text style={styles.settingDescription}>
              Income vs. spending trends and where your money goes by category.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, { marginBottom: spacing.sm }]}
            onPress={() => router.push("/recurring")}
            accessibilityRole="button"
            accessibilityLabel="View recurring bills and subscriptions"
          >
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Recurring & bills</Text>
              <Text style={styles.accountEditHint}>›</Text>
            </View>
            <Text style={styles.settingDescription}>
              Subscriptions and bills detected from your transactions, with due dates.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/categories")}
            accessibilityRole="button"
            accessibilityLabel="Manage categories"
          >
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Manage categories</Text>
              <Text style={styles.accountEditHint}>›</Text>
            </View>
            <Text style={styles.settingDescription}>
              Create custom spending categories or edit the ones you've added.
            </Text>
          </TouchableOpacity>
        </View>

        {biometricSupported ? (
          <View style={styles.section}>
            <SectionHeader title="Security" />
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
                  ? `Use ${biometricLabel} to get back into Worthlane faster.`
                  : `Enable ${biometricLabel} for quicker sign-in on this device.`}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete account"
          >
            <Text style={styles.deleteAccountText}>
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete account"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ManualAccountModal
        visible={manualModalVisible}
        draft={manualDraft}
        saving={manualAccountMutation.isPending || deleteManualAccountMutation.isPending}
        onChange={setManualDraft}
        onClose={() => {
          if (manualAccountMutation.isPending || deleteManualAccountMutation.isPending) return;
          setManualModalVisible(false);
          setManualDraft(emptyManualDraft);
        }}
        onSubmit={submitManualAccount}
        onDelete={manualDraft.id ? confirmDeleteManualAccount : null}
      />
    </>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.h2, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionHeader: { marginBottom: spacing.sm },
  sectionTitle: { ...typography.label, textTransform: "uppercase", letterSpacing: 1, color: colors.textMuted },
  sectionSubtitle: { ...typography.caption, marginTop: spacing.xs, color: colors.textMuted },
  subsection: { marginTop: spacing.lg },
  subsectionTitle: { ...typography.label, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  email: { ...typography.body },
  accountHint: { ...typography.bodySmall, marginTop: spacing.xs },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.white, fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  syncAllButton: { marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  loadingCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: { ...typography.bodySmall },
  errorCard: {
    marginTop: spacing.md,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.3)",
    borderWidth: 1,
    borderRadius: radius.md,
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
  emptyCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { ...typography.label, marginBottom: spacing.xs },
  emptyBody: { ...typography.bodySmall },
  bankCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bankName: { ...typography.label },
  bankMeta: { ...typography.caption, marginTop: 2 },
  bankSyncText: { ...typography.caption, marginTop: spacing.sm },
  bankError: { ...typography.bodySmall, color: colors.warning, marginTop: spacing.xs },
  bankActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  inlineButton: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineButtonText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  inlineDangerButton: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  inlineDangerButtonText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  accountName: { ...typography.label },
  accountMeta: { ...typography.caption, marginTop: 2 },
  accountRight: { alignItems: "flex-end" },
  accountBalance: { ...typography.label, color: colors.success },
  accountEditHint: { ...typography.caption, marginTop: 2 },
  statusPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusPillText: { fontSize: 12, fontWeight: "700" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: { ...typography.label },
  settingDescription: { ...typography.caption, marginTop: spacing.xs },
  dangerButton: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteAccountButton: { alignItems: "center", padding: spacing.md, marginTop: spacing.xs },
  deleteAccountText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  dangerButtonText: { color: colors.danger, fontWeight: "700" },
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
});

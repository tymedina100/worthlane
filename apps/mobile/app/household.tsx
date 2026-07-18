import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHouseholdSchema,
  createHouseholdGoalContributionSchema,
  householdGoalContributionResultSchema,
  householdPartnerInvitationsSchema,
  householdSummarySchema,
  type HouseholdPartnerInvitationSummary,
  type HouseholdSummary,
} from "@worthlane/contracts";
import { ApiError, api } from "@/lib/api";
import { radius, spacing } from "@/lib/theme";
import { useAuthStore } from "@/store/auth";
import { useTheme, useThemedStyles, type Theme } from "@/lib/ThemeContext";

type SharedGoal = HouseholdSummary["sharedGoals"][number];
type Responsibility = HouseholdSummary["responsibilities"][number];
type DetailedAccount = HouseholdSummary["finances"]["detailedAccounts"][number];

const contributionModeLabels = {
  EQUAL: "Equal contributions",
  CUSTOM: "Custom dollar plan",
  INCOME_PROPORTIONAL: "Income-proportional plan",
} as const;

const responsibilityModeLabels = {
  MEMBER: "Assigned to one person",
  EQUAL: "Split evenly",
  PERCENTAGE: "Split by percentage",
} as const;

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function progressWidth(value: number): `${number}%` {
  return `${clampPercent(value)}%`;
}

function parseAmountMinor(rawAmount: string): number | null {
  const normalized = rawAmount.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "");
  if (whole.length > 10) return null;

  const amountMinor = Number(whole) * 100 + Number(fractionalPart.padEnd(2, "0"));
  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null;
}

function accountVisibilityLabel(account: DetailedAccount): string {
  if (account.visibility === "SHARED") return "Fully shared";
  if (account.isOwner && account.visibility === "SUMMARY") return "Summary to partner";
  if (account.isOwner) return "Private to you";
  return "Visible to you";
}

function ProgressBar({ value }: { value: number }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.progressTrack} accessibilityLabel={`${Math.round(value)} percent complete`}>
      <View style={[styles.progressFill, { width: progressWidth(value) }]} />
    </View>
  );
}

function SectionHeading({ title, helper }: { title: string; helper?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {helper ? <Text style={styles.sectionHelper}>{helper}</Text> : null}
    </View>
  );
}

function PartnerInvitations({
  invitations,
  acceptingId,
  onAccept,
}: {
  invitations: HouseholdPartnerInvitationSummary[];
  acceptingId: string | null;
  onAccept: (id: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  if (!invitations.length) return null;
  return (
    <View style={styles.card}>
      <SectionHeading title="Partner invitation" helper="Nothing is shared until you accept." />
      {invitations.map((invitation, index) => (
        <View key={invitation.id} style={[styles.listRow, index > 0 && styles.dividedRow]}>
          <View style={styles.flexOne}>
            <Text style={styles.rowTitle}>{invitation.householdName}</Text>
            <Text style={styles.rowMeta}>Invited by {invitation.invitedByName}</Text>
          </View>
          <TouchableOpacity
            style={styles.retryButton}
            disabled={acceptingId === invitation.id}
            onPress={() => onAccept(invitation.id)}
          >
            <Text style={styles.retryText}>{acceptingId === invitation.id ? "Accepting..." : "Accept"}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function AccountsSection({ summary }: { summary: HouseholdSummary }) {
  const styles = useThemedStyles(createStyles);
  const { currency } = summary.household;

  return (
    <View>
      <SectionHeading
        title="Accounts you can see"
        helper="Account detail follows each owner’s privacy setting."
      />
      <View style={styles.card}>
        {summary.finances.detailedAccounts.length ? (
          summary.finances.detailedAccounts.map((account, index) => (
            <View key={account.id} style={[styles.listRow, index > 0 && styles.dividedRow]}>
              <View style={styles.flexOne}>
                <View style={styles.inlineWrap}>
                  <Text style={styles.rowTitle}>{account.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{accountVisibilityLabel(account)}</Text>
                  </View>
                </View>
                <Text style={styles.rowMeta}>
                  {account.ownerName} · {account.institutionName ?? account.type.toLowerCase()}
                </Text>
              </View>
              <Text style={styles.rowAmount}>
                {formatMoney(account.currentBalanceMinor, currency)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No account details have been shared with this login.</Text>
        )}
      </View>

      {summary.finances.summaryOnlyByOwner.length ? (
        <View style={styles.summaryStack}>
          {summary.finances.summaryOnlyByOwner.map((owner) => (
            <View key={owner.ownerMemberId} style={styles.summaryCard}>
              <View style={styles.inlineBetween}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>{owner.ownerName}’s summary</Text>
                  <Text style={styles.rowMeta}>Individual accounts and activity stay hidden.</Text>
                </View>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>Summary only</Text>
                </View>
              </View>
              <View style={styles.metricGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Assets</Text>
                  <Text style={styles.metricValue}>{formatMoney(owner.assetsMinor, currency)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Debts</Text>
                  <Text style={styles.metricValue}>{formatMoney(owner.liabilitiesMinor, currency)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Net worth</Text>
                  <Text style={styles.metricValue}>{formatMoney(owner.netWorthMinor, currency)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ResponsibilityCard({ item, currency }: { item: Responsibility; currency: string }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.inlineBetween}>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>
            {item.categoryName} · {responsibilityModeLabels[item.mode]}
          </Text>
        </View>
        <Text style={styles.cardAmount}>{formatMoney(item.monthlyAmountMinor, currency)}</Text>
      </View>

      <View style={styles.allocationStack}>
        {item.allocations.map((allocation) => (
          <View key={allocation.memberId} style={styles.allocationRow}>
            <View style={styles.inlineBetween}>
              <Text style={styles.allocationName}>{allocation.displayName}</Text>
              <Text style={styles.allocationAmount}>
                {formatMoney(allocation.appliedSpendMinor, currency)} of {formatMoney(allocation.assignedMinor, currency)}
              </Text>
            </View>
            <ProgressBar value={allocation.percentUsed} />
            <Text style={styles.rowMeta}>
              {allocation.remainingMinor >= 0
                ? `${formatMoney(allocation.remainingMinor, currency)} remaining`
                : `${formatMoney(Math.abs(allocation.remainingMinor), currency)} over assignment`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function QuickContribution({ goal, currency }: { goal: SharedGoal; currency: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const contribution = useMutation({
    mutationFn: async (payload: { amountMinor: number; note: string | null }) => {
      const response = await api.post<unknown>(
        `/households/current/goals/${goal.id}/contributions`,
        payload
      );
      return householdGoalContributionResultSchema.parse(response);
    },
    onSuccess: async (_, variables) => {
      setAmount("");
      setNote("");
      setValidationMessage(null);
      setConfirmation(`${formatMoney(variables.amountMinor, currency)} added to ${goal.name}.`);
      await queryClient
        .refetchQueries({ queryKey: ["household-summary", userId], type: "active" })
        .catch(() => undefined);
    },
  });

  const submit = () => {
    contribution.reset();
    setConfirmation(null);

    const amountMinor = parseAmountMinor(amount);
    if (amountMinor === null) {
      setValidationMessage("Enter a positive amount with no more than two decimal places.");
      return;
    }

    const parsed = createHouseholdGoalContributionSchema.safeParse({
      amountMinor,
      note: note.trim() || null,
    });
    if (!parsed.success) {
      setValidationMessage(
        parsed.error.issues.some((issue) => issue.path[0] === "amountMinor")
          ? "That amount is too large. Enter a smaller contribution."
          : "Keep the note under 500 characters."
      );
      return;
    }

    setValidationMessage(null);
    contribution.mutate({
      amountMinor: parsed.data.amountMinor,
      note: parsed.data.note ?? null,
    });
  };

  const mutationMessage = contribution.error instanceof Error
    ? contribution.error.message
    : contribution.isError
      ? "The contribution could not be saved."
      : null;

  return (
    <View style={styles.contributionBox}>
      <Text style={styles.contributionTitle}>Quick contribution</Text>
      <Text style={styles.sectionHelper}>Add savings here and the shared total updates on every client.</Text>
      <Text style={styles.inputLabel}>Amount</Text>
      <View style={styles.amountInputRow}>
        <Text style={styles.currencyPrefix}>$</Text>
        <TextInput
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            setValidationMessage(null);
            setConfirmation(null);
          }}
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor={colors.textDim}
          keyboardType="decimal-pad"
          inputMode="decimal"
          maxLength={16}
          accessibilityLabel={`Contribution amount for ${goal.name}`}
        />
      </View>
      <Text style={styles.inputLabel}>Note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={(value) => {
          setNote(value);
          setValidationMessage(null);
          setConfirmation(null);
        }}
        style={styles.noteInput}
        placeholder="Monthly transfer"
        placeholderTextColor={colors.textDim}
        maxLength={500}
        returnKeyType="done"
        accessibilityLabel={`Contribution note for ${goal.name}`}
      />
      {validationMessage || mutationMessage ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {validationMessage ?? mutationMessage}
        </Text>
      ) : null}
      {confirmation ? (
        <Text style={styles.successText} accessibilityLiveRegion="polite">
          {confirmation}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[styles.primaryButton, contribution.isPending && styles.disabledButton]}
        onPress={submit}
        disabled={contribution.isPending}
        accessibilityRole="button"
        accessibilityState={{ disabled: contribution.isPending, busy: contribution.isPending }}
      >
        {contribution.isPending ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.primaryButtonText}>Add to {goal.name}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function GoalCard({ goal, currency }: { goal: SharedGoal; currency: string }) {
  const styles = useThemedStyles(createStyles);
  const targetDate = goal.targetDate
    ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
        new Date(goal.targetDate)
      )
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.inlineBetween}>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>{goal.icon ? `${goal.icon} ` : ""}{goal.name}</Text>
          <Text style={styles.rowMeta}>
            {contributionModeLabels[goal.contributionMode]}{targetDate ? ` · Target ${targetDate}` : ""}
          </Text>
        </View>
        <Text style={styles.goalPercent}>{Math.round(goal.percentComplete)}%</Text>
      </View>
      <Text style={styles.goalAmount}>
        {formatMoney(goal.currentAmountMinor, currency)} <Text style={styles.goalTarget}>of {formatMoney(goal.targetAmountMinor, currency)}</Text>
      </Text>
      <ProgressBar value={goal.percentComplete} />
      <Text style={styles.rowMeta}>{formatMoney(Math.max(0, goal.remainingMinor), currency)} to go</Text>

      <View style={styles.participantStack}>
        {goal.participants.map((participant) => (
          <View key={participant.memberId} style={styles.participantRow}>
            <View>
              <Text style={styles.allocationName}>{participant.displayName}</Text>
              <Text style={styles.rowMeta}>Target share {formatMoney(participant.plannedContributionMinor, currency)}</Text>
            </View>
            <Text style={styles.allocationAmount}>{formatMoney(participant.contributedAmountMinor, currency)} saved</Text>
          </View>
        ))}
      </View>

      {goal.recentContributions.length ? (
        <View style={styles.recentBlock}>
          <Text style={styles.inputLabel}>Recent activity</Text>
          {goal.recentContributions.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.recentRow}>
              <View style={styles.flexOne}>
                <Text style={styles.allocationName}>{item.contributorName}</Text>
                <Text style={styles.rowMeta}>{item.note || "Shared goal contribution"}</Text>
              </View>
              <Text style={styles.successAmount}>+{formatMoney(item.amountMinor, currency)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <QuickContribution goal={goal} currency={currency} />
    </View>
  );
}

function HouseholdContent({ summary }: { summary: HouseholdSummary }) {
  const styles = useThemedStyles(createStyles);
  const partnerNames = summary.members
    .filter((member) => !member.isCurrentUser)
    .map((member) => member.displayName)
    .join(", ");

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Together</Text>
        <Text style={styles.heroTitle}>{summary.household.name}</Text>
        <Text style={styles.heroSubtitle}>
          {partnerNames ? `Shared with ${partnerNames}` : "Your household workspace"}
        </Text>
        <Text style={styles.heroLabel}>Net worth visible to this login</Text>
        <Text style={styles.heroAmount}>
          {formatMoney(summary.finances.visibleNetWorthMinor, summary.household.currency)}
        </Text>
        <View style={styles.privacyNotice}>
          <Ionicons name="shield-checkmark-outline" size={18} style={styles.privacyIcon} />
          <Text style={styles.privacyText}>
            This total only includes your accounts plus details or summaries your partner chose to share.
          </Text>
        </View>
      </View>

      <AccountsSection summary={summary} />

      <SectionHeading
        title="Monthly responsibilities"
        helper="Progress follows the household plan; purchases are not reimbursed one by one."
      />
      <View style={styles.sectionStack}>
        {summary.responsibilities.length ? (
          summary.responsibilities.map((item) => (
            <ResponsibilityCard key={item.id} item={item} currency={summary.household.currency} />
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.muted}>No shared responsibilities have been set up yet.</Text>
          </View>
        )}
      </View>

      <SectionHeading
        title="Shared goals"
        helper="Contributions use the same household goal on mobile and desktop."
      />
      <View style={styles.sectionStack}>
        {summary.sharedGoals.length ? (
          summary.sharedGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} currency={summary.household.currency} />
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.muted}>No shared goals have been set up yet.</Text>
          </View>
        )}
      </View>
    </>
  );
}

export default function HouseholdScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { userId, isLoading: isAuthLoading } = useAuthStore();
  const [householdName, setHouseholdName] = useState("Our household");
  const [displayName, setDisplayName] = useState("");
  const [income, setIncome] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const household = useQuery({
    queryKey: ["household-summary", userId],
    queryFn: async () => householdSummarySchema.parse(
      await api.get<unknown>("/households/current/summary")
    ),
    enabled: Boolean(userId),
    retry: false,
    refetchOnMount: "always",
  });
  const invitations = useQuery({
    queryKey: ["household-invitations", userId],
    queryFn: async () => householdPartnerInvitationsSchema.parse(
      await api.get<unknown>("/households/invitations")
    ),
    enabled: Boolean(userId),
    retry: false,
    refetchOnMount: "always",
  });
  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.post("/households/invitations/accept", { invitationId });
      return invitationId;
    },
    onSuccess: async () => {
      await Promise.all([household.refetch(), invitations.refetch()]);
    },
  });
  const createHousehold = useMutation({
    mutationFn: async (body: unknown) => api.post("/households", body),
    onSuccess: async () => {
      await household.refetch();
    },
  });

  function submitHouseholdSetup() {
    setSetupError(null);
    const normalizedIncome = income.trim().replace(/[$,\s]/g, "");
    const incomeBasisMinor = normalizedIncome ? Math.round(Number(normalizedIncome) * 100) : undefined;
    const parsed = createHouseholdSchema.safeParse({
      name: householdName,
      displayName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      currency: "USD",
      ...(incomeBasisMinor === undefined ? {} : { incomeBasisMinor }),
    });
    if (!parsed.success) {
      setSetupError("Enter your name, a household name, and an optional positive monthly income.");
      return;
    }
    createHousehold.mutate(parsed.data);
  }

  if (isAuthLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!userId) return <Redirect href="/(auth)/login" />;

  const isMissingHousehold = household.error instanceof ApiError && household.error.status === 404;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Today"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Household</Text>
          <Text style={styles.headerSubtitle}>Shared money at a glance</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flexOne}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={household.isRefetching}
              onRefresh={() => Promise.all([household.refetch(), invitations.refetch()])}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {household.isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Loading your shared view…</Text>
            </View>
          ) : null}

          {household.isError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                {isMissingHousehold ? "No household yet" : "Your household is unavailable"}
              </Text>
              <Text style={styles.muted}>
                {isMissingHousehold
                  ? invitations.data?.length
                    ? "Accept the invitation below to join the shared household."
                    : "Once a household owner invites this login, the shared view will appear here."
                  : "Your saved information is unchanged. Check the connection and try again."}
              </Text>
              {!isMissingHousehold ? (
                <TouchableOpacity style={styles.retryButton} onPress={() => household.refetch()}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              ) : null}
              {isMissingHousehold && !invitations.data?.length ? (
                <View style={styles.householdSetupForm}>
                  <Text style={styles.inputLabel}>Your display name</Text>
                  <TextInput style={styles.noteInput} value={displayName} onChangeText={setDisplayName} placeholder="Tyler" placeholderTextColor={colors.textDim} />
                  <Text style={styles.inputLabel}>Household name</Text>
                  <TextInput style={styles.noteInput} value={householdName} onChangeText={setHouseholdName} placeholder="Our household" placeholderTextColor={colors.textDim} />
                  <Text style={styles.inputLabel}>Monthly income (optional)</Text>
                  <TextInput style={styles.noteInput} value={income} onChangeText={setIncome} inputMode="decimal" keyboardType="decimal-pad" placeholder="6000.00" placeholderTextColor={colors.textDim} />
                  {setupError || createHousehold.error ? <Text style={styles.errorText}>{setupError ?? createHousehold.error?.message}</Text> : null}
                  <TouchableOpacity style={styles.primaryButton} disabled={createHousehold.isPending} onPress={submitHouseholdSetup}>
                    <Text style={styles.primaryButtonText}>{createHousehold.isPending ? "Creating..." : "Create household"}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          <PartnerInvitations
            invitations={invitations.data ?? []}
            acceptingId={acceptInvitation.isPending ? acceptInvitation.variables ?? null : null}
            onAccept={(id) => acceptInvitation.mutate(id)}
          />
          {acceptInvitation.error ? (
            <View style={styles.errorCard}><Text style={styles.muted}>{acceptInvitation.error.message}</Text></View>
          ) : null}

          {household.data ? <HouseholdContent summary={household.data} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    flexOne: { flex: 1 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerCopy: { flex: 1, alignItems: "center" },
    headerTitle: { ...typography.h3 },
    headerSubtitle: { ...typography.caption, marginTop: 2 },
    headerSpacer: { width: 44 },
    content: { padding: spacing.md, paddingBottom: spacing.xxl },
    loadingCard: {
      minHeight: 180,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    heroTitle: { ...typography.h2, marginTop: spacing.xs },
    heroSubtitle: { ...typography.bodySmall, marginTop: 2 },
    heroLabel: { ...typography.caption, marginTop: spacing.lg },
    heroAmount: { ...typography.number, marginTop: spacing.xs },
    privacyNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    privacyIcon: { color: colors.primary, marginRight: spacing.sm, marginTop: 1 },
    privacyText: { ...typography.bodySmall, flex: 1, lineHeight: 20 },
    sectionHeading: { marginTop: spacing.sm, marginBottom: spacing.sm },
    sectionTitle: { ...typography.h3 },
    sectionHelper: { ...typography.bodySmall, lineHeight: 20, marginTop: 3 },
    sectionStack: { gap: spacing.md, marginBottom: spacing.xl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardTitle: { ...typography.h3 },
    cardAmount: { ...typography.label, marginLeft: spacing.sm },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    dividedRow: { borderTopWidth: 1, borderTopColor: colors.border },
    inlineWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs },
    inlineBetween: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    rowTitle: { ...typography.label },
    rowMeta: { ...typography.caption, lineHeight: 17, marginTop: 3 },
    rowAmount: { ...typography.label, textAlign: "right" },
    badge: { backgroundColor: colors.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    badgeText: { ...typography.caption, color: colors.textMuted },
    summaryStack: { gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xl },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    summaryBadge: { backgroundColor: colors.primaryDim, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    summaryBadgeText: { ...typography.caption, color: colors.primary, fontWeight: "700" },
    metricGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    metricCell: { flex: 1 },
    metricLabel: { ...typography.caption },
    metricValue: { ...typography.label, marginTop: 3 },
    allocationStack: { marginTop: spacing.md, gap: spacing.md },
    allocationRow: { gap: spacing.xs },
    allocationName: { ...typography.label },
    allocationAmount: { ...typography.caption, textAlign: "right" },
    progressTrack: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.primary },
    goalPercent: { ...typography.h3, color: colors.primary, marginLeft: spacing.sm },
    goalAmount: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.sm },
    goalTarget: { ...typography.bodySmall },
    participantStack: {
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.md,
      paddingTop: spacing.md,
    },
    participantRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
    recentBlock: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    recentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    successAmount: { ...typography.label, color: colors.success },
    contributionBox: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    contributionTitle: { ...typography.label, fontSize: 16 },
    inputLabel: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.xs },
    amountInputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    currencyPrefix: { ...typography.body, color: colors.textMuted },
    amountInput: { ...typography.body, flex: 1, minHeight: 48, paddingHorizontal: spacing.xs },
    noteInput: {
      ...typography.body,
      minHeight: 48,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    primaryButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    disabledButton: { opacity: 0.65 },
    primaryButtonText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
    errorText: { ...typography.bodySmall, color: colors.danger, marginTop: spacing.sm },
    successText: { ...typography.bodySmall, color: colors.success, marginTop: spacing.sm },
    errorCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.danger,
      padding: spacing.lg,
    },
    errorTitle: { ...typography.h3, color: colors.danger, marginBottom: spacing.xs },
    retryButton: { alignSelf: "flex-start", marginTop: spacing.md },
    householdSetupForm: { gap: spacing.sm, marginTop: spacing.lg },
    retryText: { color: colors.primary, fontWeight: "700" },
    muted: { ...typography.bodySmall, lineHeight: 20 },
  });

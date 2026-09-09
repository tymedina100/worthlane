import { BankDebtDetails } from "@/components/BankDebtDetails";
import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { debtPlanInputSchema, type DebtPlanInput } from "@worthlane/contracts";
import { estimateDebtPayoff, DEBT_ESTIMATE_ASSUMPTIONS, type DebtEstimate } from "@worthlane/core";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/lib/ThemeContext";

type Plan = { id: string; revision: number; input: DebtPlanInput; estimate?: DebtEstimate };
type DraftDebt = { bankReference?: DebtPlanInput["debts"][number]["bankReference"]; id: string; name: string; balance: string; minimum: string; apr: string; statement: string; due: string; promo: string; expiry: string };
let nextId = 0;
const blank = (): DraftDebt => ({ id: `manual-${Date.now()}-${++nextId}`, name: "", balance: "", minimum: "", apr: "", statement: "", due: "", promo: "0", expiry: "" });
const fromDebt = (d: DebtPlanInput["debts"][number]): DraftDebt => ({ bankReference: d.bankReference, id: d.id, name: d.name, balance: String(d.balanceMinor / 100), minimum: String(d.minimumPaymentMinor / 100), apr: String(d.aprBasisPoints / 100), statement: d.statementBalanceMinor === null ? "" : String(d.statementBalanceMinor / 100), due: d.dueDate ?? "", promo: String((d.promotion?.aprBasisPoints ?? 0) / 100), expiry: d.promotion?.expiresOn ?? "" });
const cents = (value: string) => { if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Enter nonnegative amounts and APRs with at most two decimals."); return Math.round(Number(value) * 100); };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);

function DebtPlanEditor({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const plans = useQuery({ queryKey: ["debt-plans", userId], queryFn: () => api.get<Plan[]>("/debt-plans"), enabled: Boolean(userId) });
  const [selected, setSelected] = useState<Plan | null>(null);
  const [name, setName] = useState("My payoff plan");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payment, setPayment] = useState("");
  const [strategy, setStrategy] = useState<"AVALANCHE" | "SNOWBALL">("AVALANCHE");
  const [debts, setDebts] = useState<DraftDebt[]>([blank()]);
  const [estimate, setEstimate] = useState<DebtEstimate | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  function load(plan: Plan | null) {
    setSelected(plan); setName(plan?.input.name ?? "My payoff plan"); setMonth(plan?.input.startMonth ?? new Date().toISOString().slice(0, 7)); setPayment(plan ? String(plan.input.monthlyPaymentMinor / 100) : ""); setStrategy(plan?.input.strategy ?? "AVALANCHE"); setDebts(plan ? plan.input.debts.map(fromDebt) : [blank()]); setEstimate(plan?.estimate ?? null); setMessage(plan ? "Saved plan loaded." : "New plan. Not saved yet.");
  }
  useEffect(() => { load(null); }, [userId]);
  const changed = () => { setEstimate(null); setMessage("Unsaved changes."); };
  async function open(id: string) {
    setBusy(true);
    try { load(await api.get<Plan>(`/debt-plans/${encodeURIComponent(id)}`)); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function calculate(save: boolean) {
    setBusy(true);
    try {
      const input = debtPlanInputSchema.parse({ name, startMonth: month, monthlyPaymentMinor: cents(payment), strategy, debts: debts.map(d => ({ bankReference: d.bankReference, id: d.id, name: d.name, balanceMinor: cents(d.balance), minimumPaymentMinor: cents(d.minimum), aprBasisPoints: cents(d.apr), statementBalanceMinor: d.statement ? cents(d.statement) : null, dueDate: d.due || null, ...(d.expiry ? { promotion: { aprBasisPoints: cents(d.promo), expiresOn: d.expiry } } : {}) })) });
      setEstimate(estimateDebtPayoff(input));
      if (!save) { setMessage("Preview only — changes are not saved."); return; }
      const saved = selected ? await api.patch<Plan>(`/debt-plans/${encodeURIComponent(selected.id)}`, { revision: selected.revision, input }) : await api.post<Plan>("/debt-plans", input);
      load(saved); setMessage("Saved. Reopen this plan after signing in again."); await plans.refetch();
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "Check names, amounts and dates (YYYY-MM-DD)."); }
    finally { setBusy(false); }
  }
  async function addDueDate(entryId: string) {
    if (!selected) return;
    setBusy(true);
    try { const result = await api.post<{ message: string }>(`/debt-plans/${encodeURIComponent(selected.id)}/upcoming`, { entryId, revision: selected.revision }); setMessage(result.message); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={busy || disabled} onPress={action} style={[styles.button, { borderColor: colors.border, opacity: busy || disabled ? 0.5 : 1 }]}><Text style={{ color: colors.primary, fontWeight: "700" }}>{label}</Text></TouchableOpacity>;
  const field = (label: string, value: string, update: (v: string) => void, numeric = false) => <View style={styles.field}><Text style={{ color: colors.text }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={v => { update(v); changed(); }} editable={!busy} keyboardType={numeric ? "decimal-pad" : "default"} autoCapitalize="none" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} /></View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {button("Back to Goals", () => router.back())}<Text style={[styles.title, { color: colors.text }]}>Debt payoff plans</Text><Text style={{ color: colors.textMuted }}>Private to you. Manual estimates in USD; no payments are made.</Text>
    {plans.isLoading && <Text style={{ color: colors.textMuted }}>Loading saved plans…</Text>}{plans.isError && button("Retry saved plans", () => void plans.refetch())}
    {button("New plan", () => load(null))}{plans.data?.map(plan => <View key={plan.id}>{button(`Open ${plan.input.name}`, () => void open(plan.id))}</View>)}
    {field("Plan name", name, setName)}{field("First payment month (YYYY-MM)", month, setMonth)}{field("Monthly payment budget (USD)", payment, setPayment, true)}
    <Text style={{ color: colors.text }}>Method: {strategy === "AVALANCHE" ? "Avalanche — highest APR first" : "Snowball — smallest balance first"}</Text>
    {button("Use avalanche", () => { setStrategy("AVALANCHE"); changed(); })}{button("Use snowball", () => { setStrategy("SNOWBALL"); changed(); })}
    {debts.map((debt, index) => {
      const edit = (key: keyof DraftDebt) => (value: string) => setDebts(rows => rows.map(row => row.id === debt.id ? { ...row, [key]: value } : row));
      return <View key={debt.id} style={[styles.card, { borderColor: colors.border }]}><Text style={[styles.heading, { color: colors.text }]}>Debt {index + 1}</Text>
        {field(`Debt ${index + 1} name`, debt.name, edit("name"))}{field("Current balance", debt.balance, edit("balance"), true)}{field("Minimum monthly payment", debt.minimum, edit("minimum"), true)}{field("Ordinary APR (%)", debt.apr, edit("apr"), true)}{field("Statement balance (optional)", debt.statement, edit("statement"), true)}{field("Confirmed due date (YYYY-MM-DD, optional)", debt.due, edit("due"))}{field("Promo APR (%)", debt.promo, edit("promo"), true)}{field("Promo expiry (YYYY-MM-DD, optional)", debt.expiry, edit("expiry"))}
        {debt.bankReference && <Text style={{ color: colors.textMuted }}>Bank details reviewed {new Date(debt.bankReference.reviewedAt).toLocaleString()}; retrieved {new Date(debt.bankReference.retrievedAt).toLocaleString()}. Values may have been edited and do not refresh automatically.</Text>}{button(`Remove debt ${index + 1}`, () => { setDebts(rows => rows.filter(row => row.id !== debt.id)); changed(); }, debts.length === 1)}
      </View>;
    })}
    {button("Add debt", () => { setDebts(rows => [...rows, blank()]); changed(); }, debts.length >= 100)}
    <Text style={{ color: colors.textMuted }}>Statement balances and due dates are reference details. Estimates use current balances and month-end payments; reminders are not scheduled here.</Text>
    {button("Preview estimate", () => void calculate(false))}{button("Save plan", () => void calculate(true))}
    <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>{message}</Text>
    {estimate && <View style={styles.card}><Text style={[styles.heading, { color: colors.text }]}>{estimate.status === "PAID_OFF" ? `Estimated payoff: ${estimate.payoffMonth}` : "This plan needs adjustment"}</Text><Text style={{ color: colors.text }}>Interest: {money(estimate.totalInterestMinor)} · Payments: {money(estimate.totalPaidMinor)}</Text>{estimate.shortfallMinor > 0 && <Text style={{ color: colors.text }}>Monthly minimum shortfall: {money(estimate.shortfallMinor)}</Text>}{estimate.warnings.map(warning => <Text key={warning} style={{ color: colors.text }}>{warning}</Text>)}
      <Text style={[styles.heading, { color: colors.text }]}>First month's payments</Text>{estimate.schedule[0]?.debts.map(row => <Text key={row.id} style={{ color: colors.text }}>{debts.find(debt => debt.id === row.id)?.name}: {money(row.paymentMinor)}</Text>)}
      {button(showSchedule ? "Hide monthly schedule" : "Show monthly schedule", () => setShowSchedule(v => !v))}{showSchedule && estimate.schedule.map(row => <Text key={row.month} style={{ color: colors.text }}>{row.month}: pay {money(row.paymentMinor)}, interest {money(row.interestMinor)}, remaining {money(row.remainingMinor)}</Text>)}
    </View>}
    {selected && <View><Text style={[styles.heading, { color: colors.text }]}>Due dates from the saved plan</Text><Text style={{ color: colors.textMuted }}>Add each confirmed minimum once, with reminders off. Unsaved changes are not used.</Text>{selected.input.debts.filter(debt => debt.dueDate && debt.minimumPaymentMinor > 0).map(debt => <View key={debt.id}>{button(`Add ${debt.name}: ${money(debt.minimumPaymentMinor)} due ${debt.dueDate} to Upcoming`, () => void addDueDate(debt.id))}</View>)}{button("Manage Upcoming", () => router.push("/(tabs)/upcoming" as any))}</View>}
    <Text style={[styles.heading, { color: colors.text }]}>Estimate assumptions</Text>{DEBT_ESTIMATE_ASSUMPTIONS.map(text => <Text key={text} style={{ color: colors.textMuted }}>{text}</Text>)}
    <BankDebtDetails userId={userId} copyDisabled={busy || debts.length >= 100} onCopy={debt => { if (useAuthStore.getState().userId !== userId) return; setDebts(rows => [...rows, fromDebt(debt)]); changed(); }} />
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export default function DebtPlansScreen() {
  const userId = useAuthStore(s => s.userId);
  const loading = useAuthStore(s => s.isLoading);
  if (loading) return <SafeAreaView><Text>Loading…</Text></SafeAreaView>;
  if (!userId) return <Redirect href="/(auth)/login" />;
  return <DebtPlanEditor key={userId} userId={userId} />;
}
const styles = StyleSheet.create({ content: { padding: 20, gap: 12, paddingBottom: 48 }, title: { fontSize: 26, fontWeight: "700" }, heading: { fontSize: 18, fontWeight: "700", marginVertical: 8 }, field: { gap: 6 }, input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 }, card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }, button: { minHeight: 44, borderWidth: 1, borderRadius: 8, padding: 12, justifyContent: "center" } });

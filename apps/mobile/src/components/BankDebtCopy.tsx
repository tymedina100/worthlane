import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import { reviewedBankDebt, type DebtPlanInput, type LiabilitySnapshot } from "@worthlane/contracts";
import { useTheme } from "@/lib/ThemeContext";

type Debt = DebtPlanInput["debts"][number];
let nextReview = 0;
export function BankDebtCopy({ debt, retrievedAt, disabled, onCopy }: { debt: LiabilitySnapshot["debts"][number]; retrievedAt: string; disabled: boolean; onCopy: (debt: Debt) => void }) {
  const { colors } = useTheme();
  const amount = (value: number | null) => value === null || value < 0 ? "" : (value / 100).toFixed(2);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: debt.name, balance: amount(debt.currentBalanceMinor), minimum: amount(debt.minimumPaymentMinor), apr: "", statement: amount(debt.statementBalanceMinor), due: debt.dueDate ?? "" });
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const inactive = disabled || copied;
  const text = { color: colors.text };
  function copy() {
    if (inactive) return;
    try {
      const result = reviewedBankDebt({ ...draft, id: `reviewed-${Date.now()}-${++nextReview}`, confirmed, currency: "USD", bankCurrency: debt.currency, retrievedAt, reviewedAt: new Date().toISOString() });
      onCopy(result); setCopied(true); setMessage("Copied to your draft above. Review the full plan and choose Save plan to keep it.");
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "Check the name, amounts and date (YYYY-MM-DD)."); }
  }
  if (debt.currency !== "USD") return <Text style={text}>Currency does not match this USD plan. Enter confirmed amounts manually; no currency conversion is provided.</Text>;
  const fields: [keyof typeof draft, string, boolean][] = [["name", "Name", false], ["balance", "Current balance (USD)", true], ["minimum", "Minimum monthly payment", true], ["apr", "APR to use (%)", true], ["statement", "Statement balance (optional)", true], ["due", "Confirmed due date (YYYY-MM-DD, optional)", false]];
  return <View style={{ gap: 12 }}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: colors.primary }}>{open ? "Hide review" : "Review and copy into the current plan"}</Text></TouchableOpacity>
    {open && <><Text style={text}>Confirm these figures against your statement. Enter the APR for this estimate; reported rates are not combined automatically. Check grouped student-loan payments and accrued interest. Copy adds a debt and does not replace an existing one.</Text>
      {fields.map(([key, label, numeric]) => <View key={key} style={{ gap: 6 }}><Text style={text}>{label}</Text><TextInput accessibilityLabel={`${debt.name}: ${label}`} value={draft[key]} editable={!inactive} autoCapitalize="none" keyboardType={numeric ? "decimal-pad" : "default"} onChangeText={value => { setDraft(current => ({ ...current, [key]: value })); setConfirmed(false); }} style={{ ...text, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 }} /></View>)}
      <Text style={text}>I reviewed these figures and checked this debt is not already in my draft.</Text><Switch accessibilityLabel="Confirm reviewed debt figures and no duplicate in draft" value={confirmed} disabled={inactive} onValueChange={setConfirmed} />
      <TouchableOpacity accessibilityRole="button" disabled={inactive} onPress={copy} style={{ minHeight: 44, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, opacity: inactive ? 0.5 : 1 }}><Text style={{ color: colors.primary }}>Copy reviewed debt to draft</Text></TouchableOpacity></>}
    {!!message && <Text accessibilityLiveRegion="polite" style={text}>{message}</Text>}
  </View>;
}

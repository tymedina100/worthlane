import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { liabilitySnapshotSchema, type LiabilitySnapshot } from "@worthlane/contracts";
import type { AccountsResponse } from "@worthlane/types";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/lib/ThemeContext";
export function BankDebtDetails({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const connections = useQuery({ queryKey: ["debt-bank-connections", userId], queryFn: () => api.get<AccountsResponse>("/accounts") });
  const [snapshot, setSnapshot] = useState<{ id: string; data: LiabilitySnapshot } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function check(id: string) {
    setBusy(true); setMessage(""); setSnapshot(null);
    try {
      const data = liabilitySnapshotSchema.parse(await api.post(`/plaid/items/${encodeURIComponent(id)}/liabilities`, {}));
      if (useAuthStore.getState().userId === userId) setSnapshot({ id, data });
    } catch (error) { if (useAuthStore.getState().userId === userId) setMessage(error instanceof Error ? error.message : "Debt details unavailable. Use manual entry."); }
    finally { setBusy(false); }
  }
  const items = connections.data?.plaidItems ?? [];
  const data = snapshot && items.some(item => item.id === snapshot.id) ? snapshot.data : null;
  const text = { color: colors.text };
  return <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, gap: 12 }}>
    <Text style={{ ...text, fontSize: 20, fontWeight: "700" }}>Bank debt details · Only you</Text>
    <Text style={text}>Check supported linked debts. Confirm the figures on your statement before entering them in your plan. Checking does not change a saved plan.</Text>
    {connections.isLoading && <Text style={text}>Loading connections…</Text>}
    {connections.isError && <TouchableOpacity onPress={() => void connections.refetch()}><Text style={{ color: colors.primary }}>Could not load connections. Tap to retry.</Text></TouchableOpacity>}
    {!connections.isLoading && !connections.isError && !items.length && <Text style={text}>No bank connections yet. Continue with manual entry in this screen.</Text>}
    {items.map(item => <TouchableOpacity key={item.id} disabled={busy} accessibilityRole="button" onPress={() => void check(item.id)} style={{ padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}><Text style={{ color: colors.primary }}>Check {item.institution ?? "bank connection"} debt details</Text></TouchableOpacity>)}
    {!!(busy || message) && <Text accessibilityRole="alert" style={text}>{busy ? "Checking debt details…" : message}</Text>}
    {data && <><Text style={text}>Source: Plaid Liabilities · Retrieved {new Date(data.retrievedAt).toLocaleString()}</Text><Text style={text}>{data.notice}</Text>{!data.debts.length && <Text style={text}>No supported debt details returned. Use manual entry.</Text>}{data.debts.map(debt => {
      const money = (value: number | null) => value === null ? "Not provided" : `${(value / 100).toFixed(2)} ${debt.currency ?? "(currency not provided)"}`;
      return <View key={debt.accountId} style={{ gap: 8, paddingVertical: 12 }}><Text style={{ ...text, fontWeight: "700" }}>{debt.name}</Text><Text style={text}>{debt.kind.replaceAll("_", " ").toLowerCase()}</Text>
        <Text style={text}>Current balance: {money(debt.currentBalanceMinor)}</Text><Text style={text}>Statement balance: {money(debt.statementBalanceMinor)}</Text><Text style={text}>Minimum payment: {money(debt.minimumPaymentMinor)}</Text><Text style={text}>Next payment (mortgage): {money(debt.nextPaymentMinor)}</Text><Text style={text}>Accrued interest: {money(debt.outstandingInterestMinor)}</Text><Text style={text}>Provider due date: {debt.dueDate ?? "Not provided"}</Text><Text style={text}>Reported rates (review separately):</Text>{!debt.rates.length && <Text style={text}>Not provided</Text>}{debt.rates.map((rate, index) => <Text key={index} style={text}>{rate.kind.replaceAll("_", " ")}: {rate.percentage}% · balance subject to rate: {money(rate.balanceSubjectToRateMinor)}</Text>)}{debt.notes.map(note => <Text key={note} style={text}>{note}</Text>)}</View>;
    })}</>}
  </View>;
}

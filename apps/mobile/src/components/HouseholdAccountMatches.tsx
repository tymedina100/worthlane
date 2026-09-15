import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useThemedStyles, type Theme } from '@/lib/ThemeContext';

type Account = { id: string; name: string; type: string; ownerName: string; isOwner: boolean };
type Match = { id: string; firstAccountId: string; secondAccountId: string; status: 'PENDING' | 'CONFIRMED'; canConfirm: boolean };
type Matches = { accounts: Account[]; matches: Match[] };
const path = '/households/current/account-matches';

export function HouseholdAccountMatches({ householdId }: { householdId: string }) {
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore(state => state.userId);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['account-matches', userId, householdId], queryFn: () => api.get<Matches>(path), enabled: Boolean(userId) && open });
  const selectedAccount = query.data?.accounts.find(account => account.id === first);
  const candidates = query.data?.accounts.filter(account => account.id !== first && account.type === selectedAccount?.type) ?? [];
  const name = (id: string) => { const account = query.data?.accounts.find(account => account.id === id); return account ? `${account.ownerName} · ${account.name}` : 'Account'; };
  async function refresh() {
    setMessage('');
    // A partner may have confirmed or revoked a match on another device.
    // Refresh the figures alongside the consent state, not just this modal.
    await Promise.all([query.refetch(), client.invalidateQueries({ queryKey: ['household-summary', userId] })]);
  }
  async function save(body: { accountId: string; otherAccountId: string; confirmedSameAccount: true } | { id: string }) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const removing = 'id' in body;
      const result = removing ? await api.delete<{ status?: string }>(path, body) : await api.post<{ status?: string }>(path, body);
      await Promise.all([query.refetch(), client.invalidateQueries({ queryKey: ['household-summary', userId] })]);
      setConfirmed(false);
      setMessage(removing ? 'Match removed. Visible connections count separately again.' : result.status === 'CONFIRMED' ? 'Both connections confirmed. Household totals count this account once.' : 'Your confirmation is saved. Your partner must confirm before totals change.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the account match.'); }
    finally { setBusy(false); }
  }
  return <>
    <TouchableOpacity accessibilityRole="button" style={styles.option} onPress={() => setOpen(true)}><Text style={styles.heading}>Connected the same joint account twice?</Text><Text style={styles.helper}>Review matches and owner consent</Text></TouchableOpacity>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity accessibilityRole="button" style={styles.option} onPress={() => setOpen(false)}><Text style={styles.text}>Close account matches</Text></TouchableOpacity>
          <Text accessibilityRole="header" style={styles.heading}>One account, two connections</Text>
          <Text style={styles.helper}>Both owners must share detail and confirm the same real account. Until both confirm, totals stay unchanged. Your own connection supplies your view’s activity. No transactions are deleted or merged.</Text>
          <Text style={styles.helper}>Removing a match or withdrawing detail sharing restores separate counting. Budget agreements and who paid do not change.</Text>
          {query.isPending && <Text style={styles.helper}>Loading account matches…</Text>}
          {query.isError && <Text accessibilityRole="alert" style={styles.helper}>Could not load matches. Check your connection and refresh.</Text>}
          <TouchableOpacity accessibilityRole="button" disabled={busy || query.isFetching} style={styles.option} onPress={() => void refresh().catch(() => setMessage('Could not refresh household totals. Try again.'))}><Text style={styles.text}>Refresh matches</Text></TouchableOpacity>
          {!!message && <Text accessibilityLiveRegion="polite" style={styles.helper}>{message}</Text>}
          {query.data?.matches.map(match => <View key={match.id} style={styles.card}>
            <Text style={styles.heading}>{name(match.firstAccountId)} ↔ {name(match.secondAccountId)}</Text>
            <Text style={styles.helper}>{match.status === 'CONFIRMED' ? 'Confirmed · counted once' : 'Pending · counted separately'}</Text>
            {match.canConfirm && <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.primary} onPress={() => void save({ accountId: match.firstAccountId, otherAccountId: match.secondAccountId, confirmedSameAccount: true })}><Text style={styles.primaryText}>I confirm these are the same account</Text></TouchableOpacity>}
            <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.option} onPress={() => void save({ id: match.id })}><Text style={styles.text}>Remove match</Text></TouchableOpacity>
          </View>)}
          {query.data && <>
            <Text accessibilityRole="header" style={styles.heading}>Your bank connection</Text>
            {query.data.accounts.filter(account => account.isOwner && (!first || account.id === first)).map(account => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: first === account.id }} style={styles.option} key={account.id} onPress={() => { setFirst(account.id); setSecond(''); setConfirmed(false); }}><Text style={styles.text}>{first === account.id ? '● ' : '○ '}{account.name}</Text></TouchableOpacity>)}
            {first ? <>
              <TouchableOpacity accessibilityRole="button" style={styles.option} onPress={() => { setFirst(''); setSecond(''); setConfirmed(false); }}><Text style={styles.text}>Choose a different connection</Text></TouchableOpacity>
              <Text accessibilityRole="header" style={styles.heading}>Other connection to the same account</Text>
              {candidates.map(account => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: second === account.id }} style={styles.option} key={account.id} onPress={() => { setSecond(account.id); setConfirmed(false); }}><Text style={styles.text}>{second === account.id ? '● ' : '○ '}{name(account.id)}</Text></TouchableOpacity>)}
              {!candidates.length && <Text style={styles.helper}>No other shared connection of this account type is available to match.</Text>}
              <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} style={styles.option} onPress={() => setConfirmed(value => !value)}><Text style={styles.text}>{confirmed ? '☑ ' : '☐ '}I checked these are the same real bank account.</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={busy || !confirmed || !second} style={[styles.primary, (busy || !confirmed || !second) && styles.disabled]} onPress={() => void save({ accountId: first, otherAccountId: second, confirmedSameAccount: true })}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Confirm my connection'}</Text></TouchableOpacity>
            </> : <Text style={styles.helper}>Choose your connection first. Only bank accounts you are allowed to review appear here.</Text>}
          </>}
        </ScrollView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  </>;
}
const createStyles = ({ colors }: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 24, gap: 16 },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text }, helper: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  text: { fontSize: 16, color: colors.text }, option: { padding: 14, minHeight: 48, borderRadius: 12, backgroundColor: colors.surfaceAlt, gap: 6 },
  card: { padding: 16, borderRadius: 22, backgroundColor: colors.surface, gap: 12 },
  primary: { padding: 16, minHeight: 48, borderRadius: 12, backgroundColor: colors.primary }, primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center' }, disabled: { opacity: 0.5 },
});

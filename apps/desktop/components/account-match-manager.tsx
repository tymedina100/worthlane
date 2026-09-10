"use client";
import { useState, type FormEvent } from 'react';
import type { ManageHousehold } from './household-management';

type Account = { id: string; name: string; type: string; ownerName: string; isOwner: boolean };
type Match = { id: string; firstAccountId: string; secondAccountId: string; status: 'PENDING' | 'CONFIRMED'; canConfirm: boolean };
type Matches = { accounts: Account[]; matches: Match[] };

export function AccountMatchManager({ onManage }: { onManage: ManageHousehold }) {
  const [data, setData] = useState<Matches | null>(null);
  const [accountId, setAccountId] = useState('');
  const [otherAccountId, setOtherAccountId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    setBusy(true);
    try { setData(await onManage<Matches>({ path: '/account-matches', method: 'GET' })); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load account matches.'); }
    finally { setBusy(false); }
  }
  async function save(method: 'POST' | 'DELETE', body: unknown) {
    setBusy(true); setMessage('');
    try {
      const result = await onManage<{ status?: string }>({ path: '/account-matches', method, body });
      setData(await onManage<Matches>({ path: '/account-matches', method: 'GET' }));
      setConfirmed(false);
      setMessage(method === 'DELETE' ? 'Match removed. Each visible connection counts separately again.' : result.status === 'CONFIRMED' ? 'Both connections confirmed. Household totals count this account once.' : 'Your confirmation is saved. Your partner must confirm before totals change.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save account match.'); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (confirmed) void save('POST', { accountId, otherAccountId, confirmedSameAccount: true });
  }
  const name = (id: string) => { const account = data?.accounts.find(account => account.id === id); return account ? `${account.ownerName} · ${account.name}` : 'Account'; };
  return <details className="panel workspace-panel" onToggle={event => { if (event.currentTarget.open && !data && !busy) void load(); }}>
    <summary>Connected the same joint account twice?</summary>
    <p>When a bank cannot identify repeat connections, both owners can confirm they represent the same real account. Both connections must have shared detail. Your own connection supplies your view’s activity; transactions are retained and never merged.</p>
    <p>Removing the match or withdrawing detail sharing restores separate counting. This changes current household totals, not who paid or your budget agreement.</p>
    <button type="button" className="button button--secondary" disabled={busy} onClick={() => void load()}>Refresh matches</button>
    {message && <p role="status">{message}</p>}
    {data && <>
      {data.matches.map(match => <article key={match.id}>
        <h3>{name(match.firstAccountId)} ↔ {name(match.secondAccountId)}</h3>
        <p>{match.status === 'CONFIRMED' ? 'Confirmed by both account owners · counted once' : 'Waiting for both owners · still counted separately'}</p>
        {match.canConfirm && <button className="button button--primary" type="button" disabled={busy} onClick={() => void save('POST', { accountId: match.firstAccountId, otherAccountId: match.secondAccountId, confirmedSameAccount: true })}>I confirm these are the same account</button>}
        <button className="button button--secondary" type="button" disabled={busy} onClick={() => void save('DELETE', { id: match.id })}>Remove match</button>
      </article>)}
      <form onSubmit={submit} className="management-form">
        <label>Your bank connection<select required value={accountId} onChange={event => { setAccountId(event.target.value); setOtherAccountId(''); setConfirmed(false); }}><option value="">Choose your connection</option>{data.accounts.filter(account => account.isOwner).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>Other connection to the same account<select required value={otherAccountId} onChange={event => { setOtherAccountId(event.target.value); setConfirmed(false); }}><option value="">Choose the matching connection</option>{data.accounts.filter(account => account.id !== accountId).map(account => <option key={account.id} value={account.id}>{name(account.id)}</option>)}</select></label>
        <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required />I checked that these are the same real bank account.</label>
        <button className="button button--primary" disabled={busy || !confirmed || !accountId || !otherAccountId}>Confirm my connection</button>
      </form>
    </>}
  </details>;
}

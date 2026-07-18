"use client";

import { useEffect, useState } from "react";
import type {
  ManagePersonal,
  PersonalWorkspaceData,
} from "../src/lib/workspace-data";

function parseAmount(value: string, { allowZero = false, signed = false }: { allowZero?: boolean; signed?: boolean } = {}) {
  const normalized = value.trim().replace(/[$,\s]/g, "");
  const pattern = signed ? /^-?\d+(?:\.\d{0,2})?$/ : /^\d+(?:\.\d{0,2})?$/;
  if (!pattern.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))) return null;
  if (allowZero ? amount < 0 && !signed : amount <= 0) return null;
  return amount;
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <div className="management-feedback" aria-live="polite">
      {error ? <span className="form-feedback--error">{error}</span> : null}
      {success ? <span className="form-feedback--success">{success}</span> : null}
    </div>
  );
}

export function PersonalBudgetManager({
  personal,
  onManage,
}: {
  personal: PersonalWorkspaceData;
  onManage: ManagePersonal;
}) {
  const [categoryId, setCategoryId] = useState(personal.categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");
  const [rollover, setRollover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const existing = personal.budgets.find((budget) => budget.categoryId === categoryId);

  useEffect(() => {
    if (!categoryId && personal.categories[0]) setCategoryId(personal.categories[0].id);
  }, [categoryId, personal.categories]);

  useEffect(() => {
    setAmount(existing ? existing.amount.toFixed(2) : "");
    setPeriod(existing?.period ?? "MONTHLY");
    setRollover(existing?.rollover ?? false);
  }, [existing]);

  if (!personal.categories.length) return null;

  async function saveBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const parsedAmount = parseAmount(amount);
    if (!categoryId || parsedAmount === null) {
      setError("Choose a category and enter a positive amount with no more than two decimals.");
      return;
    }
    setIsSaving(true);
    try {
      await onManage({
        path: "/budgets",
        method: "POST",
        body: { categoryId, amount: parsedAmount, period, rollover },
      });
      const category = personal.categories.find((item) => item.id === categoryId);
      setSuccess(`${category?.name ?? "Budget"} was ${existing ? "updated" : "created"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The personal budget could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="personal-inline-manager" onSubmit={saveBudget}>
      <div><strong>Create or update a personal budget</strong><p>Changes stay in your personal Worthlane scope.</p></div>
      <label><span>Category</span><select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setError(null); setSuccess(null); }}>{personal.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
      <label><span>Amount</span><span className="money-field__control"><i>$</i><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="500.00" required /></span></label>
      <label><span>Period</span><select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option></select></label>
      <label className="inline-checkbox"><input type="checkbox" checked={rollover} onChange={(event) => setRollover(event.target.checked)} /><span>Roll over unused amount</span></label>
      <button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : existing ? "Update budget" : "Create budget"}</button>
      <Feedback error={error} success={success} />
    </form>
  );
}

export function PersonalGoalManager({
  personal,
  onManage,
}: {
  personal: PersonalWorkspaceData;
  onManage: ManagePersonal;
}) {
  const [selectedId, setSelectedId] = useState("new");
  const selected = personal.goals.find((goal) => goal.id === selectedId);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0.00");
  const [targetDate, setTargetDate] = useState("");
  const [type, setType] = useState("SAVINGS");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(selected?.name ?? "");
    setTarget(selected ? selected.targetAmount.toFixed(2) : "");
    setCurrent(selected ? selected.currentAmount.toFixed(2) : "0.00");
    setTargetDate(selected?.targetDate?.slice(0, 10) ?? "");
    setType(selected?.type ?? "SAVINGS");
  }, [selected]);

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const targetAmount = parseAmount(target);
    const currentAmount = parseAmount(current, { allowZero: true });
    if (!name.trim() || targetAmount === null || currentAmount === null) {
      setError("Enter a name and valid target/current amounts with no more than two decimals.");
      return;
    }
    const normalizedTargetDate = targetDate ? `${targetDate}T12:00:00.000Z` : null;
    const body = selected
      ? { name: name.trim(), targetAmount, currentAmount, targetDate: normalizedTargetDate, icon: selected.icon ?? "goal" }
      : { name: name.trim(), targetAmount, currentAmount, targetDate: normalizedTargetDate ?? undefined, type, icon: "goal" };
    setIsSaving(true);
    try {
      await onManage({
        path: selected ? `/goals/${encodeURIComponent(selected.id)}` : "/goals",
        method: selected ? "PATCH" : "POST",
        body,
      });
      setSuccess(selected ? `${name} was updated.` : `${name} was created as a personal goal.`);
      if (!selected) setSelectedId("new");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The personal goal could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGoal() {
    if (!selected || !window.confirm(`Delete the personal goal ${selected.name}?`)) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onManage({ path: `/goals/${encodeURIComponent(selected.id)}`, method: "DELETE" });
      setSelectedId("new");
      setSuccess(`${selected.name} was deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The personal goal could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="personal-management-block">
      <div className="personal-management-block__heading"><div><strong>Manage personal goals</strong><p>This changes only your own goal records.</p></div><select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setError(null); setSuccess(null); }}><option value="new">+ New personal goal</option>{personal.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.name}</option>)}</select></div>
      <form className="management-form management-form--goal" onSubmit={saveGoal}>
        <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Emergency fund" /></label>
        <label><span>Target</span><span className="money-field__control"><i>$</i><input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="decimal" required placeholder="10000.00" /></span></label>
        <label><span>Current</span><span className="money-field__control"><i>$</i><input value={current} onChange={(event) => setCurrent(event.target.value)} inputMode="decimal" required /></span></label>
        <label><span>Target date</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
        <label><span>Goal type</span><select value={type} disabled={Boolean(selected)} onChange={(event) => setType(event.target.value)}><option value="SAVINGS">Savings</option><option value="DEBT_PAYOFF">Debt payoff</option><option value="PURCHASE">Purchase</option><option value="EMERGENCY_FUND">Emergency fund</option></select></label>
        <div className="management-form__actions"><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : selected ? "Update personal goal" : "Create personal goal"}</button>{selected ? <button className="button button--danger" type="button" disabled={isSaving} onClick={() => void deleteGoal()}>Delete</button> : null}</div>
        <Feedback error={error} success={success} />
      </form>
    </section>
  );
}

export function ManualAccountManager({
  personal,
  onManage,
}: {
  personal: PersonalWorkspaceData;
  onManage: ManagePersonal;
}) {
  const manualAccounts = personal.accounts.filter((account) => account.source === "MANUAL");
  const [selectedId, setSelectedId] = useState("new");
  const selected = manualAccounts.find((account) => account.id === selectedId);
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [type, setType] = useState("CHECKING");
  const [balance, setBalance] = useState("0.00");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(selected?.name ?? "");
    setInstitutionName(selected?.institutionName ?? "");
    setType(selected?.type ?? "CHECKING");
    setBalance(selected ? selected.currentBalance.toFixed(2) : "0.00");
  }, [selected]);

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const currentBalance = parseAmount(balance, { allowZero: true, signed: true });
    if (!name.trim() || currentBalance === null) {
      setError("Enter an account name and a balance with no more than two decimals.");
      return;
    }
    const body = { name: name.trim(), institutionName: institutionName.trim() || (selected ? null : undefined), type, currentBalance };
    setIsSaving(true);
    try {
      await onManage({ path: selected ? `/accounts/${encodeURIComponent(selected.id)}` : "/accounts", method: selected ? "PATCH" : "POST", body });
      setSuccess(selected ? `${name} was updated.` : `${name} was added as a manual account.`);
      if (!selected) setSelectedId("new");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The manual account could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAccount() {
    if (!selected || !window.confirm(`Delete the manual account ${selected.name}?`)) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onManage({ path: `/accounts/${encodeURIComponent(selected.id)}`, method: "DELETE" });
      setSelectedId("new");
      setSuccess(`${selected.name} was deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The manual account could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel management-panel" aria-labelledby="manual-account-manager-title">
      <div className="panel__header panel__header--split"><div><p className="section-kicker">Personal account controls</p><h2 id="manual-account-manager-title">Manage manual accounts</h2><p>Add or edit accounts that are not connected through Plaid.</p></div><label className="management-picker"><span>Working on</span><select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setError(null); setSuccess(null); }}><option value="new">+ New manual account</option>{manualAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div>
      <form className="management-form" onSubmit={saveAccount}>
        <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Emergency savings" /></label>
        <label><span>Institution <small>optional</small></span><input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="Credit union" /></label>
        <label><span>Type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="CHECKING">Checking</option><option value="SAVINGS">Savings</option><option value="CREDIT">Credit</option><option value="INVESTMENT">Investment</option><option value="LOAN">Loan</option><option value="OTHER">Other</option></select></label>
        <label><span>Current balance</span><span className="money-field__control"><i>$</i><input value={balance} onChange={(event) => setBalance(event.target.value)} inputMode="decimal" required /></span></label>
        <div className="management-form__actions"><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : selected ? "Update account" : "Add manual account"}</button>{selected ? <button className="button button--danger" type="button" disabled={isSaving} onClick={() => void deleteAccount()}>Delete</button> : null}</div>
        <Feedback error={error} success={success} />
      </form>
    </section>
  );
}

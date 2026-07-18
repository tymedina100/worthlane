"use client";

import type { HouseholdSummary } from "@worthlane/contracts";
import { type CSSProperties, useMemo, useState } from "react";
import {
  formatCurrencyMinor,
  formatPercent,
  formatShortDate,
  titleCase,
} from "../src/lib/format";
import type {
  PersonalAccount,
  PersonalBudget,
  PersonalTransaction,
  PersonalWorkspaceData,
  ManagePersonal,
  ManagePlaid,
  PlaidConnection,
} from "../src/lib/workspace-data";
import {
  AccountDetailPanel,
  AccountVisibilityControl,
  GoalPlanManager,
  PartnerManager,
  ResponsibilityManager,
  type ManageHousehold,
} from "./household-management";
import {
  ManualAccountManager,
  PersonalBudgetManager,
  PersonalGoalManager,
} from "./personal-management";
import { GoalCard, ProgressBar } from "./household-dashboard";
import { Icon } from "./icons";

export type WorkspaceView = "plan" | "accounts" | "goals" | "reports";

type WorkspaceSurfaceProps = {
  view: WorkspaceView;
  summary: HouseholdSummary;
  personal: PersonalWorkspaceData;
  personalDataWarnings: string[];
  onContribute: (
    goalId: string,
    amountMinor: number,
    note: string | null
  ) => Promise<void>;
  onManageHousehold: ManageHousehold;
  onManagePersonal: ManagePersonal;
  onManagePlaid: ManagePlaid;
};

function majorToMinor(value: number) {
  return Math.round(value * 100);
}

function responsibilityLabel(
  responsibility: HouseholdSummary["responsibilities"][number]
) {
  if (responsibility.mode === "EQUAL") return "Equal split";
  if (responsibility.mode === "PERCENTAGE") return "Percentage split";
  return `${responsibility.allocations[0]?.displayName ?? "One member"} owns`;
}

function appliedForResponsibility(
  responsibility: HouseholdSummary["responsibilities"][number],
  memberId = "all"
) {
  return responsibility.allocations
    .filter((allocation) => memberId === "all" || allocation.memberId === memberId)
    .reduce((total, allocation) => total + allocation.appliedSpendMinor, 0);
}

function plannedForResponsibility(
  responsibility: HouseholdSummary["responsibilities"][number],
  memberId = "all"
) {
  if (memberId === "all") return responsibility.monthlyAmountMinor;
  return responsibility.allocations
    .filter((allocation) => allocation.memberId === memberId)
    .reduce((total, allocation) => total + allocation.assignedMinor, 0);
}

function DataWarning({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="workspace-warning" role="status">
      <Icon name="refresh" />
      <span>
        Household data is live. {warnings.join(" ")} The affected personal section may be empty.
      </span>
    </div>
  );
}

function StatCard({
  eyebrow,
  value,
  detail,
  tone = "plain",
}: {
  eyebrow: string;
  value: string;
  detail: string;
  tone?: "plain" | "dark" | "mint";
}) {
  return (
    <article className={`workspace-stat workspace-stat--${tone}`}>
      <span>{eyebrow}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function PersonalBudgetRow({
  budget,
  currency,
}: {
  budget: PersonalBudget;
  currency: string;
}) {
  const historyMax = Math.max(
    budget.amount,
    budget.spent,
    ...budget.history.map((period) => period.spent),
    1
  );

  return (
    <article className="personal-budget-row">
      <div className="personal-budget-row__identity">
        <i style={{ background: budget.categoryColor ?? undefined }} />
        <span>
          <strong>{budget.categoryName}</strong>
          <small>
            {titleCase(budget.period)} {budget.rollover ? "with rollover" : "budget"}
          </small>
        </span>
      </div>
      <div className="personal-budget-row__progress">
        <span>
          <b>{formatCurrencyMinor(majorToMinor(budget.spent), currency)}</b> spent
        </span>
        <ProgressBar
          value={budget.percentUsed}
          label={`${budget.categoryName} personal budget progress`}
        />
        <small>
          {formatCurrencyMinor(majorToMinor(budget.remaining), currency)} remaining
        </small>
      </div>
      <div className="budget-history" aria-label={`${budget.categoryName} recent history`}>
        {budget.history.length ? (
          budget.history
            .slice()
            .reverse()
            .map((period) => (
              <span
                key={period.startDate}
                style={{ height: `${Math.max((period.spent / historyMax) * 100, 5)}%` }}
                title={`${formatShortDate(period.startDate)}: ${formatCurrencyMinor(
                  majorToMinor(period.spent),
                  currency
                )}`}
              />
            ))
        ) : (
          <small>No history yet</small>
        )}
      </div>
      <strong className="personal-budget-row__amount">
        {formatCurrencyMinor(majorToMinor(budget.amount), currency)}
        <small>personal limit</small>
      </strong>
    </article>
  );
}

function MonthlyPlanSurface({
  summary,
  personal,
  warnings,
  onManage,
  onManagePersonal,
}: {
  summary: HouseholdSummary;
  personal: PersonalWorkspaceData;
  warnings: string[];
  onManage: ManageHousehold;
  onManagePersonal: ManagePersonal;
}) {
  const [query, setQuery] = useState("");
  const [memberId, setMemberId] = useState("all");
  const [status, setStatus] = useState("all");
  const currency = summary.household.currency;

  const householdTotals = useMemo(() => {
    return summary.responsibilities.reduce(
      (totals, responsibility) => ({
        planned: totals.planned + responsibility.monthlyAmountMinor,
        applied: totals.applied + appliedForResponsibility(responsibility),
      }),
      { planned: 0, applied: 0 }
    );
  }, [summary.responsibilities]);

  const personalTotals = useMemo(() => {
    return personal.budgets.reduce(
      (totals, budget) => ({
        planned: totals.planned + majorToMinor(budget.amount),
        spent: totals.spent + majorToMinor(budget.spent),
      }),
      { planned: 0, spent: 0 }
    );
  }, [personal.budgets]);

  const filteredResponsibilities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return summary.responsibilities.filter((responsibility) => {
      const planned = plannedForResponsibility(responsibility, memberId);
      const applied = appliedForResponsibility(responsibility, memberId);
      const percent = planned ? (applied / planned) * 100 : 0;
      const matchesQuery =
        !normalizedQuery ||
        responsibility.name.toLowerCase().includes(normalizedQuery) ||
        responsibility.categoryName.toLowerCase().includes(normalizedQuery);
      const matchesMember = memberId === "all" || planned > 0;
      const matchesStatus =
        status === "all" ||
        (status === "complete" && percent >= 100) ||
        (status === "progress" && percent > 0 && percent < 100) ||
        (status === "not-started" && percent === 0);
      return matchesQuery && matchesMember && matchesStatus;
    });
  }, [memberId, query, status, summary.responsibilities]);

  const filteredPersonalBudgets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return personal.budgets;
    return personal.budgets.filter((budget) =>
      budget.categoryName.toLowerCase().includes(normalizedQuery)
    );
  }, [personal.budgets, query]);

  const memberTotals = useMemo(
    () =>
      summary.members.map((member) => {
        const assigned = summary.responsibilities.reduce(
          (total, responsibility) =>
            total + plannedForResponsibility(responsibility, member.id),
          0
        );
        const applied = summary.responsibilities.reduce(
          (total, responsibility) =>
            total + appliedForResponsibility(responsibility, member.id),
          0
        );
        return { ...member, assigned, applied };
      }),
    [summary.members, summary.responsibilities]
  );

  return (
    <>
      <DataWarning warnings={warnings} />
      <section className="scope-boundary" aria-label="Budget scope explanation">
        <div>
          <span className="scope-boundary__icon"><Icon name="plan" /></span>
          <div>
            <strong>Household category budgets &amp; responsibilities</strong>
            <p>Shared monthly category plans and partner assignments, based only on permitted activity.</p>
          </div>
        </div>
        <i aria-hidden="true" />
        <div>
          <span className="scope-boundary__icon scope-boundary__icon--personal"><Icon name="lock" /></span>
          <div>
            <strong>Your personal budgets</strong>
            <p>Your existing private budgets from the same Worthlane account.</p>
          </div>
        </div>
      </section>

      <section className="workspace-stat-grid" aria-label="Monthly plan summary">
        <StatCard
          eyebrow="Household category budget"
          value={formatCurrencyMinor(householdTotals.planned, currency, { hideCents: true })}
          detail={`${formatCurrencyMinor(householdTotals.applied, currency, { hideCents: true })} applied across shared categories`}
          tone="dark"
        />
        <StatCard
          eyebrow="Your personal budget plan"
          value={formatCurrencyMinor(personalTotals.planned, currency, { hideCents: true })}
          detail={`${formatCurrencyMinor(personalTotals.spent, currency, { hideCents: true })} spent in your private budget scope`}
          tone="mint"
        />
        <StatCard
          eyebrow="Household remaining"
          value={formatCurrencyMinor(
            Math.max(householdTotals.planned - householdTotals.applied, 0),
            currency,
            { hideCents: true }
          )}
          detail="Responsibility capacity left this month"
        />
      </section>

      <div className="workspace-toolbar" role="search">
        <label className="workspace-search">
          <span>Find a category</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search housing, dining…"
            type="search"
          />
        </label>
        <label>
          <span>Responsibility owner</span>
          <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="all">Everyone</option>
            {summary.members.map((member) => (
              <option value={member.id} key={member.id}>{member.displayName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Progress</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="complete">Complete</option>
            <option value="progress">In progress</option>
            <option value="not-started">Not started</option>
          </select>
        </label>
        <button
          className="toolbar-clear"
          type="button"
          onClick={() => { setQuery(""); setMemberId("all"); setStatus("all"); }}
        >
          Clear filters
        </button>
      </div>

      <section className="plan-member-grid" aria-label="Household allocation by member">
        {memberTotals.map((member) => {
          const percent = member.assigned ? (member.applied / member.assigned) * 100 : 0;
          return (
            <article key={member.id}>
              <span className="plan-member-grid__avatar">{member.displayName.slice(0, 1)}</span>
              <div>
                <span>{member.displayName}{member.isCurrentUser ? " · You" : ""}</span>
                <strong>{formatCurrencyMinor(member.assigned, currency)} assigned</strong>
                <ProgressBar value={percent} label={`${member.displayName} responsibility progress`} />
              </div>
              <b>{formatPercent(percent)}</b>
            </article>
          );
        })}
      </section>

      <section className="panel workspace-panel" aria-labelledby="household-plan-title">
        <div className="panel__header panel__header--split">
          <div>
            <p className="section-kicker">Shared household scope</p>
            <h2 id="household-plan-title">Responsibility plan</h2>
            <p>Assignments are planning lanes—not per-purchase reimbursement.</p>
          </div>
          <span className="result-count">{filteredResponsibilities.length} shown</span>
        </div>
        <div className="workspace-responsibility-list">
          {filteredResponsibilities.length ? filteredResponsibilities.map((responsibility) => {
            const planned = plannedForResponsibility(responsibility, memberId);
            const applied = appliedForResponsibility(responsibility, memberId);
            const percent = planned ? (applied / planned) * 100 : 0;
            return (
              <article key={responsibility.id} className="workspace-responsibility-row">
                <span className="category-symbol" aria-hidden="true">
                  {responsibility.categoryName.slice(0, 1)}
                </span>
                <div className="workspace-responsibility-row__name">
                  <strong>{responsibility.name}</strong>
                  <span>{responsibility.categoryName} · {responsibilityLabel(responsibility)}</span>
                </div>
                <div className="workspace-responsibility-row__bar">
                  <span>{formatCurrencyMinor(applied, currency)} applied</span>
                  <ProgressBar value={percent} label={`${responsibility.name} progress`} />
                </div>
                <div className="workspace-responsibility-row__people">
                  {responsibility.allocations.map((allocation) => (
                    <span key={allocation.memberId}>
                      {allocation.displayName} {formatPercent(allocation.shareBasisPoints / 100)}
                    </span>
                  ))}
                </div>
                <strong className="workspace-responsibility-row__amount">
                  {formatCurrencyMinor(planned, currency)}
                  <small>{formatPercent(percent)} used</small>
                </strong>
              </article>
            );
          }) : (
            <div className="filtered-empty">No responsibilities match these filters.</div>
          )}
        </div>
      </section>

      <ResponsibilityManager summary={summary} categories={personal.categories} onManage={onManage} />

      <section className="panel workspace-panel" aria-labelledby="personal-budget-title">
        <div className="panel__header panel__header--split">
          <div>
            <p className="section-kicker">Personal scope · Only you</p>
            <h2 id="personal-budget-title">Your existing budgets</h2>
            <p>Live from your personal Worthlane budget records; household members do not inherit access.</p>
          </div>
          <span className="readonly-chip"><Icon name="shield" /> Desktop controls active</span>
        </div>
        <PersonalBudgetManager personal={personal} onManage={onManagePersonal} />
        <div className="personal-budget-list">
          {filteredPersonalBudgets.length ? filteredPersonalBudgets.map((budget) => (
            <PersonalBudgetRow budget={budget} currency={currency} key={budget.id} />
          )) : (
            <div className="filtered-empty">
              {personal.budgets.length ? "No personal budgets match this search." : "No personal budgets are configured yet."}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function PersonalAccountRow({
  account,
  currency,
}: {
  account: PersonalAccount;
  currency: string;
}) {
  const syncLabel = account.plaidNeedsRelink
    ? "Needs attention"
    : account.source === "PLAID"
      ? account.lastSyncedAt
        ? `Synced ${formatShortDate(account.lastSyncedAt)}`
        : "Connected"
      : "Manual account";

  return (
    <article className="connected-account-row">
      <span className={`account-icon account-icon--${account.type.toLowerCase()}`}>
        <Icon name={account.type === "CREDIT" ? "wallet" : "accounts"} />
      </span>
      <span>
        <strong>{account.name}</strong>
        <small>{account.institutionName ?? titleCase(account.type)}</small>
      </span>
      <span className={`connection-status${account.plaidNeedsRelink ? " is-warning" : ""}`}>
        <i />{syncLabel}
      </span>
      <span className="source-chip">{titleCase(account.source)}</span>
      <strong>{formatCurrencyMinor(majorToMinor(account.currentBalance), currency)}</strong>
    </article>
  );
}

function PlaidConnectionControls({
  connections,
  onManage,
}: {
  connections: PlaidConnection[];
  onManage: ManagePlaid;
}) {
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync(connection: PlaidConnection) {
    setWorkingId(connection.id);
    setMessage(null);
    setError(null);
    try {
      await onManage({ path: "/sync", body: { plaidItemId: connection.id, refresh: true } });
      setMessage(`${connection.institution ?? "Bank connection"} synced.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The connection could not be synced.");
    } finally {
      setWorkingId(null);
    }
  }

  async function unlink(connection: PlaidConnection) {
    if (!window.confirm(`Unlink ${connection.institution ?? "this bank connection"} and remove its imported accounts and transactions?`)) return;
    setWorkingId(connection.id);
    setMessage(null);
    setError(null);
    try {
      await onManage({ path: `/items/${encodeURIComponent(connection.id)}/unlink`, body: {} });
      setMessage(`${connection.institution ?? "Bank connection"} was unlinked.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The connection could not be unlinked.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="plaid-connection-controls">
      {connections.length ? connections.map((connection) => (
        <article key={connection.id}>
          <span><strong>{connection.institution ?? "Connected institution"}</strong><small>{connection.accountCount} account{connection.accountCount === 1 ? "" : "s"} - {titleCase(connection.status)}</small></span>
          <div>
            <button className="button button--secondary" type="button" disabled={workingId === connection.id} onClick={() => void sync(connection)}>Sync</button>
            <button className="button button--danger" type="button" disabled={workingId === connection.id} onClick={() => void unlink(connection)}>Unlink</button>
          </div>
        </article>
      )) : <p>No Plaid connections are attached to this login. New bank linking remains available in the mobile app.</p>}
      {message ? <span className="form-feedback--success">{message}</span> : null}
      {error ? <span className="form-feedback--error">{error}</span> : null}
    </div>
  );
}

function AccountsSurface({
  summary,
  personal,
  warnings,
  onManage,
  onManagePersonal,
  onManagePlaid,
}: {
  summary: HouseholdSummary;
  personal: PersonalWorkspaceData;
  warnings: string[];
  onManage: ManageHousehold;
  onManagePersonal: ManagePersonal;
  onManagePlaid: ManagePlaid;
}) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string } | null>(null);
  const currency = summary.household.currency;
  const viewer = summary.members.find((member) => member.isCurrentUser);

  const filteredPersonalAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return personal.accounts.filter((account) => {
      const matchesQuery =
        !normalizedQuery ||
        account.name.toLowerCase().includes(normalizedQuery) ||
        account.institutionName?.toLowerCase().includes(normalizedQuery);
      return matchesQuery && (source === "all" || account.source === source);
    });
  }, [personal.accounts, query, source]);

  const filteredHouseholdAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return summary.finances.detailedAccounts.filter((account) => {
      const matchesQuery =
        !normalizedQuery ||
        account.name.toLowerCase().includes(normalizedQuery) ||
        account.ownerName.toLowerCase().includes(normalizedQuery) ||
        account.institutionName?.toLowerCase().includes(normalizedQuery);
      return matchesQuery && (visibility === "all" || account.visibility === visibility);
    });
  }, [query, summary.finances.detailedAccounts, visibility]);

  const sharedCount = summary.finances.detailedAccounts.filter(
    (account) => account.visibility === "SHARED"
  ).length;
  const relinkCount = personal.accounts.filter((account) => account.plaidNeedsRelink).length;

  return (
    <>
      <DataWarning warnings={warnings} />
      <section className="workspace-stat-grid" aria-label="Account and privacy summary">
        <StatCard
          eyebrow="Visible net worth"
          value={formatCurrencyMinor(summary.finances.visibleNetWorthMinor, currency)}
          detail="Personal accounts plus partner detail or summaries shared with you"
          tone="dark"
        />
        <StatCard
          eyebrow="Your accounts"
          value={String(personal.accounts.length)}
          detail={`${personal.plaidItems.length} connected institution${personal.plaidItems.length === 1 ? "" : "s"}; ${relinkCount} need attention`}
          tone="mint"
        />
        <StatCard
          eyebrow="Household detail access"
          value={String(sharedCount)}
          detail="Accounts currently shared with full household detail"
        />
      </section>

      <div className="workspace-toolbar" role="search">
        <label className="workspace-search">
          <span>Find an account</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search account, owner, institution…"
            type="search"
          />
        </label>
        <label>
          <span>Your account source</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="all">All sources</option>
            <option value="PLAID">Plaid connected</option>
            <option value="MANUAL">Manual</option>
          </select>
        </label>
        <label>
          <span>Household visibility</span>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="all">All access levels</option>
            <option value="PERSONAL">Personal</option>
            <option value="SHARED">Shared detail</option>
          </select>
        </label>
        <button
          className="toolbar-clear"
          type="button"
          onClick={() => { setQuery(""); setSource("all"); setVisibility("all"); }}
        >
          Clear filters
        </button>
      </div>

      <section className="panel workspace-panel" aria-labelledby="connected-accounts-title">
        <div className="panel__header panel__header--split">
          <div>
            <p className="section-kicker">Personal ownership</p>
            <h2 id="connected-accounts-title">Your connected accounts</h2>
            <p>Connection health and balances from your existing Worthlane account.</p>
          </div>
          <span className="readonly-chip"><Icon name="shield" /> Live connection status</span>
        </div>
        <PlaidConnectionControls connections={personal.plaidItems} onManage={onManagePlaid} />
        <div className="connected-account-list">
          {filteredPersonalAccounts.length ? filteredPersonalAccounts.map((account) => (
            <PersonalAccountRow account={account} currency={currency} key={account.id} />
          )) : (
            <div className="filtered-empty">
              {personal.accounts.length ? "No accounts match these filters." : "No personal accounts are connected yet."}
            </div>
          )}
        </div>
      </section>

      <ManualAccountManager personal={personal} onManage={onManagePersonal} />

      <section className="panel workspace-panel" aria-labelledby="privacy-map-title">
        <div className="panel__header panel__header--split">
          <div>
            <p className="section-kicker">Household privacy map</p>
            <h2 id="privacy-map-title">What {viewer?.displayName ?? "you"} can see</h2>
            <p>Account owners can change partner access here; every view follows the saved permission.</p>
          </div>
          <div className="privacy-key">
            <span><i className="privacy-dot privacy-dot--detail" />Full detail</span>
            <span><i className="privacy-dot privacy-dot--summary" />Summary only</span>
          </div>
        </div>
        <div className="privacy-account-grid">
          {filteredHouseholdAccounts.map((account) => (
            <article key={account.id}>
              <span className={`account-icon account-icon--${account.type.toLowerCase()}`}>
                <Icon name={account.type === "CREDIT" ? "wallet" : "accounts"} />
              </span>
              <div>
                <strong>{account.name}</strong>
                <small>{account.ownerName}{account.isOwner ? " · You" : ""}</small>
              </div>
              <div className="privacy-account-actions">
                <AccountVisibilityControl account={account} onManage={onManage} />
                {(account.isOwner || account.visibility === "SHARED") ? (
                  <button type="button" onClick={() => setSelectedAccount({ id: account.id, name: account.name })}>
                    View activity
                  </button>
                ) : null}
              </div>
              <strong>{formatCurrencyMinor(account.currentBalanceMinor, currency)}</strong>
            </article>
          ))}
        </div>
        {selectedAccount ? (
          <AccountDetailPanel
            accountId={selectedAccount.id}
            accountName={selectedAccount.name}
            currency={currency}
            onManage={onManage}
            onClose={() => setSelectedAccount(null)}
          />
        ) : null}
        {summary.finances.summaryOnlyByOwner.map((owner) => (
          <article className="privacy-summary-row" key={owner.ownerMemberId}>
            <span><Icon name="lock" /></span>
            <div>
              <strong>{owner.ownerName}'s private accounts</strong>
              <p>Names and activity remain hidden; only these totals contribute to your household view.</p>
            </div>
            <dl>
              <div><dt>Assets</dt><dd>{formatCurrencyMinor(owner.assetsMinor, currency)}</dd></div>
              <div><dt>Liabilities</dt><dd>{formatCurrencyMinor(owner.liabilitiesMinor, currency)}</dd></div>
              <div><dt>Net</dt><dd>{formatCurrencyMinor(owner.netWorthMinor, currency)}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      <PartnerManager summary={summary} onManage={onManage} />
    </>
  );
}

function GoalsSurface({
  summary,
  personal,
  warnings,
  onContribute,
  onManage,
  onManagePersonal,
}: {
  summary: HouseholdSummary;
  personal: PersonalWorkspaceData;
  warnings: string[];
  onContribute: WorkspaceSurfaceProps["onContribute"];
  onManage: ManageHousehold;
  onManagePersonal: ManagePersonal;
}) {
  const [selectedGoalId, setSelectedGoalId] = useState(summary.sharedGoals[0]?.id ?? "");
  const currency = summary.household.currency;
  const selectedGoal =
    summary.sharedGoals.find((goal) => goal.id === selectedGoalId) ?? summary.sharedGoals[0];
  const sharedCurrent = summary.sharedGoals.reduce((total, goal) => total + goal.currentAmountMinor, 0);
  const sharedTarget = summary.sharedGoals.reduce((total, goal) => total + goal.targetAmountMinor, 0);
  const personalCurrent = personal.goals.reduce((total, goal) => total + majorToMinor(goal.currentAmount), 0);

  return (
    <>
      <DataWarning warnings={warnings} />
      <section className="workspace-stat-grid" aria-label="Goals summary">
        <StatCard
          eyebrow="Shared goals funded"
          value={formatCurrencyMinor(sharedCurrent, currency, { hideCents: true })}
          detail={`of ${formatCurrencyMinor(sharedTarget, currency, { hideCents: true })} planned together`}
          tone="dark"
        />
        <StatCard
          eyebrow="Your personal goals"
          value={formatCurrencyMinor(personalCurrent, currency, { hideCents: true })}
          detail={`${personal.goals.length} private goal${personal.goals.length === 1 ? "" : "s"} in your account`}
          tone="mint"
        />
        <StatCard
          eyebrow="Shared goal count"
          value={String(summary.sharedGoals.length)}
          detail="Visible to both household members"
        />
      </section>

      {summary.sharedGoals.length > 1 ? (
        <div className="workspace-toolbar workspace-toolbar--compact">
          <label>
            <span>Shared goal</span>
            <select value={selectedGoal?.id ?? ""} onChange={(event) => setSelectedGoalId(event.target.value)}>
              {summary.sharedGoals.map((goal) => (
                <option value={goal.id} key={goal.id}>{goal.name}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {selectedGoal ? (
        <div className="goal-workspace-grid">
          <GoalCard summary={summary} goal={selectedGoal} onContribute={onContribute} />
          <aside className="panel goal-plan-panel" aria-label={`${selectedGoal.name} contribution plan`}>
            <div className="panel__header">
              <p className="section-kicker">Contribution design</p>
              <h2>{titleCase(selectedGoal.contributionMode)} plan</h2>
              <p>Target shares guide saving; they do not create reimbursements between partners.</p>
            </div>
            <div className="goal-plan-members">
              {selectedGoal.participants.map((participant) => (
                <article key={participant.memberId}>
                  <span className="plan-member-grid__avatar">{participant.displayName.slice(0, 1)}</span>
                  <div>
                    <strong>{participant.displayName}</strong>
                    <small>{formatCurrencyMinor(participant.contributedAmountMinor, currency)} contributed</small>
                  </div>
                  <b>{formatCurrencyMinor(participant.plannedContributionMinor, currency)} target</b>
                </article>
              ))}
            </div>
            <div className="goal-plan-note">
              <Icon name="shield" />
              <p>Both partners see the same shared total and contribution history after sync.</p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="filtered-empty filtered-empty--large">No shared goals are configured yet.</div>
      )}

      <GoalPlanManager summary={summary} onManage={onManage} />

      <section className="panel workspace-panel" aria-labelledby="personal-goals-title">
        <div className="panel__header panel__header--split">
          <div>
            <p className="section-kicker">Personal scope · Only you</p>
            <h2 id="personal-goals-title">Your personal goals</h2>
            <p>Existing personal goals remain private unless you intentionally create a household goal.</p>
          </div>
          <span className="readonly-chip"><Icon name="shield" /> Desktop controls active</span>
        </div>
        <PersonalGoalManager personal={personal} onManage={onManagePersonal} />
        <div className="personal-goal-grid">
          {personal.goals.length ? personal.goals.map((goal) => {
            const percent = Math.min(Math.max(goal.percentComplete, 0), 100);
            const style = { "--personal-goal-progress": `${percent}%` } as CSSProperties;
            return (
              <article key={goal.id}>
                <div className="personal-goal-ring" style={style}>
                  <span>{formatPercent(percent)}</span>
                </div>
                <div>
                  <span>{titleCase(goal.type)}</span>
                  <h3>{goal.name}</h3>
                  <p>
                    {formatCurrencyMinor(majorToMinor(goal.currentAmount), currency)} of {formatCurrencyMinor(majorToMinor(goal.targetAmount), currency)}
                  </p>
                  <small>{goal.targetDate ? `Target ${formatShortDate(goal.targetDate)}` : "No target date"}</small>
                </div>
              </article>
            );
          }) : (
            <div className="filtered-empty">No personal goals are configured yet.</div>
          )}
        </div>
      </section>
    </>
  );
}

function transactionMatches(
  transaction: PersonalTransaction,
  query: string,
  categoryId: string,
  accountId: string,
  direction: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    !normalizedQuery ||
    transaction.merchantName?.toLowerCase().includes(normalizedQuery) ||
    transaction.note?.toLowerCase().includes(normalizedQuery) ||
    transaction.category?.name.toLowerCase().includes(normalizedQuery);
  const matchesDirection =
    direction === "all" ||
    (direction === "expense" && transaction.amount > 0) ||
    (direction === "income" && transaction.amount < 0);
  return (
    matchesQuery &&
    (categoryId === "all" || transaction.category?.id === categoryId) &&
    (accountId === "all" || transaction.account.id === accountId) &&
    matchesDirection
  );
}

function ReportsSurface({
  summary,
  personal,
  warnings,
}: {
  summary: HouseholdSummary;
  personal: PersonalWorkspaceData;
  warnings: string[];
}) {
  const [memberId, setMemberId] = useState("all");
  const [sort, setSort] = useState("planned");
  const [transactionQuery, setTransactionQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [direction, setDirection] = useState("all");
  const currency = summary.household.currency;

  const responsibilityRows = useMemo(() => {
    const rows = summary.responsibilities
      .map((responsibility) => {
        const planned = plannedForResponsibility(responsibility, memberId);
        const applied = appliedForResponsibility(responsibility, memberId);
        return {
          id: responsibility.id,
          name: responsibility.name,
          category: responsibility.categoryName,
          planned,
          applied,
          percent: planned ? (applied / planned) * 100 : 0,
        };
      })
      .filter((row) => memberId === "all" || row.planned > 0);
    return rows.sort((a, b) => {
      if (sort === "progress") return b.percent - a.percent;
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.planned - a.planned;
    });
  }, [memberId, sort, summary.responsibilities]);

  const reportTotals = responsibilityRows.reduce(
    (totals, row) => ({ planned: totals.planned + row.planned, applied: totals.applied + row.applied }),
    { planned: 0, applied: 0 }
  );
  const reportPercent = reportTotals.planned ? (reportTotals.applied / reportTotals.planned) * 100 : 0;
  const chartStyle = { "--report-progress": `${Math.min(reportPercent, 100)}%` } as CSSProperties;

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    personal.transactions.forEach((transaction) => {
      if (transaction.category) unique.set(transaction.category.id, transaction.category.name);
    });
    return [...unique].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [personal.transactions]);

  const transactionAccounts = useMemo(() => {
    const unique = new Map<string, string>();
    personal.transactions.forEach((transaction) => unique.set(transaction.account.id, transaction.account.name));
    return [...unique].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [personal.transactions]);

  const filteredTransactions = useMemo(
    () =>
      personal.transactions.filter((transaction) =>
        transactionMatches(transaction, transactionQuery, categoryId, accountId, direction)
      ),
    [accountId, categoryId, direction, personal.transactions, transactionQuery]
  );

  const categorySpend = useMemo(() => {
    const totals = new Map<string, number>();
    filteredTransactions.forEach((transaction) => {
      if (transaction.amount <= 0) return;
      const name = transaction.category?.name ?? "Uncategorized";
      totals.set(name, (totals.get(name) ?? 0) + transaction.amount);
    });
    return [...totals]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);
  const maxCategorySpend = Math.max(...categorySpend.map((category) => category.amount), 1);

  return (
    <>
      <DataWarning warnings={warnings} />
      <section className="report-summary-grid">
        <article className="report-donut-card">
          <div className="report-donut" style={chartStyle}>
            <span><strong>{formatPercent(reportPercent)}</strong><small>applied</small></span>
          </div>
          <div>
            <p className="section-kicker">Responsibility progress</p>
            <h2>{formatCurrencyMinor(reportTotals.applied, currency, { hideCents: true })}</h2>
            <p>of {formatCurrencyMinor(reportTotals.planned, currency, { hideCents: true })} in caller-visible shared categories</p>
          </div>
        </article>
        <StatCard
          eyebrow="Visible transaction rows"
          value={String(personal.transactions.length)}
          detail={personal.transactionTotal > personal.transactions.length ? `Latest ${personal.transactions.length} of ${personal.transactionTotal} personal rows loaded` : "All returned personal rows are loaded"}
          tone="mint"
        />
        <StatCard
          eyebrow="Shared goals"
          value={formatCurrencyMinor(summary.sharedGoals.reduce((total, goal) => total + goal.currentAmountMinor, 0), currency, { hideCents: true })}
          detail="Saved toward household goals"
        />
      </section>

      <section className="panel workspace-panel" aria-labelledby="responsibility-report-title">
        <div className="panel__header panel__header--split">
          <div>
            <p className="section-kicker">Household report</p>
            <h2 id="responsibility-report-title">Responsibility progress by category</h2>
            <p>Current-month plan versus permitted activity; no private partner transactions are exposed.</p>
          </div>
          <div className="inline-filters">
            <label>
              <span>Member scope</span>
              <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                <option value="all">Household</option>
                {summary.members.map((member) => (
                  <option value={member.id} key={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="planned">Largest plan</option>
                <option value="progress">Most applied</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>
        <div className="horizontal-chart" role="img" aria-label="Responsibility planned and applied amounts">
          {responsibilityRows.map((row) => (
            <div key={row.id}>
              <span><strong>{row.name}</strong><small>{row.category}</small></span>
              <div>
                <i style={{ width: `${Math.min(row.percent, 100)}%` }} />
              </div>
              <span><b>{formatCurrencyMinor(row.applied, currency)}</b><small>of {formatCurrencyMinor(row.planned, currency)}</small></span>
            </div>
          ))}
        </div>
        <div className="chart-legend"><span><i />Applied against plan</span><span>Over-plan activity is shown as 100% with the exact value retained.</span></div>
      </section>

      <section className="panel workspace-panel" aria-labelledby="transaction-report-title">
        <div className="panel__header panel__header--split">
          <div>
            <p className="section-kicker">Personal detail · Only you</p>
            <h2 id="transaction-report-title">Transactions &amp; category analysis</h2>
            <p>Your own detailed transaction feed. Partner activity remains governed by household privacy.</p>
          </div>
          <span className="readonly-chip"><Icon name="lock" /> Read-only report</span>
        </div>
        <div className="transaction-filters" role="search">
          <label className="workspace-search">
            <span>Search activity</span>
            <input value={transactionQuery} onChange={(event) => setTransactionQuery(event.target.value)} type="search" placeholder="Merchant, note, category…" />
          </label>
          <label>
            <span>Category</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            <span>Account</span>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="all">All accounts</option>
              {transactionAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
            </select>
          </label>
          <label>
            <span>Flow</span>
            <select value={direction} onChange={(event) => setDirection(event.target.value)}>
              <option value="all">All activity</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </label>
          <button className="toolbar-clear" type="button" onClick={() => { setTransactionQuery(""); setCategoryId("all"); setAccountId("all"); setDirection("all"); }}>Clear</button>
        </div>

        <div className="transaction-report-grid">
          <div className="category-spend-chart" aria-label="Expense totals by category for loaded transactions">
            <h3>Expense mix</h3>
            <p>Based on the currently loaded and filtered personal rows.</p>
            {categorySpend.length ? categorySpend.slice(0, 8).map((category) => (
              <div key={category.name}>
                <span>{category.name}</span>
                <i><b style={{ width: `${(category.amount / maxCategorySpend) * 100}%` }} /></i>
                <strong>{formatCurrencyMinor(majorToMinor(category.amount), currency)}</strong>
              </div>
            )) : <div className="filtered-empty">No expense rows match these filters.</div>}
          </div>
          <div className="transaction-table" role="table" aria-label="Filtered personal transactions">
            <div className="transaction-table__header" role="row">
              <span role="columnheader">Activity</span><span role="columnheader">Category</span><span role="columnheader">Account</span><span role="columnheader">Amount</span>
            </div>
            {filteredTransactions.length ? filteredTransactions.slice(0, 30).map((transaction) => (
              <div className="transaction-table__row" role="row" key={transaction.id}>
                <span role="cell"><strong>{transaction.merchantName ?? transaction.note ?? "Transaction"}</strong><small>{formatShortDate(transaction.date)}{transaction.isManual ? " · Manual" : ""}</small></span>
                <span role="cell">{transaction.category?.name ?? "Uncategorized"}</span>
                <span role="cell">{transaction.account.name}</span>
                <strong className={transaction.amount < 0 ? "amount-income" : ""} role="cell">{formatCurrencyMinor(majorToMinor(transaction.amount), currency)}</strong>
              </div>
            )) : <div className="filtered-empty">No transaction rows match these filters.</div>}
          </div>
        </div>
      </section>
    </>
  );
}

export function WorkspaceSurface({
  view,
  summary,
  personal,
  personalDataWarnings,
  onContribute,
  onManageHousehold,
  onManagePersonal,
  onManagePlaid,
}: WorkspaceSurfaceProps) {
  if (view === "plan") {
    return <MonthlyPlanSurface summary={summary} personal={personal} warnings={personalDataWarnings} onManage={onManageHousehold} onManagePersonal={onManagePersonal} />;
  }
  if (view === "accounts") {
    return <AccountsSurface summary={summary} personal={personal} warnings={personalDataWarnings} onManage={onManageHousehold} onManagePersonal={onManagePersonal} onManagePlaid={onManagePlaid} />;
  }
  if (view === "goals") {
    return (
      <GoalsSurface
        summary={summary}
        personal={personal}
        warnings={personalDataWarnings}
        onContribute={onContribute}
        onManage={onManageHousehold}
        onManagePersonal={onManagePersonal}
      />
    );
  }
  return <ReportsSurface summary={summary} personal={personal} warnings={personalDataWarnings} />;
}

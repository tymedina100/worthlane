"use client";

import type {
  HouseholdGoalContributionResult,
  HouseholdSummary,
} from "@worthlane/contracts";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  dollarsToMinorUnits,
  formatCurrencyMinor,
  formatPercent,
  formatShortDate,
  formatUpdatedTime,
  titleCase,
} from "../src/lib/format";
import { Icon } from "./icons";
import { Sidebar } from "./sidebar";

type DashboardMode = "live" | "demo";

type HouseholdDashboardProps = {
  mode: DashboardMode;
  initialSummary?: HouseholdSummary;
};

type DashboardSections = {
  accounts: boolean;
  plan: boolean;
  goals: boolean;
};

const defaultDashboardSections: DashboardSections = {
  accounts: true,
  plan: true,
  goals: true,
};

type DataEnvelope<T> = { data: T };

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function responsibilityLabel(
  responsibility: HouseholdSummary["responsibilities"][number]
) {
  if (responsibility.mode === "EQUAL") return "Split evenly";
  if (responsibility.mode === "PERCENTAGE") return "Custom split";
  return `${responsibility.allocations[0]?.displayName ?? "One member"} owns`;
}

export function ProgressBar({
  value,
  label,
  quiet = false,
}: {
  value: number;
  label: string;
  quiet?: boolean;
}) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={`progress${quiet ? " progress--quiet" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}

function LoadingShell({ onRetry, error }: { onRetry: () => void; error?: string }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="dashboard-main dashboard-main--loading" id="main-content">
        {error ? (
          <div className="load-state" role="alert">
            <span className="load-state__icon">
              <Icon name="refresh" />
            </span>
            <p className="section-kicker">Connection paused</p>
            <h1>We couldn’t load your household view.</h1>
            <p>{error}</p>
            <button className="button button--primary" onClick={onRetry} type="button">
              Try again
            </button>
          </div>
        ) : (
          <div
            className="dashboard-skeleton"
            role="status"
            aria-label="Loading household dashboard"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="skeleton skeleton--eyebrow" />
            <div className="skeleton skeleton--title" />
            <div className="skeleton-grid">
              <div className="skeleton skeleton--metric" />
              <div className="skeleton skeleton--metric" />
              <div className="skeleton skeleton--metric" />
            </div>
            <div className="skeleton skeleton--panel" />
          </div>
        )}
      </main>
    </div>
  );
}

function AccountSection({ summary }: { summary: HouseholdSummary }) {
  const { detailedAccounts, summaryOnlyByOwner } = summary.finances;
  const currency = summary.household.currency;

  return (
    <section className="panel accounts-panel" id="accounts" aria-labelledby="accounts-title">
      <div className="panel__header panel__header--split">
        <div>
          <p className="section-kicker">Accounts &amp; privacy</p>
          <h2 id="accounts-title">What you can see</h2>
          <p>Details appear only where the account owner has shared them.</p>
        </div>
        <div className="privacy-key" aria-label="Account visibility legend">
          <span><i className="privacy-dot privacy-dot--detail" />Full detail</span>
          <span><i className="privacy-dot privacy-dot--summary" />Summary only</span>
        </div>
      </div>

      <div className="account-table" role="table" aria-label="Detailed accounts">
        <div className="account-table__header" role="row">
          <span role="columnheader">Account</span>
          <span role="columnheader">Owner</span>
          <span role="columnheader">Access</span>
          <span role="columnheader">Balance</span>
        </div>
        {detailedAccounts.length ? (
          detailedAccounts.map((account) => (
            <div className="account-row" role="row" key={account.id}>
              <span className="account-row__identity" role="cell">
                <i className={`account-icon account-icon--${account.type.toLowerCase()}`}>
                  <Icon name={account.type === "CREDIT" ? "wallet" : "accounts"} />
                </i>
                <span>
                  <strong>{account.name}</strong>
                  <small>{account.institutionName ?? titleCase(account.type)}</small>
                </span>
              </span>
              <span className="account-row__owner" role="cell">
                {account.ownerName}
                {account.isOwner ? <small>You</small> : null}
              </span>
              <span role="cell">
                <span className={`access-badge access-badge--${account.visibility.toLowerCase()}`}>
                  <Icon name={account.visibility === "SHARED" ? "shield" : "lock"} />
                  {account.visibility === "SHARED" ? "Shared detail" : "Personal"}
                </span>
              </span>
              <strong className={account.currentBalanceMinor < 0 ? "amount-negative" : ""} role="cell">
                {formatCurrencyMinor(account.currentBalanceMinor, currency)}
              </strong>
            </div>
          ))
        ) : (
          <div className="account-table__empty">No detailed accounts are shared yet.</div>
        )}
      </div>

      {summaryOnlyByOwner.length ? (
        <div className="summary-only-list">
          {summaryOnlyByOwner.map((owner) => (
            <article className="summary-only-card" key={owner.ownerMemberId}>
              <span className="summary-only-card__lock"><Icon name="lock" /></span>
              <div className="summary-only-card__copy">
                <span className="access-badge access-badge--summary">Summary only</span>
                <h3>{owner.ownerName}’s private accounts</h3>
                <p>Account names and activity stay private. Only the totals below are included.</p>
              </div>
              <dl className="summary-only-card__totals">
                <div>
                  <dt>Assets</dt>
                  <dd>{formatCurrencyMinor(owner.assetsMinor, currency)}</dd>
                </div>
                <div>
                  <dt>Liabilities</dt>
                  <dd>{formatCurrencyMinor(owner.liabilitiesMinor, currency)}</dd>
                </div>
                <div className="summary-only-card__net">
                  <dt>Net contribution</dt>
                  <dd>{formatCurrencyMinor(owner.netWorthMinor, currency)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ResponsibilitiesSection({ summary }: { summary: HouseholdSummary }) {
  const currency = summary.household.currency;

  return (
    <section
      className="panel responsibilities-panel"
      id="responsibilities"
      aria-labelledby="responsibilities-title"
    >
      <div className="panel__header panel__header--split">
        <div>
          <p className="section-kicker">Monthly plan</p>
          <h2 id="responsibilities-title">Household category budgets</h2>
          <p>Plan who covers what without turning every purchase into an IOU.</p>
        </div>
        <span className="month-chip">July 2026</span>
      </div>

      <div className="responsibility-list">
        {summary.responsibilities.map((responsibility) => {
          const usedMinor = responsibility.allocations.reduce(
            (total, allocation) => total + allocation.appliedSpendMinor,
            0
          );
          const percentUsed = responsibility.monthlyAmountMinor
            ? (usedMinor / responsibility.monthlyAmountMinor) * 100
            : 0;
          return (
            <article className="responsibility-row" key={responsibility.id}>
              <div className="responsibility-row__heading">
                <span className="category-symbol" aria-hidden="true">
                  {responsibility.categoryName.slice(0, 1)}
                </span>
                <div>
                  <h3>{responsibility.name}</h3>
                  <span>{responsibilityLabel(responsibility)}</span>
                </div>
              </div>
              <div className="responsibility-row__progress">
                <div className="responsibility-row__progress-copy">
                  <span>{formatCurrencyMinor(usedMinor, currency, { hideCents: true })} applied</span>
                  <strong>{formatPercent(percentUsed)}</strong>
                </div>
                <ProgressBar value={percentUsed} label={`${responsibility.name} progress`} />
              </div>
              <div className="responsibility-row__allocations">
                {responsibility.allocations.map((allocation) => (
                  <span key={allocation.memberId}>
                    <i className={`member-dot member-dot--${allocation.displayName.toLowerCase()}`} />
                    <b>{allocation.displayName}</b>
                    {formatPercent(allocation.shareBasisPoints / 100)} · {formatCurrencyMinor(allocation.assignedMinor, currency, { hideCents: true })}
                  </span>
                ))}
              </div>
              <strong className="responsibility-row__amount">
                {formatCurrencyMinor(responsibility.monthlyAmountMinor, currency, { hideCents: true })}
                <small>planned</small>
              </strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function GoalCard({
  summary,
  goal,
  onContribute,
  anchorId,
}: {
  summary: HouseholdSummary;
  goal: HouseholdSummary["sharedGoals"][number];
  onContribute: (goalId: string, amountMinor: number, note: string | null) => Promise<void>;
  anchorId?: string;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const currency = summary.household.currency;
  const titleId = `goal-${goal.id}-title`;
  const feedbackId = `goal-${goal.id}-feedback`;
  const ringStyle = {
    "--goal-progress": `${Math.min(Math.max(goal.percentComplete, 0), 100)}%`,
  } as CSSProperties;

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    const amountMinor = dollarsToMinorUnits(amount);
    if (!amountMinor) {
      setFormError("Enter an amount greater than $0 with no more than two decimals.");
      return;
    }
    if (amountMinor > goal.remainingMinor) {
      setFormError(`That is more than the ${formatCurrencyMinor(goal.remainingMinor, currency)} left to save.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onContribute(goal.id, amountMinor, note.trim() || null);
      setAmount("");
      setNote("");
      setSuccessMessage(`${formatCurrencyMinor(amountMinor, currency)} added to ${goal.name}.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn’t add that contribution.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="goal-panel" id={anchorId ?? `goal-${goal.id}`} aria-labelledby={titleId}>
      <div className="goal-panel__header">
        <span className="goal-panel__icon"><Icon name="spark" /></span>
        <div>
          <p className="section-kicker">Shared savings goal</p>
          <h2 id={titleId}>{goal.name}</h2>
        </div>
        <span className="goal-panel__date">Target {formatShortDate(goal.targetDate)}</span>
      </div>

      <div className="goal-panel__overview">
        <div className="goal-ring" style={ringStyle}>
          <span>
            <strong>{formatPercent(goal.percentComplete)}</strong>
            <small>funded</small>
          </span>
        </div>
        <div className="goal-panel__numbers">
          <strong>{formatCurrencyMinor(goal.currentAmountMinor, currency, { hideCents: true })}</strong>
          <span>of {formatCurrencyMinor(goal.targetAmountMinor, currency, { hideCents: true })}</span>
          <p>{formatCurrencyMinor(goal.remainingMinor, currency, { hideCents: true })} left for the trip</p>
        </div>
      </div>

      <div className="participant-list" aria-label="Goal participant progress">
        {goal.participants.map((participant) => (
          <div className="participant" key={participant.memberId}>
            <div className="participant__top">
              <span>
                <i className={`member-dot member-dot--${participant.displayName.toLowerCase()}`} />
                <strong>{participant.displayName}</strong>
              </span>
              <b>{formatCurrencyMinor(participant.contributedAmountMinor, currency, { hideCents: true })}</b>
            </div>
            <ProgressBar
              value={participant.percentComplete}
              label={`${participant.displayName} goal progress`}
              quiet
            />
            <small>{formatCurrencyMinor(participant.plannedContributionMinor, currency, { hideCents: true })} target share</small>
          </div>
        ))}
      </div>

      <form className="contribution-form" onSubmit={submitContribution}>
        <div className="contribution-form__heading">
          <div>
            <h3>Add a contribution</h3>
            <p>Record what you moved into the trip fund.</p>
          </div>
          <span>{titleCase(goal.contributionMode)} plan</span>
        </div>
        <div className="contribution-form__fields">
          <label className="money-field">
            <span>Amount</span>
            <span className="money-field__control">
              <i aria-hidden="true">$</i>
              <input
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="150.00"
                aria-describedby={feedbackId}
              />
            </span>
          </label>
          <label>
            <span>Note <small>optional</small></span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="July trip fund"
              maxLength={500}
            />
          </label>
          <button className="button button--accent" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add contribution"}
          </button>
        </div>
        <div id={feedbackId} className="form-feedback">
          {formError ? <span className="form-feedback--error" role="alert">{formError}</span> : null}
          {successMessage ? <span className="form-feedback--success" role="status">{successMessage}</span> : null}
        </div>
      </form>

      {goal.recentContributions.length ? (
        <div className="recent-contributions">
          <h3>Recent contributions</h3>
          {goal.recentContributions.slice(0, 3).map((contribution) => (
            <div key={contribution.id}>
              <span className="recent-contributions__avatar">
                {contribution.contributorName.slice(0, 1)}
              </span>
              <span>
                <strong>{contribution.contributorName}</strong>
                <small>{contribution.note || "Trip fund contribution"}</small>
              </span>
              <b>+{formatCurrencyMinor(contribution.amountMinor, currency)}</b>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function HouseholdDashboard({ mode, initialSummary }: HouseholdDashboardProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<HouseholdSummary | null>(initialSummary ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [dashboardSections, setDashboardSections] = useState(defaultDashboardSections);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const requestId = useRef(0);

  const loadSummary = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (mode === "demo") return;
      const activeRequest = ++requestId.current;
      if (!background) setIsRefreshing(true);
      try {
        const response = await fetch("/api/household/summary", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        const payload = (await response.json().catch(() => null)) as
          | DataEnvelope<HouseholdSummary>
          | unknown;
        if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
          throw new Error(getErrorMessage(payload, "Your household data is unavailable right now."));
        }
        if (activeRequest === requestId.current) {
          setSummary((payload as DataEnvelope<HouseholdSummary>).data);
          setLoadError(null);
        }
      } catch (error) {
        if (activeRequest === requestId.current) {
          setLoadError(
            error instanceof Error ? error.message : "Your household data is unavailable right now."
          );
        }
      } finally {
        if (activeRequest === requestId.current && !background) setIsRefreshing(false);
      }
    },
    [mode, router]
  );

  useEffect(() => {
    if (mode !== "live") return;
    void loadSummary();

    const onFocus = () => void loadSummary({ background: true });
    const interval = window.setInterval(onFocus, 30_000);
    window.addEventListener("focus", onFocus);
    return () => {
      requestId.current += 1;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadSummary, mode]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("worthlane.desktop.dashboard.v1");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<DashboardSections>;
        setDashboardSections({
          accounts: typeof parsed.accounts === "boolean" ? parsed.accounts : true,
          plan: typeof parsed.plan === "boolean" ? parsed.plan : true,
          goals: typeof parsed.goals === "boolean" ? parsed.goals : true,
        });
      }
    } catch {
      // Keep the default layout if a browser preference is unreadable.
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem(
      "worthlane.desktop.dashboard.v1",
      JSON.stringify(dashboardSections)
    );
  }, [dashboardSections, preferencesLoaded]);

  const viewer = summary?.members.find((member) => member.isCurrentUser);
  const partner = summary?.members.find((member) => !member.isCurrentUser);

  const totals = useMemo(() => {
    if (!summary) return null;
    const monthlyPlanMinor = summary.responsibilities.reduce(
      (total, responsibility) => total + responsibility.monthlyAmountMinor,
      0
    );
    const appliedMinor = summary.responsibilities.reduce(
      (total, responsibility) =>
        total + responsibility.allocations.reduce(
          (allocationTotal, allocation) => allocationTotal + allocation.appliedSpendMinor,
          0
        ),
      0
    );
    const goalCurrentMinor = summary.sharedGoals.reduce(
      (total, goal) => total + goal.currentAmountMinor,
      0
    );
    const goalTargetMinor = summary.sharedGoals.reduce(
      (total, goal) => total + goal.targetAmountMinor,
      0
    );
    return { monthlyPlanMinor, appliedMinor, goalCurrentMinor, goalTargetMinor };
  }, [summary]);

  const contribute = useCallback(
    async (goalId: string, amountMinor: number, note: string | null) => {
      if (!summary) return;
      const now = new Date().toISOString();

      if (mode === "demo") {
        const currentMember = summary.members.find((member) => member.isCurrentUser);
        setSummary((current) => {
          if (!current || !currentMember) return current;
          return {
            ...current,
            household: { ...current.household, updatedAt: now },
            sharedGoals: current.sharedGoals.map((goal) => {
              if (goal.id !== goalId) return goal;
              const nextCurrent = goal.currentAmountMinor + amountMinor;
              return {
                ...goal,
                currentAmountMinor: nextCurrent,
                remainingMinor: goal.targetAmountMinor - nextCurrent,
                percentComplete: (nextCurrent / goal.targetAmountMinor) * 100,
                updatedAt: now,
                participants: goal.participants.map((participant) => {
                  if (participant.memberId !== currentMember.id) return participant;
                  const contributedAmountMinor = participant.contributedAmountMinor + amountMinor;
                  const participantTarget =
                    participant.contributedAmountMinor + participant.remainingMinor;
                  return {
                    ...participant,
                    contributedAmountMinor,
                    remainingMinor: participantTarget - contributedAmountMinor,
                    percentComplete: participantTarget
                      ? (contributedAmountMinor / participantTarget) * 100
                      : 0,
                  };
                }),
                recentContributions: [
                  {
                    id: `demo-contribution-${Date.now()}`,
                    memberId: currentMember.id,
                    contributorName: currentMember.displayName,
                    amountMinor,
                    note,
                    createdAt: now,
                  },
                  ...goal.recentContributions,
                ],
              };
            }),
          };
        });
        return;
      }

      const response = await fetch(
        `/api/household/goals/${encodeURIComponent(goalId)}/contributions`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountMinor, note }),
        }
      );
      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        throw new Error("Your session expired. Sign in again to continue.");
      }
      const payload = (await response.json().catch(() => null)) as
        | DataEnvelope<HouseholdGoalContributionResult>
        | unknown;
      if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
        throw new Error(getErrorMessage(payload, "We couldn’t add that contribution."));
      }
      const result = (payload as DataEnvelope<HouseholdGoalContributionResult>).data;
      setSummary((current) => {
        if (!current) return current;
        return {
          ...current,
          household: { ...current.household, updatedAt: result.goal.updatedAt },
          sharedGoals: current.sharedGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  ...result.goal,
                  recentContributions: [result.contribution, ...goal.recentContributions],
                }
              : goal
          ),
        };
      });
      void loadSummary({ background: true });
    },
    [loadSummary, mode, router, summary]
  );

  if (!summary) {
    return <LoadingShell onRetry={() => void loadSummary()} error={loadError ?? undefined} />;
  }

  const currency = summary.household.currency;
  const monthPercent = totals?.monthlyPlanMinor
    ? ((totals.appliedMinor / totals.monthlyPlanMinor) * 100)
    : 0;
  const goalPercent = totals?.goalTargetMinor
    ? ((totals.goalCurrentMinor / totals.goalTargetMinor) * 100)
    : 0;
  const featuredGoal =
    summary.sharedGoals.find((goal) => goal.name.toLowerCase().includes("universal orlando")) ??
    summary.sharedGoals[0];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to dashboard</a>
      <Sidebar
        householdName={summary.household.name}
        viewerName={viewer?.displayName}
        partnerName={partner?.displayName}
        demo={mode === "demo"}
      />
      <main className="dashboard-main" id="main-content">
        {mode === "demo" ? (
          <div className="demo-banner">
            <span><Icon name="spark" />Interactive demo</span>
            <p>Explore Tyler and Rachel’s sample household. Changes here stay in this preview.</p>
            <a href="/login">Sign in to Worthlane <Icon name="arrow" /></a>
          </div>
        ) : null}

        {loadError ? (
          <div className="status-banner status-banner--error" role="alert">
            <span>Live updates are paused. Your last household snapshot is still shown.</span>
            <button type="button" onClick={() => void loadSummary()}>Reconnect</button>
          </div>
        ) : null}

        <header className="dashboard-header" id="overview">
          <div>
            <p className="section-kicker">{summary.household.name} household</p>
            <h1>{greeting()}, {viewer?.displayName ?? "there"}.</h1>
            <p>One clear view of what’s yours, what’s shared, and what you’re building together.</p>
          </div>
          <div className="dashboard-header__actions">
            <span className="sync-status">
              <i /> Updated {formatUpdatedTime(summary.household.updatedAt)}
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => void loadSummary()}
              disabled={isRefreshing || mode === "demo"}
              aria-label="Refresh household data"
              title={mode === "demo" ? "Demo data is local" : "Refresh household data"}
            >
              <Icon name="refresh" className={isRefreshing ? "is-spinning" : undefined} />
            </button>
            <div className="dashboard-customizer">
              <button
                type="button"
                className="dashboard-customizer__trigger"
                onClick={() => setIsCustomizing((open) => !open)}
                aria-expanded={isCustomizing}
                aria-controls="dashboard-customizer-menu"
              >
                Customize
              </button>
              {isCustomizing ? (
                <div className="dashboard-customizer__menu" id="dashboard-customizer-menu">
                  <div>
                    <strong>Dashboard sections</strong>
                    <button
                      type="button"
                      onClick={() => setDashboardSections(defaultDashboardSections)}
                    >
                      Reset
                    </button>
                  </div>
                  {([
                    ["accounts", "Accounts & privacy"],
                    ["plan", "Monthly plan"],
                    ["goals", "Shared goal"],
                  ] as const).map(([section, label]) => (
                    <label key={section}>
                      <input
                        type="checkbox"
                        checked={dashboardSections[section]}
                        onChange={(event) =>
                          setDashboardSections((current) => ({
                            ...current,
                            [section]: event.target.checked,
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <small>Saved in this browser.</small>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="metric-grid" aria-label="Household summary">
          <article className="metric-card metric-card--primary">
            <div className="metric-card__top">
              <span>Visible net worth</span>
              <span className="metric-card__icon"><Icon name="wallet" /></span>
            </div>
            <strong>{formatCurrencyMinor(summary.finances.visibleNetWorthMinor, currency)}</strong>
            <p>
              Your accounts plus the detail or summaries your household has chosen to share.
            </p>
            <span className="metric-card__scope"><Icon name="shield" /> Visible to you</span>
          </article>

          <article className="metric-card">
            <div className="metric-card__top">
              <span>Monthly plan</span>
              <span className="metric-card__mini">July</span>
            </div>
            <strong>{formatCurrencyMinor(totals?.monthlyPlanMinor ?? 0, currency, { hideCents: true })}</strong>
            <p>{formatCurrencyMinor(totals?.appliedMinor ?? 0, currency, { hideCents: true })} applied so far</p>
            <ProgressBar value={monthPercent} label="Monthly plan progress" />
            <span className="metric-card__foot">
              <b>{formatPercent(monthPercent)}</b>
              <span>{formatCurrencyMinor((totals?.monthlyPlanMinor ?? 0) - (totals?.appliedMinor ?? 0), currency, { hideCents: true })} remaining</span>
            </span>
          </article>

          <article className="metric-card">
            <div className="metric-card__top">
              <span>Shared goals</span>
              <span className="metric-card__icon metric-card__icon--soft"><Icon name="goal" /></span>
            </div>
            <strong>{formatCurrencyMinor(totals?.goalCurrentMinor ?? 0, currency, { hideCents: true })}</strong>
            <p>of {formatCurrencyMinor(totals?.goalTargetMinor ?? 0, currency, { hideCents: true })} saved together</p>
            <ProgressBar value={goalPercent} label="Shared goals progress" />
            <span className="metric-card__foot">
              <b>{formatPercent(goalPercent)}</b>
              <span>{summary.sharedGoals.length} active {summary.sharedGoals.length === 1 ? "goal" : "goals"}</span>
            </span>
          </article>
        </section>

        {dashboardSections.accounts ? <AccountSection summary={summary} /> : null}

        {dashboardSections.plan || dashboardSections.goals ? (
          <div className="planning-grid">
            {dashboardSections.plan ? <ResponsibilitiesSection summary={summary} /> : null}
            {dashboardSections.goals ? (
              featuredGoal ? (
                <GoalCard
                  summary={summary}
                  goal={featuredGoal}
                  onContribute={contribute}
                  anchorId={mode === "demo" ? "goals" : undefined}
                />
              ) : (
                <section className="goal-panel goal-panel--empty" id="goals">
                  <Icon name="goal" />
                  <h2>No shared goal yet</h2>
                  <p>Your first household goal will appear here.</p>
                </section>
              )
            ) : null}
          </div>
        ) : (
          <section className="dashboard-empty-layout">
            <Icon name="dashboard" />
            <div>
              <strong>Your summary cards are pinned.</strong>
              <p>Use Customize to bring planning sections back to the overview.</p>
            </div>
          </section>
        )}

        <footer className="dashboard-footer">
          <span>Worthlane keeps personal detail private by default.</span>
          <span>Household snapshot · {summary.household.timezone}</span>
        </footer>
      </main>
    </div>
  );
}

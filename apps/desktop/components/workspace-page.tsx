"use client";

import type {
  HouseholdGoalContributionResult,
  HouseholdSummary,
} from "@worthlane/contracts";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatUpdatedTime } from "../src/lib/format";
import {
  emptyPersonalWorkspaceData,
  type PersonalAccount,
  type PersonalBudget,
  type PersonalCategory,
  type PersonalGoal,
  type PersonalTransaction,
  type PersonalWorkspaceData,
  type PlaidConnection,
  type ManagePlaid,
} from "../src/lib/workspace-data";
import { Icon } from "./icons";
import { Sidebar } from "./sidebar";
import { WorkspaceSurface, type WorkspaceView } from "./workspace-surfaces";

type DataEnvelope<T> = { data: T };

const viewCopy: Record<WorkspaceView, { kicker: string; title: string; description: string }> = {
  plan: {
    kicker: "Monthly planning workspace",
    title: "Plan the month together.",
    description: "Keep personal budgets private while making household responsibilities unmistakably shared.",
  },
  accounts: {
    kicker: "Accounts & privacy",
    title: "One account map. Exact boundaries.",
    description: "See your connection health and the household access your partner has intentionally granted.",
  },
  goals: {
    kicker: "Shared & personal goals",
    title: "Build goals without blurring ownership.",
    description: "Contribute to shared plans together while keeping your existing personal goals in their own lane.",
  },
  reports: {
    kicker: "Reports & analysis",
    title: "See the plan and the detail clearly.",
    description: "Filter shared responsibility progress and your own transaction activity without exposing private partner data.",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function envelopeData<T>(payload: unknown): T | null {
  if (!isRecord(payload) || !("data" in payload)) return null;
  return (payload as DataEnvelope<T>).data;
}

function errorMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;
  const error = payload.error;
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return fallback;
}

function WorkspaceLoading({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="dashboard-main dashboard-main--loading" id="main-content">
        {error ? (
          <div className="load-state" role="alert">
            <span className="load-state__icon"><Icon name="refresh" /></span>
            <p className="section-kicker">Connection paused</p>
            <h1>We couldn't load this planning workspace.</h1>
            <p>{error}</p>
            <button className="button button--primary" onClick={onRetry} type="button">Try again</button>
          </div>
        ) : (
          <div className="dashboard-skeleton" aria-label="Loading planning workspace">
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

export function WorkspacePage({ view }: { view: WorkspaceView }) {
  const router = useRouter();
  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [personal, setPersonal] = useState<PersonalWorkspaceData>(emptyPersonalWorkspaceData);
  const [personalDataWarnings, setPersonalDataWarnings] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestId = useRef(0);

  const loadWorkspace = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const activeRequest = ++requestId.current;
    if (!background) setIsRefreshing(true);

    try {
      const responses = await Promise.all([
        fetch("/api/household/summary", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/personal/budgets", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/personal/transactions?limit=100", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/personal/goals", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/personal/accounts", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/personal/categories", { cache: "no-store", credentials: "same-origin" }),
      ]);

      if (responses.some((response) => response.status === 401)) {
        router.replace(`/login?next=/dashboard/${view}`);
        router.refresh();
        return;
      }

      const payloads = await Promise.all(responses.map((response) => response.json().catch(() => null)));
      const household = envelopeData<HouseholdSummary>(payloads[0]);
      if (!responses[0].ok || !household) {
        throw new Error(errorMessage(payloads[0], "Your household data is unavailable right now."));
      }

      const warnings: string[] = [];
      const budgetData = envelopeData<PersonalBudget[]>(payloads[1]);
      const transactionData = envelopeData<{
        transactions: PersonalTransaction[];
        total: number;
      }>(payloads[2]);
      const goalData = envelopeData<PersonalGoal[]>(payloads[3]);
      const accountData = envelopeData<{
        accounts: PersonalAccount[];
        plaidItems: PlaidConnection[];
      }>(payloads[4]);
      const categoryData = envelopeData<PersonalCategory[]>(payloads[5]);

      if (!responses[1].ok || !Array.isArray(budgetData)) warnings.push("Personal budgets could not refresh.");
      if (!responses[2].ok || !transactionData || !Array.isArray(transactionData.transactions)) warnings.push("Transactions could not refresh.");
      if (!responses[3].ok || !Array.isArray(goalData)) warnings.push("Personal goals could not refresh.");
      if (!responses[4].ok || !accountData || !Array.isArray(accountData.accounts)) warnings.push("Connected accounts could not refresh.");
      if (!responses[5].ok || !Array.isArray(categoryData)) warnings.push("Budget categories could not refresh.");

      if (activeRequest === requestId.current) {
        setSummary(household);
        setPersonal((current) => ({
          budgets: Array.isArray(budgetData) ? budgetData : current.budgets,
          categories: Array.isArray(categoryData) ? categoryData : current.categories,
          transactions:
            transactionData && Array.isArray(transactionData.transactions)
              ? transactionData.transactions
              : current.transactions,
          transactionTotal:
            transactionData && typeof transactionData.total === "number"
              ? transactionData.total
              : current.transactionTotal,
          goals: Array.isArray(goalData) ? goalData : current.goals,
          accounts:
            accountData && Array.isArray(accountData.accounts)
              ? accountData.accounts
              : current.accounts,
          plaidItems:
            accountData && Array.isArray(accountData.plaidItems)
              ? accountData.plaidItems
              : current.plaidItems,
        }));
        setPersonalDataWarnings(warnings);
        setLoadError(null);
      }
    } catch (error) {
      if (activeRequest === requestId.current) {
        setLoadError(
          error instanceof Error ? error.message : "Your planning workspace is unavailable right now."
        );
      }
    } finally {
      if (activeRequest === requestId.current && !background) setIsRefreshing(false);
    }
  }, [router, view]);

  useEffect(() => {
    void loadWorkspace();
    const refreshInBackground = () => void loadWorkspace({ background: true });
    const interval = window.setInterval(refreshInBackground, 60_000);
    window.addEventListener("focus", refreshInBackground);
    return () => {
      requestId.current += 1;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshInBackground);
    };
  }, [loadWorkspace]);

  const contribute = useCallback(async (goalId: string, amountMinor: number, note: string | null) => {
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
      router.replace(`/login?next=/dashboard/${view}`);
      router.refresh();
      throw new Error("Your session expired. Sign in again to continue.");
    }
    const payload = await response.json().catch(() => null);
    const result = envelopeData<HouseholdGoalContributionResult>(payload);
    if (!response.ok || !result) {
      throw new Error(errorMessage(payload, "We couldn't add that contribution."));
    }

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
    void loadWorkspace({ background: true });
  }, [loadWorkspace, router, view]);

  const manageHousehold = useCallback(async <T,>({
    path,
    method,
    body,
  }: {
    path: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  }): Promise<T> => {
    const response = await fetch(`/api/household/manage${path}`, {
      method,
      credentials: "same-origin",
      ...(method === "GET" ? {} : { headers: { "Content-Type": "application/json" } }),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 401) {
      router.replace(`/login?next=/dashboard/${view}`);
      router.refresh();
      throw new Error("Your session expired. Sign in again to continue.");
    }
    const payload = await response.json().catch(() => null);
    const result = envelopeData<T>(payload);
    if (!response.ok || result === null) {
      throw new Error(errorMessage(payload, "That household change could not be saved."));
    }
    if (method !== "GET") await loadWorkspace({ background: true });
    return result;
  }, [loadWorkspace, router, view]);

  const managePersonal = useCallback(async <T,>({
    path,
    method,
    body,
  }: {
    path: string;
    method: "POST" | "PATCH" | "DELETE";
    body?: unknown;
  }): Promise<T> => {
    const isCollectionPost = method === "POST" && path.split("/").filter(Boolean).length === 1;
    const response = await fetch(
      isCollectionPost ? `/api/personal${path}` : `/api/personal/manage${path}`,
      {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }
    );
    if (response.status === 401) {
      router.replace(`/login?next=/dashboard/${view}`);
      router.refresh();
      throw new Error("Your session expired. Sign in again to continue.");
    }
    const payload = await response.json().catch(() => null);
    const result = envelopeData<T>(payload);
    if (!response.ok || result === null) {
      throw new Error(errorMessage(payload, "That personal finance change could not be saved."));
    }
    await loadWorkspace({ background: true });
    return result;
  }, [loadWorkspace, router, view]);

  const managePlaid = useCallback(async <T,>(
    { path, body }: { path: string; body?: unknown }
  ): Promise<T> => {
    const response = await fetch(`/api/plaid${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (response.status === 401) {
      router.replace(`/login?next=/dashboard/${view}`);
      router.refresh();
      throw new Error("Your session expired. Sign in again to continue.");
    }
    const payload = await response.json().catch(() => null);
    const result = envelopeData<T>(payload);
    if (!response.ok || result === null) {
      throw new Error(errorMessage(payload, "That bank connection change could not be completed."));
    }
    await loadWorkspace({ background: true });
    return result;
  }, [loadWorkspace, router, view]);

  if (!summary) {
    return <WorkspaceLoading error={loadError} onRetry={() => void loadWorkspace()} />;
  }

  const viewer = summary.members.find((member) => member.isCurrentUser);
  const partner = summary.members.find((member) => !member.isCurrentUser);
  const copy = viewCopy[view];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to planning workspace</a>
      <Sidebar
        householdName={summary.household.name}
        viewerName={viewer?.displayName}
        partnerName={partner?.displayName}
      />
      <main className="dashboard-main workspace-main" id="main-content">
        {loadError ? (
          <div className="status-banner status-banner--error" role="status">
            <span>Live updates are paused. Your last successful snapshot is still shown.</span>
            <button type="button" onClick={() => void loadWorkspace()}>Reconnect</button>
          </div>
        ) : null}

        <header className="dashboard-header workspace-header">
          <div>
            <p className="section-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <div className="dashboard-header__actions">
            <span className="sync-status"><i /> Updated {formatUpdatedTime(summary.household.updatedAt)}</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => void loadWorkspace()}
              disabled={isRefreshing}
              aria-label="Refresh planning data"
              title="Refresh planning data"
            >
              <Icon name="refresh" className={isRefreshing ? "is-spinning" : undefined} />
            </button>
          </div>
        </header>

        <WorkspaceSurface
          view={view}
          summary={summary}
          personal={personal}
          personalDataWarnings={personalDataWarnings}
          onContribute={contribute}
          onManageHousehold={manageHousehold}
          onManagePersonal={managePersonal}
          onManagePlaid={managePlaid}
        />

        <footer className="dashboard-footer">
          <span>Personal detail stays private by default; shared data follows household permissions.</span>
          <span>Keyboard: Alt+1–5 switches workspace views · {summary.household.timezone}</span>
        </footer>
      </main>
    </div>
  );
}

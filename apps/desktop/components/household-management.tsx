"use client";

import {
  createHouseholdGoalSchema,
  createHouseholdResponsibilitySchema,
  linkHouseholdPartnerSchema,
  setHouseholdIncomeBasesSchema,
  setHouseholdAccountVisibilitySchema,
  type HouseholdAccountDetail,
  type HouseholdPartnerInvitationSummary,
  type HouseholdPartnerInviteResult,
  type HouseholdSummary,
} from "@worthlane/contracts";
import { useEffect, useMemo, useState } from "react";
import {
  dollarsToMinorUnits,
  formatCurrencyMinor,
  formatPercent,
  formatShortDate,
  titleCase,
} from "../src/lib/format";
import { Icon } from "./icons";

export type ManageHousehold = <T>(input: {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}) => Promise<T>;

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <div className="management-feedback" aria-live="polite">
      {error ? <span className="form-feedback--error">{error}</span> : null}
      {success ? <span className="form-feedback--success">{success}</span> : null}
    </div>
  );
}

function moneyInput(minor: number) {
  return (minor / 100).toFixed(2);
}

type ResponsibilityAssignmentMode = "ASSIGNED" | "EQUAL" | "PERCENTAGE";

export function ResponsibilityManager({
  summary,
  categories,
  onManage,
}: {
  summary: HouseholdSummary;
  categories: Array<{ id: string; name: string }>;
  onManage: ManageHousehold;
}) {
  const viewer = summary.members.find((member) => member.isCurrentUser);
  const canManage = viewer?.role === "OWNER";
  const firstMemberId = summary.members[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState("new");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<ResponsibilityAssignmentMode>("EQUAL");
  const [assignedMemberId, setAssignedMemberId] = useState(firstMemberId);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selected = summary.responsibilities.find((responsibility) => responsibility.id === selectedId);

  useEffect(() => {
    const evenShare = summary.members.length ? 100 / summary.members.length : 0;
    if (!selected) {
      setName("");
      setCategoryId(categories[0]?.id ?? "");
      setAmount("");
      setAssignmentMode("EQUAL");
      setAssignedMemberId(firstMemberId);
      setShares(Object.fromEntries(summary.members.map((member) => [member.id, evenShare.toFixed(2)])));
      return;
    }

    setName(selected.name);
    setCategoryId(selected.categoryId ?? categories[0]?.id ?? "");
    setAmount(moneyInput(selected.monthlyAmountMinor));
    setAssignmentMode(selected.mode === "MEMBER" ? "ASSIGNED" : selected.mode);
    setAssignedMemberId(selected.allocations[0]?.memberId ?? firstMemberId);
    setShares(
      Object.fromEntries(
        summary.members.map((member) => {
          const allocation = selected.allocations.find((item) => item.memberId === member.id);
          return [member.id, ((allocation?.shareBasisPoints ?? 0) / 100).toFixed(2)];
        })
      )
    );
  }, [categories, firstMemberId, selected, summary.members]);

  if (!canManage) {
    return (
      <section className="management-callout">
        <Icon name="lock" />
        <div><strong>Owner-managed plan</strong><p>You can view responsibility progress; the household owner manages assignments.</p></div>
      </section>
    );
  }

  async function saveResponsibility(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const monthlyAmountMinor = dollarsToMinorUnits(amount);
    if (!monthlyAmountMinor || !categoryId) {
      setError("Choose a category and enter a monthly amount greater than $0 with no more than two decimals.");
      return;
    }

    const assignment =
      assignmentMode === "ASSIGNED"
        ? { mode: "ASSIGNED" as const, memberId: assignedMemberId }
        : assignmentMode === "EQUAL"
          ? { mode: "EQUAL" as const, memberIds: summary.members.map((member) => member.id) }
          : {
              mode: "PERCENTAGE" as const,
              shares: summary.members.map((member) => ({
                memberId: member.id,
                basisPoints: Math.round(Number(shares[member.id] ?? 0) * 100),
              })),
            };
    const parsed = createHouseholdResponsibilitySchema.safeParse({
      name,
      categoryId,
      monthlyAmountMinor,
      assignment,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the responsibility details.");
      return;
    }

    setIsSaving(true);
    try {
      await onManage({
        path: selected ? `/responsibilities/${encodeURIComponent(selected.id)}` : "/responsibilities",
        method: selected ? "PUT" : "POST",
        body: parsed.data,
      });
      setSuccess(selected ? `${name} was updated.` : `${name} was added to the household plan.`);
      if (!selected) setSelectedId("new");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The responsibility could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteResponsibility() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.name} from the household responsibility plan?`)) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onManage({
        path: `/responsibilities/${encodeURIComponent(selected.id)}`,
        method: "DELETE",
      });
      setSelectedId("new");
      setSuccess(`${selected.name} was removed.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The responsibility could not be removed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel management-panel" aria-labelledby="responsibility-manager-title">
      <div className="panel__header panel__header--split">
        <div>
          <p className="section-kicker">Household owner controls</p>
          <h2 id="responsibility-manager-title">Manage category budgets &amp; responsibilities</h2>
          <p>Create an assignment or choose an existing lane to edit it.</p>
        </div>
        <label className="management-picker">
          <span>Working on</span>
          <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setError(null); setSuccess(null); }}>
            <option value="new">+ New responsibility</option>
            {summary.responsibilities.map((responsibility) => (
              <option value={responsibility.id} key={responsibility.id}>{responsibility.name}</option>
            ))}
          </select>
        </label>
      </div>
      <form className="management-form" onSubmit={saveResponsibility}>
        <label>
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Groceries" required />
        </label>
        <label>
          <span>Transaction category</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="" disabled>Choose a category</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          <span>Monthly amount</span>
          <span className="money-field__control"><i>$</i><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="800.00" required /></span>
        </label>
        <label>
          <span>Assignment</span>
          <select value={assignmentMode} onChange={(event) => setAssignmentMode(event.target.value as ResponsibilityAssignmentMode)}>
            <option value="ASSIGNED">One member</option>
            <option value="EQUAL">Equal split</option>
            <option value="PERCENTAGE">Percentage split</option>
          </select>
        </label>
        {assignmentMode === "ASSIGNED" ? (
          <label>
            <span>Responsible member</span>
            <select value={assignedMemberId} onChange={(event) => setAssignedMemberId(event.target.value)}>
              {summary.members.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}
            </select>
          </label>
        ) : null}
        {assignmentMode === "PERCENTAGE" ? (
          <fieldset className="percentage-fields">
            <legend>Shares must total 100%</legend>
            {summary.members.map((member) => (
              <label key={member.id}>
                <span>{member.displayName}</span>
                <span><input type="number" min="0.01" max="100" step="0.01" value={shares[member.id] ?? ""} onChange={(event) => setShares((current) => ({ ...current, [member.id]: event.target.value }))} /><i>%</i></span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <div className="management-form__actions">
          <button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : selected ? "Save changes" : "Add responsibility"}</button>
          {selected ? <button className="button button--danger" type="button" onClick={() => void deleteResponsibility()} disabled={isSaving}>Delete</button> : null}
        </div>
        <Feedback error={error} success={success} />
      </form>
    </section>
  );
}

type ContributionMode = "EQUAL" | "CUSTOM" | "INCOME_PROPORTIONAL";

export function GoalPlanManager({
  summary,
  onManage,
}: {
  summary: HouseholdSummary;
  onManage: ManageHousehold;
}) {
  const viewer = summary.members.find((member) => member.isCurrentUser);
  const canManage = viewer?.role === "OWNER";
  const [selectedId, setSelectedId] = useState("new");
  const selected = summary.sharedGoals.find((goal) => goal.id === selectedId);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [mode, setMode] = useState<ContributionMode>("EQUAL");
  const [customTargets, setCustomTargets] = useState<Record<string, string>>({});
  const [incomeBases, setIncomeBases] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setName("");
      setTarget("");
      setTargetDate("");
      setMode("EQUAL");
      setCustomTargets(Object.fromEntries(summary.members.map((member) => [member.id, ""])));
      setIncomeBases(Object.fromEntries(summary.members.map((member) => [
        member.id,
        member.incomeBasisMinor === null ? "" : moneyInput(member.incomeBasisMinor),
      ])));
      return;
    }
    setName(selected.name);
    setTarget(moneyInput(selected.targetAmountMinor));
    setTargetDate(selected.targetDate?.slice(0, 10) ?? "");
    setMode(selected.contributionMode);
    setCustomTargets(
      Object.fromEntries(
        summary.members.map((member) => {
          const participant = selected.participants.find((item) => item.memberId === member.id);
          return [member.id, moneyInput(participant?.plannedContributionMinor ?? 0)];
        })
      )
    );
    setIncomeBases(Object.fromEntries(summary.members.map((member) => [
      member.id,
      member.incomeBasisMinor === null ? "" : moneyInput(member.incomeBasisMinor),
    ])));
  }, [selected, summary.members]);

  if (!canManage) return null;

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const targetAmountMinor = dollarsToMinorUnits(target);
    if (!targetAmountMinor) {
      setError("Enter a target greater than $0 with no more than two decimals.");
      return;
    }
    const participants =
      mode === "CUSTOM"
        ? summary.members.map((member) => ({
            memberId: member.id,
            customTargetAmountMinor: dollarsToMinorUnits(customTargets[member.id] ?? "") ?? 0,
          }))
        : summary.members.map((member) => ({ memberId: member.id }));
    const parsedIncomeBases = mode === "INCOME_PROPORTIONAL"
      ? setHouseholdIncomeBasesSchema.safeParse({
          members: summary.members.map((member) => ({
            memberId: member.id,
            incomeBasisMinor: dollarsToMinorUnits(incomeBases[member.id] ?? "") ?? 0,
          })),
        })
      : null;
    if (parsedIncomeBases && !parsedIncomeBases.success) {
      setError("Enter a positive monthly income basis for every household member.");
      return;
    }
    const parsed = createHouseholdGoalSchema.safeParse({
      name,
      targetAmountMinor,
      targetDate: targetDate ? `${targetDate}T12:00:00.000Z` : null,
      icon: selected?.icon ?? "spark",
      contributionMode: mode,
      participants,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the goal plan details.");
      return;
    }

    setIsSaving(true);
    try {
      if (parsedIncomeBases?.success) {
        await onManage({
          path: "/income-bases",
          method: "PATCH",
          body: parsedIncomeBases.data,
        });
      }
      await onManage({
        path: selected ? `/goals/${encodeURIComponent(selected.id)}` : "/goals",
        method: selected ? "PUT" : "POST",
        body: parsed.data,
      });
      setSuccess(selected ? `${name} was updated.` : `${name} is now a shared goal.`);
      if (!selected) setSelectedId("new");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The goal plan could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel management-panel" aria-labelledby="goal-manager-title">
      <div className="panel__header panel__header--split">
        <div>
          <p className="section-kicker">Household owner controls</p>
          <h2 id="goal-manager-title">Design a shared goal</h2>
          <p>Create an equal, custom-dollar, or income-proportional contribution plan.</p>
        </div>
        <label className="management-picker">
          <span>Working on</span>
          <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setError(null); setSuccess(null); }}>
            <option value="new">+ New shared goal</option>
            {summary.sharedGoals.map((goal) => <option value={goal.id} key={goal.id}>{goal.name}</option>)}
          </select>
        </label>
      </div>
      <form className="management-form management-form--goal" onSubmit={saveGoal}>
        <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Universal Orlando" required /></label>
        <label><span>Target amount</span><span className="money-field__control"><i>$</i><input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="decimal" placeholder="8000.00" required /></span></label>
        <label><span>Target date</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
        <label><span>Contribution plan</span><select value={mode} onChange={(event) => setMode(event.target.value as ContributionMode)}><option value="EQUAL">Equal</option><option value="CUSTOM">Custom dollars</option><option value="INCOME_PROPORTIONAL">Income proportional</option></select></label>
        {mode === "CUSTOM" ? (
          <fieldset className="percentage-fields custom-target-fields">
            <legend>Member targets must equal the goal target</legend>
            {summary.members.map((member) => (
              <label key={member.id}><span>{member.displayName}</span><span className="money-field__control"><i>$</i><input value={customTargets[member.id] ?? ""} onChange={(event) => setCustomTargets((current) => ({ ...current, [member.id]: event.target.value }))} inputMode="decimal" placeholder="4000.00" /></span></label>
            ))}
          </fieldset>
        ) : null}
        {mode === "INCOME_PROPORTIONAL" ? (
          <fieldset className="percentage-fields custom-target-fields">
            <legend>Monthly income basis used only to calculate each partner's share</legend>
            {summary.members.map((member) => (
              <label key={member.id}>
                <span>{member.displayName}</span>
                <span className="money-field__control"><i>$</i><input value={incomeBases[member.id] ?? ""} onChange={(event) => setIncomeBases((current) => ({ ...current, [member.id]: event.target.value }))} inputMode="decimal" placeholder="5000.00" /></span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <div className="management-form__actions"><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : selected ? "Save goal plan" : "Create shared goal"}</button></div>
        <Feedback error={error} success={success} />
      </form>
    </section>
  );
}

export function PartnerManager({
  summary,
  onManage,
}: {
  summary: HouseholdSummary;
  onManage: ManageHousehold;
}) {
  const viewer = summary.members.find((member) => member.isCurrentUser);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<HouseholdPartnerInvitationSummary[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingInvitations(true);
    void onManage<HouseholdPartnerInvitationSummary[]>({
      path: "/invitations",
      method: "GET",
    })
      .then((result) => {
        if (active) {
          setInvitations(result);
          setInvitationError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setInvitationError(
            caught instanceof Error ? caught.message : "Partner invitations could not be loaded."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingInvitations(false);
      });
    return () => {
      active = false;
    };
  }, [onManage]);

  async function linkPartner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = linkHouseholdPartnerSchema.safeParse({
      email,
      ...(displayName.trim() ? { displayName } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid partner email.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await onManage<HouseholdPartnerInviteResult>({
        path: "/partners/link",
        method: "POST",
        body: parsed.data,
      });
      setSuccess(result.message);
      setEmail("");
      setDisplayName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The partner invitation could not be sent.");
    } finally {
      setIsSaving(false);
    }
  }

  async function acceptInvitation(invitation: HouseholdPartnerInvitationSummary) {
    setAcceptingInvitationId(invitation.id);
    setInvitationError(null);
    try {
      await onManage({
        path: "/invitations/accept",
        method: "POST",
        body: { invitationId: invitation.id },
      });
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setSuccess(`You joined ${invitation.householdName}.`);
    } catch (caught) {
      setInvitationError(
        caught instanceof Error ? caught.message : "The partner invitation could not be accepted."
      );
    } finally {
      setAcceptingInvitationId(null);
    }
  }

  return (
    <section className="panel management-panel partner-manager" aria-labelledby="partner-manager-title">
      <div className="panel__header panel__header--split">
        <div>
          <p className="section-kicker">Separate logins, one household</p>
          <h2 id="partner-manager-title">Household members</h2>
          <p>Invite an existing Worthlane login. The invited partner must explicitly accept.</p>
        </div>
        <div className="household-member-stack" aria-label={`${summary.members.length} household members`}>
          {summary.members.map((member) => <span title={member.displayName} key={member.id}>{member.displayName.slice(0, 1)}</span>)}
        </div>
      </div>
      <div className="household-member-list">
        {summary.members.map((member) => (
          <article key={member.id}><span>{member.displayName.slice(0, 1)}</span><div><strong>{member.displayName}{member.isCurrentUser ? " · You" : ""}</strong><small>{titleCase(member.role)} · Separate Worthlane login</small></div></article>
        ))}
      </div>
      {isLoadingInvitations || invitations.length || invitationError ? (
        <div className="partner-invitations" aria-live="polite">
          <div>
            <strong>Invitations for your login</strong>
            <small>{isLoadingInvitations ? "Checking for invitations..." : "Only you can accept an invitation addressed to your login."}</small>
          </div>
          {invitations.map((invitation) => (
            <article key={invitation.id}>
              <span>
                <strong>{invitation.householdName}</strong>
                <small>Invited by {invitation.invitedByName} - expires {formatShortDate(invitation.expiresAt)}</small>
              </span>
              <button
                className="button button--primary"
                type="button"
                disabled={acceptingInvitationId === invitation.id}
                onClick={() => void acceptInvitation(invitation)}
              >
                {acceptingInvitationId === invitation.id ? "Accepting..." : "Accept invitation"}
              </button>
            </article>
          ))}
          {invitationError ? <span className="form-feedback--error">{invitationError}</span> : null}
        </div>
      ) : null}
      {viewer?.role === "OWNER" ? (
        <form className="partner-link-form" onSubmit={linkPartner}>
          <label><span>Partner email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="partner@example.com" required /></label>
          <label><span>Display name <small>optional</small></span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder="Rachel" /></label>
          <button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send invitation"}</button>
          <Feedback error={error} success={success} />
        </form>
      ) : (
        <div className="management-callout"><Icon name="lock" /><div><strong>Owner-managed household</strong><p>The household owner can invite another existing login.</p></div></div>
      )}
    </section>
  );
}

export function AccountVisibilityControl({
  account,
  onManage,
}: {
  account: HouseholdSummary["finances"]["detailedAccounts"][number];
  onManage: ManageHousehold;
}) {
  const [visibility, setVisibility] = useState(account.visibility);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setVisibility(account.visibility), [account.visibility]);

  async function changeVisibility(nextVisibility: typeof visibility) {
    const parsed = setHouseholdAccountVisibilitySchema.safeParse({ visibility: nextVisibility });
    if (!parsed.success) return;
    const previous = visibility;
    setVisibility(nextVisibility);
    setIsSaving(true);
    setMessage("");
    try {
      await onManage({
        path: `/accounts/${encodeURIComponent(account.id)}/visibility`,
        method: "PATCH",
        body: parsed.data,
      });
      setMessage("Saved");
    } catch (caught) {
      setVisibility(previous);
      setMessage(caught instanceof Error ? caught.message : "Not saved");
    } finally {
      setIsSaving(false);
    }
  }

  if (!account.isOwner) {
    return (
      <span className={`access-badge access-badge--${account.visibility.toLowerCase()}`}>
        <Icon name={account.visibility === "SHARED" ? "shield" : "lock"} />
        {account.visibility === "SHARED" ? "Shared detail" : "Personal"}
      </span>
    );
  }

  return (
    <span className="visibility-control">
      <select
        value={visibility}
        disabled={isSaving}
        onChange={(event) => void changeVisibility(event.target.value as typeof visibility)}
        aria-label={`Partner visibility for ${account.name}`}
      >
        <option value="PERSONAL">Personal</option>
        <option value="SUMMARY">Summary only</option>
        <option value="SHARED">Shared detail</option>
      </select>
      <small aria-live="polite">{isSaving ? "Saving…" : message}</small>
    </span>
  );
}

export function AccountDetailPanel({
  accountId,
  accountName,
  currency,
  onManage,
  onClose,
}: {
  accountId: string;
  accountName: string;
  currency: string;
  onManage: ManageHousehold;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<HouseholdAccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    void onManage<HouseholdAccountDetail>({
      path: `/accounts/${encodeURIComponent(accountId)}`,
      method: "GET",
    }).then((result) => {
      if (active) setDetail(result);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Account detail is unavailable.");
    });
    return () => { active = false; };
  }, [accountId, onManage]);

  const categories = useMemo(() => {
    const names = new Set(detail?.transactions.map((transaction) => transaction.category?.name ?? "Uncategorized") ?? []);
    return [...names].sort();
  }, [detail]);
  const transactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (detail?.transactions ?? []).filter((transaction) => {
      const categoryName = transaction.category?.name ?? "Uncategorized";
      return (
        (!normalized || transaction.merchantName?.toLowerCase().includes(normalized) || transaction.note?.toLowerCase().includes(normalized) || categoryName.toLowerCase().includes(normalized)) &&
        (category === "all" || categoryName === category)
      );
    });
  }, [category, detail, query]);

  return (
    <section className="account-detail-panel" aria-labelledby="account-detail-title">
      <div className="account-detail-panel__header">
        <div><p className="section-kicker">Permitted account detail</p><h3 id="account-detail-title">{detail?.name ?? accountName}</h3><p>{detail ? `${detail.ownerName} · ${titleCase(detail.visibility)} access` : "Loading account activity…"}</p></div>
        <button type="button" onClick={onClose} aria-label="Close account detail">×</button>
      </div>
      {error ? <div className="filtered-empty form-feedback--error">{error}</div> : null}
      {detail ? (
        <>
          <div className="account-detail-summary"><strong>{formatCurrencyMinor(detail.currentBalanceMinor, currency)}</strong><span>{detail.transactions.length} recent transaction{detail.transactions.length === 1 ? "" : "s"}</span></div>
          <div className="account-detail-filters">
            <label><span>Search activity</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Merchant, note, category…" /></label>
            <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
          </div>
          <div className="account-detail-transactions">
            {transactions.length ? transactions.map((transaction) => (
              <article key={transaction.id}><span><strong>{transaction.merchantName ?? transaction.note ?? "Transaction"}</strong><small>{formatShortDate(transaction.date)} · {transaction.category?.name ?? "Uncategorized"}</small></span><b>{formatCurrencyMinor(transaction.amountMinor, currency)}</b></article>
            )) : <div className="filtered-empty">No account activity matches these filters.</div>}
          </div>
        </>
      ) : null}
    </section>
  );
}

export const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "CREDIT",
  "INVESTMENT",
  "LOAN",
  "OTHER",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type AccountSource = "PLAID" | "MANUAL";
export type PlaidItemStatus = "HEALTHY" | "NEEDS_RELINK" | "ERROR" | "PENDING_EXPIRATION";

export interface AccountSummary {
  id: string;
  name: string;
  institutionName: string | null;
  type: AccountType;
  source: AccountSource;
  currentBalance: number;
  lastSyncedAt: string | null;
  plaidItemId: string | null;
  plaidItemStatus: PlaidItemStatus | null;
  plaidNeedsRelink: boolean;
  plaidErrorMessage: string | null;
}

export interface PlaidItemSummary {
  id: string;
  itemId: string;
  institution: string | null;
  status: PlaidItemStatus;
  needsRelink: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  lastSyncAt: string | null;
  lastWebhookAt: string | null;
  accountCount: number;
}

export interface AccountsResponse {
  accounts: AccountSummary[];
  plaidItems: PlaidItemSummary[];
}

export interface CategorySummary {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface TransactionSummary {
  spendingTreatment?: "AUTO" | "REFUND" | "EXCLUDED";
  id: string;
  amount: number;
  date: string;
  merchantName: string | null;
  note: string | null;
  isImpulse: boolean;
  isManual: boolean;
  account: {
    id: string;
    name: string;
    source: AccountSource;
  };
  category: CategorySummary | null;
}

export interface TransactionsResponse {
  transactions: TransactionSummary[];
  total: number;
  page: number;
  limit: number;
}

export function formatCurrency(amount: number, options?: { compact?: boolean }) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: options?.compact ? 0 : 2,
  }).format(amount);
}

export function formatSignedTransactionAmount(amount: number) {
  const isExpense = amount > 0;
  return `${isExpense ? "-" : "+"}${formatCurrency(Math.abs(amount))}`;
}

export function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeSyncTime(dateStr: string | null) {
  if (!dateStr) return "Never synced";

  const deltaMs = Date.now() - new Date(dateStr).getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60_000));

  if (deltaMinutes < 60) return `Synced ${deltaMinutes}m ago`;

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `Synced ${deltaHours}h ago`;

  const deltaDays = Math.round(deltaHours / 24);
  return `Synced ${deltaDays}d ago`;
}

export function toIsoDateInput(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

export function toTransactionIsoDate(dateInput: string) {
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00.000Z`).toISOString();
  }
  return new Date(trimmed).toISOString();
}

export function getPlaidStatusTone(status: PlaidItemStatus) {
  switch (status) {
    case "HEALTHY":
      return { label: "Healthy", color: "success" as const };
    case "PENDING_EXPIRATION":
      return { label: "Expiring soon", color: "warning" as const };
    case "NEEDS_RELINK":
      return { label: "Needs relink", color: "danger" as const };
    case "ERROR":
    default:
      return { label: "Attention needed", color: "danger" as const };
  }
}

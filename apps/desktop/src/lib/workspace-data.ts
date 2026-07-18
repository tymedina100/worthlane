export type PersonalBudget = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  amount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  period: "MONTHLY" | "WEEKLY";
  rollover: boolean;
  history: Array<{ startDate: string; spent: number; amount: number }>;
};

export type PersonalCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
};

export type PersonalTransaction = {
  id: string;
  amount: number;
  date: string;
  merchantName: string | null;
  note: string | null;
  isImpulse: boolean;
  isManual: boolean;
  account: { id: string; name: string; source: string };
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
};

export type PersonalGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  type: string;
  icon: string | null;
  linkedBudgetCategoryId: string | null;
  percentComplete: number;
  projectedCompletionDate: string | null;
  monthlyNeeded: number | null;
};

export type PersonalAccount = {
  id: string;
  name: string;
  institutionName: string | null;
  type: string;
  source: string;
  currentBalance: number;
  lastSyncedAt: string | null;
  plaidItemId: string | null;
  plaidItemStatus: string | null;
  plaidNeedsRelink: boolean;
  plaidErrorMessage: string | null;
};

export type PlaidConnection = {
  id: string;
  itemId: string;
  institution: string | null;
  status: string;
  needsRelink: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  lastSyncAt: string | null;
  lastWebhookAt: string | null;
  accountCount: number;
};

export type PersonalWorkspaceData = {
  budgets: PersonalBudget[];
  categories: PersonalCategory[];
  transactions: PersonalTransaction[];
  transactionTotal: number;
  goals: PersonalGoal[];
  accounts: PersonalAccount[];
  plaidItems: PlaidConnection[];
};

export type ManagePersonal = <T>(input: {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
}) => Promise<T>;

export type ManagePlaid = <T>(input: {
  path: string;
  body?: unknown;
}) => Promise<T>;

export const emptyPersonalWorkspaceData: PersonalWorkspaceData = {
  budgets: [],
  categories: [],
  transactions: [],
  transactionTotal: 0,
  goals: [],
  accounts: [],
  plaidItems: [],
};

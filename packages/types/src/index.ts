// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat: number;
  exp: number;
}

// API response shapes
export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Category
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
  userId?: string | null;
}

export type AccountSource = "PLAID" | "MANUAL";
export type PlaidItemStatus = "HEALTHY" | "NEEDS_RELINK" | "ERROR" | "PENDING_EXPIRATION";

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

export interface AccountDetail {
  id: string;
  name: string;
  institutionName: string | null;
  type: string;
  source: AccountSource;
  currentBalance: number;
  lastSyncedAt: string | null;
  plaidItemId: string | null;
  plaidItemStatus: PlaidItemStatus | null;
  plaidNeedsRelink: boolean;
  plaidErrorMessage: string | null;
}

export interface AccountsResponse {
  accounts: AccountDetail[];
  plaidItems: PlaidItemSummary[];
}

// Budget
export interface BudgetWithSpent {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  period: "MONTHLY" | "WEEKLY";
  history: { startDate: string; spent: number; amount: number }[];
}

// Goal progress
export interface GoalWithProgress {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  type: string;
  icon: string | null;
  percentComplete: number;
  projectedCompletionDate: string | null;
  monthlyNeeded: number | null;
}

// Goal contribution
export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

// Streak
export interface StreakStatus {
  type: string;
  currentCount: number;
  longestCount: number;
  lastActivityAt: string | null;
  isActiveToday: boolean;
}

// Net worth history point
export interface NetWorthPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

// GET /api/accounts/net-worth
export interface NetWorthResponse {
  current: number;
  change: number;
  changePercent: number;
  range: number;
  history: NetWorthPoint[];
  breakdown: { assets: number; liabilities: number };
}

// Simplified account shape used only by the dashboard summary
export interface AccountSummary {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT" | "INVESTMENT" | "LOAN" | "OTHER";
  currentBalance: number;
  institutionName: string | null;
}

// Dashboard summary
export interface DashboardSummary {
  netWorth: number;
  monthlyIncome: number;
  monthlySpending: number;
  accounts: AccountSummary[];
  netWorthHistory: NetWorthPoint[];
  budgets: BudgetWithSpent[];
  goals: GoalWithProgress[];
  streaks: StreakStatus[];
  topCategories: { name: string; amount: number; color: string }[];
  impulse: { count: number; total: number; previousWeekTotal: number };
}

// Plaid link
export interface PlaidLinkTokenResponse {
  linkToken: string;
}

export interface PlaidLinkTokenRequest {
  platform: "ios" | "android";
  mode: "create" | "update";
  plaidItemId?: string;
}

export interface PlaidExchangeRequest {
  publicToken: string;
  institutionName: string;
}

// Recurring transactions (subscriptions & bills)
export type RecurringFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface RecurringItem {
  id: string;
  displayName: string;
  categoryId: string | null;
  accountId: string | null;
  averageAmount: number;
  frequency: RecurringFrequency;
  lastSeenDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  occurrenceCount: number;
  isMuted: boolean;
}

export interface RecurringResponse {
  items: RecurringItem[];
  monthlyTotal: number;
}

// Reports
export interface CashFlowMonth {
  month: string; // YYYY-MM
  income: number;
  spending: number;
  net: number;
}

export interface CashFlowResponse {
  months: CashFlowMonth[];
}

export interface SpendingCategoryBreakdown {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percent: number;
  previousMonthAmount: number;
}

export interface SpendingReport {
  month: string; // YYYY-MM
  totalSpending: number;
  income: number;
  savingsRate: number | null;
  breakdown: SpendingCategoryBreakdown[];
}

// Nudge
export interface NudgeMessage {
  id: string;
  type: string;
  message: string;
  sentAt: string;
}

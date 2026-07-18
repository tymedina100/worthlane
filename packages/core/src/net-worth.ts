import { assertMinorUnits } from "./money";

export interface AccountBalance {
  type: string;
  currentBalanceMinor: number;
}

function isLiability(type: string): boolean {
  return type === "CREDIT" || type === "LOAN";
}

export function computeNetWorthMinor(accounts: AccountBalance[]): number {
  const total = accounts.reduce((sum, account) => {
    assertMinorUnits(account.currentBalanceMinor, "account balance");
    return sum + (isLiability(account.type) ? -account.currentBalanceMinor : account.currentBalanceMinor);
  }, 0);
  assertMinorUnits(total, "net worth");
  return total;
}

export function computeNetWorthBreakdownMinor(accounts: AccountBalance[]): {
  assetsMinor: number;
  liabilitiesMinor: number;
} {
  let assetsMinor = 0;
  let liabilitiesMinor = 0;

  for (const account of accounts) {
    assertMinorUnits(account.currentBalanceMinor, "account balance");
    if (isLiability(account.type)) liabilitiesMinor += account.currentBalanceMinor;
    else assetsMinor += account.currentBalanceMinor;
  }

  assertMinorUnits(assetsMinor, "asset total");
  assertMinorUnits(liabilitiesMinor, "liability total");
  return { assetsMinor, liabilitiesMinor };
}

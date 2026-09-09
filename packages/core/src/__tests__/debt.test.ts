import { expect, it } from "vitest";
import { estimateDebtPayoff, type DebtInput } from "../debt";
const debt: DebtInput = { id: "a", balanceMinor: 10_000, minimumPaymentMinor: 1_000, aprBasisPoints: 0 };
const run = (debts: DebtInput[], monthlyPaymentMinor: number, strategy: "AVALANCHE" | "SNOWBALL" = "AVALANCHE", maxMonths = 600) => estimateDebtPayoff({ debts, monthlyPaymentMinor, strategy, startMonth: "2026-01", maxMonths });

it("pays zero APR debt exactly with a capped final payment and explicit month", () => {
  const result = run([debt], 3_000);
  expect(result.status).toBe("PAID_OFF");
  expect(result.payoffMonth).toBe("2026-04");
  expect(result.totalInterestMinor).toBe(0);
  expect(result.totalPaidMinor).toBe(10_000);
  expect(result.schedule.map(row => row.paymentMinor)).toEqual([3000, 3000, 3000, 1000]);
  expect(debt.balanceMinor).toBe(10_000);
});
it("pays every minimum before extra and rolls unused payment into the next debt", () => {
  const debts = [debt, { ...debt, id: "b", balanceMinor: 20_000, aprBasisPoints: 2400 }];
  const avalanche = run(debts, 12_000);
  const snowball = run(debts, 12_000, "SNOWBALL");
  expect(avalanche.schedule[0]!.debts.map(row => row.paymentMinor)).toEqual([1000, 11000]);
  expect(snowball.schedule[0]!.debts.map(row => row.paymentMinor)).toEqual([10000, 2000]);
  expect(avalanche.totalInterestMinor).toBeLessThan(snowball.totalInterestMinor);
  for (const result of [avalanche, snowball]) {
    expect(result.totalPaidMinor).toBe(30_000 + result.totalInterestMinor);
    expect(result.schedule.every(row => row.paymentMinor <= 12000 && row.remainingMinor >= 0)).toBe(true);
  }
});
it("rounds half-cent monthly interest upward", () => {
  expect(run([{ ...debt, balanceMinor: 50, minimumPaymentMinor: 0, aprBasisPoints: 1200 }], 100).totalInterestMinor).toBe(1);
});
it("prorates promo expiry by calendar days and changes priority", () => {
  const promo = { ...debt, balanceMinor: 31_000, aprBasisPoints: 2400, promotion: { aprBasisPoints: 0, expiresOn: "2026-01-16" } };
  const result = run([promo], 1000, "AVALANCHE", 2);
  expect(result.schedule[0]!.interestMinor).toBe(320); // 16/31 of 2% on 31000
  expect(result.schedule[1]!.interestMinor).toBe(606); // ordinary 2% on 30320
  const endOfPromo = { ...promo, promotion: { aprBasisPoints: 0, expiresOn: "2026-02-01" } };
  expect(run([endOfPromo], 1000, "AVALANCHE", 1).totalInterestMinor).toBe(0);
});
it("reports minimum shortfall without inventing an affordable schedule", () => {
  const result = run([debt], 999);
  expect(result).toMatchObject({ status: "INSUFFICIENT_PAYMENT", shortfallMinor: 1, payoffMonth: null, schedule: [] });
});
it("reorders avalanche after a promotion ends and resolves ties by ID", () => {
  const a = { ...debt, balanceMinor: 100_000, aprBasisPoints: 2400, promotion: { aprBasisPoints: 0, expiresOn: "2026-02-01" } };
  const b = { ...debt, id: "b", balanceMinor: 100_000, aprBasisPoints: 1200 };
  const rows = run([a, b], 5000, "AVALANCHE", 2).schedule;
  expect(rows[0]!.debts.map(row => row.paymentMinor)).toEqual([1000, 4000]);
  expect(rows[1]!.debts.map(row => row.paymentMinor)).toEqual([4000, 1000]);
  const tie = run([{ ...debt, id: "b" }, debt], 3000).schedule[0]!.debts;
  expect(tie.find(row => row.id === "a")!.paymentMinor).toBe(2000);
});
it("does not invent payoff dates for non-amortizing or zero-payment plans", () => {
  const result = run([{ ...debt, aprBasisPoints: 1200, minimumPaymentMinor: 100 }], 100, "AVALANCHE", 12);
  expect(result.status).toBe("HORIZON_REACHED");
  expect(result.payoffMonth).toBeNull();
  expect(result.schedule[11]!.remainingMinor).toBe(10000);
  expect(result.warnings).toContain("Some months do not reduce total principal.");
  expect(run([{ ...debt, minimumPaymentMinor: 0 }], 0, "SNOWBALL", 1).status).toBe("HORIZON_REACHED");
});
it("rejects unsafe cents, duplicate IDs, invalid dates and invalid rates", () => {
  for (const entry of [{ ...debt, balanceMinor: 1.5 }, { ...debt, aprBasisPoints: -1 }, { ...debt, promotion: { aprBasisPoints: 0, expiresOn: "2026-02-30" } }]) expect(() => run([entry], 1000)).toThrow();
  expect(() => run([debt, debt], 1000)).toThrow();
  expect(() => run([debt], Number.MAX_SAFE_INTEGER + 1)).toThrow();
});

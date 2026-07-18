export function assertMinorUnits(value: number, label = "amount"): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer expressed in minor units`);
  }
}

export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error("amount must be finite");
  }

  const minor = Math.round(amount * 100);
  assertMinorUnits(minor);
  return minor;
}

export function fromMinorUnits(amountMinor: number): number {
  assertMinorUnits(amountMinor);
  return amountMinor / 100;
}

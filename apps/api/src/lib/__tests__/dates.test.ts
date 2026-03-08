import { describe, it, expect } from "vitest";
import { startOfMonth, endOfMonth, startOfWeek, addMonths, monthsBetween } from "../dates";

describe("startOfMonth", () => {
  it("returns midnight on the 1st of the given month", () => {
    const result = startOfMonth(new Date(2024, 2, 15, 14, 30)); // March 15
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it("handles January (month 0)", () => {
    const result = startOfMonth(new Date(2024, 0, 20));
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });
});

describe("endOfMonth", () => {
  it("returns last millisecond of the last day of the month", () => {
    const result = endOfMonth(new Date(2024, 2, 5)); // March
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(31);
    expect(result.getHours()).toBe(23);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it("correctly handles February in a leap year", () => {
    const result = endOfMonth(new Date(2024, 1, 1)); // Feb 2024 (leap)
    expect(result.getDate()).toBe(29);
  });

  it("correctly handles February in a non-leap year", () => {
    const result = endOfMonth(new Date(2023, 1, 1)); // Feb 2023
    expect(result.getDate()).toBe(28);
  });
});

describe("startOfWeek", () => {
  it("returns start of the week (Sunday) at midnight", () => {
    // Wednesday March 13, 2024
    const result = startOfWeek(new Date(2024, 2, 13, 12, 0, 0));
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it("returns same day when input is Sunday", () => {
    const sunday = new Date(2024, 2, 10); // March 10, 2024 is a Sunday
    const result = startOfWeek(sunday);
    expect(result.getDate()).toBe(10);
    expect(result.getDay()).toBe(0);
  });
});

describe("addMonths", () => {
  it("adds months within the same year", () => {
    const result = addMonths(new Date(2024, 0, 15), 3); // Jan + 3 = Apr
    expect(result.getMonth()).toBe(3);
    expect(result.getFullYear()).toBe(2024);
  });

  it("handles year rollover", () => {
    const result = addMonths(new Date(2024, 10, 15), 3); // Nov + 3 = Feb next year
    expect(result.getMonth()).toBe(1);
    expect(result.getFullYear()).toBe(2025);
  });

  it("handles adding 0 months", () => {
    const date = new Date(2024, 5, 15);
    const result = addMonths(date, 0);
    expect(result.getMonth()).toBe(5);
    expect(result.getFullYear()).toBe(2024);
  });
});

describe("monthsBetween", () => {
  it("returns 0 for same month and year", () => {
    const from = new Date(2024, 2, 1);
    const to = new Date(2024, 2, 28);
    expect(monthsBetween(from, to)).toBe(0);
  });

  it("returns correct count for months in the same year", () => {
    // Jan (0) → Jun (5) = 5 months apart
    expect(monthsBetween(new Date(2024, 0, 1), new Date(2024, 5, 1))).toBe(5);
  });

  it("handles year boundaries", () => {
    expect(monthsBetween(new Date(2023, 9, 1), new Date(2024, 1, 1))).toBe(4);
  });

  it("returns negative for past dates", () => {
    expect(monthsBetween(new Date(2024, 5, 1), new Date(2024, 2, 1))).toBe(-3);
  });
});

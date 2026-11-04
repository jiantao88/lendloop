import type { Category, Condition, LoanStatus } from "./types";
import { isCategory, isCondition } from "./types";

export type ListingInput = {
  name: string;
  category: Category;
  condition: Condition;
  description: string;
};

export type LoanWindow = {
  id?: string;
  status: LoanStatus;
  startDate: string;
  endDate: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateListing(
  input: {
    name: string;
    category: string;
    condition: string;
    description: string;
  },
): { ok: true; value: ListingInput } | { ok: false; reason: string } {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, reason: "Name must be 2–80 characters" };
  }
  if (description.length < 1 || description.length > 500) {
    return { ok: false, reason: "Description must be 1–500 characters" };
  }
  if (!isCategory(input.category)) return { ok: false, reason: "Unknown category" };
  if (!isCondition(input.condition)) return { ok: false, reason: "Unknown condition" };
  return {
    ok: true,
    value: {
      name,
      category: input.category,
      condition: input.condition,
      description,
    },
  };
}

export function validateDateRange(
  startDate: string,
  endDate: string,
): { ok: true } | { ok: false; reason: string } {
  if (!DATE.test(startDate) || !DATE.test(endDate)) {
    return { ok: false, reason: "Dates must be YYYY-MM-DD" };
  }
  if (endDate < startDate) {
    return { ok: false, reason: "End date is before the start date" };
  }
  return { ok: true };
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function hasApprovedOverlap(
  existing: LoanWindow[],
  startDate: string,
  endDate: string,
  ignoreId?: string,
): boolean {
  return existing.some(
    (loan) =>
      loan.status === "approved" &&
      loan.id !== ignoreId &&
      rangesOverlap(loan.startDate, loan.endDate, startDate, endDate),
  );
}

export type Availability = "available" | "requested" | "reserved" | "on_loan" | "overdue";

export function availabilityOf(loans: LoanWindow[], today: string): Availability {
  if (loans.some((loan) => loan.status === "approved" && loan.endDate < today)) {
    return "overdue";
  }
  if (
    loans.some(
      (loan) =>
        loan.status === "approved" &&
        loan.startDate <= today &&
        loan.endDate >= today,
    )
  ) {
    return "on_loan";
  }
  if (loans.some((loan) => loan.status === "approved" && loan.startDate > today)) {
    return "reserved";
  }
  if (loans.some((loan) => loan.status === "pending")) return "requested";
  return "available";
}

export function isPubliclyAvailable(loans: LoanWindow[], today: string): boolean {
  const availability = availabilityOf(loans, today);
  return availability === "available" || availability === "requested";
}

export function isOverdue(loan: LoanWindow, asOf: string): boolean {
  return loan.status === "approved" && loan.endDate < asOf;
}

export function todayUtc(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function reminderKey(loanId: string, asOf: string): string {
  return `overdue:${loanId}:${asOf}`;
}

export function alreadyRecorded(existingKeys: readonly string[], key: string): boolean {
  return existingKeys.includes(key);
}

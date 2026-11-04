export const CATEGORIES = [
  "power_tools",
  "garden",
  "kitchen",
  "camping",
  "other",
] as const;

export const CONDITIONS = ["excellent", "good", "fair", "worn"] as const;

export const LOAN_STATUSES = [
  "pending",
  "approved",
  "declined",
  "returned",
  "cancelled",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type LoanStatus = (typeof LOAN_STATUSES)[number];
export type Role = "admin" | "user";
export type Party = "borrower" | "lender";

export const CATEGORY_LABELS: Record<Category, string> = {
  power_tools: "Power tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  other: "Other",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isCondition(value: string): value is Condition {
  return (CONDITIONS as readonly string[]).includes(value);
}

export function isLoanStatus(value: string): value is LoanStatus {
  return (LOAN_STATUSES as readonly string[]).includes(value);
}

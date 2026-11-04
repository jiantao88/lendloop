import type { Category, LoanStatus, Party } from "./types";

export const NOTIFICATION_FIELDS = [
  "event",
  "loanId",
  "status",
  "toolName",
  "category",
  "startDate",
  "endDate",
  "recipientRole",
  "recipientEmail",
] as const;

export type NotificationPayload = {
  event: "borrow_request";
  loanId: string;
  status: LoanStatus;
  toolName: string;
  category: Category;
  startDate: string;
  endDate: string;
  recipientRole: Party;
  recipientEmail: string;
};

export function counterparty(actor: Party): Party {
  return actor === "borrower" ? "lender" : "borrower";
}

export function requestNotifyKey(
  loanId: string,
  status: LoanStatus,
  recipientRole: Party,
): string {
  return `notify:${loanId}:${status}:${recipientRole}`;
}

export function notificationPayload(input: NotificationPayload): NotificationPayload {
  const payload: NotificationPayload = {
    event: "borrow_request",
    loanId: input.loanId,
    status: input.status,
    toolName: input.toolName,
    category: input.category,
    startDate: input.startDate,
    endDate: input.endDate,
    recipientRole: input.recipientRole,
    recipientEmail: input.recipientEmail,
  };
  return payload;
}

export function sanitizeWorkflowSummary(input: string): string {
  const cleaned = input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  return cleaned || "Workflow failed";
}

export function formatAgo(createdAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - createdAt) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function activityLine(summary: string, createdAt: number, now: number): string {
  return `${summary} ${formatAgo(createdAt, now)}`;
}

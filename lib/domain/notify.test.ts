import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_FIELDS,
  activityLine,
  counterparty,
  notificationPayload,
  requestNotifyKey,
  sanitizeWorkflowSummary,
} from "./notify";

describe("notifications", () => {
  it("keeps the webhook payload to the fields the workflow needs", () => {
    const payload = notificationPayload({
      event: "borrow_request",
      loanId: "loan1",
      status: "pending",
      toolName: "Hedge trimmer",
      category: "garden",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      recipientRole: "lender",
      recipientEmail: "lender@example.com",
    });
    expect(Object.keys(payload).sort()).toEqual([...NOTIFICATION_FIELDS].sort());
    expect(JSON.stringify(payload)).not.toContain("description");
    expect(JSON.stringify(payload)).not.toContain("clerk");
  });

  it("notifies the other party and sanitizes error text", () => {
    expect(counterparty("borrower")).toBe("lender");
    expect(requestNotifyKey("loan1", "approved", "borrower")).toBe(
      "notify:loan1:approved:borrower",
    );
    expect(
      sanitizeWorkflowSummary("failed for ada@example.com\n\nstack"),
    ).toBe("failed for [redacted] stack");
  });

  it("formats activity the way the loan row reads it", () => {
    const now = Date.parse("2026-05-04T12:00:00Z");
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
    expect(activityLine("Reminder sent", twoDaysAgo, now)).toBe("Reminder sent 2 days ago");
  });
});

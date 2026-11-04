import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { canonicalJson, isRetryableStatus, signPayload } from "../lib/domain/hmac";
import { counterparty, notificationPayload, requestNotifyKey } from "../lib/domain/notify";

const MAX_ATTEMPTS = 3;

export const dispatch = internalAction({
  args: {
    loanId: v.id("loans"),
    actorRole: v.union(v.literal("borrower"), v.literal("lender")),
  },
  handler: async (ctx, args) => {
    const facts = await ctx.runQuery(internal.loans.notificationFacts, {
      loanId: args.loanId,
    });
    if (!facts) return;
    const recipientRole = counterparty(args.actorRole);
    const recipientEmail =
      recipientRole === "lender" ? facts.lenderEmail : facts.borrowerEmail;
    const key = requestNotifyKey(facts.loanId, facts.status, recipientRole);
    if (!recipientEmail) {
      await ctx.runMutation(internal.automation.record, {
        loanId: args.loanId,
        kind: "workflow_error",
        idempotencyKey: `notify-missing-email:${key}`,
        summary: "Request notification was not sent because the recipient has no email",
      });
      return;
    }
    const url = process.env.N8N_REQUEST_WEBHOOK_URL;
    const secret = process.env.LENDLOOP_WEBHOOK_SECRET;
    if (!url || !secret) {
      await ctx.runMutation(internal.automation.record, {
        loanId: args.loanId,
        kind: "workflow_error",
        idempotencyKey: `notify-unconfigured:${key}`,
        summary: "Request notification was not sent because n8n is not configured",
      });
      return;
    }
    const payload = notificationPayload({
      event: "borrow_request",
      loanId: facts.loanId,
      status: facts.status,
      toolName: facts.toolName,
      category: facts.category,
      startDate: facts.startDate,
      endDate: facts.endDate,
      recipientRole,
      recipientEmail,
    });
    try {
      await postSigned(url, secret, payload);
    } catch {
      await ctx.runMutation(internal.automation.record, {
        loanId: args.loanId,
        kind: "workflow_error",
        idempotencyKey: `notify-failed:${key}`,
        summary: "Request notification failed after retries",
      });
      throw new Error("n8n webhook failed");
    }
    await ctx.runMutation(internal.automation.record, {
      loanId: args.loanId,
      kind: "request_notification",
      idempotencyKey: key,
      summary: `Notified ${recipientRole} that the request is ${facts.status}`,
    });
  },
});

async function postSigned(url: string, secret: string, payload: unknown) {
  const body = canonicalJson(payload);
  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const timestamp = Date.now().toString();
    const signature = await signPayload(secret, timestamp, body);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lendloop-timestamp": timestamp,
          "x-lendloop-signature": signature,
        },
        body,
      });
      if (response.ok) return;
      lastStatus = response.status;
      if (!isRetryableStatus(response.status)) break;
    } catch {
      lastStatus = 0;
    }
  }
  throw new Error(`n8n webhook failed (${lastStatus || "network"})`);
}

import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canonicalJson, verifySignature } from "../lib/domain/hmac";
import { sanitizeWorkflowSummary } from "../lib/domain/notify";

const http = httpRouter();

http.route({
  path: "/n8n/overdue",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const parsed = await readSigned(request);
    if (!parsed.ok) return json({ error: parsed.reason }, parsed.status);
    const asOf = parsed.value.asOf;
    if (typeof asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
      return json({ error: "asOf must be YYYY-MM-DD" }, 400);
    }
    const loans = await ctx.runQuery(internal.loans.overdue, { asOf });
    return json({ loans });
  }),
});

http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const parsed = await readSigned(request);
    if (!parsed.ok) return json({ error: parsed.reason }, parsed.status);
    const loanId = parsed.value.loanId;
    const asOf = parsed.value.asOf;
    const idempotencyKey = parsed.value.idempotencyKey;
    if (typeof loanId !== "string" || typeof asOf !== "string" || typeof idempotencyKey !== "string") {
      return json({ error: "loanId, asOf, and idempotencyKey are required" }, 400);
    }
    let target;
    try {
      target = await ctx.runQuery(internal.loans.reminderTarget, {
        loanId: loanId as Id<"loans">,
        asOf,
      });
    } catch {
      return json({ error: "Loan not found" }, 404);
    }
    if (!target || !target.overdue) return json({ error: "Loan is not overdue" }, 409);
    if (idempotencyKey !== target.expectedKey) return json({ error: "Unexpected reminder key" }, 400);
    const result = await ctx.runMutation(internal.automation.record, {
      loanId: loanId as Id<"loans">,
      kind: "overdue_reminder",
      idempotencyKey,
      summary: "Reminder sent",
    });
    return json({ ok: true, recorded: result.recorded });
  }),
});

http.route({
  path: "/n8n/errors",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const parsed = await readSigned(request);
    if (!parsed.ok) return json({ error: parsed.reason }, parsed.status);
    const idempotencyKey = parsed.value.idempotencyKey;
    const summary = parsed.value.summary;
    if (typeof idempotencyKey !== "string" || !/^error:[A-Za-z0-9_.:-]{1,120}$/.test(idempotencyKey)) {
      return json({ error: "idempotencyKey must start with error:" }, 400);
    }
    if (typeof summary !== "string") return json({ error: "summary is required" }, 400);
    const result = await ctx.runMutation(internal.automation.record, {
      kind: "workflow_error",
      idempotencyKey,
      summary: sanitizeWorkflowSummary(summary),
    });
    return json({ ok: true, recorded: result.recorded });
  }),
});

export default http;

async function readSigned(
  request: Request,
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; reason: string; status: number }> {
  const secret = process.env.LENDLOOP_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "Webhook secret is not configured", status: 503 };
  const raw = await request.text();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Invalid JSON", status: 400 };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "JSON object required", status: 400 };
  }
  const verified = await verifySignature({
    secret,
    timestamp: request.headers.get("x-lendloop-timestamp") ?? "",
    signature: request.headers.get("x-lendloop-signature") ?? "",
    body: canonicalJson(value),
    now: Date.now(),
  });
  if (!verified.ok) return { ok: false, reason: verified.reason, status: 401 };
  return { ok: true, value: value as Record<string, unknown> };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { canViewLoan } from "../lib/domain/rbac";
import { actorOf, requireUser } from "./lib/guard";

export const record = internalMutation({
  args: {
    loanId: v.optional(v.id("loans")),
    kind: v.union(
      v.literal("request_notification"),
      v.literal("overdue_reminder"),
      v.literal("workflow_error"),
    ),
    idempotencyKey: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) return { recorded: false as const };
    await ctx.db.insert("automationEvents", {
      loanId: args.loanId,
      kind: args.kind,
      idempotencyKey: args.idempotencyKey,
      summary: args.summary.slice(0, 300),
      createdAt: Date.now(),
    });
    return { recorded: true as const };
  },
});

export const forLoan = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError("Loan not found");
    if (
      !canViewLoan(actorOf(user), {
        lenderId: loan.lenderId,
        borrowerId: loan.borrowerId,
        status: loan.status,
      })
    ) {
      throw new ConvexError("You cannot view this loan");
    }
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", args.loanId))
      .collect();
    return events
      .map((event) => ({
        kind: event.kind,
        summary: event.summary,
        createdAt: event.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const recentErrors = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role !== "admin") throw new ConvexError("Admins only");
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_kind", (q) => q.eq("kind", "workflow_error"))
      .collect();
    return events
      .map((event) => ({ summary: event.summary, createdAt: event.createdAt }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  },
});

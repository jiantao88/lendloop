import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { hasApprovedOverlap, isOverdue, reminderKey, validateDateRange } from "../lib/domain/loans";
import {
  canCancelRequest,
  canDecideRequest,
  canMarkReturned,
  canViewAllLoans,
  canViewLoan,
} from "../lib/domain/rbac";
import type { Party } from "../lib/domain/types";
import type { Doc } from "./_generated/dataModel";
import { actorOf, requireUser } from "./lib/guard";

export const request = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const dates = validateDateRange(args.startDate, args.endDate);
    if (!dates.ok) throw new ConvexError(dates.reason);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removed) throw new ConvexError("That tool is not available");
    if (tool.ownerId === user._id) throw new ConvexError("You cannot borrow your own tool");
    const existing = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", tool._id))
      .collect();
    if (
      hasApprovedOverlap(
        existing.map((loan) => ({ ...loan, id: loan._id })),
        args.startDate,
        args.endDate,
      )
    ) {
      throw new ConvexError("Those dates overlap a loan that is already approved");
    }
    const loanId = await ctx.db.insert("loans", {
      toolId: tool._id,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.notify.dispatch, {
      loanId,
      actorRole: "borrower",
    });
    return loanId;
  },
});

export const decide = mutation({
  args: {
    loanId: v.id("loans"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError("Request not found");
    if (!canDecideRequest(actorOf(user), loan)) {
      throw new ConvexError("Only the lender can approve or decline this request");
    }
    if (args.decision === "approved") {
      const existing = await ctx.db
        .query("loans")
        .withIndex("by_tool", (q) => q.eq("toolId", loan.toolId))
        .collect();
      if (
        hasApprovedOverlap(
          existing.map((entry) => ({ ...entry, id: entry._id })),
          loan.startDate,
          loan.endDate,
          loan._id,
        )
      ) {
        throw new ConvexError("Those dates overlap a loan that is already approved");
      }
    }
    await ctx.db.patch(loan._id, { status: args.decision });
    await ctx.scheduler.runAfter(0, internal.notify.dispatch, {
      loanId: loan._id,
      actorRole: "lender",
    });
  },
});

export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError("Request not found");
    if (!canCancelRequest(actorOf(user), loan)) {
      throw new ConvexError("Only the borrower can cancel a pending request");
    }
    await ctx.db.patch(loan._id, { status: "cancelled" });
    await ctx.scheduler.runAfter(0, internal.notify.dispatch, {
      loanId: loan._id,
      actorRole: "borrower",
    });
  },
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError("Loan not found");
    if (!canMarkReturned(actorOf(user), loan)) {
      throw new ConvexError("Only the borrower or lender can mark this loan returned");
    }
    const actorRole: Party = loan.borrowerId === user._id ? "borrower" : "lender";
    await ctx.db.patch(loan._id, { status: "returned" });
    await ctx.scheduler.runAfter(0, internal.notify.dispatch, {
      loanId: loan._id,
      actorRole,
    });
  },
});

function present(loan: Doc<"loans">, toolName: string, counterpartyName: string) {
  return {
    id: loan._id,
    toolId: loan.toolId,
    toolName,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: loan.status,
    counterpartyName,
  };
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
    const rows = [];
    for (const loan of loans) {
      const tool = await ctx.db.get(loan.toolId);
      const lender = await ctx.db.get(loan.lenderId);
      rows.push(present(loan, tool?.name ?? "Removed tool", lender?.name ?? "Lender"));
    }
    return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
});

export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .collect();
    const rows = [];
    for (const loan of loans) {
      const tool = await ctx.db.get(loan.toolId);
      const borrower = await ctx.db.get(loan.borrowerId);
      rows.push(present(loan, tool?.name ?? "Removed tool", borrower?.name ?? "Borrower"));
    }
    return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
});

export const all = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!canViewAllLoans(actorOf(user))) throw new ConvexError("Admins only");
    const loans = await ctx.db.query("loans").collect();
    const rows = [];
    for (const loan of loans) {
      if (!canViewLoan(actorOf(user), loan)) continue;
      const tool = await ctx.db.get(loan.toolId);
      const borrower = await ctx.db.get(loan.borrowerId);
      const lender = await ctx.db.get(loan.lenderId);
      rows.push({
        ...present(loan, tool?.name ?? "Removed tool", borrower?.name ?? "Borrower"),
        lenderName: lender?.name ?? "Lender",
      });
    }
    return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
});

export const notificationFacts = internalQuery({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan) return null;
    const tool = await ctx.db.get(loan.toolId);
    const borrower = await ctx.db.get(loan.borrowerId);
    const lender = await ctx.db.get(loan.lenderId);
    if (!tool || !borrower || !lender) return null;
    return {
      loanId: loan._id,
      status: loan.status,
      toolName: tool.name,
      category: tool.category,
      startDate: loan.startDate,
      endDate: loan.endDate,
      borrowerEmail: borrower.email,
      lenderEmail: lender.email,
    };
  },
});

export const overdue = internalQuery({
  args: { asOf: v.string() },
  handler: async (ctx, args) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const rows = [];
    for (const loan of loans) {
      if (!isOverdue(loan, args.asOf)) continue;
      const key = reminderKey(loan._id, args.asOf);
      const existing = await ctx.db
        .query("automationEvents")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
        .unique();
      if (existing) continue;
      const tool = await ctx.db.get(loan.toolId);
      const borrower = await ctx.db.get(loan.borrowerId);
      if (!tool || !borrower || !borrower.email) continue;
      rows.push({
        loanId: loan._id,
        toolName: tool.name,
        borrowerEmail: borrower.email,
        endDate: loan.endDate,
        asOf: args.asOf,
        idempotencyKey: key,
      });
    }
    return rows;
  },
});

export const reminderTarget = internalQuery({
  args: { loanId: v.id("loans"), asOf: v.string() },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan) return null;
    return {
      status: loan.status,
      endDate: loan.endDate,
      overdue: isOverdue(loan, args.asOf),
      expectedKey: reminderKey(loan._id, args.asOf),
    };
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const category = v.union(
  v.literal("power_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("other"),
);

const condition = v.union(
  v.literal("excellent"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn"),
);

const loanStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned"),
  v.literal("cancelled"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    trustedLender: v.boolean(),
  }).index("by_clerkId", ["clerkId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
    removed: v.boolean(),
  }).index("by_owner", ["ownerId"]),

  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatus,
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status", ["status"]),

  automationEvents: defineTable({
    loanId: v.optional(v.id("loans")),
    kind: v.union(
      v.literal("request_notification"),
      v.literal("overdue_reminder"),
      v.literal("workflow_error"),
    ),
    idempotencyKey: v.string(),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index("by_loan", ["loanId"])
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_kind", ["kind"]),
});

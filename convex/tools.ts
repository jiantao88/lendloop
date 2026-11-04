import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { availabilityOf, isPubliclyAvailable, todayUtc, validateListing } from "../lib/domain/loans";
import { canEditListing, canRemoveListing } from "../lib/domain/rbac";
import { actorOf, loansForTool, requireUser } from "./lib/guard";

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

export const listAvailablePublic = query({
  args: {},
  returns: v.array(v.object({ name: v.string(), category })),
  handler: async (ctx) => {
    const today = todayUtc();
    const tools = await ctx.db.query("tools").collect();
    const visible = [];
    for (const tool of tools) {
      if (tool.removed) continue;
      const loans = await loansForTool(ctx, tool._id);
      if (!isPubliclyAvailable(loans, today)) continue;
      visible.push({ name: tool.name, category: tool.category });
    }
    return visible.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  },
});

export const list = query({
  args: { category: v.optional(category) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const today = todayUtc();
    const tools = await ctx.db.query("tools").collect();
    const rows = [];
    for (const tool of tools) {
      if (tool.removed) continue;
      if (args.category && tool.category !== args.category) continue;
      const owner = await ctx.db.get(tool.ownerId);
      if (!owner) continue;
      const loans = await loansForTool(ctx, tool._id);
      rows.push({
        id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        availability: availabilityOf(loans, today),
        ownerName: owner.name,
        trustedLender: owner.trustedLender,
        isOwner: tool.ownerId === user._id,
      });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return tools
      .filter((tool) => !tool.removed)
      .map((tool) => ({
        id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category,
    condition,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const parsed = validateListing(args);
    if (!parsed.ok) throw new ConvexError(parsed.reason);
    return ctx.db.insert("tools", {
      ownerId: user._id,
      ...parsed.value,
      removed: false,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removed) throw new ConvexError("Listing not found");
    if (!canEditListing(actorOf(user), tool.ownerId)) {
      throw new ConvexError("You can only edit your own listing");
    }
    const parsed = validateListing(args);
    if (!parsed.ok) throw new ConvexError(parsed.reason);
    await ctx.db.patch(tool._id, parsed.value);
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removed) throw new ConvexError("Listing not found");
    if (!canRemoveListing(actorOf(user), tool.ownerId)) {
      throw new ConvexError("You can only remove your own listing");
    }
    await ctx.db.patch(tool._id, { removed: true });
  },
});

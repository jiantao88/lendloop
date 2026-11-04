import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canMarkTrusted } from "../lib/domain/rbac";
import { actorOf, adminEmails, requireUser } from "./lib/guard";

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Sign in required");
    const email = (identity.email ?? "").trim().toLowerCase();
    const name = (identity.name ?? email ?? "Neighbor").trim() || "Neighbor";
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    const shouldAdmin = adminEmails().includes(email);
    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        role: existing.role === "admin" || shouldAdmin ? "admin" : "user",
      });
      return existing._id;
    }
    return ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      role: shouldAdmin ? "admin" : "user",
      trustedLender: false,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      role: user.role,
      trustedLender: user.trustedLender,
    };
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!canMarkTrusted(actorOf(user))) throw new ConvexError("Admins only");
    const users = await ctx.db.query("users").collect();
    return users
      .map((entry) => ({
        id: entry._id,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        trustedLender: entry.trustedLender,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const setTrusted = mutation({
  args: { userId: v.id("users"), trustedLender: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canMarkTrusted(actorOf(user))) throw new ConvexError("Admins only");
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("Lender not found");
    await ctx.db.patch(target._id, { trustedLender: args.trustedLender });
  },
});

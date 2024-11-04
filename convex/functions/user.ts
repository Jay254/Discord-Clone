import { internalMutation, MutationCtx, query, QueryCtx } from "../_generated/server";
import { v } from "convex/values";

export const get = query({
    handler: async (ctx) => {
        return await getCurrentUser(ctx);
    }
});

export const upsert = internalMutation({
    args: {
        username: v.string(),
        image: v.string(),
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();
        
        if (user) {
            await ctx.db.patch(user._id, {
                username: args.username,
                image: args.image,
            });
        } else {
            await ctx.db.insert("users", {
                username: args.username,
                image: args.image,
                clerkId: args.clerkId,
            });
        }
    }
});

export const remove = internalMutation({
    args: { clerkId: v.string() },
    handler: async (ctx, {clerkId}) => {
        const user = await getUserByClerkId(ctx, clerkId);
        if (user) {
            await ctx.db.delete(user._id);
        }
    }
})

const getCurrentUser = async (ctx: QueryCtx | MutationCtx) => { 
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
        return await getUserByClerkId(ctx, identity.subject);
    }
    else {
        return null;
    }
}

const getUserByClerkId = async (ctx: QueryCtx | MutationCtx, clerkId: string) => {
    return await ctx.db
        .query("users")
        .withIndex("byClerkId", (q) => q.eq("clerkId", clerkId))
        .unique();
};
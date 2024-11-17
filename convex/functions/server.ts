import { v } from "convex/values";
import {
  assertServerMember,
  authenticatedMutation,
  authenticatedQuery,
} from "./helpers";

export const list = authenticatedQuery({
  handler: async (ctx) => {
    const serverMembers = await ctx.db
      .query("serverMembers")
      .withIndex("by_userId", (q) => q.eq("UserId", ctx.user._id))
      .collect();

    const servers = await Promise.all(
      serverMembers.map(async ({ serverId }) => {
        const server = await ctx.db.get(serverId);
        if (!server) {
          throw new Error("Server not found");
        }
        return {
          ...server,
          iconUrl: server.iconId
            ? await ctx.storage.getUrl(server.iconId)
            : null,
        };
      })
    );
    return servers.filter((server) => server !== null);
  },
});

export const get = authenticatedQuery({
  args: {
    id: v.id("servers"),
  },
  handler: async (ctx, { id }) => {
    await assertServerMember(ctx, id);
    return await ctx.db.get(id);
  },
});

export const members = authenticatedQuery({
  args: {
    id: v.id("servers"),
  },
  handler: async (ctx, { id }) => {
    await assertServerMember(ctx, id);
    const serverMembers = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId", (q) => q.eq("serverId", id))
      .collect();
    const users = await Promise.all(
      serverMembers.map(async ({ UserId }) => {
        return await ctx.db.get(UserId);
      })
    );
    return users.filter((user) => user !== null);
  },
});

export const create = authenticatedMutation({
  args: {
    name: v.string(),
    iconId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { name, iconId }) => {
    const serverId = await ctx.db.insert("servers", {
      name,
      ownerId: ctx.user._id,
      iconId,
    });
    const defaultChannelId = await ctx.db.insert("channels", {
      name: "general",
      serverId,
    });
    await ctx.db.patch(serverId, { defaultChannelId });
    await ctx.db.insert("serverMembers", {
      serverId,
      UserId: ctx.user._id,
    });
    return { serverId, defaultChannelId };
  },
});

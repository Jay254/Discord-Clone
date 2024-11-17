import { mutation, query } from "../_generated/server"; //query fetches data
import { v } from "convex/values"; //v is a validator
import {
  assertChannelMember,
  authenticatedMutation,
  authenticatedQuery,
} from "./helpers";
import { internal } from "../_generated/api";

export const list = authenticatedQuery({
  args: {
    dmOrChannelId: v.union(v.id("directMessages"), v.id("channels")), //directMessage must be an id
  },
  handler: async (ctx, { dmOrChannelId }) => {
    await assertChannelMember(ctx, dmOrChannelId); //assert that the user is a member of the dm or channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_dmOrChannelId", (q) =>
        q.eq("dmOrChannelId", dmOrChannelId)
      )
      .collect(); //fetch all messages in our database
    return await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.sender); //get the sender of the message
        const attachment = message.attachment
          ? await ctx.storage.getUrl(message.attachment) //get the attachment of the message if there is one
          : undefined;
        return { ...message, attachment, sender }; //return the message and the sender
      })
    );
  },
});

export const create = authenticatedMutation({
  args: {
    content: v.string(), //content must be a string
    attachment: v.optional(v.id("_storage")), //attachment is optional
    dmOrChannelId: v.union(v.id("directMessages"), v.id("channels")), //directMessage must be an id
  },
  handler: async (ctx, { content, attachment, dmOrChannelId }) => {
    await assertChannelMember(ctx, dmOrChannelId); //assert that the user is a member of the dm or channel
    await ctx.db.insert("messages", {
      content,
      attachment,
      dmOrChannelId,
      sender: ctx.user._id,
    }); //insert the message into the database
    await ctx.scheduler.runAfter(0, internal.functions.typing.remove, {
      dmOrChannelId,
      user: ctx.user._id,
    }); //run the remove function
  },
});

export const remove = authenticatedMutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    const message = await ctx.db.get(id); //get the message
    if (!message) {
      throw new Error("Message not found");
    } else if (message.sender !== ctx.user._id) {
      throw new Error("You are not the sender of this message");
    }
    await ctx.db.delete(id); //delete the message from the database
    if (message.attachment) {
      await ctx.storage.delete(message.attachment); //delete the attachment if there is one
    }
  },
});

import { mutation, query } from "../_generated/server"; //query fetches data
import { v } from "convex/values"; //v is a validator
import { authenticatedMutation, authenticatedQuery } from "./helpers";

export const list = authenticatedQuery({
  args: {
    directMessage: v.id("directMessages"), //directMessage must be an id
  },
  handler: async (ctx, { directMessage }) => {
    const member = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_direct_message_user", (q) =>
        q.eq("directMessage", directMessage).eq("user", ctx.user._id)
      )
      .first();
    if (!member) {
      throw new Error("You are not a member of this direct message thread");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_direct_message", (q) =>
        q.eq("directMessage", directMessage)
      )
      .collect(); //fetch all messages in our database
    return await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.sender); //get the sender of the message
        return { ...message, sender }; //return the message and the sender
      })
    );
  },
});

export const create = authenticatedMutation({
  args: {
    content: v.string(), //content must be a string
    directMessage: v.id("directMessages"), //directMessage must be an id
  },
    handler: async (ctx, { content, directMessage }) => {
      const member = await ctx.db
        .query("directMessageMembers")
        .withIndex("by_direct_message_user", (q) =>
          q.eq("directMessage", directMessage).eq("user", ctx.user._id)
        )
        .first();
      if (!member) {
        throw new Error("You are not a member of this direct message thread");
      }
      await ctx.db.insert("messages", {
          content,
          directMessage,
          sender: ctx.user._id,
      }); //insert the message into the database
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
        }
        else if (message.sender !== ctx.user._id) { 
            throw new Error("You are not the sender of this message");
        }
        await ctx.db.delete(id); //delete the message from the database
    },
});
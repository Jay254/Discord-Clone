import { mutation, query } from "../_generated/server"; //query fetches data
import { v } from "convex/values"; //v is a validator

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("messages").collect(); //fetch all messages in our database
    }
})

export const create = mutation({
    args: {
        sender: v.string(), //sender must be a string
        content: v.string(), //content must be a string too
    },
    handler: async (ctx, { sender, content }) => {
        await ctx.db.insert("messages", { sender, content }); //insert a new message
        // return { success: true };
    }
})
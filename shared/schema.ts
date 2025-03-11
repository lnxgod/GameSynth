import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  code: text("code"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  chatId: integer("chat_id").references(() => chats.id),
});

export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  completed: boolean("completed").default(false),
  type: text("type").notNull(), // 'core', 'tech', 'generated', 'manual'
  gameId: integer("game_id").references(() => games.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertChatSchema = createInsertSchema(chats).pick({
  prompt: true,
  response: true,
  code: true,
});

export const insertGameSchema = createInsertSchema(games).pick({
  name: true,
  code: true,
  chatId: true,
});

export const insertFeatureSchema = createInsertSchema(features).pick({
  description: true,
  type: true,
  gameId: true,
  completed: true,
});

export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type Feature = typeof features.$inferSelect;
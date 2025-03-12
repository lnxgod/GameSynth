import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  forcePasswordChange: boolean("force_password_change").default(true),
  role: text("role").notNull().default('user'),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Keep existing tables
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
  designSettings: jsonb("design_settings"),
});

export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  completed: boolean("completed").default(false),
  type: text("type").notNull(),
  gameId: integer("game_id").references(() => games.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Schema for inserting new user
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    role: true,
  })
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

// Schema for changing password
export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Keep existing schemas
export const insertChatSchema = createInsertSchema(chats).pick({
  prompt: true,
  response: true,
  code: true,
});

export const insertGameSchema = createInsertSchema(games).pick({
  name: true,
  code: true,
  chatId: true,
  designSettings: true,
});

export const insertFeatureSchema = createInsertSchema(features).pick({
  description: true,
  type: true,
  gameId: true,
  completed: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type Feature = typeof features.$inferSelect;
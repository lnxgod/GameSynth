import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Keep existing tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  forcePasswordChange: boolean("force_password_change").default(true),
  role: text("role").notNull().default('user'),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  analysis_model: text("analysis_model").default('gpt-4o'),
  code_gen_model: text("code_gen_model").default('gpt-4o'),
});

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

export const gameDesigns = pgTable("game_designs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  analyses: jsonb("analyses").notNull(), 
  finalDesign: jsonb("final_design").notNull(), 
  settings: jsonb("settings"), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

// Add new tables for code projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep existing schemas
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    role: true,
  })
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
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
  designSettings: true,
});

export const insertFeatureSchema = createInsertSchema(features).pick({
  description: true,
  type: true,
  gameId: true,
  completed: true,
});

export const insertGameDesignSchema = createInsertSchema(gameDesigns).pick({
  name: true,
  description: true,
  analyses: true,
  finalDesign: true,
  settings: true,
});

// Add new schemas for projects
export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  userId: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).pick({
  projectId: true,
  name: true,
  content: true,
  language: true,
});

// Add new types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type Feature = typeof features.$inferSelect;
export type InsertGameDesign = z.infer<typeof insertGameDesignSchema>;
export type GameDesign = typeof gameDesigns.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;
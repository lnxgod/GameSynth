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

// Add new game templates table
export const gameTemplates = pgTable("game_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  code: text("code").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array(),
  previewImageUrl: text("preview_image_url"),
  defaultSettings: jsonb("default_settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  isPublic: boolean("is_public").default(true),
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

// Add after existing tables
export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
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

// Add after existing schemas
export const insertPromptSchema = createInsertSchema(prompts).pick({
  name: true,
  description: true,
  content: true,
  category: true,
});

// Add new schema for game templates
export const insertGameTemplateSchema = createInsertSchema(gameTemplates)
  .pick({
    name: true,
    description: true,
    code: true,
    category: true,
    tags: true,
    previewImageUrl: true,
    defaultSettings: true,
    createdBy: true,
    isPublic: true,
  });

// Keep existing types
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

// Add after existing types
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;

export type InsertGameTemplate = z.infer<typeof insertGameTemplateSchema>;
export type GameTemplate = typeof gameTemplates.$inferSelect;
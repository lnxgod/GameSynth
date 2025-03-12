import { drizzle } from 'drizzle-orm/neon-serverless';
import { chats, games, features, users, type Chat, type Game, type Feature, type User, type InsertChat, type InsertGame, type InsertFeature, type InsertUser } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from 'drizzle-orm';
import { db } from './db'; // Import the db instance from db.ts

export interface IStorage {
  // User management
  createUser(user: InsertUser): Promise<User>;
  getUser(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User>;
  updateUserLastLogin(id: number): Promise<User>;
  ensureDefaultAdmin(): Promise<void>;

  // Existing methods
  createChat(chat: InsertChat): Promise<Chat>;
  getChat(id: number): Promise<Chat | undefined>;
  getAllChats(): Promise<Chat[]>;
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getAllGames(): Promise<Game[]>;
  createFeature(feature: InsertFeature): Promise<Feature>;
  getFeature(id: number): Promise<Feature | undefined>;
  getAllFeatures(gameId?: number): Promise<Feature[]>;
  updateFeatureStatus(id: number, completed: boolean): Promise<Feature>;
}

export class PostgresStorage implements IStorage {
  async ensureDefaultAdmin() {
    try {
      // Check if admin user exists
      const admin = await this.getUser('admin');
      if (!admin) {
        // Create default admin if doesn't exist
        const hashedPassword = await bcrypt.hash('Password123', 10);
        const [newAdmin] = await db.insert(users).values({
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          forcePasswordChange: true,
          createdAt: new Date()
        }).returning();
        console.log('Default admin user created successfully:', newAdmin.username);
      }
    } catch (error) {
      console.error('Failed to ensure default admin:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const [newUser] = await db.insert(users).values({
      ...user,
      password: hashedPassword,
      forcePasswordChange: true,
    }).returning();
    return newUser;
  }

  async getUser(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        forcePasswordChange: false
      })
      .where(eq(users.id, id))
      .returning();
    console.log('Password updated for user:', user.username);
    return user;
  }

  async updateUserLastLogin(id: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }

  async getChat(id: number): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }

  async getAllChats(): Promise<Chat[]> {
    return await db.select().from(chats);
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games);
  }

  async createFeature(feature: InsertFeature): Promise<Feature> {
    const [newFeature] = await db.insert(features).values(feature).returning();
    return newFeature;
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    const [feature] = await db.select().from(features).where(eq(features.id, id));
    return feature;
  }

  async getAllFeatures(gameId?: number): Promise<Feature[]> {
    if (gameId) {
      return await db.select().from(features).where(eq(features.gameId, gameId));
    }
    return await db.select().from(features);
  }

  async updateFeatureStatus(id: number, completed: boolean): Promise<Feature> {
    const [feature] = await db
      .update(features)
      .set({ completed })
      .where(eq(features.id, id))
      .returning();
    return feature;
  }
}

// Export a single instance
export const storage = new PostgresStorage();
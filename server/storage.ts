import { chats, games, features, users, type Chat, type Game, type Feature, type User, type InsertChat, type InsertGame, type InsertFeature, type InsertUser } from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User management
  createUser(user: InsertUser): Promise<User>;
  getUser(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User>;
  updateUserLastLogin(id: number): Promise<User>;

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chats: Map<number, Chat>;
  private games: Map<number, Game>;
  private features: Map<number, Feature>;
  private userId: number;
  private chatId: number;
  private gameId: number;
  private featureId: number;
  private usernameIndex: Map<string, number>;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.games = new Map();
    this.features = new Map();
    this.userId = 1;
    this.chatId = 1;
    this.gameId = 1;
    this.featureId = 1;
    this.usernameIndex = new Map();

    // Create default admin user
    this.createDefaultAdmin().catch(console.error);
  }

  private async createDefaultAdmin() {
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const admin: User = {
      id: this.userId++,
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      forcePasswordChange: true,
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(admin.id, admin);
    this.usernameIndex.set(admin.username, admin.id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser: User = {
      ...user,
      id,
      password: hashedPassword,
      forcePasswordChange: true,
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    this.usernameIndex.set(user.username, id);
    return newUser;
  }

  async getUser(username: string): Promise<User | undefined> {
    const id = this.usernameIndex.get(username);
    return id ? this.users.get(id) : undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async updateUserPassword(id: number, password: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser: User = {
      ...user,
      password: hashedPassword,
      forcePasswordChange: false
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserLastLogin(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser: User = {
      ...user,
      lastLogin: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Existing methods remain unchanged
  async createChat(chat: InsertChat): Promise<Chat> {
    const id = this.chatId++;
    const newChat: Chat = {
      ...chat,
      id,
      timestamp: new Date(),
      code: chat.code || null
    };
    this.chats.set(id, newChat);
    return newChat;
  }

  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getAllChats(): Promise<Chat[]> {
    return Array.from(this.chats.values());
  }

  async createGame(game: InsertGame): Promise<Game> {
    const id = this.gameId++;
    const newGame: Game = {
      ...game,
      id,
      chatId: game.chatId || null,
      designSettings: game.designSettings || null
    };
    this.games.set(id, newGame);
    return newGame;
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getAllGames(): Promise<Game[]> {
    return Array.from(this.games.values());
  }

  async createFeature(feature: InsertFeature): Promise<Feature> {
    const id = this.featureId++;
    const newFeature: Feature = {
      ...feature,
      id,
      timestamp: new Date(),
      completed: feature.completed || false
    };
    this.features.set(id, newFeature);
    return newFeature;
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    return this.features.get(id);
  }

  async getAllFeatures(gameId?: number): Promise<Feature[]> {
    const features = Array.from(this.features.values());
    if (gameId) {
      return features.filter(f => f.gameId === gameId);
    }
    return features;
  }

  async updateFeatureStatus(id: number, completed: boolean): Promise<Feature> {
    const feature = this.features.get(id);
    if (!feature) {
      throw new Error("Feature not found");
    }
    const updatedFeature = { ...feature, completed };
    this.features.set(id, updatedFeature);
    return updatedFeature;
  }
}

export const storage = new MemStorage();
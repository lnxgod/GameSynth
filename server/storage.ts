import { chats, games, features, type Chat, type Game, type Feature, type InsertChat, type InsertGame, type InsertFeature } from "@shared/schema";

export interface IStorage {
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
  private chats: Map<number, Chat>;
  private games: Map<number, Game>;
  private features: Map<number, Feature>;
  private chatId: number;
  private gameId: number;
  private featureId: number;

  constructor() {
    this.chats = new Map();
    this.games = new Map();
    this.features = new Map();
    this.chatId = 1;
    this.gameId = 1;
    this.featureId = 1;
  }

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
      chatId: game.chatId || null
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
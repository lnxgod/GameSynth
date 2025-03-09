import { chats, games, type Chat, type Game, type InsertChat, type InsertGame } from "@shared/schema";

export interface IStorage {
  createChat(chat: InsertChat): Promise<Chat>;
  getChat(id: number): Promise<Chat | undefined>;
  getAllChats(): Promise<Chat[]>;
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getAllGames(): Promise<Game[]>;
}

export class MemStorage implements IStorage {
  private chats: Map<number, Chat>;
  private games: Map<number, Game>;
  private chatId: number;
  private gameId: number;

  constructor() {
    this.chats = new Map();
    this.games = new Map();
    this.chatId = 1;
    this.gameId = 1;
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
}

export const storage = new MemStorage();
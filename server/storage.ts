import { drizzle } from 'drizzle-orm/neon-serverless';
import { 
  chats, games, features, users, projects, projectFiles, gameTemplates, gameDesigns,
  type Chat, type Game, type Feature, type User, 
  type InsertChat, type InsertGame, type InsertFeature, type InsertUser,
  type Project, type ProjectFile, type InsertProject, type InsertProjectFile,
  type GameTemplate, type InsertGameTemplate, type GameDesign, type InsertGameDesign,
  type Prompt, type InsertPrompt
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from 'drizzle-orm';
import { db } from './db'; // Import the db instance from db.ts

export interface IStorage {
  // Add new project methods
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(userId: number): Promise<Project[]>;
  updateProject(id: number, name: string): Promise<Project>;
  deleteProject(id: number): Promise<Project>;

  // Add file methods
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  getAllProjectFiles(projectId: number): Promise<ProjectFile[]>;
  updateProjectFile(id: number, content: string): Promise<ProjectFile>;
  deleteProjectFile(id: number): Promise<ProjectFile>;

  // Keep existing methods
  createGameDesign(design: InsertGameDesign & { userId: number }): Promise<GameDesign>;
  getGameDesign(id: number): Promise<GameDesign | undefined>;
  getAllGameDesigns(userId: number): Promise<GameDesign[]>;
  updateGameDesign(id: number, design: Partial<InsertGameDesign>): Promise<GameDesign>;
  deleteGameDesign(id: number): Promise<GameDesign>;
  createUser(user: InsertUser): Promise<User>;
  getUser(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User>;
  updateUserLastLogin(id: number): Promise<User>;
  ensureDefaultAdmin(): Promise<void>;
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
  deleteAllFeatures(): Promise<void>;
  updateUserModelPreferences(id: number, analysis_model: string, code_gen_model: string): Promise<User>;
  deleteTemplate(templateId: number): Promise<GameTemplate>;

  // Add prompt methods
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  getAllPrompts(): Promise<Prompt[]>;
  updatePrompt(id: number, content: string): Promise<Prompt>;
}

export class PostgresStorage implements IStorage {
  // Implement new project methods
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values({
      ...project,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getAllProjects(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async updateProject(id: number, name: string): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ name, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<Project> {
    const [project] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  // Implement file methods
  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [newFile] = await db.insert(projectFiles).values({
      ...file,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newFile;
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return file;
  }

  async getAllProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
  }

  async updateProjectFile(id: number, content: string): Promise<ProjectFile> {
    const [file] = await db
      .update(projectFiles)
      .set({ content, updatedAt: new Date() })
      .where(eq(projectFiles.id, id))
      .returning();
    return file;
  }

  async deleteProjectFile(id: number): Promise<ProjectFile> {
    const [file] = await db
      .delete(projectFiles)
      .where(eq(projectFiles.id, id))
      .returning();
    return file;
  }

  // Keep existing method implementations
  async ensureDefaultAdmin() {
    try {
      // Check if admin user exists using lowercase
      const admin = await this.getUser('admin');
      if (!admin) {
        // Create default admin if doesn't exist
        const hashedPassword = await bcrypt.hash('admin', 10); // Changed default password to 'admin'
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
      username: user.username.toLowerCase(), // Ensure username is stored lowercase
      password: hashedPassword,
      forcePasswordChange: true,
    }).returning();
    return newUser;
  }

  async getUser(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
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
      .set({ 
        lastLogin: new Date(),
        updatedAt: new Date()
      })
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

  async deleteAllFeatures(): Promise<void> {
    await db.delete(features);
  }
  async createGameDesign(design: InsertGameDesign & { userId: number }): Promise<GameDesign> {
    const [newDesign] = await db.insert(gameDesigns).values({
      ...design,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newDesign;
  }

  async getGameDesign(id: number): Promise<GameDesign | undefined> {
    const [design] = await db.select().from(gameDesigns).where(eq(gameDesigns.id, id));
    return design;
  }

  async getAllGameDesigns(userId: number): Promise<GameDesign[]> {
    return await db.select().from(gameDesigns).where(eq(gameDesigns.userId, userId));
  }

  async updateGameDesign(id: number, design: Partial<InsertGameDesign>): Promise<GameDesign> {
    const [updated] = await db
      .update(gameDesigns)
      .set({
        ...design,
        updatedAt: new Date()
      })
      .where(eq(gameDesigns.id, id))
      .returning();
    return updated;
  }

  async deleteGameDesign(id: number): Promise<GameDesign> {
    const [deleted] = await db
      .delete(gameDesigns)
      .where(eq(gameDesigns.id, id))
      .returning();
    return deleted;
  }
  async updateUserModelPreferences(id: number, analysis_model: string, code_gen_model: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        analysis_model,
        code_gen_model,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  async deleteTemplate(templateId: number): Promise<GameTemplate> {
    try {
      const [deletedTemplate] = await db
        .delete(gameTemplates)
        .where(eq(gameTemplates.id, templateId))
        .returning();

      if (!deletedTemplate) {
        throw new Error('Template not found');
      }

      return deletedTemplate;
    } catch (error: any) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
  // Add prompt methods implementation
  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const [newPrompt] = await db.insert(prompts).values({
      ...prompt,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newPrompt;
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt;
  }

  async getAllPrompts(): Promise<Prompt[]> {
    return await db.select().from(prompts);
  }

  async updatePrompt(id: number, content: string): Promise<Prompt> {
    const [prompt] = await db
      .update(prompts)
      .set({ 
        content,
        updatedAt: new Date()
      })
      .where(eq(prompts.id, id))
      .returning();
    return prompt;
  }
}

// Export storage instance
export const storage = new PostgresStorage();

// Ensure admin user exists on startup
storage.ensureDefaultAdmin().catch(console.error);
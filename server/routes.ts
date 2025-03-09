import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertChatSchema, insertGameSchema } from "@shared/schema";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = [
  "You are a game development assistant specialized in creating HTML5 Canvas games.",
  "When providing code:",
  "1. Always wrap the game code between +++CODESTART+++ and +++CODESTOP+++ markers",
  "2. Do not include backticks in your response",
  "3. Focus on creating interactive, fun games using vanilla JavaScript and Canvas API",
  "4. Include clear comments explaining the game mechanics",
  "5. Return fully working, self-contained game code"
].join("\n");

export async function registerRoutes(app: Express) {
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, temperature = 0.7, maxTokens = 2048 } = req.body;

      const response = await openai.chat.completions.create({
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          { role: "user", content: prompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      });

      const content = response.choices[0].message.content || "";

      // Extract code between markers and remove any backticks
      const codeMatch = content.match(/\+\+\+CODESTART\+\+\+([\s\S]*?)\+\+\+CODESTOP\+\+\+/);
      let code: string | null = null;

      if (codeMatch) {
        code = codeMatch[1].trim();
        // Remove backticks if they exist at the start/end
        code = code.replace(/^```[\w]*\n?/, "").replace(/```$/, "");
      }

      const chat = await storage.createChat({
        prompt,
        response: content,
        code
      });

      res.json({
        ...chat,
        settings: {
          temperature,
          maxTokens
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getAllChats();
      res.json(chats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const game = insertGameSchema.parse(req.body);
      const created = await storage.createGame(game);
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
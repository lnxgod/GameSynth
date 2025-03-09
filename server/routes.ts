import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertChatSchema, insertGameSchema } from "@shared/schema";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express) {
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      const response = await openai.chat.completions.create({
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a game development assistant. When providing code, always wrap it in +++CODESTART+++ and +++CODESTOP+++ markers."
          },
          { role: "user", content: prompt }
        ]
      });

      const content = response.choices[0].message.content || "";
      
      // Extract code between markers
      const codeMatch = content.match(/\+\+\+CODESTART\+\+\+([\s\S]*?)\+\+\+CODESTOP\+\+\+/);
      const code = codeMatch ? codeMatch[1].trim() : null;

      const chat = await storage.createChat({
        prompt,
        response: content,
        code
      });

      res.json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getAllChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const game = insertGameSchema.parse(req.body);
      const created = await storage.createGame(game);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

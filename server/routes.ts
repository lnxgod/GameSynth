import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertChatSchema, insertGameSchema } from "@shared/schema";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store API logs in memory
const apiLogs: Array<{ timestamp: string; message: string }> = [];

function logApi(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  apiLogs.push({ timestamp, message });
  // Keep only the last 100 logs
  if (apiLogs.length > 100) {
    apiLogs.shift();
  }
}

const SYSTEM_PROMPT = [
  "You are a game development assistant specialized in creating HTML5 Canvas games.",
  "When providing code:",
  "1. Always wrap the game code between +++CODESTART+++ and +++CODESTOP+++ markers",
  "2. Do not include backticks in your response",
  "3. Focus on creating interactive, fun games using vanilla JavaScript and Canvas API",
  "4. Include clear comments explaining the game mechanics",
  "5. Return fully working, self-contained game code that handles its own game loop",
  "6. Use requestAnimationFrame for animation",
  "7. Initialize all variables and handle cleanup properly",
  "8. Include error handling in the game code",
  "Example structure:",
  "+++CODESTART+++",
  "// Game variables",
  "let x = canvas.width/2;",
  "let y = canvas.height/2;",
  "",
  "// Game loop",
  "function gameLoop() {",
  "  ctx.clearRect(0, 0, canvas.width, canvas.height);",
  "  // Update game state",
  "  // Draw game objects",
  "  requestAnimationFrame(gameLoop);",
  "}",
  "",
  "// Start the game",
  "gameLoop();",
  "+++CODESTOP+++"
].join("\n");

export async function registerRoutes(app: Express) {
  app.get("/api/logs", (req, res) => {
    res.json(apiLogs);
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, temperature = 0.7, maxTokens = 2048 } = req.body;
      logApi(`Chat request received: ${prompt.slice(0, 50)}...`);

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

      logApi(`Chat response generated with ${code ? 'code' : 'no code'}`);

      res.json({
        ...chat,
        settings: {
          temperature,
          maxTokens
        }
      });
    } catch (error: any) {
      logApi(`Error in chat: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getAllChats();
      logApi(`Retrieved ${chats.length} chats`);
      res.json(chats);
    } catch (error: any) {
      logApi(`Error getting chats: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const game = insertGameSchema.parse(req.body);
      const created = await storage.createGame(game);
      logApi(`New game created: ${game.name}`);
      res.json(created);
    } catch (error: any) {
      logApi(`Error creating game: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      logApi(`Retrieved ${games.length} games`);
      res.json(games);
    } catch (error: any) {
      logApi(`Error getting games: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
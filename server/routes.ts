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
  "5. Return fully working, self-contained game code that handles its own game loop",
  "6. Use requestAnimationFrame for animation",
  "7. Handle cleanup properly when the game stops"
].join("\n");

// Store API logs in memory with full request/response data
const apiLogs: Array<{
  timestamp: string;
  message: string;
  request?: any;
  response?: any;
}> = [];

function logApi(message: string, request?: any, response?: any) {
  const timestamp = new Date().toLocaleTimeString();
  apiLogs.push({
    timestamp,
    message,
    request: request ? JSON.stringify(request, null, 2) : undefined,
    response: response ? JSON.stringify(response, null, 2) : undefined
  });
  // Keep only the last 100 logs
  if (apiLogs.length > 100) {
    apiLogs.shift();
  }
}

function extractGameCode(content: string): string | null {
  try {
    console.log('Starting code extraction...');

    // Find the code block
    const startMarker = '+++CODESTART+++';
    const endMarker = '+++CODESTOP+++';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1) {
      console.log('ERROR: No CODESTART marker found in response');
      return null;
    }

    if (endIndex === -1) {
      console.log('ERROR: No CODESTOP marker found in response');
      console.log('Raw content:', content);
      return null;
    }

    // Extract the code between markers
    let code = content
      .substring(startIndex + startMarker.length, endIndex)
      .trim();

    // If we have a script tag, extract just the JavaScript
    const scriptMatch = code.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      code = scriptMatch[1].trim();
    }

    // Remove any remaining HTML tags and structure
    code = code.replace(/<\/?[^>]+(>|$)/g, '');

    if (!code) {
      console.log('ERROR: Empty code block found');
      return null;
    }

    // Basic validation - try to parse it as a function
    try {
      // Skip the canvas/ctx initialization since we provide those
      code = code.replace(/const canvas[^;]+;/, '');
      code = code.replace(/const ctx[^;]+;/, '');

      new Function('canvas', 'ctx', code);
    } catch (error) {
      console.log('ERROR: Code validation failed -', error.message);
      console.log('Invalid code:', code);
      return null;
    }

    console.log('Successfully extracted and validated code');
    return code;
  } catch (error) {
    console.error('Code extraction failed:', error);
    return null;
  }
}

export async function registerRoutes(app: Express) {
  app.get("/api/logs", (req, res) => {
    res.json(apiLogs);
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, temperature = 0.7, maxTokens = 16000 } = req.body; // Updated default

      // Add validation for max tokens
      if (maxTokens > 16000) {
        throw new Error("Max tokens cannot exceed 16,000 due to model limitations");
      }

      logApi("Chat request received", { prompt, temperature, maxTokens });

      const response = await openai.chat.completions.create({
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
      console.log('Raw response content:', content);

      const code = extractGameCode(content);
      console.log('Extracted code:', code);

      const chat = await storage.createChat({
        prompt,
        response: content,
        code
      });

      const result = {
        ...chat,
        settings: {
          temperature,
          maxTokens
        }
      };

      logApi("Chat response generated", { prompt }, result);
      res.json(result);
    } catch (error: any) {
      logApi("Error in chat", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getAllChats();
      logApi(`Retrieved ${chats.length} chats`, req.query, { count: chats.length });
      res.json(chats);
    } catch (error: any) {
      logApi("Error getting chats", req.query, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const game = insertGameSchema.parse(req.body);
      const created = await storage.createGame(game);
      logApi("New game created", req.body, created);
      res.json(created);
    } catch (error: any) {
      logApi("Error creating game", req.body, { error: error.message });
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      logApi(`Retrieved ${games.length} games`, req.query, { count: games.length });
      res.json(games);
    } catch (error: any) {
      logApi("Error getting games", req.query, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
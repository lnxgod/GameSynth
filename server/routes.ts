import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertChatSchema, insertGameSchema } from "@shared/schema";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Design assistant system prompt
const DESIGN_ASSISTANT_PROMPT = `You are a game design assistant helping users create HTML5 Canvas games. 
Ask questions to understand their requirements. Focus on:
1. Game genre and style
2. Core gameplay mechanics
3. Visual style and theme
4. Difficulty level
5. Special features or elements`;

const SYSTEM_PROMPT = `You are a game development assistant specialized in creating HTML5 Canvas games.
When providing code:
1. Always wrap the game code between +++CODESTART+++ and +++CODESTOP+++ markers
2. Focus on creating interactive, fun games using vanilla JavaScript and Canvas API
3. Include clear comments explaining the game mechanics
4. Return fully working, self-contained game code that handles its own game loop
5. Use requestAnimationFrame for animation
6. Handle cleanup properly when the game stops`;

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

// Game design conversation history
const designConversations = new Map<string, Array<{
  role: 'assistant' | 'user';
  content: string;
}>>();

function extractGameCode(content: string): string | null {
  try {
    console.log('Starting code extraction...');

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

    let code = content
      .substring(startIndex + startMarker.length, endIndex)
      .trim();

    // If we have a script tag, extract just the JavaScript
    if (code.includes('<script>')) {
      const scriptStart = code.indexOf('<script>') + 8;
      const scriptEnd = code.indexOf('</script>');
      if (scriptEnd > scriptStart) {
        code = code.substring(scriptStart, scriptEnd).trim();
      }
    }

    // Remove any HTML document structure
    code = code.replace(/<!DOCTYPE.*?>/, '');
    code = code.replace(/<html>.*?<body>/s, '');
    code = code.replace(/<\/body>.*?<\/html>/s, '');

    // Remove canvas/context initialization since we provide those
    code = code.replace(/const canvas\s*=\s*document\.getElementById[^;]+;/, '');
    code = code.replace(/const ctx\s*=\s*canvas\.getContext[^;]+;/, '');

    if (!code) {
      console.log('ERROR: Empty code block found');
      return null;
    }

    console.log('Extracted code:', code);
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

  // New endpoint for game design assistance
  app.post("/api/design/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;

      // Get or create conversation history
      if (!designConversations.has(sessionId)) {
        designConversations.set(sessionId, []);
      }
      const history = designConversations.get(sessionId)!;

      // Add user message to history
      history.push({ role: 'user', content: message });

      logApi("Design chat request received", { message, sessionId });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: DESIGN_ASSISTANT_PROMPT
          },
          ...history
        ],
        temperature: 0.7
      });

      const assistantMessage = response.choices[0].message.content || "";

      // Add assistant response to history
      history.push({ role: 'assistant', content: assistantMessage });

      logApi("Design chat response", { message }, { response: assistantMessage });

      res.json({ 
        message: assistantMessage,
        history: history 
      });
    } catch (error: any) {
      logApi("Error in design chat", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Generate game code based on design conversation
  app.post("/api/design/generate", async (req, res) => {
    try {
      const { sessionId } = req.body;
      const history = designConversations.get(sessionId);

      if (!history) {
        throw new Error("No design conversation found");
      }

      logApi("Game generation request", { sessionId });

      // Compile the conversation into a detailed game specification
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `Based on the following conversation, create a complete game implementation:\n\n${
              history.map(msg => `${msg.role}: ${msg.content}`).join('\n')
            }`
          }
        ],
        temperature: 0.7,
        max_tokens: 16000
      });

      const content = response.choices[0].message.content || "";
      const code = extractGameCode(content);

      const result = {
        code,
        response: content
      };

      logApi("Game code generated", { sessionId }, result);
      res.json(result);
    } catch (error: any) {
      logApi("Error generating game", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, temperature = 0.7, maxTokens = 16000 } = req.body;

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
        temperature,
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
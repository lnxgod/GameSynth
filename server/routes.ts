// Helper function to get model-specific parameters
const getModelConfig = (model: string, baseConfig: any) => {
  const config: any = {
    model,
    messages: baseConfig.messages
  };

  // O1 specific configuration - only supports reasoning_effort
  if (model === 'o1') {
    if (baseConfig.reasoning_effort) {
      config.reasoning_effort = baseConfig.reasoning_effort;
    }
    // O1 does not support temperature or response_format
    return config;
  }

  // O3 models support all parameters
  if (model.startsWith('o3')) {
    return {
      ...config,
      temperature: baseConfig.temperature,
      response_format: baseConfig.response_format,
      reasoning_effort: baseConfig.reasoning_effort
    };
  }

  // GPT-4 and other models
  return {
    ...config,
    temperature: baseConfig.temperature,
    max_tokens: baseConfig.max_tokens
  };
};

import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertChatSchema, insertGameSchema } from "@shared/schema";
import OpenAI from "openai";
import {insertFeatureSchema} from "@shared/schema"; 
import { exec } from 'child_process';
import { promisify } from 'util';
import path from "path";
import fs from "fs/promises";
import session from "express-session";
import { isAuthenticated, requirePasswordChange } from "./middleware/auth";
import { changePasswordSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { insertUserSchema } from "@shared/schema"; // Import the schema for user creation
import { chats, games, features, users } from "@shared/schema"; // Import schema from shared
import { db } from './db'; // Import the db instance correctly
import { eq } from 'drizzle-orm';
import {insertGameDesignSchema} from "@shared/schema"; //Import the schema for game design
import { createWriteStream } from 'fs';
import stream from 'stream';
import express from 'express'; // Import express

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for models with 1-hour expiry
let modelsCache: Record<string, string> | null = null;
let modelsCacheTime: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function getAvailableModels(): Promise<Record<string, string>> {
  // Return cached models if available and not expired
  if (modelsCache && (Date.now() - modelsCacheTime) < CACHE_DURATION) {
    return modelsCache;
  }

  try {
    const models = await openai.models.list();

    // Create a map of model IDs
    const formattedModels: Record<string, string> = {};
    models.data.forEach(model => {
      // Include all models without filtering
      formattedModels[model.id] = model.id;
    });

    // Update cache
    modelsCache = formattedModels;
    modelsCacheTime = Date.now();

    return formattedModels;
  } catch (error) {
    console.error('Failed to fetch models:', error);
    // Return default models if API call fails
    return {
      'gpt-4o': 'gpt-4o',
      'gpt-3.5-turbo': 'gpt-3.5-turbo'
    };
  }
}

const DESIGN_ASSISTANT_PROMPT = `You are a game design assistant helping users create HTML5 Canvas games. 
Analyze the specific game aspect provided and elaborate on its implementation details.
Focus on concrete, implementable features and mechanics.
Format your response as JSON with the following structure:
{
  "analysis": "Detailed analysis of this game aspect",
  "implementation_details": ["List of specific features or mechanics to implement"],
  "technical_considerations": ["Technical aspects to consider"],
  "needs_clarification": boolean,
  "clarifying_questions": ["List of clarifying questions"]
}
`;

const FINAL_PROMPT_ASSISTANT = `You are a game design assistant helping create HTML5 Canvas games.
Review all the analyzed aspects and create a comprehensive game design document.
Consider how all elements work together and ensure the game will be fun and technically feasible.
Format your response as JSON with the following structure:
{
  "gameDescription": "Complete game description",
  "coreMechanics": ["List of core mechanics"],
  "technicalRequirements": ["Technical requirements"],
  "implementationApproach": "Suggested implementation approach",
  "needsMoreInfo": boolean,
  "additionalQuestions": ["Any clarifying questions if needed"]
}
`;

const apiLogs: Array<{
  timestamp: string;
  message: string;
  request?: any;
  response?: any;
  openAIConfig?: any;
}> = [];

const logOpenAIParams = (config: any) => {
  return {
    model: config.model,
    reasoning_effort: config.reasoning_effort,
    max_completion_tokens: config.max_completion_tokens,
    temperature: config.temperature,
    response_format: config.response_format
  };
};

function logApi(message: string, request?: any, response?: any, openAIConfig?: any) {
  const timestamp = new Date().toLocaleTimeString();
  apiLogs.push({
    timestamp,
    message,
    request: request ? JSON.stringify(request, null, 2) : undefined,
    response: response ? JSON.stringify(response, null, 2) : undefined,
    openAIConfig: openAIConfig ? JSON.stringify(openAIConfig, null, 2) : undefined
  });
  if (apiLogs.length > 100) {
    apiLogs.shift();
  }
}

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

    if (code.includes('<script>')) {
      const scriptStart = code.indexOf('<script>') + 8;
      const scriptEnd = code.indexOf('</script>');
      if (scriptEnd > scriptStart) {
        code = code.substring(scriptStart, scriptEnd).trim();
      }
    }

    code = code.replace(/<!DOCTYPE.*?>/, '');
    code = code.replace(/<html>.*?<body>/s, '');
    code = code.replace(/<\/body>.*?<\/html>/s, '');

    code = code.replace(/const canvas\s*=\s*document\.getElementById[^;]+;/, '');
    code = code.replace(/const ctx\s*=\s*canvas\.getContext[^;]+;/, '');

    code = code.replace(/^```javascript\n/, '');
    code = code.replace(/^```\n/, '');
    code = code.replace(/\n```$/, '');

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

const SYSTEM_PROMPT = `You are a game development assistant specialized in creating HTML5 Canvas games.
When providing code:
1. Always wrap the game code between +++CODESTART+++ and +++CODESTOP+++ markers
2. Focus on creating interactive, fun games using vanilla JavaScript and Canvas API
3. Include clear comments explaining the game mechanics
4. Return fully working, self-contained game code that handles its own game loop
5. Use requestAnimationFrame for animation
6. Handle cleanup properly when the game stops`;


let addDebugLog: ((message: string) => void) | undefined; //Added to handle debug logging

export async function registerRoutes(app: Express) {
  // Ensure database is initialized
  try {
    await storage.ensureDefaultAdmin();
    console.log('Database initialized with admin user');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }

  app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'))); // Added middleware


  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log('Login attempt for username:', username);

      const user = await storage.getUser(username);
      if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log('User found:', username, 'Checking password...');
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log('Invalid password for user:', username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      req.session.userId = user.id;

      console.log('Login successful for:', username, 'Role:', user.role);
      res.json({
        username: user.username,
        role: user.role,
        forcePasswordChange: user.forcePasswordChange,
        analysis_model: user.analysis_model || "gpt-4o",
        code_gen_model: user.code_gen_model || "gpt-4o"
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const user = (req as any).user;

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      await storage.updateUserPassword(user.id, newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  //New User Management Endpoints
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      // Only admin can list users
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const usersList = await db.select().from(users);
      res.json(usersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);
      const { role } = req.body;

      // Don't allow changing admin user's role
      const targetUser = await storage.getUserById(userId);
      if (targetUser?.username === 'admin') {
        return res.status(403).json({ error: "Cannot modify admin user" });
      }

      const [updatedUser] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();

      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/reset-password", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);

      // Don't allow resetting admin user's password
      const targetUser = await storage.getUserById(userId);
      if (targetUser?.username === 'admin') {
        return res.status(403).json({ error: "Cannot modify admin user" });
      }

      // Generate a temporary password
      const temporaryPassword = Math.random().toString(36).slice(-8);

      await storage.updateUserPassword(userId, temporaryPassword);

      res.json({ temporaryPassword });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);

      // Don't allow deleting admin user
      const targetUser = await storage.getUserById(userId);
      if (targetUser?.username === 'admin') {
        return res.status(403).json({ error: "Cannot delete admin user" });
      }

      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();

      res.json(deletedUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Game Design Routes
  app.post("/api/game-designs", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const designData = insertGameDesignSchema.parse(req.body);

      const savedDesign = await storage.createGameDesign({
        ...designData,
        userId: user.id
      });

      res.json(savedDesign);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/game-designs", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const designs = await storage.getAllGameDesigns(user.id);
      res.json(designs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/game-designs/:id", isAuthenticated, async (req, res) => {
    try {
      const designId = parseInt(req.params.id);
      const design = await storage.getGameDesign(designId);

      if (!design) {
        return res.status(404).json({ error: "Design not found" });
      }

      // Only allow access to own designs
      if (design.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      res.json(design);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/game-designs/:id", isAuthenticated, async (req, res) => {
    try {
      const designId = parseInt(req.params.id);
      const existingDesign = await storage.getGameDesign(designId);

      if (!existingDesign) {
        return res.status(404).json({ error: "Design not found" });
      }

      // Only allow updating own designs
      if (existingDesign.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updateData = insertGameDesignSchema.partial().parse(req.body);
      const updated = await storage.updateGameDesign(designId, updateData);

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/game-designs/:id", isAuthenticated, async (req, res) => {
    try {
      const designId = parseInt(req.params.id);
      const existingDesign = await storage.getGameDesign(designId);

      if (!existingDesign) {
        return res.status(404).json({ error: "Design not found" });
      }

      // Only allow deleting own designs
      if (existingDesign.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteGameDesign(designId);
      res.json(deleted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  //New endpoint for graphics generation
  // Add directory check and creation before saving images
  app.post("/api/design/analyze-graphics", async (req, res) => {
    try {
      const { gameDesign } = req.body;
      const userId = (req.session as any).userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Ensure attached_assets directory exists
      const assetsDir = path.join(process.cwd(), 'attached_assets');
      try {
        await fs.access(assetsDir);
      } catch {
        await fs.mkdir(assetsDir, { recursive: true });
      }

      logApi("Analyzing game design for graphics", { gameDesign });

      // First, analyze the game design to suggest graphics
      const analysisResponse = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: `You are a game art director specialized in pixel art and retro game graphics.
Analyze the game design and suggest specific graphics that would enhance the game.
Focus on essential game elements that need visual representation.
Format your response as JSON with this structure:
{
  "graphics": [
    {
      "name": "string (e.g., 'player_character')",
      "description": "string (detailed description for image generation)",
      "purpose": "string (how this will be used in the game)",
      "size": "string (suggested pixel dimensions)"
    }
  ]
}`
          },
          {
            role: "user",
            content: `Based on this game design, suggest essential graphics we need to create:
Game Description:
${gameDesign.gameDescription}

Core Mechanics:
${gameDesign.coreMechanics.join("\n")}

Please suggest the key visual elements needed for this game.`
          }
        ],
        reasoning_effort: "medium"
      });

      const suggestions = JSON.parse(analysisResponse.choices[0].message.content || "{}");
      logApi("Graphics suggestions generated", suggestions);

      // Generate images using DALL-E
      const imagePromises = suggestions.graphics.map(async (graphic: any) => {
        try {
          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Create a pixel art style game asset: ${graphic.description}. The image should be clear, simple, and suitable for a retro-style game. Use vibrant colors and clear outlines.`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "b64_json"
          });

          // Save the image
          const imageData = response.data[0].b64_json;
          const fileName = `${graphic.name.toLowerCase().replace(/\s+/g, '_')}.png`;
          const filePath = path.join(assetsDir, fileName);

          // Convert base64 to buffer and save
          const buffer = Buffer.from(imageData!, 'base64');
          await fs.writeFile(filePath, buffer);
          logApi(`Saved image: ${fileName}`);

          return {
            ...graphic,
            url: `/attached_assets/${fileName}`
          };
        } catch (error) {
          console.error(`Failed to generate/save image for ${graphic.name}:`, error);
          throw error;
        }
      });

      const generatedImages = await Promise.all(imagePromises);

      logApi("Graphics generation complete", { generatedImages });
      res.json({ generatedImages });
    } catch (error: any) {
      console.error('Graphics generation error:', error);
      logApi("Error generating graphics", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Keep existing protected routes
  app.use(["/api/chat", "/api/chats", "/api/games", "/api/features", "/api/code/chat", "/api/code/remix", "/api/code/debug", "/api/hint", "/api/build/android", "/api/users", "/api/game-designs", "/api/design/analyze-graphics", "/api/design/analyze-development-plan"], isAuthenticated, requirePasswordChange);

  app.get("/api/logs", (req, res) => {
    res.json(apiLogs);
  });

  app.post("/api/design/analyze", async (req, res) => {
    try {
      const { requirements, sessionId } = req.body;
      if (!requirements || !sessionId) {
        throw new Error("Missing required parameters");
      }

      // Get user from session
      const userId = (req.session as any).userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Get user preferences, using default model if not set
      let userPreferences;
      try {
        userPreferences = await storage.getUserById(userId);
      } catch (error) {
        console.error('Failed to get user preferences:', error);
      }
      const analysisModel = userPreferences?.analysis_model || "gpt-3.5-turbo";

      if (!designConversations.has(sessionId)) {
        designConversations.set(sessionId, []);
      }
      const history = designConversations.get(sessionId)!;

      const requestConfig = {
        model: analysisModel,
        messages: [
          {
            role: "system",
            content: DESIGN_ASSISTANT_PROMPT
          },
          {
            role: "user",
            content: `Analyze this requirement for an HTML5 Canvas game: ${JSON.stringify(requirements)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      };

      logApi("Analyzing game requirements", { requirements }, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);

      const analysisResults = JSON.parse(response.choices[0].message.content || "{}");

      history.push({
        role: 'assistant',
        content: `Analysis of requirement:\n${analysisResults.analysis}\n\nImplementation details:\n${analysisResults.implementation_details.join("\n")}`
      });

      logApi("Analysis complete", null, analysisResults, logOpenAIParams(requestConfig));
      res.json({
        analysis: analysisResults,
        needsMoreInfo: analysisResults.needs_clarification,
        additionalQuestions: analysisResults.clarifying_questions
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      logApi("Error in analysis", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/design/finalize", async (req, res) => {
    try {
      const { sessionId } = req.body;
      const history = designConversations.get(sessionId);

      if (!history) {
        throw new Error("No design conversation found");
      }

      logApi("Generating final design", { sessionId });

      const requestConfig = {
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: FINAL_PROMPT_ASSISTANT
          },
          {
            role: "user",
            content: `Create a comprehensive game design based on these analyses:\n\n${
              history.filter(msg => msg.role === 'assistant').map(msg => msg.content).join("\n\n")
            }`
          }
        ],
        reasoning_effort: "medium"
      };
      logApi("Final design request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);

      const finalDesign = JSON.parse(response.choices[0].message.content || "{}");

      history.push({
        role: 'assistant',
        content: `Final Game Design:\n${finalDesign.gameDescription}\n\nCore Mechanics:\n${finalDesign.coreMechanics.join("\n")}`
      });

      logApi("Final design generated", { finalDesign }, null, logOpenAIParams(requestConfig));
      res.json({
        ...finalDesign,
        history
      });
    } catch (error: any) {
      logApi("Error in final design", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/design/generate-features", async (req, res) => {
    try {
      const { gameDesign, currentFeatures } = req.body;
      const user = (req as any).user;

      if (!gameDesign) {
        throw new Error("Game design is required");
      }

      logApi("Generating features request", { gameDesign, currentFeatures });

      const requestConfig = {
        model: user.analysis_model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a game design assistant helping to break down game features into implementation tasks.
Analyze the game design and suggest specific, implementable features that would enhance the game.
Focus on concrete features that can be implemented with HTML5 Canvas and JavaScript.
Format your response as JSON with this structure:
{
  "features": [
    "Feature 1: Detailed description",
    "Feature 2: Detailed description",
    "Feature 3: Detailed description",
    ...
  ]
}`
          },
          {
            role: "user",
            content: `Based on this game design, suggest specific features to implement:
Game Description:
${gameDesign.gameDescription}

Core Mechanics:
${gameDesign.coreMechanics.join("\n")}

Technical Requirements:
${gameDesign.technicalRequirements.join("\n")}

Implementation Approach:
${gameDesign.implementationApproach}

Current Features:
${currentFeatures ? currentFeatures.map((f: any) => f.description).join("\n") : "No features yet"}

Please suggest new concrete, implementable features that would enhance this game design.
Focus on features that can be implemented using HTML5 Canvas and JavaScript.
Each feature should be specific and actionable.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      };
      logApi("Generate features request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);

      const suggestions = JSON.parse(response.choices[0].message.content || "{}");

      logApi("Feature suggestions generated", { gameDesign }, suggestions, logOpenAIParams(requestConfig));
      res.json(suggestions);
    } catch (error: any) {
      logApi("Error generating feature suggestions", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update the generate endpoint
  app.post("/api/design/generate", async (req, res) => {
    try {
      const { sessionId, followUpAnswers, analyses, modelConfig, generationPrompt } = req.body;
      const userId = (req.session as any).userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const history = designConversations.get(sessionId);
      if (!history) {
        throw new Error("No design conversation found");
      }

      logApi("Game generation request", { sessionId, modelConfig }, null, logOpenAIParams(modelConfig));

      if (followUpAnswers) {
        Object.entries(followUpAnswers).forEach(([question, answer]) => {
          history.push({
            role: 'user',
            content: `Follow-up Question: ${question}\nAnswer: ${answer}`
          });
        });
      }

      let gameRequirements = "";
      if(analyses){
        gameRequirements = history
          .filter(msg => msg.role === 'assistant')
          .map(msg => msg.content)
          .join('\n\n');
      }

      const baseConfig = {
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: generationPrompt || `Based on these game requirements and our discussion, create a complete HTML5 Canvas game implementation:\n\n${gameRequirements}`
          }
        ]
      };

      // Add model-specific configurations
      const requestConfig = getModelConfig(modelConfig.model, {
        ...baseConfig,
        ...modelConfig
      });

      logApi("Generate request config:", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);
      const content = response.choices[0].message.content || "";
      const code = extractGameCode(content);

      const result = {
        code,
        response: content
      };

      logApi("Game code generated", { sessionId }, result, logOpenAIParams(requestConfig));
      res.json(result);
    } catch (error: any) {
      console.error('Game generation error:', error);
      logApi("Error generating game", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, modelConfig } = req.body;
      const user = (req as any).user;

      logApi("Chat request received", { prompt, modelConfig });

      const baseConfig = {
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          { role: "user", content: prompt }
        ]
      };

      // Use model-specific configuration
      const requestConfig = getModelConfig(modelConfig?.model || user.code_gen_model || "gpt-4o", {
        ...baseConfig,
        ...modelConfig
      });

      logApi("Chat request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);
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
        code
      };

      logApi("Chat response generated", { prompt }, result, logOpenAIParams(requestConfig));
      res.json(result);
    } catch(error: any) {
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

  app.post("/api/games", async (req, res) =>{
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
      const games= await storage.getAllGames();
      logApi(`Retrieved ${games.length} games`, req.query, { count: games.length });
      res.json(games);
    } catch (error: any) {
      logApi("Error getting games", req.query, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update the code chat endpoint to use passed model config
  app.post("/api/code/chat", async (req, res) => {
    try {
      const { code, message, gameDesign, debugContext, isNonTechnicalMode, modelConfig } = req.body;
      const user = (req as any).user;

      logApi("Code chat request received", { message, isNonTechnicalMode });

      const systemPrompt = isNonTechnicalMode
        ? `You are a friendly game development assistant helping create HTML5 Canvas games.
Explain things in simple terms as if talking to someone new to programming.
When explaining code or changes:
1. Use everyday analogies and simple examples
2. Avoid technical jargon - when you must use it, explain it simply
3. Focus on what the code does, not how it works internally
4. Use friendly, encouraging language
5. Break down complex concepts into simple steps
6. Always wrap the code between +++CODESTART+++ and +++CODESTOP+++ markers
7. The canvas and context variables are already provided`
        : `You are a game development assistant specialized in HTML5 Canvas games.
When modifying code:
1. ALWAYS provide the COMPLETE updated code, never partial updates
2. Always wrap the entire updated code between +++CODESTART+++ and +++CODESTOP+++ markers
3. Explain the changes you're making in clear, simple terms
4. Maintain game functionality and style consistency
5. Include initialization and cleanup code
6. The canvas and context variables are already provided, DO NOT create them
7. Assume canvas and ctx are available in the scope
8. DO NOT include HTML, just the JavaScript game code`;

      const baseConfig = {
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ]
      };

      // Use model-specific configuration
      const requestConfig = getModelConfig(modelConfig?.model || user.code_gen_model || "gpt-4o", {
        ...baseConfig,
        ...modelConfig
      });

      logApi("Code chat request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);

      const content = response.choices[0].message.content || "";
      const updatedCode = extractGameCode(content);

      const result = {
        content,
        updatedCode
      };

      logApi("Code chat response", { message }, result, logOpenAIParams(requestConfig));
      res.json(result);
    } catch (error: any) {
      logApi("Error in code chat", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/code/remix", async (req, res) => {
    try {
      const { code, features } = req.body;
      const userId = (req.session as any).userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const requestConfig = {
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: `You are a game development assistant specialized in improving HTML5 Canvas games.
When providing suggestions:
1. Analyze the current game code and suggest 3 specific improvements that could make the game more engaging
2. Focus on implementing these remaining features: ${features?.join(", ")}
3. Format your responseas JSON with this structure:
{
  "questions": [
    "Suggestion 1: [Brief description of the first improvement]",
    "Suggestion 2: [Brief description of the second improvement]",
    "Suggestion 3: [Brief description of the third improvement]"
  ]
}`
          },
          {
            role: "user",
            content: `Please analyze this game code and suggest 3 improvements that help implement these remaining features: ${features?.join(", ")}\n\n${code}`
          }
        ],
        reasoning_effort: "medium"
      };
      logApi("Remix request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);

      const suggestions = JSON.parse(response.choices[0].message.content || "{}");

      logApi("Remix suggestions generated", { code }, suggestions, logOpenAIParams(requestConfig));
      res.json(suggestions);
    } catch (error: any) {
      console.error('Error generating remix suggestions:', error);
      logApi("Error generating remix suggestions", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/code/debug", async (req, res) => {
    try {
      const { code, error, isNonTechnicalMode } = req.body;
      const user = (req as any).user;

      if (!error || !code) {
        return res.status(400).json({
          error: "Missing Information",
          message: isNonTechnicalMode
            ? "I need to see the game running first to help fix any problems. Could you try playing the game and let me know what's not working?"
            : "Please run the game first so I can help fix any errors.",
        });
      }
      logApi("Debug request received", { error });

      const systemPrompt = isNonTechnicalMode
        ? `You are a friendly game helper who explains problems in simple terms.
Help fix game problems using everyday language and simple explanations.

When explaining fixes:
1. Explain what's wrong in simple, friendly terms
2. Use everyday examples to explain the solution
3. Break down the fix into easy steps
4. Avoid technical terms - if you must use them, explain them simply
5. Be encouraging and positive

Remember:
- Focus on what the game should do vs what it's doing
- Explain things like you're talking to a friend
- Keep it simple and clear- Always include the complete fixed code between +++CODES
TART+++ and +++CODESTOP+++ markers

Format your response as:
1. 🎮 What's not working? (simple explanation)
2. 💡 Here's how we'll fix it (in friendly terms)
3. Complete fixed code between the markers`
        : `You are a helpful game debugging assistant.
Help fix HTML5 Canvas game errors in simple, clear language.

When explaining fixes:
1. Identify the core problem in simple terms
2. Suggest a clear solution
3. Provide the complete fixed code

Remember:
- Focus on common game issues (collisions, animations, input handling)
- Explain in non-technical terms
- Always include the full working code
- Analyze both the error and any additional debug context

Format your response as:
1. 🎮 What went wrong? (simple explanation)
2. 💡 How we'll fix it
3. Complete fixed code between +++CODESTART+++ and +++CODESTOP+++ markers`;

      const requestConfig = {
        model: user.code_gen_model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `The game has this error:
${error}

Here's the current code:
${code}

Please help fix this issue!`
          }
        ],
        temperature: 0.7,
        max_tokens: 16000
      };
      logApi("Debug request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);

      const content = response.choices[0].message.content || "";
      const updatedCode = extractGameCode(content);

      if (!updatedCode) {
        throw new Error("Could not generate valid fixed code");
      }

      const explanation = content
        .replace(/\+\+\+CODESTART\+\+\+[\s\S]*\+\+\+CODESTOP\+\+\+/, '')
        .trim();

      const result = {
        message: explanation,
        updatedCode
      };

      logApi("Debug suggestions generated", { error }, result, logOpenAIParams(requestConfig));
      res.json(result);
    } catch (error: any) {
      logApi("Error in debug", req.body, { error: error.message });
      res.status(500).json({
        error: "Debug Helper Error",
        message: "I couldn't analyze the game properly. Please try running the game again to get fresh error information.",
        details: error.message
      });
    }
  });

  app.post("/api/features", async (req, res) => {
    try {
      const feature = insertFeatureSchema.parse(req.body);
      const created = await storage.createFeature(feature);
      logApi("New feature created", req.body, created);
      res.json(created);
    } catch (error: any) {
      logApi("Error creating feature", req.body, { error: error.message });
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/features", async (req, res) => {
    try {
      const gameId = req.query.gameId ? parseInt(req.query.gameId as string) : undefined;
      const features = await storage.getAllFeatures(gameId);
      logApi(`Retrieved ${features.length} features`, req.query, { count: features.length });
      res.json(features);
    } catch (error: any) {
      logApi("Error getting features", req.query, { error: error.message });
    }
  });

  app.patch("/api/features/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = req.body;
      const updated = await storage.updateFeatureStatus(id, completed);
      logApi("Feature status updated", { id, completed }, updated);
      res.json(updated);
    } catch (error: any) {
      logApi("Error updating feature", req.body, { error: error.message });
      res.status(400).json({ error: error.message });
    }
  });

  // Update hint generation endpoint
  app.post("/api/hint", async (req, res) => {
    try {
      const { context, currentFeature, modelConfig } = req.body;
      const user = (req as any).user;

      if (!context || !currentFeature) {
        throw new Error("Both context and currentFeature are required");
      }

      logApi("Hint request received", { context, currentFeature });

      const baseConfig = {
        messages: [
          {
            role: "system",
            content: `You are a game development mentor helping students learn Canvas game programming.
When giving hints:
1. Don't give away the complete solution
2. Point in the right direction without full implementation details
3. Use encouraging, supportive language
4. Keep hints concise and focused
5. Relate to what they're currently working on`
          },
          {
            role: "user",
            content: `I'm working on this feature: "${currentFeature}"
Current context: ${context}
Can you give me a hint on how to proceed?`
          }
        ]
      };

      // Use model-specific configuration
      const requestConfig = getModelConfig(modelConfig?.model || user.code_gen_model || "gpt-4o", {
        ...baseConfig,
        ...modelConfig
      });

      logApi("Hint request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);

      const hint = response.choices[0].message.content || "Keep up the great work! 🎮";

      logApi("Hint generated", { hint }, null, logOpenAIParams(requestConfig));
      res.json({ hint });
    } catch (error: any) {
      logApi("Error generating hint", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  async function handleAndroidBuild(buildDir: string, options: {
    gameCode: string;
    appName: string;
    packageName: string;
  }) {
    const execAsync = promisify(exec);
    const buildLogs: string[] = [];

    function log(message: string, details?: any) {
      const logMessage = details ? `${message}: ${JSON.stringify(details)}` : message;
      buildLogs.push(logMessage);
      console.log(logMessage);
      addDebugLog?.(`🔧 Android Build: ${logMessage}`);
    }

    try {
      // Create fresh build directory
      log('Setting up build environment');
      await fs.rm(buildDir, { recursive: true, force: true });
      await fs.mkdir(buildDir, { recursive: true });

      // Create www directory first
      const wwwDir = path.join(buildDir, 'www');
      await fs.mkdir(wwwDir, { recursive: true });

      // Create index.html in www directory
      log('Creating game files');
      const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${options.appName}</title>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js"></script>
    <script nomodule src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css"/>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
        body { position: fixed; touch-action: none; }
        canvas { 
            display: block;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 100vw;
            max-height: 100vh;
        }
    </style>
</head>
<body>
    <ion-app>
        <ion-content>
            <canvas id="canvas"></canvas>
        </ion-content>
    </ion-app>
    <script>
        // Setup Ionic PWA Elements
        import { defineCustomElements } from 'https://cdn.jsdelivr.net/npm/@ionic/pwa-elements/loader/index.es2017.mjs';
        defineCustomElements(window);

        // Handle mobile events
        document.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });

        // Setup canvas
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const scale = Math.min(windowWidth / 800, windowHeight / 600);

            canvas.width = 800;
            canvas.height = 600;
            canvas.style.width = (800 * scale) + 'px';
            canvas.style.height = (600 * scale) + 'px';
        }

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', resizeCanvas);
        resizeCanvas();

        // Game code
        ${options.gameCode}
    </script>
</body>
</html>`;

      await fs.writeFile(path.join(wwwDir, 'index.html'), html);

      // Initialize npm project
      log('Initializing npm project');
      await fs.writeFile(path.join(buildDir, 'package.json'), JSON.stringify({
        name: options.packageName.replace(/\./g, '-'),
        version: "1.0.0",
        private: true
      }));

      // Install dependencies
      log('Installing dependencies');
      try {
        await execAsync('npm install @capacitor/core @capacitor/cli @capacitor/android @ionic/core @ionic/pwa-elements', { cwd: buildDir });
        log('Dependencies installed successfully');
      } catch (error: any) {
        const errorMsg = `Failed to install dependencies: ${error.message}\nstdout: ${error.stdout}\nstderr: ${error.stderr}`;
        log('Dependencies installation failed', { error: errorMsg });
        throw new Error(errorMsg);
      }

      // Create capacitor config
      log('Creating Capacitor configuration');
      const capacitorConfig = {
        appId: options.packageName,
        appName: options.appName,
        webDir: "www",
        server: {
          androidScheme: "https",
          cleartext: true
        },
        plugins: {
          SplashScreen: {
            launchShowDuration:0
          }
        },
        android: {
          allowMixedContent: true,
          captureInput: true,
          webContentsDebuggingEnabled: true
        }
      };

      await fs.writeFile(
        path.join(buildDir, 'capacitor.config.json'),
        JSON.stringify(capacitorConfig, null, 2)
      );

      // Initialize Capacitor project
      log('Initializing Capacitor project');
      try {
        const initResult = await execAsync(`npx cap init "${options.appName}" "${options.packageName}" --web-dir www`, { cwd: buildDir });
        log('Capacitor initialization completed', { stdout: initResult.stdout, stderr: initResult.stderr });
      } catch (error: any) {
        const errorMsg = `Capacitor initialization failed: ${error.message}\nstdout: ${error.stdout}\nstderr: ${error.stderr}`;
        log('Capacitor init failed', { error: errorMsg });
        throw new Error(errorMsg);
      }

      // Add Android platform
      log('Adding Android platform');
      try {
        const platformResult = await execAsync('npx cap add android', { cwd: buildDir });
        log('Android platform added successfully', { stdout: platformResult.stdout, stderr: platformResult.stderr });
      } catch (error: any) {
        const errorMsg = `Failed to add Android platform: ${error.message}\nstdout: ${error.stdout}\nstderr: ${error.stderr}`;
        log('Adding Android platform failed', { error: errorMsg });
        throw new Error(errorMsg);
      }

      // Sync web content with Android project
      log('Syncing web content');
      try {
        const syncResult = await execAsync('npx cap sync android', { cwd: buildDir });
        log('Content synced successfully', { stdout: syncResult.stdout, stderr: syncResult.stderr });
      } catch (error: any) {
        const errorMsg = `Failed to sync content: ${error.message}\nstdout: ${error.stdout}\nstderr: ${error.stderr}`;
        log('Content sync failed', { error: errorMsg });
        throw new Error(errorMsg);
      }

      // Build debug APK
      log('Building debug APK');
      try {
        const buildResult = await execAsync('cd android && ./gradlew assembleDebug', { cwd: buildDir });
        log('APK build completed', { stdout: buildResult.stdout, stderr: buildResult.stderr });
      } catch (error: any) {
        const errorMsg = `Failed to build APK: ${error.message}\nstdout: ${error.stdout}\nstderr: ${error.stderr}`;
        log('APK build failed', { error: errorMsg });
        throw new Error(errorMsg);
      }

      const apkPath = path.join(buildDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

      try {
        await fs.access(apkPath);
        log('APK built successfully at:', apkPath);
      } catch (error) {
        const errorMsg = 'APK not found at expected location: ' + apkPath;
        log('APK verification failed', { error: errorMsg });
        throw new Error(errorMsg);
      }

      return {
        apkPath,
        logs: buildLogs,
        downloadUrl: `/download/android/${path.basename(apkPath)}`
      };
    } catch (error: any) {
      const fullError = `Build process failed: ${error.message}`;
      log('Build process failed', { error: fullError, logs: buildLogs });
      throw {
        message: fullError,
        logs: buildLogs
      };
    }
  }

  // Add this to your routes handler
  app.post("/api/build/android", async (req, res) => {
    try {
      const { gameCode, appName, packageName } = req.body;
      logApi("Android build request", { appName, packageName });

      if (!gameCode || !appName || !packageName) {
        const errorMsg = "Missing required build information. Please provide game code, app name and package name.";
        logApi("Build validation failed", { error: errorMsg });
        throw new Error(errorMsg);
      }

      const packageNameRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
      if (!packageNameRegex.test(packageName)) {
        const errorMsg = "Invalid package name format. Must be like 'com.example.game'";
        logApi("Package name validation failed", { error: errorMsg, packageName });
        throw new Error(errorMsg);
      }

      const buildDir = path.join(process.cwd(), 'android-build');

      try {
        const result = await handleAndroidBuild(buildDir, {
          gameCode,
          appName,
          packageName
        });

        logApi("Build completed successfully", { downloadUrl: result.downloadUrl });
        res.json({
          downloadUrl: result.downloadUrl,
          logs: result.logs
        });
      } catch (buildError: any) {
        logApi("Build process failed", { error: buildError.message, logs: buildError.logs });
        res.status(500).json({
          error: "Build failed",
          message: buildError.message,
          logs: buildError.logs,
          details: "Check the build logs for more information"
        });
      }
    } catch (error: any) {
      res.status(400).json({
        error: "Invalid build configuration",
        message: error.message
      });
    }
  });

  app.get("/download/android/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'android-build', 'android', 'app', 'build', 'outputs', 'apk', 'debug', filename);
    res.download(filePath);
  });

  // Update the models endpoint to use dynamic fetching
  app.get("/api/models", async (req, res) => {
    try {
      const models = await getAvailableModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch models",
        message: "Using default models"
      });
    }
  });

  // Add new endpoint for fetching model parameters
  app.get("/api/model-parameters/:model", async (req, res) => {
    try {
      const { model } = req.params;

      // Query OpenAI for model information
      const modelInfo = await openai.models.retrieve(model);

      // Format the parameters based on model type
      const parameters: Record<string, any> = {
        temperature: {
          type: "float",
          min: 0,
          max: 2,
          default: 0.7,
          description: "Controls randomness in the output"
        },
        max_tokens: {
          type: "integer",
          min: 1,
          max: modelInfo.context_window || 16000,
          default: 8000,
          description: "Maximum number of tokens to generate"
        }
      };

      // Add model-specific parameters
      if (model.startsWith('o1')) {
        parameters.max_completion_tokens = {
          type: "integer",
          min: 1,
          max: modelInfo.context_window || 16000,
          default: 8000,
          description: "Maximum number of tokens to generate (O1 models)"
        };
      }

      // Add response format for supported models
      if (!model.includes('instruct')) {
        parameters.response_format = {
          type: "enum",
          values: ["text", "json_object"],
          default: "text",
          description: "Format of the response"
        };
      }

      logApi(`Retrieved parameters for model ${model}`, {}, parameters);
      res.json(parameters);
    } catch (error: any) {
      logApi("Error fetching model parameters", { model: req.params.model }, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Add route to update user's model preference
  app.patch("/api/users/model-preference", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const { model } = req.body;

      const [updatedUser] = await db
        .update(users)
        .set({ modelPreference: model })
        .where(eq(users.id, user.id))
        .returning();

      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add route to get available models
  app.get("/api/models", isAuthenticated, async (req, res) => {
    try {
      const models = await getAvailableModels();
      res.json(models);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add this to the existing routes in registerRoutes function
  app.post("/api/users", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;

      // Check if the requester is an admin
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Only administrators can create users" });
      }

      const newUser = insertUserSchema.parse(req.body);
      const created = await storage.createUser(newUser);

      // Remove sensitive information before sending response
      const { password, ...safeUser } = created;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update route to handle separate model preferences
  app.patch("/api/users/model-preferences", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const { analysisModel, codeGenModel } = req.body;

      const [updatedUser] = await db
        .update(users)
        .set({
          analysis_model: analysisModel,
          code_gen_model: codeGenModel
        })
        .where(eq(users.id, user.id))
        .returning();

      res.json({
        username: updatedUser.username,
        role: updatedUser.role,
        forcePasswordChange: updatedUser.forcePasswordChange,
        analysis_model: updatedUser.analysis_model || "gpt-4o",
        code_gen_model: updatedUser.code_gen_model || "gpt-4o"
      });
    } catch (error: any) {
      console.error('Model preferences update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/design/analyze-development-plan", isAuthenticated, async (req, res) => {
    try {
      const { gameDesign, currentFeatures, history } = req.body;
      const userId = (req.session as any).userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      logApi("Analyzing development plan", { gameDesign, currentFeatures });

      const baseConfig = {
        messages: [
          {
            role: "system",
            content: `You are a game development project manager helping to break down game implementation into manageable steps.
Analyze the game design and create:
1. A base game implementation prompt that covers core functionality
2. A list of 10 additional features/steps to complete the game
Format your response as JSON with this structure:
{
  "baseGamePrompt": "string (detailed prompt for initial implementation)",
  "developmentSteps": [
    "Step 1: Implement X feature with specific details",
    "Step 2: Add Y functionality including...",
    ...
  ]
}`
          },
          {
            role: "user",
            content: `Based on this game design, create a development plan:
Game Description:
${gameDesign.gameDescription}

Core Mechanics:
${gameDesign.coreMechanics.join("\n")}

Technical Requirements:
${gameDesign.technicalRequirements.join("\n")}

Implementation Approach:
${gameDesign.implementationApproach}

Design Discussion History:
${history.map(msg => `${msg.role}: ${msg.content}`).join("\n")}

Current Features:
${currentFeatures ? currentFeatures.join("\n") : "No features implemented yet"}

Please create a structured plan for implementing this game, starting with a solid foundation and then building up additional features.`
          }
        ],
        reasoning_effort: "medium"
      };

      const requestConfig = getModelConfig("o1", baseConfig);
      logApi("Development plan request", {}, null, logOpenAIParams(requestConfig));

      const response = await openai.chat.completions.create(requestConfig);
      const resultContent = response.choices[0].message.content || "{}";

      // Since O1 doesn't support response_format, we need to ensure the response is valid JSON
      let plan;
      try {
        plan = JSON.parse(resultContent);
      } catch (error) {
        console.error('Failed to parse O1 response as JSON:', resultContent);
        // Extract JSON-like structure from the response using regex
        const jsonMatch = resultContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract valid JSON from model response');
        }
      }

      logApi("Development plan generated", null, plan, logOpenAIParams(requestConfig));
      res.json(plan);
    } catch (error: any) {
      console.error('Development plan error:', error);
      logApi("Error generating development plan", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
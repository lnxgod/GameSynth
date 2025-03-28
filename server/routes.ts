import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { 
  insertChatSchema, 
  insertGameSchema, 
  insertFeatureSchema, 
  insertUserSchema,
  insertGameDesignSchema
} from "@shared/schema";
import { gameTemplates } from "@shared/schema";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from "path";
import fs from "fs/promises";
import { chats, games, features, users } from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';
import bcrypt from "bcryptjs";
import { z } from 'zod';
import OpenAI from "openai";
import { makeCompletionRequest, makeChatCompletionRequest, makeJsonCompletionRequest, generateGameIdea } from './openai';

// Helper function to make OpenAI requests with strict parameter control
async function makeOpenAIRequest(config: any) {
  // Start with only the essential parameters
  const baseRequest: {
    model: string;
    messages: any[];
    [key: string]: any;
  } = {
    model: config.model,
    messages: config.messages
  };

  // Only add parameters that were explicitly set by the user through the UI
  if (config.parameters) {
    logWithTimestamp('Parameters received from client:', config.parameters);
    Object.entries(config.parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        baseRequest[key] = value;
      }
    });
  }

  // Only add response_format if specifically requested
  if (config.response_format) {
    baseRequest.response_format = config.response_format;
  }

  logWithTimestamp('Final OpenAI request configuration:', baseRequest);

  // Create a new instance of the OpenAI client with API key
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  try {
    return await openaiClient.chat.completions.create(baseRequest);
  } catch (error: any) {
    logWithTimestamp('OpenAI API Error:', error.message);
    throw error;
  }
}


// Store prompts in memory with defaults
const SystemPrompts = {
  DESIGN_ASSISTANT_PROMPT: `You are a game design assistant helping users create HTML5 Canvas games. 
Analyze the specific game aspect provided and elaborate on its implementation details.
Focus on concrete, implementable features and mechanics.
Format your response as JSON with the following structure:
{
  "analysis": "Detailed analysis of this game aspect",
  "implementation_details": ["List of specific features or mechanics to implement"],
  "technical_considerations": ["Technical aspects to consider"]
}`,

  FINAL_PROMPT_ASSISTANT: `You are a game design assistant helping create HTML5 Canvas games.
Review all the analyzed aspects and create a comprehensive game design document.
Consider how all elements work together and ensure the game will be fun and technically feasible.
Format your response as JSON with this structure:
{
  "gameDescription": "Complete game description",
  "coreMechanics": ["List of core mechanics"],
  "technicalRequirements": ["Technical requirements"],
  "implementationApproach": "Suggested implementation approach",
  "needsMoreInfo": boolean,
  "additionalQuestions": ["Any clarifying questions if needed"]
}`,

  SYSTEM_PROMPT: `You are a game development assistant specialized in creating HTML5 Canvas games.
When providing code:
1. Always wrap the game code between +++CODESTART+++ and +++CODESTOP+++ markers
2. Focus on creating interactive, fun games using vanilla phaser.js
3. Include clear comments explaining the game mechanics
4. Return fully working, self-contained game code that handles its own game loop
5. Use requestAnimationFrame for animation
6. Handle cleanup properly when the game stops`,
  DEBUG_FRIENDLY: `You are a friendly game development assistant helping create HTML5 Canvas games.
Explain things in simple terms as if talking to someone new to programming.
When explaining code or changes:
1. ALWAYS provide the COMPLETE updated code with original code PLUS your modifications, never partial updates
2. Always wrap the ENTIRE game code (original + your changes) between +++CODESTART+++ and +++CODESTOP+++ markers
3. Preserve all existing game functionality when adding new features
4. Use everyday analogies and simple examples
5. Avoid technical jargon - when you must use it, explain it simply
6. Focus on what the code does, not how it works internally
7. Use friendly, encouraging language
8. Break down complex concepts into simple steps
9. The canvas and context variables are already provided
10. EXTREMELY IMPORTANT: When implementing a feature, you MUST include 100% of the original code and add your new code to it
11. Do NOT skip any parts of the original code when returning your implementation`,
  DEBUG_TECHNICAL: `You are a game development assistant specialized in HTML5 Canvas games.
When modifying code:
1. ALWAYS provide the COMPLETE updated code with original code PLUS your modifications, never partial updates
2. Always wrap the ENTIRE game code (original + your changes) between +++CODESTART+++ and +++CODESTOP+++ markers
3. Preserve all existing game functionality when adding new features
4. Explain the changes you're making in clear, simple terms
5. Maintain game functionality and style consistency
6. Include initialization and cleanup code
7. The canvas and context variables are already provided, DO NOT create them
8. Assume canvas and ctx are available in the scope
9. DO NOT include HTML, just the JavaScript game code
10. EXTREMELY IMPORTANT: When implementing a feature, you MUST include 100% of the original code and add your new code to it
11. Do NOT skip any parts of the original code when returning your implementation`
};

// API Logs array with type definition
interface ApiLog {
  timestamp: string;
  message: string;
  request?: any;
  response?: any;
  openAIConfig?: any;
}

const apiLogs: ApiLog[] = [];

function logApi(message: string, request?: any, response?: any, openAIConfig?: any) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = {
    timestamp,
    message,
    request: request ? JSON.stringify(request, null, 2) : undefined,
    response: response ? JSON.stringify(response, null, 2) : undefined,
    openAIConfig: openAIConfig ? JSON.stringify(openAIConfig, null, 2) : undefined
  };

  apiLogs.push(logEntry);

  // Keep log size manageable
  if (apiLogs.length > 100) {
    apiLogs.shift();
  }

  // Log to console for debugging
  console.log(`[${timestamp}] ${message}`);
  if (openAIConfig) {
    console.log('Model Configuration:', openAIConfig);
  }
}

const logWithTimestamp = (message: string, ...args: any[]) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`, ...args);
};

const designConversations = new Map<string, Array<{
  role: 'assistant' | 'user';
  content: string;
}>>();

function extractGameCode(content: string): string | null {
  try {
    console.log('Starting code extraction...');

    // First, try with explicit markers
    const startMarker = '+++CODESTART+++';
    const endMarker = '+++CODESTOP+++';

    let startIndex = content.indexOf(startMarker);
    let endIndex = content.indexOf(endMarker);

    // If explicit markers aren't found, look for code blocks
    if (startIndex === -1 || endIndex === -1) {
      console.log('No explicit markers found, looking for code blocks');
      
      // Try to find code blocks with JavaScript/JS markers
      const jsBlockRegex = /```(?:javascript|js)([\s\S]*?)```/;
      const jsMatch = content.match(jsBlockRegex);
      
      if (jsMatch && jsMatch[1]) {
        console.log('Found JavaScript code block');
        return jsMatch[1].trim();
      }
      
      // Try to find any code blocks
      const anyBlockRegex = /```([\s\S]*?)```/;
      const anyMatch = content.match(anyBlockRegex);
      
      if (anyMatch && anyMatch[1]) {
        console.log('Found generic code block');
        return anyMatch[1].trim();
      }
      
      // If still not found, log the error
      console.log('ERROR: No valid code markers or blocks found in response');
      console.log('Content preview (first 500 chars):', content.substring(0, 500) + '...');
      return null;
    }

    // Process code with explicit markers
    let code = content
      .substring(startIndex + startMarker.length, endIndex)
      .trim();

    // Extract code from script tags if present (for HTML responses)
    if (code.includes('<script>')) {
      const scriptStart = code.indexOf('<script>') + 8;
      const scriptEnd = code.indexOf('</script>');
      if (scriptEnd > scriptStart) {
        code = code.substring(scriptStart, scriptEnd).trim();
      }
    }

    // Clean up any HTML structure that might have been included
    code = code.replace(/<!DOCTYPE.*?>/i, '');
    code = code.replace(/<html>[\s\S]*?<body>/i, '');
    code = code.replace(/<\/body>[\s\S]*?<\/html>/i, '');

    // Remove canvas initialization that might be duplicated
    code = code.replace(/const canvas\s*=\s*document\.getElementById[^;]+;/, '');
    code = code.replace(/const ctx\s*=\s*canvas\.getContext[^;]+;/, '');

    // Remove code block formatting if present
    code = code.replace(/^```(?:javascript|js)?\s*\n?/, '');
    code = code.replace(/\n?```$/, '');

    // Check for truncation markers
    if (code.includes('...') && code.trim().endsWith('...')) {
      console.log('WARNING: Code appears to be truncated');
    }

    if (!code) {
      console.log('ERROR: Empty code block found');
      return null;
    }

    console.log('Extracted code successfully');
    console.log('Code preview (first 300 chars):', code.substring(0, 300) + '...');
    return code;

  } catch (error) {
    console.error('Code extraction failed:', error);
    return null;
  }
}


if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

export async function registerRoutes(app: Express) {
  // Ensure database is initialized
  try {
    await storage.ensureDefaultAdmin();
    console.log('Database initialized with admin user');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }

  // Update the GET /api/prompts endpoint at the top of the file
  app.get("/api/prompts", async (req, res) => {
    try {
      // Convert SystemPrompts object to array format expected by frontend
      const promptsArray = Object.entries(SystemPrompts).map(([id, content]) => ({
        id,
        name: id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
        description: "System prompt for controlling AI response format and behavior",
        content,
        category: "System"
      }));

      res.json(promptsArray);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update prompts
  app.post("/api/prompts", async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can update prompts" });
      }

      const { promptKey, newPrompt } = req.body;
      if (!promptKey || !newPrompt || !SystemPrompts.hasOwnProperty(promptKey)) {
        return res.status(400).json({ error: "Invalid prompt key or value" });
      }

      SystemPrompts[promptKey as keyof typeof SystemPrompts] = newPrompt;
      res.json({ message: "Prompt updated successfully", promptKey, newPrompt });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  //New User Management Endpoints
  app.get("/api/users", async (req, res) => {
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

  app.patch("/api/users/:id/role", async (req, res) => {
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

  app.post("/api/users/:id/reset-password", async (req, res) => {
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

  app.delete("/api/users/:id", async (req, res) => {
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
  app.post("/api/game-designs", async (req, res) => {
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

  app.get("/api/game-designs", async (req, res) => {
    try {
      const user = (req as any).user;
      const designs = await storage.getAllGameDesigns(user.id);
      res.json(designs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/game-designs/:id", async (req, res) => {
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

  app.put("/api/game-designs/:id", async (req, res) => {
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

  app.delete("/api/game-designs/:id", async (req, res) => {
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

  // Keep existing routes, removing auth middleware
  app.use(["/api/chat", "/api/chats", "/api/games", "/api/features", "/api/code/chat", "/api/code/remix", "/api/code/debug", "/api/hint", "/api/build/android", "/api/users", "/api/game-designs"], async (req, res, next) => { next() });


  app.get("/api/logs", (req, res) => {
    res.json(apiLogs);
  });

  // Update the analyze endpoint to use the new approach
  app.post("/api/design/analyze", async (req, res) => {
    try {
      const { aspect, content, sessionId, model, parameters } = req.body;

      if (!designConversations.has(sessionId)) {
        designConversations.set(sessionId, []);
      }
      const history = designConversations.get(sessionId)!;

      logApi(`Analyzing ${aspect}`, { aspect, content, model, parameters });

      const requestConfig = {
        model: model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: SystemPrompts.DESIGN_ASSISTANT_PROMPT
          },
          {
            role: "user",
            content: `Analyze this ${aspect} requirement for an HTML5 Canvas game: ${content}`
          }
        ],
        response_format: { type: "json_object" },
        parameters // Pass through any explicitly set parameters
      };

      const response = await makeOpenAIRequest(requestConfig);
      const analysis = JSON.parse(response.choices[0].message.content || "{}");

      history.push({
        role: 'assistant',
        content: `Analysis of ${aspect}:\n${analysis.analysis}\n\nImplementation details:\n${analysis.implementation_details.join("\n")}`
      });

      logApi(`Analysis complete for ${aspect}`, { analysis });
      res.json(analysis);
    } catch (error: any) {
      logApi("Error in analysis", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/design/finalize", async (req, res) => {
    try {
      const { sessionId, model, parameters } = req.body;
      const user = (req as any).user;
      const history = designConversations.get(sessionId);

      if (!history) {
        throw new Error("No design conversation found");
      }

      logApi("Generating final design", { sessionId, model, parameters });

      const requestConfig = {
        model: model || user.analysis_model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: SystemPrompts.FINAL_PROMPT_ASSISTANT
          },
          {
            role: "user",
            content: `Create a comprehensive game design based on these analyses:\n\n${
              history.filter(msg => msg.role === 'assistant').map(msg => msg.content).join("\n\n")
            }`
          }
        ],
        response_format: { type: "json_object" },
        parameters
      };

      const response = await makeOpenAIRequest(requestConfig);

      const finalDesign = JSON.parse(response.choices[0].message.content || "{}");

      history.push({
        role: 'assistant',
        content: `Final Game Design:\n${finalDesign.gameDescription}\n\nCore Mechanics:\n${finalDesign.coreMechanics.join("\n")}`
      });

      logApi("Final design generated", { finalDesign });
      res.json({
        ...finalDesign,
        history
      });
    } catch (error: any) {
      logApi("Error in final design", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update the generate features endpoint
  app.post("/api/design/generate-features", async (req, res) => {
    try {
      const { gameDesign, currentFeatures, model, parameters } = req.body;
      logWithTimestamp('Feature generation request received', { model, parameters });

      if (!gameDesign) {
        throw new Error("Game design is required");
      }

      const requestConfig = {
        model: model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a game design assistant helping to break down game features into implementation tasks.
Analyze the game design and suggest specific, implementable features that would enhance the game.
Format your response as JSON with this structure:
{
  "features": [
    "Feature 1: Detailed description",
    "Feature 2: Detailed description",
    "Feature 3: Detailed description"
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
        parameters // Pass through any explicitly set parameters
      };

      logWithTimestamp('Sending request to OpenAI with config:', requestConfig);
      const response = await makeOpenAIRequest(requestConfig);
      logWithTimestamp('Received response from OpenAI');

      const suggestions = JSON.parse(response.choices[0].message.content || "{}");
      logWithTimestamp('Parsed suggestions:', suggestions);

      res.json(suggestions);
    } catch (error: any) {
      logWithTimestamp('Error in feature generation:', error);
      res.status(500).json({
        error: error.message,
        details: "Check server logs for more information"
      });
    }
  });

  app.post("/api/design/generate", async (req, res) => {
    try {
      const { sessionId, followUpAnswers, analyses, settings, model, parameters } = req.body;
      const user = (req as any).user;
      const history = designConversations.get(sessionId);

      if (!history) {
        throw new Error("No design conversation found");
      }

      logApi("Game generation request", { sessionId, settings, model, parameters });

      if (followUpAnswers) {
        Object.entries(followUpAnswers).forEach(([question, answer]) => {
          history.push({
            role: 'user',
            content: `Follow-up Question: ${question}\nAnswer: ${answer}`
          });
        });
      }

      if (analyses) {
        Object.entries(analyses).forEach(([aspect, analysisData]) => {
          history.push({
            role: 'assistant',
            content: `Analysis of ${aspect}:\n${analysisData.analysis}\n\nImplementation details:\n${analysisData.implementation_details.join("\n")}\n\nTechnical Considerations:\n${analysisData.technical_considerations.join("\n")}`
          });
        });
      }

      const temperature = settings?.temperature ?? 0.7;
      const maxTokens = settings?.maxTokens ?? 16000;
      const useMaxCompleteTokens = settings?.useMaxCompleteTokens ?? false;
      const selectedModel = settings?.model || 'gpt-4';


      const requestConfig = {
        model: model || selectedModel,
        messages: [
          {
            role: "system",
            content: SystemPrompts.SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `Based on all our discussions, including follow-up details and analyses, create a complete HTML5 Canvas game implementation. Here's the full conversation:\n\n${
              history.map(msg => `${msg.role}: ${msg.content}`).join('\n')
            }`
          }
        ],
        temperature,
        max_tokens: maxTokens,
        parameters
      };

      const response = await makeOpenAIRequest(requestConfig);

      const content = response.choices[0].message.content || "";
      const code = extractGameCode(content);

      const result = {
        code,
        response: content
      };

      logApi("Game code generated", { sessionId, settings }, result);
      res.json(result);
    } catch (error: any) {
      logApi("Error generating game", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, modelConfig, parameters } = req.body;
      const user = (req as any).user;

      logApi("Chat request received", { prompt }, null, { requestedModel: modelConfig?.model });

      const requestConfig = {
        model: modelConfig?.model || (user?.code_gen_model) || "gpt-4o",
        messages: [
          {
            role: "system",
            content: SystemPrompts.SYSTEM_PROMPT
          },
          { role: "user", content: prompt }
        ],
        parameters
      };

      logApi("Chat request configuration", null, null, logOpenAIParams(requestConfig));

      const response = await makeOpenAIRequest(requestConfig);
      const content = response.choices[0].message.content || "";
      const code = extractGameCode(content);

      const chat = await storage.createChat({
        prompt,
        response: content,
        code
      });

      const result = {
        ...chat,
        code
      };

      logApi("Chat response generated", null, { codeLength: code?.length }, logOpenAIParams(requestConfig));
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

  app.post("/api/game-idea", async (req, res) => {
    try {
      logApi("Game idea generation request received");

      // Use our simplified game idea generation function from openai.ts
      const gameIdea = await generateGameIdea();
      
      logApi("Game idea generated successfully", null, { gameIdea });
      res.json(gameIdea);
    } catch (error: any) {
      logApi("Error generating game idea", null, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Game code analysis endpoint
  app.post("/api/code/analyze", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "No code provided for analysis" });
      }
      
      logApi("Game code analysis request received");
      
      // Import the analyze function from openai.ts
      const { analyzeGameCode } = await import('./openai');
      
      // Extract common issues from the game code
      const issues = await analyzeGameCode(code);
      
      logApi("Game code analysis completed", null, { issuesCount: issues.length });
      res.json({ issues });
    } catch (error: any) {
      logApi("Error analyzing game code", null, { error: error.message });
      console.error('Error analyzing game code:', error);
      res.status(500).json({ error: error.message || "Failed to analyze game code" });
    }
  });
  
  // Feature generation from code analysis endpoint
  app.post("/api/code/analyze-features", async (req, res) => {
    try {
      const { code, gameDesign, model, parameters } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "No code provided for feature analysis" });
      }
      
      logApi("Feature generation from code request received", { codeLength: code.length });
      
      const requestConfig = {
        model: model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a game development assistant that analyzes code to suggest new features.
Analyze the provided code to identify what functionality is already implemented and suggest new features that would enhance the game.
Focus on concrete, implementable features that build upon the existing code structure.
Format your response as JSON with this structure:
{
  "features": [
    "Feature 1: Detailed description",
    "Feature 2: Detailed description",
    "Feature 3: Detailed description"
  ]
}`
          },
          {
            role: "user",
            content: `Analyze this game code and suggest 3-5 new features that would enhance the game:

\`\`\`javascript
${code}
\`\`\`

${gameDesign ? `Game Design Context:\n${JSON.stringify(gameDesign, null, 2)}` : ''}

Focus on suggesting concrete, implementable features that:
1. Build upon the existing code structure
2. Add gameplay depth or user engagement
3. Are specific enough to be implemented with clear direction
4. Enhance what's already in the code rather than replacing it

Return a list of suggested features in the specified JSON format.`
          }
        ],
        response_format: { type: "json_object" },
        parameters // Pass through any explicitly set parameters
      };
      
      const response = await makeOpenAIRequest(requestConfig);
      const suggestions = JSON.parse(response.choices[0].message.content);
      
      logApi("Feature suggestions generated from code", null, { features: suggestions });
      res.json(suggestions);
    } catch (error: any) {
      logApi("Error generating features from code", null, { error: error.message });
      console.error('Error generating features from code:', error);
      res.status(500).json({ error: error.message || "Failed to generate features from code" });
    }
  });
  
  // Fix specific issue endpoint
  app.post("/api/code/fix", async (req, res) => {
    try {
      const { code, issueId, issueMessage } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "No code provided for fixing" });
      }
      
      if (!issueId || !issueMessage) {
        return res.status(400).json({ error: "Issue information is required" });
      }
      
      logApi("Game code fix request received", { issueId, issueMessage });
      
      // Import the fix function from openai.ts
      const { fixGameCodeIssue } = await import('./openai');
      
      // Fix the specific issue
      const fixedCode = await fixGameCodeIssue(code, issueId, issueMessage);
      
      logApi("Game code issue fixed", { issueId });
      res.json({ fixedCode });
    } catch (error: any) {
      logApi("Error fixing game code issue", null, { error: error.message });
      console.error('Error fixing game code issue:', error);
      res.status(500).json({ error: error.message || "Failed to fix game code issue" });
    }
  });
  
  // Fix all issues endpoint
  app.post("/api/code/fix-all", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "No code provided for fixing" });
      }
      
      logApi("Game code fix-all request received");
      
      // Import the functions from openai.ts
      const { analyzeGameCode, fixAllGameCodeIssues } = await import('./openai');
      
      // Analyze code first to get the issues
      const issues = await analyzeGameCode(code);
      
      // Only fix auto-fixable issues
      const fixableIssues = issues.filter(issue => issue.autoFixable);
      
      if (fixableIssues.length === 0) {
        logApi("No fixable issues found in game code");
        return res.json({ fixedCode: code, message: "No fixable issues found" });
      }
      
      // Fix all issues
      const fixedCode = await fixAllGameCodeIssues(code, fixableIssues);
      
      logApi("Game code issues fixed", null, { fixedCount: fixableIssues.length });
      res.json({ fixedCode });
    } catch (error: any) {
      logApi("Error fixing all game code issues", null, { error: error.message });
      console.error('Error fixing all game code issues:', error);
      res.status(500).json({ error: error.message || "Failed to fix all game code issues" });
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

  app.post("/api/code/chat", async (req, res) => {
    try {
      const { code, message, gameDesign, debugContext, isNonTechnicalMode, model, parameters } = req.body;
      const user = (req as any).user;

      logApi("Code chat request received", { message, isNonTechnicalMode, model, parameters });

      const systemPrompt = isNonTechnicalMode
        ? SystemPrompts.DEBUG_FRIENDLY
        : SystemPrompts.DEBUG_TECHNICAL;

      // Enhanced user prompt that strongly emphasizes code preservation
      const userPrompt = `Here is my current game code that MUST be preserved in your response:

\`\`\`javascript
${code}
\`\`\`

User request: ${message}
${debugContext ? `\n\nDebug Context: ${debugContext}` : ''}

IMPORTANT: When you provide your answer:
1. Always include the COMPLETE, FULL original code
2. Wrap ALL the code (original + your changes) between +++CODESTART+++ and +++CODESTOP+++ markers
3. When implementing changes, NEVER remove ANY part of the original code; only ADD to it
4. Keep all original functions and variables intact`;

      const requestConfig = {
        model: model || (user?.code_gen_model) || "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 16000,
        parameters
      };

      const response = await makeOpenAIRequest(requestConfig);

      const content = response.choices[0].message.content || "";
      const updatedCode = extractGameCode(content);

      // Log the code extraction process for debugging
      console.log(`Original code length: ${code.length}`);
      console.log(`Extracted code length: ${updatedCode?.length || 0}`);
      
      // Verify code extraction worked properly
      if (!updatedCode) {
        console.error("Failed to extract code properly, check response format");
        console.log("Response content:", content);
      }

      const result = {
        message: content,
        updatedCode
      };

      logApi("Code chat response", { message }, result);
      res.json(result);
    } catch (error: any) {
      logApi("Error in code chat", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/code/remix", async (req, res) => {
    try {
      const { code, features, model, parameters } = req.body;
      const user = (req as any).user;

      const requestConfig = {
        model: model || (user?.code_gen_model) || "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a game development assistant specialized in improving HTML5 Canvas games.
When providing suggestions:
1. Analyze the current game code and suggest 3specific improvements that could makethe game more engaging
2. Focus on implementing these remaining features: ${features?.join(", ")}
3. Format yourresponse as JSON with this structure:
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
            content: `Please analyze this game code and suggest 3 improvements that help implement these remainingfeatures: ${features?.join(", ")}\n\n${code}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        parameters
      };

      const response = await makeOpenAIRequest(requestConfig);
      const suggestions = JSON.parse(response.choices[0].message.content || "{}");

      logApi("Remix suggestions generated", { code }, suggestions);
      res.json(suggestions);
    } catch (error: any) {
      logApi("Error generating remix suggestions", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/code/debug", async (req, res) => {
    try {
      const { code, error, isNonTechnicalMode, model, parameters } = req.body;

      if (!error || !code) {
        return res.status(400).json({
          error: "Debug Helper Error",
          message: isNonTechnicalMode
            ? "I need to see the game running first to help fix any problems. Could you try playing the game and let me know what's not working?"
            : "Please run the game first so I can help fix any errors.",
        });
      }

      logApi("Debug request received", { error, model, parameters });

      const systemPrompt = isNonTechnicalMode
        ? SystemPrompts.DEBUG_FRIENDLY
        : SystemPrompts.DEBUG_TECHNICAL;

      const requestConfig = {
        model: model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `The game has this error:\n${error}\n\nHere's the current code:\n${code}\n\nPlease help fix this issue!`
          }
        ],
        response_format: { type: "json_object" },
        parameters
      };

      logApi("Debug request configuration", null, null, logOpenAIParams(requestConfig));

      const response = await makeOpenAIRequest(requestConfig);
      const content = response.choices[0].message.content || "";
      const updatedCode = extractGameCode(content);

      res.json({
        explanation: content,
        fixedCode: updatedCode
      });
    } catch (error: any) {
      console.error('Debug endpoint error:', error);
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

  app.post("/api/hint", async (req, res) => {
    try {
      const { context, gameDesign, code, currentFeature, model, parameters } = req.body;
      const user = (req as any).user;

      logApi("Hint request received", { context, currentFeature, model, parameters });

      const requestConfig = {
        model: model || (user?.code_gen_model) || "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful and playful game development assistant.
Your task is to provide short, encouraging hints about the current context.
Keep responses brief (1-2 sentences) and friendly.
If a feature is being implemented, give specific suggestions.
Format hints to be encouraging and actionable.`
          },
          {
            role: "user",
            content: `Generate a helpful hint for this context:
Context: ${context || 'General game development'}
Current Feature: ${currentFeature || 'None specified'}
Game Design: ${gameDesign ? JSON.stringify(gameDesign) : 'Not available'}
Current Code: ${code ? code.substring(0, 500) + '...' : 'No code yet'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
        parameters
      };

      const response = await makeOpenAIRequest(requestConfig);

      const hint = response.choices[0].message.content || "Keep up the great work! 🎮";

      logApi("Hint generated", { hint });
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

  // Add models endpoint
  app.get("/api/models", async (req, res) => {
    try {
      res.json(DEFAULT_MODELS);
    } catch (error: any) {
      console.error('Error fetching models:', error);
      res.status(500).json({
        error: "Failed to fetch models",
        message: "Using default model configuration"
      });
    }
  });

  // Add new endpoint for model parameters
  app.get("/api/model-parameters/:model", async (req, res) => {
    const { model } = req.params;

    // Define model-specific parameter configurations
    const modelParams: Record<string, any> = {
      'gpt-4o': {
        temperature: {
          type: "float",
          min: 0,
          max: 2,
          default: 0.7,
          description: "Controls randomness in the output. Higher values make the output more creative but less predictable."
        },
        max_tokens: {
          type: "integer",
          min: 1,
          max: 128000,
          default: 32000,
          description: "Maximum number of tokens to generate."
        },
        top_p: {
          type: "float",
          min: 0,
          max: 1,
          default: 1,
          description: "Alternative to temperature, controls diversity via nucleus sampling."
        },
        frequency_penalty: {
          type: "float",
          min: -2.0,
          max: 2.0,
          default: 0,
          description: "Decreases the model's likelihood to repeat tokens."
        },
        presence_penalty: {
          type: "float",
          min: -2.0,
          max: 2.0,
          default: 0,
          description: "Increases the model's likelihood to talk about new topics."
        }
      },
      'o1': {
        max_tokens: {
          type: "integer",
          min: 1,
          max: 128000,
          default: 32000,
          description: "Maximum number of tokens to generate (will be converted to max_completion_tokens)."
        },
        response_format: {
          type: "enum",
          values: ["text", "json_object"],
          default: "text",
          description: "Format of the response"
        }
      },
      'o3-mini': {
        max_completion_tokens: {
          type: "integer",
          min: 1,
          max: 64000,
          default: 16000,
          description: "Maximum number of tokens to generate."
        },
        response_format: {
          type: "enum",
          values: ["text", "json_object"],
          default: "text",
          description: "Format of the response"
        }
      }
    };

    res.json(modelParams[model] || {});
  });

  const DEFAULT_MODELS = {
    'gpt-4o': 'GPT-4 Optimized',
    'o1': 'O1 Base',
    'o3-mini': 'O3 Mini',
    'o3': 'O3 Standard'
  };

  app.post("/api/users", async (req, res) => {
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
  app.patch("/api/users/model-preferences", async (req, res) => {
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

  app.get("/api/models", async (req, res) => {
    try {
      const models = await getAvailableModels();
      res.json(models);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add these new routes after existing chat routes
  app.post("/api/projects", async (req, res) => {
    try {
      const { name, files } = req.body;
      const user = (req as any).user;

      // Create the project
      const project = await storage.createProject({
        name,
        userId: user.id
      });

      // Create all the files
      if (files && Array.isArray(files)) {
        for (const file of files) {
          await storage.createProjectFile({
            projectId: project.id,
            name: file.name,
            content: file.content,
            language: file.language
          });
        }
      }

      const projectWithFiles = {
        ...project,
        files: await storage.getAllProjectFiles(project.id)
      };

      res.json(projectWithFiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const user = (req as any).user;
      const projects = await storage.getAllProjects(user.id);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns this project
      if (project.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const files = await storage.getAllProjectFiles(projectId);

      res.json({
        ...project,
        files
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name } = req.body;

      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns this project
      if (project.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedProject = await storage.updateProject(projectId, name);
      const files = await storage.getAllProjectFiles(projectId);

      res.json({
        ...updatedProject,
        files
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns this project
      if (project.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteProject(projectId);
      res.json(deleted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add these routes after existing routes, before the httpServer is created
  // Prompts Management Routes
  app.get("/api/prompts", async (req, res) => {
    try {
      const prompts = await storage.getAllPrompts();
      res.json(prompts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/prompts/:id", async (req, res) => {
    try {
      const promptId = parseInt(req.params.id);
      const prompt = await storage.getPrompt(promptId);

      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      res.json(prompt);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/prompts/:id", async (req, res) => {
    try {
      const { content } = req.body;
      const promptId = req.params.id;

      if (!(promptId in SystemPrompts)) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      // Update the system prompt
      SystemPrompts[promptId as keyof typeof SystemPrompts] = content;

      res.json({
        id: promptId,
        content,
        name: promptId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
        category: "System"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add endpoints for managing individual files within a project
  app.post("/api/projects/:projectId/files", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { name, content, language } = req.body;

      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns this project
      if (project.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const file = await storage.createProjectFile({
        projectId,
        name,
        content,
        language
      });

      res.json(file);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/projects/:projectId/files/:fileId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = parseInt(req.params.fileId);
      const { content } = req.body;

      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns this project
      if (project.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const file = await storage.updateProjectFile(fileId, content);
      res.json(file);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:projectId/files/:fileId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = parseInt(req.params.fileId);

      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns this project
      if (project.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const file = await storage.deleteProjectFile(fileId);
      res.json(file);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add these routes after existing routes, before the httpServer is created
  // Template Library Routes
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await db.select().from(gameTemplates);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const templateData = insertGameTemplateSchema.parse(req.body);
      const [template] = await db
        .insert(gameTemplates)
        .values(templateData)
        .returning();
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const [template] = await db
        .select()
        .from(gameTemplates)
        .where(eq(gameTemplates.id, templateId));

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add some initial templates
  app.post("/api/templates/seed", async (req, res) => {
    try {
      const initialTemplates = [
        {
          name: "Simple Platformer",
          description: "A basic platformer game with jumping mechanics",
          category: "Platformer",
          tags: ["2D", "Beginner", "Arcade"],
          code: `
            // Player setup
            const player = {
              x: canvas.width / 2,
              y: canvas.height - 50,
              width: 32,
              height: 32,
              speed: 5,
              jumpForce: -12,
              velocity: 0,
              grounded: false
            };

            // Game loop
            function gameLoop() {
              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Update player
              if (!player.grounded) {
                player.velocity += 0.5; // Gravity
                player.y += player.velocity;
              }

              // Ground collision
              if (player.y + player.height > canvas.height) {
                player.y = canvas.height - player.height;
                player.velocity = 0;
                player.grounded = true;
              }

              // Draw player
              ctx.fillStyle = 'blue';
              ctx.fillRect(player.x, player.y, player.width, player.height);

              requestAnimationFrame(gameLoop);
            }

            // Controls
            window.addEventListener('keydown', (e) => {
              if (e.code === 'Space' && player.grounded) {
                player.velocity = player.jumpForce;
                player.grounded = false;
              }
              if (e.code === 'ArrowLeft') player.x -= player.speed;
              if (e.code === 'ArrowRight') player.x += player.speed;
            });

            gameLoop();
          `,
          isPublic: true
        },
        {
          name: "Space Shooter",
          description: "Classic space shooting game with enemies and projectiles",
          category: "Shooter",
          tags: ["Space", "Arcade", "Action"],
          code: `
            // Game objects
            const player = {
              x: canvas.width / 2,
              y: canvas.height - 50,
              width: 32,
              height: 32,
              speed: 5
            };

            const bullets = [];
            const enemies = [];

            // Game loop
            function gameLoop() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Update and draw bullets
              bullets.forEach((bullet, i) => {
                bullet.y -= 7;
                ctx.fillStyle = 'yellow';
                ctx.fillRect(bullet.x, bullet.y, 4, 10);

                if (bullet.y < 0) bullets.splice(i, 1);
              });

              // Spawn enemies
              if (Math.random() < 0.02) {
                enemies.push({
                  x: Math.random() * (canvas.width - 30),
                  y: 0,
                  width: 30,
                  height: 30
                });
              }

              // Update and draw enemies
              enemies.forEach((enemy, i) => {
                enemy.y += 2;
                ctx.fillStyle = 'red';
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

                if (enemy.y > canvas.height) enemies.splice(i, 1);
              });

              // Draw player
              ctx.fillStyle = 'green';
              ctx.fillRect(player.x, player.y, player.width, player.height);

              requestAnimationFrame(gameLoop);
            }

            // Controls
            window.addEventListener('keydown', (e) => {
              if (e.code === 'Space') {
                bullets.push({
                  x: player.x + player.width / 2,
                  y: player.y
                });
              }
              if (e.code === 'ArrowLeft') player.x -= player.speed;
              if (e.code === 'ArrowRight') player.x += player.speed;
            });

            gameLoop();
          `,
          isPublic: true
        }
      ];

      const templates = await Promise.all(
        initialTemplates.map(template =>
          db.insert(gameTemplates).values(template).returning()
        )
      );

      res.json(templates);
    } catch (error: any) {      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      // Allow any user to delete templates as requested
      const templateId = parseInt(req.params.id);

      // Log deletion attempt
      logApi("Attempting to delete template", { templateId });

      // Delete template
      const deleted = await storage.deleteTemplate(templateId);

      // Log successful deletion
      logApi("Template deleted successfully", { templateId }, deleted);

      res.json(deleted);
    } catch (error: any) {
      console.error('Error deleting template:', error);

      // Log error
      logApi("Error deleting template", { error: error.message });

      if (error.message === 'Template not found') {
        return res.status(404).json({ error: "Template not found" });
      }

      res.status(500).json({ error: "Failed to delete template" });
    }
  });
  
  // New endpoint to delete all templates
  app.delete("/api/templates", async (req, res) => {
    try {
      logApi("Attempting to delete all templates");
      
      // Get all templates
      const templates = await db.select().from(gameTemplates);
      
      // Delete each template
      const deleted = [];
      for (const template of templates) {
        try {
          const deletedTemplate = await storage.deleteTemplate(template.id);
          deleted.push(deletedTemplate);
        } catch (err) {
          // Continue with next template if one fails
          console.error(`Failed to delete template ${template.id}:`, err);
        }
      }
      
      logApi("All templates deleted successfully", { count: deleted.length });
      res.json({ message: `Successfully deleted ${deleted.length} templates` });
    } catch (error: any) {
      console.error('Error deleting all templates:', error);
      logApi("Error deleting all templates", { error: error.message });
      res.status(500).json({ error: "Failed to delete all templates" });
    }
  });

  // Add this new endpoint after the existing project endpoints
  app.get("/api/files/:fileId/raw", async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const file = await storage.getProjectFile(fileId);

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Set content-type based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'js': 'application/javascript',
        'ts': 'application/typescript',
        'jsx': 'application/javascript',
        'tsx': 'application/typescript',
        'css': 'text/css',
        'html': 'text/html',
        'json': 'application/json',
        'md': 'text/markdown',
        'txt': 'text/plain'
      };

      res.setHeader('Content-Type', mimeTypes[extension || ''] || 'text/plain');
      res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
      res.send(file.content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

const logOpenAIParams = (config: any) => {
  return config;
};

async function getAvailableModels() {
    return DEFAULT_MODELS;
}

const insertGameTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  code: z.string(),
  isPublic: z.boolean().optional()
});
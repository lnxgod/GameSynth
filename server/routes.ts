import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertChatSchema, insertGameSchema } from "@shared/schema";
import OpenAI from "openai";
import {insertFeatureSchema} from "@shared/schema"; // Assuming this schema is defined elsewhere

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Update the DESIGN_ASSISTANT_PROMPT
const DESIGN_ASSISTANT_PROMPT = `You are a game design assistant helping users create HTML5 Canvas games. 
Analyze the specific game aspect provided and elaborate on its implementation details.
Focus on concrete, implementable features and mechanics.
Format your response as JSON with the following structure:
{
  "analysis": "Detailed analysis of this game aspect",
  "implementation_details": ["List of specific features or mechanics to implement"],
  "technical_considerations": ["Technical aspects to consider"]
}`;

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
}`;

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

const SYSTEM_PROMPT = `You are a game development assistant specialized in creating HTML5 Canvas games.
When providing code:
1. Always wrap the game code between +++CODESTART+++ and +++CODESTOP+++ markers
2. Focus on creating interactive, fun games using vanilla JavaScript and Canvas API
3. Include clear comments explaining the game mechanics
4. Return fully working, self-contained game code that handles its own game loop
5. Use requestAnimationFrame for animation
6. Handle cleanup properly when the game stops`;


export async function registerRoutes(app: Express) {
  app.get("/api/logs", (req, res) => {
    res.json(apiLogs);
  });

  app.post("/api/design/analyze", async (req, res) => {
    try {
      const { aspect, content, sessionId } = req.body;

      if (!designConversations.has(sessionId)) {
        designConversations.set(sessionId, []);
      }
      const history = designConversations.get(sessionId)!;

      logApi(`Analyzing ${aspect}`, { aspect, content });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: DESIGN_ASSISTANT_PROMPT
          },
          {
            role: "user",
            content: `Analyze this ${aspect} requirement for an HTML5 Canvas game: ${content}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");

      // Store the analysis in the conversation history
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
      const { sessionId } = req.body;
      const history = designConversations.get(sessionId);

      if (!history) {
        throw new Error("No design conversation found");
      }

      logApi("Generating final design", { sessionId });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const finalDesign = JSON.parse(response.choices[0].message.content || "{}");

      // Add the final design to history
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

  app.post("/api/design/generate-features", async (req, res) => {
    try {
      const { gameDesign, currentFeatures } = req.body;

      if (!gameDesign) {
        throw new Error("Game design is required");
      }

      logApi("Generating features request", { gameDesign, currentFeatures });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
      });

      const suggestions = JSON.parse(response.choices[0].message.content || "{}");

      logApi("Feature suggestions generated", { gameDesign }, suggestions);
      res.json(suggestions);
    } catch (error: any) {
      logApi("Error generating feature suggestions", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/design/generate", async (req, res) => {
    try {
      const { sessionId, followUpAnswers, analyses, settings } = req.body;
      const history = designConversations.get(sessionId);

      if (!history) {
        throw new Error("No design conversation found");
      }

      logApi("Game generation request", { sessionId, settings });

      // Add follow-up answers to the conversation history
      if (followUpAnswers) {
        Object.entries(followUpAnswers).forEach(([question, answer]) => {
          history.push({
            role: 'user',
            content: `Follow-up Question: ${question}\nAnswer: ${answer}`
          });
        });
      }

      // Incorporate analyses into the conversation history
      if (analyses) {
        Object.entries(analyses).forEach(([aspect, analysisData]) => {
          history.push({
            role: 'assistant',
            content: `Analysis of ${aspect}:\n${analysisData.analysis}\n\nImplementation details:\n${analysisData.implementation_details.join("\n")}\n\nTechnical Considerations:\n${analysisData.technical_considerations.join("\n")}`
          });
        });
      }

      // Use provided settings or defaults
      const temperature = settings?.temperature ?? 0.7;
      const maxTokens = settings?.maxTokens ?? 16000;

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
            content: `Based on all our discussions, including follow-up details and analyses, create a complete HTML5 Canvas game implementation. Here's the full conversation:\n\n${
              history.map(msg => `${msg.role}: ${msg.content}`).join('\n')
            }`
          }
        ],
        temperature,
        max_tokens: maxTokens
      });

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

  app.post("/api/code/chat", async (req, res) => {
    try {
      const { code, message, features } = req.body;

      logApi("Code chat request received", { message, features });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a game development assistant specialized in HTML5 Canvas games.
When modifying code:
1. ALWAYS provide the COMPLETE updated code, never partial updates
2. Always wrap the entire updated code between +++CODESTART+++ and +++CODESTOP+++ markers
3. Explain the changes you're making in clear, simple terms
4. Maintain game functionality and style consistency
5. Include initialization and cleanup code
6. The canvas and context variables (canvas, ctx) are already provided, DO NOT create them
7. Assume canvas and ctx are available in the scope
8. DO NOT include HTML, just the JavaScript game code
9. Focus on implementing these remaining features: ${features?.join(", ")}
10. Respond in this format:
    - Brief explanation of changes
    - Single complete code block between markers
    - Any additional notes or warnings
    - List which features were implemented in this update`
          },
          {
            role: "user",
            content: `Here is my current game code:\n\n${code}\n\nUser request: ${message}\n\nRemaining features to implement: ${features?.join(", ")}`
          }
        ],
        temperature: 0.7,
        max_tokens: 16000
      });

      const content = response.choices[0].message.content || "";
      const updatedCode = extractGameCode(content);

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
      const { code, features } = req.body;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a game development assistant specialized in improving HTML5 Canvas games.
When providing suggestions:
1. Analyze the current game code and suggest 3 specific improvements that could make the game more engaging
2. Focus on implementing these remaining features: ${features?.join(", ")}
3. Format your response as JSON with this structure:
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
        response_format: { type: "json_object" },
        temperature: 0.7
      });

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
      const { code, error } = req.body;

      if (!error || !code) {
        return res.status(400).json({
          error: "Missing Information",
          message: "Please run the game first so I can help fix any errors.",
        });
      }

      logApi("Debug request received", { error });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful game debugging assistant.
Help fix HTML5 Canvas game errors in simple, clear language.

When explaining fixes:
1. Identify the core problem in simple terms
2. Suggest a clear solution
3. Provide the complete fixed code

Remember:
- Focus on common game issues (collisions, animations, input handling)
- Explain in non-technical terms
- Always include the full working code

Format your response as:
1. 🎮 What went wrong? (simple explanation)
2. 💡 How we'll fix it
3. Complete fixed code between +++CODESTART+++ and +++CODESTOP+++ markers`
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
      });

      const content = response.choices[0].message.content || "";
      const updatedCode = extractGameCode(content);

      if (!updatedCode) {
        throw new Error("Could not generate valid fixed code");
      }

      // Extract the explanation without the code block
      const explanation = content
        .replace(/\+\+\+CODESTART\+\+\+[\s\S]*\+\+\+CODESTOP\+\+\+/, '')
        .trim();

      const result = {
        message: explanation,
        updatedCode
      };

      logApi("Debug suggestions generated", { error }, result);
      res.json(result);
    } catch (error: any) {
      logApi("Error in debug", req.body, { error: error.message });
      res.status(500).json({
        error: "Debug Helper Error",
        message: "I couldn't analyze the game properly. Please try running the game again to generate fresh error information.",
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
      res.status(500).json({ error: error.message });
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
      const { context, gameDesign, code, currentFeature } = req.body;

      logApi("Hint request received", { context, currentFeature });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
        max_tokens: 100
      });

      const hint = response.choices[0].message.content || "Keep up the great work! 🎮";

      logApi("Hint generated", { hint });
      res.json({ hint });
    } catch (error: any) {
      logApi("Error generating hint", req.body, { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
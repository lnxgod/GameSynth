import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Makes a text completion request to OpenAI with the given prompt
 */
export async function makeCompletionRequest(prompt: string, options: {
  model?: string,
  temperature?: number,
  max_tokens?: number,
  response_format?: { type: string }
} = {}) {
  try {
    const { model = "gpt-4o", temperature = 0.7, max_tokens = 1024, response_format } = options;
    
    const messages = [{ role: "user" as const, content: prompt }];
    
    const chatConfig: any = {
      model,
      messages,
      temperature,
      max_tokens,
    };
    
    // Add response_format if specified (for JSON responses)
    if (response_format) {
      chatConfig.response_format = response_format;
    }
    
    const response = await openai.chat.completions.create(chatConfig);
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

/**
 * Makes a completion request with JSON output format
 */
export async function makeJsonCompletionRequest<T>(prompt: string, options: {
  model?: string,
  temperature?: number,
  max_tokens?: number
} = {}): Promise<T> {
  const jsonPrompt = `${prompt}\n\nRespond with JSON only, no other text.`;
  const content = await makeCompletionRequest(jsonPrompt, {
    ...options,
    response_format: { type: "json_object" }
  });
  
  if (!content) {
    throw new Error("No content returned from OpenAI");
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse OpenAI response as JSON:", content);
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}

/**
 * Makes a chat completion request to OpenAI with multiple messages
 */
export async function makeChatCompletionRequest(messages: Array<{
  role: "system" | "user" | "assistant",
  content: string
}>, options: {
  model?: string,
  temperature?: number,
  max_tokens?: number
} = {}) {
  try {
    const { model = "gpt-4o", temperature = 0.7, max_tokens = 1024 } = options;
    
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

/**
 * Makes a game idea generation request, returning a structured game idea object
 */
export async function generateGameIdea(): Promise<{
  title: string;
  description: string;
  mainCharacter: string;
  setting: string;
  mechanics: string;
  twist: string;
}> {
  const prompt = `
    Generate a whimsical and creative game idea with a unique theme. 
    Format it as a JSON object with the following properties:
    - title: The name of the game
    - description: A concise description of the game concept
    - mainCharacter: The main protagonist or player character
    - setting: The game's environment or world
    - mechanics: The core gameplay mechanics
    - twist: A unique twist or special feature that makes the game stand out
    
    Make it suitable for casual players and keep the description concise.
  `;
  
  return makeJsonCompletionRequest(prompt, {
    temperature: 0.9,
    max_tokens: 1024
  });
}

export default openai;
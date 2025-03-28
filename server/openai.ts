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

/**
 * Analyzes game code and returns a list of potential issues
 */
export async function analyzeGameCode(code: string): Promise<Array<{
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  autoFixable: boolean;
}>> {
  const prompt = `
    Analyze the following HTML5 game code and identify any issues, bugs, or improvements.
    Focus on the following categories:
    1. Syntax errors or code bugs
    2. Performance issues
    3. Missing error handling
    4. Browser compatibility issues
    5. Accessibility concerns
    6. Best practices violations

    For each issue found, determine if it can be automatically fixed by an AI.
    Return the results as a JSON array of objects with these properties:
    - id: A unique string identifier for the issue (use format: issue_type_number, e.g., 'syntax_error_1')
    - type: Either 'error', 'warning', or 'info'
    - message: A clear description of the issue
    - line: The line number where the issue occurs (if applicable)
    - column: The column number where the issue occurs (if applicable)
    - autoFixable: Boolean indicating if this issue can be automatically fixed

    Here's the code to analyze:
    \`\`\`
    ${code}
    \`\`\`
  `;
  
  try {
    const issues = await makeJsonCompletionRequest<Array<{
      id: string;
      type: 'error' | 'warning' | 'info';
      message: string;
      line?: number;
      column?: number;
      autoFixable: boolean;
    }>>(prompt, {
      temperature: 0.3,
      max_tokens: 2048
    });
    
    return issues;
  } catch (error) {
    console.error("Error analyzing game code:", error);
    throw new Error("Failed to analyze game code: " + (error as Error).message);
  }
}

/**
 * Fixes a specific issue in the game code
 */
export async function fixGameCodeIssue(
  code: string, 
  issueId: string, 
  issueMessage: string
): Promise<string> {
  const prompt = `
    I have an HTML5 game with the following code:
    \`\`\`
    ${code}
    \`\`\`

    There is an issue with the code that needs fixing:
    Issue ID: ${issueId}
    Issue Description: ${issueMessage}

    Please fix ONLY this specific issue while making minimal changes to the code.
    Respond with the complete fixed code, maintaining the original structure and functionality.
    Do not add comments explaining the changes. Simply return the corrected code.
  `;
  
  try {
    const response = await makeCompletionRequest(prompt, {
      temperature: 0.3,
      max_tokens: Math.max(2048, code.length * 1.2) // Ensure enough tokens for the response
    });
    
    if (!response) {
      throw new Error("No response received from OpenAI");
    }
    
    // Extract only the code from the response (in case there's any explanation)
    const codeRegex = /\`\`\`(?:html|javascript|js)?\s*([\s\S]*?)\`\`\`|<html[\s\S]*?<\/html>/i;
    const match = response.match(codeRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    } else if (match && match[0].startsWith('<html')) {
      return match[0].trim();
    }
    
    // If no code block found, return the entire response
    // This handles cases where the AI doesn't wrap code in backticks
    return response.trim();
  } catch (error) {
    console.error("Error fixing game code issue:", error);
    throw new Error("Failed to fix game code issue: " + (error as Error).message);
  }
}

/**
 * Fixes all provided issues in the game code
 */
export async function fixAllGameCodeIssues(
  code: string, 
  issues: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    column?: number;
    autoFixable: boolean;
  }>
): Promise<string> {
  const issuesText = issues.map(issue => 
    `- Issue ID: ${issue.id}\n  Type: ${issue.type}\n  Message: ${issue.message}${
      issue.line ? `\n  Location: Line ${issue.line}${issue.column ? `, Column ${issue.column}` : ''}` : ''
    }`
  ).join('\n\n');
  
  const prompt = `
    I have an HTML5 game with the following code:
    \`\`\`
    ${code}
    \`\`\`

    There are multiple issues with the code that need fixing:
    ${issuesText}

    Please fix ALL these issues while making minimal changes to the code.
    Respond with the complete fixed code, maintaining the original structure and functionality.
    Do not add comments explaining the changes. Simply return the corrected code.
  `;
  
  try {
    const response = await makeCompletionRequest(prompt, {
      temperature: 0.3,
      max_tokens: Math.max(2048, code.length * 1.2) // Ensure enough tokens for the response
    });
    
    if (!response) {
      throw new Error("No response received from OpenAI");
    }
    
    // Extract only the code from the response (in case there's any explanation)
    const codeRegex = /\`\`\`(?:html|javascript|js)?\s*([\s\S]*?)\`\`\`|<html[\s\S]*?<\/html>/i;
    const match = response.match(codeRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    } else if (match && match[0].startsWith('<html')) {
      return match[0].trim();
    }
    
    // If no code block found, return the entire response
    // This handles cases where the AI doesn't wrap code in backticks
    return response.trim();
  } catch (error) {
    console.error("Error fixing multiple game code issues:", error);
    throw new Error("Failed to fix game code issues: " + (error as Error).message);
  }
}

/**
 * Generates an image asset for a game based on a description
 */
export async function generateGameAsset(
  description: string,
  options: {
    style?: string,
    size?: "1024x1024" | "1792x1024" | "1024x1792",
    quality?: "standard" | "hd"
  } = {}
): Promise<{
  url: string,
  base64Data?: string
}> {
  const { style = "pixel art", size = "1024x1024", quality = "standard" } = options;
  
  try {
    const prompt = `Create a ${style} game asset for: ${description}. Make it transparent background if appropriate. Ensure the design is clean, simple, and suitable for a game.`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality,
      response_format: "url"
    });

    // Return the URL and possibly retrieve base64 data
    if (!response.data[0].url) {
      throw new Error("No image URL returned from OpenAI");
    }
    
    return { 
      url: response.data[0].url 
    };
  } catch (error) {
    console.error("Error generating game asset:", error);
    throw new Error("Failed to generate game asset: " + (error as Error).message);
  }
}

/**
 * Generates an SVG icon asset for game UI elements
 */
export async function generateGameIcon(
  description: string
): Promise<string> {
  const prompt = `
    Create a simple SVG icon for a game UI element: ${description}.
    
    Respond ONLY with valid, clean SVG code (viewBox="0 0 24 24" with no unnecessary attributes).
    Keep it simple - minimal paths, solid fill colors.
    Ensure it works well at small sizes in a game interface.
    The SVG must be a single color that can be styled via CSS.
    
    Return ONLY the SVG code with no markdown, explanation or backticks.
  `;
  
  try {
    const response = await makeCompletionRequest(prompt, {
      temperature: 0.3,
      max_tokens: 1024
    });
    
    if (!response) {
      throw new Error("No response received from OpenAI");
    }
    
    // Extract SVG from response, in case there's any explanation
    const svgRegex = /<svg[\s\S]*?<\/svg>/i;
    const match = response.match(svgRegex);
    
    if (match) {
      return match[0].trim();
    }
    
    // If no SVG found but response starts with svg tag
    if (response.trim().startsWith('<svg')) {
      return response.trim();
    }
    
    throw new Error("Failed to generate valid SVG");
  } catch (error) {
    console.error("Error generating game icon:", error);
    throw new Error("Failed to generate game icon: " + (error as Error).message);
  }
}

export default openai;
import { apiRequest } from "./queryClient";

export async function sendChatMessage(
  prompt: string,
  maxTokens?: number
) {
  const res = await apiRequest("POST", "/api/chat", {
    prompt,
    maxTokens
  });
  return res.json();
}

export async function saveGame(name: string, code: string, chatId: number) {
  const res = await apiRequest("POST", "/api/games", { name, code, chatId });
  return res.json();
}
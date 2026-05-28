import OpenAI from "openai";
import { config } from "../config";
import { ConversationMessage } from "./conversationStore";
import { TRS_SYSTEM_PROMPT } from "./systemPrompt";
import { MAX_FALLBACK_HISTORY_MESSAGES } from "./memoryPolicy";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function toChatMessages(history: ConversationMessage[], currentUserMessage: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: TRS_SYSTEM_PROMPT
    },
    ...history.slice(-MAX_FALLBACK_HISTORY_MESSAGES).map((message) => ({
      role: message.role,
      content: message.content
    })),
    {
      role: "user",
      content: currentUserMessage
    }
  ];
}

export async function generateAiReply(
  history: ConversationMessage[],
  currentUserMessage: string
): Promise<string> {
  if (!config.openRouterApiKey) {
    return "AI is not configured yet. Please add OPENROUTER_API_KEY in discord-bot/.env.";
  }

  const client = new OpenAI({
    apiKey: config.openRouterApiKey,
    baseURL: config.openRouterBaseUrl
  });

  const response = await client.chat.completions.create({
    model: config.openRouterModel,
    messages: toChatMessages(history, currentUserMessage),
    temperature: 0.2
  });

  return response.choices[0]?.message?.content ?? "I could not generate a response.";
}


import {
  addConversationMessage,
  getConversationMessages
} from "./conversationStore";
import { generateAiReply } from "./aiService";

export async function handleAiMessage(
  discordUserId: string,
  userMessage: string
): Promise<string> {
  const history = getConversationMessages(discordUserId);

  const aiReply = await generateAiReply(history, userMessage);

  addConversationMessage(discordUserId, {
    role: "user",
    content: userMessage,
    createdAt: new Date()
  });

  addConversationMessage(discordUserId, {
    role: "assistant",
    content: aiReply,
    createdAt: new Date()
  });

  return aiReply;
}

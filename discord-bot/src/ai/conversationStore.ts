import { MAX_STORED_MESSAGES_PER_USER } from "./memoryPolicy";

export type ConversationRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
  createdAt: Date;
};

const conversations = new Map<string, ConversationMessage[]>();

export function addConversationMessage(
  discordUserId: string,
  message: ConversationMessage
): void {
  const existingMessages = conversations.get(discordUserId) ?? [];
  const updatedMessages = [...existingMessages, message].slice(-MAX_STORED_MESSAGES_PER_USER);

  conversations.set(discordUserId, updatedMessages);
}

export function getConversationMessages(discordUserId: string): ConversationMessage[] {
  return conversations.get(discordUserId) ?? [];
}

export function clearConversation(discordUserId: string): void {
  conversations.delete(discordUserId);
}

import { Client, GatewayIntentBits, Message } from "discord.js";
import axios from "axios";
import { config } from "./config";
import { handleDebugCommand } from "./commands/debugCommands";
import { handleAiMessage } from "./ai/aiRouter";
import { getConversationMessages } from "./ai/conversationStore";
import { parseAiIntent } from "./ai/intentParser";
import { parseDateRange } from "./domain/timeEntries/dateRangeParser";
import {
  executeAiAction,
  handlePendingAdminAssignmentConfirmation,
  handlePendingAdminProjectCreateConfirmation,
  handlePendingAdminUserCreateConfirmation,
  handlePendingAiActionConfirmation,
  handlePendingTimeEntryConfirmation
} from "./actions/aiActionExecutor";


async function withTyping<T>(message: Message, action: () => Promise<T>): Promise<T> {
  const channel = message.channel;

  if (!("sendTyping" in channel) || typeof channel.sendTyping !== "function") {
    return action();
  }

  await channel.sendTyping();

  const typingInterval = setInterval(() => {
    channel.sendTyping().catch(console.error);
  }, 5000);

  try {
    return await action();
  } finally {
    clearInterval(typingInterval);
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
    return data.message;
  }

  if (typeof data === "string" && data.trim().length > 0) {
    return data;
  }

  return fallback;
}

function looksLikeMissingEntriesRequest(content: string): boolean {
  const normalized = content.toLowerCase();
  const missingWords = ["missing", "missed", "forgot", "not submit", "not submitted", "left", "incomplete"];
  const timeWords = ["entry", "entries", "timesheet", "time sheet", "work log", "work logs", "work"];

  return missingWords.some((word) => normalized.includes(word)) && timeWords.some((word) => normalized.includes(word));
}

function looksLikeTrsDataRequest(content: string): boolean {
  const normalized = content.toLowerCase();
  const dataWords = ["missing", "entries", "entry", "timesheet", "time sheet", "work log", "work logs", "utilization", "project", "hours", "report"];
  const actionWords = ["show", "give", "tell", "want", "need", "find", "fetch", "get", "list", "who", "which", "what", "from"];

  return dataWords.some((word) => normalized.includes(word)) && actionWords.some((word) => normalized.includes(word));
}

function looksLikeAdminProjectsRequest(content: string): boolean {
  const normalized = content.toLowerCase();
  const projectWords = ["project", "projects", "project codes", "trs projects"];
  const listWords = ["show", "list", "all", "what", "which", "get", "fetch", "give", "see"];

  return projectWords.some((word) => normalized.includes(word)) && listWords.some((word) => normalized.includes(word));
}

function looksLikeAdminAssignmentsRequest(content: string): boolean {
  const normalized = content.toLowerCase();
  const assignmentWords = ["assigned", "assignment", "assignments", "mapping", "access"];
  const projectWords = ["project", "projects", "prj"];
  const queryWords = ["who", "show", "list", "what", "which", "get", "fetch", "give", "see"];

  return assignmentWords.some((word) => normalized.includes(word)) && projectWords.some((word) => normalized.includes(word)) && queryWords.some((word) => normalized.includes(word));
}

function looksLikeAdminUsersRequest(content: string): boolean {
  const normalized = content.toLowerCase();
  const userWords = ["users", "employees", "staff", "people"];
  const listWords = ["show", "list", "all", "who", "what", "get", "fetch", "give", "see"];

  return userWords.some((word) => normalized.includes(word)) && listWords.some((word) => normalized.includes(word));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`TRS Discord bot is online as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) {
    return;
  }

  const content = message.content.trim();

  try {
    if (await handleDebugCommand(message)) {
      return;
    }
  } catch (error) {
    console.error(error);
    await message.reply(`Debug command failed: ${getErrorMessage(error, "Please check backend availability.")}`);
    return;
  }

  try {
    if (await withTyping(message, () => handlePendingTimeEntryConfirmation(message))) {
      return;
    }
  } catch (error) {
    console.error(error);
    await message.reply(
      `I could not save the pending time entry: ${getErrorMessage(error, "Please check duplicate entries, project assignment, and backend availability.")}`
    );
    return;
  }

  try {
    if (await withTyping(message, () => handlePendingAdminProjectCreateConfirmation(message))) {
      return;
    }
  } catch (error) {
    console.error(error);
    await message.reply(
      `I could not save the pending project creation: ${getErrorMessage(error, "Please check duplicate project code and backend availability.")}`
    );
    return;
  }

  try {
    if (await withTyping(message, () => handlePendingAdminUserCreateConfirmation(message))) {
      return;
    }
  } catch (error) {
    console.error(error);
    await message.reply(
      `I could not save the pending user creation: ${getErrorMessage(error, "Please check duplicate email, role, password length, and backend availability.")}`
    );
    return;
  }

  try {
    if (await withTyping(message, () => handlePendingAdminAssignmentConfirmation(message))) {
      return;
    }
  } catch (error) {
    console.error(error);
    await message.reply(
      `I could not save the pending project assignment: ${getErrorMessage(error, "Please check duplicate assignments and backend availability.")}`
    );
    return;
  }

  try {
    if (await withTyping(message, () => handlePendingAiActionConfirmation(message))) {
      return;
    }
  } catch (error) {
    console.error(error);
    await message.reply(
      `I could not complete the pending request: ${getErrorMessage(error, "Please confirm backend availability and try again.")}`
    );
    return;
  }

  try {
    const handled = await withTyping(message, async () => {
      const history = getConversationMessages(message.author.id);
      const parsedIntent = await parseAiIntent(history, content);
      return executeAiAction(message, parsedIntent);
    });

    if (handled) {
      return;
    }
  } catch (error) {
    console.error(error);
  }

  // Deterministic safety fallback for known connected report actions when the cheap LLM fails.
  if (looksLikeMissingEntriesRequest(content)) {
    const dateRange = parseDateRange(content);
    const handled = await withTyping(message, () => executeAiAction(message, {
      intent: "VIEW_MISSING_ENTRIES",
      confidence: 0.9,
      dateRange
    }));

    if (handled) {
      return;
    }
  }


  // Safety fallback for admin read actions when the cheap LLM misses a simple natural-language intent.
  // The LLM still gets first chance above; this only prevents valid TRS read requests from falling into generic chat.
  if (looksLikeAdminAssignmentsRequest(content)) {
    const handled = await withTyping(message, () => executeAiAction(message, {
      intent: "VIEW_ADMIN_ASSIGNMENTS",
      confidence: 0.9
    }));

    if (handled) {
      return;
    }
  }

  if (looksLikeAdminProjectsRequest(content)) {
    const handled = await withTyping(message, () => executeAiAction(message, {
      intent: "VIEW_ADMIN_PROJECTS",
      confidence: 0.9
    }));

    if (handled) {
      return;
    }
  }

  if (looksLikeAdminUsersRequest(content)) {
    const handled = await withTyping(message, () => executeAiAction(message, {
      intent: "VIEW_ADMIN_USERS",
      confidence: 0.9
    }));

    if (handled) {
      return;
    }
  }

  // Safety boundary: generic AI must not pretend to fetch real TRS data.
  if (looksLikeTrsDataRequest(content)) {
    await message.reply(
      "I understood this is about TRS data, but I could not safely route it to a connected action yet. Please rephrase with the main action, for example: `show all projects`, `show project assignments`, or `show missing entries for May 2026`."
    );
    return;
  }


  //generic AI chat fallback if no other handlers or safety patterns matched. This allows for open-ended conversation and also lets the AI ask the user for clarification if it couldn't confidently identify a specific intent i.e for unkown intent.
  //so its not an intent parser
  try {
    const aiReply = await withTyping(message, () => handleAiMessage(message.author.id, content));
    await message.reply(aiReply);
  } catch (error) {
    console.error(error);
    await message.reply("I could not process that with AI right now. Please try again later.");
  }
});

client.login(config.discordBotToken);
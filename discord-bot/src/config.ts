import dotenv from "dotenv";

// Load local environment variables from discord-bot/.env.
// This keeps secrets like the Discord token out of source code.
dotenv.config();

const discordBotToken = process.env.DISCORD_BOT_TOKEN;
const trsApiBaseUrl = process.env.TRS_API_BASE_URL;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const trsBotServiceToken = process.env.TRS_BOT_SERVICE_TOKEN;
const openRouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

// Fail fast during startup if required configuration is missing.
// This gives a clear error instead of letting the bot fail later.
if (!discordBotToken) {
  throw new Error("DISCORD_BOT_TOKEN is missing in .env");
}

if (!trsApiBaseUrl) {
  throw new Error("TRS_API_BASE_URL is missing in .env");
}

if (!trsBotServiceToken) {
  throw new Error("TRS_BOT_SERVICE_TOKEN is missing in .env");
}

export const config = {
  discordBotToken,
  trsApiBaseUrl,
  trsBotServiceToken,
  openRouterApiKey,
  openRouterModel,
  openRouterBaseUrl
};

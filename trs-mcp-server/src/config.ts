import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const envPath = path.resolve(currentDir, "..", ".env");

dotenv.config({ path: envPath, quiet: true });

export const config = {
  trsApiBaseUrl: process.env.TRS_API_BASE_URL,
  trsBotServiceToken: process.env.TRS_BOT_SERVICE_TOKEN,
  trsDefaultProvider: process.env.TRS_DEFAULT_PROVIDER,
  trsDefaultProviderUserId: process.env.TRS_DEFAULT_PROVIDER_USER_ID
};

if (!config.trsApiBaseUrl) {
  throw new Error("TRS_API_BASE_URL is missing in .env");
}

if (!config.trsBotServiceToken) {
  throw new Error("TRS_BOT_SERVICE_TOKEN is missing in .env");
}

if (!config.trsDefaultProvider) {
  throw new Error("TRS_DEFAULT_PROVIDER is missing in .env");
}

if (!config.trsDefaultProviderUserId) {
  throw new Error("TRS_DEFAULT_PROVIDER_USER_ID is missing in .env");
}

export const identityLabel = `${config.trsDefaultProvider} / ${config.trsDefaultProviderUserId}`;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
exports.config = {
    trsApiBaseUrl: process.env.TRS_API_BASE_URL ?? "http://localhost:8080",
    trsBotServiceToken: process.env.TRS_BOT_SERVICE_TOKEN ??
        "timer-registration-system-local-bot-service-token-change-later",
    externalProvider: process.env.TRS_EXTERNAL_PROVIDER ?? "CLAUDE_DESKTOP",
    externalProviderUserId: process.env.TRS_EXTERNAL_PROVIDER_USER_ID ?? "admin-local",
    // Phase 24B: AI planner is the preferred brain when enabled, but the
    // deterministic planner remains as a safety fallback for bad/failed model output.
    aiPlannerEnabled: process.env.AI_PLANNER_ENABLED?.toLowerCase() === "true",
    openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    openRouterModel: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-exp:free"
};

"use strict";
// Phase 24B: AI planner.
// This file lets an LLM classify natural language into one of our known
// harness intents. It does NOT execute tools. It only proposes a plan, and the
// harness validates that plan before using it.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRequestWithAi = planRequestWithAi;
const axios_1 = __importDefault(require("axios"));
const config_js_1 = require("../config.js");
const allowedIntents = [
    "WHO_AM_I",
    "SHOW_CONTEXT",
    "GET_MY_PROJECTS",
    "GET_ADMIN_PROJECTS",
    "GET_ADMIN_USERS",
    "GET_PROJECT_ASSIGNMENTS",
    "GET_MISSING_ENTRIES_REPORT",
    "GET_UTILIZATION_REPORT",
    "GET_MANAGER_INSIGHT",
    "GET_MANAGER_RECOMMENDATIONS",
    "ADD_RECOMMENDATION_MEMORY",
    "SHOW_RECOMMENDATION_MEMORY",
    "KNOWLEDGE_QUERY",
    "CREATE_PROJECT_DRAFT",
    "ASSIGN_USER_TO_PROJECT_DRAFT",
    "CONFIRM_PENDING_ACTION",
    "CANCEL_PENDING_ACTION",
    "ADD_CORRECTION_MEMORY",
    "SHOW_CORRECTION_MEMORY",
    "UNSUPPORTED"
];
function isHarnessIntent(value) {
    return allowedIntents.includes(value);
}
function buildSystemPrompt() {
    return [
        "You are the AI planner inside the Hermes TRS Agent Harness.",
        "Your only job is to classify the user's message into exactly one allowed intent.",
        "You do not call tools. You do not answer the user. You only return JSON.",
        "The TypeScript harness will validate your JSON and execute tools safely.",
        "",
        "Allowed intents:",
        allowedIntents.map((intent) => `- ${intent}`).join("\n"),
        "",
        "Intent guide:",
        "- WHO_AM_I: user asks who they are, profile, account, role.",
        "- SHOW_CONTEXT: user asks about harness memory/context status, show memory, show context, memory status, or context status. This is the full harness context summary, not only learned recommendation memory.",
        "- SHOW_REGISTERED_TOOLS: user asks what tools/capabilities are registered, show registered tools, show tool registry, or what tools the harness can use.",
        "- GET_MY_PROJECTS: user asks projects assigned to themselves.",
        "- GET_ADMIN_PROJECTS: user asks all/company/TRS projects.",
        "- GET_ADMIN_USERS: user asks all/company users, employees, staff.",
        "- GET_PROJECT_ASSIGNMENTS: user asks who is assigned to projects or assignment list.",
        "- GET_MISSING_ENTRIES_REPORT: user explicitly asks for missing entries, missing time entries, missed work logs, absent work logs, or missing dates.",
        "- GET_UTILIZATION_REPORT: user asks utilization, hours worked, underutilization, capacity, or hours summary.",
        "- GET_MANAGER_INSIGHT: user asks broad diagnostic questions like who needs attention, who seems behind, who is falling behind, team health, attention areas, or overall manager insight.",
        "- GET_MANAGER_RECOMMENDATIONS: user asks what actions to take, follow-up suggestions, next actions, or recommendations.",
        "- CREATE_PROJECT_DRAFT: user wants to create a project.",
        "- ASSIGN_USER_TO_PROJECT_DRAFT: user wants to assign/add/put a user on a project.",
        "- CONFIRM_PENDING_ACTION: user confirms a pending draft, such as yes/confirm/save it/go ahead.",
        "- CANCEL_PENDING_ACTION: user cancels/discards/stops a pending draft.",
        "- ADD_CORRECTION_MEMORY: user asks the harness to remember a general correction/preference.",
        "- SHOW_CORRECTION_MEMORY: user explicitly asks to show corrections, correction memory, or what corrections were learned. Do not use this for plain show memory.",
        "- ADD_RECOMMENDATION_MEMORY: user asks to remember recommendation feedback.",
        "- SHOW_RECOMMENDATION_MEMORY: user explicitly asks to show recommendation memory, recommendation feedback, or recommendation feedback memory. Do not use this for plain show memory.",
        "- KNOWLEDGE_QUERY: user asks conceptual TRS questions about roles, permissions, architecture, identity mapping, safety.",
        "- UNSUPPORTED: message is unrelated or cannot map safely.",
        "",
        "Important disambiguation rules:",
        "- If the user says 'behind', 'falling behind', 'needs attention', 'team health', or 'who should I look at', choose GET_MANAGER_INSIGHT unless they explicitly mention missing entries/logs.",
        "- If the user explicitly says 'missing entries', 'missing logs', 'missed logs', or asks for missing dates, choose GET_MISSING_ENTRIES_REPORT.",
        "- If the user asks what to do next or asks for recommended actions, choose GET_MANAGER_RECOMMENDATIONS.",
        "- If the user asks to show registered tools, tool registry, or what tools are available, choose SHOW_REGISTERED_TOOLS.",
        "- If the user says exactly or generally show memory/show context/memory status/context status, choose SHOW_CONTEXT unless they explicitly say correction memory or recommendation memory.",
        "",
        "Return strictly this JSON shape and nothing else:",
        "{ \"intent\": \"GET_MY_PROJECTS\", \"confidence\": 0.92 }"
    ].join("\n");
}
function buildUserPrompt(userMessage, context) {
    return [
        "Classify this TRS harness message.",
        "",
        `Provider: ${context.provider}`,
        `Provider user id: ${context.providerUserId}`,
        `Correction memories loaded: ${context.memorySummary.correctionCount}`,
        `Recommendation memories loaded: ${context.memorySummary.recommendationMemoryCount}`,
        "",
        `User message: ${userMessage}`
    ].join("\n");
}
function extractJsonObject(text) {
    const trimmed = text.trim();
    try {
        return JSON.parse(trimmed);
    }
    catch {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("AI response did not contain a JSON object.");
        }
        return JSON.parse(jsonMatch[0]);
    }
}
function parseAiPlan(rawText) {
    const parsed = extractJsonObject(rawText);
    if (!parsed || typeof parsed !== "object") {
        throw new Error("AI planner JSON was not an object.");
    }
    const intent = String(parsed.intent ?? "");
    const confidenceValue = Number(parsed.confidence ?? 0);
    if (!isHarnessIntent(intent)) {
        throw new Error(`AI planner returned unsupported intent: ${intent || "<empty>"}`);
    }
    const confidence = Number.isFinite(confidenceValue) ? confidenceValue : 0;
    return {
        source: "ai",
        plan: { intent },
        confidence,
        rawIntent: intent
    };
}
async function planRequestWithAi(userMessage, context) {
    if (!config_js_1.config.aiPlannerEnabled) {
        return {
            source: "skipped",
            reason: "AI_PLANNER_ENABLED is not true"
        };
    }
    if (!config_js_1.config.openRouterApiKey) {
        return {
            source: "skipped",
            reason: "OPENROUTER_API_KEY is missing"
        };
    }
    try {
        const response = await axios_1.default.post(`${config_js_1.config.openRouterBaseUrl}/chat/completions`, {
            model: config_js_1.config.openRouterModel,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: buildSystemPrompt()
                },
                {
                    role: "user",
                    content: buildUserPrompt(userMessage, context)
                }
            ]
        }, {
            headers: {
                Authorization: `Bearer ${config_js_1.config.openRouterApiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost/trs-hermes-harness",
                "X-Title": "TRS Hermes Harness"
            },
            timeout: 15000
        });
        const rawText = String(response.data?.choices?.[0]?.message?.content ?? "");
        return parseAiPlan(rawText);
    }
    catch (error) {
        return {
            source: "failed",
            reason: error instanceof Error ? error.message : String(error)
        };
    }
}

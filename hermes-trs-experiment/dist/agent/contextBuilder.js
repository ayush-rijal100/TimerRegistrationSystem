"use strict";
// build context before the agent acts.
//
// Context means:
// - who is the external provider identity?
// - what stable memory files should be loaded?
// - what learned correction/recommendation memory should be included?
//
// Instead of every file separately loading memory/config, contextBuilder prepares
// all required context in one place before planning or tool execution.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContext = buildContext;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const config_js_1 = require("../config.js");
const correctionMemory_js_1 = require("../memory/correctionMemory.js");
const recommendationMemory_js_1 = require("../memory/recommendationMemory.js");
// USER.md and MEMORY.md are stable/manual memory files.
// Runtime memories are learned local JSON files, loaded beside stable memory.
async function readMemoryFile(fileName) {
    try {
        return await (0, promises_1.readFile)((0, node_path_1.join)(process.cwd(), "src", "memory", fileName), "utf8");
    }
    catch {
        // Missing memory should not crash the harness.
        // The agent can still run, but memory summary will show the file as unloaded.
        return "";
    }
}
function buildMemorySummary(userMemory, systemMemory, correctionMemories, recommendationMemories) {
    return {
        userMemoryLoaded: userMemory.trim().length > 0,
        systemMemoryLoaded: systemMemory.trim().length > 0,
        correctionMemoryLoaded: correctionMemories.length > 0,
        recommendationMemoryLoaded: recommendationMemories.length > 0,
        userMemoryCharacters: userMemory.length,
        systemMemoryCharacters: systemMemory.length,
        correctionCount: correctionMemories.length,
        recommendationMemoryCount: recommendationMemories.length
    };
}
// Context Builder is the first real harness layer.
// Every request starts with identity + memory before any tool runs.
async function buildContext() {
    const [userMemory, systemMemory, correctionMemories, recommendationMemories] = await Promise.all([
        readMemoryFile("USER.md"),
        readMemoryFile("MEMORY.md"),
        (0, correctionMemory_js_1.listCorrectionMemories)(),
        (0, recommendationMemory_js_1.listRecommendationMemories)()
    ]);
    return {
        provider: config_js_1.config.externalProvider,
        providerUserId: config_js_1.config.externalProviderUserId,
        userMemory,
        systemMemory,
        correctionMemories,
        recommendationMemories,
        memorySummary: buildMemorySummary(userMemory, systemMemory, correctionMemories, recommendationMemories)
    };
}

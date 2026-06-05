"use strict";
// Recommendation Memory stores manager feedback about recommendation behavior.
// This is not model training; it is local, auditable process memory that the
// harness can load before generating future recommendations.
// Example: "for Ashish, check leave calendar before follow-up"
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRecommendationMemory = addRecommendationMemory;
exports.listRecommendationMemories = listRecommendationMemories;
exports.extractRecommendationMemoryText = extractRecommendationMemoryText;
//stores recommendation-specific learning
//saves to local json file 
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const recommendationMemoryFilePath = (0, node_path_1.join)(process.cwd(), ".harness-state", "recommendation-memory.json");
async function readRecommendationMemoryFile() {
    try {
        const raw = await (0, promises_1.readFile)(recommendationMemoryFilePath, "utf8");
        return JSON.parse(raw);
    }
    catch {
        // Missing memory is a normal first-run state.
        // The harness should still work even before managers teach it preferences.
        return [];
    }
}
async function writeRecommendationMemoryFile(memories) {
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(recommendationMemoryFilePath), { recursive: true });
    await (0, promises_1.writeFile)(recommendationMemoryFilePath, JSON.stringify(memories, null, 2), "utf8");
}
//saves a new memory
async function addRecommendationMemory(text) {
    const memories = await readRecommendationMemoryFile();
    const memory = {
        id: Date.now().toString(36),
        text,
        createdAt: new Date().toISOString()
    };
    memories.push(memory);
    await writeRecommendationMemoryFile(memories);
    return memory;
}
//loads all saved recommendation memories
async function listRecommendationMemories() {
    return readRecommendationMemoryFile();
}
//extracts the actual lesson from messages 
function extractRecommendationMemoryText(userMessage) {
    const normalized = userMessage.trim();
    const patterns = [
        /^remember recommendation feedback:\s*(.+)$/i,
        /^remember recommendation:\s*(.+)$/i,
        /^recommendation feedback:\s*(.+)$/i,
        /^learn recommendation feedback:\s*(.+)$/i
    ];
    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    return null;
}

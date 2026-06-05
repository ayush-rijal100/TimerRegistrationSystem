"use strict";
// Correction Memory stores user-provided lessons for future harness behavior.
// This is application-level learning, not model training.
// Example: "remember that reports should use table format"
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCorrectionMemory = addCorrectionMemory;
exports.listCorrectionMemories = listCorrectionMemories;
exports.extractCorrectionText = extractCorrectionText;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const correctionsFilePath = (0, node_path_1.join)(process.cwd(), ".harness-state", "corrections.json");
async function readCorrectionsFile() {
    try {
        const raw = await (0, promises_1.readFile)(correctionsFilePath, "utf8");
        return JSON.parse(raw);
    }
    catch {
        // If no correction file exists yet, the harness simply starts with empty memory.
        return [];
    }
}
async function writeCorrectionsFile(corrections) {
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(correctionsFilePath), { recursive: true });
    await (0, promises_1.writeFile)(correctionsFilePath, JSON.stringify(corrections, null, 2), "utf8");
}
async function addCorrectionMemory(text) {
    const corrections = await readCorrectionsFile();
    const correction = {
        id: Date.now().toString(36),
        text,
        createdAt: new Date().toISOString()
    };
    corrections.push(correction);
    await writeCorrectionsFile(corrections);
    return correction;
}
async function listCorrectionMemories() {
    return readCorrectionsFile();
}
function extractCorrectionText(userMessage) {
    const normalized = userMessage.trim();
    const patterns = [
        /^remember that (.+)$/i,
        /^learn that (.+)$/i,
        /^save correction that (.+)$/i,
        /^correction: (.+)$/i
    ];
    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    return null;
}

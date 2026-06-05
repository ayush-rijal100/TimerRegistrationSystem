"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveKnowledge = retrieveKnowledge;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
// Phase 5 uses simple file-based retrieval.
// No vector database yet. No embeddings yet.
// We choose relevant documents using deterministic keyword matching first.
const knowledgeFiles = [
    {
        title: "TRS Role Permission Matrix",
        sourceFile: "role-permissions.md",
        keywords: [
            "role",
            "roles",
            "permission",
            "permissions",
            "admin",
            "manager",
            "employee",
            "what can admin",
            "what can manager",
            "what can employee"
        ]
    },
    {
        title: "TRS Architecture Rules",
        sourceFile: "architecture-rules.md",
        keywords: [
            "architecture",
            "backend",
            "source of truth",
            "identity",
            "mapping",
            "external identity",
            "draft",
            "confirmation",
            "prompt injection",
            "safety"
        ]
    }
];
function scoreKnowledgeFile(userMessage, keywords) {
    const normalized = userMessage.toLowerCase();
    return keywords.reduce((score, keyword) => {
        return normalized.includes(keyword.toLowerCase()) ? score + 1 : score;
    }, 0);
}
async function retrieveKnowledge(userMessage) {
    const scoredFiles = knowledgeFiles
        .map((file) => ({
        ...file,
        score: scoreKnowledgeFile(userMessage, file.keywords)
    }))
        .filter((file) => file.score > 0)
        .sort((a, b) => b.score - a.score);
    const selectedFiles = scoredFiles.length > 0 ? scoredFiles : [knowledgeFiles[1]];
    return Promise.all(selectedFiles.map(async (file) => {
        const content = await (0, promises_1.readFile)((0, node_path_1.join)(process.cwd(), "src", "knowledge", file.sourceFile), "utf8");
        return {
            title: file.title,
            sourceFile: file.sourceFile,
            content
        };
    }));
}

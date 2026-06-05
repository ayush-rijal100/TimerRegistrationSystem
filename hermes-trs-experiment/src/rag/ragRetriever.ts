import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface RetrievedKnowledge {
  title: string;
  sourceFile: string;
  content: string;
}

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

function scoreKnowledgeFile(userMessage: string, keywords: string[]): number {
  const normalized = userMessage.toLowerCase();

  return keywords.reduce((score, keyword) => {
    return normalized.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

export async function retrieveKnowledge(userMessage: string): Promise<RetrievedKnowledge[]> {
  const scoredFiles = knowledgeFiles
    .map((file) => ({
      ...file,
      score: scoreKnowledgeFile(userMessage, file.keywords)
    }))
    .filter((file) => file.score > 0)
    .sort((a, b) => b.score - a.score);

  const selectedFiles = scoredFiles.length > 0 ? scoredFiles : [knowledgeFiles[1]];

  return Promise.all(
    selectedFiles.map(async (file) => {
      const content = await readFile(
        join(process.cwd(), "src", "knowledge", file.sourceFile),
        "utf8"
      );

      return {
        title: file.title,
        sourceFile: file.sourceFile,
        content
      };
    })
  );
}
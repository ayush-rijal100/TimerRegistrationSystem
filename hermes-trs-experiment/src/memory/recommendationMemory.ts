// Recommendation Memory stores manager feedback about recommendation behavior.
// This is not model training; it is local, auditable process memory that the
// harness can load before generating future recommendations.
// Example: "for Ashish, check leave calendar before follow-up"

//stores recommendation-specific learning
//saves to local json file 


import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface RecommendationMemory {
  id: string;
  text: string;
  createdAt: string;
}

const recommendationMemoryFilePath = join(
  process.cwd(),
  ".harness-state",
  "recommendation-memory.json"
);

async function readRecommendationMemoryFile(): Promise<RecommendationMemory[]> {
  try {
    const raw = await readFile(recommendationMemoryFilePath, "utf8");
    return JSON.parse(raw) as RecommendationMemory[];
  } catch {
    // Missing memory is a normal first-run state.
    // The harness should still work even before managers teach it preferences.
    return [];
  }
}

async function writeRecommendationMemoryFile(
  memories: RecommendationMemory[]
): Promise<void> {
  await mkdir(dirname(recommendationMemoryFilePath), { recursive: true });
  await writeFile(
    recommendationMemoryFilePath,
    JSON.stringify(memories, null, 2),
    "utf8"
  );
}


//saves a new memory
export async function addRecommendationMemory(
  text: string
): Promise<RecommendationMemory> {
  const memories = await readRecommendationMemoryFile();

  const memory: RecommendationMemory = {
    id: Date.now().toString(36),
    text,
    createdAt: new Date().toISOString()
  };

  memories.push(memory);
  await writeRecommendationMemoryFile(memories);

  return memory;
}

//loads all saved recommendation memories
export async function listRecommendationMemories(): Promise<RecommendationMemory[]> {
  return readRecommendationMemoryFile();
}

//extracts the actual lesson from messages 
export function extractRecommendationMemoryText(userMessage: string): string | null {
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

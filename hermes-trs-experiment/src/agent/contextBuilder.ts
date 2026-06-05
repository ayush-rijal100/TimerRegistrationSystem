// build context before the agent acts.
//
// Context means:
// - who is the external provider identity?
// - what stable memory files should be loaded?
// - what learned correction/recommendation memory should be included?
//
// Instead of every file separately loading memory/config, contextBuilder prepares
// all required context in one place before planning or tool execution.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import {
  listCorrectionMemories,
  type CorrectionMemory
} from "../memory/correctionMemory.js";
import {
  listRecommendationMemories,
  type RecommendationMemory
} from "../memory/recommendationMemory.js";

export interface MemorySummary {
  userMemoryLoaded: boolean;
  systemMemoryLoaded: boolean;
  correctionMemoryLoaded: boolean;
  recommendationMemoryLoaded: boolean;
  userMemoryCharacters: number;
  systemMemoryCharacters: number;
  correctionCount: number;
  recommendationMemoryCount: number;
}

export interface HarnessContext {
  provider: string;
  providerUserId: string;
  userMemory: string;
  systemMemory: string;
  correctionMemories: CorrectionMemory[];
  recommendationMemories: RecommendationMemory[];
  memorySummary: MemorySummary;
}

// USER.md and MEMORY.md are stable/manual memory files.
// Runtime memories are learned local JSON files, loaded beside stable memory.
async function readMemoryFile(fileName: string): Promise<string> {
  try {
    return await readFile(join(process.cwd(), "src", "memory", fileName), "utf8");
  } catch {
    // Missing memory should not crash the harness.
    // The agent can still run, but memory summary will show the file as unloaded.
    return "";
  }
}

function buildMemorySummary(
  userMemory: string,
  systemMemory: string,
  correctionMemories: CorrectionMemory[],
  recommendationMemories: RecommendationMemory[]
): MemorySummary {
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
export async function buildContext(): Promise<HarnessContext> {
  const [
    userMemory,
    systemMemory,
    correctionMemories,
    recommendationMemories
  ] = await Promise.all([
    readMemoryFile("USER.md"),
    readMemoryFile("MEMORY.md"),
    listCorrectionMemories(),
    listRecommendationMemories()
  ]);

  return {
    provider: config.externalProvider,
    providerUserId: config.externalProviderUserId,
    userMemory,
    systemMemory,
    correctionMemories,
    recommendationMemories,
    memorySummary: buildMemorySummary(
      userMemory,
      systemMemory,
      correctionMemories,
      recommendationMemories
    )
  };
}

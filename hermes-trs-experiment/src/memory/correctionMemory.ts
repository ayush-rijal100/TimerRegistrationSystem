// Correction Memory stores user-provided lessons for future harness behavior.
// This is application-level learning, not model training.
// Example: "remember that reports should use table format"

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface CorrectionMemory {
  id: string;
  text: string;
  createdAt: string;
}

const correctionsFilePath = join(process.cwd(), ".harness-state", "corrections.json");

async function readCorrectionsFile(): Promise<CorrectionMemory[]> {
  try {
    const raw = await readFile(correctionsFilePath, "utf8");
    return JSON.parse(raw) as CorrectionMemory[];
  } catch {
    // If no correction file exists yet, the harness simply starts with empty memory.
    return [];
  }
}

async function writeCorrectionsFile(corrections: CorrectionMemory[]): Promise<void> {
  await mkdir(dirname(correctionsFilePath), { recursive: true });
  await writeFile(correctionsFilePath, JSON.stringify(corrections, null, 2), "utf8");
}

export async function addCorrectionMemory(text: string): Promise<CorrectionMemory> {
  const corrections = await readCorrectionsFile();

  const correction: CorrectionMemory = {
    id: Date.now().toString(36),
    text,
    createdAt: new Date().toISOString()
  };

  corrections.push(correction);
  await writeCorrectionsFile(corrections);

  return correction;
}

export async function listCorrectionMemories(): Promise<CorrectionMemory[]> {
  return readCorrectionsFile();
}

export function extractCorrectionText(userMessage: string): string | null {
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
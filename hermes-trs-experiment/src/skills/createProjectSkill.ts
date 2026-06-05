// Create Project Skill owns the draft preparation logic for project creation.
// The skill does not write to the backend directly. It prepares a safe draft,
// then the harness waits for explicit confirmation before execution.

import type { CreateProjectDraft } from "../state/pendingActionStore.js";

const explicitCodePatterns = [
  /\bcode\s+([A-Za-z0-9\-_.]+)/i,
  /\bproject\s+code\s+([A-Za-z0-9\-_.]+)/i,
  /\b(PRJ-[A-Za-z0-9\-_.]+)\b/i
];

function extractProjectName(userMessage: string): string | null {
  const patterns = [
    /create\s+(?:me\s+)?(?:a\s+)?project\s+called\s+(.+?)(?:\s+with\s+code\s+|\s+code\s+|$)/i,
    /create\s+(?:me\s+)?(?:a\s+)?project\s+named\s+(.+?)(?:\s+with\s+code\s+|\s+code\s+|$)/i,
    /create\s+(?:me\s+)?(?:a\s+)?project\s+(.+?)(?:\s+with\s+code\s+|\s+code\s+|$)/i
  ];

  for (const pattern of patterns) {
    const match = userMessage.match(pattern);

    if (match?.[1]) {
      return cleanupProjectName(match[1]);
    }
  }

  return null;
}

function extractProjectCode(userMessage: string): string | null {
  for (const pattern of explicitCodePatterns) {
    const match = userMessage.match(pattern);

    if (match?.[1]) {
      return normalizeProjectCode(match[1]);
    }
  }

  return null;
}

function cleanupProjectName(value: string): string {
  return value
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProjectCode(value: string): string {
  return value
    .replace(/["']/g, "")
    .trim()
    .toUpperCase();
}

function generateProjectCode(projectName: string): string {
  const slug = projectName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);

  // The short suffix reduces accidental code collisions while keeping the code readable.
  const suffix = Date.now().toString(36).toUpperCase().slice(-5);
  return `PRJ-${slug || "NEW"}-${suffix}`.slice(0, 30);
}

export function prepareCreateProjectDraft(userMessage: string): CreateProjectDraft | null {
  const projectName = extractProjectName(userMessage);

  if (!projectName || projectName.length < 2) {
    return null;
  }

  return {
    projectName,
    projectCode: extractProjectCode(userMessage) ?? generateProjectCode(projectName)
  };
}
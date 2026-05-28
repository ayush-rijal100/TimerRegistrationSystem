import { ProjectResponse } from "../../trsApi";

export type ProjectMatchResult =
  | { type: "GENERAL_LIST" }
  | { type: "EXACT_MATCH"; project: ProjectResponse }
  | { type: "POSSIBLE_MATCH"; project: ProjectResponse; userText: string }
  | { type: "NO_MATCH"; userText: string };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extractProjectLikeText(message: string): string | null {
  const normalizedMessage = message.trim();

  const codeMatch = normalizedMessage.match(/\bprj[\s-]*\d+\b/i);
  if (codeMatch) {
    return codeMatch[0];
  }

  const detailMatch = normalizedMessage.match(/(?:project|projects|on|about|for|to)\s+([a-z0-9\s-]{3,})/i);
  if (detailMatch?.[1]) {
    return detailMatch[1].trim();
  }

  return null;
}

function lastDigits(value: string): string | null {
  const match = value.match(/(\d+)$/);
  return match ? match[1] : null;
}

export function hasProjectReference(message: string): boolean {
  return extractProjectLikeText(message) !== null;
}

export function matchProjectReference(
  message: string,
  projects: ProjectResponse[],
  explicitProjectReference?: string
): ProjectMatchResult {
  // CHANGED: If the LLM already extracted a project reference, validate that directly against backend projects.
  const userText = explicitProjectReference?.trim() || extractProjectLikeText(message);

  if (!userText) {
    return { type: "GENERAL_LIST" };
  }

  const normalizedUserText = normalize(userText);

  const exactMatch = projects.find((project) => {
    const normalizedCode = normalize(project.projectCode);
    const normalizedName = normalize(project.projectName);

    return normalizedUserText === normalizedCode || normalizedUserText === normalizedName;
  });

  if (exactMatch) {
    return { type: "EXACT_MATCH", project: exactMatch };
  }

  const digitHint = lastDigits(normalizedUserText);

  if (digitHint) {
    const possibleMatches = projects.filter((project) => {
      const projectDigits = lastDigits(normalize(project.projectCode));
      return projectDigits === digitHint || projectDigits?.endsWith(digitHint);
    });

    if (possibleMatches.length === 1) {
      return {
        type: "POSSIBLE_MATCH",
        project: possibleMatches[0],
        userText
      };
    }
  }

  const containsMatch = projects.find((project) => {
    const normalizedCode = normalize(project.projectCode);
    const normalizedName = normalize(project.projectName);

    return normalizedCode.includes(normalizedUserText)
      || normalizedUserText.includes(normalizedCode)
      || normalizedName.includes(normalizedUserText)
      || normalizedUserText.includes(normalizedName);
  });

  if (containsMatch) {
    return {
      type: "POSSIBLE_MATCH",
      project: containsMatch,
      userText
    };
  }

  return { type: "NO_MATCH", userText };
}
// ADDED: A stricter check for project follow-up messages.
// We use this after the last topic was project assignment, so generic phrases like
// "summarize it to bullet points" do not get mistaken for a project lookup.
export function hasStrongProjectReference(message: string): boolean {
  return /\bprj[\s-]*\d+\b/i.test(message)
    || /\bproj(?:ect)?[\s-]*\d+\b/i.test(message)
    || /\bproject\b/i.test(message);
}


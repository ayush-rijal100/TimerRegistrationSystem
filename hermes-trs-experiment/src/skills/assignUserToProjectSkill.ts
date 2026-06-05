// Assign User To Project Skill extracts raw user/project references from text.
// It does not decide whether the references are valid. That belongs to the resolver,
// because validation must happen against real backend users and projects.

export interface AssignmentReferences {
  userReference: string;
  projectReference: string;
}

const assignmentPatterns = [
  /assign\s+(.+?)\s+to\s+(.+)/i,
  /put\s+(.+?)\s+on\s+(.+)/i,
  /add\s+(.+?)\s+to\s+(.+)/i
];

export function extractAssignmentReferences(
  userMessage: string
): AssignmentReferences | null {
  for (const pattern of assignmentPatterns) {
    const match = userMessage.match(pattern);

    if (match?.[1] && match?.[2]) {
      return {
        userReference: cleanupReference(match[1]),
        projectReference: cleanupReference(match[2])
      };
    }
  }

  return null;
}

function cleanupReference(value: string): string {
  return value
    .replace(/^user\s+/i, "")
    .replace(/^project\s+/i, "")
    .replace(/^id\s+/i, "")
    .trim();
}
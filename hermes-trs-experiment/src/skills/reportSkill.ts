// Report Skill contains report-specific text extraction and matching helpers.
// The backend returns the authoritative report data; this skill only helps the
// harness decide whether the user asked for the whole team or one employee.

import type { MissingEntriesReportResponse, UtilizationReportResponse } from "../adapters/trsAdapter.js";

type EmployeeReportItem = MissingEntriesReportResponse | UtilizationReportResponse;

export type EmployeeReportMatch<T extends EmployeeReportItem = EmployeeReportItem> =
  | {
      status: "NO_REFERENCE";
    }
  | {
      status: "MATCHED";
      employee: T;
      employeeReference: string;
    }
  | {
      status: "NOT_FOUND";
      employeeReference: string;
    }
  | {
      status: "AMBIGUOUS";
      employeeReference: string;
      matches: T[];
    };

export function extractEmployeeReferenceForMissingEntries(
  userMessage: string,
  dateLabel: string
): string | null {
  const withoutDateLabel = removeDateWords(userMessage, dateLabel);

  const patterns = [
    /(?:for|of)\s+(.+?)\s+(?:in|for|of)\s+/i,
    /(?:for|of)\s+employee\s+(.+)/i,
    /(?:for|of)\s+mr\.?\s+(.+)/i,
    /(?:for|of)\s+ms\.?\s+(.+)/i,
    /(?:for|of)\s+(.+)/i
  ];

  for (const pattern of patterns) {
    const match = withoutDateLabel.match(pattern);

    if (match?.[1]) {
      const cleaned = cleanupEmployeeReference(match[1]);

      if (cleaned.length > 0 && !isGenericReportReference(cleaned)) {
        return cleaned;
      }
    }
  }

  return null;
}

export function matchReportEmployee<T extends EmployeeReportItem>(
  employeeReference: string | null,
  report: T[]
): EmployeeReportMatch<T> {
  if (!employeeReference) {
    return { status: "NO_REFERENCE" };
  }

  const normalizedReference = normalize(employeeReference);

  const matches = report.filter((item) => {
    const normalizedName = normalize(item.fullName);
    const id = String(item.userId);

    return (
      normalizedReference === id ||
      normalizedName === normalizedReference ||
      normalizedName.includes(normalizedReference)
    );
  });

  if (matches.length === 0) {
    return {
      status: "NOT_FOUND",
      employeeReference
    };
  }

  if (matches.length > 1) {
    return {
      status: "AMBIGUOUS",
      employeeReference,
      matches
    };
  }

  return {
    status: "MATCHED",
    employee: matches[0],
    employeeReference
  };
}

function removeDateWords(userMessage: string, dateLabel: string): string {
  const [monthName, year] = dateLabel.split(" ");

  return userMessage
    .replace(new RegExp(`\\b${monthName}\\b`, "ig"), " ")
    .replace(new RegExp(`\\b${year}\\b`, "ig"), " ")
    .replace(/\b(this|current|previous|last)\s+month\b/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanupEmployeeReference(value: string): string {
  return value
    .replace(/\b(employee|user|person|staff|member)\b/gi, " ")
    .replace(/\bmonth\b/gi, " ")
    // Remove connector words that may remain after date words are stripped.
    // Example: "Bijaya Tiwari in May 2026" becomes "Bijaya Tiwari in",
    // so this final cleanup keeps only the employee reference.
    .replace(/\b(in|for|of)\s*$/gi, " ")
    .replace(/^\s*\b(in|for|of)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericReportReference(value: string): boolean {
  const normalized = normalize(value);

  return [
    "missing entries",
    "missing time entries",
    "missing work logs",
    "work logs",
    "entries"
  ].includes(normalized);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// Backward-compatible alias for the missing-entry report path.
export function matchMissingEntriesEmployee(
  employeeReference: string | null,
  report: MissingEntriesReportResponse[]
): EmployeeReportMatch<MissingEntriesReportResponse> {
  return matchReportEmployee(employeeReference, report);
}

export function extractEmployeeReferenceForUtilization(
  userMessage: string,
  dateLabel: string
): string | null {
  return extractEmployeeReferenceForMissingEntries(userMessage, dateLabel);
}

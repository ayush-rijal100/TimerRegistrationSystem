// Lightweight terminal logger for the Hermes TRS harness.
// The goal is observability, not business logic: logs explain what the harness
// decided, which tools it called, and which memory/context was applied.

type LogDetails = Record<string, unknown>;

type LogArea =
  | "HARNESS"
  | "SAFETY"
  | "CONTEXT"
  | "PLANNER"
  | "DATE_RANGE"
  | "TOOL"
  | "POLICY"
  | "REPORT"
  | "INSIGHT"
  | "MEMORY"
  | "DRAFT"
  | "ACTION"
  | "VERIFY"

  | "ERROR";

function isLoggingEnabled(): boolean {
  // Keep logs on by default for this learning/demo phase.
  // Set HARNESS_LOG_LEVEL=off if you ever want clean response-only output.
  return process.env.HARNESS_LOG_LEVEL?.toLowerCase() !== "off";
}

function redactSensitiveText(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  // Prevent accidental terminal leakage when users type secret-like values.
  return value
    .replace(/(password\s*[:=]?\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(token\s*[:=]?\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(secret\s*[:=]?\s*)\S+/gi, "$1[REDACTED]");
}

function sanitizeDetails(details?: LogDetails): LogDetails | undefined {
  if (!details) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, redactSensitiveText(value)])
  );
}

function writeLog(area: LogArea, message: string, details?: LogDetails): void {
  if (!isLoggingEnabled()) {
    return;
  }

  const safeDetails = sanitizeDetails(details);
  const suffix = safeDetails ? ` ${JSON.stringify(safeDetails)}` : "";
  console.log(`[${area}] ${message}${suffix}`);
}

export const harnessLogger = {
  info(area: LogArea, message: string, details?: LogDetails): void {
    writeLog(area, message, details);
  },

  error(area: LogArea, message: string, details?: LogDetails): void {
    writeLog(area, message, details);
  }
};


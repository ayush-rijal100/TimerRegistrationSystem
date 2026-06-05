// Phase 32: Tool Execution Wrapper.
//
// This wrapper centralizes the repeated harness pattern:
// 1. log tool start
// 2. call backend/tool adapter
// 3. log tool success
// 4. verify returned shape
// 5. log verification result
// 6. format response or return a clean harness error
//
// Why this matters:
// As the harness grows, each tool should not manually repeat logging,
// verification, formatting, and error handling. This wrapper is a first step
// toward a proper tool registry/execution layer.

import { formatBackendError, formatToolVerificationError } from "../formatters/responseFormatter.js";
import { harnessLogger } from "../observability/harnessLogger.js";
import type { ToolVerificationResult } from "../verification/toolResultVerifier.js";

interface ExecuteVerifiedToolOptions<TValue> {
  toolName: string;
  run: () => Promise<TValue>;
  verify: (value: TValue) => ToolVerificationResult;
  format: (value: TValue) => string;
}

function getRowCount(value: unknown): number | string {
  return Array.isArray(value) ? value.length : "n/a";
}

function logToolVerification(
  toolName: string,
  result: ToolVerificationResult,
  rows: number | string
): void {
  if (result.ok) {
    harnessLogger.info("VERIFY", `${toolName} passed`, { rows });
    return;
  }

  harnessLogger.info("VERIFY", `${toolName} failed`, {
    reason: result.reason,
    itemIndex: result.itemIndex ?? "n/a"
  });
}

export async function executeVerifiedTool<TValue>(
  options: ExecuteVerifiedToolOptions<TValue>
): Promise<string> {
  try {
    harnessLogger.info("TOOL", `${options.toolName} start`);

    const value = await options.run();
    const rows = getRowCount(value);

    harnessLogger.info("TOOL", `${options.toolName} success`, { rows });

    const verification = options.verify(value);
    logToolVerification(options.toolName, verification, rows);

    if (!verification.ok) {
      return formatToolVerificationError(verification);
    }

    return options.format(value);
  } catch (error) {
    return formatBackendError(error);
  }
}

export interface VerifiedToolDataSuccess<TValue> {
  ok: true;
  value: TValue;
}

export interface VerifiedToolDataFailure {
  ok: false;
  response: string;
}

export type VerifiedToolDataResult<TValue> =
  | VerifiedToolDataSuccess<TValue>
  | VerifiedToolDataFailure;

export async function executeVerifiedToolData<TValue>(
  options: Omit<ExecuteVerifiedToolOptions<TValue>, "format">
): Promise<VerifiedToolDataResult<TValue>> {
  try {
    harnessLogger.info("TOOL", `${options.toolName} start`);

    const value = await options.run();
    const rows = getRowCount(value);

    harnessLogger.info("TOOL", `${options.toolName} success`, { rows });

    const verification = options.verify(value);
    logToolVerification(options.toolName, verification, rows);

    if (!verification.ok) {
      return {
        ok: false,
        response: formatToolVerificationError(verification)
      };
    }

    return {
      ok: true,
      value
    };
  } catch (error) {
    return {
      ok: false,
      response: formatBackendError(error)
    };
  }
}

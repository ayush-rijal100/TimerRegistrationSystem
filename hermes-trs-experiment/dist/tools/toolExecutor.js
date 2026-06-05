"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeVerifiedTool = executeVerifiedTool;
exports.executeVerifiedToolData = executeVerifiedToolData;
const responseFormatter_js_1 = require("../formatters/responseFormatter.js");
const harnessLogger_js_1 = require("../observability/harnessLogger.js");
function getRowCount(value) {
    return Array.isArray(value) ? value.length : "n/a";
}
function logToolVerification(toolName, result, rows) {
    if (result.ok) {
        harnessLogger_js_1.harnessLogger.info("VERIFY", `${toolName} passed`, { rows });
        return;
    }
    harnessLogger_js_1.harnessLogger.info("VERIFY", `${toolName} failed`, {
        reason: result.reason,
        itemIndex: result.itemIndex ?? "n/a"
    });
}
async function executeVerifiedTool(options) {
    try {
        harnessLogger_js_1.harnessLogger.info("TOOL", `${options.toolName} start`);
        const value = await options.run();
        const rows = getRowCount(value);
        harnessLogger_js_1.harnessLogger.info("TOOL", `${options.toolName} success`, { rows });
        const verification = options.verify(value);
        logToolVerification(options.toolName, verification, rows);
        if (!verification.ok) {
            return (0, responseFormatter_js_1.formatToolVerificationError)(verification);
        }
        return options.format(value);
    }
    catch (error) {
        return (0, responseFormatter_js_1.formatBackendError)(error);
    }
}
async function executeVerifiedToolData(options) {
    try {
        harnessLogger_js_1.harnessLogger.info("TOOL", `${options.toolName} start`);
        const value = await options.run();
        const rows = getRowCount(value);
        harnessLogger_js_1.harnessLogger.info("TOOL", `${options.toolName} success`, { rows });
        const verification = options.verify(value);
        logToolVerification(options.toolName, verification, rows);
        if (!verification.ok) {
            return {
                ok: false,
                response: (0, responseFormatter_js_1.formatToolVerificationError)(verification)
            };
        }
        return {
            ok: true,
            value
        };
    }
    catch (error) {
        return {
            ok: false,
            response: (0, responseFormatter_js_1.formatBackendError)(error)
        };
    }
}

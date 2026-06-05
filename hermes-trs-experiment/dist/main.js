"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const harness_js_1 = require("./agent/harness.js");
const harnessLogger_js_1 = require("./observability/harnessLogger.js");
async function main() {
    const requestStartedAt = Date.now();
    const userMessage = process.argv.slice(2).join(" ").trim() || "who am I?";
    const response = await (0, harness_js_1.runHarness)(userMessage);
    // Completion is logged at the CLI boundary so every successful harness path
    // gets a final duration line without forcing every return branch to duplicate it.
    harnessLogger_js_1.harnessLogger.info("HARNESS", "request completed", {
        durationMs: Date.now() - requestStartedAt,
        outcome: "response_returned"
    });
    console.log(response);
}
main().catch((error) => {
    harnessLogger_js_1.harnessLogger.error("ERROR", "harness failed", {
        message: error instanceof Error ? error.message : String(error)
    });
    console.error("Harness failed:", error instanceof Error ? error.message : error);
    process.exit(1);
});

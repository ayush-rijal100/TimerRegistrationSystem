import { runHarness } from "./agent/harness.js";
import { harnessLogger } from "./observability/harnessLogger.js";

async function main(): Promise<void> {
  const requestStartedAt = Date.now();
  const userMessage = process.argv.slice(2).join(" ").trim() || "who am I?";
  const response = await runHarness(userMessage);

  // Completion is logged at the CLI boundary so every successful harness path
  // gets a final duration line without forcing every return branch to duplicate it.
  harnessLogger.info("HARNESS", "request completed", {
    durationMs: Date.now() - requestStartedAt,
    outcome: "response_returned"
  });

  console.log(response);
}

main().catch((error) => {
  harnessLogger.error("ERROR", "harness failed", {
    message: error instanceof Error ? error.message : String(error)
  });
  console.error("Harness failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});


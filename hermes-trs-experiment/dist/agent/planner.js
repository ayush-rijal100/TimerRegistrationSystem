"use strict";
// Planner converts a raw user message into a small harness intent.
// Phase 13 still uses deterministic routing so we can prove admin assignment
// draft-confirm-execute before adding an LLM planner later.
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRequest = planRequest;
exports.applyPlannerCorrections = applyPlannerCorrections;
function planRequest(userMessage) {
    const normalized = userMessage.toLowerCase().trim();
    if (["yes", "y", "confirm", "confirmed", "save it", "create it", "assign it", "go ahead"].includes(normalized)) {
        return { intent: "CONFIRM_PENDING_ACTION" };
    }
    if (["no", "n", "cancel", "discard", "stop"].includes(normalized)) {
        return { intent: "CANCEL_PENDING_ACTION" };
    }
    // Phase 22: Recommendation memory is separate from general correction memory.
    // It captures manager feedback about how recommendations should be phrased or prioritized.
    if (normalized.startsWith("remember recommendation feedback:") ||
        normalized.startsWith("remember recommendation:") ||
        normalized.startsWith("recommendation feedback:") ||
        normalized.startsWith("learn recommendation feedback:")) {
        return { intent: "ADD_RECOMMENDATION_MEMORY" };
    }
    if (normalized.includes("show recommendation memory") ||
        normalized.includes("list recommendation memory") ||
        normalized.includes("show recommendation feedback") ||
        normalized.includes("what recommendation feedback")) {
        return { intent: "SHOW_RECOMMENDATION_MEMORY" };
    }
    if (normalized.startsWith("remember that ") ||
        normalized.startsWith("learn that ") ||
        normalized.startsWith("save correction that ") ||
        normalized.startsWith("correction: ")) {
        return { intent: "ADD_CORRECTION_MEMORY" };
    }
    if (normalized.includes("show corrections") ||
        normalized.includes("show correction memory") ||
        normalized.includes("list corrections") ||
        normalized.includes("what have you learned")) {
        return { intent: "SHOW_CORRECTION_MEMORY" };
    }
    // Phase 14: Assignment intent should trigger for natural admin language,
    // not only when the user literally writes the word "project".
    // Examples:
    // - assign Bijaya Tiwari to PRJ-001
    // - assign Ram Sharma to Client Implementation
    // - put Hari Bahadur on Mobile Banking App
    if (normalized.includes("assign") ||
        normalized.includes("put ") ||
        normalized.includes("add ")) {
        if (normalized.includes(" to ") || normalized.includes(" on ")) {
            return { intent: "ASSIGN_USER_TO_PROJECT_DRAFT" };
        }
    }
    if (normalized.includes("create project") ||
        normalized.includes("create me a project") ||
        normalized.includes("create a project")) {
        return { intent: "CREATE_PROJECT_DRAFT" };
    }
    if (normalized.includes("who am i") ||
        normalized.includes("whoami") ||
        normalized.includes("my profile") ||
        normalized.includes("my account")) {
        return { intent: "WHO_AM_I" };
    }
    if (normalized.includes("show registered tools") ||
        normalized.includes("show tool registry") ||
        normalized.includes("what tools can you use") ||
        normalized.includes("what tools are registered") ||
        normalized.includes("list registered tools") ||
        normalized.includes("list tool registry")) {
        return { intent: "SHOW_REGISTERED_TOOLS" };
    }
    if (normalized.includes("show context") ||
        normalized.includes("show memory") ||
        normalized.includes("memory status") ||
        normalized.includes("context status")) {
        return { intent: "SHOW_CONTEXT" };
    }
    if (normalized.includes("show all projects") ||
        normalized.includes("list all projects") ||
        normalized.includes("all trs projects") ||
        normalized.includes("company projects") ||
        normalized.includes("all company projects")) {
        return { intent: "GET_ADMIN_PROJECTS" };
    }
    if (normalized.includes("my projects") ||
        normalized.includes("assigned projects") ||
        normalized.includes("projects assigned to me") ||
        normalized.includes("show projects") ||
        normalized.includes("list projects")) {
        return { intent: "GET_MY_PROJECTS" };
    }
    if (normalized.includes("show all users") ||
        normalized.includes("list all users") ||
        normalized.includes("show users") ||
        normalized.includes("list users") ||
        normalized.includes("company users") ||
        normalized.includes("all employees") ||
        normalized.includes("all staff")) {
        return { intent: "GET_ADMIN_USERS" };
    }
    // Phase 19: Manager/Admin utilization reports are read-only business reports.
    // Later, the AI planner can classify richer phrases like "who is underutilized?".
    if (normalized.includes("utilization") ||
        normalized.includes("utilisation") ||
        normalized.includes("utilized") ||
        normalized.includes("underutilized") ||
        normalized.includes("hours worked")) {
        return { intent: "GET_UTILIZATION_REPORT" };
    }
    // Phase 21: Manager recommendations are advisory only.
    // They use the same report data as insight but phrase safe next steps.
    if (normalized.includes("recommend actions") ||
        normalized.includes("recommended actions") ||
        normalized.includes("what should manager do") ||
        normalized.includes("what should i do") ||
        normalized.includes("suggest actions") ||
        normalized.includes("next actions")) {
        return { intent: "GET_MANAGER_RECOMMENDATIONS" };
    }
    // Phase 20: Manager insight combines multiple reports into one read-only summary.
    // This is our first step from raw reporting toward agent-style analysis.
    if (normalized.includes("manager insight") ||
        normalized.includes("team insight") ||
        normalized.includes("team health") ||
        normalized.includes("who needs attention") ||
        normalized.includes("attention areas") ||
        normalized.includes("any issues this month")) {
        return { intent: "GET_MANAGER_INSIGHT" };
    }
    // Phase 17: Manager/Admin missing-entry reports are read-only business reports.
    // This deterministic route is temporary; later the AI planner can classify richer report language.
    if (normalized.includes("missing entries") ||
        normalized.includes("missing time entries") ||
        normalized.includes("missing work logs") ||
        normalized.includes("missed work logs")) {
        return { intent: "GET_MISSING_ENTRIES_REPORT" };
    }
    if (normalized.includes("show project assignments") ||
        normalized.includes("list project assignments") ||
        normalized.includes("show user project assignments") ||
        normalized.includes("user project assignments") ||
        normalized.includes("who is assigned to which project") ||
        normalized.includes("who is assigned to projects") ||
        normalized.includes("project assignment list")) {
        return { intent: "GET_PROJECT_ASSIGNMENTS" };
    }
    // Knowledge/RAG route. These questions should be answered from local TRS docs,
    // not from live database data.
    if (normalized.includes("what can admin") ||
        normalized.includes("what can manager") ||
        normalized.includes("what can employee") ||
        normalized.includes("role") ||
        normalized.includes("permission") ||
        normalized.includes("architecture") ||
        normalized.includes("source of truth") ||
        normalized.includes("identity mapping") ||
        normalized.includes("external identity") ||
        normalized.includes("draft before save") ||
        normalized.includes("prompt injection")) {
        return { intent: "KNOWLEDGE_QUERY" };
    }
    return { intent: "UNSUPPORTED" };
}
// Phase 24C: Planner correction guard.
// AI is now the preferred planner, but weak/cheap models may still confuse broad
// manager questions like "who seems behind" with raw missing-entry reports.
// This guard only corrects obvious high-level management wording before tools run.
function applyPlannerCorrections(userMessage, plan) {
    const normalized = userMessage.toLowerCase().trim();
    const asksForRegisteredTools = normalized.includes("show registered tools") ||
        normalized.includes("show tool registry") ||
        normalized.includes("what tools can you use") ||
        normalized.includes("what tools are registered") ||
        normalized.includes("list registered tools") ||
        normalized.includes("list tool registry");
    if (asksForRegisteredTools) {
        return { intent: "SHOW_REGISTERED_TOOLS" };
    }
    const asksForHarnessContext = normalized === "show memory" ||
        normalized === "show context" ||
        normalized === "memory status" ||
        normalized === "context status" ||
        normalized.includes("harness context");
    const asksForSpecificMemory = normalized.includes("correction memory") ||
        normalized.includes("show corrections") ||
        normalized.includes("recommendation memory") ||
        normalized.includes("recommendation feedback");
    if (asksForHarnessContext && !asksForSpecificMemory) {
        return { intent: "SHOW_CONTEXT" };
    }
    const asksForExplicitMissingLogs = normalized.includes("missing entries") ||
        normalized.includes("missing time entries") ||
        normalized.includes("missing logs") ||
        normalized.includes("missing work logs") ||
        normalized.includes("missed logs") ||
        normalized.includes("missed work logs") ||
        normalized.includes("missing dates");
    const asksForBroadManagerDiagnosis = normalized.includes("who seems behind") ||
        normalized.includes("who is behind") ||
        normalized.includes("who's behind") ||
        normalized.includes("falling behind") ||
        normalized.includes("needs attention") ||
        normalized.includes("need attention") ||
        normalized.includes("team health") ||
        normalized.includes("attention areas") ||
        normalized.includes("who should i look at");
    if (plan.intent === "GET_MISSING_ENTRIES_REPORT" &&
        asksForBroadManagerDiagnosis &&
        !asksForExplicitMissingLogs) {
        return { intent: "GET_MANAGER_INSIGHT" };
    }
    return plan;
}

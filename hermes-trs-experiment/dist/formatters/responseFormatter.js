"use strict";
// Response Formatter keeps user-facing output consistent.
// Tool handlers return structured data; this layer decides how to present it
// for terminal output now, and later for Discord/Claude/web channels.
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatWhoAmIPlaceholder = formatWhoAmIPlaceholder;
exports.formatCurrentUserResponse = formatCurrentUserResponse;
exports.formatContextSummary = formatContextSummary;
exports.formatMyProjectsResponse = formatMyProjectsResponse;
exports.formatAdminProjectsResponse = formatAdminProjectsResponse;
exports.formatAdminUsersResponse = formatAdminUsersResponse;
exports.formatProjectAssignmentsResponse = formatProjectAssignmentsResponse;
exports.formatKnowledgeResponse = formatKnowledgeResponse;
exports.formatSafetyRejection = formatSafetyRejection;
exports.formatCreateProjectDraft = formatCreateProjectDraft;
exports.formatCreateProjectMissingFields = formatCreateProjectMissingFields;
exports.formatAssignUserToProjectDraft = formatAssignUserToProjectDraft;
exports.formatAssignUserToProjectMissingFields = formatAssignUserToProjectMissingFields;
exports.formatAssignmentResolveProblem = formatAssignmentResolveProblem;
exports.formatAssignmentAlreadyExists = formatAssignmentAlreadyExists;
exports.formatNoPendingAction = formatNoPendingAction;
exports.formatPendingActionCancelled = formatPendingActionCancelled;
exports.formatCreateProjectSuccess = formatCreateProjectSuccess;
exports.formatAssignUserToProjectSuccess = formatAssignUserToProjectSuccess;
exports.formatCorrectionSaved = formatCorrectionSaved;
exports.formatCorrectionList = formatCorrectionList;
exports.formatCorrectionMissingText = formatCorrectionMissingText;
exports.formatMissingEntriesReportResponse = formatMissingEntriesReportResponse;
exports.formatSingleEmployeeMissingEntriesResponse = formatSingleEmployeeMissingEntriesResponse;
exports.formatMissingEntriesEmployeeMatchProblem = formatMissingEntriesEmployeeMatchProblem;
exports.formatMissingEntriesMissingDateRange = formatMissingEntriesMissingDateRange;
exports.formatUtilizationReportResponse = formatUtilizationReportResponse;
exports.formatSingleEmployeeUtilizationResponse = formatSingleEmployeeUtilizationResponse;
exports.formatUtilizationEmployeeMatchProblem = formatUtilizationEmployeeMatchProblem;
exports.formatUtilizationMissingDateRange = formatUtilizationMissingDateRange;
exports.formatManagerInsightResponse = formatManagerInsightResponse;
exports.formatManagerRecommendationsResponse = formatManagerRecommendationsResponse;
exports.formatManagerRecommendationsMissingDateRange = formatManagerRecommendationsMissingDateRange;
exports.formatRecommendationMemorySaved = formatRecommendationMemorySaved;
exports.formatRecommendationMemoryList = formatRecommendationMemoryList;
exports.formatRecommendationMemoryMissingText = formatRecommendationMemoryMissingText;
exports.formatRegisteredToolsResponse = formatRegisteredToolsResponse;
exports.formatUnsupportedResponse = formatUnsupportedResponse;
exports.formatBackendError = formatBackendError;
exports.formatToolVerificationError = formatToolVerificationError;
function formatWhoAmIPlaceholder(context) {
    return [
        "Phase 1 harness is running.",
        "The next phase will connect this request to the TRS backend.",
        "",
        `Configured provider: ${context.provider}`,
        `Configured provider user id: ${context.providerUserId}`
    ].join("\n");
}
// Phase 2: Format the real TRS user resolved from the backend identity endpoint.
function formatCurrentUserResponse(user) {
    return [
        "You are mapped to this TRS user:",
        "",
        `Name: ${user.fullName}`,
        `Email: ${user.email}`,
        `Role: ${user.role}`,
        `User ID: ${user.userId}`
    ].join("\n");
}
// Phase 3: Developer-facing context/memory status response.
// This proves the Context Builder and Memory Layer are active before tool execution.
function formatContextSummary(context) {
    return [
        "Harness context status:",
        "",
        `Provider: ${context.provider}`,
        `Provider user id: ${context.providerUserId}`,
        "",
        "Memory sources:",
        `USER.md loaded: ${context.memorySummary.userMemoryLoaded}`,
        `USER.md characters: ${context.memorySummary.userMemoryCharacters}`,
        `MEMORY.md loaded: ${context.memorySummary.systemMemoryLoaded}`,
        `MEMORY.md characters: ${context.memorySummary.systemMemoryCharacters}`,
        `Correction memory loaded: ${context.memorySummary.correctionMemoryLoaded}`,
        `Correction count: ${context.memorySummary.correctionCount}`,
        "",
        "Loaded corrections:",
        ...(context.correctionMemories.length > 0
            ? context.correctionMemories.map((correction, index) => `${index + 1}. ${correction.text}`)
            : ["No correction memories stored yet."]),
        "",
        "Meaning:",
        "The harness can now load user preferences, TRS technical memory, and learned corrections before choosing tools."
    ].join("\n");
}
// Phase 4: Format assigned projects as a clean terminal-friendly table.
function formatMyProjectsResponse(projects) {
    if (projects.length === 0) {
        return "You do not have any assigned TRS projects right now.";
    }
    const rows = projects.map((project) => {
        const code = project.projectCode.padEnd(8);
        const status = (project.active ? "ACTIVE" : "INACTIVE").padEnd(8);
        const name = project.projectName.length > 32
            ? `${project.projectName.slice(0, 29)}...`
            : project.projectName;
        return `${code} | ${status} | ${name}`;
    });
    return [
        "Your assigned TRS projects:",
        "",
        "Code     | Status   | Project Name",
        "---------|----------|--------------------------------",
        ...rows
    ].join("\n");
}
// Phase 10: Format admin all-projects response.
function formatAdminProjectsResponse(projects) {
    if (projects.length === 0) {
        return "No TRS projects were found.";
    }
    const rows = projects.map((project) => {
        const code = project.projectCode.padEnd(8);
        const status = (project.active ? "ACTIVE" : "INACTIVE").padEnd(8);
        const name = project.projectName.length > 36
            ? `${project.projectName.slice(0, 33)}...`
            : project.projectName;
        return `${code} | ${status} | ${name}`;
    });
    return [
        `Here are the ${projects.length} projects currently available in TRS:`,
        "",
        "Code     | Status   | Project Name",
        "---------|----------|------------------------------------",
        ...rows
    ].join("\n");
}
// Phase 11: Format admin all-users response.
function formatAdminUsersResponse(users) {
    if (users.length === 0) {
        return "No TRS users were found.";
    }
    const rows = users.map((user) => {
        const id = String(user.id).padEnd(3);
        const name = user.fullName.length > 18
            ? `${user.fullName.slice(0, 15)}...`
            : user.fullName.padEnd(18);
        const role = user.role.padEnd(8);
        const status = (user.active ? "ACTIVE" : "INACTIVE").padEnd(8);
        const email = user.email.length > 28
            ? `${user.email.slice(0, 25)}...`
            : user.email;
        return `${id} | ${name} | ${role} | ${status} | ${email}`;
    });
    return [
        `Here are the ${users.length} users currently registered in TRS:`,
        "",
        "ID  | Name               | Role     | Status   | Email",
        "----|--------------------|----------|----------|----------------------------",
        ...rows
    ].join("\n");
}
// Phase 12: Format project assignments.
// This prepares the admin for future assignment write actions.
function formatProjectAssignmentsResponse(assignments) {
    if (assignments.length === 0) {
        return "No TRS project assignments were found.";
    }
    const rows = assignments.map((assignment) => {
        const user = assignment.fullName.length > 18
            ? `${assignment.fullName.slice(0, 15)}...`
            : assignment.fullName.padEnd(18);
        const role = assignment.role.padEnd(8);
        const code = assignment.projectCode.padEnd(8);
        const projectStatus = (assignment.projectActive ? "ACTIVE" : "INACTIVE").padEnd(8);
        const project = assignment.projectName.length > 32
            ? `${assignment.projectName.slice(0, 29)}...`
            : assignment.projectName;
        return `${user} | ${role} | ${code} | ${projectStatus} | ${project}`;
    });
    return [
        `Here are the ${assignments.length} current TRS project assignments:`,
        "",
        "User               | Role     | Project  | ProjStat | Project Name",
        "-------------------|----------|----------|----------|--------------------------------",
        ...rows
    ].join("\n");
}
// Phase 5: Knowledge responses are generated from retrieved local docs.
function formatKnowledgeResponse(userMessage, retrievedKnowledge) {
    const sourceList = retrievedKnowledge
        .map((item) => `- ${item.title} (${item.sourceFile})`)
        .join("\n");
    const contentPreview = retrievedKnowledge
        .map((item) => {
        const compactContent = item.content
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .slice(0, 18)
            .join("\n");
        return `Source: ${item.title}\n${compactContent}`;
    })
        .join("\n\n---\n\n");
    return [
        "TRS knowledge answer:",
        "",
        `Question: ${userMessage}`,
        "",
        "Sources used:",
        sourceList,
        "",
        contentPreview
    ].join("\n");
}
// Phase 6: Safety responses explain what was blocked without leaking secrets.
function formatSafetyRejection(safetyResult) {
    return [
        "I cannot process that request because it conflicts with the TRS harness safety policy.",
        "",
        `Category: ${safetyResult.category}`,
        `Reason: ${safetyResult.message}`,
        safetyResult.matchedPattern
            ? `Matched pattern: ${safetyResult.matchedPattern}`
            : "",
        "",
        "Safe approach:",
        "Ask for normal TRS actions like:",
        "- who am I?",
        "- show my projects",
        "- what can admin do?",
        "- what is external identity mapping?"
    ]
        .filter((line) => line.length > 0)
        .join("\n");
}
// Phase 7: Show a create-project draft before backend mutation.
function formatCreateProjectDraft(action) {
    if (action.type !== "CREATE_PROJECT") {
        return "Pending action is not a project creation draft.";
    }
    return [
        "Project creation draft prepared. No backend changes have been made yet.",
        "",
        "Draft details:",
        `Project code : ${action.draft.projectCode}`,
        `Project name : ${action.draft.projectName}`,
        "Status       : ACTIVE after creation",
        "",
        "Next step:",
        "- Reply `yes` or `confirm` to create this project in TRS.",
        "- Reply `cancel` to discard this draft.",
        "",
        "Safety note: this write action will only run after confirmation."
    ].join("\n");
}
function formatCreateProjectMissingFields() {
    return [
        "I can prepare a project draft, but I need a project name.",
        "",
        "Try:",
        "create project called Smart Parking AI",
        "create project called Smart Parking AI with code PRJ-SMART-PARKING"
    ].join("\n");
}
// Phase 13: Show assignment draft before calling backend write endpoint.
function formatAssignUserToProjectDraft(action) {
    if (action.type !== "ASSIGN_USER_TO_PROJECT") {
        return "Pending action is not a user-project assignment draft.";
    }
    const userLabel = action.draft.userName && action.draft.userEmail
        ? `${action.draft.userName} (${action.draft.userEmail})`
        : `User ID ${action.draft.userId}`;
    const projectLabel = action.draft.projectCode && action.draft.projectName
        ? `${action.draft.projectCode} - ${action.draft.projectName}`
        : `Project ID ${action.draft.projectId}`;
    return [
        "User-project assignment draft prepared. No backend changes have been made yet.",
        "",
        "Draft details:",
        `User    : ${userLabel}`,
        `Project : ${projectLabel}`,
        "",
        "Next step:",
        "- Reply `yes` or `confirm` to assign this user to the project.",
        "- Reply `cancel` to discard this draft.",
        "",
        "Safety note: the harness resolved this against live backend users/projects before preparing the draft."
    ].join("\n");
}
function formatAssignUserToProjectMissingFields() {
    return [
        "I can prepare an assignment draft, but I need numeric user and project IDs.",
        "",
        "First inspect available IDs:",
        "show all users",
        "show all projects",
        "",
        "Then try:",
        "assign user 4 to project 1"
    ].join("\n");
}
// Phase 14: Explain why a natural-language assignment could not be safely resolved.
// This is important because assignment is a write action. If the harness cannot map
// the requested user/project to exactly one backend record, it must ask for clarity
// instead of guessing and mutating the wrong assignment.
function formatAssignmentResolveProblem(result) {
    if (result.status === "USER_NOT_FOUND") {
        return [
            `I could not find a TRS user matching "${result.userReference}".`,
            "",
            "Try using the user's full name, email, or numeric ID.",
            "Example: assign Bijaya Tiwari to PRJ-001"
        ].join("\n");
    }
    if (result.status === "PROJECT_NOT_FOUND") {
        return [
            `I could not find a TRS project matching "${result.projectReference}".`,
            "",
            "Try using the project code, project name, or numeric ID.",
            "Example: assign Bijaya Tiwari to PRJ-001"
        ].join("\n");
    }
    if (result.status === "USER_AMBIGUOUS") {
        const options = result.matches
            .slice(0, 5)
            .map((user) => `- ${user.id}: ${user.fullName} (${user.email})`);
        return [
            `I found multiple users matching "${result.userReference}".`,
            "Please be more specific:",
            "",
            ...options
        ].join("\n");
    }
    const options = result.matches
        .slice(0, 5)
        .map((project) => `- ${project.id}: ${project.projectCode} - ${project.projectName}`);
    return [
        `I found multiple projects matching "${result.projectReference}".`,
        "Please be more specific:",
        "",
        ...options
    ].join("\n");
}
// Phase 15: Explain duplicate assignment protection.
// Assignment is a write action, so if the backend already has the same
// user-project relationship, the harness stops before creating a new draft.
// This keeps the admin flow safe and avoids duplicate records.
function formatAssignmentAlreadyExists(assignment) {
    const projectStatus = assignment.projectActive ? "ACTIVE" : "INACTIVE";
    return [
        "No new draft was created because this assignment already exists.",
        "",
        "Existing assignment:",
        `User          : ${assignment.fullName} (${assignment.email})`,
        `Project       : ${assignment.projectCode} - ${assignment.projectName}`,
        `Project status: ${projectStatus}`,
        "",
        "Result: no backend changes were made.",
        "If you want to change access later, use a separate explicit update/remove assignment flow."
    ].join("\n");
}
function formatNoPendingAction() {
    return [
        "There is no pending draft to confirm or cancel.",
        "",
        "Start a draft first, for example:",
        "- create project called Demo Harness Project",
        "- assign Bijaya Tiwari to PRJ-001"
    ].join("\n");
}
function formatPendingActionCancelled(action) {
    if (action.type === "CREATE_PROJECT") {
        return [
            "Draft cancelled. No backend changes were made.",
            "",
            "Discarded project draft:",
            `Project code : ${action.draft.projectCode}`,
            `Project name : ${action.draft.projectName}`
        ].join("\n");
    }
    const userLabel = action.draft.userName && action.draft.userEmail
        ? `${action.draft.userName} (${action.draft.userEmail})`
        : `User ID ${action.draft.userId}`;
    const projectLabel = action.draft.projectCode && action.draft.projectName
        ? `${action.draft.projectCode} - ${action.draft.projectName}`
        : `Project ID ${action.draft.projectId}`;
    return [
        "Draft cancelled. No backend changes were made.",
        "",
        "Discarded assignment draft:",
        `User    : ${userLabel}`,
        `Project : ${projectLabel}`
    ].join("\n");
}
function formatCreateProjectSuccess(project) {
    return [
        "Project created successfully in TRS.",
        "",
        "Created project:",
        `ID     : ${project.id}`,
        `Code   : ${project.projectCode}`,
        `Name   : ${project.projectName}`,
        `Status : ${project.active ? "ACTIVE" : "INACTIVE"}`,
        "",
        "This project is now available through the backend and should appear anywhere the TRS project list is shown."
    ].join("\n");
}
function formatAssignUserToProjectSuccess(response) {
    return [
        "User assigned to project successfully in TRS.",
        "",
        "Saved assignment:",
        `User ID    : ${response.userId}`,
        `Project ID : ${response.projectId}`,
        `Backend    : ${response.message}`,
        "",
        "You can verify it with: show project assignments"
    ].join("\n");
}
function formatCorrectionSaved(correction) {
    return [
        "Saved correction memory:",
        "",
        `ID: ${correction.id}`,
        `Lesson: ${correction.text}`,
        `Created at: ${correction.createdAt}`,
        "",
        "This is now stored locally for future harness context."
    ].join("\n");
}
function formatCorrectionList(corrections) {
    if (corrections.length === 0) {
        return "No correction memories are stored yet.";
    }
    const rows = corrections.map((correction, index) => {
        return `${index + 1}. ${correction.text} (${correction.createdAt})`;
    });
    return [
        "Stored correction memories:",
        "",
        ...rows
    ].join("\n");
}
function formatCorrectionMissingText() {
    return [
        "I can store a correction, but I need the lesson text.",
        "",
        "Try:",
        "remember that utilization for one employee should show only that employee",
        "remember that reports should use table format"
    ].join("\n");
}
// Phase 17: Format missing-entry reports as compact tables.
// For many employees, we show a preview to keep terminal/Discord output readable.
// The detailed single-employee version can be added later with employee filtering.
function formatMissingEntriesReportResponse(report, label) {
    if (report.length === 0) {
        return `No missing time entries found for ${label}.`;
    }
    const rows = report.map((item) => {
        const name = item.fullName.length > 18
            ? `${item.fullName.slice(0, 15)}...`
            : item.fullName.padEnd(18);
        const days = String(item.missingDates.length).padEnd(4);
        const previewDates = item.missingDates.slice(0, 5).join(", ");
        const moreCount = item.missingDates.length - 5;
        const preview = moreCount > 0
            ? `${previewDates} +${moreCount} more`
            : previewDates;
        return `${name} | ${days} | ${preview}`;
    });
    return [
        `Here is the missing time-entry summary for ${label}:`,
        "",
        "Employee           | Days | Preview",
        "-------------------|------|------------------------------------------------",
        ...rows,
        "",
        "For full dates, ask for one employee, for example: show missing entries for Bijaya Tiwari in May 2026."
    ].join("\n");
}
function formatSingleEmployeeMissingEntriesResponse(employee, label) {
    const wrappedDates = wrapList(employee.missingDates, 4);
    const firstLine = wrappedDates[0] ?? "-";
    const remainingLines = wrappedDates.slice(1);
    return [
        `Here are the missing time entries for ${employee.fullName} (${label}):`,
        "",
        "Employee           | Days | Missing dates",
        "-------------------|------|------------------------------------------------",
        `${employee.fullName.padEnd(18)} | ${String(employee.missingDates.length).padEnd(4)} | ${firstLine}`,
        ...remainingLines.map((line) => `${"".padEnd(18)} | ${"".padEnd(4)} | ${line}`)
    ].join("\n");
}
function formatMissingEntriesEmployeeMatchProblem(match, label) {
    if (match.status === "NOT_FOUND") {
        return [
            `I could not find missing-entry data for "${match.employeeReference}" in ${label}.`,
            "",
            "This may mean the employee has no missing entries in that period, or the name did not match the report data."
        ].join("\n");
    }
    const options = match.matches
        .slice(0, 5)
        .map((employee) => `- ${employee.userId}: ${employee.fullName}`);
    return [
        `I found multiple employees matching "${match.employeeReference}" in ${label}.`,
        "Please be more specific:",
        "",
        ...options
    ].join("\n");
}
function wrapList(values, chunkSize) {
    const chunks = [];
    for (let index = 0; index < values.length; index += chunkSize) {
        chunks.push(values.slice(index, index + chunkSize).join(", "));
    }
    return chunks;
}
function formatMissingEntriesMissingDateRange() {
    return [
        "I can show missing time entries, but I need a date range.",
        "",
        "Examples:",
        "show missing entries for May 2026",
        "show missing entries for previous month",
        "show missing work logs for April 2026"
    ].join("\n");
}
// Phase 19: Format utilization reports as tables.
// This complements missing entries: missing entries shows absence of logs,
// while utilization shows actual logged hours against expected working capacity.
function formatUtilizationReportResponse(report, label) {
    if (report.length === 0) {
        return `No utilization data found for ${label}.`;
    }
    const rows = report.map((item) => formatUtilizationRow(item));
    return [
        `Here is the team utilization report for ${label}:`,
        "",
        "Employee           | Hours  | Expected | Utilization",
        "-------------------|--------|----------|------------",
        ...rows
    ].join("\n");
}
function formatSingleEmployeeUtilizationResponse(employee, label) {
    return [
        `Here is the utilization report for ${employee.fullName} (${label}):`,
        "",
        "Employee           | Hours  | Expected | Utilization",
        "-------------------|--------|----------|------------",
        formatUtilizationRow(employee)
    ].join("\n");
}
function formatUtilizationEmployeeMatchProblem(match, label) {
    if (match.status === "NOT_FOUND") {
        return [
            `I could not find utilization data for "${match.employeeReference}" in ${label}.`,
            "",
            "This may mean the employee had no utilization data in that period, or the name did not match the report data."
        ].join("\n");
    }
    const options = match.matches
        .slice(0, 5)
        .map((employee) => `- ${employee.userId}: ${employee.fullName}`);
    return [
        `I found multiple employees matching "${match.employeeReference}" in ${label}.`,
        "Please be more specific:",
        "",
        ...options
    ].join("\n");
}
function formatUtilizationMissingDateRange() {
    return [
        "I can show utilization, but I need a date range.",
        "",
        "Examples:",
        "show utilization for May 2026",
        "show utilization for previous month",
        "show utilization for Emp One in May 2026"
    ].join("\n");
}
function formatUtilizationRow(item) {
    const name = item.fullName.length > 18
        ? `${item.fullName.slice(0, 15)}...`
        : item.fullName.padEnd(18);
    const totalHours = formatNumber(item.totalHours).padEnd(6);
    const expectedHours = formatNumber(item.expectedHours).padEnd(8);
    const percent = `${formatNumber(item.utilizationPercent)}%`;
    return `${name} | ${totalHours} | ${expectedHours} | ${percent}`;
}
function formatNumber(value) {
    return Number(value).toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}
// Phase 20: Format combined manager insight.
// This is intentionally careful with wording: it flags attention areas based on
// report data, but does not make personal judgments about employees.
function formatManagerInsightResponse(insight, label) {
    if (insight.attentionAreas.length === 0) {
        return [
            `Manager insight for ${label}:`,
            "",
            "No major attention areas found from missing entries or utilization data."
        ].join("\n");
    }
    const attentionRows = insight.attentionAreas.map((item, index) => {
        return `${index + 1}. ${item.fullName}: ${item.reasons.join(", ")}`;
    });
    const highestMissing = insight.highestMissingEmployee
        ? `${insight.highestMissingEmployee.fullName} (${insight.highestMissingEmployee.missingDays} missing day${insight.highestMissingEmployee.missingDays === 1 ? "" : "s"})`
        : "N/A";
    const lowestUtilization = insight.lowestUtilizationEmployee
        ? `${insight.lowestUtilizationEmployee.fullName} (${formatNumber(insight.lowestUtilizationEmployee.utilizationPercent)}%)`
        : "N/A";
    return [
        `Manager insight for ${label}:`,
        "",
        "Top attention areas:",
        ...attentionRows,
        "",
        "Summary:",
        `- Employees with missing entries: ${insight.totalEmployeesWithMissingEntries}`,
        `- Employees below 50% utilization: ${insight.totalEmployeesBelowTargetUtilization}`,
        `- Highest missing entries: ${highestMissing}`,
        `- Lowest utilization: ${lowestUtilization}`,
        "",
        "Note: This is an operational signal, not a judgment. Review context before taking action."
    ].join("\n");
}
// Phase 21: Format advisory recommendations from manager insight.
// This must stay explicit that nothing was sent or changed; recommendations are
// decision support for the manager/admin, not automatic actions.
function formatManagerRecommendationsResponse(recommendations, label, recommendationMemories = []) {
    if (recommendations.recommendations.length === 0) {
        return [
            `Recommended manager actions for ${label}:`,
            "",
            "No action recommendations were generated from the current reports.",
            "No messages were sent and no TRS data was changed."
        ].join("\n");
    }
    const rows = recommendations.recommendations.map((recommendation) => {
        return `${recommendation.priority}. ${recommendation.message}`;
    });
    return [
        `Recommended manager actions for ${label}:`,
        "",
        ...rows,
        "",
        ...(recommendationMemories.length > 0
            ? [
                "",
                "Remembered recommendation feedback considered:",
                ...recommendationMemories.map((memory, index) => `${index + 1}. ${memory.text}`)
            ]
            : []),
        "",
        "No messages were sent and no TRS data was changed. These recommendations are advisory only."
    ].join("\n");
}
function formatManagerRecommendationsMissingDateRange() {
    return [
        "I can recommend manager actions, but I need a date range.",
        "",
        "Examples:",
        "recommend actions for May 2026",
        "suggest actions for previous month",
        "what should manager do for April 2026"
    ].join("\n");
}
function formatRecommendationMemorySaved(memory) {
    return [
        "Saved recommendation feedback:",
        "",
        `ID: ${memory.id}`,
        `Lesson: ${memory.text}`,
        `Created at: ${memory.createdAt}`,
        "",
        "Future recommendation output can now include this feedback as local process memory."
    ].join("\n");
}
function formatRecommendationMemoryList(memories) {
    if (memories.length === 0) {
        return "No recommendation feedback memories are stored yet.";
    }
    return [
        "Stored recommendation feedback:",
        "",
        ...memories.map((memory, index) => `${index + 1}. ${memory.text} (${memory.createdAt})`)
    ].join("\n");
}
function formatRecommendationMemoryMissingText() {
    return [
        "I can store recommendation feedback, but I need the lesson text.",
        "",
        "Try:",
        "remember recommendation feedback: check leave calendar before following up about missing logs"
    ].join("\n");
}
function formatRegisteredToolsResponse(tools) {
    const rows = tools.map((tool) => {
        const name = tool.name.length > 26
            ? `${tool.name.slice(0, 23)}...`
            : tool.name.padEnd(26);
        const risk = tool.riskLevel.padEnd(18);
        const confirm = (tool.requiresConfirmation ? "Yes" : "No").padEnd(7);
        const roles = tool.allowedRoles.join(", ");
        return `${name} | ${risk} | ${confirm} | ${roles}`;
    });
    return [
        `Registered TRS harness tools (${tools.length}):`,
        "",
        "Tool                       | Risk               | Confirm | Roles",
        "---------------------------|--------------------|---------|----------------",
        ...rows,
        "",
        "Confirm = whether the harness requires a draft/confirmation before a backend write.",
        "Backend authorization still remains the final source of truth."
    ].join("\n");
}
function formatUnsupportedResponse(userMessage) {
    return [
        "This Phase 22 harness currently supports:",
        "- who am I?",
        "- show memory",
        "- show context",
        "- show my projects",
        "- show all projects",
        "- show all users",
        "- show project assignments",
        "- show missing entries for May 2026",
        "- show utilization for May 2026",
        "- show manager insight for May 2026",
        "- recommend actions for May 2026",
        "- remember recommendation feedback: check leave calendar first",
        "- knowledge questions like: what can admin do?",
        "- create project called <name> with draft confirmation",
        "- assign <user name/email/id> to <project code/name/id> with draft confirmation",
        "- remember that <lesson>",
        "- show corrections",
        "- safety checks for prompt injection / secret / role-bypass attempts",
        "",
        `Received: ${userMessage}`
    ].join("\n");
}
function formatBackendError(error) {
    if (error instanceof Error) {
        return [
            "I could not complete the TRS backend request right now.",
            "",
            `Reason: ${error.message}`,
            "",
            "Please make sure the database and Spring Boot backend are running."
        ].join("\n");
    }
    return [
        "I could not complete the TRS backend request right now.",
        "",
        "Please make sure the database and Spring Boot backend are running."
    ].join("\n");
}
function formatToolVerificationError(verification) {
    return [
        "The TRS backend response did not match what the harness expected.",
        "",
        `Tool: ${verification.toolName}`,
        verification.itemIndex !== undefined
            ? `Item index: ${verification.itemIndex}`
            : "",
        `Reason: ${verification.reason}`,
        "",
        "No formatting or follow-up action was performed.",
        "This usually means the backend contract changed or returned an unexpected response shape."
    ]
        .filter((line) => line.length > 0)
        .join("\n");
}

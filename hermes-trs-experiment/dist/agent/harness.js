"use strict";
// Harness is the central request pipeline.
// Every message flows through safety, context, planning, tool/knowledge retrieval,
// and response formatting in a predictable order.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHarness = runHarness;
const trsAdapter_js_1 = require("../adapters/trsAdapter.js");
const responseFormatter_js_1 = require("../formatters/responseFormatter.js");
const correctionMemory_js_1 = require("../memory/correctionMemory.js");
const recommendationMemory_js_1 = require("../memory/recommendationMemory.js");
const ragRetriever_js_1 = require("../rag/ragRetriever.js");
const safetyPolicy_js_1 = require("../safety/safetyPolicy.js");
const assignUserToProjectSkill_js_1 = require("../skills/assignUserToProjectSkill.js");
const assignmentResolver_js_1 = require("../resolvers/assignmentResolver.js");
const createProjectSkill_js_1 = require("../skills/createProjectSkill.js");
const dateRangeSkill_js_1 = require("../skills/dateRangeSkill.js");
const insightSkill_js_1 = require("../skills/insightSkill.js");
const reportSkill_js_1 = require("../skills/reportSkill.js");
const pendingActionStore_js_1 = require("../state/pendingActionStore.js");
const contextBuilder_js_1 = require("./contextBuilder.js");
const planner_js_1 = require("./planner.js");
const aiPlanner_js_1 = require("./aiPlanner.js");
const harnessLogger_js_1 = require("../observability/harnessLogger.js");
const toolExecutor_js_1 = require("../tools/toolExecutor.js");
const toolRegistry_js_1 = require("../tools/toolRegistry.js");
const toolResultVerifier_js_1 = require("../verification/toolResultVerifier.js");
function logToolPolicy(tool) {
    // Phase 35: Policy check is visible before execution.
    // This does not enforce yet; it makes the harness trace explain the selected
    // capability risk level, confirmation requirement, and role policy.
    harnessLogger_js_1.harnessLogger.info("POLICY", "tool policy checked", {
        tool: tool.name,
        riskLevel: tool.riskLevel,
        requiresConfirmation: tool.requiresConfirmation,
        allowedRoles: tool.allowedRoles.join(",")
    });
}
async function runHarness(userMessage) {
    const requestStartedAt = Date.now();
    harnessLogger_js_1.harnessLogger.info("HARNESS", "request started", {
        messagePreview: userMessage.slice(0, 120)
    });
    // Safety is intentionally first.
    // If a message tries to reveal secrets, bypass roles, override instructions,
    // or access the database directly, we stop before context/RAG/tool execution.
    const safetyResult = (0, safetyPolicy_js_1.checkUserMessageSafety)(userMessage);
    if (!safetyResult.allowed) {
        harnessLogger_js_1.harnessLogger.info("SAFETY", "request rejected before context/tool execution", {
            category: safetyResult.category,
            message: safetyResult.message
        });
        const response = (0, responseFormatter_js_1.formatSafetyRejection)(safetyResult);
        harnessLogger_js_1.harnessLogger.info("HARNESS", "request completed", {
            durationMs: Date.now() - requestStartedAt,
            outcome: "safety_rejected"
        });
        return response;
    }
    harnessLogger_js_1.harnessLogger.info("SAFETY", "request allowed");
    // Context is built before planning/tool execution.
    // This is the core harness pattern: gather identity + memory first,
    // then decide what skill, tool, or knowledge route should run.
    const context = await (0, contextBuilder_js_1.buildContext)();
    harnessLogger_js_1.harnessLogger.info("CONTEXT", "context loaded", {
        provider: context.provider,
        providerUserId: context.providerUserId,
        userMemoryLoaded: context.memorySummary.userMemoryLoaded,
        systemMemoryLoaded: context.memorySummary.systemMemoryLoaded,
        correctionCount: context.memorySummary.correctionCount,
        recommendationMemoryCount: context.memorySummary.recommendationMemoryCount
    });
    // Planner decides the route.
    // Phase 24B uses AI as the primary planner when enabled, but keeps the
    // deterministic planner as fallback. The LLM never executes tools directly;
    // it only proposes one validated intent from our known HarnessIntent list.
    const aiPlanResult = await (0, aiPlanner_js_1.planRequestWithAi)(userMessage, context);
    const deterministicPlan = (0, planner_js_1.planRequest)(userMessage);
    const rawPlan = aiPlanResult.source === "ai"
        ? aiPlanResult.plan
        : deterministicPlan;
    const plan = (0, planner_js_1.applyPlannerCorrections)(userMessage, rawPlan);
    if (aiPlanResult.source === "ai") {
        harnessLogger_js_1.harnessLogger.info("PLANNER", "AI intent selected", {
            intent: rawPlan.intent,
            finalIntent: plan.intent,
            corrected: rawPlan.intent !== plan.intent,
            confidence: aiPlanResult.confidence
        });
    }
    else {
        harnessLogger_js_1.harnessLogger.info("PLANNER", "deterministic fallback intent selected", {
            intent: rawPlan.intent,
            finalIntent: plan.intent,
            corrected: rawPlan.intent !== plan.intent,
            aiPlannerStatus: aiPlanResult.source,
            reason: aiPlanResult.reason
        });
    }
    const registeredTool = (0, toolRegistry_js_1.findToolByIntent)(plan.intent);
    if (registeredTool) {
        // Phase 33: Tool registry metadata is logged before execution.
        // This proves the harness can explain the selected capability, risk level,
        // role policy, and whether confirmation is required.
        harnessLogger_js_1.harnessLogger.info("TOOL", "registered tool selected", {
            name: registeredTool.name,
            riskLevel: registeredTool.riskLevel,
            requiresConfirmation: registeredTool.requiresConfirmation,
            allowedRoles: registeredTool.allowedRoles.join(",")
        });
        logToolPolicy(registeredTool);
    }
    if (plan.intent === "SHOW_CONTEXT") {
        return (0, responseFormatter_js_1.formatContextSummary)(context);
    }
    if (plan.intent === "SHOW_REGISTERED_TOOLS") {
        return (0, responseFormatter_js_1.formatRegisteredToolsResponse)((0, toolRegistry_js_1.listRegisteredTools)());
    }
    if (plan.intent === "ADD_CORRECTION_MEMORY") {
        const correctionText = (0, correctionMemory_js_1.extractCorrectionText)(userMessage);
        if (!correctionText) {
            return (0, responseFormatter_js_1.formatCorrectionMissingText)();
        }
        const savedCorrection = await (0, correctionMemory_js_1.addCorrectionMemory)(correctionText);
        return (0, responseFormatter_js_1.formatCorrectionSaved)(savedCorrection);
    }
    if (plan.intent === "ADD_RECOMMENDATION_MEMORY") {
        const recommendationMemoryText = (0, recommendationMemory_js_1.extractRecommendationMemoryText)(userMessage);
        if (!recommendationMemoryText) {
            return (0, responseFormatter_js_1.formatRecommendationMemoryMissingText)();
        }
        const savedMemory = await (0, recommendationMemory_js_1.addRecommendationMemory)(recommendationMemoryText);
        return (0, responseFormatter_js_1.formatRecommendationMemorySaved)(savedMemory);
    }
    if (plan.intent === "SHOW_RECOMMENDATION_MEMORY") {
        const memories = await (0, recommendationMemory_js_1.listRecommendationMemories)();
        return (0, responseFormatter_js_1.formatRecommendationMemoryList)(memories);
    }
    if (plan.intent === "SHOW_CORRECTION_MEMORY") {
        const corrections = await (0, correctionMemory_js_1.listCorrectionMemories)();
        return (0, responseFormatter_js_1.formatCorrectionList)(corrections);
    }
    if (plan.intent === "WHO_AM_I") {
        try {
            const currentUser = await (0, trsAdapter_js_1.getCurrentUser)();
            return (0, responseFormatter_js_1.formatCurrentUserResponse)(currentUser);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "GET_ADMIN_PROJECTS") {
        // Phase 32: Admin projects now use the shared verified tool executor.
        // The harness route stays focused on intent handling while the wrapper owns
        // tool logging, response verification, formatting, and backend error handling.
        return (0, toolExecutor_js_1.executeVerifiedTool)({
            toolName: "getAdminProjects",
            run: trsAdapter_js_1.getAdminProjects,
            verify: toolResultVerifier_js_1.verifyAdminProjectsResponse,
            format: responseFormatter_js_1.formatAdminProjectsResponse
        });
    }
    if (plan.intent === "GET_ADMIN_USERS") {
        // Phase 32: Same execution wrapper for admin users.
        // This proves the tool execution pattern is reusable before expanding it
        // to more complex report and write-action tools.
        return (0, toolExecutor_js_1.executeVerifiedTool)({
            toolName: "getAdminUsers",
            run: trsAdapter_js_1.getAdminUsers,
            verify: toolResultVerifier_js_1.verifyAdminUsersResponse,
            format: responseFormatter_js_1.formatAdminUsersResponse
        });
    }
    if (plan.intent === "GET_PROJECT_ASSIGNMENTS") {
        try {
            harnessLogger_js_1.harnessLogger.info("TOOL", "getProjectAssignments start");
            const assignments = await (0, trsAdapter_js_1.getProjectAssignments)();
            harnessLogger_js_1.harnessLogger.info("TOOL", "getProjectAssignments success", { rows: assignments.length });
            return (0, responseFormatter_js_1.formatProjectAssignmentsResponse)(assignments);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "GET_MANAGER_RECOMMENDATIONS") {
        const dateRange = (0, dateRangeSkill_js_1.extractDateRange)(userMessage);
        if (dateRange) {
            harnessLogger_js_1.harnessLogger.info("DATE_RANGE", "manager recommendations date range resolved", {
                label: dateRange.label,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
        }
        if (!dateRange) {
            return (0, responseFormatter_js_1.formatManagerRecommendationsMissingDateRange)();
        }
        try {
            // Phase 21: Recommendations are built from read-only report data.
            // The harness suggests next steps but does not send reminders or change TRS state.
            harnessLogger_js_1.harnessLogger.info("TOOL", "getMissingEntriesReport start", {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            const missingReport = await (0, trsAdapter_js_1.getMissingEntriesReport)(dateRange.startDate, dateRange.endDate);
            harnessLogger_js_1.harnessLogger.info("TOOL", "getMissingEntriesReport success", {
                rows: missingReport.length
            });
            harnessLogger_js_1.harnessLogger.info("TOOL", "getUtilizationReport start", {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            const utilizationReport = await (0, trsAdapter_js_1.getUtilizationReport)(dateRange.startDate, dateRange.endDate);
            harnessLogger_js_1.harnessLogger.info("TOOL", "getUtilizationReport success", {
                rows: utilizationReport.length
            });
            const insight = (0, insightSkill_js_1.buildManagerInsight)(missingReport, utilizationReport);
            harnessLogger_js_1.harnessLogger.info("INSIGHT", "manager insight built for recommendations", {
                attentionAreas: insight.attentionAreas.length
            });
            const baseRecommendations = (0, insightSkill_js_1.buildManagerRecommendations)(insight);
            const adaptedRecommendations = (0, insightSkill_js_1.applyRecommendationMemory)(baseRecommendations, context.recommendationMemories);
            harnessLogger_js_1.harnessLogger.info("MEMORY", "recommendation memory applied", {
                baseRecommendationCount: baseRecommendations.recommendations.length,
                adaptedRecommendationCount: adaptedRecommendations.recommendations.length,
                recommendationMemoryCount: context.recommendationMemories.length
            });
            return (0, responseFormatter_js_1.formatManagerRecommendationsResponse)(adaptedRecommendations, dateRange.label, context.recommendationMemories);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "GET_MANAGER_INSIGHT") {
        const dateRange = (0, dateRangeSkill_js_1.extractDateRange)(userMessage);
        if (dateRange) {
            harnessLogger_js_1.harnessLogger.info("DATE_RANGE", "manager insight date range resolved", {
                label: dateRange.label,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
        }
        if (!dateRange) {
            return [
                "I can show manager insight, but I need a date range.",
                "",
                "Examples:",
                "show manager insight for May 2026",
                "who needs attention in previous month",
                "show team health for April 2026"
            ].join("\n");
        }
        try {
            // Phase 20: Manager insight combines two read-only backend reports.
            // Backend remains source of truth; the harness only ranks and explains signals.
            harnessLogger_js_1.harnessLogger.info("TOOL", "getMissingEntriesReport start", {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            const missingReport = await (0, trsAdapter_js_1.getMissingEntriesReport)(dateRange.startDate, dateRange.endDate);
            harnessLogger_js_1.harnessLogger.info("TOOL", "getMissingEntriesReport success", {
                rows: missingReport.length
            });
            harnessLogger_js_1.harnessLogger.info("TOOL", "getUtilizationReport start", {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            const utilizationReport = await (0, trsAdapter_js_1.getUtilizationReport)(dateRange.startDate, dateRange.endDate);
            harnessLogger_js_1.harnessLogger.info("TOOL", "getUtilizationReport success", {
                rows: utilizationReport.length
            });
            const insight = (0, insightSkill_js_1.buildManagerInsight)(missingReport, utilizationReport);
            harnessLogger_js_1.harnessLogger.info("INSIGHT", "manager insight built", {
                attentionAreas: insight.attentionAreas.length
            });
            return (0, responseFormatter_js_1.formatManagerInsightResponse)(insight, dateRange.label);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "GET_UTILIZATION_REPORT") {
        const dateRange = (0, dateRangeSkill_js_1.extractDateRange)(userMessage);
        if (dateRange) {
            harnessLogger_js_1.harnessLogger.info("DATE_RANGE", "utilization date range resolved", {
                label: dateRange.label,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
        }
        if (!dateRange) {
            return (0, responseFormatter_js_1.formatUtilizationMissingDateRange)();
        }
        try {
            // Phase 32B: The report route now asks the shared executor for verified data.
            // The route still owns report-specific filtering because matching a single
            // employee happens after the backend response has been verified.
            const reportResult = await (0, toolExecutor_js_1.executeVerifiedToolData)({
                toolName: "getUtilizationReport",
                run: () => (0, trsAdapter_js_1.getUtilizationReport)(dateRange.startDate, dateRange.endDate),
                verify: toolResultVerifier_js_1.verifyUtilizationReportResponse
            });
            if (!reportResult.ok) {
                return reportResult.response;
            }
            const report = reportResult.value;
            const employeeReference = (0, reportSkill_js_1.extractEmployeeReferenceForUtilization)(userMessage, dateRange.label);
            const employeeMatch = (0, reportSkill_js_1.matchReportEmployee)(employeeReference, report);
            harnessLogger_js_1.harnessLogger.info("REPORT", "utilization employee filter evaluated", {
                employeeReference: employeeReference || "none",
                matchStatus: employeeMatch.status
            });
            if (employeeMatch.status === "MATCHED") {
                return (0, responseFormatter_js_1.formatSingleEmployeeUtilizationResponse)(employeeMatch.employee, dateRange.label);
            }
            if (employeeMatch.status === "NOT_FOUND" || employeeMatch.status === "AMBIGUOUS") {
                return (0, responseFormatter_js_1.formatUtilizationEmployeeMatchProblem)(employeeMatch, dateRange.label);
            }
            return (0, responseFormatter_js_1.formatUtilizationReportResponse)(report, dateRange.label);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "GET_MISSING_ENTRIES_REPORT") {
        const dateRange = (0, dateRangeSkill_js_1.extractDateRange)(userMessage);
        if (dateRange) {
            harnessLogger_js_1.harnessLogger.info("DATE_RANGE", "missing entries date range resolved", {
                label: dateRange.label,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
        }
        if (!dateRange) {
            return (0, responseFormatter_js_1.formatMissingEntriesMissingDateRange)();
        }
        try {
            // Phase 32B: Missing-entry report also uses the shared verified data executor.
            // The route still owns employee matching and final report formatting after
            // verification passes.
            const reportResult = await (0, toolExecutor_js_1.executeVerifiedToolData)({
                toolName: "getMissingEntriesReport",
                run: () => (0, trsAdapter_js_1.getMissingEntriesReport)(dateRange.startDate, dateRange.endDate),
                verify: toolResultVerifier_js_1.verifyMissingEntriesReportResponse
            });
            if (!reportResult.ok) {
                return reportResult.response;
            }
            const report = reportResult.value;
            const employeeReference = (0, reportSkill_js_1.extractEmployeeReferenceForMissingEntries)(userMessage, dateRange.label);
            const employeeMatch = (0, reportSkill_js_1.matchMissingEntriesEmployee)(employeeReference, report);
            harnessLogger_js_1.harnessLogger.info("REPORT", "missing entries employee filter evaluated", {
                employeeReference: employeeReference || "none",
                matchStatus: employeeMatch.status
            });
            if (employeeMatch.status === "MATCHED") {
                return (0, responseFormatter_js_1.formatSingleEmployeeMissingEntriesResponse)(employeeMatch.employee, dateRange.label);
            }
            if (employeeMatch.status === "NOT_FOUND" || employeeMatch.status === "AMBIGUOUS") {
                return (0, responseFormatter_js_1.formatMissingEntriesEmployeeMatchProblem)(employeeMatch, dateRange.label);
            }
            return (0, responseFormatter_js_1.formatMissingEntriesReportResponse)(report, dateRange.label);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "GET_MY_PROJECTS") {
        try {
            const projects = await (0, trsAdapter_js_1.getMyProjects)();
            return (0, responseFormatter_js_1.formatMyProjectsResponse)(projects);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "KNOWLEDGE_QUERY") {
        const retrievedKnowledge = await (0, ragRetriever_js_1.retrieveKnowledge)(userMessage);
        return (0, responseFormatter_js_1.formatKnowledgeResponse)(userMessage, retrievedKnowledge);
    }
    if (plan.intent === "CREATE_PROJECT_DRAFT") {
        const draft = (0, createProjectSkill_js_1.prepareCreateProjectDraft)(userMessage);
        if (!draft) {
            return (0, responseFormatter_js_1.formatCreateProjectMissingFields)();
        }
        const pendingAction = {
            type: "CREATE_PROJECT",
            createdAt: new Date().toISOString(),
            draft
        };
        await (0, pendingActionStore_js_1.savePendingAction)(pendingAction);
        harnessLogger_js_1.harnessLogger.info("DRAFT", "create project draft saved", {
            projectName: draft.projectName
        });
        return (0, responseFormatter_js_1.formatCreateProjectDraft)(pendingAction);
    }
    if (plan.intent === "ASSIGN_USER_TO_PROJECT_DRAFT") {
        const references = (0, assignUserToProjectSkill_js_1.extractAssignmentReferences)(userMessage);
        if (!references) {
            return (0, responseFormatter_js_1.formatAssignUserToProjectMissingFields)();
        }
        try {
            // Assignment is a write action, so we resolve against real backend data first.
            // This prevents the harness from guessing user/project IDs from natural text.
            harnessLogger_js_1.harnessLogger.info("TOOL", "getAdminUsers start for assignment resolution");
            const users = await (0, trsAdapter_js_1.getAdminUsers)();
            harnessLogger_js_1.harnessLogger.info("TOOL", "getAdminUsers success", { rows: users.length });
            harnessLogger_js_1.harnessLogger.info("TOOL", "getAdminProjects start for assignment resolution");
            const projects = await (0, trsAdapter_js_1.getAdminProjects)();
            harnessLogger_js_1.harnessLogger.info("TOOL", "getAdminProjects success", { rows: projects.length });
            const resolvedAssignment = (0, assignmentResolver_js_1.resolveAssignmentDraft)(references.userReference, references.projectReference, users, projects);
            if (resolvedAssignment.status !== "RESOLVED") {
                return (0, responseFormatter_js_1.formatAssignmentResolveProblem)(resolvedAssignment);
            }
            // Phase 15: Duplicate protection for assignment writes.
            // Before saving a draft, we check existing backend assignments. This prevents
            // the harness from asking for confirmation on a write that would create a
            // duplicate relationship or confuse the admin with repeated records.
            harnessLogger_js_1.harnessLogger.info("TOOL", "getProjectAssignments start for duplicate check");
            const assignments = await (0, trsAdapter_js_1.getProjectAssignments)();
            harnessLogger_js_1.harnessLogger.info("TOOL", "getProjectAssignments success", { rows: assignments.length });
            const existingAssignment = assignments.find((assignment) => {
                return (assignment.userId === resolvedAssignment.draft.userId &&
                    assignment.projectId === resolvedAssignment.draft.projectId);
            });
            if (existingAssignment) {
                return (0, responseFormatter_js_1.formatAssignmentAlreadyExists)(existingAssignment);
            }
            const pendingAction = {
                type: "ASSIGN_USER_TO_PROJECT",
                createdAt: new Date().toISOString(),
                draft: resolvedAssignment.draft
            };
            await (0, pendingActionStore_js_1.savePendingAction)(pendingAction);
            harnessLogger_js_1.harnessLogger.info("DRAFT", "assignment draft saved", {
                userId: resolvedAssignment.draft.userId,
                projectId: resolvedAssignment.draft.projectId
            });
            return (0, responseFormatter_js_1.formatAssignUserToProjectDraft)(pendingAction);
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    if (plan.intent === "CANCEL_PENDING_ACTION") {
        const pendingAction = await (0, pendingActionStore_js_1.loadPendingAction)();
        if (!pendingAction) {
            return (0, responseFormatter_js_1.formatNoPendingAction)();
        }
        await (0, pendingActionStore_js_1.clearPendingAction)();
        return (0, responseFormatter_js_1.formatPendingActionCancelled)(pendingAction);
    }
    if (plan.intent === "CONFIRM_PENDING_ACTION") {
        const pendingAction = await (0, pendingActionStore_js_1.loadPendingAction)();
        if (!pendingAction) {
            return (0, responseFormatter_js_1.formatNoPendingAction)();
        }
        try {
            if (pendingAction.type === "CREATE_PROJECT") {
                harnessLogger_js_1.harnessLogger.info("ACTION", "createProject confirm received; backend write starting", {
                    projectName: pendingAction.draft.projectName
                });
                const createdProject = await (0, trsAdapter_js_1.createProject)(pendingAction.draft);
                await (0, pendingActionStore_js_1.clearPendingAction)();
                harnessLogger_js_1.harnessLogger.info("ACTION", "createProject success", {
                    projectId: createdProject.id,
                    projectCode: createdProject.projectCode
                });
                return (0, responseFormatter_js_1.formatCreateProjectSuccess)(createdProject);
            }
            if (pendingAction.type === "ASSIGN_USER_TO_PROJECT") {
                harnessLogger_js_1.harnessLogger.info("ACTION", "assignUserToProject confirm received; backend write starting", {
                    userId: pendingAction.draft.userId,
                    projectId: pendingAction.draft.projectId
                });
                const assignment = await (0, trsAdapter_js_1.assignUserToProject)(pendingAction.draft);
                await (0, pendingActionStore_js_1.clearPendingAction)();
                harnessLogger_js_1.harnessLogger.info("ACTION", "assignUserToProject success", {
                    userId: pendingAction.draft.userId,
                    projectId: pendingAction.draft.projectId
                });
                return (0, responseFormatter_js_1.formatAssignUserToProjectSuccess)(assignment);
            }
            return (0, responseFormatter_js_1.formatNoPendingAction)();
        }
        catch (error) {
            return (0, responseFormatter_js_1.formatBackendError)(error);
        }
    }
    const unsupportedResponse = (0, responseFormatter_js_1.formatUnsupportedResponse)(userMessage);
    harnessLogger_js_1.harnessLogger.info("HARNESS", "request completed", {
        durationMs: Date.now() - requestStartedAt,
        outcome: "unsupported"
    });
    return unsupportedResponse;
}

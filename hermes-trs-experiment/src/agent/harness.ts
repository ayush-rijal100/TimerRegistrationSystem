// Harness is the central request pipeline.
// Every message flows through safety, context, planning, tool/knowledge retrieval,
// and response formatting in a predictable order.

import {
  assignUserToProject,
  createProject,
  getAdminProjects,
  getAdminUsers,
  getCurrentUser,
  getMissingEntriesReport,
  getMyProjects,
  getProjectAssignments,
  getUtilizationReport
} from "../adapters/trsAdapter.js";
import {
  formatAdminProjectsResponse,
  formatAdminUsersResponse,
  formatAssignUserToProjectDraft,
  formatAssignUserToProjectMissingFields,
  formatAssignUserToProjectSuccess,
  formatBackendError,
  formatContextSummary,
  formatCorrectionList,
  formatCorrectionMissingText,
  formatCorrectionSaved,
  formatCreateProjectDraft,
  formatCreateProjectMissingFields,
  formatCreateProjectSuccess,
  formatCurrentUserResponse,
  formatKnowledgeResponse,
  formatMissingEntriesMissingDateRange,
  formatMissingEntriesEmployeeMatchProblem,
  formatMissingEntriesReportResponse,
  formatMyProjectsResponse,
  formatNoPendingAction,
  formatPendingActionCancelled,
  formatProjectAssignmentsResponse,
  formatSingleEmployeeMissingEntriesResponse,
  formatSafetyRejection,
  formatAssignmentResolveProblem,
  formatAssignmentAlreadyExists,
  formatSingleEmployeeUtilizationResponse,
  formatUnsupportedResponse,
  formatUtilizationEmployeeMatchProblem,
  formatUtilizationMissingDateRange,
  formatUtilizationReportResponse,
  formatManagerInsightResponse,
  formatManagerRecommendationsMissingDateRange,
  formatManagerRecommendationsResponse,
  formatRecommendationMemoryList,
  formatRecommendationMemoryMissingText,
  formatRecommendationMemorySaved,
  formatRegisteredToolsResponse,
  formatToolVerificationError,
} from "../formatters/responseFormatter.js";
import {
  addCorrectionMemory,
  extractCorrectionText,
  listCorrectionMemories
} from "../memory/correctionMemory.js";
import {
  addRecommendationMemory,
  extractRecommendationMemoryText,
  listRecommendationMemories
} from "../memory/recommendationMemory.js";
import { retrieveKnowledge } from "../rag/ragRetriever.js";
import { checkUserMessageSafety } from "../safety/safetyPolicy.js";

import { extractAssignmentReferences } from "../skills/assignUserToProjectSkill.js";
import { resolveAssignmentDraft } from "../resolvers/assignmentResolver.js";

import { prepareCreateProjectDraft } from "../skills/createProjectSkill.js";
import { extractDateRange } from "../skills/dateRangeSkill.js";

import {
  applyRecommendationMemory, buildManagerInsight, buildManagerRecommendations
} from "../skills/insightSkill.js";

import {
  extractEmployeeReferenceForMissingEntries,
  extractEmployeeReferenceForUtilization,
  matchMissingEntriesEmployee,
  matchReportEmployee
} from "../skills/reportSkill.js";
import {
  clearPendingAction,
  loadPendingAction,
  savePendingAction
} from "../state/pendingActionStore.js";
import { buildContext } from "./contextBuilder.js";
import { applyPlannerCorrections, planRequest } from "./planner.js";
import { planRequestWithAi } from "./aiPlanner.js";
import { harnessLogger } from "../observability/harnessLogger.js";
import { executeVerifiedTool, executeVerifiedToolData } from "../tools/toolExecutor.js";
import { findToolByIntent, listRegisteredTools, type ToolRegistryEntry } from "../tools/toolRegistry.js";

import {
  verifyAdminProjectsResponse,
  verifyAdminUsersResponse,
  verifyMissingEntriesReportResponse,
  verifyUtilizationReportResponse
} from "../verification/toolResultVerifier.js";




function logToolPolicy(tool: ToolRegistryEntry): void {
  // Phase 35: Policy check is visible before execution.
  // This does not enforce yet; it makes the harness trace explain the selected
  // capability risk level, confirmation requirement, and role policy.
  harnessLogger.info("POLICY", "tool policy checked", {
    tool: tool.name,
    riskLevel: tool.riskLevel,
    requiresConfirmation: tool.requiresConfirmation,
    allowedRoles: tool.allowedRoles.join(",")
  });
}

export async function runHarness(userMessage: string): Promise<string> {
  const requestStartedAt = Date.now();

  harnessLogger.info("HARNESS", "request started", {
    messagePreview: userMessage.slice(0, 120)
  });

  // Safety is intentionally first.
  // If a message tries to reveal secrets, bypass roles, override instructions,
  // or access the database directly, we stop before context/RAG/tool execution.
  const safetyResult = checkUserMessageSafety(userMessage);

  if (!safetyResult.allowed) {
    harnessLogger.info("SAFETY", "request rejected before context/tool execution", {
      category: safetyResult.category,
      message: safetyResult.message
    });

    const response = formatSafetyRejection(safetyResult);
    harnessLogger.info("HARNESS", "request completed", {
      durationMs: Date.now() - requestStartedAt,
      outcome: "safety_rejected"
    });
    return response;
  }

  harnessLogger.info("SAFETY", "request allowed");

  // Context is built before planning/tool execution.
  // This is the core harness pattern: gather identity + memory first,
  // then decide what skill, tool, or knowledge route should run.
  const context = await buildContext();
  harnessLogger.info("CONTEXT", "context loaded", {
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
  const aiPlanResult = await planRequestWithAi(userMessage, context);
  const deterministicPlan = planRequest(userMessage);

  const rawPlan = aiPlanResult.source === "ai"
    ? aiPlanResult.plan
    : deterministicPlan;

  const plan = applyPlannerCorrections(userMessage, rawPlan);

  if (aiPlanResult.source === "ai") {
    harnessLogger.info("PLANNER", "AI intent selected", {
      intent: rawPlan.intent,
      finalIntent: plan.intent,
      corrected: rawPlan.intent !== plan.intent,
      confidence: aiPlanResult.confidence
    });
  } else {
    harnessLogger.info("PLANNER", "deterministic fallback intent selected", {
      intent: rawPlan.intent,
      finalIntent: plan.intent,
      corrected: rawPlan.intent !== plan.intent,
      aiPlannerStatus: aiPlanResult.source,
      reason: aiPlanResult.reason
    });
  }

  const registeredTool = findToolByIntent(plan.intent);

  if (registeredTool) {
    // Phase 33: Tool registry metadata is logged before execution.
    // This proves the harness can explain the selected capability, risk level,
    // role policy, and whether confirmation is required.
    harnessLogger.info("TOOL", "registered tool selected", {
      name: registeredTool.name,
      riskLevel: registeredTool.riskLevel,
      requiresConfirmation: registeredTool.requiresConfirmation,
      allowedRoles: registeredTool.allowedRoles.join(",")
    });
    logToolPolicy(registeredTool);
  }

  if (plan.intent === "SHOW_CONTEXT") {
    return formatContextSummary(context);
  }


  if (plan.intent === "SHOW_REGISTERED_TOOLS") {
    return formatRegisteredToolsResponse(listRegisteredTools());
  }

  if (plan.intent === "ADD_CORRECTION_MEMORY") {
    const correctionText = extractCorrectionText(userMessage);

    if (!correctionText) {
      return formatCorrectionMissingText();
    }

    const savedCorrection = await addCorrectionMemory(correctionText);
    return formatCorrectionSaved(savedCorrection);
  }

  if (plan.intent === "ADD_RECOMMENDATION_MEMORY") {
    const recommendationMemoryText = extractRecommendationMemoryText(userMessage);

    if (!recommendationMemoryText) {
      return formatRecommendationMemoryMissingText();
    }

    const savedMemory = await addRecommendationMemory(recommendationMemoryText);
    return formatRecommendationMemorySaved(savedMemory);
  }

  if (plan.intent === "SHOW_RECOMMENDATION_MEMORY") {
    const memories = await listRecommendationMemories();
    return formatRecommendationMemoryList(memories);
  }
  if (plan.intent === "SHOW_CORRECTION_MEMORY") {
    const corrections = await listCorrectionMemories();
    return formatCorrectionList(corrections);
  }

  if (plan.intent === "WHO_AM_I") {
    try {
      const currentUser = await getCurrentUser();
      return formatCurrentUserResponse(currentUser);
    } catch (error) {
      return formatBackendError(error);
    }
  }

  if (plan.intent === "GET_ADMIN_PROJECTS") {
    // Phase 32: Admin projects now use the shared verified tool executor.
    // The harness route stays focused on intent handling while the wrapper owns
    // tool logging, response verification, formatting, and backend error handling.
    return executeVerifiedTool({
      toolName: "getAdminProjects",
      run: getAdminProjects,
      verify: verifyAdminProjectsResponse,
      format: formatAdminProjectsResponse
    });
  }

  if (plan.intent === "GET_ADMIN_USERS") {
    // Phase 32: Same execution wrapper for admin users.
    // This proves the tool execution pattern is reusable before expanding it
    // to more complex report and write-action tools.
    return executeVerifiedTool({
      toolName: "getAdminUsers",
      run: getAdminUsers,
      verify: verifyAdminUsersResponse,
      format: formatAdminUsersResponse
    });
  }

  if (plan.intent === "GET_PROJECT_ASSIGNMENTS") {
    try {
      harnessLogger.info("TOOL", "getProjectAssignments start");
      const assignments = await getProjectAssignments();
      harnessLogger.info("TOOL", "getProjectAssignments success", { rows: assignments.length });
      return formatProjectAssignmentsResponse(assignments);
    } catch (error) {
      return formatBackendError(error);
    }
  }
  if (plan.intent === "GET_MANAGER_RECOMMENDATIONS") {
    const dateRange = extractDateRange(userMessage);

    if (dateRange) {
      harnessLogger.info("DATE_RANGE", "manager recommendations date range resolved", {
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    }

    if (!dateRange) {
      return formatManagerRecommendationsMissingDateRange();
    }

    try {
      // Phase 21: Recommendations are built from read-only report data.
      // The harness suggests next steps but does not send reminders or change TRS state.
      harnessLogger.info("TOOL", "getMissingEntriesReport start", {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const missingReport = await getMissingEntriesReport(
        dateRange.startDate,
        dateRange.endDate
      );
      harnessLogger.info("TOOL", "getMissingEntriesReport success", {
        rows: missingReport.length
      });

      harnessLogger.info("TOOL", "getUtilizationReport start", {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const utilizationReport = await getUtilizationReport(
        dateRange.startDate,
        dateRange.endDate
      );
      harnessLogger.info("TOOL", "getUtilizationReport success", {
        rows: utilizationReport.length
      });

      const insight = buildManagerInsight(missingReport, utilizationReport);
      harnessLogger.info("INSIGHT", "manager insight built for recommendations", {
        attentionAreas: insight.attentionAreas.length
      });

      const baseRecommendations = buildManagerRecommendations(insight);
      const adaptedRecommendations = applyRecommendationMemory(
        baseRecommendations,
        context.recommendationMemories
      );
      harnessLogger.info("MEMORY", "recommendation memory applied", {
        baseRecommendationCount: baseRecommendations.recommendations.length,
        adaptedRecommendationCount: adaptedRecommendations.recommendations.length,
        recommendationMemoryCount: context.recommendationMemories.length
      });

      return formatManagerRecommendationsResponse(
        adaptedRecommendations,
        dateRange.label,
        context.recommendationMemories
      );
    } catch (error) {
      return formatBackendError(error);
    }
  }
  if (plan.intent === "GET_MANAGER_INSIGHT") {
    const dateRange = extractDateRange(userMessage);

    if (dateRange) {
      harnessLogger.info("DATE_RANGE", "manager insight date range resolved", {
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
      harnessLogger.info("TOOL", "getMissingEntriesReport start", {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const missingReport = await getMissingEntriesReport(
        dateRange.startDate,
        dateRange.endDate
      );
      harnessLogger.info("TOOL", "getMissingEntriesReport success", {
        rows: missingReport.length
      });

      harnessLogger.info("TOOL", "getUtilizationReport start", {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const utilizationReport = await getUtilizationReport(
        dateRange.startDate,
        dateRange.endDate
      );
      harnessLogger.info("TOOL", "getUtilizationReport success", {
        rows: utilizationReport.length
      });

      const insight = buildManagerInsight(missingReport, utilizationReport);
      harnessLogger.info("INSIGHT", "manager insight built", {
        attentionAreas: insight.attentionAreas.length
      });

      return formatManagerInsightResponse(insight, dateRange.label);
    } catch (error) {
      return formatBackendError(error);
    }
  }


  if (plan.intent === "GET_UTILIZATION_REPORT") {
    const dateRange = extractDateRange(userMessage);

    if (dateRange) {
      harnessLogger.info("DATE_RANGE", "utilization date range resolved", {
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    }

    if (!dateRange) {
      return formatUtilizationMissingDateRange();
    }

    try {
      // Phase 32B: The report route now asks the shared executor for verified data.
      // The route still owns report-specific filtering because matching a single
      // employee happens after the backend response has been verified.
      const reportResult = await executeVerifiedToolData({
        toolName: "getUtilizationReport",
        run: () => getUtilizationReport(dateRange.startDate, dateRange.endDate),
        verify: verifyUtilizationReportResponse
      });

      if (!reportResult.ok) {
        return reportResult.response;
      }

      const report = reportResult.value;
      const employeeReference = extractEmployeeReferenceForUtilization(userMessage, dateRange.label);
      const employeeMatch = matchReportEmployee(employeeReference, report);
      harnessLogger.info("REPORT", "utilization employee filter evaluated", {
        employeeReference: employeeReference || "none",
        matchStatus: employeeMatch.status
      });

      if (employeeMatch.status === "MATCHED") {
        return formatSingleEmployeeUtilizationResponse(employeeMatch.employee, dateRange.label);
      }

      if (employeeMatch.status === "NOT_FOUND" || employeeMatch.status === "AMBIGUOUS") {
        return formatUtilizationEmployeeMatchProblem(employeeMatch, dateRange.label);
      }

      return formatUtilizationReportResponse(report, dateRange.label);
    } catch (error) {
      return formatBackendError(error);
    }
  }
  if (plan.intent === "GET_MISSING_ENTRIES_REPORT") {
    const dateRange = extractDateRange(userMessage);

    if (dateRange) {
      harnessLogger.info("DATE_RANGE", "missing entries date range resolved", {
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    }

    if (!dateRange) {
      return formatMissingEntriesMissingDateRange();
    }

    try {
      // Phase 32B: Missing-entry report also uses the shared verified data executor.
      // The route still owns employee matching and final report formatting after
      // verification passes.
      const reportResult = await executeVerifiedToolData({
        toolName: "getMissingEntriesReport",
        run: () => getMissingEntriesReport(dateRange.startDate, dateRange.endDate),
        verify: verifyMissingEntriesReportResponse
      });

      if (!reportResult.ok) {
        return reportResult.response;
      }

      const report = reportResult.value;
      const employeeReference = extractEmployeeReferenceForMissingEntries(userMessage, dateRange.label);

      const employeeMatch = matchMissingEntriesEmployee(employeeReference, report);
      harnessLogger.info("REPORT", "missing entries employee filter evaluated", {
        employeeReference: employeeReference || "none",
        matchStatus: employeeMatch.status
      });

      if (employeeMatch.status === "MATCHED") {
        return formatSingleEmployeeMissingEntriesResponse(employeeMatch.employee, dateRange.label);
      }

      if (employeeMatch.status === "NOT_FOUND" || employeeMatch.status === "AMBIGUOUS") {
        return formatMissingEntriesEmployeeMatchProblem(employeeMatch, dateRange.label);
      }

      return formatMissingEntriesReportResponse(report, dateRange.label);
    } catch (error) {
      return formatBackendError(error);
    }
  }
  if (plan.intent === "GET_MY_PROJECTS") {
    try {
      const projects = await getMyProjects();
      return formatMyProjectsResponse(projects);
    } catch (error) {
      return formatBackendError(error);
    }
  }

  if (plan.intent === "KNOWLEDGE_QUERY") {
    const retrievedKnowledge = await retrieveKnowledge(userMessage);
    return formatKnowledgeResponse(userMessage, retrievedKnowledge);
  }

  if (plan.intent === "CREATE_PROJECT_DRAFT") {
    const draft = prepareCreateProjectDraft(userMessage);

    if (!draft) {
      return formatCreateProjectMissingFields();
    }

    const pendingAction = {
      type: "CREATE_PROJECT" as const,
      createdAt: new Date().toISOString(),
      draft
    };

    await savePendingAction(pendingAction);
    harnessLogger.info("DRAFT", "create project draft saved", {
      projectName: draft.projectName
    });
    return formatCreateProjectDraft(pendingAction);
  }
  if (plan.intent === "ASSIGN_USER_TO_PROJECT_DRAFT") {
    const references = extractAssignmentReferences(userMessage);

    if (!references) {
      return formatAssignUserToProjectMissingFields();
    }

    try {
      // Assignment is a write action, so we resolve against real backend data first.
      // This prevents the harness from guessing user/project IDs from natural text.
      harnessLogger.info("TOOL", "getAdminUsers start for assignment resolution");
      const users = await getAdminUsers();
      harnessLogger.info("TOOL", "getAdminUsers success", { rows: users.length });

      harnessLogger.info("TOOL", "getAdminProjects start for assignment resolution");
      const projects = await getAdminProjects();
      harnessLogger.info("TOOL", "getAdminProjects success", { rows: projects.length });

      const resolvedAssignment = resolveAssignmentDraft(
        references.userReference,
        references.projectReference,
        users,
        projects
      );

      if (resolvedAssignment.status !== "RESOLVED") {
        return formatAssignmentResolveProblem(resolvedAssignment);
      }

      // Phase 15: Duplicate protection for assignment writes.
      // Before saving a draft, we check existing backend assignments. This prevents
      // the harness from asking for confirmation on a write that would create a
      // duplicate relationship or confuse the admin with repeated records.
      harnessLogger.info("TOOL", "getProjectAssignments start for duplicate check");
      const assignments = await getProjectAssignments();
      harnessLogger.info("TOOL", "getProjectAssignments success", { rows: assignments.length });
      const existingAssignment = assignments.find((assignment) => {
        return (
          assignment.userId === resolvedAssignment.draft.userId &&
          assignment.projectId === resolvedAssignment.draft.projectId
        );
      });

      if (existingAssignment) {
        return formatAssignmentAlreadyExists(existingAssignment);
      }

      const pendingAction = {
        type: "ASSIGN_USER_TO_PROJECT" as const,
        createdAt: new Date().toISOString(),
        draft: resolvedAssignment.draft
      };

      await savePendingAction(pendingAction);
      harnessLogger.info("DRAFT", "assignment draft saved", {
        userId: resolvedAssignment.draft.userId,
        projectId: resolvedAssignment.draft.projectId
      });
      return formatAssignUserToProjectDraft(pendingAction);
    } catch (error) {
      return formatBackendError(error);
    }
  }


  if (plan.intent === "CANCEL_PENDING_ACTION") {
    const pendingAction = await loadPendingAction();

    if (!pendingAction) {
      return formatNoPendingAction();
    }

    await clearPendingAction();
    return formatPendingActionCancelled(pendingAction);
  }

  if (plan.intent === "CONFIRM_PENDING_ACTION") {
    const pendingAction = await loadPendingAction();

    if (!pendingAction) {
      return formatNoPendingAction();
    }

    try {
      if (pendingAction.type === "CREATE_PROJECT") {
        harnessLogger.info("ACTION", "createProject confirm received; backend write starting", {
          projectName: pendingAction.draft.projectName
        });
        const createdProject = await createProject(pendingAction.draft);
        await clearPendingAction();
        harnessLogger.info("ACTION", "createProject success", {
          projectId: createdProject.id,
          projectCode: createdProject.projectCode
        });
        return formatCreateProjectSuccess(createdProject);
      }

      if (pendingAction.type === "ASSIGN_USER_TO_PROJECT") {
        harnessLogger.info("ACTION", "assignUserToProject confirm received; backend write starting", {
          userId: pendingAction.draft.userId,
          projectId: pendingAction.draft.projectId
        });
        const assignment = await assignUserToProject(pendingAction.draft);
        await clearPendingAction();
        harnessLogger.info("ACTION", "assignUserToProject success", {
          userId: pendingAction.draft.userId,
          projectId: pendingAction.draft.projectId
        });
        return formatAssignUserToProjectSuccess(assignment);
      }

      return formatNoPendingAction();
    } catch (error) {
      return formatBackendError(error);
    }
  }

  const unsupportedResponse = formatUnsupportedResponse(userMessage);
  harnessLogger.info("HARNESS", "request completed", {
    durationMs: Date.now() - requestStartedAt,
    outcome: "unsupported"
  });
  return unsupportedResponse;
}









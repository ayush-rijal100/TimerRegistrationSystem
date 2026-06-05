// Phase 33: Tool Registry Skeleton.
//
// The registry is the harness catalog of available TRS capabilities.
// Today it is metadata only. Later it can drive tool selection, permission
// explanation, UI display, and safer execution policies.

import type { HarnessIntent } from "../agent/planner.js";

export type ToolRiskLevel = "READ_ONLY" | "LOCAL_MEMORY_WRITE" | "BACKEND_WRITE";
export type ToolRole = "EMPLOYEE" | "MANAGER" | "ADMIN" | "ANY";

export interface ToolRegistryEntry {
  name: string;
  intent: HarnessIntent;
  description: string;
  riskLevel: ToolRiskLevel;
  requiresConfirmation: boolean;
  allowedRoles: ToolRole[];
}

export const toolRegistry: ToolRegistryEntry[] = [
  {
    name: "getCurrentUser",
    intent: "WHO_AM_I",
    description: "Resolve the configured external identity to the current TRS user.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["ANY"]
  },
  {
    name: "getMyProjects",
    intent: "GET_MY_PROJECTS",
    description: "List projects assigned to the current TRS user.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["EMPLOYEE", "MANAGER", "ADMIN"]
  },
  {
    name: "getAdminProjects",
    intent: "GET_ADMIN_PROJECTS",
    description: "List all projects in TRS for admin users.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["ADMIN"]
  },
  {
    name: "getAdminUsers",
    intent: "GET_ADMIN_USERS",
    description: "List all users in TRS for admin users.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["ADMIN"]
  },
  {
    name: "getProjectAssignments",
    intent: "GET_PROJECT_ASSIGNMENTS",
    description: "List user-project assignments for admin users.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["ADMIN"]
  },
  {
    name: "getMissingEntriesReport",
    intent: "GET_MISSING_ENTRIES_REPORT",
    description: "Show missing time-entry report for manager/admin review.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["MANAGER", "ADMIN"]
  },
  {
    name: "getUtilizationReport",
    intent: "GET_UTILIZATION_REPORT",
    description: "Show utilization report for manager/admin review.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["MANAGER", "ADMIN"]
  },
  {
    name: "buildManagerInsight",
    intent: "GET_MANAGER_INSIGHT",
    description: "Combine missing-entry and utilization reports into manager attention areas.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["MANAGER", "ADMIN"]
  },
  {
    name: "buildManagerRecommendations",
    intent: "GET_MANAGER_RECOMMENDATIONS",
    description: "Generate advisory manager recommendations from report data and local memory.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["MANAGER", "ADMIN"]
  },
  {
    name: "retrieveKnowledge",
    intent: "KNOWLEDGE_QUERY",
    description: "Answer conceptual TRS questions from local knowledge documents.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["ANY"]
  },
  {
    name: "createProjectDraft",
    intent: "CREATE_PROJECT_DRAFT",
    description: "Prepare a project creation draft before backend mutation.",
    riskLevel: "BACKEND_WRITE",
    requiresConfirmation: true,
    allowedRoles: ["ADMIN"]
  },
  {
    name: "assignUserToProjectDraft",
    intent: "ASSIGN_USER_TO_PROJECT_DRAFT",
    description: "Prepare a user-project assignment draft before backend mutation.",
    riskLevel: "BACKEND_WRITE",
    requiresConfirmation: true,
    allowedRoles: ["ADMIN"]
  },
  {
    name: "confirmPendingAction",
    intent: "CONFIRM_PENDING_ACTION",
    description: "Confirm and execute a pending draft action.",
    riskLevel: "BACKEND_WRITE",
    requiresConfirmation: false,
    allowedRoles: ["ANY"]
  },
  {
    name: "cancelPendingAction",
    intent: "CANCEL_PENDING_ACTION",
    description: "Cancel a pending draft action without backend mutation.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["ANY"]
  },
  {
    name: "addCorrectionMemory",
    intent: "ADD_CORRECTION_MEMORY",
    description: "Store local correction memory for future harness context.",
    riskLevel: "LOCAL_MEMORY_WRITE",
    requiresConfirmation: false,
    allowedRoles: ["ANY"]
  },
  {
    name: "showCorrectionMemory",
    intent: "SHOW_CORRECTION_MEMORY",
    description: "Show locally stored correction memories.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["ANY"]
  },
  {
    name: "addRecommendationMemory",
    intent: "ADD_RECOMMENDATION_MEMORY",
    description: "Store local recommendation feedback memory.",
    riskLevel: "LOCAL_MEMORY_WRITE",
    requiresConfirmation: false,
    allowedRoles: ["MANAGER", "ADMIN"]
  },
  {
    name: "showRecommendationMemory",
    intent: "SHOW_RECOMMENDATION_MEMORY",
    description: "Show locally stored recommendation feedback memories.",
    riskLevel: "READ_ONLY",
    requiresConfirmation: false,
    allowedRoles: ["MANAGER", "ADMIN"]
  }
];

export function findToolByIntent(
  intent: HarnessIntent
): ToolRegistryEntry | undefined {
  return toolRegistry.find((tool) => tool.intent === intent);
}

export function listRegisteredTools(): ToolRegistryEntry[] {
  return [...toolRegistry];
}

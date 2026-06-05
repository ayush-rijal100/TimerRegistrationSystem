// TRS Adapter is the bridge between the harness and Spring Boot.
// The harness should not know raw endpoint details; it asks this adapter
// for TRS data, and the adapter handles URLs, headers, params, and tokens.

import axios from "axios";
import { config } from "../config.js";

export interface CurrentUserResponse {
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
}

export interface ProjectResponse {
  id: number;
  projectCode: string;
  projectName: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectRequest {
  projectCode: string;
  projectName: string;
}

export interface AssignUserProjectRequest {
  userId: number;
  projectId: number;
}

export interface AssignUserProjectResponse {
  userId: number;
  projectId: number;
  message: string;
}

export interface MissingEntriesReportResponse {
  userId: number;
  fullName: string;
  missingDates: string[];
}

export interface UtilizationReportResponse {
  userId: number;
  fullName: string;
  totalHours: number;
  expectedHours: number;
  utilizationPercent: number;
}

export interface UserProjectAssignmentResponse {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  projectActive: boolean;
}

function botRequestConfig() {
  return {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider: config.externalProvider,
      providerUserId: config.externalProviderUserId
    }
  };
}

// Phase 2: Resolve external identity into the real mapped TRS user.
// Example: CLAUDE_DESKTOP + admin-local -> Admin One.
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await axios.get<CurrentUserResponse>(
    `${config.trsApiBaseUrl}/api/bot/identity/resolve`,
    botRequestConfig()
  );

  return response.data;
}

// Phase 4: First real read-only skill tool.
// This asks Spring Boot for projects assigned to the mapped TRS user.
export async function getMyProjects(): Promise<ProjectResponse[]> {
  const response = await axios.get<ProjectResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/projects/my`,
    botRequestConfig()
  );

  return response.data;
}

// Phase 10: Admin read-only tool.
// This asks Spring Boot for all TRS projects. The backend verifies that the
// mapped external identity has ADMIN role before returning data.
export async function getAdminProjects(): Promise<ProjectResponse[]> {
  const response = await axios.get<ProjectResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/admin/projects`,
    botRequestConfig()
  );

  return response.data;
}

// Phase 11: Admin read-only user list tool.
// Spring Boot validates that the mapped external identity has ADMIN role.
export async function getAdminUsers(): Promise<UserResponse[]> {
  const response = await axios.get<UserResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/admin/users`,
    botRequestConfig()
  );

  return response.data;
}

// Phase 12: Admin read-only project assignment list.
// This returns which users are assigned to which projects.
export async function getProjectAssignments(): Promise<UserProjectAssignmentResponse[]> {
  const response = await axios.get<UserProjectAssignmentResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/admin/user-projects`,
    botRequestConfig()
  );

  return response.data;
}

// Phase 7: First write-action tool.
// This still goes through Spring Boot, which validates bot token, external identity,
// and ADMIN role before creating the project.
export async function createProject(request: CreateProjectRequest): Promise<ProjectResponse> {
  const response = await axios.post<ProjectResponse>(
    `${config.trsApiBaseUrl}/api/bot/admin/projects`,
    request,
    botRequestConfig()
  );

  return response.data;
}

// Phase 13: Admin write-action tool for assigning a user to a project.
// The harness prepares a draft first; this function is called only after confirmation.
export async function assignUserToProject(
  request: AssignUserProjectRequest
): Promise<AssignUserProjectResponse> {
  const response = await axios.post<AssignUserProjectResponse>(
    `${config.trsApiBaseUrl}/api/bot/admin/user-projects`,
    request,
    botRequestConfig()
  );

  return response.data;
}

// Phase 17: Manager/Admin read-only report tool.
// Spring Boot validates the external identity role before returning missing entries.
export async function getMissingEntriesReport(
  startDate: string,
  endDate: string
): Promise<MissingEntriesReportResponse[]> {
  const response = await axios.get<MissingEntriesReportResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/reports/missing-entries`,
    {
      ...botRequestConfig(),
      params: {
        ...botRequestConfig().params,
        startDate,
        endDate
      }
    }
  );

  return response.data;
}

// Phase 19: Manager/Admin read-only utilization report tool.
// Spring Boot validates MANAGER/ADMIN role using the mapped external identity.
export async function getUtilizationReport(
  startDate: string,
  endDate: string
): Promise<UtilizationReportResponse[]> {
  const response = await axios.get<UtilizationReportResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/reports/utilization`,
    {
      ...botRequestConfig(),
      params: {
        ...botRequestConfig().params,
        startDate,
        endDate
      }
    }
  );

  return response.data;
}

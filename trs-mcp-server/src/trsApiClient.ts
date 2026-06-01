import axios from "axios";
import { config } from "./config.js";
import type {
  AssignUserProjectRequest,
  AssignUserProjectResponse,
  CreateProjectRequest,
  CreateTimeEntryRequest,
  CreateUserRequest,
  CurrentUserResponse,
  ProjectResponse,
  TimeEntryResponse,
  UserProjectAssignmentResponse,
  UserResponse,
  UtilizationReportResponse,
  MissingEntriesReportResponse
} from "./types.js";

const botHeaders = {
  "X-Bot-Service-Token": config.trsBotServiceToken
};

const identityParams = {
  provider: config.trsDefaultProvider,
  providerUserId: config.trsDefaultProviderUserId
};

export async function getCurrentUserFromTrs(): Promise<CurrentUserResponse> {
  const response = await axios.get<CurrentUserResponse>(`${config.trsApiBaseUrl}/api/bot/identity/resolve`, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function getMyProjectsFromTrs(): Promise<ProjectResponse[]> {
  const response = await axios.get<ProjectResponse[]>(`${config.trsApiBaseUrl}/api/bot/projects/my`, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function getMyTimeEntriesFromTrs(startDate: string, endDate: string): Promise<TimeEntryResponse[]> {
  const response = await axios.get<TimeEntryResponse[]>(`${config.trsApiBaseUrl}/api/bot/time-entries/my`, {
    headers: botHeaders,
    params: {
      ...identityParams,
      startDate,
      endDate
    }
  });

  return response.data;
}

export async function createMyTimeEntryInTrs(request: CreateTimeEntryRequest): Promise<TimeEntryResponse> {
  const response = await axios.post<TimeEntryResponse>(`${config.trsApiBaseUrl}/api/bot/time-entries/my`, request, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function updateMyTimeEntryInTrs(timeEntryId: number, request: CreateTimeEntryRequest): Promise<TimeEntryResponse> {
  const response = await axios.put<TimeEntryResponse>(`${config.trsApiBaseUrl}/api/bot/time-entries/my/${timeEntryId}`, request, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function getAdminUsersFromTrs(): Promise<UserResponse[]> {
  const response = await axios.get<UserResponse[]>(`${config.trsApiBaseUrl}/api/bot/admin/users`, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function getAdminProjectsFromTrs(): Promise<ProjectResponse[]> {
  const response = await axios.get<ProjectResponse[]>(`${config.trsApiBaseUrl}/api/bot/admin/projects`, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function getProjectAssignmentsFromTrs(): Promise<UserProjectAssignmentResponse[]> {
  const response = await axios.get<UserProjectAssignmentResponse[]>(`${config.trsApiBaseUrl}/api/bot/admin/user-projects`, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function getTeamUtilizationFromTrs(
  startDate: string,
  endDate: string
): Promise<UtilizationReportResponse[]> {
  const response = await axios.get<UtilizationReportResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/reports/utilization`,
    {
      headers: botHeaders,
      params: {
        ...identityParams,
        startDate,
        endDate
      }
    }
  );

  return response.data;
}

export async function getTeamMissingEntriesFromTrs(
  startDate: string,
  endDate: string
): Promise<MissingEntriesReportResponse[]> {
  const response = await axios.get<MissingEntriesReportResponse[]>(
    `${config.trsApiBaseUrl}/api/bot/reports/missing-entries`,
    {
      headers: botHeaders,
      params: {
        ...identityParams,
        startDate,
        endDate
      }
    }
  );

  return response.data;
}



export async function createProjectInTrs(request: CreateProjectRequest): Promise<ProjectResponse> {
  const response = await axios.post<ProjectResponse>(`${config.trsApiBaseUrl}/api/bot/admin/projects`, request, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function createUserInTrs(request: CreateUserRequest): Promise<UserResponse> {
  const response = await axios.post<UserResponse>(`${config.trsApiBaseUrl}/api/bot/admin/users`, request, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function assignUserToProjectInTrs(request: AssignUserProjectRequest): Promise<AssignUserProjectResponse> {
  const response = await axios.post<AssignUserProjectResponse>(`${config.trsApiBaseUrl}/api/bot/admin/user-projects`, request, {
    headers: botHeaders,
    params: identityParams
  });

  return response.data;
}

export async function findMyTimeEntryOnDate(timeEntryId: number, entryDate: string): Promise<TimeEntryResponse | undefined> {
  const entries = await getMyTimeEntriesFromTrs(entryDate, entryDate);
  return entries.find((entry) => entry.id === timeEntryId);
}

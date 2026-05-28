import axios from "axios";
import { config } from "./config";

// Shape returned by the protected backend endpoint GET /api/auth/me.
export type CurrentUserResponse = {
  userId: number;
  fullName: string;
  email: string;
  role: string;
};

// Resolve a Discord/MCP-style external identity to a TRS user.
// This is the new direction: the bot identifies the Discord account, then the backend maps it to a TRS user.
export async function resolveExternalIdentity(
  provider: string,
  providerUserId: string
): Promise<CurrentUserResponse> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/identity/resolve`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}
// Get assigned projects using external identity instead of a user JWT.
// This is the bot-safe path for natural-language requests like "what projects am I assigned to?".
export async function getBotMyProjects(
  provider: string,
  providerUserId: string
): Promise<ProjectResponse[]> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/projects/my`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}
// ADDED: Get time entries using Discord identity instead of JWT.
// This supports natural-language bot requests like "show my time entries this week".
export async function getBotMyTimeEntries(
  provider: string,
  providerUserId: string,
  startDate: string,
  endDate: string
): Promise<TimeEntryResponse[]> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/time-entries/my`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId,
      startDate,
      endDate
    }
  });

  return response.data;
}

// Get missing time entries report using Discord identity.
// Backend allows only MANAGER or ADMIN.
export async function getBotMissingEntriesReport(
  provider: string,
  providerUserId: string,
  startDate: string,
  endDate: string
): Promise<MissingEntriesReportResponse[]> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/reports/missing-entries`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId,
      startDate,
      endDate
    }
  });

  return response.data;
}






export type MissingEntriesReportResponse = {
  userId: number;
  fullName: string;
  missingDates: string[];
};




// Create a time entry using Discord identity instead of JWT.
// This is used by natural-language bot writes after the user confirms a pending draft.
export async function createBotMyTimeEntry(
  provider: string,
  providerUserId: string,
  request: CreateTimeEntryRequest
): Promise<TimeEntryResponse> {
  const response = await axios.post(`${config.trsApiBaseUrl}/api/bot/time-entries/my`, request, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}

// Update a time entry using Discord identity instead of JWT.
// This is used by natural-language bot updates after confirmation.
export async function updateBotMyTimeEntry(
  provider: string,
  providerUserId: string,
  timeEntryId: number,
  request: CreateTimeEntryRequest
): Promise<TimeEntryResponse> {
  const response = await axios.put(`${config.trsApiBaseUrl}/api/bot/time-entries/my/${timeEntryId}`, request, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}

// Soft-cancel a time entry using Discord identity instead of JWT.
// The backend keeps the row and changes status to CANCELLED for auditability.
export async function cancelBotMyTimeEntry(
  provider: string,
  providerUserId: string,
  timeEntryId: number
): Promise<TimeEntryResponse> {
  const response = await axios.patch(`${config.trsApiBaseUrl}/api/bot/time-entries/my/${timeEntryId}/cancel`, null, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}
export type UtilizationReportResponse = {
  userId: number;
  fullName: string;
  totalHours: number;
  expectedHours: number;
  utilizationPercent: number;
};

// Shape returned by GET /api/projects/my.
export type ProjectResponse = {
  id: number;
  projectCode: string;
  projectName: string;
  active: boolean;
};

// Shape returned by GET /api/time-entries/my.
export type TimeEntryResponse = {
  id: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  entryDate: string;
  hours: number;
  notes: string | null;
  status: string;
};

export type CreateTimeEntryRequest = {
  projectId: number;
  entryDate: string;
  hours: number;
  notes?: string;
};


// Get team utilization report using Discord identity. Backend allows only MANAGER or ADMIN.
export async function getBotUtilizationReport(
  provider: string,
  providerUserId: string,
  startDate: string,
  endDate: string
): Promise<UtilizationReportResponse[]> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/reports/utilization`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId,
      startDate,
      endDate
    }
  });

  return response.data;
}
// Public health check used to prove Discord -> bot -> Spring Boot communication.
export async function checkHealth(): Promise<string> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/health`);
  return response.data;
}
export type AdminUserResponse = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
};

export type AdminUserProjectAssignmentResponse = {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  projectActive: boolean;
};

export type CreateAdminProjectRequest = {
  projectCode: string;
  projectName: string;
};

export type CreateAdminUserRequest = {
  fullName: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
};

export type AssignUserProjectResponse = {
  userId: number;
  projectId: number;
  message: string;
};

// Admin-only: list all TRS users using Discord identity.
export async function getBotAdminUsers(
  provider: string,
  providerUserId: string
): Promise<AdminUserResponse[]> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/admin/users`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;



}

// Admin-only: list all TRS projects using Discord identity.
export async function getBotAdminProjects(
  provider: string,
  providerUserId: string
): Promise<ProjectResponse[]> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/admin/projects`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}


// Admin-only: list user-project assignments using Discord identity.
export async function getBotAdminUserProjects(
  provider: string,
  providerUserId: string
): Promise<AdminUserProjectAssignmentResponse[]> {
  const response = await axios.get(`${config.trsApiBaseUrl}/api/bot/admin/user-projects`, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}

// Admin-only: assign a TRS user to a project using Discord identity.
export async function assignBotAdminUserToProject(
  provider: string,
  providerUserId: string,
  userId: number,
  projectId: number
): Promise<AssignUserProjectResponse> {
  const response = await axios.post(
    `${config.trsApiBaseUrl}/api/bot/admin/user-projects`,
    { userId, projectId },
    {
      headers: {
        "X-Bot-Service-Token": config.trsBotServiceToken
      },
      params: {
        provider,
        providerUserId
      }
    }
  );

  return response.data;
}

// Admin-only: create a TRS project using Discord identity.
export async function createBotAdminProject(
  provider: string,
  providerUserId: string,
  request: CreateAdminProjectRequest
): Promise<ProjectResponse> {
  const response = await axios.post(`${config.trsApiBaseUrl}/api/bot/admin/projects`, request, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}

// Admin-only: create a TRS user using Discord identity. Discord ID mapping is intentionally not created here yet.
export async function createBotAdminUser(
  provider: string,
  providerUserId: string,
  request: CreateAdminUserRequest
): Promise<AdminUserResponse> {
  const response = await axios.post(`${config.trsApiBaseUrl}/api/bot/admin/users`, request, {
    headers: {
      "X-Bot-Service-Token": config.trsBotServiceToken
    },
    params: {
      provider,
      providerUserId
    }
  });

  return response.data;
}

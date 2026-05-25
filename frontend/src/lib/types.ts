export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  message: string;
};

export type AuthUser = {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
};

export type ProjectResponse = {
  id: number;
  projectCode: string;
  projectName: string;
  active: boolean;
};

export type TimeEntryRequest = {
  projectId: number;
  entryDate: string;
  hours: number;
  notes?: string;
};

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

export type ProjectHoursReportResponse = {
  projectId: number;
  projectCode: string;
  projectName: string;
  totalHours: number;
};

export type UtilizationReportResponse = {
  userId: number;
  fullName: string;
  totalHours: number;
  expectedHours: number;
  utilizationPercent: number;
};

export type MissingEntriesReportResponse = {
  userId: number;
  fullName: string;
  missingDates: string[];
};

export type UserResponse = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export type CreateUserRequest = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};

export type CreateProjectRequest = {
  projectCode: string;
  projectName: string;
};

export type AssignUserProjectRequest = {
  userId: number;
  projectId: number;
};

export type AssignUserProjectResponse = {
  userId: number;
  projectId: number;
  message: string;
};

export type ApiErrorResponse = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
};

export type AuditLogResponse = {
  id: number;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: number;
  metaJson: string;
  createdAt: string;
};

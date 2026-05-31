export type ProjectResponse = {
  id: number;
  projectCode: string;
  projectName: string;
  active: boolean;
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

export type CreateTimeEntryRequest = {
  projectId: number;
  entryDate: string;
  hours: number;
  notes?: string;
};

export type CreateProjectRequest = {
  projectCode: string;
  projectName: string;
};

export type CreateUserRequest = {
  fullName: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
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

export type CurrentUserResponse = {
  userId: number;
  fullName: string;
  email: string;
  role: string;
};

export type UserResponse = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
};

export type UserProjectAssignmentResponse = {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  projectActive: boolean;
};

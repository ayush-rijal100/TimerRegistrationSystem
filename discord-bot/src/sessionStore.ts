import { AiIntentResult } from "./ai/intentParser";

export type PendingTimeEntryAction = "CREATE" | "UPDATE" | "CANCEL";

export type PendingTimeEntry = {
  action: PendingTimeEntryAction;
  timeEntryId?: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  entryDate: string;
  hours: number;
  notes?: string;
};

// MVP in-memory storage only: pending state disappears when the bot restarts.
// Later this can move to Redis/PostgreSQL if we need durable conversations.
export type PendingAdminProjectCreate = {
  projectCode: string;
  projectName: string;
};

export type PendingAdminUserCreate = {
  fullName: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
};

export type PendingAdminAssignment = {
  userId: number;
  fullName: string;
  email: string;
  projectId: number;
  projectCode: string;
  projectName: string;
};

const pendingTimeEntries = new Map<string, PendingTimeEntry>();
const pendingAdminAssignments = new Map<string, PendingAdminAssignment>();
const pendingAdminProjectCreates = new Map<string, PendingAdminProjectCreate>();
const pendingAdminUserCreates = new Map<string, PendingAdminUserCreate>();
const pendingAiActions = new Map<string, AiIntentResult>();

export function savePendingTimeEntry(discordUserId: string, pendingTimeEntry: PendingTimeEntry): void {
  pendingTimeEntries.set(discordUserId, pendingTimeEntry);
}

export function getPendingTimeEntry(discordUserId: string): PendingTimeEntry | undefined {
  return pendingTimeEntries.get(discordUserId);
}

export function clearPendingTimeEntry(discordUserId: string): void {
  pendingTimeEntries.delete(discordUserId);
}

export function savePendingAiAction(discordUserId: string, pendingAction: AiIntentResult): void {
  pendingAiActions.set(discordUserId, pendingAction);
}

export function getPendingAiAction(discordUserId: string): AiIntentResult | undefined {
  return pendingAiActions.get(discordUserId);
}

export function clearPendingAiAction(discordUserId: string): void {
  pendingAiActions.delete(discordUserId);
}
export function savePendingAdminAssignment(discordUserId: string, pendingAssignment: PendingAdminAssignment): void {
  pendingAdminAssignments.set(discordUserId, pendingAssignment);
}

export function getPendingAdminAssignment(discordUserId: string): PendingAdminAssignment | undefined {
  return pendingAdminAssignments.get(discordUserId);
}

export function clearPendingAdminAssignment(discordUserId: string): void {
  pendingAdminAssignments.delete(discordUserId);
}

export function savePendingAdminProjectCreate(discordUserId: string, pendingProject: PendingAdminProjectCreate): void {
  pendingAdminProjectCreates.set(discordUserId, pendingProject);
}

export function getPendingAdminProjectCreate(discordUserId: string): PendingAdminProjectCreate | undefined {
  return pendingAdminProjectCreates.get(discordUserId);
}

export function clearPendingAdminProjectCreate(discordUserId: string): void {
  pendingAdminProjectCreates.delete(discordUserId);
}

export function savePendingAdminUserCreate(discordUserId: string, pendingUser: PendingAdminUserCreate): void {
  pendingAdminUserCreates.set(discordUserId, pendingUser);
}

export function getPendingAdminUserCreate(discordUserId: string): PendingAdminUserCreate | undefined {
  return pendingAdminUserCreates.get(discordUserId);
}

export function clearPendingAdminUserCreate(discordUserId: string): void {
  pendingAdminUserCreates.delete(discordUserId);
}

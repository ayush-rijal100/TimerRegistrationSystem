// Pending Action Store keeps draft-confirm-execute state between terminal runs.
// Because `npm run dev -- "..."` starts a fresh process each time, an in-memory
// variable would disappear before the user can reply "yes". A small local JSON
// file is enough for this MVP and keeps the behavior easy to inspect.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type PendingActionType = "CREATE_PROJECT" | "ASSIGN_USER_TO_PROJECT";

export interface CreateProjectDraft {
  projectCode: string;
  projectName: string;
}

export interface AssignUserToProjectDraft {
  userId: number;
  projectId: number;

  // Display fields are stored with the draft so confirmation can show
  // exactly what the admin is about to save.
  userName?: string;
  userEmail?: string;
  projectCode?: string;
  projectName?: string;
}

interface PendingCreateProjectAction {
  type: "CREATE_PROJECT";
  createdAt: string;
  draft: CreateProjectDraft;
}

interface PendingAssignUserToProjectAction {
  type: "ASSIGN_USER_TO_PROJECT";
  createdAt: string;
  draft: AssignUserToProjectDraft;
}

export type PendingAction = PendingCreateProjectAction | PendingAssignUserToProjectAction;

const pendingActionFilePath = join(process.cwd(), ".harness-state", "pending-action.json");

export async function savePendingAction(action: PendingAction): Promise<void> {
  await mkdir(dirname(pendingActionFilePath), { recursive: true });
  await writeFile(pendingActionFilePath, JSON.stringify(action, null, 2), "utf8");
}

export async function loadPendingAction(): Promise<PendingAction | null> {
  try {
    const raw = await readFile(pendingActionFilePath, "utf8");
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
  }
}

export async function clearPendingAction(): Promise<void> {
  await rm(pendingActionFilePath, { force: true });
}
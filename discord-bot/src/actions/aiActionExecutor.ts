import { addConversationMessage } from "../ai/conversationStore";
import { AiIntentName, AiIntentResult } from "../ai/intentParser";
import { writeProfileResponse, writeProjectsResponse} from "../ai/responseWriter";
import { parseDateRange } from "../domain/timeEntries/dateRangeParser";
import {
  clearPendingAdminAssignment,
  clearPendingAdminProjectCreate,
  clearPendingAdminUserCreate,
  clearPendingAiAction,
  clearPendingTimeEntry,
  getPendingAdminAssignment,
  getPendingAdminProjectCreate,
  getPendingAdminUserCreate,
  getPendingAiAction,
  getPendingTimeEntry,
  savePendingAdminAssignment,
  savePendingAdminProjectCreate,
  savePendingAdminUserCreate,
  savePendingAiAction,
  savePendingTimeEntry
} from "../sessionStore";
import { matchProjectReference } from "../domain/projects/projectMatcher";
import { canExecuteAction, getAllowedRoles } from "./actionPermissions";
import {
  AdminUserResponse,
  CurrentUserResponse,
  ProjectResponse,
  assignBotAdminUserToProject,
  cancelBotMyTimeEntry,
  createBotAdminProject,
  createBotAdminUser,
  createBotMyTimeEntry,
  getBotMyProjects,
  getBotMyTimeEntries,
  getBotUtilizationReport,
  getBotMissingEntriesReport,
  getBotAdminUsers,
  getBotAdminProjects,
  getBotAdminUserProjects,
  resolveExternalIdentity,
  updateBotMyTimeEntry
} from "../trsApi";

export type BotMessage = {
  author: { id: string };
  content: string;
  reply: (content: string) => Promise<unknown>;
};

const DISCORD_MESSAGE_LIMIT = 2000;
const SAFE_DISCORD_MESSAGE_LIMIT = 1900;

function splitDiscordMessage(content: string): string[] {
  if (content.length <= DISCORD_MESSAGE_LIMIT) {
    return [content];
  }

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > SAFE_DISCORD_MESSAGE_LIMIT) {
    const splitAt = Math.max(
      remaining.lastIndexOf("\n", SAFE_DISCORD_MESSAGE_LIMIT),
      remaining.lastIndexOf(", ", SAFE_DISCORD_MESSAGE_LIMIT)
    );
    const end = splitAt > 0 ? splitAt : SAFE_DISCORD_MESSAGE_LIMIT;

    chunks.push(remaining.slice(0, end).trimEnd());
    remaining = remaining.slice(end).trimStart();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

async function replyAndRemember(message: BotMessage, reply: string): Promise<void> {
  const chunks = splitDiscordMessage(reply);

  for (const chunk of chunks) {
    await message.reply(chunk);
  }

  addConversationMessage(message.author.id, {
    role: "user",
    content: message.content.trim(),
    createdAt: new Date()
  });

  addConversationMessage(message.author.id, {
    role: "assistant",
    content: reply.slice(0, 1000),
    createdAt: new Date()
  });
}

async function handleViewMyProfile(message: BotMessage, currentUser: CurrentUserResponse): Promise<void> {
  const reply = await writeProfileResponse({
    originalUserMessage: message.content.trim(),
    user: currentUser
  });

  await replyAndRemember(message, reply);
}

async function handleViewMyProjects(message: BotMessage, projectReference?: string): Promise<void> {
  const projects = await getBotMyProjects("DISCORD", message.author.id);
  const cleanedProjectReference = cleanProjectReference(projectReference);

  // Only run project matching when the user mentions a real project code/name.
  // Generic questions like "which projects am I assigned to" should list projects instead.
  if (cleanedProjectReference) {
    const projectMatch = matchProjectReference(message.content.trim(), projects, cleanedProjectReference);

    if (projectMatch.type === "EXACT_MATCH") {
      await replyAndRemember(
        message,
        `Yes, you are assigned to ${projectMatch.project.projectCode} - ${projectMatch.project.projectName}.`
      );
      return;
    }

    if (projectMatch.type === "POSSIBLE_MATCH") {
      await replyAndRemember(
        message,
        `Did you mean ${projectMatch.project.projectCode} - ${projectMatch.project.projectName}? If yes, you are assigned to that project.`
      );
      return;
    }

    if (projectMatch.type === "NO_MATCH") {
      await replyAndRemember(
        message,
        [
          `I could not confidently match "${projectMatch.userText}" to one of your assigned projects.`,
          "Your assigned projects are:",
          ...projects.map((project) => `- ${project.projectCode} - ${project.projectName}`)
        ].join("\n")
      );
      return;
    }
  }

  const activeProjects = message.content.toLowerCase().includes("active")
    ? projects.filter((project) => project.active)
    : projects;

  const reply = await writeProjectsResponse({
    originalUserMessage: message.content.trim(),
    projects: activeProjects
  });

  await replyAndRemember(message, reply);
}

function cleanProjectReference(projectReference?: string): string | undefined {
  const value = projectReference?.trim();
  if (!value) return undefined;

  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const genericReferences = [
    "i am assigned to",
    "am i assigned to",
    "assigned to",
    "which i am assigned to",
    "whic i am assigned too",
    "which active projects i am assigned to",
    "projects i am assigned to",
    "my projects",
    "active projects"
  ];

  if (genericReferences.some((generic) => normalized === generic || normalized.includes(generic))) {
    return undefined;
  }

  return value;
}
async function handleViewMyTimeEntries(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  const dateRange = parsedIntent.dateRange ?? parseDateRange(message.content.trim());
  const entries = await getBotMyTimeEntries(
    "DISCORD",
    message.author.id,
    dateRange.startDate,
    dateRange.endDate
  );

  if (entries.length === 0) {
    await replyAndRemember(
      message,
      `I did not find any time entries for ${dateRange.label}.`
    );
    return;
  }

  const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);

  const lines = entries.map((entry) => {
    const date = entry.entryDate.padEnd(10);
    const project = entry.projectCode.padEnd(8);
    const hours = `${Number(entry.hours).toFixed(1)}h`.padStart(6);
    const status = formatStatus(entry.status).padEnd(9);
    const notes = shortenText(cleanDiscordTableText(entry.notes || "-"), 32);

    return `${date} | ${project} | ${hours} | ${status} | ${notes}`;
  });

  await replyAndRemember(
    message,
    [
      `I found ${entries.length} time entr${entries.length === 1 ? "y" : "ies"} for ${dateRange.label}. Total hours: ${totalHours.toFixed(1)}.`,
      "",
      "```text",
      "Date       | Project  | Hours  | Status    | Notes",
      "-----------|----------|--------|-----------|--------------------------------",
      ...lines,
      "```"
    ].join("\n")
  );
}

function cleanDiscordTableText(value: string): string {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\u2011/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value.padEnd(maxLength);
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}



async function handleCreateTimeEntryDraft(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  if (!parsedIntent.hours || !parsedIntent.projectReference || !parsedIntent.dateRange) {
    await replyAndRemember(
      message,
      "I can help log time, but I need the hours, project, and date. Example: log 4 hours yesterday on client implementation for API bug fixing."
    );
    return;
  }

  if (parsedIntent.dateRange.startDate !== parsedIntent.dateRange.endDate) {
    await replyAndRemember(message, "For creating a time entry, please give one specific date, not a range.");
    return;
  }

  const projects = await getBotMyProjects("DISCORD", message.author.id);
  const projectMatch = matchProjectReference(message.content.trim(), projects, parsedIntent.projectReference);

  if (projectMatch.type !== "EXACT_MATCH" && projectMatch.type !== "POSSIBLE_MATCH") {
    await replyAndRemember(
      message,
      [
        `I could not match "${parsedIntent.projectReference}" to one of your assigned projects.`,
        "Your assigned projects are:",
        ...projects.map((project) => `- ${project.projectCode} - ${project.projectName}`)
      ].join("\n")
    );
    return;
  }

  const project = projectMatch.project;

  savePendingTimeEntry(message.author.id, {
    action: "CREATE",
    projectId: project.id,
    projectCode: project.projectCode,
    projectName: project.projectName,
    entryDate: parsedIntent.dateRange.startDate,
    hours: parsedIntent.hours,
    notes: parsedIntent.notes
  });

  await replyAndRemember(
    message,
    [
      "I prepared this time entry. Please confirm before I save it:",
      `Project: ${project.projectCode} - ${project.projectName}`,
      `Date: ${parsedIntent.dateRange.startDate} (${parsedIntent.dateRange.label})`,
      `Hours: ${parsedIntent.hours}`,
      `Notes: ${parsedIntent.notes || "-"}`,
      "Reply `yes` or `confirm` to save it, or `cancel` to discard it."
    ].join("\n")
  );
}

async function findTargetTimeEntry(message: BotMessage, parsedIntent: AiIntentResult, purpose: "update" | "cancel") {
  if (!parsedIntent.dateRange) {
    await replyAndRemember(
      message,
      `I can ${purpose} a time entry, but I need to know which date.`
    );
    return undefined;
  }

  if (parsedIntent.dateRange.startDate !== parsedIntent.dateRange.endDate) {
    await replyAndRemember(
      message,
      `For ${purpose}ing a time entry, please give one specific date, not a range.`
    );
    return undefined;
  }

  const entries = await getBotMyTimeEntries(
    "DISCORD",
    message.author.id,
    parsedIntent.dateRange.startDate,
    parsedIntent.dateRange.endDate
  );
  const activeEntries = entries.filter((entry) => entry.status !== "CANCELLED");

  if (activeEntries.length === 0) {
    await replyAndRemember(message, `I did not find any active time entries for ${parsedIntent.dateRange.label}.`);
    return undefined;
  }

  if (parsedIntent.projectReference) {
    const projectLikeEntries = activeEntries.map((entry) => ({
      id: entry.projectId,
      projectCode: entry.projectCode,
      projectName: entry.projectName,
      active: true
    }));
    const projectMatch = matchProjectReference(message.content.trim(), projectLikeEntries, parsedIntent.projectReference);

    if (projectMatch.type !== "EXACT_MATCH" && projectMatch.type !== "POSSIBLE_MATCH") {
      await replyAndRemember(
        message,
        [
          `I found entries for ${parsedIntent.dateRange.label}, but could not match project "${parsedIntent.projectReference}".`,
          "Active entries found:",
          ...activeEntries.map((entry) => `- ${entry.projectCode} - ${entry.projectName}: ${entry.hours}h, ${entry.status}`)
        ].join("\n")
      );
      return undefined;
    }

    return activeEntries.find((entry) => entry.projectId === projectMatch.project.id);
  }

  if (activeEntries.length > 1) {
    await replyAndRemember(
      message,
      [
        `I found multiple active entries for ${parsedIntent.dateRange.label}. Please mention the project to ${purpose}.`,
        ...activeEntries.map((entry) => `- ${entry.projectCode} - ${entry.projectName}: ${entry.hours}h, ${entry.status}`)
      ].join("\n")
    );
    return undefined;
  }

  return activeEntries[0];
}

async function handleUpdateTimeEntryDraft(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  if (!parsedIntent.hours && !parsedIntent.notes) {
    await replyAndRemember(
      message,
      "I found this as an update request, but I need to know what to change, like the new hours or notes."
    );
    return;
  }

  const targetEntry = await findTargetTimeEntry(message, parsedIntent, "update");

  if (!targetEntry) {
    return;
  }

  const updatedHours = parsedIntent.hours ?? targetEntry.hours;
  const updatedNotes = parsedIntent.notes ?? targetEntry.notes ?? undefined;

  savePendingTimeEntry(message.author.id, {
    action: "UPDATE",
    timeEntryId: targetEntry.id,
    projectId: targetEntry.projectId,
    projectCode: targetEntry.projectCode,
    projectName: targetEntry.projectName,
    entryDate: targetEntry.entryDate,
    hours: updatedHours,
    notes: updatedNotes
  });

  await replyAndRemember(
    message,
    [
      "I prepared this time entry update. Please confirm before I save it:",
      `Project: ${targetEntry.projectCode} - ${targetEntry.projectName}`,
      `Date: ${targetEntry.entryDate}`,
      `Hours: ${targetEntry.hours} -> ${updatedHours}`,
      `Notes: ${targetEntry.notes ?? "-"} -> ${updatedNotes ?? "-"}`,
      "Reply `yes` or `confirm` to save it, or `cancel` to discard it."
    ].join("\n")
  );
}

async function handleCancelTimeEntryDraft(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  const targetEntry = await findTargetTimeEntry(message, parsedIntent, "cancel");

  if (!targetEntry) {
    return;
  }

  savePendingTimeEntry(message.author.id, {
    action: "CANCEL",
    timeEntryId: targetEntry.id,
    projectId: targetEntry.projectId,
    projectCode: targetEntry.projectCode,
    projectName: targetEntry.projectName,
    entryDate: targetEntry.entryDate,
    hours: targetEntry.hours,
    notes: targetEntry.notes ?? undefined
  });

  await replyAndRemember(
    message,
    [
      "I prepared this time entry cancellation. Please confirm before I change the status:",
      `Project: ${targetEntry.projectCode} - ${targetEntry.projectName}`,
      `Date: ${targetEntry.entryDate}`,
      `Hours: ${targetEntry.hours}`,
      `Current status: ${targetEntry.status}`,
      "After confirmation, status will become CANCELLED.",
      "Reply `yes` or `confirm` to cancel it, or `cancel` to keep it unchanged."
    ].join("\n")
  );
}


async function handleViewAdminUsers(message: BotMessage): Promise<void> {
  const users = await getBotAdminUsers("DISCORD", message.author.id);

  if (users.length === 0) {
    await replyAndRemember(message, "I could not find any users in TRS yet.");
    return;
  }

  const activeCount = users.filter((user) => user.active).length;
  const inactiveCount = users.length - activeCount;

  const roleCounts = users.reduce<Record<string, number>>((counts, user) => {
    counts[user.role] = (counts[user.role] ?? 0) + 1;
    return counts;
  }, {});

  const roleSummary = Object.entries(roleCounts)
    .sort(([firstRole], [secondRole]) => firstRole.localeCompare(secondRole))
    .map(([role, count]) => `${count} ${formatRoleLabel(role)}${count === 1 ? "" : "s"}`)
    .join(", ");

  const lines = users.map((user) => {
    const name = user.fullName.length > 18 ? `${user.fullName.slice(0, 15)}...` : user.fullName;
    const email = user.email.length > 26 ? `${user.email.slice(0, 23)}...` : user.email;
    const status = user.active ? "ACTIVE" : "INACTIVE";

    return `${String(user.id).padEnd(3)} | ${name.padEnd(18)} | ${user.role.padEnd(8)} | ${status.padEnd(8)} | ${email}`;
  });

  const activitySummary = inactiveCount > 0
    ? `${activeCount} active and ${inactiveCount} inactive`
    : `${activeCount} active`;

  await replyAndRemember(
    message,
    [
      `I found ${users.length} user${users.length === 1 ? "" : "s"} in TRS: ${activitySummary}.`,
      roleSummary ? `Role breakdown: ${roleSummary}.` : undefined,
      "",
      "Here’s the user list:",
      "```text",
      "ID  | Name               | Role     | Status   | Email",
      "----|--------------------|----------|----------|---------------------------",
      ...lines,
      "```"
    ].filter(Boolean).join("\n")
  );
}

function formatRoleLabel(role: string): string {
  const lower = role.toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

async function handleViewAdminProjects(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  const projects = await getBotAdminProjects("DISCORD", message.author.id);

  if (projects.length === 0) {
    await replyAndRemember(message, "I could not find any projects in TRS yet.");
    return;
  }

  const statusFilter = parsedIntent.projectStatusFilter ?? "ACTIVE";
  const sortBy = parsedIntent.projectSortBy ?? "PROJECT_CODE";
  const sortDirection = parsedIntent.projectSortDirection ?? "ASC";

  const filteredProjects = filterProjectsByStatus(projects, statusFilter);
  const sortedProjects = sortProjects(filteredProjects, sortBy, sortDirection);

  if (sortedProjects.length === 0) {
    await replyAndRemember(
      message,
      `I found ${projects.length} project${projects.length === 1 ? "" : "s"} in TRS, but none matched the ${statusFilter.toLowerCase()} filter.`
    );
    return;
  }

  const lines = sortedProjects.map((project) => {
    const createdDate = formatProjectDate(project.createdAt);
    const status = project.active ? "ACTIVE" : "INACTIVE";
    const name = project.projectName.length > 36
      ? `${project.projectName.slice(0, 33)}...`
      : project.projectName;

    return `${String(project.id).padEnd(3)} | ${project.projectCode.padEnd(8)} | ${createdDate.padEnd(10)} | ${status.padEnd(8)} | ${name}`;
  });

  await replyAndRemember(
    message,
    [
      buildProjectListIntro(sortedProjects.length, statusFilter, sortBy, sortDirection),
      "",
      "```text",
      "ID  | Code     | Created    | Status   | Name",
      "----|----------|------------|----------|-------------------------------------",
      ...lines,
      "```"
    ].join("\n")
  );
}

function filterProjectsByStatus(projects: ProjectResponse[], statusFilter: AiIntentResult["projectStatusFilter"]): ProjectResponse[] {
  if (statusFilter === "ALL") return projects;
  if (statusFilter === "INACTIVE") return projects.filter((project) => !project.active);
  return projects.filter((project) => project.active);
}

function sortProjects(
  projects: ProjectResponse[],
  sortBy: NonNullable<AiIntentResult["projectSortBy"]>,
  sortDirection: NonNullable<AiIntentResult["projectSortDirection"]>
): ProjectResponse[] {
  const direction = sortDirection === "DESC" ? -1 : 1;

  return [...projects].sort((first, second) => {
    let comparison = 0;

    if (sortBy === "CREATED_AT") {
      comparison = getProjectCreatedTime(first) - getProjectCreatedTime(second);
    } else if (sortBy === "PROJECT_NAME") {
      comparison = first.projectName.localeCompare(second.projectName);
    } else {
      comparison = first.projectCode.localeCompare(second.projectCode);
    }

    return comparison * direction;
  });
}

function buildProjectListIntro(
  count: number,
  statusFilter: AiIntentResult["projectStatusFilter"],
  sortBy: NonNullable<AiIntentResult["projectSortBy"]>,
  sortDirection: NonNullable<AiIntentResult["projectSortDirection"]>
): string {
  const statusLabel = statusFilter === "ALL"
    ? "company"
    : statusFilter === "INACTIVE"
      ? "inactive company"
      : "active company";

  return `I found ${count} ${statusLabel} project${count === 1 ? "" : "s"} in TRS, sorted ${describeProjectSort(sortBy, sortDirection)}.`;
}

function describeProjectSort(
  sortBy: NonNullable<AiIntentResult["projectSortBy"]>,
  sortDirection: NonNullable<AiIntentResult["projectSortDirection"]>
): string {
  if (sortBy === "CREATED_AT") {
    return sortDirection === "DESC" ? "newest first" : "oldest first";
  }

  if (sortBy === "PROJECT_NAME") {
    return sortDirection === "DESC" ? "by project name Z to A" : "by project name A to Z";
  }

  return sortDirection === "DESC" ? "by project code descending" : "by project code";
}

function getProjectCreatedTime(project: ProjectResponse): number {
  return project.createdAt ? new Date(project.createdAt).getTime() : 0;
}

function formatProjectDate(value?: string): string {
  if (!value) return "-";
  return value.slice(0, 10);
}
function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function findMatchingAdminUser(users: AdminUserResponse[], reference: string): AdminUserResponse | undefined {
  const normalizedReference = normalizeSearchText(reference);
  return users.find((user) => {
    const userText = normalizeSearchText(`${user.fullName} ${user.email}`);
    return userText.includes(normalizedReference) || normalizedReference.includes(userText);
  });
}

function findMatchingProject(projects: { id: number; projectCode: string; projectName: string }[], reference: string) {
  const normalizedReference = normalizeSearchText(reference);
  return projects.find((project) => {
    const projectText = normalizeSearchText(`${project.projectCode} ${project.projectName}`);
    return projectText.includes(normalizedReference) || normalizedReference.includes(projectText);
  });
}


async function handleViewAdminAssignments(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  const assignments = await getBotAdminUserProjects("DISCORD", message.author.id);

  if (assignments.length === 0) {
    await replyAndRemember(message, "No project assignments found in TRS.");
    return;
  }

  const projectFilter = parsedIntent.projectReference?.trim();
  const employeeFilter = parsedIntent.employeeReference?.trim();
  const normalizedProjectFilter = projectFilter ? normalizeSearchText(projectFilter) : undefined;
  const normalizedEmployeeFilter = employeeFilter ? normalizeSearchText(employeeFilter) : undefined;

  const filteredAssignments = assignments.filter((assignment) => {
    const projectText = normalizeSearchText(`${assignment.projectCode} ${assignment.projectName}`);
    const employeeText = normalizeSearchText(`${assignment.fullName} ${assignment.email}`);

    const matchesProject = normalizedProjectFilter
      ? projectText.includes(normalizedProjectFilter) || normalizedProjectFilter.includes(projectText)
      : true;
    const matchesEmployee = normalizedEmployeeFilter
      ? employeeText.includes(normalizedEmployeeFilter) || normalizedEmployeeFilter.includes(employeeText)
      : true;

    return matchesProject && matchesEmployee;
  });

  if (filteredAssignments.length === 0) {
    const availableProjects = Array.from(
      new Map(assignments.map((assignment) => [assignment.projectCode, assignment])).values()
    ).map((assignment) => `- ${assignment.projectCode} - ${assignment.projectName}`);
    const availableUsers = Array.from(
      new Map(assignments.map((assignment) => [assignment.email, assignment])).values()
    ).map((assignment) => `- ${assignment.fullName} (${assignment.email})`);

    await replyAndRemember(
      message,
      [
        "I could not find matching project assignments for that filter.",
        projectFilter ? `Project filter: ${projectFilter}` : undefined,
        employeeFilter ? `Employee filter: ${employeeFilter}` : undefined,
        "Available projects:",
        ...availableProjects,
        "Available users:",
        ...availableUsers
      ].filter(Boolean).join("\n")
    );
    return;
  }

  const lines = filteredAssignments.map((assignment) => {
    const user = assignment.fullName.length > 18
      ? `${assignment.fullName.slice(0, 15)}...`
      : assignment.fullName;
    const project = assignment.projectName.length > 28
      ? `${assignment.projectName.slice(0, 25)}...`
      : assignment.projectName;
    const projectStatus = assignment.projectActive ? "ACTIVE" : "INACTIVE";

    return `${user.padEnd(18)} | ${assignment.role.padEnd(8)} | ${assignment.projectCode.padEnd(8)} | ${projectStatus.padEnd(8)} | ${project}`;
  });

  const titleParts = [
    projectFilter ? `project "${projectFilter}"` : undefined,
    employeeFilter ? `employee "${employeeFilter}"` : undefined
  ].filter(Boolean);
  const title = titleParts.length > 0
    ? `Project assignments for ${titleParts.join(" and ")} (${filteredAssignments.length}):`
    : `Project assignments (${filteredAssignments.length}):`;

  await replyAndRemember(
    message,
    [
      title,
      "```text",
      "User               | Role     | Project  | Status   | Project Name",
      "-------------------|----------|----------|----------|-----------------------------",
      ...lines,
      "```"
    ].join("\n")
  );
}

async function handleCreateAdminProjectDraft(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  if (!parsedIntent.projectCode || !parsedIntent.projectName) {
    await replyAndRemember(
      message,
      "I can create a project, but I need both project code and project name. Example: create project PRJ-010 called Mobile Banking App."
    );
    return;
  }

  const projects = await getBotAdminProjects("DISCORD", message.author.id);
  const duplicateProject = projects.find((project) =>
    project.projectCode.toLowerCase() === parsedIntent.projectCode!.toLowerCase()
  );

  if (duplicateProject) {
    await replyAndRemember(
      message,
      `${duplicateProject.projectCode} already exists as ${duplicateProject.projectName}. No project was created.`
    );
    return;
  }

  savePendingAdminProjectCreate(message.author.id, {
    projectCode: parsedIntent.projectCode,
    projectName: parsedIntent.projectName
  });

  await replyAndRemember(
    message,
    [
      "I prepared this project creation. Please confirm before I save it:",
      `Project code: ${parsedIntent.projectCode}`,
      `Project name: ${parsedIntent.projectName}`,
      "Reply `yes` or `confirm` to create it, or `cancel` to discard."
    ].join("\n")
  );
}

async function handleCreateAdminUserDraft(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  if (!parsedIntent.fullName || !parsedIntent.email || !parsedIntent.password || !parsedIntent.role) {
    await replyAndRemember(
      message,
      "I can create a user, but I need full name, email, password, and role. Example: create employee Ram Sharma with email ram@example.com and password password123."
    );
    return;
  }

  const users = await getBotAdminUsers("DISCORD", message.author.id);
  const duplicateUser = users.find((user) => user.email.toLowerCase() === parsedIntent.email!.toLowerCase());

  if (duplicateUser) {
    await replyAndRemember(
      message,
      `${duplicateUser.email} already exists for ${duplicateUser.fullName}. No user was created.`
    );
    return;
  }

  savePendingAdminUserCreate(message.author.id, {
    fullName: parsedIntent.fullName,
    email: parsedIntent.email,
    password: parsedIntent.password,
    role: parsedIntent.role
  });

  await replyAndRemember(
    message,
    [
      "I prepared this user creation. Please confirm before I save it:",
      `Name: ${parsedIntent.fullName}`,
      `Email: ${parsedIntent.email}`,
      `Role: ${parsedIntent.role}`,
      "Password: received and will be BCrypt-hashed by backend.",
      "Discord identity mapping will not be created in this step.",
      "Reply `yes` or `confirm` to create the user, or `cancel` to discard."
    ].join("\n")
  );
}

async function handleAssignAdminUserProjectDraft(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  if (!parsedIntent.employeeReference || !parsedIntent.projectReference) {
    await replyAndRemember(
      message,
      "I can assign a user to a project, but I need both the employee/user and the project. Example: assign Bijaya Tiwari to PRJ-002."
    );
    return;
  }

  const [users, projects, assignments] = await Promise.all([
    getBotAdminUsers("DISCORD", message.author.id),
    getBotAdminProjects("DISCORD", message.author.id),
    getBotAdminUserProjects("DISCORD", message.author.id)
  ]);

  const user = findMatchingAdminUser(users, parsedIntent.employeeReference);
  if (!user) {
    await replyAndRemember(
      message,
      [
        `I could not find a TRS user matching "${parsedIntent.employeeReference}".`,
        "Available users:",
        ...users.map((candidate) => `- ${candidate.fullName} (${candidate.email}) - ${candidate.role}`)
      ].join("\n")
    );
    return;
  }

  const project = findMatchingProject(projects, parsedIntent.projectReference);
  if (!project) {
    await replyAndRemember(
      message,
      [
        `I could not find a TRS project matching "${parsedIntent.projectReference}".`,
        "Available projects:",
        ...projects.map((candidate) => `- ${candidate.projectCode} - ${candidate.projectName}`)
      ].join("\n")
    );
    return;
  }

  const alreadyAssigned = assignments.some((assignment) =>
    assignment.userId === user.id && assignment.projectId === project.id
  );

  if (alreadyAssigned) {
    await replyAndRemember(
      message,
      `${user.fullName} is already assigned to ${project.projectCode} - ${project.projectName}. No change needed.`
    );
    return;
  }

  savePendingAdminAssignment(message.author.id, {
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    projectId: project.id,
    projectCode: project.projectCode,
    projectName: project.projectName
  });

  await replyAndRemember(
    message,
    [
      "I prepared this admin assignment. Please confirm before I save it:",
      `User: ${user.fullName} (${user.email})`,
      `Project: ${project.projectCode} - ${project.projectName}`,
      "Reply `yes` or `confirm` to assign, or `cancel` to discard."
    ].join("\n")
  );
}

async function handleViewTeamUtilization(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  const dateRange = parsedIntent.dateRange ?? parseDateRange(message.content.trim());
  const report = await getBotUtilizationReport(
    "DISCORD",
    message.author.id,
    dateRange.startDate,
    dateRange.endDate
  );

  if (report.length === 0) {
    await replyAndRemember(message, `I did not find utilization data for ${dateRange.label}.`);
    return;
  }

// UPDATED: Format utilization report as a Discord-friendly code-block table.
const lines = report.map((row) => {
  const employeeName = row.fullName.length > 15
    ? `${row.fullName.slice(0, 12)}...`
    : row.fullName;

  const loggedHours = `${Number(row.totalHours)}h`;
  const expectedHours = `${Number(row.expectedHours)}h`;
  const utilization = `${Number(row.utilizationPercent)}%`;

  return [
    employeeName.padEnd(15),
    loggedHours.padEnd(6),
    expectedHours.padEnd(8),
    utilization.padEnd(11)
  ].join(" | ");
});

await replyAndRemember(
  message,
  [
    `Team utilization for ${dateRange.label}:`,
    "",
    "```text",
    "Employee        | Logged | Expected | Utilization",
    "----------------|--------|----------|------------",
    ...lines,
    "```"
  ].join("\n")
);

  
}
async function handleViewMissingEntries(message: BotMessage, parsedIntent: AiIntentResult): Promise<void> {
  const dateRange = parsedIntent.dateRange ?? parseDateRange(message.content.trim());

  const report = await getBotMissingEntriesReport(
    "DISCORD",
    message.author.id,
    dateRange.startDate,
    dateRange.endDate
  );
  const filteredReport = parsedIntent.employeeReference
    ? report.filter((row) =>
      row.fullName.toLowerCase().includes(parsedIntent.employeeReference!.toLowerCase())
    )
    : report;

  if (parsedIntent.employeeReference && filteredReport.length === 0) {
    await replyAndRemember(
      message,
      [
        `I could not find an employee matching "${parsedIntent.employeeReference}" in this report.`,
        "Available employees:",
        ...report.map((row) => `- ${row.fullName}`)
      ].join("\n")
    );
    return;
  }



  if (filteredReport.length === 0) {
    await replyAndRemember(
      message,
      [
        "No missing time entries found.",
        `Period: ${dateRange.startDate} to ${dateRange.endDate}`,
        `Range label: ${dateRange.label}`
      ].join("\n")
    );
    return;
  }

  const totalMissingDays = filteredReport.reduce((sum, row) => sum + row.missingDates.length, 0);
  const shouldShowSummaryOnly = !parsedIntent.employeeReference && (filteredReport.length > 1 || totalMissingDays > 30);

  if (shouldShowSummaryOnly) {
    const summaryLines = filteredReport.map((row) => {
      const employee = row.fullName.length > 18 ? `${row.fullName.slice(0, 15)}...` : row.fullName;
      const previewDates = row.missingDates.slice(0, 5).join(", ");
      const moreText = row.missingDates.length > 5 ? ` +${row.missingDates.length - 5} more` : "";

      return `${employee.padEnd(18)} | ${String(row.missingDates.length).padEnd(4)} | ${previewDates}${moreText}`;
    });

    await replyAndRemember(
      message,
      [
        `Missing time entries summary for ${dateRange.label}:`,
        "```text",
        "Employee           | Days | Preview",
        "-------------------|------|------------------------------------------------",
        ...summaryLines,
        "```",
        "For full dates, ask for one employee, for example: `missing entries for Bijaya Tiwari in May 2026`."
      ].join("\n")
    );
    return;
  }

  const tableLines = filteredReport.flatMap((row, index) => {
    const dateText = row.missingDates.join(", ");
    const wrappedDates = dateText.match(/.{1,48}(?:,\s|$)/g)?.map((part) => part.trim().replace(/,$/, "")) ?? [dateText];
    const employee = row.fullName.length > 18 ? `${row.fullName.slice(0, 15)}...` : row.fullName;

    return wrappedDates.map((dateLine, lineIndex) => {
      const nameColumn = lineIndex === 0 ? employee.padEnd(18) : "".padEnd(18);
      const countColumn = lineIndex === 0 ? String(row.missingDates.length).padEnd(4) : "".padEnd(4);
      const separator = index === 0 && lineIndex === 0 ? "" : "";
      return `${separator}${nameColumn} | ${countColumn} | ${dateLine}`;
    });
  });

  await replyAndRemember(
    message,
    [
      parsedIntent.employeeReference
        ? `Missing time entries for ${filteredReport[0].fullName} (${dateRange.label}):`
        : `Missing time entries for ${dateRange.label}:`,
      "```text",
      "Employee           | Days | Missing dates",
      "-------------------|------|------------------------------------------------",
      ...tableLines,
      "```"
    ].join("\n")
  );
}




export async function handlePendingAdminProjectCreateConfirmation(message: BotMessage): Promise<boolean> {
  const normalized = message.content.trim().toLowerCase();
  const pendingProject = getPendingAdminProjectCreate(message.author.id);

  if (!pendingProject) {
    return false;
  }

  if (["cancel", "no", "nope", "stop", "discard"].includes(normalized)) {
    clearPendingAdminProjectCreate(message.author.id);
    await replyAndRemember(message, "Okay, I cancelled that pending project creation.");
    return true;
  }

  if (!["yes", "y", "yeah", "yep", "correct", "confirm", "sure", "create"].includes(normalized)) {
    return false;
  }

  const created = await createBotAdminProject("DISCORD", message.author.id, pendingProject);
  clearPendingAdminProjectCreate(message.author.id);

  await replyAndRemember(
    message,
    [
      "Project created successfully.",
      `ID: ${created.id}`,
      `Code: ${created.projectCode}`,
      `Name: ${created.projectName}`,
      `Status: ${created.active ? "ACTIVE" : "INACTIVE"}`
    ].join("\n")
  );

  return true;
}

export async function handlePendingAdminUserCreateConfirmation(message: BotMessage): Promise<boolean> {
  const normalized = message.content.trim().toLowerCase();
  const pendingUser = getPendingAdminUserCreate(message.author.id);

  if (!pendingUser) {
    return false;
  }

  if (["cancel", "no", "nope", "stop", "discard"].includes(normalized)) {
    clearPendingAdminUserCreate(message.author.id);
    await replyAndRemember(message, "Okay, I cancelled that pending user creation.");
    return true;
  }

  if (!["yes", "y", "yeah", "yep", "correct", "confirm", "sure", "create"].includes(normalized)) {
    return false;
  }

  const created = await createBotAdminUser("DISCORD", message.author.id, pendingUser);
  clearPendingAdminUserCreate(message.author.id);

  await replyAndRemember(
    message,
    [
      "User created successfully.",
      `ID: ${created.id}`,
      `Name: ${created.fullName}`,
      `Email: ${created.email}`,
      `Role: ${created.role}`,
      `Status: ${created.active ? "ACTIVE" : "INACTIVE"}`,
      "Discord identity mapping was not created."
    ].join("\n")
  );

  return true;
}

export async function handlePendingAdminAssignmentConfirmation(message: BotMessage): Promise<boolean> {
  const normalized = message.content.trim().toLowerCase();
  const pendingAssignment = getPendingAdminAssignment(message.author.id);

  if (!pendingAssignment) {
    return false;
  }

  if (["cancel", "no", "nope", "stop", "discard"].includes(normalized)) {
    clearPendingAdminAssignment(message.author.id);
    await replyAndRemember(message, "Okay, I cancelled that pending project assignment.");
    return true;
  }

  if (!["yes", "y", "yeah", "yep", "correct", "confirm", "sure", "assign"].includes(normalized)) {
    return false;
  }

  await assignBotAdminUserToProject(
    "DISCORD",
    message.author.id,
    pendingAssignment.userId,
    pendingAssignment.projectId
  );

  clearPendingAdminAssignment(message.author.id);

  await replyAndRemember(
    message,
    [
      "Project assignment saved successfully.",
      `User: ${pendingAssignment.fullName} (${pendingAssignment.email})`,
      `Project: ${pendingAssignment.projectCode} - ${pendingAssignment.projectName}`
    ].join("\n")
  );

  return true;
}

export async function handlePendingAiActionConfirmation(message: BotMessage): Promise<boolean> {
  const normalized = message.content.trim().toLowerCase();
  const pendingAction = getPendingAiAction(message.author.id);

  if (!pendingAction) {
    return false;
  }

  if (["cancel", "no", "nope", "stop", "discard"].includes(normalized)) {
    clearPendingAiAction(message.author.id);
    await replyAndRemember(message, "Okay, I cancelled that pending request.");
    return true;
  }

  if (!["yes", "y", "yeah", "yep", "correct", "confirm", "sure", "yes dude"].includes(normalized)) {
    return false;
  }

  clearPendingAiAction(message.author.id);
  return executeAiAction(message, pendingAction);
}
export async function handlePendingTimeEntryConfirmation(message: BotMessage): Promise<boolean> {
  const normalized = message.content.trim().toLowerCase();
  const pendingTimeEntry = getPendingTimeEntry(message.author.id);

  if (!pendingTimeEntry) {
    return false;
  }

  if (["cancel", "no", "discard"].includes(normalized)) {
    clearPendingTimeEntry(message.author.id);
    await replyAndRemember(message, "Pending time entry cancelled.");
    return true;
  }

  if (!["yes", "y", "confirm", "save", "submit"].includes(normalized)) {
    return false;
  }

  let saved;

  if (pendingTimeEntry.action === "CANCEL" && pendingTimeEntry.timeEntryId) {
    saved = await cancelBotMyTimeEntry("DISCORD", message.author.id, pendingTimeEntry.timeEntryId);
  } else if (pendingTimeEntry.action === "UPDATE" && pendingTimeEntry.timeEntryId) {
    saved = await updateBotMyTimeEntry("DISCORD", message.author.id, pendingTimeEntry.timeEntryId, {
      projectId: pendingTimeEntry.projectId,
      entryDate: pendingTimeEntry.entryDate,
      hours: pendingTimeEntry.hours,
      notes: pendingTimeEntry.notes
    });
  } else {
    saved = await createBotMyTimeEntry("DISCORD", message.author.id, {
      projectId: pendingTimeEntry.projectId,
      entryDate: pendingTimeEntry.entryDate,
      hours: pendingTimeEntry.hours,
      notes: pendingTimeEntry.notes
    });
  }

  clearPendingTimeEntry(message.author.id);

  const successMessage = pendingTimeEntry.action === "CANCEL"
    ? "Time entry cancelled successfully."
    : pendingTimeEntry.action === "UPDATE"
      ? "Time entry updated successfully."
      : "Time entry saved successfully.";

  await replyAndRemember(
    message,
    [
      successMessage,
      `Project: ${saved.projectCode} - ${saved.projectName}`,
      `Date: ${saved.entryDate}`,
      `Hours: ${saved.hours}`,
      `Status: ${saved.status}`
    ].join("\n")
  );

  return true;
}

function isConnectedAction(intent: AiIntentName): intent is Exclude<AiIntentName, "UNKNOWN"> {
  return intent !== "UNKNOWN";
}

export async function executeAiAction(message: BotMessage, parsedIntent: AiIntentResult): Promise<boolean> {
  
  //from the parsedIntent now it will check if that Action is actually a ral action? If the intent is "UNKNOWN" then our bot doesnt know what we want and so it will fall through our generic chat handler back in main.ts but if the intent is the valid action then it will proceed futher 
  if (!isConnectedAction(parsedIntent.intent)) {
    return false;
  }


  //if our "needsClairification" is true then bot saves that half understood intent into the sessionStore.ts and next time after we reply to the clarificaiton question ..line 176 of main.ts will catch our answer and resume..
  if (parsedIntent.needsClarification && parsedIntent.clarificationQuestion) {
    savePendingAiAction(message.author.id, {
      ...parsedIntent,
      needsClarification: false,
      clarificationQuestion: undefined,
      confidence: Math.max(parsedIntent.confidence, 0.8)
    });
    await replyAndRemember(message, parsedIntent.clarificationQuestion);
    return true;
  }

  //now it will check is the AI confident enough
  if (parsedIntent.confidence < 0.7) {
    return false;
  }

  //check our role and discord connected ID in external_identity table
  const currentUser = await resolveExternalIdentity("DISCORD", message.author.id);

  //and for that role it checks if there is permission or not 
  if (!canExecuteAction(parsedIntent.intent, currentUser.role)) {
    await replyAndRemember(
      message,
      [
        `Your mapped TRS role is ${currentUser.role}.`,
        `That role cannot run ${parsedIntent.intent}.`,
        `Allowed roles: ${getAllowedRoles(parsedIntent.intent).join(", ") || "none"}.`
      ].join("\n")
    );
    return true;
  }

  switch (parsedIntent.intent) {
    case "VIEW_MY_PROFILE":
      await handleViewMyProfile(message, currentUser);
      return true;

    case "VIEW_MY_PROJECTS":
      await handleViewMyProjects(message, parsedIntent.projectReference);
      return true;

    case "VIEW_MY_TIME_ENTRIES":
      await handleViewMyTimeEntries(message, parsedIntent);
      return true;

    case "CREATE_TIME_ENTRY":
      await handleCreateTimeEntryDraft(message, parsedIntent);
      return true;

    case "UPDATE_TIME_ENTRY":
      await handleUpdateTimeEntryDraft(message, parsedIntent);
      return true;

    case "CANCEL_TIME_ENTRY":
      await handleCancelTimeEntryDraft(message, parsedIntent);
      return true;

    case "VIEW_TEAM_UTILIZATION":
      await handleViewTeamUtilization(message, parsedIntent);
      return true;

    case "VIEW_MISSING_ENTRIES":
      await handleViewMissingEntries(message, parsedIntent);
      return true;

    case "VIEW_ADMIN_USERS":
      await handleViewAdminUsers(message);
      return true;

    case "VIEW_ADMIN_PROJECTS":
      await handleViewAdminProjects(message, parsedIntent);
      return true;

    case "VIEW_ADMIN_ASSIGNMENTS":
      await handleViewAdminAssignments(message, parsedIntent);
      return true;

    case "ASSIGN_ADMIN_USER_PROJECT":
      await handleAssignAdminUserProjectDraft(message, parsedIntent);
      return true;

    case "CREATE_ADMIN_PROJECT":
      await handleCreateAdminProjectDraft(message, parsedIntent);
      return true;

    case "CREATE_ADMIN_USER":
      await handleCreateAdminUserDraft(message, parsedIntent);
      return true;

    default:
      return false;
  }
}








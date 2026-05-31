import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { identityLabel } from "../config.js";
import {
  createMyTimeEntryInTrs,
  findMyTimeEntryOnDate,
  getMyProjectsFromTrs,
  getMyTimeEntriesFromTrs,
  updateMyTimeEntryInTrs
} from "../trsApiClient.js";
import type { TimeEntryResponse } from "../types.js";
import { isValidIsoDate } from "../utils/dateUtils.js";
import { getAxiosErrorMessage } from "../utils/errorUtils.js";
import { findMatchingProject } from "../utils/matchers.js";

export function registerTimeEntryTools(server: McpServer): void {
  server.registerTool(
    "get_my_time_entries",
    {
      title: "Get My TRS Time Entries",
      description: "Returns the TRS time entries for the configured Claude Desktop identity within a date range. Use this when the user asks for logged time, timesheet entries, hours, or work logs for a day, week, month, or custom range.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format."),
        endDate: z.string().describe("End date in YYYY-MM-DD format.")
      }
    },
    async ({ startDate, endDate }) => {
      const entries = await getMyTimeEntriesFromTrs(startDate, endDate);
      if (entries.length === 0) return { content: [{ type: "text", text: `No TRS time entries found from ${startDate} to ${endDate} for ${identityLabel}.` }] };

      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
      const entryLines = entries.map((entry) => {
        const notes = entry.notes ? ` - ${entry.notes}` : "";
        return `- ID ${entry.id} | ${entry.entryDate}: ${entry.hours}h on ${entry.projectCode} - ${entry.projectName} [${entry.status}]${notes}`;
      });

      return { content: [{ type: "text", text: [`Configured identity: ${identityLabel}`, `TRS time entries from ${startDate} to ${endDate}:`, `Total hours: ${totalHours}`, ...entryLines].join("\n") }] };
    }
  );

  server.registerTool(
    "get_my_time_summary",
    {
      title: "Get My TRS Time Summary",
      description: "Summarizes the configured Claude Desktop identity's TRS time entries for a date range. Use this when the user asks total hours, project-wise hours, monthly summary, weekly summary, or where their time went.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format."),
        endDate: z.string().describe("End date in YYYY-MM-DD format.")
      }
    },
    async ({ startDate, endDate }) => {
      const entries = await getMyTimeEntriesFromTrs(startDate, endDate);
      const submittedEntries = entries.filter((entry) => entry.status !== "CANCELLED");
      const cancelledEntries = entries.filter((entry) => entry.status === "CANCELLED");
      const totalSubmittedHours = submittedEntries.reduce((sum, entry) => sum + entry.hours, 0);
      const projectLines = summarizeByProject(submittedEntries);

      return { content: [{ type: "text", text: [
        `Configured identity: ${identityLabel}`,
        `TRS time summary from ${startDate} to ${endDate}:`,
        `Submitted entries: ${submittedEntries.length}`,
        `Cancelled entries: ${cancelledEntries.length}`,
        `Total submitted hours: ${totalSubmittedHours}`,
        projectLines.length > 0 ? "Hours by project:" : "No submitted project hours found.",
        ...projectLines
      ].join("\n") }] };
    }
  );

  registerTimeEntryCreateTools(server);
  registerTimeEntryUpdateTools(server);
}

function registerTimeEntryCreateTools(server: McpServer): void {
  
  //his inputSchema variable is then passed directly into both the prepare_time_entry tool  and the create_time_entry tool
  
  const inputSchema = {
    projectReference: z.string().describe("Project code, project name, or partial project reference, such as PRJ-002 or Client Implementation."),
    entryDate: z.string().describe("Entry date in YYYY-MM-DD format."),
    hours: z.number().positive().max(24).describe("Hours worked, greater than 0 and at most 24."),
    notes: z.string().optional().describe("Optional work notes for the time entry.")
  };

  server.registerTool("prepare_time_entry", {
    title: "Prepare TRS Time Entry Draft",
    description: "Prepares and validates a TRS time-entry draft for the configured Claude Desktop identity without saving it. Use this before creating real time entries.",
    inputSchema
  }, async ({ projectReference, entryDate, hours, notes }) => {
    const validation = await validateTimeEntryInput(projectReference, entryDate);
    if (validation.isError) return validation;

    return { content: [{ type: "text", text: [
      "Draft time entry prepared. It has NOT been saved to TRS.",
      `Configured identity: ${identityLabel}`,
      `Project: ${validation.project.projectCode} - ${validation.project.projectName}`,
      `Date: ${entryDate}`,
      `Hours: ${hours}`,
      `Notes: ${notes?.trim() || "-"}`,
      "If this looks correct, the next future tool will be create_time_entry to save it."
    ].join("\n") }] };
  });

  server.registerTool("create_time_entry", {
    title: "Create TRS Time Entry",
    description: "Creates and saves a TRS time entry for the configured Claude Desktop identity after the user has reviewed a draft and explicitly confirmed saving. Before using this tool, prepare_time_entry should be used to validate and show the draft. This tool writes to the TRS database.",
    inputSchema
  }, async ({ projectReference, entryDate, hours, notes }) => {
    const validation = await validateTimeEntryInput(projectReference, entryDate, true);
    if (validation.isError) return validation;

    const createdEntry = await createMyTimeEntryInTrs({ projectId: validation.project.id, entryDate, hours, notes: notes?.trim() || undefined });
    return { content: [{ type: "text", text: formatTimeEntryResult("Time entry saved to TRS.", createdEntry) }] };
  });
}

function registerTimeEntryUpdateTools(server: McpServer): void {
  const inputSchema = {
    timeEntryId: z.number().int().positive().describe("Existing TRS time-entry ID to update."),
    projectReference: z.string().describe("Final project code, project name, or partial project reference for the updated entry."),
    entryDate: z.string().describe("Final entry date in YYYY-MM-DD format."),
    hours: z.number().positive().max(24).describe("Final hours worked, greater than 0 and at most 24."),
    notes: z.string().optional().describe("Final notes for the time entry.")
  };

  server.registerTool("prepare_time_entry_update", {
    title: "Prepare TRS Time Entry Update Draft",
    description: "Prepares and validates a draft update for an existing TRS time entry without saving it. Use get_my_time_entries first to identify the exact timeEntryId, then use this tool before update_time_entry.",
    inputSchema
  }, async ({ timeEntryId, projectReference, entryDate, hours, notes }) => {
    const validation = await validateTimeEntryUpdateInput(timeEntryId, projectReference, entryDate);
    if (validation.isError) return validation;

    return { content: [{ type: "text", text: [
      "Draft time-entry update prepared. It has NOT been saved to TRS.",
      `Configured identity: ${identityLabel}`,
      `Entry ID to update: ${timeEntryId}`,
      `Final project: ${validation.project.projectCode} - ${validation.project.projectName}`,
      `Final date: ${entryDate}`,
      `Final hours: ${hours}`,
      `Final notes: ${notes?.trim() || "-"}`,
      "If this looks correct, confirm before using update_time_entry to save it."
    ].join("\n") }] };
  });

  server.registerTool("update_time_entry", {
    title: "Update TRS Time Entry",
    description: "Updates and saves an existing TRS time entry for the configured Claude Desktop identity after the user has reviewed an update draft and explicitly confirmed saving. Use get_my_time_entries to identify the exact timeEntryId and prepare_time_entry_update before this tool. This tool writes to the TRS database.",
    inputSchema
  }, async ({ timeEntryId, projectReference, entryDate, hours, notes }) => {
    const validation = await validateTimeEntryUpdateInput(timeEntryId, projectReference, entryDate, true);
    if (validation.isError) return validation;

    try {
      const updatedEntry = await updateMyTimeEntryInTrs(timeEntryId, { projectId: validation.project.id, entryDate, hours, notes: notes?.trim() || undefined });
      return { content: [{ type: "text", text: formatTimeEntryResult("Time entry updated in TRS.", updatedEntry) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `TRS rejected the update, so I did not change anything. Backend message: ${getAxiosErrorMessage(error)}` }], isError: true };
    }
  });
}

async function validateTimeEntryInput(projectReference: string, entryDate: string, saving = false) {
  if (!isValidIsoDate(entryDate)) return errorResult(`Invalid entryDate: ${entryDate}. Please use a real date in YYYY-MM-DD format.`);
  const projects = await getMyProjectsFromTrs();
  const project = findMatchingProject(projects, projectReference);
  if (!project) return errorResult([`I could not match project reference "${projectReference}" to one of your assigned projects${saving ? ", so I did not save anything" : ""}.`, "Assigned projects:", ...projects.map((item) => `- ${item.projectCode} - ${item.projectName}`)].join("\n"));
  if (!project.active) return errorResult(`${project.projectCode} - ${project.projectName} is inactive, so ${saving ? "I did not save a time entry for it" : "a time entry should not be prepared for it"}.`);
  return { isError: false as const, project };
}

async function validateTimeEntryUpdateInput(timeEntryId: number, projectReference: string, entryDate: string, saving = false) {
  if (!isValidIsoDate(entryDate)) return errorResult(`Invalid entryDate: ${entryDate}. Please use a real date in YYYY-MM-DD format.`);
  const existingEntry = await findMyTimeEntryOnDate(timeEntryId, entryDate);
  if (!existingEntry) return errorResult(`I could not find time entry ID ${timeEntryId} on ${entryDate} for the configured identity. Please call get_my_time_entries first and use the exact entry ID.`);
  if (existingEntry.status === "CANCELLED") return errorResult(`Time entry ID ${timeEntryId} is CANCELLED, so it should not be updated.`);
  return validateTimeEntryInput(projectReference, entryDate, saving);
}

function summarizeByProject(entries: TimeEntryResponse[]): string[] {
  const hoursByProject = new Map<string, { projectCode: string; projectName: string; hours: number; count: number }>();
  for (const entry of entries) {
    const key = `${entry.projectCode}|${entry.projectName}`;
    const current = hoursByProject.get(key) ?? { projectCode: entry.projectCode, projectName: entry.projectName, hours: 0, count: 0 };
    current.hours += entry.hours;
    current.count += 1;
    hoursByProject.set(key, current);
  }
  return Array.from(hoursByProject.values()).sort((a, b) => b.hours - a.hours).map((project) => `- ${project.projectCode} - ${project.projectName}: ${project.hours}h across ${project.count} submitted entr${project.count === 1 ? "y" : "ies"}`);
}

function formatTimeEntryResult(title: string, entry: TimeEntryResponse): string {
  return [
    title,
    `Configured identity: ${identityLabel}`,
    `Entry ID: ${entry.id}`,
    `Project: ${entry.projectCode} - ${entry.projectName}`,
    `Date: ${entry.entryDate}`,
    `Hours: ${entry.hours}`,
    `Status: ${entry.status}`,
    `Notes: ${entry.notes || "-"}`
  ].join("\n");
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

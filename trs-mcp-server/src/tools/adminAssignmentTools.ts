import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { identityLabel } from "../config.js";
import {
  assignUserToProjectInTrs,
  getAdminProjectsFromTrs,
  getAdminUsersFromTrs,
  getProjectAssignmentsFromTrs
} from "../trsApiClient.js";
import { getAxiosErrorMessage } from "../utils/errorUtils.js";
import { findExistingAssignment, findMatchingProject, findMatchingUser } from "../utils/matchers.js";

const assignmentSchema = {
  userReference: z.string().describe("User name or email, such as Sita Thapa or sita@example.com."),
  projectReference: z.string().describe("Project code or project name, such as PRJ-020 or Smart Parking Analytics.")
};

export function registerAdminAssignmentTools(server: McpServer): void {
  server.registerTool(
    "get_project_assignments",
    {
      title: "Get TRS Project Assignments",
      description: "Admin-only tool that lists which users are assigned to which projects. Use this when an admin asks who is assigned to projects, who is assigned to a specific project, what projects a user has, or project assignment details.",
      inputSchema: {}
    },
    async () => {
      try {
        const assignments = await getProjectAssignmentsFromTrs();
        if (assignments.length === 0) return { content: [{ type: "text", text: "No TRS project assignments found." }] };
        const lines = assignments.map((assignment) => `- User ${assignment.userId} | ${assignment.fullName} | ${assignment.role} | Project ${assignment.projectId} | ${assignment.projectCode} - ${assignment.projectName} | ${assignment.projectActive ? "ACTIVE" : "INACTIVE"}`);
        return { content: [{ type: "text", text: [`Configured identity: ${identityLabel}`, `TRS project assignments (${assignments.length}):`, ...lines].join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Could not retrieve project assignments. Backend message: ${getAxiosErrorMessage(error)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "prepare_assign_user_to_project",
    {
      title: "Prepare Assign TRS User To Project Draft",
      description: "Admin-only tool that prepares and validates assigning a user to a project without saving it. Use this before assign_user_to_project when an admin asks to assign/add a user to a project.",
      inputSchema: assignmentSchema
    },
    async ({ userReference, projectReference }) => prepareAssignment(userReference, projectReference)
  );

  server.registerTool(
    "assign_user_to_project",
    {
      title: "Assign TRS User To Project",
      description: "Admin-only tool that assigns a user to a project after the user has reviewed a draft and explicitly confirmed saving. Use prepare_assign_user_to_project before this tool. This tool writes to the TRS database.",
      inputSchema: assignmentSchema
    },
    async ({ userReference, projectReference }) => {
      const validation = await validateAssignment(userReference, projectReference);
      if (validation.isError) return validation;

      try {
        const assignment = await assignUserToProjectInTrs({ userId: validation.user.id, projectId: validation.project.id });
        return { content: [{ type: "text", text: [
          "User assigned to project in TRS.",
          `Configured identity: ${identityLabel}`,
          `User: ID ${assignment.userId} | ${validation.user.fullName} | ${validation.user.email}`,
          `Project: ID ${assignment.projectId} | ${validation.project.projectCode} - ${validation.project.projectName}`,
          `Message: ${assignment.message}`
        ].join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `TRS rejected the assignment, so I did not create anything. Backend message: ${getAxiosErrorMessage(error)}` }], isError: true };
      }
    }
  );
}

async function prepareAssignment(userReference: string, projectReference: string) {
  const validation = await validateAssignment(userReference, projectReference);
  if (validation.isError) return validation;

  return { content: [{ type: "text" as const, text: [
    "Draft project assignment prepared. It has NOT been saved to TRS.",
    `Configured identity: ${identityLabel}`,
    `User: ID ${validation.user.id} | ${validation.user.fullName} | ${validation.user.email} | ${validation.user.role}`,
    `Project: ID ${validation.project.id} | ${validation.project.projectCode} - ${validation.project.projectName}`,
    "If this looks correct, confirm before using assign_user_to_project to save it."
  ].join("\n") }] };
}

async function validateAssignment(userReference: string, projectReference: string) {
  const users = await getAdminUsersFromTrs();
  const projects = await getAdminProjectsFromTrs();
  const assignments = await getProjectAssignmentsFromTrs();
  const user = findMatchingUser(users, userReference);
  const project = findMatchingProject(projects, projectReference);

  if (!user) return errorResult([`I could not match user reference "${userReference}" to a TRS user.`, "Available users:", ...users.map((item) => `- ID ${item.id} | ${item.fullName} | ${item.email} | ${item.role}`)].join("\n"));
  if (!project) return errorResult([`I could not match project reference "${projectReference}" to a TRS project.`, "Available projects:", ...projects.map((item) => `- ID ${item.id} | ${item.projectCode} - ${item.projectName}`)].join("\n"));
  if (!user.active) return errorResult(`${user.fullName} is inactive, so they should not be assigned to a project.`);
  if (!project.active) return errorResult(`${project.projectCode} - ${project.projectName} is inactive, so users should not be assigned to it.`);
  if (findExistingAssignment(assignments, user.id, project.id)) return errorResult(`${user.fullName} is already assigned to ${project.projectCode} - ${project.projectName}. No assignment is needed.`);

  return { isError: false as const, user, project };
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

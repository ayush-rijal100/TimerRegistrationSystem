import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { identityLabel } from "../config.js";
import { createProjectInTrs, getAdminProjectsFromTrs, getMyProjectsFromTrs } from "../trsApiClient.js";
import type { ProjectResponse } from "../types.js";
import { getAxiosErrorMessage } from "../utils/errorUtils.js";

export function registerProjectTools(server: McpServer): void {
  server.registerTool(
    "get_my_projects",
    {
      title: "Get My TRS Projects",
      description: "Returns the TRS projects assigned to the default Claude Desktop identity.",
      inputSchema: {}
    },
    async () => {
      const projects = await getMyProjectsFromTrs();
      if (projects.length === 0) return { content: [{ type: "text", text: "No assigned TRS projects found for the configured Claude Desktop identity." }] };

      const projectLines = projects.map((project) => `- ${project.projectCode} - ${project.projectName} (${project.active ? "ACTIVE" : "INACTIVE"})`);
      return { content: [{ type: "text", text: [`Configured identity: ${identityLabel}`, "Assigned TRS projects:", ...projectLines].join("\n") }] };
    }
  );

  server.registerTool(
    "get_admin_projects",
    {
      title: "Get Admin TRS Projects",
      description: "Admin-only tool that lists all TRS projects with ID, code, name, and active status. Use this when an admin asks to show/list projects, project codes, company projects, or all projects in TRS.",
      inputSchema: {}
    },
    async () => {
      try {
        const projects = await getAdminProjectsFromTrs();
        if (projects.length === 0) return { content: [{ type: "text", text: "No TRS projects found." }] };

        const lines = projects.map((project) => `- ID ${project.id} | ${project.projectCode} | ${project.projectName} | ${project.active ? "ACTIVE" : "INACTIVE"}`);
        return { content: [{ type: "text", text: [`Configured identity: ${identityLabel}`, `TRS projects (${projects.length}):`, ...lines].join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Could not retrieve admin projects. Backend message: ${getAxiosErrorMessage(error)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "prepare_create_project",
    {
      title: "Prepare Create TRS Project Draft",
      description: "Admin-only tool that prepares and validates a new TRS project draft without saving it. Use this before create_project when an admin asks to create/add/register a new project.",
      inputSchema: {
        projectCode: z.string().min(1).max(30).regex(/^[A-Za-z0-9\-_.]+$/).describe("Unique project code, max 30 chars. Letters, numbers, dash, underscore, and dot only."),
        projectName: z.string().min(2).max(120).describe("Project name, 2 to 120 characters.")
      }
    },
    async ({ projectCode, projectName }) => {
      const normalizedProjectCode = projectCode.trim();
      const normalizedProjectName = projectName.trim();
      const duplicate = await findDuplicateProject(normalizedProjectCode);
      if (duplicate) return duplicateProjectResponse(normalizedProjectCode, duplicate, "No draft should be saved.");

      return { content: [{ type: "text", text: [
        "Draft project prepared. It has NOT been saved to TRS.",
        `Configured identity: ${identityLabel}`,
        `Project code: ${normalizedProjectCode}`,
        `Project name: ${normalizedProjectName}`,
        "Status after save: ACTIVE",
        "If this looks correct, confirm before using create_project to save it."
      ].join("\n") }] };
    }
  );

  server.registerTool(
    "create_project",
    {
      title: "Create TRS Project",
      description: "Admin-only tool that creates and saves a new TRS project after the user has reviewed a draft and explicitly confirmed saving. Use prepare_create_project before this tool. This tool writes to the TRS database.",
      inputSchema: {
        projectCode: z.string().min(1).max(30).regex(/^[A-Za-z0-9\-_.]+$/).describe("Unique project code, max 30 chars. Letters, numbers, dash, underscore, and dot only."),
        projectName: z.string().min(2).max(120).describe("Project name, 2 to 120 characters.")
      }
    },
    async ({ projectCode, projectName }) => {
      const normalizedProjectCode = projectCode.trim();
      const normalizedProjectName = projectName.trim();
      const duplicate = await findDuplicateProject(normalizedProjectCode);
      if (duplicate) return duplicateProjectResponse(normalizedProjectCode, duplicate, "I did not create a duplicate project.");

      try {
        const createdProject = await createProjectInTrs({ projectCode: normalizedProjectCode, projectName: normalizedProjectName });
        return { content: [{ type: "text", text: [
          "Project created in TRS.",
          `Configured identity: ${identityLabel}`,
          `Project ID: ${createdProject.id}`,
          `Project code: ${createdProject.projectCode}`,
          `Project name: ${createdProject.projectName}`,
          `Status: ${createdProject.active ? "ACTIVE" : "INACTIVE"}`
        ].join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `TRS rejected the project creation, so I did not create anything. Backend message: ${getAxiosErrorMessage(error)}` }], isError: true };
      }
    }
  );
}

async function findDuplicateProject(projectCode: string): Promise<ProjectResponse | undefined> {
  const existingProjects = await getAdminProjectsFromTrs();
  return existingProjects.find((project) => project.projectCode.toLowerCase() === projectCode.toLowerCase());
}

function duplicateProjectResponse(projectCode: string, duplicate: ProjectResponse, suffix: string) {
  return {
    content: [{ type: "text" as const, text: `Project code ${projectCode} already exists as ${duplicate.projectCode} - ${duplicate.projectName}. ${suffix}` }],
    isError: true
  };
}

import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const envPath = path.resolve(currentDir, "..", ".env");

dotenv.config({ path: envPath, quiet: true });

const trsApiBaseUrl = process.env.TRS_API_BASE_URL;
const trsBotServiceToken = process.env.TRS_BOT_SERVICE_TOKEN;
const trsDefaultProvider = process.env.TRS_DEFAULT_PROVIDER;
const trsDefaultProviderUserId = process.env.TRS_DEFAULT_PROVIDER_USER_ID;

if (!trsApiBaseUrl) {
  throw new Error("TRS_API_BASE_URL is missing in .env");
}

if (!trsBotServiceToken) {
  throw new Error("TRS_BOT_SERVICE_TOKEN is missing in .env");
}

if (!trsDefaultProvider) {
  throw new Error("TRS_DEFAULT_PROVIDER is missing in .env");
}

if (!trsDefaultProviderUserId) {
  throw new Error("TRS_DEFAULT_PROVIDER_USER_ID is missing in .env");
}


type ProjectResponse = {
  id: number;
  projectCode: string;
  projectName: string;
  active: boolean;
};
type TimeEntryResponse = {
  id: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  entryDate: string;
  hours: number;
  notes: string | null;
  status: string;
};

type CreateTimeEntryRequest = {
  projectId: number;
  entryDate: string;
  hours: number;
  notes?: string;
};
type CreateProjectRequest = {
  projectCode: string;
  projectName: string;
};
type CreateUserRequest = {
  fullName: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
};
type AssignUserProjectRequest = {
  userId: number;
  projectId: number;
};

type AssignUserProjectResponse = {
  userId: number;
  projectId: number;
  message: string;
};
type CurrentUserResponse = {
  userId: number;
  fullName: string;
  email: string;
  role: string;
};

type UserResponse = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
};
type UserProjectAssignmentResponse = {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  projectActive: boolean;
};

async function getMyProjectsFromTrs(): Promise<ProjectResponse[]> {
  const response = await axios.get<ProjectResponse[]>(`${trsApiBaseUrl}/api/bot/projects/my`, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function getMyTimeEntriesFromTrs(startDate: string, endDate: string): Promise<TimeEntryResponse[]> {
  const response = await axios.get<TimeEntryResponse[]>(`${trsApiBaseUrl}/api/bot/time-entries/my`, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId,
      startDate,
      endDate
    }
  });

  return response.data;
}

async function createMyTimeEntryInTrs(request: CreateTimeEntryRequest): Promise<TimeEntryResponse> {
  const response = await axios.post<TimeEntryResponse>(`${trsApiBaseUrl}/api/bot/time-entries/my`, request, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function updateMyTimeEntryInTrs(timeEntryId: number, request: CreateTimeEntryRequest): Promise<TimeEntryResponse> {
  const response = await axios.put<TimeEntryResponse>(`${trsApiBaseUrl}/api/bot/time-entries/my/${timeEntryId}`, request, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function getCurrentUserFromTrs(): Promise<CurrentUserResponse> {
  const response = await axios.get<CurrentUserResponse>(`${trsApiBaseUrl}/api/bot/identity/resolve`, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}

async function getAdminUsersFromTrs(): Promise<UserResponse[]> {
  const response = await axios.get<UserResponse[]>(`${trsApiBaseUrl}/api/bot/admin/users`, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function getAdminProjectsFromTrs(): Promise<ProjectResponse[]> {
  const response = await axios.get<ProjectResponse[]>(`${trsApiBaseUrl}/api/bot/admin/projects`, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function getProjectAssignmentsFromTrs(): Promise<UserProjectAssignmentResponse[]> {
  const response = await axios.get<UserProjectAssignmentResponse[]>(`${trsApiBaseUrl}/api/bot/admin/user-projects`, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function createProjectInTrs(request: CreateProjectRequest): Promise<ProjectResponse> {
  const response = await axios.post<ProjectResponse>(`${trsApiBaseUrl}/api/bot/admin/projects`, request, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function createUserInTrs(request: CreateUserRequest): Promise<UserResponse> {
  const response = await axios.post<UserResponse>(`${trsApiBaseUrl}/api/bot/admin/users`, request, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}
async function assignUserToProjectInTrs(request: AssignUserProjectRequest): Promise<AssignUserProjectResponse> {
  const response = await axios.post<AssignUserProjectResponse>(`${trsApiBaseUrl}/api/bot/admin/user-projects`, request, {
    headers: {
      "X-Bot-Service-Token": trsBotServiceToken
    },
    params: {
      provider: trsDefaultProvider,
      providerUserId: trsDefaultProviderUserId
    }
  });

  return response.data;
}

function isValidIsoDate(value: string): boolean {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function findMatchingProject(projects: ProjectResponse[], projectReference: string): ProjectResponse | undefined {
  const normalizedReference = normalizeSearchText(projectReference);
  return projects.find((project) => {
    const projectText = normalizeSearchText(`${project.projectCode} ${project.projectName}`);
    return projectText.includes(normalizedReference) || normalizedReference.includes(projectText);
  });
}
function findMatchingUser(users: UserResponse[], userReference: string): UserResponse | undefined {
  const normalizedReference = normalizeSearchText(userReference);
  return users.find((user) => {
    const userText = normalizeSearchText(`${user.fullName} ${user.email}`);
    return userText.includes(normalizedReference) || normalizedReference.includes(userText);
  });
}

function findExistingAssignment(
  assignments: UserProjectAssignmentResponse[],
  userId: number,
  projectId: number
): UserProjectAssignmentResponse | undefined {
  return assignments.find((assignment) => assignment.userId === userId && assignment.projectId === projectId);
}

function getAxiosErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || error.message;
  }

  return error instanceof Error ? error.message : "Unknown error";
}

async function findMyTimeEntryOnDate(timeEntryId: number, entryDate: string): Promise<TimeEntryResponse | undefined> {
  const entries = await getMyTimeEntriesFromTrs(entryDate, entryDate);
  return entries.find((entry) => entry.id === timeEntryId);
}
const server = new McpServer({
  name: "trs-mcp-server",
  version: "0.1.0"
});

server.registerTool(
  "trs_health",
  {
    title: "TRS MCP Health",
    description: "Checks whether the TRS MCP server is alive.",
    inputSchema: {}
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "TRS MCP server is alive."
        }
      ]
    };
  }
);

server.registerTool(
  "echo_message",
  {
    title: "Echo Message",
    description: "Echoes back a message for testing MCP input handling.",
    inputSchema: {
      message: z.string().describe("Message to echo back")
    }
  },
  async ({ message }) => {
    return {
      content: [
        {
          type: "text",
          text: `You said: ${message}`
        }
      ]
    };
  }
);


server.registerTool(
  "get_current_user",
  {
    title: "Get Current TRS User",
    description: "Resolves the configured Claude Desktop MCP identity to the current TRS user and role. Use this when the user asks who am I, what is my role, my profile, my account, or which TRS account Claude is using, especially when the conversation is about TRS.",
    inputSchema: {}
  },
  async () => {
    try {
      const user = await getCurrentUserFromTrs();

      return {
        content: [
          {
            type: "text",
            text: [
              `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
              `TRS user: ${user.fullName}`,
              `Email: ${user.email}`,
              `Role: ${user.role}`,
              `User ID: ${user.userId}`
            ].join("\n")
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Could not resolve the configured TRS identity. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

server.registerTool(
  "get_admin_users",
  {
    title: "Get Admin TRS Users",
    description: "Admin-only tool that lists all TRS users with ID, name, email, role, and active status. Use this when an admin asks to show/list users, employees, staff, or accounts in TRS.",
    inputSchema: {}
  },
  async () => {
    try {
      const users = await getAdminUsersFromTrs();

      if (users.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No TRS users found."
            }
          ]
        };
      }

      const lines = users.map((user) => {
        const status = user.active ? "ACTIVE" : "INACTIVE";
        return `- ID ${user.id} | ${user.fullName} | ${user.email} | ${user.role} | ${status}`;
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
              `TRS users (${users.length}):`,
              ...lines
            ].join("\n")
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Could not retrieve admin users. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
    }
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

      if (projects.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No TRS projects found."
            }
          ]
        };
      }

      const lines = projects.map((project) => {
        const status = project.active ? "ACTIVE" : "INACTIVE";
        return `- ID ${project.id} | ${project.projectCode} | ${project.projectName} | ${status}`;
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
              `TRS projects (${projects.length}):`,
              ...lines
            ].join("\n")
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Could not retrieve admin projects. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
    }
  }
);
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

      if (assignments.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No TRS project assignments found."
            }
          ]
        };
      }

      const lines = assignments.map((assignment) => {
        const status = assignment.projectActive ? "ACTIVE" : "INACTIVE";
        return `- User ${assignment.userId} | ${assignment.fullName} | ${assignment.role} | Project ${assignment.projectId} | ${assignment.projectCode} - ${assignment.projectName} | ${status}`;
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
              `TRS project assignments (${assignments.length}):`,
              ...lines
            ].join("\n")
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Could not retrieve project assignments. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
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

    const existingProjects = await getAdminProjectsFromTrs();
    const duplicate = existingProjects.find(
      (project) => project.projectCode.toLowerCase() === normalizedProjectCode.toLowerCase()
    );

    if (duplicate) {
      return {
        content: [
          {
            type: "text",
            text: `Project code ${normalizedProjectCode} already exists as ${duplicate.projectCode} - ${duplicate.projectName}. No draft should be saved.`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "Draft project prepared. It has NOT been saved to TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `Project code: ${normalizedProjectCode}`,
            `Project name: ${normalizedProjectName}`,
            "Status after save: ACTIVE",
            "If this looks correct, confirm before using create_project to save it."
          ].join("\n")
        }
      ]
    };
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

    const existingProjects = await getAdminProjectsFromTrs();
    const duplicate = existingProjects.find(
      (project) => project.projectCode.toLowerCase() === normalizedProjectCode.toLowerCase()
    );

    if (duplicate) {
      return {
        content: [
          {
            type: "text",
            text: `Project code ${normalizedProjectCode} already exists as ${duplicate.projectCode} - ${duplicate.projectName}. I did not create a duplicate project.`
          }
        ],
        isError: true
      };
    }

    let createdProject: ProjectResponse;

    try {
      createdProject = await createProjectInTrs({
        projectCode: normalizedProjectCode,
        projectName: normalizedProjectName
      });
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `TRS rejected the project creation, so I did not create anything. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "Project created in TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `Project ID: ${createdProject.id}`,
            `Project code: ${createdProject.projectCode}`,
            `Project name: ${createdProject.projectName}`,
            `Status: ${createdProject.active ? "ACTIVE" : "INACTIVE"}`
          ].join("\n")
        }
      ]
    };
  }
);
server.registerTool(
  "prepare_create_user",
  {
    title: "Prepare Create TRS User Draft",
    description: "Admin-only tool that prepares and validates a new TRS user draft without saving it. Use this before create_user when an admin asks to create/add/register a new user, employee, manager, or admin account.",
    inputSchema: {
      fullName: z.string().min(2).max(100).describe("Full name, 2 to 100 characters."),
      email: z.string().email().max(255).describe("Unique email address for the user."),
      password: z.string().min(8).max(72).describe("Initial password, 8 to 72 characters. Never show this password back to the user."),
      role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).describe("TRS role for the user.")
    }
  },
  async ({ fullName, email, password, role }) => {
    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUsers = await getAdminUsersFromTrs();
    const duplicate = existingUsers.find((user) => user.email.toLowerCase() === normalizedEmail);

    if (duplicate) {
      return {
        content: [
          {
            type: "text",
            text: `Email ${normalizedEmail} already exists for ${duplicate.fullName}. No draft should be saved.`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "Draft user prepared. It has NOT been saved to TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `Full name: ${normalizedFullName}`,
            `Email: ${normalizedEmail}`,
            `Role: ${role}`,
            `Password: hidden (${password.length} characters received)`,
            "Status after save: ACTIVE",
            "If this looks correct, confirm before using create_user to save it."
          ].join("\n")
        }
      ]
    };
  }
);

server.registerTool(
  "create_user",
  {
    title: "Create TRS User",
    description: "Admin-only tool that creates and saves a new TRS user after the user has reviewed a draft and explicitly confirmed saving. Use prepare_create_user before this tool. This tool writes to the TRS database and must never print the password back.",
    inputSchema: {
      fullName: z.string().min(2).max(100).describe("Full name, 2 to 100 characters."),
      email: z.string().email().max(255).describe("Unique email address for the user."),
      password: z.string().min(8).max(72).describe("Initial password, 8 to 72 characters. Never show this password back to the user."),
      role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).describe("TRS role for the user.")
    }
  },
  async ({ fullName, email, password, role }) => {
    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUsers = await getAdminUsersFromTrs();
    const duplicate = existingUsers.find((user) => user.email.toLowerCase() === normalizedEmail);

    if (duplicate) {
      return {
        content: [
          {
            type: "text",
            text: `Email ${normalizedEmail} already exists for ${duplicate.fullName}. I did not create a duplicate user.`
          }
        ],
        isError: true
      };
    }

    let createdUser: UserResponse;

    try {
      createdUser = await createUserInTrs({
        fullName: normalizedFullName,
        email: normalizedEmail,
        password,
        role
      });
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `TRS rejected the user creation, so I did not create anything. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "User created in TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `User ID: ${createdUser.id}`,
            `Full name: ${createdUser.fullName}`,
            `Email: ${createdUser.email}`,
            `Role: ${createdUser.role}`,
            `Status: ${createdUser.active ? "ACTIVE" : "INACTIVE"}`,
            "Password: hidden"
          ].join("\n")
        }
      ]
    };
  }
);
server.registerTool(
  "prepare_assign_user_to_project",
  {
    title: "Prepare Assign TRS User To Project Draft",
    description: "Admin-only tool that prepares and validates assigning a user to a project without saving it. Use this before assign_user_to_project when an admin asks to assign/add a user to a project.",
    inputSchema: {
      userReference: z.string().describe("User name or email, such as Sita Thapa or sita@example.com."),
      projectReference: z.string().describe("Project code or project name, such as PRJ-020 or Smart Parking Analytics.")
    }
  },
  async ({ userReference, projectReference }) => {
    const users = await getAdminUsersFromTrs();
    const projects = await getAdminProjectsFromTrs();
    const assignments = await getProjectAssignmentsFromTrs();

    const matchedUser = findMatchingUser(users, userReference);
    const matchedProject = findMatchingProject(projects, projectReference);

    if (!matchedUser) {
      return {
        content: [
          {
            type: "text",
            text: [
              `I could not match user reference "${userReference}" to a TRS user.`,
              "Available users:",
              ...users.map((user) => `- ID ${user.id} | ${user.fullName} | ${user.email} | ${user.role}`)
            ].join("\n")
          }
        ],
        isError: true
      };
    }

    if (!matchedProject) {
      return {
        content: [
          {
            type: "text",
            text: [
              `I could not match project reference "${projectReference}" to a TRS project.`,
              "Available projects:",
              ...projects.map((project) => `- ID ${project.id} | ${project.projectCode} - ${project.projectName}`)
            ].join("\n")
          }
        ],
        isError: true
      };
    }

    if (!matchedUser.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedUser.fullName} is inactive, so they should not be assigned to a project.`
          }
        ],
        isError: true
      };
    }

    if (!matchedProject.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedProject.projectCode} - ${matchedProject.projectName} is inactive, so users should not be assigned to it.`
          }
        ],
        isError: true
      };
    }

    const existingAssignment = findExistingAssignment(assignments, matchedUser.id, matchedProject.id);

    if (existingAssignment) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedUser.fullName} is already assigned to ${matchedProject.projectCode} - ${matchedProject.projectName}. No assignment is needed.`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "Draft project assignment prepared. It has NOT been saved to TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `User: ID ${matchedUser.id} | ${matchedUser.fullName} | ${matchedUser.email} | ${matchedUser.role}`,
            `Project: ID ${matchedProject.id} | ${matchedProject.projectCode} - ${matchedProject.projectName}`,
            "If this looks correct, confirm before using assign_user_to_project to save it."
          ].join("\n")
        }
      ]
    };
  }
);

server.registerTool(
  "assign_user_to_project",
  {
    title: "Assign TRS User To Project",
    description: "Admin-only tool that assigns a user to a project after the user has reviewed a draft and explicitly confirmed saving. Use prepare_assign_user_to_project before this tool. This tool writes to the TRS database.",
    inputSchema: {
      userReference: z.string().describe("User name or email, such as Sita Thapa or sita@example.com."),
      projectReference: z.string().describe("Project code or project name, such as PRJ-020 or Smart Parking Analytics.")
    }
  },
  async ({ userReference, projectReference }) => {
    const users = await getAdminUsersFromTrs();
    const projects = await getAdminProjectsFromTrs();
    const assignments = await getProjectAssignmentsFromTrs();

    const matchedUser = findMatchingUser(users, userReference);
    const matchedProject = findMatchingProject(projects, projectReference);

    if (!matchedUser) {
      return {
        content: [
          {
            type: "text",
            text: `I could not match user reference "${userReference}" to a TRS user, so I did not create an assignment.`
          }
        ],
        isError: true
      };
    }

    if (!matchedProject) {
      return {
        content: [
          {
            type: "text",
            text: `I could not match project reference "${projectReference}" to a TRS project, so I did not create an assignment.`
          }
        ],
        isError: true
      };
    }

    if (!matchedUser.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedUser.fullName} is inactive, so I did not assign them to a project.`
          }
        ],
        isError: true
      };
    }

    if (!matchedProject.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedProject.projectCode} - ${matchedProject.projectName} is inactive, so I did not assign a user to it.`
          }
        ],
        isError: true
      };
    }

    const existingAssignment = findExistingAssignment(assignments, matchedUser.id, matchedProject.id);

    if (existingAssignment) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedUser.fullName} is already assigned to ${matchedProject.projectCode} - ${matchedProject.projectName}. I did not create a duplicate assignment.`
          }
        ],
        isError: true
      };
    }

    let assignment: AssignUserProjectResponse;

    try {
      assignment = await assignUserToProjectInTrs({
        userId: matchedUser.id,
        projectId: matchedProject.id
      });
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `TRS rejected the assignment, so I did not create anything. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "User assigned to project in TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `User: ID ${assignment.userId} | ${matchedUser.fullName} | ${matchedUser.email}`,
            `Project: ID ${assignment.projectId} | ${matchedProject.projectCode} - ${matchedProject.projectName}`,
            `Message: ${assignment.message}`
          ].join("\n")
        }
      ]
    };
  }
);
server.registerTool(
  "get_my_projects",
  {
    title: "Get My TRS Projects",
    description: "Returns the TRS projects assigned to the default Claude Desktop identity.",
    inputSchema: {}
  },
  async () => {

    const projects = await getMyProjectsFromTrs();

    if (projects.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No assigned TRS projects found for the configured Claude Desktop identity."
          }
        ]
      };
    }

    const projectLines = projects.map((project) => {
      const status = project.active ? "ACTIVE" : "INACTIVE";
      return `- ${project.projectCode} - ${project.projectName} (${status})`;
    });

    return {
      content: [
        {
          type: "text",
          text: [
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            "Assigned TRS projects:",
            ...projectLines
          ].join("\n")
        }
      ]
    };
  }
);

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

    if (entries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No TRS time entries found from ${startDate} to ${endDate} for ${trsDefaultProvider} / ${trsDefaultProviderUserId}.`
          }
        ]
      };
    }

    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const entryLines = entries.map((entry) => {
      const notes = entry.notes ? ` — ${entry.notes}` : "";
      return `- ID ${entry.id} | ${entry.entryDate}: ${entry.hours}h on ${entry.projectCode} - ${entry.projectName} [${entry.status}]${notes}`;
    });

    return {
      content: [
        {
          type: "text",
          text: [
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `TRS time entries from ${startDate} to ${endDate}:`,
            `Total hours: ${totalHours}`,
            ...entryLines
          ].join("\n")
        }
      ]
    };
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

    const hoursByProject = new Map<string, { projectCode: string; projectName: string; hours: number; count: number }>();

    for (const entry of submittedEntries) {
      const key = `${entry.projectCode}|${entry.projectName}`;
      const current = hoursByProject.get(key) ?? {
        projectCode: entry.projectCode,
        projectName: entry.projectName,
        hours: 0,
        count: 0
      };

      current.hours += entry.hours;
      current.count += 1;
      hoursByProject.set(key, current);
    }

    const projectLines = Array.from(hoursByProject.values())
      .sort((a, b) => b.hours - a.hours)
      .map((project) => `- ${project.projectCode} - ${project.projectName}: ${project.hours}h across ${project.count} submitted entr${project.count === 1 ? "y" : "ies"}`);

    return {
      content: [
        {
          type: "text",
          text: [
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `TRS time summary from ${startDate} to ${endDate}:`,
            `Submitted entries: ${submittedEntries.length}`,
            `Cancelled entries: ${cancelledEntries.length}`,
            `Total submitted hours: ${totalSubmittedHours}`,
            projectLines.length > 0 ? "Hours by project:" : "No submitted project hours found.",
            ...projectLines
          ].join("\n")
        }
      ]
    };
  }
);
server.registerTool(
  "prepare_time_entry",
  {
    title: "Prepare TRS Time Entry Draft",
    description: "Prepares and validates a TRS time-entry draft for the configured Claude Desktop identity without saving it. Use this before creating real time entries.",
    inputSchema: {
      projectReference: z.string().describe("Project code, project name, or partial project reference, such as PRJ-002 or Client Implementation."),
      entryDate: z.string().describe("Entry date in YYYY-MM-DD format."),
      hours: z.number().positive().max(24).describe("Hours worked, greater than 0 and at most 24."),
      notes: z.string().optional().describe("Optional work notes for the time entry.")
    }
  },
  async ({ projectReference, entryDate, hours, notes }) => {
    if (!isValidIsoDate(entryDate)) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid entryDate: ${entryDate}. Please use a real date in YYYY-MM-DD format.`
          }
        ],
        isError: true
      };
    }



    const projects = await getMyProjectsFromTrs();
    const matchedProject = findMatchingProject(projects, projectReference);

    if (!matchedProject) {
      return {
        content: [
          {
            type: "text",
            text: [
              `I could not match project reference "${projectReference}" to one of your assigned projects.`,
              "Assigned projects:",
              ...projects.map((project) => `- ${project.projectCode} - ${project.projectName}`)
            ].join("\n")
          }
        ],
        isError: true
      };
    }

    if (!matchedProject.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedProject.projectCode} - ${matchedProject.projectName} is inactive, so a time entry should not be prepared for it.`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "Draft time entry prepared. It has NOT been saved to TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `Project: ${matchedProject.projectCode} - ${matchedProject.projectName}`,
            `Date: ${entryDate}`,
            `Hours: ${hours}`,
            `Notes: ${notes?.trim() || "-"}`,
            "If this looks correct, the next future tool will be create_time_entry to save it."
          ].join("\n")
        }
      ]
    };
  }
);
server.registerTool(
  "create_time_entry",
  {
    title: "Create TRS Time Entry",
    description: "Creates and saves a TRS time entry for the configured Claude Desktop identity after the user has reviewed a draft and explicitly confirmed saving. Before using this tool, prepare_time_entry should be used to validate and show the draft. This tool writes to the TRS database.",
    inputSchema: {
      projectReference: z.string().describe("Project code, project name, or partial project reference, such as PRJ-002 or Client Implementation."),
      entryDate: z.string().describe("Entry date in YYYY-MM-DD format."),
      hours: z.number().positive().max(24).describe("Hours worked, greater than 0 and at most 24."),
      notes: z.string().optional().describe("Optional work notes for the time entry.")
    }
  },
  async ({ projectReference, entryDate, hours, notes }) => {
    if (!isValidIsoDate(entryDate)) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid entryDate: ${entryDate}. Please use a real date in YYYY-MM-DD format.`
          }
        ],
        isError: true
      };
    }



    const projects = await getMyProjectsFromTrs();
    const matchedProject = findMatchingProject(projects, projectReference);

    if (!matchedProject) {
      return {
        content: [
          {
            type: "text",
            text: [
              `I could not match project reference "${projectReference}" to one of your assigned projects, so I did not save anything.`,
              "Assigned projects:",
              ...projects.map((project) => `- ${project.projectCode} - ${project.projectName}`)
            ].join("\n")
          }
        ],
        isError: true
      };
    }

    if (!matchedProject.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedProject.projectCode} - ${matchedProject.projectName} is inactive, so I did not save a time entry for it.`
          }
        ],
        isError: true
      };
    }

    const createdEntry = await createMyTimeEntryInTrs({
      projectId: matchedProject.id,
      entryDate,
      hours,
      notes: notes?.trim() || undefined
    });

    return {
      content: [
        {
          type: "text",
          text: [
            "Time entry saved to TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `Entry ID: ${createdEntry.id}`,
            `Project: ${createdEntry.projectCode} - ${createdEntry.projectName}`,
            `Date: ${createdEntry.entryDate}`,
            `Hours: ${createdEntry.hours}`,
            `Status: ${createdEntry.status}`,
            `Notes: ${createdEntry.notes || "-"}`
          ].join("\n")
        }
      ]
    };
  }
);
server.registerTool(
  "prepare_time_entry_update",
  {
    title: "Prepare TRS Time Entry Update Draft",
    description: "Prepares and validates a draft update for an existing TRS time entry without saving it. Use get_my_time_entries first to identify the exact timeEntryId, then use this tool before update_time_entry.",
    inputSchema: {
      timeEntryId: z.number().int().positive().describe("Existing TRS time-entry ID to update. Use get_my_time_entries first if the user describes the entry naturally."),
      projectReference: z.string().describe("Final project code, project name, or partial project reference for the updated entry."),
      entryDate: z.string().describe("Final entry date in YYYY-MM-DD format."),
      hours: z.number().positive().max(24).describe("Final hours worked, greater than 0 and at most 24."),
      notes: z.string().optional().describe("Final notes for the time entry.")
    }
  },
  async ({ timeEntryId, projectReference, entryDate, hours, notes }) => {
    if (!isValidIsoDate(entryDate)) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid entryDate: ${entryDate}. Please use a real date in YYYY-MM-DD format.`
          }
        ],
        isError: true
      };
    }


    const existingEntry = await findMyTimeEntryOnDate(timeEntryId, entryDate);

    if (!existingEntry) {
      return {
        content: [
          {
            type: "text",
            text: `I could not find time entry ID ${timeEntryId} on ${entryDate} for the configured identity. Please call get_my_time_entries first and use the exact entry ID.`
          }
        ],
        isError: true
      };
    }

    if (existingEntry.status === "CANCELLED") {
      return {
        content: [
          {
            type: "text",
            text: `Time entry ID ${timeEntryId} is CANCELLED, so it should not be updated.`
          }
        ],
        isError: true
      };
    }
    const projects = await getMyProjectsFromTrs();
    const matchedProject = findMatchingProject(projects, projectReference);

    if (!matchedProject) {
      return {
        content: [
          {
            type: "text",
            text: [
              `I could not match project reference "${projectReference}" to one of your assigned projects.`,
              "Assigned projects:",
              ...projects.map((project) => `- ${project.projectCode} - ${project.projectName}`)
            ].join("\n")
          }
        ],
        isError: true
      };
    }

    if (!matchedProject.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedProject.projectCode} - ${matchedProject.projectName} is inactive, so a time-entry update should not be prepared for it.`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "Draft time-entry update prepared. It has NOT been saved to TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `Entry ID to update: ${timeEntryId}`,
            `Final project: ${matchedProject.projectCode} - ${matchedProject.projectName}`,
            `Final date: ${entryDate}`,
            `Final hours: ${hours}`,
            `Final notes: ${notes?.trim() || "-"}`,
            "If this looks correct, confirm before using update_time_entry to save it."
          ].join("\n")
        }
      ]
    };
  }
);

server.registerTool(
  "update_time_entry",
  {
    title: "Update TRS Time Entry",
    description: "Updates and saves an existing TRS time entry for the configured Claude Desktop identity after the user has reviewed an update draft and explicitly confirmed saving. Use get_my_time_entries to identify the exact timeEntryId and prepare_time_entry_update before this tool. This tool writes to the TRS database.",
    inputSchema: {
      timeEntryId: z.number().int().positive().describe("Existing TRS time-entry ID to update."),
      projectReference: z.string().describe("Final project code, project name, or partial project reference for the updated entry."),
      entryDate: z.string().describe("Final entry date in YYYY-MM-DD format."),
      hours: z.number().positive().max(24).describe("Final hours worked, greater than 0 and at most 24."),
      notes: z.string().optional().describe("Final notes for the time entry.")
    }
  },
  async ({ timeEntryId, projectReference, entryDate, hours, notes }) => {
    if (!isValidIsoDate(entryDate)) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid entryDate: ${entryDate}. Please use a real date in YYYY-MM-DD format.`
          }
        ],
        isError: true
      };
    }


    const existingEntry = await findMyTimeEntryOnDate(timeEntryId, entryDate);

    if (!existingEntry) {
      return {
        content: [
          {
            type: "text",
            text: `I could not find time entry ID ${timeEntryId} on ${entryDate} for the configured identity. Please call get_my_time_entries first and use the exact entry ID.`
          }
        ],
        isError: true
      };
    }

    if (existingEntry.status === "CANCELLED") {
      return {
        content: [
          {
            type: "text",
            text: `Time entry ID ${timeEntryId} is CANCELLED, so it should not be updated.`
          }
        ],
        isError: true
      };
    }
    const projects = await getMyProjectsFromTrs();
    const matchedProject = findMatchingProject(projects, projectReference);

    if (!matchedProject) {
      return {
        content: [
          {
            type: "text",
            text: [
              `I could not match project reference "${projectReference}" to one of your assigned projects, so I did not update anything.`,
              "Assigned projects:",
              ...projects.map((project) => `- ${project.projectCode} - ${project.projectName}`)
            ].join("\n")
          }
        ],
        isError: true
      };
    }

    if (!matchedProject.active) {
      return {
        content: [
          {
            type: "text",
            text: `${matchedProject.projectCode} - ${matchedProject.projectName} is inactive, so I did not update the time entry for it.`
          }
        ],
        isError: true
      };
    }

    let updatedEntry: TimeEntryResponse;

    try {
      updatedEntry = await updateMyTimeEntryInTrs(timeEntryId, {
        projectId: matchedProject.id,
        entryDate,
        hours,
        notes: notes?.trim() || undefined
      });
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `TRS rejected the update, so I did not change anything. Backend message: ${getAxiosErrorMessage(error)}`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "Time entry updated in TRS.",
            `Configured identity: ${trsDefaultProvider} / ${trsDefaultProviderUserId}`,
            `Entry ID: ${updatedEntry.id}`,
            `Project: ${updatedEntry.projectCode} - ${updatedEntry.projectName}`,
            `Date: ${updatedEntry.entryDate}`,
            `Hours: ${updatedEntry.hours}`,
            `Status: ${updatedEntry.status}`,
            `Notes: ${updatedEntry.notes || "-"}`
          ].join("\n")
        }
      ]
    };
  }
);
const transport = new StdioServerTransport();
await server.connect(transport);




















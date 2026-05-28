import OpenAI from "openai";
import { config } from "../config";

const client = new OpenAI({
  apiKey: config.openRouterApiKey || "missing-key",
  baseURL: config.openRouterBaseUrl
});

type WriteProfileResponseInput = {
  originalUserMessage: string;
  user: {
    userId: number;
    fullName: string;
    email: string;
    role: string;
  };
};

type WriteProjectsResponseInput = {
  originalUserMessage: string;
  projects: {
    id: number;
    projectCode: string;
    projectName: string;
    active: boolean;
  }[];
};

type WriteTimeEntriesResponseInput = {
  originalUserMessage: string;
  label: string;
  startDate: string;
  endDate: string;
  entries: {
    id: number;
    projectId: number;
    projectCode: string;
    projectName: string;
    entryDate: string;
    hours: number;
    notes: string | null;
    status: string;
  }[];
};





export async function writeProfileResponse(input: WriteProfileResponseInput): Promise<string> {
  if (!config.openRouterApiKey) {
    return [
      `You are mapped to TRS user: ${input.user.fullName}.`,
      `Email: ${input.user.email}`,
      `Role: ${input.user.role}`
    ].join("\n");
  }

  const response = await client.chat.completions.create({
    model: config.openRouterModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "You are TRS Bot, a helpful assistant for the Timer Registration System.",
          "You must answer using only the provided backend tool result.",
          "Do not invent users, roles, projects, or permissions.",
          "If the user asks specifically for a role, answer mainly with the role.",
          "Keep the response short, natural, and friendly.",
          "Do not mention JSON, tool calls, backend, implementation details, or AI intent parsing."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Original user message: ${input.originalUserMessage}`,
          "",
          "Backend verified TRS user:",
          `Name: ${input.user.fullName}`,
          `Email: ${input.user.email}`,
          `Role: ${input.user.role}`
        ].join("\n")
      }
    ]
  });

  return response.choices[0]?.message?.content?.trim()
    || `The TRS role for ${input.user.email} is ${input.user.role}.`;
}

export async function writeProjectsResponse(input: WriteProjectsResponseInput): Promise<string> {
  if (input.projects.length === 0) {
    return "You do not have any assigned projects in TRS right now.";
  }

  if (!config.openRouterApiKey) {
    return [
      "Here are your assigned TRS projects:",
      ...input.projects.map((project) => `- ${project.projectCode}: ${project.projectName}`)
    ].join("\n");
  }

  const projectLines = input.projects
    .map((project) => `- ID ${project.id} | ${project.projectCode} | ${project.projectName} | active=${project.active}`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: config.openRouterModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "You are TRS Bot, a helpful assistant for the Timer Registration System.",
          "You must answer using only the provided backend tool result.",
          "Do not invent projects, project IDs, assignments, or permissions.",
          "If projects are listed, include project code and project name.",
          "Keep the response short, natural, and friendly.",
          "Do not mention JSON, tool calls, backend, implementation details, or AI intent parsing."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Original user message: ${input.originalUserMessage}`,
          "",
          "Backend verified assigned projects:",
          projectLines
        ].join("\n")
      }
    ]
  });

  return response.choices[0]?.message?.content?.trim()
    || [
      "Here are your assigned TRS projects:",
      ...input.projects.map((project) => `- ${project.projectCode}: ${project.projectName}`)
    ].join("\n");
}

export async function writeTimeEntriesResponse(input: WriteTimeEntriesResponseInput): Promise<string> {
  if (input.entries.length === 0) {
    return `I did not find any time entries for ${input.label}.`;
  }

  const totalHours = input.entries.reduce((sum, entry) => sum + Number(entry.hours), 0);

  if (!config.openRouterApiKey) {
    return [
      `You logged ${totalHours} hour(s) for ${input.label}.`,
      ...input.entries.map((entry) =>
        `- ${entry.entryDate}: ${entry.projectCode} - ${entry.projectName}, ${entry.hours}h, ${entry.status}`
      )
    ].join("\n");
  }

  const entryLines = input.entries
    .map((entry) =>
      `- ${entry.entryDate} | ${entry.projectCode} | ${entry.projectName} | ${entry.hours}h | ${entry.status} | notes=${entry.notes ?? "-"}`
    )
    .join("\n");

  const response = await client.chat.completions.create({
    model: config.openRouterModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "You are TRS Bot, a helpful assistant for the Timer Registration System.",
          "You must answer using only the provided backend tool result.",
          "Do not invent time entries, hours, projects, or dates.",
          "Mention the total hours.",
          "Keep the response short, natural, and friendly.",
          "Do not mention JSON, tool calls, backend, implementation details, or AI intent parsing."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Original user message: ${input.originalUserMessage}`,
          `Requested range label: ${input.label}`,
          `Start date: ${input.startDate}`,
          `End date: ${input.endDate}`,
          "",
          "Backend verified time entries:",
          entryLines,
          "",
          `Total hours: ${totalHours}`
        ].join("\n")
      }
    ]
  });

  return response.choices[0]?.message?.content?.trim()
    || `You logged ${totalHours} hour(s) for ${input.label}.`;
}

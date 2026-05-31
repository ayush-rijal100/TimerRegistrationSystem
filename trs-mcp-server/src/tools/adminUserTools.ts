import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { identityLabel } from "../config.js";
import { createUserInTrs, getAdminUsersFromTrs } from "../trsApiClient.js";
import type { UserResponse } from "../types.js";
import { getAxiosErrorMessage } from "../utils/errorUtils.js";

const TEMPORARY_USER_PASSWORD = "password123";

const createUserSchema = {
  fullName: z.string().min(2).max(100).describe("Full name, 2 to 100 characters."),
  email: z.string().email().max(255).describe("Unique email address for the user."),
  password: z.string().min(8).max(72).optional().describe("Optional initial password, 8 to 72 characters. If omitted, TRS MCP uses password123 as the temporary password."),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).describe("TRS role for the user.")
};

export function registerAdminUserTools(server: McpServer): void {
  server.registerTool(
    "prepare_create_user",
    {
      title: "Prepare Create TRS User Draft",
      description: "Admin-only tool that prepares and validates a new TRS user draft without saving it. Use this before create_user when an admin asks to create/add/register a new user, employee, manager, or admin account.",
      inputSchema: createUserSchema
    },
    async ({ fullName, email, password, role }) => {
      const normalizedFullName = fullName.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const initialPassword = password ?? TEMPORARY_USER_PASSWORD;
      const passwordSource = password ? "provided by admin" : "default temporary password";
      const duplicate = await findDuplicateUser(normalizedEmail);
      if (duplicate) return duplicateUserResponse(normalizedEmail, duplicate, "No draft should be saved.");

      return { content: [{ type: "text", text: [
        "Draft user prepared. It has NOT been saved to TRS.",
        `Configured identity: ${identityLabel}`,
        `Full name: ${normalizedFullName}`,
        `Email: ${normalizedEmail}`,
        `Role: ${role}`,
        `Temporary password: ${initialPassword}`,
        `Password source: ${passwordSource}`,
        "Status after save: ACTIVE",
        "If this looks correct, confirm before using create_user to save it."
      ].join("\n") }] };
    }
  );

  server.registerTool(
    "create_user",
    {
      title: "Create TRS User",
      description: "Admin-only tool that creates and saves a new TRS user after the user has reviewed a draft and explicitly confirmed saving. Use prepare_create_user before this tool. This tool writes to the TRS database and must never print the password back.",
      inputSchema: createUserSchema
    },
    async ({ fullName, email, password, role }) => {
      const normalizedFullName = fullName.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const initialPassword = password ?? TEMPORARY_USER_PASSWORD;
      const passwordSource = password ? "provided by admin" : "default temporary password";
      const duplicate = await findDuplicateUser(normalizedEmail);
      if (duplicate) return duplicateUserResponse(normalizedEmail, duplicate, "I did not create a duplicate user.");

      try {
        const createdUser = await createUserInTrs({ fullName: normalizedFullName, email: normalizedEmail, password: initialPassword, role });
        return { content: [{ type: "text", text: [
          "User created in TRS.",
          `Configured identity: ${identityLabel}`,
          `User ID: ${createdUser.id}`,
          `Full name: ${createdUser.fullName}`,
          `Email: ${createdUser.email}`,
          `Role: ${createdUser.role}`,
          `Status: ${createdUser.active ? "ACTIVE" : "INACTIVE"}`,
          `Temporary password: ${initialPassword}`,
          `Password source: ${passwordSource}`,
          "Ask this user to change the password after first login when that feature is available."
        ].join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `TRS rejected the user creation, so I did not create anything. Backend message: ${getAxiosErrorMessage(error)}` }], isError: true };
      }
    }
  );
}

async function findDuplicateUser(email: string): Promise<UserResponse | undefined> {
  const existingUsers = await getAdminUsersFromTrs();
  return existingUsers.find((user) => user.email.toLowerCase() === email);
}

function duplicateUserResponse(email: string, duplicate: UserResponse, suffix: string) {
  return {
    content: [{ type: "text" as const, text: `Email ${email} already exists for ${duplicate.fullName}. ${suffix}` }],
    isError: true
  };
}


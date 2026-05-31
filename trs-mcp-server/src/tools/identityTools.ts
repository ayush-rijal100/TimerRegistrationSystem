import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { identityLabel } from "../config.js";
import { getAdminUsersFromTrs, getCurrentUserFromTrs } from "../trsApiClient.js";
import { getAxiosErrorMessage } from "../utils/errorUtils.js";

export function registerIdentityTools(server: McpServer): void {
  server.registerTool(
    "trs_health",
    {
      title: "TRS MCP Health",
      description: "Checks whether the TRS MCP server is alive.",
      inputSchema: {}
    },
    async () => ({ content: [{ type: "text", text: "TRS MCP server is alive." }] })
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
    async ({ message }) => ({ content: [{ type: "text", text: `You said: ${message}` }] })
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
          content: [{
            type: "text",
            text: [
              `Configured identity: ${identityLabel}`,
              `TRS user: ${user.fullName}`,
              `Email: ${user.email}`,
              `Role: ${user.role}`,
              `User ID: ${user.userId}`
            ].join("\n")
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Could not resolve the configured TRS identity. Backend message: ${getAxiosErrorMessage(error)}` }],
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
        if (users.length === 0) return { content: [{ type: "text", text: "No TRS users found." }] };

        const lines = users.map((user) => {
          const status = user.active ? "ACTIVE" : "INACTIVE";
          return `- ID ${user.id} | ${user.fullName} | ${user.email} | ${user.role} | ${status}`;
        });

        return { content: [{ type: "text", text: [`Configured identity: ${identityLabel}`, `TRS users (${users.length}):`, ...lines].join("\n") }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Could not retrieve admin users. Backend message: ${getAxiosErrorMessage(error)}` }],
          isError: true
        };
      }
    }
  );
}

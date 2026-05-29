import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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

const transport = new StdioServerTransport();
await server.connect(transport);
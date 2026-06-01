import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "./config.js";
import { registerAdminAssignmentTools } from "./tools/adminAssignmentTools.js";
import { registerAdminUserTools } from "./tools/adminUserTools.js";
import { registerIdentityTools } from "./tools/identityTools.js";
import { registerProjectTools } from "./tools/projectTools.js";
import { registerTimeEntryTools } from "./tools/timeEntryTools.js";
import { registerManagerReportTools } from "./tools/managerReportTools.js";


const server = new McpServer({
  name: "trs-mcp-server",
  version: "0.1.0"
});

registerIdentityTools(server);
registerProjectTools(server);
registerTimeEntryTools(server);
registerManagerReportTools(server);
registerAdminUserTools(server);
registerAdminAssignmentTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

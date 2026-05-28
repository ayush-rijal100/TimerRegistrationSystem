export type ConnectedActionName =
  | "VIEW_MY_PROFILE"
  | "VIEW_MY_PROJECTS"
  | "VIEW_MY_TIME_ENTRIES"
  | "CREATE_TIME_ENTRY"
  | "UPDATE_TIME_ENTRY"
  | "CANCEL_TIME_ENTRY"
  | "VIEW_TEAM_UTILIZATION"
  | "VIEW_MISSING_ENTRIES"
  | "VIEW_ADMIN_USERS"
  | "VIEW_ADMIN_PROJECTS"
  | "VIEW_ADMIN_ASSIGNMENTS"
  | "ASSIGN_ADMIN_USER_PROJECT"
  | "CREATE_ADMIN_PROJECT"
  | "CREATE_ADMIN_USER";

export type TrsRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type ConnectedAction = {
  name: ConnectedActionName;
  description: string;
  allowedRoles: TrsRole[];
  examples: string[];
};

export const connectedActions: ConnectedAction[] = [
  {
    name: "VIEW_MY_PROFILE",
    description: "View the current Discord user's mapped TRS profile, email, and role.",
    allowedRoles: ["EMPLOYEE", "MANAGER", "ADMIN"],
    examples: [
      "who am i",
      "tell me my role",
      "show my profile",
      "which TRS user am I mapped to?"
    ]
  },
  {
    name: "VIEW_MY_PROJECTS",
    description: "View projects assigned to the current Discord user.",
    allowedRoles: ["EMPLOYEE", "MANAGER", "ADMIN"],
    examples: [
      "what projects am I assigned to?",
      "show my projects",
      "which projects can I log time on?",
      "list my current projects"
    ]
  },
  {
    name: "VIEW_MY_TIME_ENTRIES",
    description: "View the current Discord user's time entries or logged hours for a date/range.",
    allowedRoles: ["EMPLOYEE", "MANAGER", "ADMIN"],
    examples: [
      "what time did I log today?",
      "show my time entries this week",
      "how many hours did I log yesterday?",
      "show my time from 2026-05-20 to 2026-05-31"
    ]
  },
  {
    name: "CREATE_TIME_ENTRY",
    description: "Prepare a new time entry for the current Discord user. This must ask for confirmation before saving.",
    allowedRoles: ["EMPLOYEE"],
    examples: [
      "log 4 hours yesterday on client implementation for API bug fixing",
      "add 2.5 hours today to PRJ-002 for testing",
      "record 8 hours on internal product development last monday"
    ]
  },
  {
    name: "UPDATE_TIME_ENTRY",
    description: "Prepare an update to the current Discord user's existing time entry. This must ask for confirmation before saving.",
    allowedRoles: ["EMPLOYEE"],
    examples: [
      "change yesterday's client implementation entry to 3 hours",
      "update today's PRJ-002 time entry notes to fixed API bug",
      "change my internal product entry from yesterday to 6 hours"
    ]
  },
  {
    name: "CANCEL_TIME_ENTRY",
    description: "Prepare cancellation of the current Discord user's existing time entry. This must ask for confirmation before changing status to CANCELLED.",
    allowedRoles: ["EMPLOYEE"],
    examples: [
      "cancel today's client implementation time entry",
      "cancel yesterday's PRJ-002 entry",
      "remove my internal product entry from yesterday"
    ]
  }
  ,
  {
    name: "VIEW_TEAM_UTILIZATION",
    description: "View team utilization report for a date range. Requires MANAGER or ADMIN role.",
    allowedRoles: ["MANAGER", "ADMIN"],
    examples: [
      "show team utilization this week",
      "who logged less than expected this month",
      "show utilization from 2026-05-01 to 2026-05-31"
    ]
  }
  ,
  {
    name: "VIEW_MISSING_ENTRIES",
    description: "View employees who have missing time entries for a date range. Requires MANAGER or ADMIN role.",
    allowedRoles: ["MANAGER", "ADMIN"],
    examples: [
      "who has missing time entries this week",
      "show missing entries this month",
      "which employees forgot to submit time from 2026-05-01 to 2026-05-31",
      "who missed their work logs this month",
      "which employees have not filled timesheet this month",
      "show employees who left time entries missing",
      "who did not submit time entries this month"
    ]
  },
  {
    name: "VIEW_ADMIN_USERS",
    description: "Admin-only action to list all TRS users/employees with email, role, and active status.",
    allowedRoles: ["ADMIN"],
    examples: [
      "show all employees",
      "list all users",
      "show all TRS users",
      "admin show employees",
      "who are the users in the system"
    ]
  },
  {
    name: "VIEW_ADMIN_PROJECTS",
    description: "Admin-only action to list all TRS projects with ID, code, name, and active status.",
    allowedRoles: ["ADMIN"],
    examples: [
      "show all projects",
      "list all projects",
      "show all TRS projects",
      "admin show projects",
      "what projects exist in the system"
    ]
  },
  {
    name: "VIEW_ADMIN_ASSIGNMENTS",
    description: "Admin-only action to list current user-to-project assignments.",
    allowedRoles: ["ADMIN"],
    examples: [
      "show all project assignments",
      "list user project assignments",
      "who is assigned to which project",
      "show assignment mapping",
      "show all user project mappings"
    ]
  },
  {
    name: "ASSIGN_ADMIN_USER_PROJECT",
    description: "Admin-only action to assign a TRS user to a project. This must ask for confirmation before saving.",
    allowedRoles: ["ADMIN"],
    examples: [
      "assign Bijaya Tiwari to PRJ-002",
      "add Emp One to Client Implementation",
      "give Manager One access to PRJ-001",
      "assign admin1@example.com to Proxy Management"
    ]
  },
  {
    name: "CREATE_ADMIN_PROJECT",
    description: "Admin-only action to create a new TRS project. This must ask for confirmation before saving.",
    allowedRoles: ["ADMIN"],
    examples: [
      "create project PRJ-010 called Mobile Banking App",
      "add a new project with code PRJ-011 named Website Redesign",
      "create TRS project PRJ-012 for Payroll Automation"
    ]
  },
  {
    name: "CREATE_ADMIN_USER",
    description: "Admin-only action to create a new TRS user without Discord identity mapping. This must ask for confirmation before saving.",
    allowedRoles: ["ADMIN"],
    examples: [
      "create employee Ram Sharma with email ram@example.com and password password123",
      "create manager Sita Thapa email sita@example.com password password123",
      "add admin user Hari Adhikari with email hari@example.com and password password123"
    ]
  }
];

export function formatConnectedActionsForPrompt(): string {
  return connectedActions
    .map((action, index) => [
      `${index + 1}. ${action.name}`,
      `- ${action.description}`,
      `- Allowed roles: ${action.allowedRoles.join(", ")}`,
      "- Examples:",
      ...action.examples.map((example) => `  ${example}`)
    ].join("\n"))
    .join("\n\n");
}

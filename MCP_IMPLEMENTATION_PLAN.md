# Timer Registration System - MCP Implementation Plan

## Purpose Of This Document

This document is a handoff plan for continuing the Timer Registration System project in a new chat/thread.

The current project already has:

- Spring Boot backend as the source of truth
- PostgreSQL database through Docker
- Next.js frontend dashboard
- TypeScript Discord bot with natural-language AI intent parsing
- Discord identity mapping to real TRS users
- Role-based access for Employee, Manager, and Admin

The next big goal is to make the project **MCP-ready** so TRS actions can be used not only from Discord, but also from other AI clients/interfaces that support MCP.

---

## Current Product Direction

We are building a medium-level, professional learning project:

**Timer Registration System + AI Discord Bot + MCP Server**

The product idea:

Employees log work hours against projects.
Managers/Admins review reports such as utilization and missing entries.
Discord bot provides natural-language access.
MCP server later exposes the same safe business actions to AI tools like Claude Desktop, Cursor, custom agents, or other MCP-compatible clients.

---

## Important Principle

Spring Boot backend remains the **source of truth**.

Do not let Discord bot, MCP server, or LLM write directly to PostgreSQL.

Correct architecture:

```text
AI / Discord / MCP Client
        |
        v
TypeScript Bot or MCP Server
        |
        v
Spring Boot REST API
        |
        v
PostgreSQL
```

Wrong architecture:

```text
AI / Bot / MCP Server
        |
        v
PostgreSQL directly
```

Reason:

- Backend owns business rules
- Backend owns permissions
- Backend owns validation
- Backend owns audit behavior
- Frontend stays consistent because all changes go through backend

---

## Current Backend Context

Backend path:

```text
C:\TimerRegistrationSystem\backend\timer-registration-api
```

Backend stack:

- Java / Spring Boot
- Spring Security
- JWT for web/API auth
- Bot service token for trusted bot/MCP endpoints
- Spring Data JPA / Hibernate
- Flyway migrations
- PostgreSQL

Important backend concepts already added:

- `User`
- `Role`
- `Project`
- `TimeEntry`
- `UserExternalIdentityLink`
- `ExternalIdentityService`
- Bot-safe controllers:
  - `BotIdentityController`
  - `BotProjectController`
  - `BotTimeEntryController`
  - `BotReportController`

Important bot-safe API pattern:

```http
X-Bot-Service-Token: <trusted-token>
```

and query identity:

```http
provider=DISCORD
providerUserId=<discord_user_id>
```

Example:

```http
GET /api/bot/identity/resolve?provider=DISCORD&providerUserId=733215047114948609
```

This maps external identity to real TRS user and role.

---

## Current Discord Identity Mappings

These are currently used for real multi-account Discord testing:

```text
Employee Discord ID = 1458399968749424784 -> emp1@example.com -> EMPLOYEE
Manager Discord ID  = 1176894455123554314 -> manager1@example.com -> MANAGER
Admin Discord ID    = 733215047114948609  -> admin1@example.com -> ADMIN
```

Important:

The bot should not ask users to type TRS email/password in Discord anymore.
Discord identity mapping is the preferred direction.

---

## Current Discord Bot Context

Discord bot path:

```text
C:\TimerRegistrationSystem\discord-bot
```

Stack:

- Node.js
- TypeScript
- discord.js
- OpenRouter/OpenAI-compatible LLM API
- In-memory state for now

Important files:

```text
discord-bot/src/main.ts
```
Main Discord message router.

```text
discord-bot/src/ai/intentParser.ts
```
LLM intent parser. Converts natural language into structured actions.

```text
discord-bot/src/actions/actionRegistry.ts
```
Connected action names, descriptions, examples, and allowed roles.

```text
discord-bot/src/actions/actionPermissions.ts
```
Role checks for connected actions.

```text
discord-bot/src/actions/aiActionExecutor.ts
```
Executes parsed AI actions by calling Spring Boot API wrappers.

```text
discord-bot/src/trsApi.ts
```
HTTP client wrappers for Spring Boot APIs.

```text
discord-bot/src/sessionStore.ts
```
In-memory sessions, pending time entries, pending AI actions.

```text
discord-bot/src/ai/systemPrompt.ts
```
Fallback AI prompt. Should not pretend to call backend.

---

## Current AI Bot Philosophy

We decided on this professional pattern:

```text
User natural language
        |
        v
LLM extracts intent + parameters
        |
        v
TypeScript validates parameters
        |
        v
Backend checks identity, role, business rules
        |
        v
Backend returns real result
        |
        v
Bot formats/replies
```

The LLM should understand language, but it should not be trusted to invent data or permissions.

Examples of extracted fields:

```ts
intent: "VIEW_MISSING_ENTRIES"
dateRange: { startDate, endDate, label }
projectReference?: string
employeeReference?: string
hours?: number
notes?: string
needsClarification?: boolean
clarificationQuestion?: string
```

Current weakness:

The bot still needs improvements around:

- reliable structured output from cheap/free LLM models
- pending clarification continuation
- employee-specific filtering for reports
- response writing after backend result
- avoiding fallback AI pretending to fetch data

These are bot improvements, but MCP should be designed cleanly in parallel.

---

## What Is MCP In This Project?

MCP means **Model Context Protocol**.

Layman explanation:

MCP is like giving AI clients a menu of safe tools they can call.

Instead of the AI guessing or directly accessing the database, we expose tools like:

```text
get_my_projects
get_my_time_entries
create_time_entry
update_time_entry
cancel_time_entry
get_team_utilization
get_missing_entries
```

The AI client can say:

```text
I need the user's missing entries report.
```

Then it calls an MCP tool:

```text
get_missing_entries(startDate, endDate)
```

The MCP server then calls Spring Boot API.

---

## MCP Server Role

The MCP server should be a separate TypeScript service.

Proposed path:

```text
C:\TimerRegistrationSystem\mcp-server
```

Why separate from Discord bot?

Because Discord bot is one interface.
MCP server is another interface.
Both should call the same Spring Boot backend.

This keeps architecture clean:

```text
Discord Bot       -> Spring Boot API
MCP Server        -> Spring Boot API
Next.js Frontend  -> Spring Boot API
Postman           -> Spring Boot API
```

---

## Proposed MCP Folder Structure

```text
mcp-server/
  package.json
  tsconfig.json
  .env
  .env.example
  src/
    server.ts
    config.ts
    trsApi.ts
    auth/
      identityContext.ts
    tools/
      getMyProfile.ts
      getMyProjects.ts
      getMyTimeEntries.ts
      createTimeEntry.ts
      updateTimeEntry.ts
      cancelTimeEntry.ts
      getTeamUtilization.ts
      getMissingEntries.ts
    utils/
      dateValidation.ts
      errorFormatter.ts
```

---

## MCP Environment Variables

Proposed `.env`:

```env
TRS_API_BASE_URL=http://localhost:8080
TRS_BOT_SERVICE_TOKEN=timer-registration-system-local-bot-service-token-change-later
MCP_PROVIDER=DISCORD
MCP_PROVIDER_USER_ID=733215047114948609
```

For local testing, `MCP_PROVIDER_USER_ID` can represent the current user.

Examples:

```text
Employee test: 1458399968749424784
Manager test: 1176894455123554314
Admin test: 733215047114948609
```

Later, a real MCP client may provide user context differently, but for local MVP this env-based identity is acceptable.

---

## Identity Strategy For MCP

Short-term MVP:

Use `.env` to choose the active TRS user:

```env
MCP_PROVIDER=DISCORD
MCP_PROVIDER_USER_ID=733215047114948609
```

The MCP server calls backend bot APIs with:

```http
X-Bot-Service-Token: <token>
```

and:

```text
provider=DISCORD
providerUserId=733215047114948609
```

Backend resolves real user + role.

Long-term improvement:

- OAuth/account linking
- per-client session context
- external identity per MCP client user
- persistent user mappings in DB

---

## Security Rule For MCP

MCP tools should not decide permissions by themselves only.

They may do helpful local checks, but backend must enforce the real permission.

Example:

`get_missing_entries` is manager/admin only.

MCP server calls:

```http
GET /api/bot/reports/missing-entries
```

Backend checks:

```text
External identity -> TRS user -> role is MANAGER or ADMIN
```

If employee tries it, backend returns forbidden.

---

## Proposed MCP Tools

### 1. `get_my_profile`

Purpose:
Resolve current MCP identity to TRS user.

Input:

```json
{}
```

Backend call:

```http
GET /api/bot/identity/resolve
```

Output:

```json
{
  "userId": 3,
  "fullName": "Admin One",
  "email": "admin1@example.com",
  "role": "ADMIN"
}
```

---

### 2. `get_my_projects`

Purpose:
List projects assigned to current user.

Input:

```json
{}
```

Backend call:

```http
GET /api/bot/projects/my
```

Output:

```json
[
  {
    "id": 1,
    "projectCode": "PRJ-001",
    "projectName": "Internal Product Development",
    "active": true
  }
]
```

---

### 3. `get_my_time_entries`

Purpose:
View current user's time entries for date range.

Input:

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-31"
}
```

Backend call:

```http
GET /api/bot/time-entries/my
```

---

### 4. `create_time_entry`

Purpose:
Create time entry for current user.

Input:

```json
{
  "projectId": 1,
  "entryDate": "2026-05-28",
  "hours": 4,
  "notes": "Worked on MCP server"
}
```

Backend call:

```http
POST /api/bot/time-entries/my
```

Important:

For interactive clients, the client/AI should ask confirmation before calling this tool.
The MCP tool itself can still trust that if it is called, user intended it.

---

### 5. `update_time_entry`

Purpose:
Update existing time entry.

Input:

```json
{
  "timeEntryId": 10,
  "projectId": 1,
  "entryDate": "2026-05-28",
  "hours": 6,
  "notes": "Updated notes"
}
```

Backend call:

```http
PUT /api/bot/time-entries/my/{id}
```

---

### 6. `cancel_time_entry`

Purpose:
Soft cancel current user's time entry.

Input:

```json
{
  "timeEntryId": 10
}
```

Backend call:

```http
PATCH /api/bot/time-entries/my/{id}/cancel
```

Expected backend status:

```text
CANCELLED
```

This should also show in frontend dashboard because backend updates DB.

---

### 7. `get_team_utilization`

Purpose:
Manager/admin report.

Input:

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-31"
}
```

Backend call:

```http
GET /api/bot/reports/utilization
```

Allowed roles:

```text
MANAGER, ADMIN
```

---

### 8. `get_missing_entries`

Purpose:
Manager/admin report for missing employee time entries.

Input:

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "employeeName": "Bijaya Tiwari"
}
```

Important:

`employeeName` should be optional.

If absent:

```text
return all missing entries
```

If present:

```text
MCP server can filter backend result by matching employee fullName
```

Better long-term backend improvement:

Add backend query param:

```http
employeeName=Bijaya%20Tiwari
```

But MVP can filter in MCP after backend returns report.

---

## MCP Tool Design Philosophy

Do not make MCP tools too magical.

Good tool input:

```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-04-30"
}
```

Bad tool input:

```json
{
  "date": "from year january to april maybe"
}
```

Reason:

MCP tools should receive structured arguments.
The AI client can interpret natural language before tool call.
The tool validates structured inputs.

---

## Relationship Between Discord Bot And MCP

Discord bot currently does both:

```text
Natural language parsing
Action execution
Response formatting
```

MCP server should mainly do:

```text
Tool definitions
Input validation
Spring Boot API calls
Return structured results
```

Later, Discord bot can optionally call MCP tools instead of directly calling Spring Boot.

Possible future architecture:

```text
Discord Bot
  -> LLM parses intent
  -> calls MCP tool
  -> MCP calls Spring Boot
```

But for now, keep them separate to reduce complexity.

---

## Recommended Implementation Steps

### Step 1 - Scaffold MCP Server

Create:

```text
C:\TimerRegistrationSystem\mcp-server
```

Initialize TypeScript Node project.

Install likely packages:

```bash
npm install @modelcontextprotocol/sdk axios zod dotenv
npm install -D typescript ts-node-dev @types/node
```

Add scripts:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

---

### Step 2 - Add Config

Create:

```text
src/config.ts
```

Read:

```text
TRS_API_BASE_URL
TRS_BOT_SERVICE_TOKEN
MCP_PROVIDER
MCP_PROVIDER_USER_ID
```

Validate env values at startup.

---

### Step 3 - Add TRS API Wrapper

Create:

```text
src/trsApi.ts
```

This should look similar to Discord bot `trsApi.ts`, but MCP-specific.

Use Axios.

All bot-safe calls should include:

```ts
headers: {
  "X-Bot-Service-Token": config.trsBotServiceToken
}
```

And params:

```ts
provider: config.mcpProvider,
providerUserId: config.mcpProviderUserId
```

---

### Step 4 - Implement First Tool: `get_my_profile`

This is the simplest tool.

Test goal:

MCP server can call Spring Boot and return current user.

Expected with Admin ID:

```json
{
  "userId": 3,
  "fullName": "Admin One",
  "email": "admin1@example.com",
  "role": "ADMIN"
}
```

---

### Step 5 - Implement Read Tools

Add:

```text
get_my_projects
get_my_time_entries
get_team_utilization
get_missing_entries
```

Read tools are safer than write tools, so implement them before create/update/cancel.

---

### Step 6 - Implement Write Tools

Add:

```text
create_time_entry
update_time_entry
cancel_time_entry
```

Important:

MCP tool should validate inputs strictly with Zod.

Examples:

```text
hours > 0 and <= 24
entryDate is YYYY-MM-DD
projectId is positive number
timeEntryId is positive number
```

---

### Step 7 - Test MCP Locally

Testing options:

1. Run MCP server in terminal.
2. Use MCP Inspector if available.
3. Connect from an MCP-compatible client.
4. For early development, call internal tool functions directly with a test script.

Recommended early test script:

```text
src/devTest.ts
```

Call:

```ts
getMyProfile()
getMyProjects()
getMissingEntries({ startDate, endDate })
```

This avoids getting blocked by MCP client setup first.

---

### Step 8 - Test Role Behavior

Run tests with different `MCP_PROVIDER_USER_ID` values.

Employee:

```env
MCP_PROVIDER_USER_ID=1458399968749424784
```

Should allow:

```text
get_my_profile
get_my_projects
get_my_time_entries
create_time_entry
update_time_entry
cancel_time_entry
```

Should deny:

```text
get_team_utilization
get_missing_entries
```

Manager:

```env
MCP_PROVIDER_USER_ID=1176894455123554314
```

Should allow reports.

Admin:

```env
MCP_PROVIDER_USER_ID=733215047114948609
```

Should allow reports.

---

### Step 9 - Verify Frontend Consistency

For write tools:

1. Create time entry from MCP tool.
2. Open frontend dashboard.
3. Confirm time entry appears.
4. Update time entry from MCP tool.
5. Confirm dashboard changes.
6. Cancel time entry from MCP tool.
7. Confirm dashboard status becomes `CANCELLED`.

This proves all interfaces share one backend/data source.

---

## How To Run Existing Project Locally

### Database

```powershell
docker ps
```

If DB is stopped:

```powershell
docker start trs-db
```

Current DB host port is usually:

```text
5433
```

### Backend

```powershell
cd C:\TimerRegistrationSystem\backend\timer-registration-api
$env:APP_JWT_SECRET="timer-registration-system-local-dev-secret-key-change-later-2026-super-long-secret"
$env:SPRING_DATASOURCE_PASSWORD="trs_pass"
mvn "-Dspring-boot.run.jvmArguments=-Duser.timezone=UTC" spring-boot:run
```

Backend runs on:

```text
http://localhost:8080
```

Health check:

```powershell
Invoke-RestMethod "http://localhost:8080/api/health"
```

### Frontend

```powershell
cd C:\TimerRegistrationSystem\frontend
npm run dev
```

Usually:

```text
http://localhost:3000
```

### Discord Bot

```powershell
cd C:\TimerRegistrationSystem\discord-bot
npm run dev
```

---

## Important Current Improvement Backlog

Before or alongside MCP, these bot improvements remain:

### 1. Employee-specific report filtering

Current missing entries report can show all employees.
Need support:

```text
show missing entries for Bijaya Tiwari this month
```

Planned approach:

Add to AI intent result:

```ts
employeeReference?: string
```

Then validate/filter against real backend report rows.

### 2. More reliable structured output

Cheap/free LLM models may not always obey JSON instructions.
Current mitigation:

- prompt asks for JSON only
- parser extracts JSON object from response
- fallback safety blocks fake API behavior

Future stronger option:

- use a model with reliable tool/function calling
- use OpenAI structured outputs if available
- add schema validation with Zod

### 3. Pending clarification continuation

Started concept:

```ts
needsClarification?: boolean
clarificationQuestion?: string
```

Need ensure all connected actions can save pending action and continue after user says yes/no.

### 4. Response writer after backend result

Currently many action responses are TypeScript formatted.
Later we may send backend result to an AI response writer for more natural wording.

But important rule:

AI can rewrite verified backend result, but must not invent missing data.

---

## MCP Testing Plan

### Test 1 - Profile Tool

Input:

```json
{}
```

Expected:

```text
returns mapped user and role
```

### Test 2 - Project Tool

Input:

```json
{}
```

Expected:

```text
returns assigned projects for current identity
```

### Test 3 - Employee Time Entries

Use employee ID.

Input:

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-31"
}
```

Expected:

```text
returns employee's entries only
```

### Test 4 - Employee Forbidden Report

Use employee ID and call:

```text
get_missing_entries
```

Expected:

```text
403 or clean forbidden error
```

### Test 5 - Admin Missing Entries

Use admin ID and call:

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-31"
}
```

Expected:

```text
returns missing entries report
```

### Test 6 - Create Time Entry

Use employee ID.

Input:

```json
{
  "projectId": 1,
  "entryDate": "2026-05-28",
  "hours": 2,
  "notes": "MCP test entry"
}
```

Expected:

```text
new submitted time entry
visible in frontend
```

### Test 7 - Cancel Time Entry

Input:

```json
{
  "timeEntryId": <created_id>
}
```

Expected:

```text
status becomes CANCELLED
frontend shows CANCELLED
```

---

## Suggested MCP Server First Milestone

Do not build everything at once.

Milestone 1:

```text
MCP server starts
get_my_profile works
get_my_projects works
```

Milestone 2:

```text
get_my_time_entries works
get_missing_entries works for admin
employee forbidden check works
```

Milestone 3:

```text
create_time_entry works
frontend reflects created entry
```

Milestone 4:

```text
update/cancel time entry works
frontend reflects changes
```

Milestone 5:

```text
Connect MCP server to real MCP client/inspector
```

---

## Final Architecture Vision

```text
                             +--------------------+
                             ¦   MCP AI Client     ¦
                             ¦ Claude/Cursor/etc.  ¦
                             +--------------------+
                                       ¦ MCP Tool Call
                                       v
+--------------------+       +--------------------+
¦ Discord User        ¦       ¦   MCP Server        ¦
¦ Natural Language    ¦       ¦ TypeScript Tools    ¦
+--------------------+       +--------------------+
          ¦                            ¦
          v                            ¦
+--------------------+                 ¦
¦ Discord Bot         ¦                 ¦
¦ TypeScript + LLM    ¦                 ¦
+--------------------+                 ¦
          ¦ REST API                    ¦ REST API
          +----------------------------+
                         v
              +--------------------+
              ¦ Spring Boot Backend ¦
              ¦ Auth + Rules + API  ¦
              +--------------------+
                        ¦
                        v
              +--------------------+
              ¦ PostgreSQL Database ¦
              +--------------------+
```

---

## Key Reminder For Next Chat Thread

Do not start MCP by connecting directly to database.

Start with:

```text
mcp-server -> Spring Boot bot-safe APIs -> PostgreSQL
```

Keep backend as source of truth.

Build one working tool first:

```text
get_my_profile
```

Then expand step by step.

The user wants explanations at every step and prefers implementing/testing in small approved substeps.
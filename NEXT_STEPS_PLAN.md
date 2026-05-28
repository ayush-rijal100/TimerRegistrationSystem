# Timer Registration System - Next Steps Plan

## Purpose

This file is for continuing the project in the next chat thread without losing direction.

Current focus:

1. Finish Discord bot intelligence and cleanup.
2. Make natural-language actions reliable even with a free/cheap LLM.
3. Start MCP server implementation after the bot flow is stable enough.

---

## Current Status

The project has:

- Spring Boot backend running as source of truth.
- PostgreSQL Docker database.
- Next.js frontend dashboard.
- TypeScript Discord bot.
- Discord identity mapping to TRS users.
- Natural-language AI intent parsing.
- Bot-safe backend APIs using `X-Bot-Service-Token`.
- Manager/admin reports such as utilization and missing entries.
- Employee time-entry create/update/cancel flows.

Current recently completed improvements:

- Employee-specific missing-entry filtering now works with `employeeReference`.
- Example: `missing entries of employee bijaya tiwari of May 2026` returns only Bijaya Tiwari.
- Large broad missing-entry reports now use summary-first formatting instead of dumping every date.
- Full date details are still shown when asking for one employee.

---

## Step 1 - Add Employee-Specific Filtering For Missing Entries - DONE

### Goal

Support this:

```text
show missing entries of Bijaya Tiwari for May 2026
```

Expected result:

```text
Missing time entries for Bijaya Tiwari (May 2026):
...
```

Only Bijaya's row should appear.

### Files

```text
C:\TimerRegistrationSystem\discord-bot\src\ai\intentParser.ts
C:\TimerRegistrationSystem\discord-bot\src\actions\aiActionExecutor.ts
```

### Implementation Plan

1. Add `employeeReference?: string` to `AiIntentResult`.
2. Parse `employeeReference` inside `safeParseIntent(...)`.
3. Update intent parser prompt:

```text
If user mentions a specific employee/person for reports, extract employeeReference.
```

4. Add JSON example:

```json
{
  "intent": "VIEW_MISSING_ENTRIES",
  "confidence": 0.95,
  "employeeReference": "Bijaya Tiwari",
  "dateRange": {
    "startDate": "2026-05-01",
    "endDate": "2026-05-31",
    "label": "May 2026"
  }
}
```

5. In `handleViewMissingEntries(...)`, after backend report returns:

```text
if employeeReference exists -> filter report rows by fullName
else -> show all rows
```

6. If no match:

```text
I could not find an employee matching "..." in this report.
Available employees:
- Emp One
- Bijaya Tiwari
```

7. Build and test.

### Test Prompt

```text
i want missing time entries of employee bijaya tiwari of the month may 2026
```

---

## Step 2 - Improve Employee Matching Quality

### Goal

Handle fuzzy names safely.

Examples:

```text
show missing entries for bijaya
show missing entries for bijay
show missing entries of tiwari
```

### Professional Approach

Do not hard-code names.

Use backend report rows as truth:

```text
Emp One
Bijaya Tiwari
```

Then match `employeeReference` against real names.

### Simple MVP Matching

Start with:

```ts
row.fullName.toLowerCase().includes(employeeReference.toLowerCase())
```

### Better Later Matching

Create:

```text
discord-bot/src/domain/employees/employeeMatcher.ts
```

Support:

- exact match
- partial match
- possible match
- no match
- multiple matches

Return shape:

```ts
type EmployeeMatchResult =
  | { type: "EXACT_MATCH"; employee: MissingEntriesReportResponse }
  | { type: "POSSIBLE_MATCH"; employee: MissingEntriesReportResponse }
  | { type: "MULTIPLE_MATCHES"; employees: MissingEntriesReportResponse[] }
  | { type: "NO_MATCH"; userText: string };
```

---

## Step 3 - Make Long Report Responses More Usable

### Current Fixes Already Done

- Long Discord messages are split into chunks under 2000 characters.
- Broad large missing-entry reports now use summary-first formatting.
- One-employee missing-entry reports still show full dates.

Current behavior:

```text
Broad report -> summary table with count + preview dates
Specific employee report -> detailed table with all missing dates
```

Future optional improvement:

Add pagination or a follow-up command such as `details for Bijaya`.

---

## Step 4 - Improve Date Range Reliability With Free LLM

### Current Reality

Free/cheap LLM may fail to convert messy natural language into structured JSON.

Examples:

```text
i want missing entries from year january to april
```

### Current Strategy

AI first, deterministic fallback second.

```text
1. Try LLM intent parser.
2. If parser fails but request is clearly a known TRS report, use safe deterministic fallback.
3. If still unsafe, block generic fallback from pretending.
```

### Remaining Improvements

Improve `dateRangeParser.ts` for:

```text
1st january 2026 to 1st june 2026
january 2026 to april 2026
from jan to apr 2026
this quarter
last quarter
last 30 days
```

Do this gradually, only for business-useful date phrases.

---

## Step 5 - Clean Up Fallback AI Behavior

### Goal

Generic AI fallback must never pretend to fetch backend data.

Bad:

```text
Got it, I will retrieve the report. One moment...
```

Good:

```text
I understood this is about TRS data, but I could not safely route it to a connected action.
Try: show missing entries from January 2026 to April 2026.
```

### Files

```text
discord-bot/src/ai/systemPrompt.ts
discord-bot/src/main.ts
```

### Check

Make sure fallback safety gate stays active:

```text
looksLikeTrsDataRequest(...)
```

---

## Step 6 - Reduce Old Command Mess Later

Current bot still has old `trs ...` commands.

Examples:

```text
trs login
trs my projects
trs my time
trs log
```

We agreed not to remove them until AI flow is stable.

Later cleanup:

1. Keep only diagnostic commands:

```text
trs health
trs status
trs whoami
```

2. Remove password-based Discord login.
3. Prefer Discord identity mapping.
4. Keep natural-language flow as the main UX.

---

## Step 7 - Add AI Response Writer For Backend Results

### Current Behavior

Most connected actions format responses directly in TypeScript.

This is safe but sometimes less natural.

### Future Better Flow

```text
Backend verified result
        |
        v
AI response writer
        |
        v
Natural answer without inventing data
```

Important rule:

The response writer can rewrite verified data, but must not invent data.

Example input to response writer:

```json
{
  "action": "VIEW_MISSING_ENTRIES",
  "dateRange": "May 2026",
  "rows": [
    {
      "fullName": "Bijaya Tiwari",
      "missingDates": ["2026-05-01", "2026-05-04"]
    }
  ]
}
```

Expected output:

```text
Bijaya Tiwari has 18 missing time-entry days in May 2026.
Here are the missing dates: ...
```

---

## Step 8 - Prepare MCP Server

MCP plan already exists here:

```text
C:\TimerRegistrationSystem\MCP_IMPLEMENTATION_PLAN.md
```

Do not start MCP by connecting directly to database.

Correct MCP architecture:

```text
MCP Client
  -> MCP Server
  -> Spring Boot bot-safe APIs
  -> PostgreSQL
```

First MCP milestone:

```text
mcp-server starts
get_my_profile works
get_my_projects works
```

Recommended MCP path:

```text
C:\TimerRegistrationSystem\mcp-server
```

---

## Step 9 - MCP Tool Order

Implement tools in this order:

1. `get_my_profile`
2. `get_my_projects`
3. `get_my_time_entries`
4. `get_missing_entries`
5. `get_team_utilization`
6. `create_time_entry`
7. `update_time_entry`
8. `cancel_time_entry`

Reason:

Read tools are safer. Write tools should come after MCP structure is proven.

---

## Step 10 - Testing Checklist

### Discord Bot Tests

Employee account:

```text
who am i
show my projects
show my time entries this month
log 4 hours on client implementation today for testing
```

Manager/Admin account:

```text
show team utilization this month
who has missing entries this month
show missing entries of Bijaya Tiwari for May 2026
```

Forbidden test:

```text
Employee asks: who has missing entries this month
Expected: denied by role
```

### Backend Tests

Use PowerShell/Postman:

```powershell
Invoke-RestMethod "http://localhost:8080/api/bot/identity/resolve?provider=DISCORD&providerUserId=733215047114948609" `
  -Headers @{ "X-Bot-Service-Token" = "timer-registration-system-local-bot-service-token-change-later" }
```

### Frontend Consistency Tests

After Discord/MCP create/update/cancel:

```text
Open frontend dashboard
Confirm data changed there too
```

---

## Current Run Commands

### Backend

```powershell
cd C:\TimerRegistrationSystem\backend\timer-registration-api
$env:APP_JWT_SECRET="timer-registration-system-local-dev-secret-key-change-later-2026-super-long-secret"
$env:SPRING_DATASOURCE_PASSWORD="trs_pass"
mvn "-Dspring-boot.run.jvmArguments=-Duser.timezone=UTC" spring-boot:run
```

### Frontend

```powershell
cd C:\TimerRegistrationSystem\frontend
npm run dev
```

### Discord Bot

```powershell
cd C:\TimerRegistrationSystem\discord-bot
npm run dev
```

### Discord Bot Build

```powershell
cd C:\TimerRegistrationSystem\discord-bot
npm run build
```

---

## Very Important Development Principle

Because the LLM is free/cheap and sometimes unreliable:

```text
AI should understand language when it can.
Code should provide safe fallbacks for known business actions.
Backend must always enforce truth and permissions.
```

This is not bad architecture.
This is practical production-style engineering under model limitations.

---

## Immediate Next Task For Next Chat

Start with:

```text
Step 1 - Add employeeReference and filter missing-entry report by employee.
```

Do not jump to MCP until this Discord report flow is stable.

After that:

```text
Improve long report UX.
Then start MCP server milestone 1.
```
# Discord Bot Cleanup Before MCP

## Purpose

This document is for the next chat thread.

Before starting the MCP server, we should clean the Discord bot so the project does not carry old MVP command mess into the next architecture layer.

The current bot has two eras mixed together:

1. Old command-based MVP:

```text
trs login
trs my projects
trs my time
trs log
trs confirm
trs cancel
```

2. New AI + Discord identity direction:

```text
who am i
show my projects
log 4 hours today on client implementation
show missing entries for Bijaya Tiwari in May 2026
```

The product direction is now the second one.

---

## Main Cleanup Goal

Move Discord bot toward this clean architecture:

```text
Discord message
  -> pending confirmation handler
  -> AI intent parser
  -> action executor
  -> backend bot-safe API
  -> formatted response
```

Old manual commands should not remain as the main user experience.

---

## Why Clean Before MCP?

MCP will become another interface to the same backend.

If the Discord bot remains messy, MCP implementation will become confusing because there will be too many competing patterns:

```text
old JWT command path
new Discord identity path
AI action path
manual command path
MCP tool path
```

Before MCP, we want clear separation:

```text
Discord bot = natural-language interface
MCP server = tool interface
Spring Boot = source of truth
Frontend = visual dashboard
```

---

## Current Preferred Identity Direction

Use Discord identity mapping, not Discord password login.

Current mappings:

```text
Employee Discord ID = 1458399968749424784 -> emp1@example.com -> EMPLOYEE
Manager Discord ID  = 1176894455123554314 -> manager1@example.com -> MANAGER
Admin Discord ID    = 733215047114948609  -> admin1@example.com -> ADMIN
```

The bot should resolve identity through backend:

```http
GET /api/bot/identity/resolve?provider=DISCORD&providerUserId=<discord_id>
X-Bot-Service-Token: <token>
```

---

## What To Keep

Keep only lightweight diagnostic commands for developer sanity.

### Keep `trs health`

Purpose:
Check if Spring Boot backend is reachable.

Example:

```text
trs health
```

Expected:

```text
Backend says: Timer Registration API is running
```

### Keep `trs status`

Purpose:
Show bot/backend status and pending action state.

Should eventually show:

```text
Backend: Online
Discord identity: mapped/unmapped
Mapped user: Admin One (ADMIN)
Pending time entry: Yes/No
Pending AI action: Yes/No
```

### Keep `trs whoami`

Purpose:
Debug Discord identity mapping.

Example:

```text
trs whoami
```

Expected:

```text
Discord identity mapped to TRS user: Admin One
Email: admin1@example.com
Role: ADMIN
```

---

## What To Remove Or Deprecate

These were useful for MVP learning but now conflict with the natural-language direction.

### Remove/deprecate `trs login`

Reason:

- It asks for email/password in Discord.
- We now use Discord identity mapping.
- It creates old JWT session state that is no longer the main flow.

### Remove/deprecate `trs me`

Reason:

- It depends on JWT login.
- `trs whoami` is now better because it uses Discord identity mapping.

### Remove/deprecate `trs my projects`

Reason:

Natural language already handles:

```text
show my projects
what projects am I assigned to?
```

### Remove/deprecate `trs my time`

Reason:

Natural language already handles:

```text
show my time entries this week
how many hours did I log in May 2026?
```

### Remove/deprecate `trs summary`

Reason:

Should become natural-language action/report.

### Remove/deprecate `trs log`

Reason:

Natural language now handles time logging better:

```text
log 4 hours today on client implementation for API testing
```

### Remove/deprecate `trs pending`, `trs confirm`, `trs cancel`

Reason:

Pending confirmation should work through natural language:

```text
yes
confirm
cancel
no
```

No need to require command syntax.

---

## Important: Do Not Delete Everything Blindly

Recommended cleanup style:

1. First move old command handlers out of `main.ts` into a separate file.
2. Then keep only the debug commands wired in `main.ts`.
3. Then remove old session/JWT dependency if no longer used.

This avoids breaking everything at once.

---

## Proposed Clean Discord Bot Structure

Target folder structure:

```text
discord-bot/src/
  main.ts
  config.ts
  trsApi.ts
  sessionStore.ts

  commands/
    debugCommands.ts

  ai/
    aiRouter.ts
    intentParser.ts
    responseWriter.ts
    systemPrompt.ts
    conversationStore.ts
    memoryPolicy.ts

  actions/
    actionRegistry.ts
    actionPermissions.ts
    aiActionExecutor.ts

  domain/
    projects/
      projectMatcher.ts
    employees/
      employeeMatcher.ts
    timeEntries/
      dateRangeParser.ts
```

---

## Desired `main.ts` Shape

`main.ts` should become small.

Target flow:

```ts
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  if (await handleDebugCommand(message)) return;
  if (await handlePendingTimeEntryConfirmation(message)) return;
  if (await handlePendingAiActionConfirmation(message)) return;

  const history = getConversationMessages(message.author.id);
  const parsedIntent = await parseAiIntent(history, content);

  if (await executeAiAction(message, parsedIntent)) return;

  if (looksLikeTrsDataRequest(content)) {
    await message.reply("I understood this is about TRS data, but I could not safely route it...");
    return;
  }

  const aiReply = await handleAiMessage(message.author.id, content);
  await message.reply(aiReply);
});
```

No huge block of old commands inside `main.ts`.

---

## Cleanup Step-By-Step Plan

## Step 1 - Create `commands/debugCommands.ts`

Move only these commands:

```text
trs health
trs status
trs whoami
```

Function shape:

```ts
export async function handleDebugCommand(message: BotMessage): Promise<boolean> {
  const content = message.content.trim().toLowerCase();

  if (content === "trs health") {
    ...
    return true;
  }

  if (content === "trs status") {
    ...
    return true;
  }

  if (content === "trs whoami") {
    ...
    return true;
  }

  return false;
}
```

Use existing backend functions:

```ts
checkHealth
resolveExternalIdentity
```

---

## Step 2 - Remove Old Command Blocks From `main.ts`

Remove old handlers for:

```text
trs help
trs about
trs login
trs me
trs my projects
trs my time
trs summary
trs log help
trs log
trs pending
trs confirm
trs cancel
trs logout
```

Important:

Do not remove natural-language pending confirmation handlers:

```ts
handlePendingTimeEntryConfirmation
handlePendingAiActionConfirmation
```

Those are still needed.

---

## Step 3 - Simplify Imports In `main.ts`

After removing old commands, imports should be reduced.

Likely remove from `main.ts`:

```ts
axios
login
getCurrentUser
getMyProjects
getMyTimeEntries
createTimeEntry
getSession
saveSession
clearSession
getPendingTimeEntry
savePendingTimeEntry
clearPendingTimeEntry
```

Likely keep:

```ts
Client
GatewayIntentBits
config
handleAiMessage
getConversationMessages
parseAiIntent
executeAiAction
handlePendingTimeEntryConfirmation
handlePendingAiActionConfirmation
handleDebugCommand
```

---

## Step 4 - Decide What To Do With JWT Session Store

Current `sessionStore.ts` contains old JWT login session logic.

Some of it is now obsolete:

```ts
BotSession
g getSession
saveSession
clearSession
```

But pending state is still useful:

```ts
pendingTimeEntries
pendingAiActions
```

Recommended approach:

Do not delete all session code immediately.

First cleanup `main.ts`.
Then check whether any old JWT session exports are unused.
Then remove unused session code if TypeScript confirms no usage.

---

## Step 5 - Keep `trsApi.ts` Carefully

`trsApi.ts` still has both old JWT API wrappers and new bot-safe wrappers.

Old JWT wrappers may become unused:

```ts
login
getCurrentUser
getMyProjects
getMyTimeEntries
createTimeEntry
```

New bot-safe wrappers should stay:

```ts
resolveExternalIdentity
getBotMyProjects
getBotMyTimeEntries
createBotMyTimeEntry
updateBotMyTimeEntry
cancelBotMyTimeEntry
getBotUtilizationReport
getBotMissingEntriesReport
checkHealth
```

Cleanup order:

1. Remove old command usage from `main.ts`.
2. Run build.
3. Remove unused old wrappers only if safe.

---

## Step 6 - Improve `trs status`

After cleanup, `trs status` should show the new architecture state.

Suggested output:

```text
TRS Bot Status:
Backend: Online
Discord identity: Mapped
Mapped user: Admin One (ADMIN)
Pending time entry: No
Pending AI action: No
Mode: Natural-language + Discord identity
```

This helps debugging without old login commands.

---

## Step 7 - Build And Test After Each Small Change

Run:

```powershell
cd C:\TimerRegistrationSystem\discord-bot
npm run build
```

Then restart bot:

```powershell
Ctrl + C
npm run dev
```

Test:

```text
trs health
trs status
trs whoami
who am i
show my projects
missing entries for Bijaya Tiwari in May 2026
```

---

## Step 8 - Only After Cleanup, Start MCP

After Discord bot is clean:

Use:

```text
C:\TimerRegistrationSystem\MCP_IMPLEMENTATION_PLAN.md
```

Start MCP milestone 1:

```text
mcp-server scaffold
get_my_profile tool
get_my_projects tool
```

---

## What Not To Do

Do not:

```text
- Start MCP before Discord cleanup
- Connect MCP directly to PostgreSQL
- Keep password login as main Discord auth
- Let generic AI fallback pretend to fetch backend data
- Remove pending confirmation logic
- Remove bot-safe Spring Boot APIs
```

---

## Final Target Before MCP

Discord bot should feel like:

```text
User: who am i
Bot: You are Admin One, role ADMIN.

User: show my projects
Bot: Here are your projects...

User: missing entries for Bijaya Tiwari in May 2026
Bot: Missing entries for Bijaya Tiwari...

User: log 4 hours today on Client Implementation for testing
Bot: I prepared this time entry. Confirm?

User: yes
Bot: Time entry saved.
```

No need for:

```text
trs login
trs log
trs confirm
```

That is the clean natural-language direction.
# TRS Discord Bot MVP

This bot is a Discord-based companion for the Timer Registration System.

Current goal:

```text
Discord user -> TypeScript bot -> Spring Boot API -> PostgreSQL
```

The bot can authenticate through the backend, store a temporary JWT session in memory, read assigned projects/time entries, and prepare/create time entries through the backend API.

## Tech Stack

| Part | Tool |
|---|---|
| Bot runtime | Node.js |
| Bot language | TypeScript |
| Discord SDK | discord.js |
| HTTP client | axios |
| Config | dotenv |
| Backend API | Spring Boot at `http://localhost:8080` |

## Required Running Services

Before using the bot, make sure the backend and database are running.

### 1. Start PostgreSQL

From any terminal:

```powershell
docker start trs-db
```

Expected DB port:

```text
localhost:5433 -> container 5432
```

### 2. Start Spring Boot Backend

```powershell
cd C:\TimerRegistrationSystem\backend\timer-registration-api
mvn spring-boot:run
```

Backend should run at:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/api/health
```

### 3. Start Discord Bot

```powershell
cd C:\TimerRegistrationSystem\discord-bot
npm.cmd run dev
```

If PowerShell blocks `npm`, use `npm.cmd` instead of `npm`.

## Environment File

Create `discord-bot/.env`:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
TRS_API_BASE_URL=http://localhost:8080
```

Do not commit `.env`.

If the Discord token is ever exposed, rotate it in:

```text
Discord Developer Portal -> Application -> Bot -> Reset Token
```

## Current Command Reference

### Help

```text
trs help
```

Shows all supported commands.

### About

```text
trs about
```

Explains the Timer Registration System.

### Backend Health

```text
trs health
```

Calls:

```text
GET /api/health
```

Expected:

```text
Backend says: Timer Registration API is running
```

### Bot Status

```text
trs status
```

Shows a quick diagnostic summary:

```text
Backend: Online/Offline
Logged in: Yes/No
User: current session user, if logged in
Pending entry: Yes/No
```

Use this when something feels out of sync.

### Login

```text
trs login emp1@example.com password123
```

Calls:

```text
POST /api/auth/login
```

The bot stores the returned JWT in memory using the Discord user ID.

Current MVP warning:

```text
Typing passwords in a Discord channel is not production-safe.
Later we should replace this with DM login or account linking.
```

### Whoami

```text
trs whoami
```

Shows what the bot remembers in local memory.

Source of truth:

```text
Bot memory
```

### Me

```text
trs me
```

Calls:

```text
GET /api/auth/me
Authorization: Bearer <JWT>
```

Source of truth:

```text
Spring Boot backend JWT verification
```

### My Projects

```text
trs my projects
```

Calls:

```text
GET /api/projects/my
Authorization: Bearer <JWT>
```

Shows assigned projects with IDs and project codes.

Use this before logging time so you know the project ID/code.

### My Time Entries

Default last 7 days:

```text
trs my time
```

Today only:

```text
trs my time today
```

Yesterday only:

```text
trs my time yesterday
```

Custom range:

```text
trs my time 2026-05-20 2026-05-31
```

Calls:

```text
GET /api/time-entries/my?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Authorization: Bearer <JWT>
```

### Time Summary

Today by default:

```text
trs summary
```

Specific day:

```text
trs summary today
trs summary yesterday
```

Custom range:

```text
trs summary 2026-05-20 2026-05-31
```

The bot calculates:

```text
total hours
hours grouped by project
```

### Log Help

```text
trs log help
```

Shows examples for preparing and confirming time entries.

### Prepare Time Entry

Using project code:

```text
trs log 2 PRJ-008 today worked on API
```

Using project ID:

```text
trs log 2 4 2026-06-02 worked on API
```

Using yesterday:

```text
trs log 1.5 PRJ-008 yesterday fixed bug
```

Important:

```text
trs log does not save immediately.
It creates a pending time entry draft.
```

### Show Pending Entry

```text
trs pending
```

Shows the current pending time entry draft.

### Confirm Entry

```text
trs confirm
```

Calls:

```text
POST /api/time-entries
Authorization: Bearer <JWT>
```

Actually creates the time entry.

### Cancel Entry

```text
trs cancel
```

Deletes the pending draft from bot memory.

### Logout

```text
trs logout
```

Clears the user's bot memory session and pending draft.

## Recommended Testing Flow

```text
trs health
trs status
trs login emp1@example.com password123
trs me
trs my projects
trs my time today
trs summary today
trs log help
trs log 1 PRJ-008 today testing from Discord
trs pending
trs confirm
trs my time today
trs summary today
trs logout
```

If duplicate entry error appears, use another date or project.

Backend prevents duplicate entries for:

```text
same user + same project + same date
```

## Current Storage Model

The bot stores sessions in memory:

```text
Discord user ID -> JWT + user info
```

File:

```text
src/sessionStore.ts
```

This means:

```text
If the bot restarts, login sessions disappear.
```

This is acceptable for MVP.

Later options:

```text
Redis
PostgreSQL table
encrypted local store
proper account linking
```

## Known Limitations

| Limitation | Current Status |
|---|---|
| Password typed in Discord | MVP only, not production-safe |
| Sessions stored in memory | Lost on restart |
| No natural language AI yet | Commands are structured |
| No slash commands yet | Uses normal text messages |
| No refresh token handling | User logs in again after session reset/token expiry |
| One pending entry per Discord user | New draft replaces old draft |

## Architecture Notes

The bot does not write directly to PostgreSQL.

Correct flow:

```text
Discord bot -> Spring Boot API -> PostgreSQL
```

Why:

```text
Spring Boot owns authentication, validation, roles, audit logs, and business rules.
```

## Next Roadmap

Suggested next improvements:

1. Move login to DM or account-linking flow.
2. Add `trs summary this week`.
3. Add slash commands.
4. Add natural-language parsing.
5. Add AI command such as `trs ask ...`.
6. Persist Discord user sessions securely.
7. Add manager/report commands.

## Useful Local Ports

| Service | Port |
|---|---:|
| Spring Boot API | 8080 |
| PostgreSQL Docker host port | 5433 |
| Next.js frontend | 3000 |
| Discord bot | No local listening port |

See also:

```text
C:\TimerRegistrationSystem\docs\PORTS_AND_RUNBOOK.md
```

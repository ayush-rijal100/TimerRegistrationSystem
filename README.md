# Timer Registration System

Full-stack Timer Registration System with:
- `frontend` (UI)
- `backend/timer-registration-api` (Spring Boot API)
- `postgres` (via Docker Compose)

## Project Structure

```text
TimerRegistrationSystem/
  backend/
    timer-registration-api/
  frontend/
  db/
    01_schema.sql
    02_seed.sql
  docker-compose.release.yml
  .env.release.example
```

## Prerequisites

- Git
- Docker Desktop (Linux containers mode)
- Node.js + npm (for local frontend development)
- Java 17+ and Maven (for local backend development)

## Environment Setup (Release Compose)

1. Create runtime env file:

```powershell
Copy-Item .env.release.example .env.release
```

2. Edit `.env.release` with real values:

```env
POSTGRES_DB=trs_db
POSTGRES_USER=trs_user
POSTGRES_PASSWORD=change_this_to_a_strong_password
```

Notes:
- `.env.release` is runtime-only and should never be committed.
- `.env.release.example` is safe to commit (template only).

## Run with Docker Compose (Recommended)

Start all services:

```powershell
docker compose --env-file .env.release -f docker-compose.release.yml up -d
```

Check status:

```powershell
docker compose --env-file .env.release -f docker-compose.release.yml ps
```

Check logs:

```powershell
docker compose --env-file .env.release -f docker-compose.release.yml logs trs-db
docker compose --env-file .env.release -f docker-compose.release.yml logs trs-api
docker compose --env-file .env.release -f docker-compose.release.yml logs trs-frontend
```

Stop services:

```powershell
docker compose --env-file .env.release -f docker-compose.release.yml down
```

Stop and delete volumes (fresh DB reset):

```powershell
docker compose --env-file .env.release -f docker-compose.release.yml down -v
```

## Default Ports

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:8081`
- Postgres: `localhost:5433`

## Local Development (Without Compose)

### Backend

```powershell
cd backend/timer-registration-api
mvn spring-boot:run
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## GitHub Push Checklist

Commit:
- source code
- `docker-compose.release.yml`
- `.env.release.example`
- SQL files in `db/`
- `.gitignore`, `.gitattributes`, `README.md`

Do NOT commit:
- `.env.release`
- `frontend/.env.local`
- `node_modules/`
- build outputs (`target/`, `build/`, `.next/`)
- local DB data/volumes

Useful check before commit:

```powershell
git status
```

## Security Notes

- Never hardcode secrets in `docker-compose` or source code.
- Rotate credentials immediately if a secret was pushed by mistake.
- Use strong passwords in `.env.release`.
- Use versioned Docker image tags (for example `1.0.0`) instead of only `latest`.


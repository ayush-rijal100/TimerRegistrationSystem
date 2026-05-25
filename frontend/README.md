# Time Registration System Frontend

Next.js frontend for the Phase 1 Time Registration System MVP.

## Stack

- Next.js App Router
- TypeScript
- Redux Toolkit and RTK Query
- shadcn/ui
- Tailwind CSS
- Spring Boot API on `http://localhost:8080`

## Environment

The frontend reads the backend URL from:

```text
.env.local
```

Expected value:

```properties
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Run Locally

Start the backend first:

```powershell
cd C:\TimerRegistrationSystem\backend\timer-registration-api
mvn.cmd "-Dspring-boot.run.jvmArguments=-Duser.timezone=UTC" spring-boot:run
```

Start the frontend in another terminal:

```powershell
cd C:\TimerRegistrationSystem\frontend
npm.cmd run dev
```

Open:

```text
http://localhost:3000/login
```

## Test Accounts

```text
Employee: emp1@example.com / password123
Manager:  manager1@example.com / password123
Admin:    admin1@example.com / password123
```

## Demo Flow

1. Login as employee.
2. Open `/employee/timesheet`.
3. Create a time entry.
4. Review Daily, Weekly, and Monthly views.
5. Edit the created entry.
6. Logout.
7. Login as manager.
8. Open `/manager/reports`.
9. Review project hours, utilization, and missing entries.
10. Logout.
11. Login as admin.
12. Open `/admin`.
13. Create a user.
14. Create a project.
15. Assign a user to a project.

## Useful Commands

```powershell
npm.cmd run lint
npm.cmd run build
```

Use `npm.cmd` instead of `npm` in PowerShell if script execution policy blocks `npm.ps1`.

## Main Routes

```text
/login
/employee/timesheet
/manager/reports
/admin
```

`/` redirects based on stored login state and role.

## Notes

- JWT and user details are stored in `localStorage` for this MVP.
- Protected pages use `RequireRole`.
- API calls use RTK Query from `src/lib/features/api/apiSlice.ts`.
- Shared authenticated layout is in `src/components/layout/AppShell.tsx`.

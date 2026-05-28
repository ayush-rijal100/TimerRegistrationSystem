"use client";

import { RequireRole } from "@/components/auth/RequireRole";
import { AppShell } from "@/components/layout/AppShell";

export default function TimesheetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole allowedRoles={["EMPLOYEE"]}>
      {(user) => (
        <AppShell
          pageDescription="Register project hours and review your entries."
          pageTitle="Employee Timesheet"
          user={user}
        >
          {children}
        </AppShell>
      )}
    </RequireRole>
  );
}

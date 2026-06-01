"use client";

import { RequireRole } from "@/components/auth/RequireRole";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineError } from "@/components/common/InlineFeedback";
import { LoadingState } from "@/components/common/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGetMyProjectsQuery } from "@/lib/features/api/apiSlice";
import { getApiErrorMessage } from "@/lib/apiError";

export function MyProjectsClient() {
  return (
    <RequireRole allowedRoles={["EMPLOYEE"]}>
      {(user) => (
        <AppShell
          pageDescription="View all projects you are currently assigned to."
          pageTitle="My Projects"
          user={user}
        >
          <MyProjectsContent />
        </AppShell>
      )}
    </RequireRole>
  );
}

function MyProjectsContent() {
  const { data: projects, isFetching, error } = useGetMyProjectsQuery();

  if (isFetching && !projects) {
    return <LoadingState text="Loading your projects..." />;
  }

  if (error) {
    return <InlineError message={getApiErrorMessage(error)} />;
  }

  if (!projects || projects.length === 0) {
    return <EmptyState text="You are not assigned to any projects." />;
  }

  return (
    <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Assigned Projects</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          You can log time against any of the active projects listed below.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Code</TableHead>
                <TableHead>Project Name</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.projectCode}</TableCell>
                  <TableCell>{project.projectName}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={project.active ? "secondary" : "outline"}>
                      {project.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { UserPlus, FolderPlus, LinkIcon, Users, Folder, ShieldCheck, History, Download, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineError, InlineSuccess } from "@/components/common/InlineFeedback";
import { LoadingState } from "@/components/common/LoadingState";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/apiError";
import { exportCsv } from "@/lib/exportCsv";
import {
  useAssignUserProjectMutation,
  useCreateProjectMutation,
  useCreateUserMutation,
  useGetAdminProjectsQuery,
  useGetUsersQuery,
  useUpdateUserStatusMutation,
  useGetAuditLogsQuery,
} from "@/lib/features/api/apiSlice";
import type { ProjectResponse, UserResponse, UserRole } from "@/lib/types";

const roles: UserRole[] = ["EMPLOYEE", "MANAGER", "ADMIN"];

export function AdminClient() {
  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      {(user) => (
        <AppShell
          pageDescription="Manage users, projects, and project assignments."
          pageTitle="Admin Dashboard"
          user={user}
        >
          <AdminContent />
        </AppShell>
      )}
    </RequireRole>
  );
}

function AdminContent() {
  const users = useGetUsersQuery();
  const projects = useGetAdminProjectsQuery();

  const [draftAuditStart, setDraftAuditStart] = useState("");
  const [draftAuditEnd, setDraftAuditEnd] = useState("");
  const [auditRange, setAuditRange] = useState<{ startDate?: string; endDate?: string }>({});

  const auditLogs = useGetAuditLogsQuery(
    auditRange.startDate && auditRange.endDate
      ? { startDate: auditRange.startDate, endDate: auditRange.endDate }
      : undefined
  );

  const [createUser, createUserState] = useCreateUserMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [createProject, createProjectState] = useCreateProjectMutation();
  const [assignUserProject, assignState] = useAssignUserProjectMutation();

  const [userMessage, setUserMessage] = useState("");
  const [projectMessage, setProjectMessage] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const isRefreshing = users.isFetching || projects.isFetching || auditLogs.isFetching;

  function applyAuditFilter() {
    if (draftAuditStart && draftAuditEnd) {
      setAuditRange({ startDate: draftAuditStart, endDate: draftAuditEnd });
    } else {
      setAuditRange({});
    }
  }

  function clearAuditFilter() {
    setDraftAuditStart("");
    setDraftAuditEnd("");
    setAuditRange({});
  }

  function handleExportAuditLogs() {
    if (!auditLogs.data) return;
    const headers = [
      "ID",
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "Details"
    ];
    const rows = auditLogs.data.map((row) => [
      String(row.id),
      new Date(row.createdAt).toLocaleString(),
      row.actorName,
      row.actorEmail,
      row.action,
      row.entityType,
      String(row.entityId),
      formatMetaJson(row.metaJson)
    ]);
    const filename = auditRange.startDate && auditRange.endDate
      ? `audit-logs-${auditRange.startDate}-to-${auditRange.endDate}.csv`
      : "audit-logs-recent.csv";
    exportCsv(filename, headers, rows);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Users" value={String(users.data?.length ?? 0)} icon={Users} />
        <MetricCard label="Projects" value={String(projects.data?.length ?? 0)} icon={Folder} />
        <MetricCard label="Status" value={isRefreshing ? "Refreshing" : "Ready"} icon={ShieldCheck} />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-5 w-full justify-start overflow-x-auto">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Users</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Employees, managers, and admins.</CardDescription>
            </div>
            <Badge variant="secondary">{users.data?.length ?? 0} users</Badge>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {users.isFetching ? (
              <div className="mb-4">
                <LoadingState text="Loading users..." />
              </div>
            ) : null}
            {users.error ? (
              <InlineError message={getApiErrorMessage(users.error)} />
            ) : (
              <UsersTable 
                rows={users.data ?? []} 
                onToggleStatus={async (id, currentStatus) => {
                  try {
                    await updateUserStatus({ id, isActive: !currentStatus }).unwrap();
                  } catch (err) {
                    // RTK Query exposes the error, but we could add toast/alert here
                    console.error("Failed to update user status", err);
                  }
                }}
              />
            )}
          </CardContent>
            </Card>

            <CreateUserCard
              error={createUserState.error}
              isLoading={createUserState.isLoading}
              message={userMessage}
              onSubmit={async (event) => {
                event.preventDefault();
                setUserMessage("");
                const form = new FormData(event.currentTarget);

                try {
                  await createUser({
                    fullName: String(form.get("fullName") ?? ""),
                    email: String(form.get("email") ?? ""),
                    password: String(form.get("password") ?? ""),
                    role: String(form.get("role") ?? "EMPLOYEE") as UserRole,
                  }).unwrap();
                  event.currentTarget.reset();
                  setUserMessage("User created.");
                } catch {
                  // RTK Query exposes the backend error through mutation state.
                }
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Projects</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Active project master data.</CardDescription>
            </div>
            <Badge variant="secondary">{projects.data?.length ?? 0} projects</Badge>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {projects.isFetching ? (
              <div className="mb-4">
                <LoadingState text="Loading projects..." />
              </div>
            ) : null}
            {projects.error ? (
              <InlineError message={getApiErrorMessage(projects.error)} />
            ) : (
              <ProjectsTable rows={projects.data ?? []} />
            )}
          </CardContent>
            </Card>

            <CreateProjectCard
              error={createProjectState.error}
              isLoading={createProjectState.isLoading}
              message={projectMessage}
              onSubmit={async (event) => {
                event.preventDefault();
                setProjectMessage("");
                const form = new FormData(event.currentTarget);

                try {
                  await createProject({
                    projectCode: String(form.get("projectCode") ?? ""),
                    projectName: String(form.get("projectName") ?? ""),
                  }).unwrap();
                  event.currentTarget.reset();
                  setProjectMessage("Project created.");
                } catch {
                  // RTK Query exposes the backend error through mutation state.
                }
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="w-full max-w-xl">
            <AssignProjectCard
            error={assignState.error}
            isLoading={assignState.isLoading}
            message={assignmentMessage}
            projects={projects.data ?? []}
            users={users.data ?? []}
            onSubmit={async (assignment) => {
              setAssignmentMessage("");

              try {
                const response = await assignUserProject(assignment).unwrap();
                setAssignmentMessage(response.message);
              } catch {
                // RTK Query exposes the backend error through mutation state.
              }
            }}
            />
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Audit Logs</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Recent administrative and timesheet changes.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportAuditLogs}
                  disabled={auditLogs.isFetching || !auditLogs.data || auditLogs.data.length === 0}
                >
                  <Download className="mr-2 size-4" />
                  Export CSV
                </Button>
                <Badge variant="secondary">{auditLogs.data?.length ?? 0} logs</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6">
              {/* Filter Row */}
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] items-end bg-accent/30 p-4 rounded-lg border border-border">
                <div className="space-y-2">
                  <Label htmlFor="audit-start-date">Start date</Label>
                  <Input
                    id="audit-start-date"
                    onChange={(event) => setDraftAuditStart(event.target.value)}
                    type="date"
                    value={draftAuditStart}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-end-date">End date</Label>
                  <Input
                    id="audit-end-date"
                    onChange={(event) => setDraftAuditEnd(event.target.value)}
                    type="date"
                    value={draftAuditEnd}
                  />
                </div>
                <Button onClick={applyAuditFilter} disabled={!draftAuditStart || !draftAuditEnd}>
                  <Search className="size-4 mr-1" />
                  Apply
                </Button>
                <Button variant="outline" onClick={clearAuditFilter} disabled={!draftAuditStart && !draftAuditEnd}>
                  Clear
                </Button>
              </div>

              {auditLogs.isFetching ? (
                <div className="mb-4">
                  <LoadingState text="Loading audit logs..." />
                </div>
              ) : null}
              {auditLogs.error ? (
                <InlineError message={getApiErrorMessage(auditLogs.error)} />
              ) : (
                <AuditLogsTable rows={auditLogs.data ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: any;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
      {Icon && (
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
      )}
    </div>
  );
}

function UsersTable({ 
  rows,
  onToggleStatus 
}: { 
  rows: UserResponse[];
  onToggleStatus: (id: number, currentStatus: boolean) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState text="No users found." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.id}</TableCell>
            <TableCell className="font-medium">{user.fullName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant="secondary">{user.role}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={user.active ? "default" : "outline"}>
                {user.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button 
                onClick={() => onToggleStatus(user.id, user.active)} 
                size="sm" 
                variant={user.active ? "destructive" : "default"}
              >
                {user.active ? "Deactivate" : "Activate"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}

function ProjectsTable({ rows }: { rows: ProjectResponse[] }) {
  if (rows.length === 0) {
    return <EmptyState text="No projects found." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((project) => (
          <TableRow key={project.id}>
            <TableCell>{project.id}</TableCell>
            <TableCell className="font-medium">{project.projectCode}</TableCell>
            <TableCell>{project.projectName}</TableCell>
            <TableCell>{project.active ? "Active" : "Inactive"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}

function CreateUserCard({
  error,
  isLoading,
  message,
  onSubmit,
}: {
  error: unknown;
  isLoading: boolean;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Create user</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Add a new account with a role.</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <FieldInput label="Full name" name="fullName" required />
          <FieldInput label="Email" name="email" required type="email" />
          <FieldInput label="Password" name="password" required type="password" />
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              className="h-10 w-full rounded-lg border border-input bg-[#fbfcfc] px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue="EMPLOYEE"
              id="role"
              name="role"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          {error ? <InlineError message={getApiErrorMessage(error)} /> : null}
          {message ? <InlineSuccess message={message} /> : null}
          <Button disabled={isLoading} type="submit">
            <UserPlus className="size-4" />
            {isLoading ? "Creating..." : "Create user"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateProjectCard({
  error,
  isLoading,
  message,
  onSubmit,
}: {
  error: unknown;
  isLoading: boolean;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Create project</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Add project master data.</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <FieldInput label="Project code" name="projectCode" required />
          <FieldInput label="Project name" name="projectName" required />
          {error ? <InlineError message={getApiErrorMessage(error)} /> : null}
          {message ? <InlineSuccess message={message} /> : null}
          <Button disabled={isLoading} type="submit">
            <FolderPlus className="size-4" />
            {isLoading ? "Creating..." : "Create project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AssignProjectCard({
  error,
  isLoading,
  message,
  onSubmit,
  projects,
  users,
}: {
  error: unknown;
  isLoading: boolean;
  message: string;
  onSubmit: (assignment: { userId: number; projectId: number }) => void;
  projects: ProjectResponse[];
  users: UserResponse[];
}) {
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ userId: Number(userId), projectId: Number(projectId) });
  }

  return (
    <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Assign project</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Connect a user to an active project.</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>User</Label>
            <Select
              onValueChange={(value) => {
                if (value) {
                  setUserId(value);
                }
              }}
              required
              value={userId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-3rem)]">
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.fullName} - {user.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              onValueChange={(value) => {
                if (value) {
                  setProjectId(value);
                }
              }}
              required
              value={projectId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-3rem)]">
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.projectCode} - {project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? <InlineError message={getApiErrorMessage(error)} /> : null}
          {message ? <InlineSuccess message={message} /> : null}
          <Button
            className="w-full sm:w-auto"
            disabled={isLoading || !userId || !projectId}
            type="submit"
          >
            <LinkIcon className="size-4" />
            {isLoading ? "Assigning..." : "Assign project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldInput({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required={required} type={type} />
    </div>
  );
}

function formatMetaJson(metaJson: string) {
  try {
    const parsed = JSON.parse(metaJson);
    return Object.entries(parsed)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");
  } catch {
    return metaJson;
  }
}

function AuditLogsTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return <EmptyState text="No audit logs found." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {new Date(row.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="font-medium text-sm">{row.actorName}</div>
                <div className="text-xs text-muted-foreground">{row.actorEmail}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs uppercase">
                  {row.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-semibold text-muted-foreground">{row.entityType}</span>{" "}
                <span className="text-xs text-muted-foreground">#{row.entityId}</span>
              </TableCell>
              <TableCell className="text-xs font-mono max-w-xs truncate" title={row.metaJson}>
                {formatMetaJson(row.metaJson)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { Search, Clock3, Percent, AlertCircle, Download } from "lucide-react";
import { useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineError } from "@/components/common/InlineFeedback";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  useGetMissingEntriesReportQuery,
  useGetProjectHoursReportQuery,
  useGetUtilizationReportQuery,
} from "@/lib/features/api/apiSlice";
import { getEndOfMonth, getStartOfMonth, toDateInputValue } from "@/lib/dates";
import { exportCsv } from "@/lib/exportCsv";

export function ManagerReportsClient({ activeView }: { activeView: "project-hours" | "utilization" | "missing" }) {
  return (
    <RequireRole allowedRoles={["MANAGER", "ADMIN"]}>
      {(user) => (
        <AppShell
          pageDescription="Monitor project allocation, utilization, and missing timesheet submissions."
          pageTitle="Manager Reports"
          user={user}
        >
          <ManagerReportsContent activeView={activeView} />
        </AppShell>
      )}
    </RequireRole>
  );
}

function ManagerReportsContent({ activeView }: { activeView: "project-hours" | "utilization" | "missing" }) {
  const today = new Date();
  const [draftStartDate, setDraftStartDate] = useState(
    toDateInputValue(getStartOfMonth(today))
  );
  const [draftEndDate, setDraftEndDate] = useState(
    toDateInputValue(getEndOfMonth(today))
  );
  const [range, setRange] = useState({
    startDate: draftStartDate,
    endDate: draftEndDate,
  });

  const projectHours = useGetProjectHoursReportQuery(range);
  const utilization = useGetUtilizationReportQuery(range);
  const missingEntries = useGetMissingEntriesReportQuery(range);
  const isRefreshing =
    projectHours.isFetching || utilization.isFetching || missingEntries.isFetching;
  const totalProjectHours =
    projectHours.data?.reduce((total, row) => total + row.totalHours, 0) ?? 0;
  const averageUtilization = utilization.data?.length
    ? utilization.data.reduce((total, row) => total + row.utilizationPercent, 0) /
      utilization.data.length
    : 0;
  const missingEmployeeCount =
    missingEntries.data?.filter((row) => row.missingDates.length > 0).length ?? 0;

  function applyRange() {
    setRange({ startDate: draftStartDate, endDate: draftEndDate });
  }

  function handleExportProjectHours() {
    if (!projectHours.data) return;
    const headers = ["Project Code", "Project Name", "Total Hours"];
    const rows = projectHours.data.map((row) => [
      row.projectCode,
      row.projectName,
      row.totalHours.toFixed(2),
    ]);
    exportCsv(`project-hours-${range.startDate}-to-${range.endDate}.csv`, headers, rows);
  }

  function handleExportUtilization() {
    if (!utilization.data) return;
    const headers = ["Employee Name", "Total Hours", "Expected Hours", "Utilization %"];
    const rows = utilization.data.map((row) => [
      row.fullName,
      row.totalHours.toFixed(2),
      row.expectedHours.toFixed(2),
      row.utilizationPercent.toFixed(1),
    ]);
    exportCsv(`utilization-${range.startDate}-to-${range.endDate}.csv`, headers, rows);
  }

  function handleExportMissingEntries() {
    if (!missingEntries.data) return;
    const headers = ["Employee Name", "Missing Date Count", "Missing Dates"];
    const rows = missingEntries.data.map((row) => [
      row.fullName,
      String(row.missingDates.length),
      row.missingDates.join("; "),
    ]);
    exportCsv(`missing-entries-${range.startDate}-to-${range.endDate}.csv`, headers, rows);
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Report filters</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Review reporting data for a selected date range.
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {isRefreshing ? "Refreshing" : `${range.startDate} to ${range.endDate}`}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start date</Label>
            <Input
              id="start-date"
              onChange={(event) => setDraftStartDate(event.target.value)}
              type="date"
              value={draftStartDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End date</Label>
            <Input
              id="end-date"
              onChange={(event) => setDraftEndDate(event.target.value)}
              type="date"
              value={draftEndDate}
            />
          </div>
          <Button onClick={applyRange}>
            <Search className="size-4" />
            Apply
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Project hours" value={`${totalProjectHours.toFixed(2)}h`} icon={Clock3} />
        <MetricCard
          label="Avg utilization"
          value={`${averageUtilization.toFixed(1)}%`}
          icon={Percent}
        />
        <MetricCard label="Missing submitters" value={String(missingEmployeeCount)} icon={AlertCircle} />
      </div>

      <div className="mt-6">
        {activeView === "project-hours" && (
          <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
          <CardHeader className="flex flex-row items-start justify-between px-6 pt-6 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Project hours</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Total hours grouped by project.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportProjectHours}
              disabled={projectHours.isFetching || !projectHours.data || projectHours.data.length === 0}
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {projectHours.isFetching ? (
              <div className="mb-4">
                <LoadingState text="Loading project hours..." />
              </div>
            ) : null}
            {projectHours.error ? (
              <InlineError message={getApiErrorMessage(projectHours.error)} />
            ) : (
              <ProjectHoursTable rows={projectHours.data ?? []} />
            )}
          </CardContent>
          </Card>
        )}

        {activeView === "utilization" && (
          <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
          <CardHeader className="flex flex-row items-start justify-between px-6 pt-6 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Utilization</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Employee hours compared against expected working hours.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportUtilization}
              disabled={utilization.isFetching || !utilization.data || utilization.data.length === 0}
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {utilization.isFetching ? (
              <div className="mb-4">
                <LoadingState text="Loading utilization..." />
              </div>
            ) : null}
            {utilization.error ? (
              <InlineError message={getApiErrorMessage(utilization.error)} />
            ) : (
              <UtilizationTable rows={utilization.data ?? []} />
            )}
          </CardContent>
          </Card>
        )}

        {activeView === "missing" && (
          <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
        <CardHeader className="flex flex-row items-start justify-between px-6 pt-6 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Missing entries</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Employees with dates missing from their timesheet.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportMissingEntries}
            disabled={missingEntries.isFetching || !missingEntries.data || missingEntries.data.length === 0}
          >
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {missingEntries.isFetching ? (
            <div className="mb-4">
              <LoadingState text="Loading missing entries..." />
            </div>
          ) : null}
          {missingEntries.error ? (
            <InlineError message={getApiErrorMessage(missingEntries.error)} />
          ) : (
            <MissingEntriesTable rows={missingEntries.data ?? []} />
          )}
        </CardContent>
          </Card>
        )}
      </div>
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

function ProjectHoursTable({
  rows,
}: {
  rows: Array<{
    projectId: number;
    projectCode: string;
    projectName: string;
    totalHours: number;
  }>;
}) {
  if (rows.length === 0) {
    return <EmptyState text="No project hours found for this range." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead className="text-right">Total hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.projectId}>
            <TableCell>
              <p className="font-medium">{row.projectCode}</p>
              <p className="text-sm text-muted-foreground">{row.projectName}</p>
            </TableCell>
            <TableCell className="text-right">
              {row.totalHours.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}

function UtilizationTable({
  rows,
}: {
  rows: Array<{
    userId: number;
    fullName: string;
    totalHours: number;
    expectedHours: number;
    utilizationPercent: number;
  }>;
}) {
  if (rows.length === 0) {
    return <EmptyState text="No utilization rows found for this range." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Expected</TableHead>
          <TableHead className="text-right">Utilization</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.userId}>
            <TableCell className="font-medium">{row.fullName}</TableCell>
            <TableCell>{row.totalHours.toFixed(2)}h</TableCell>
            <TableCell>{row.expectedHours.toFixed(2)}h</TableCell>
            <TableCell className="text-right">
              <Badge variant={row.utilizationPercent < 80 ? "outline" : "secondary"}>
                {row.utilizationPercent.toFixed(1)}%
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}

function MissingEntriesTable({
  rows,
}: {
  rows: Array<{
    userId: number;
    fullName: string;
    missingDates: string[];
  }>;
}) {
  if (rows.length === 0) {
    return <EmptyState text="No missing entry data found for this range." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Missing dates</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.userId}>
            <TableCell className="font-medium">{row.fullName}</TableCell>
            <TableCell>
              {row.missingDates.length ? (
                <div className="flex flex-wrap gap-2">
                  {row.missingDates.slice(0, 12).map((date) => (
                    <Badge key={date} variant="outline">
                      {date}
                    </Badge>
                  ))}
                  {row.missingDates.length > 12 ? (
                    <Badge variant="secondary">
                      +{row.missingDates.length - 12} more
                    </Badge>
                  ) : null}
                </div>
              ) : (
                <Badge variant="secondary">Complete</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}

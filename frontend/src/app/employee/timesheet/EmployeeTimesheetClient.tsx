"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Clock3, Activity } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  useCreateTimeEntryMutation,
  useGetMyProjectsQuery,
  useGetMyTimeEntriesQuery,
  useUpdateTimeEntryMutation,
} from "@/lib/features/api/apiSlice";
import {
  formatShortDate,
  formatWeekday,
  getDaysBetween,
  getEndOfMonth,
  getEndOfWeek,
  getStartOfMonth,
  getStartOfWeek,
  toDateInputValue,
} from "@/lib/dates";
import type { TimeEntryResponse } from "@/lib/types";

export function EmployeeTimesheetClient() {
  return (
    <RequireRole allowedRoles={["EMPLOYEE"]}>
      {(user) => (
        <AppShell
          pageDescription="Register project hours and review your daily, weekly, and monthly entries."
          pageTitle="Employee Timesheet"
          user={user}
        >
          <EmployeeTimesheetContent />
        </AppShell>
      )}
    </RequireRole>
  );
}

function EmployeeTimesheetContent() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today));
  const [projectId, setProjectId] = useState("");
  const [hours, setHours] = useState("8");
  const [notes, setNotes] = useState("");
  const [editingEntry, setEditingEntry] = useState<TimeEntryResponse | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("entry");
  const [message, setMessage] = useState("");
  const selectedDateObject = new Date(selectedDate);

  const monthStart = toDateInputValue(getStartOfMonth(selectedDateObject));
  const monthEnd = toDateInputValue(getEndOfMonth(selectedDateObject));
  const weekDays = getDaysBetween(
    getStartOfWeek(selectedDateObject),
    getEndOfWeek(selectedDateObject)
  );
  const monthDays = getDaysBetween(
    getStartOfMonth(selectedDateObject),
    getEndOfMonth(selectedDateObject)
  );

  const {
    data: projects = [],
    error: projectsError,
    isLoading: projectsLoading,
  } = useGetMyProjectsQuery();
  const {
    data: entries = [],
    error: entriesError,
    isFetching: entriesFetching,
  } = useGetMyTimeEntriesQuery({ startDate: monthStart, endDate: monthEnd });
  const [createEntry, createState] = useCreateTimeEntryMutation();
  const [updateEntry, updateState] = useUpdateTimeEntryMutation();

  const selectedDateEntries = entries.filter(
    (entry) => entry.entryDate === selectedDate
  );
  const totalMonthHours = entries.reduce((total, entry) => total + entry.hours, 0);
  const totalWeekHours = weekDays.reduce(
    (total, day) =>
      total + getEntriesForDate(entries, toDateInputValue(day)).totalHours,
    0
  );
  const mutationError = createState.error ?? updateState.error;
  const isSaving = createState.isLoading || updateState.isLoading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const entry = {
      projectId: Number(projectId),
      entryDate: selectedDate,
      hours: Number(hours),
      notes: notes.trim() || undefined,
    };

    try {
      if (editingEntry) {
        await updateEntry({ id: editingEntry.id, entry }).unwrap();
        setMessage("Time entry updated.");
      } else {
        await createEntry(entry).unwrap();
        setMessage("Time entry created.");
      }

      resetForm();
    } catch {
      // RTK Query exposes the backend error through mutation state.
    }
  }

  function startEditing(entry: TimeEntryResponse) {
    setEditingEntry(entry);
    setSelectedDate(entry.entryDate);
    setProjectId(String(entry.projectId));
    setHours(String(entry.hours));
    setNotes(entry.notes ?? "");
    setMessage("");
    setActiveTab("entry");
  }

  function resetForm() {
    setEditingEntry(null);
    setProjectId("");
    setHours("8");
    setNotes("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Selected day" value={formatShortDate(selectedDate)} icon={CalendarDays} />
        <MetricCard label="Week total" value={`${totalWeekHours.toFixed(2)}h`} icon={Activity} />
        <MetricCard label="Month total" value={`${totalMonthHours.toFixed(2)}h`} icon={Clock3} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="entry">Entry Form</TabsTrigger>
          <TabsTrigger value="views">Timesheet Views</TabsTrigger>
        </TabsList>

        <TabsContent value="entry">
          <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)] max-w-2xl">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">{editingEntry ? "Update entry" : "Create entry"}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Select a project, date, and hours worked.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="entry-date">Date</Label>
                <Input
                  id="entry-date"
                  onChange={(event) => setSelectedDate(event.target.value)}
                  required
                  type="date"
                  value={selectedDate}
                />
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  disabled={projectsLoading}
                  onValueChange={(value) => {
                    if (value) {
                      setProjectId(value);
                    }
                  }}
                  required
                  value={projectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assigned project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.projectCode} - {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  max="24"
                  min="0.25"
                  onChange={(event) => setHours(event.target.value)}
                  required
                  step="0.25"
                  type="number"
                  value={hours}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Work summary, blocker, or handoff note"
                  value={notes}
                />
              </div>

              {projectsError ? (
                <InlineError message={getApiErrorMessage(projectsError)} />
              ) : null}
              {mutationError ? (
                <InlineError message={getApiErrorMessage(mutationError)} />
              ) : null}
              {message ? <InlineSuccess message={message} /> : null}

              <div className="flex gap-2">
                <Button className="flex-1" disabled={isSaving} type="submit">
                  {editingEntry ? (
                    <Pencil className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {isSaving
                    ? "Saving..."
                    : editingEntry
                      ? "Update entry"
                      : "Create entry"}
                </Button>
                {editingEntry ? (
                  <Button onClick={resetForm} type="button" variant="outline">
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="views">
          <Card className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Timesheet views</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Switch between daily focus, weekly summary, and monthly overview.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {entriesFetching ? "Refreshing" : `${entries.length} entries`}
            </Badge>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {projectsLoading ? (
              <div className="mb-4">
                <LoadingState text="Loading assigned projects..." />
              </div>
            ) : null}
            {entriesFetching ? (
              <div className="mb-4">
                <LoadingState text="Refreshing timesheet entries..." />
              </div>
            ) : null}
            {entriesError ? (
              <InlineError message={getApiErrorMessage(entriesError)} />
            ) : null}

            <Tabs defaultValue="daily">
              <TabsList className="mb-5">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <DailyView entries={selectedDateEntries} onEdit={startEditing} />
              </TabsContent>

              <TabsContent value="weekly">
                <WeeklyView days={weekDays} entries={entries} />
              </TabsContent>

              <TabsContent value="monthly">
                <MonthlyView days={monthDays} entries={entries} />
              </TabsContent>
            </Tabs>
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

function DailyView({
  entries,
  onEdit,
}: {
  entries: TimeEntryResponse[];
  onEdit: (entry: TimeEntryResponse) => void;
}) {
  if (entries.length === 0) {
    return <EmptyState text="No entries for the selected date yet." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Hours</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <p className="font-medium">{entry.projectCode}</p>
              <p className="text-sm text-muted-foreground">{entry.projectName}</p>
            </TableCell>
            <TableCell>{entry.hours.toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant="secondary">{entry.status}</Badge>
            </TableCell>
            <TableCell className="max-w-[260px] truncate">
              {entry.notes ?? "-"}
            </TableCell>
            <TableCell className="text-right">
              <Button onClick={() => onEdit(entry)} size="sm" variant="outline">
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}

function WeeklyView({
  days,
  entries,
}: {
  days: Date[];
  entries: TimeEntryResponse[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day) => {
        const dateKey = toDateInputValue(day);
        const summary = getEntriesForDate(entries, dateKey);

        return (
          <div className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]" key={dateKey}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {formatWeekday(day)}
            </p>
            <p className="mt-1 text-xs font-semibold text-foreground/75">{formatShortDate(day)}</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {summary.totalHours.toFixed(1)}h
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground/60">
              {summary.count} entries
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyView({
  days,
  entries,
}: {
  days: Date[];
  entries: TimeEntryResponse[];
}) {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Calculate padding blocks for Monday-first calendar
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  const firstDay = days.length > 0 ? days[0] : new Date();
  const firstDayIndex = (firstDay.getDay() + 6) % 7; 
  const paddingBlocks = Array.from({ length: firstDayIndex });
  
  // To identify today
  const todayStr = toDateInputValue(new Date());

  // Month and year header
  const monthLabel = firstDay.toLocaleString("en", { month: "long" });
  const yearLabel = firstDay.getFullYear();

  return (
    <div className="space-y-3">
      {/* Month + Year Header */}
      <div className="flex items-baseline gap-2 pb-1">
        <h2 className="text-base font-semibold text-foreground">{monthLabel}</h2>
        <span className="text-sm text-muted-foreground">{yearLabel}</span>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 pb-1">
            {wd}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3">
        {paddingBlocks.map((_, i) => (
          <div key={`padding-${i}`} className="min-h-24 rounded-lg border border-transparent bg-muted/30" />
        ))}
        
        {days.map((day) => {
          const dateKey = toDateInputValue(day);
          const summary = getEntriesForDate(entries, dateKey);
          const isToday = dateKey === todayStr;

          return (
            <div 
              key={dateKey}
              className={`min-h-24 rounded-lg border bg-card p-3 flex flex-col justify-between transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                isToday ? "border-primary/50 ring-1 ring-primary/10 shadow-sm" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {day.getDate()}
                </p>
                {summary.count > 0 ? (
                  <CalendarDays className="size-3.5 text-primary" />
                ) : null}
              </div>
              <div>
                <p className={`mt-2 text-xl font-bold tracking-tight ${summary.totalHours > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {summary.totalHours.toFixed(1)}h
                </p>
                <p className="text-[10px] font-medium text-muted-foreground/60">
                  {summary.count ? `${summary.count} entries` : "No entry"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getEntriesForDate(entries: TimeEntryResponse[], date: string) {
  const dayEntries = entries.filter((entry) => entry.entryDate === date);

  return {
    count: dayEntries.length,
    totalHours: dayEntries.reduce((total, entry) => total + entry.hours, 0),
  };
}

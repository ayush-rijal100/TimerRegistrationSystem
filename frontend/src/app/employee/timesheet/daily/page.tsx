"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarDays, Clock3, Plus, Pencil } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineError } from "@/components/common/InlineFeedback";
import { LoadingState } from "@/components/common/LoadingState";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/apiError";
import { useGetMyTimeEntriesQuery } from "@/lib/features/api/apiSlice";
import { formatShortDate, toDateInputValue } from "@/lib/dates";
import { TimeEntryFormDialog } from "../TimeEntryFormDialog";
import type { TimeEntryResponse } from "@/lib/types";

export default function DailyTimesheetPage() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today));

  // Fetch entries for the specific day
  const {
    data: entries = [],
    error: entriesError,
    isFetching: entriesFetching,
  } = useGetMyTimeEntriesQuery({ startDate: selectedDate, endDate: selectedDate });

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryResponse | null>(null);

  const totalHours = entries.reduce((total, entry) => total + entry.hours, 0);

  function openCreateForm() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEditForm(entry: TimeEntryResponse) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Daily View</h2>
        <div className="flex items-center gap-3">
          <Input
            className="w-[160px]"
            onChange={(e) => setSelectedDate(e.target.value)}
            type="date"
            value={selectedDate}
          />
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 size-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Selected day" value={formatShortDate(selectedDate)} icon={CalendarDays} />
        <MetricCard label="Total hours" value={`${totalHours.toFixed(2)}h`} icon={Clock3} />
        <MetricCard label="Entries count" value={String(entries.length)} icon={Activity} />
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Time Entries</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Detailed list of hours logged for {formatShortDate(selectedDate)}.
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {entriesFetching ? "Refreshing" : `${entries.length} entries`}
          </Badge>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {entriesFetching ? (
            <div className="mb-4">
              <LoadingState text="Loading entries..." />
            </div>
          ) : null}
          {entriesError ? (
            <InlineError message={getApiErrorMessage(entriesError)} />
          ) : null}

          {entries.length === 0 && !entriesFetching ? (
            <EmptyState text="No entries for the selected date yet." />
          ) : (
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
                        <Button onClick={() => openEditForm(entry)} size="sm" variant="outline">
                          <Pencil className="size-3.5 mr-2" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TimeEntryFormDialog
        defaultDate={selectedDate}
        editingEntry={editingEntry}
        onOpenChange={setFormOpen}
        open={formOpen}
      />
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
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
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

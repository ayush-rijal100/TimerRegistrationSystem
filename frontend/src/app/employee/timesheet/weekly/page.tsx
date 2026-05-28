"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarDays, Clock3, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/apiError";
import { useGetMyTimeEntriesQuery } from "@/lib/features/api/apiSlice";
import { 
  formatShortDate, 
  formatWeekday, 
  getDaysBetween, 
  getEndOfWeek, 
  getStartOfWeek, 
  toDateInputValue 
} from "@/lib/dates";
import { TimeEntryFormDialog } from "../TimeEntryFormDialog";
import type { TimeEntryResponse } from "@/lib/types";

export default function WeeklyTimesheetPage() {
  const today = useMemo(() => new Date(), []);
  
  // State for which week we are viewing, represented by any date in that week
  const [viewDate, setViewDate] = useState(today);

  const startOfWeek = getStartOfWeek(viewDate);
  const endOfWeek = getEndOfWeek(viewDate);
  
  const startDateStr = toDateInputValue(startOfWeek);
  const endDateStr = toDateInputValue(endOfWeek);
  
  const weekDays = getDaysBetween(startOfWeek, endOfWeek);

  const {
    data: entries = [],
    error: entriesError,
    isFetching: entriesFetching,
  } = useGetMyTimeEntriesQuery({ startDate: startDateStr, endDate: endDateStr });

  const [formOpen, setFormOpen] = useState(false);
  
  const totalWeekHours = entries.reduce((total, entry) => total + entry.hours, 0);

  function prevWeek() {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 7);
    setViewDate(d);
  }

  function nextWeek() {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 7);
    setViewDate(d);
  }

  function goToCurrentWeek() {
    setViewDate(new Date());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Weekly View</h2>
        <div className="flex items-center gap-2">
          <Button onClick={prevWeek} size="icon" variant="outline">
            <ChevronLeft className="size-4" />
          </Button>
          <Button onClick={goToCurrentWeek} variant="outline" className="w-[120px]">
            Current Week
          </Button>
          <Button onClick={nextWeek} size="icon" variant="outline">
            <ChevronRight className="size-4" />
          </Button>
          <Button onClick={() => setFormOpen(true)} className="ml-4">
            <Plus className="mr-2 size-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Date range" value={`${formatShortDate(startOfWeek)} - ${formatShortDate(endOfWeek)}`} icon={CalendarDays} />
        <MetricCard label="Total hours" value={`${totalWeekHours.toFixed(2)}h`} icon={Clock3} />
        <MetricCard label="Entries count" value={String(entries.length)} icon={Activity} />
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Week Summary</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Total hours logged per day for the selected week.
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

          <div className="grid gap-3 md:grid-cols-7">
            {weekDays.map((day) => {
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
        </CardContent>
      </Card>

      <TimeEntryFormDialog
        defaultDate={toDateInputValue(new Date())}
        editingEntry={null}
        onOpenChange={setFormOpen}
        open={formOpen}
      />
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

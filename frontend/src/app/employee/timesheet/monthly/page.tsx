"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarDays, Clock3, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getApiErrorMessage } from "@/lib/apiError";
import { useGetMyTimeEntriesQuery } from "@/lib/features/api/apiSlice";
import { 
  formatShortDate, 
  getDaysBetween, 
  getEndOfMonth, 
  getStartOfMonth, 
  toDateInputValue 
} from "@/lib/dates";
import { TimeEntryFormDialog } from "../TimeEntryFormDialog";
import type { TimeEntryResponse } from "@/lib/types";

export default function MonthlyTimesheetPage() {
  const today = useMemo(() => new Date(), []);
  
  const [viewDate, setViewDate] = useState(today);
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState(toDateInputValue(today));
  const [editingEntry, setEditingEntry] = useState<TimeEntryResponse | null>(null);

  const startOfMonth = getStartOfMonth(viewDate);
  const endOfMonth = getEndOfMonth(viewDate);
  
  const startDateStr = toDateInputValue(startOfMonth);
  const endDateStr = toDateInputValue(endOfMonth);
  
  const monthDays = getDaysBetween(startOfMonth, endOfMonth);

  const {
    data: entries = [],
    error: entriesError,
    isFetching: entriesFetching,
  } = useGetMyTimeEntriesQuery({ startDate: startDateStr, endDate: endDateStr });

  const totalMonthHours = entries.reduce((total, entry) => total + entry.hours, 0);

  function prevMonth() {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    setViewDate(d);
  }

  function nextMonth() {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    setViewDate(d);
  }

  function goToCurrentMonth() {
    setViewDate(new Date());
  }
  
  function handleDayClick(dateStr: string, entriesForDay: TimeEntryResponse[]) {
    if (entriesForDay.length > 0) {
      setEditingEntry(entriesForDay[0]);
    } else {
      setEditingEntry(null);
    }
    setFormDefaultDate(dateStr);
    setFormOpen(true);
  }

  function openNewEntryForm() {
    setEditingEntry(null);
    setFormDefaultDate(toDateInputValue(new Date()));
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Monthly Calendar</h2>
        <div className="flex items-center gap-2">
          <Button onClick={prevMonth} size="icon" variant="outline">
            <ChevronLeft className="size-4" />
          </Button>
          <Button onClick={goToCurrentMonth} variant="outline" className="w-[120px]">
            Current Month
          </Button>
          <Button onClick={nextMonth} size="icon" variant="outline">
            <ChevronRight className="size-4" />
          </Button>
          <Button onClick={openNewEntryForm} className="ml-4">
            <Plus className="mr-2 size-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Viewing" value={viewDate.toLocaleString("en", { month: "long", year: "numeric" })} icon={CalendarDays} />
        <MetricCard label="Total hours" value={`${totalMonthHours.toFixed(2)}h`} icon={Clock3} />
        <MetricCard label="Entries count" value={String(entries.length)} icon={Activity} />
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-6 pt-6 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Interactive Calendar</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Hover over dates with entries to see project details. Click any date to add a new entry.
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

          <MonthlyCalendarGrid 
            days={monthDays} 
            entries={entries} 
            onDayClick={handleDayClick}
          />
        </CardContent>
      </Card>

      <TimeEntryFormDialog
        defaultDate={formDefaultDate}
        editingEntry={editingEntry}
        onOpenChange={setFormOpen}
        open={formOpen}
      />
    </div>
  );
}

function MonthlyCalendarGrid({
  days,
  entries,
  onDayClick,
}: {
  days: Date[];
  entries: TimeEntryResponse[];
  onDayClick: (dateStr: string, entriesForDay: TimeEntryResponse[]) => void;
}) {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const firstDay = days.length > 0 ? days[0] : new Date();
  const firstDayIndex = (firstDay.getDay() + 6) % 7; 
  const paddingBlocks = Array.from({ length: firstDayIndex });
  
  const todayStr = toDateInputValue(new Date());

  return (
    <div className="space-y-3">
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
          <div key={`padding-${i}`} className="min-h-28 rounded-lg border border-transparent bg-muted/30" />
        ))}
        
        {days.map((day) => {
          const dateKey = toDateInputValue(day);
          const dayEntries = entries.filter((entry) => entry.entryDate === dateKey);
          const totalHours = dayEntries.reduce((acc, entry) => acc + entry.hours, 0);
          const count = dayEntries.length;
          const isToday = dateKey === todayStr;

          const cellContent = (
            <div 
              onClick={() => onDayClick(dateKey, dayEntries)}
              className={`min-h-28 rounded-lg border bg-card p-3 flex flex-col justify-between transition-all cursor-pointer hover:bg-accent/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                isToday ? "border-primary/50 ring-1 ring-primary/10 shadow-sm" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {day.getDate()}
                </p>
                {count > 0 ? (
                  <CalendarDays className="size-3.5 text-primary" />
                ) : null}
              </div>
              <div>
                <p className={`mt-2 text-xl font-bold tracking-tight ${totalHours > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {totalHours > 0 ? `${totalHours.toFixed(1)}h` : "-"}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground/60">
                  {count > 0 ? `${count} entries` : ""}
                </p>
              </div>
            </div>
          );

          if (count === 0) {
            return <div key={dateKey}>{cellContent}</div>;
          }

          return (
            <HoverCard key={dateKey}>
              <HoverCardTrigger>
                {cellContent}
              </HoverCardTrigger>
              <HoverCardContent className="w-80 shadow-md border-border bg-popover text-popover-foreground">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold border-b pb-2">Entries for {formatShortDate(day)}</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="text-sm border rounded-md p-2 bg-muted/20">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-primary cursor-pointer hover:underline" onClick={(e) => {
                            e.stopPropagation();
                            onDayClick(dateKey, [entry]);
                          }}>
                            {entry.projectCode}
                          </span>
                          <Badge variant="outline" className="text-[10px]">{entry.hours}h</Badge>
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t text-xs text-right font-medium text-muted-foreground">
                    Total: {totalHours.toFixed(2)}h
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
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

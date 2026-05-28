"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { InlineError, InlineSuccess } from "@/components/common/InlineFeedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  useCreateTimeEntryMutation,
  useGetMyProjectsQuery,
  useUpdateTimeEntryMutation,
} from "@/lib/features/api/apiSlice";
import type { TimeEntryResponse } from "@/lib/types";
import { toDateInputValue } from "@/lib/dates";

type TimeEntryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry: TimeEntryResponse | null;
  defaultDate?: string;
  onSuccess?: () => void;
};

export function TimeEntryFormDialog({
  open,
  onOpenChange,
  editingEntry,
  defaultDate,
  onSuccess,
}: TimeEntryFormDialogProps) {
  const [selectedDate, setSelectedDate] = useState(defaultDate ?? toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState("");
  const [hours, setHours] = useState("8");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const { data: projects = [], error: projectsError, isLoading: projectsLoading } = useGetMyProjectsQuery();
  const [createEntry, createState] = useCreateTimeEntryMutation();
  const [updateEntry, updateState] = useUpdateTimeEntryMutation();

  const mutationError = createState.error ?? updateState.error;
  const isSaving = createState.isLoading || updateState.isLoading;

  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setSelectedDate(editingEntry.entryDate);
        setProjectId(String(editingEntry.projectId));
        setHours(String(editingEntry.hours));
        setNotes(editingEntry.notes ?? "");
      } else {
        setSelectedDate(defaultDate ?? toDateInputValue(new Date()));
        setProjectId("");
        setHours("8");
        setNotes("");
      }
      setMessage("");
    }
  }, [open, editingEntry, defaultDate]);

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

      onSuccess?.();
      onOpenChange(false);
    } catch {
      // RTK Query exposes the backend error through mutation state.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingEntry ? "Update Entry" : "Create Entry"}</DialogTitle>
          <DialogDescription>
            {editingEntry
              ? "Modify the details of your time entry."
              : "Log new hours worked on a project."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5 py-4" onSubmit={handleSubmit}>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {editingEntry ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
              {isSaving ? "Saving..." : editingEntry ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

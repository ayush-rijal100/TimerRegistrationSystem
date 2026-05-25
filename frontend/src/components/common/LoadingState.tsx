import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  text: string;
};

export function LoadingState({ text }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {text}
    </div>
  );
}

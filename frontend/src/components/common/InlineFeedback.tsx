import { CheckCircle2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type InlineFeedbackProps = {
  message: string;
  title?: string;
};

export function InlineError({
  message,
  title = "Something needs attention",
}: InlineFeedbackProps) {
  return (
    <Alert variant="destructive">
      <RefreshCw className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function InlineSuccess({ message }: InlineFeedbackProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm text-accent-foreground">
      <CheckCircle2 className="size-4" />
      {message}
    </div>
  );
}

import { CheckCircle2, CloudAlert, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

type AutosaveIndicatorProps = {
  state: AutosaveState;
  message: string;
};

export function AutosaveIndicator({ state, message }: AutosaveIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        state === "saved" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        state === "saving" && "border-slate-200 bg-slate-100 text-slate-600",
        state === "error" && "border-rose-200 bg-rose-50 text-rose-700",
        state === "idle" && "border-slate-200 bg-white text-slate-600",
      )}
      aria-live="polite"
    >
      {state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {state === "saved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {state === "error" ? <CloudAlert className="h-3.5 w-3.5" /> : null}
      <span>{message}</span>
    </div>
  );
}

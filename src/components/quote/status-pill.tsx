import type { QuoteStatus } from "@/types/domain";

import { Badge } from "@/components/ui/shadcn";

type StatusPillProps = {
  status: QuoteStatus;
  label: string;
};

function statusVariant(status: QuoteStatus): "neutral" | "accent" | "success" | "danger" | "warning" {
  if (status === "accepted") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  if (status === "invoiced") {
    return "warning";
  }

  if (status === "sent") {
    return "accent";
  }

  return "neutral";
}

export function StatusPill({ status, label }: StatusPillProps) {
  return <Badge variant={statusVariant(status)}>{label}</Badge>;
}

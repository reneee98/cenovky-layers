"use client";

import type { QuoteStatus } from "@/types/domain";
import { Check, ChevronDown } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn";

import { StatusPill } from "@/components/quote/status-pill";

type StatusDropdownProps = {
  status: QuoteStatus;
  statusLabel: string;
  options: Array<{ value: QuoteStatus; label: string }>;
  onChange: (value: QuoteStatus) => void;
};

export function StatusDropdown({
  status,
  statusLabel,
  options,
  onChange,
}: StatusDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-9 justify-between gap-2 px-2.5">
          <StatusPill status={status} label={statusLabel} />
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="justify-between"
          >
            <span>{option.label}</span>
            {option.value === status ? (
              <Check className="h-3.5 w-3.5 text-slate-500" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

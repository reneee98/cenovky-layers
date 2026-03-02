import { Card, CardContent, CardHeader } from "@/components/ui/shadcn/card";

type InvoiceStatsCardsProps = {
  stats: Array<{
    label: string;
    value: string;
    note?: string;
  }>;
};

export function InvoiceStatsCards({ stats }: InvoiceStatsCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Štatistiky fakturácie">
      {stats.map(({ label, value, note }) => (
        <Card key={label} className="border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_16px_rgba(15,23,42,0.04)]">
          <CardHeader className="pb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
            {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

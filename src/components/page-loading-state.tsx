import { AppShell, type NavigationKey } from "@/components/app-shell";
import { Card, Stack } from "@/components/ui/primitives";

type PageLoadingStateProps = {
  active: NavigationKey;
  title: string;
  description?: string;
};

export function PageLoadingState({ active, title, description }: PageLoadingStateProps) {
  return (
    <AppShell active={active} title={title} description={description ?? "Nacitava sa..."}>
      <Card className="animate-pulse" padding={24}>
        <Stack gap={12}>
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-10 w-full rounded bg-slate-100" />
          <div className="h-10 w-full rounded bg-slate-100" />
          <div className="h-10 w-2/3 rounded bg-slate-100" />
        </Stack>
      </Card>
    </AppShell>
  );
}

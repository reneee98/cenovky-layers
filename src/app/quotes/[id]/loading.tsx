import { PageLoadingState } from "@/components/page-loading-state";

export default function QuoteBuilderLoading() {
  return (
    <PageLoadingState
      active="quotes"
      title="Ponuka"
      description="Nacitava sa editor ponuky..."
    />
  );
}

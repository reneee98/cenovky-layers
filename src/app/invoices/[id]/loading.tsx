import { PageLoadingState } from "@/components/page-loading-state";

export default function InvoiceDetailLoading() {
  return <PageLoadingState active="invoices" title="Detail faktury" />;
}

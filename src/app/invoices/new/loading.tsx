import { PageLoadingState } from "@/components/page-loading-state";

export default function NewInvoiceLoading() {
  return <PageLoadingState active="invoices" title="Nova faktura" />;
}

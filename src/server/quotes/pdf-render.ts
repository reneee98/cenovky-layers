import { renderQuotePdfFromTemplate } from "../../../pdf/render";

import type { QuoteVersionSnapshot } from "@/server/quotes/pdf-snapshot";
import { renderQuotePdfFallback } from "@/server/quotes/pdf-render-fallback";

export async function renderQuotePdf(
  snapshot: QuoteVersionSnapshot,
): Promise<Uint8Array> {
  try {
    return await renderQuotePdfFromTemplate(snapshot);
  } catch (error) {
    console.warn("Primary PDF renderer failed, falling back to pdf-lib renderer.", {
      quoteId: snapshot.quote.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return renderQuotePdfFallback(snapshot);
  }
}

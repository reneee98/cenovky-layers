import { NextResponse } from "next/server";

import { getPdfPreviewFixture } from "@/server/quotes/pdf-preview-fixtures";
import { renderQuotePdf } from "@/server/quotes/pdf-render";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fixture: string }> },
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { fixture } = await context.params;
  const snapshot = getPdfPreviewFixture(fixture);

  if (!snapshot) {
    return NextResponse.json({ error: "Fixture not found." }, { status: 404 });
  }

  const bytes = await renderQuotePdf(snapshot);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=preview-${fixture}.pdf`,
      "Cache-Control": "no-store",
    },
  });
}

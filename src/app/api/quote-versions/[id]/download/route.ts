import { NextResponse } from "next/server";

import { getQuoteVersionDownloadPayload } from "@/server/quotes/pdf-export";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const payload = await getQuoteVersionDownloadPayload(id);

    if (!payload) {
      return NextResponse.json({ error: "Verzia ponuky nebola najdena." }, { status: 404 });
    }

    return new NextResponse(Buffer.from(payload.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payload.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Quote version PDF download failed", {
      versionId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Nepodarilo sa pripravit PDF verziu." }, { status: 500 });
  }
}

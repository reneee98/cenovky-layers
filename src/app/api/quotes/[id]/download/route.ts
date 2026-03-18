import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  exportQuoteToPdfVersion,
  getQuoteVersionDownloadPayload,
} from "@/server/quotes/pdf-export";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovane." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const exportedVersion = await exportQuoteToPdfVersion(user.id, id);

    if (!exportedVersion) {
      return NextResponse.json({ error: "Ponuka nebola najdena." }, { status: 404 });
    }

    const payload = await getQuoteVersionDownloadPayload(user.id, exportedVersion.versionId);

    if (!payload) {
      return NextResponse.json({ error: "Nepodarilo sa pripravit PDF verziu." }, { status: 500 });
    }

    return new NextResponse(Buffer.from(payload.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payload.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Quote PDF download failed", {
      quoteId: id,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Nepodarilo sa vygenerovat PDF." }, { status: 500 });
  }
}

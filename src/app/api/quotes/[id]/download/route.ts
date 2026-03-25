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

    const rawBytes = payload.bytes;
    if (!rawBytes || !(rawBytes instanceof Uint8Array)) {
      console.error("Quote PDF download: invalid payload.bytes", {
        quoteId: id,
        userId: user.id,
      });
      return NextResponse.json({ error: "Nepodarilo sa vygenerovat PDF." }, { status: 500 });
    }

    const body = Buffer.from(rawBytes);
    if (body.length === 0) {
      console.error("Quote PDF download: empty PDF bytes", {
        quoteId: id,
        userId: user.id,
      });
      return NextResponse.json({ error: "Nepodarilo sa vygenerovat PDF." }, { status: 500 });
    }

    const filename =
      typeof payload.filename === "string" && payload.filename.trim()
        ? payload.filename.trim()
        : "cenova-ponuka.pdf";

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Quote PDF download failed", {
      quoteId: id,
      userId: user.id,
      error: message,
      stack,
    });
    return NextResponse.json(
      {
        error: "Nepodarilo sa vygenerovat PDF.",
        detail: message,
      },
      { status: 500 },
    );
  }
}

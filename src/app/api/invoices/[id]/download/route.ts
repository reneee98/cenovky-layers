import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInvoicePdfDownloadPayload } from "@/server/invoices/pdf-export";

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
    const payload = await getInvoicePdfDownloadPayload(user.id, id);

    if (!payload) {
      return NextResponse.json({ error: "Faktúra nebola nájdená." }, { status: 404 });
    }

    const rawBytes = payload.bytes;
    if (!rawBytes || !(rawBytes instanceof Uint8Array)) {
      console.error("Invoice PDF download: invalid payload.bytes", { invoiceId: id });
      return NextResponse.json(
        { error: "Nepodarilo sa vygenerovať faktúru PDF." },
        { status: 500 },
      );
    }

    const body = Buffer.from(rawBytes);
    if (body.length === 0) {
      console.error("Invoice PDF download: empty PDF bytes", { invoiceId: id });
      return NextResponse.json(
        { error: "Nepodarilo sa vygenerovať faktúru PDF." },
        { status: 500 },
      );
    }

    const filename =
      typeof payload.filename === "string" && payload.filename.trim()
        ? payload.filename.trim()
        : "faktura.pdf";

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
    console.error("Invoice PDF download failed", {
      invoiceId: id,
      userId: user.id,
      error: message,
      stack,
    });

    return NextResponse.json(
      {
        error: "Nepodarilo sa vygenerovať faktúru PDF.",
        detail: message,
      },
      { status: 500 },
    );
  }
}

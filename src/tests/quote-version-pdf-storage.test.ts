import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildQuoteVersionPdfReference,
  readQuoteVersionPdf,
  saveQuoteVersionPdf,
} from "../server/storage/quote-version-pdf";

test("quote version PDF reference sanitizes path segments", () => {
  const reference = buildQuoteVersionPdfReference("quote/../1", 2, "ver:::id");
  assert.equal(reference, "quote-versions/quote1/v2-verid.pdf");
});

test("quote version PDF storage: rejects traversal references", async () => {
  await assert.rejects(
    () => saveQuoteVersionPdf("../../escape.pdf", new Uint8Array([1, 2, 3])),
    /Invalid PDF storage path reference/,
  );

  const read = await readQuoteVersionPdf("../../escape.pdf");
  assert.equal(read, null);
});

test("quote version PDF storage: save and read roundtrip", async () => {
  const reference = buildQuoteVersionPdfReference(`quote${Date.now()}`, 1, `ver${Date.now()}`);
  const content = new Uint8Array([37, 80, 68, 70]);

  await saveQuoteVersionPdf(reference, content);
  const read = await readQuoteVersionPdf(reference);

  assert.ok(read);
  assert.deepEqual(Array.from(read ?? []), [37, 80, 68, 70]);

  const path = resolve(process.cwd(), "storage", reference);
  await rm(path, { force: true });
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildDefaultVariableSymbol, formatInvoiceNumber } from "../server/invoices/numbering";
import { buildEpcQrPayload } from "../server/invoices/payment-qr";

test("invoice numbering: format and variable symbol fallback", () => {
  assert.equal(formatInvoiceNumber(2026, 7), "20260007");
  assert.equal(buildDefaultVariableSymbol("20260007"), "20260007");

  const fallback = buildDefaultVariableSymbol("x");
  const currentYear = String(new Date().getUTCFullYear());
  assert.equal(fallback, `${currentYear}0001`);
});

test("payment QR: builds EPC payload with 12 lines and trimming", () => {
  const payload = buildEpcQrPayload({
    iban: " SK12 3456 7890 1234 5678 9012 ",
    beneficiaryName: "A".repeat(80),
    amount: 120.5,
    currency: "eur",
    bic: " giba sk bx ",
    remittance: "R".repeat(200),
  });

  const lines = payload.split("\n");
  assert.equal(lines.length, 12);
  assert.equal(lines[0], "BCD");
  assert.equal(lines[4], "GIBASKBX");
  assert.equal(lines[6], "SK1234567890123456789012");
  assert.equal(lines[7], "EUR120.50");
  assert.equal(lines[5].length, 70);
  assert.equal(lines[10].length, 140);
});

test("pay by square: validates IBAN and normalizes equivalent inputs", async (t) => {
  let buildPayBySquarePayload: typeof import("../server/invoices/pay-by-square").buildPayBySquarePayload;

  try {
    ({ buildPayBySquarePayload } = await import("../server/invoices/pay-by-square"));
  } catch (error) {
    t.skip(`pay-by-square unavailable in current runtime: ${String(error)}`);
    return;
  }

  assert.throws(
    () =>
      buildPayBySquarePayload({
        amount: 50,
        currency: "EUR",
        variableSymbol: "123",
        paymentNote: "Faktura",
        beneficiaryName: "Acme",
        iban: "INVALID",
      }),
    /Invalid IBAN/,
  );

  const payloadA = buildPayBySquarePayload({
    amount: 50,
    currency: "EUR",
    variableSymbol: "12-3",
    paymentNote: " Faktura za sluzby ",
    beneficiaryName: "Acme",
    iban: "SK68 1100 0000 0029 3874 2637",
  });

  const payloadB = buildPayBySquarePayload({
    amount: 50,
    currency: "EUR",
    variableSymbol: "123",
    paymentNote: "Faktura za sluzby",
    beneficiaryName: "Acme",
    iban: "SK6811000000002938742637",
  });

  assert.equal(typeof payloadA, "string");
  assert.ok(payloadA.length > 0);
  assert.equal(payloadA, payloadB);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
} from "../lib/format";
import { getClientBillingIdentity, getClientDisplayName } from "../lib/clients/display";

test("format helpers: currency and number fallback behavior", () => {
  const eur = formatCurrency(12.345, "eur", "en-US");
  assert.match(eur, /12\.35\s€$/);

  const usd = formatCurrency(100, "usd", "en-US");
  assert.match(usd, /100\.00\sUSD$/);

  assert.equal(formatNumber(Number.NaN, "en-US"), "0.00");
});

test("format helpers: date/time and invalid inputs", () => {
  const value = "2026-03-01T13:45:00.000Z";
  assert.equal(formatDate("invalid"), "-");
  assert.match(formatDate(value, "en-GB", { timeZone: "UTC" }), /\d{2}\/\d{2}\/\d{4}/);
  assert.match(formatDateTime(value, "en-GB", { timeZone: "UTC" }), /\d{2}:\d{2}/);
  assert.match(formatTime(value, "en-GB", { timeZone: "UTC" }), /\d{2}:\d{2}/);
});

test("client display helpers: company, person and fallback", () => {
  assert.equal(
    getClientDisplayName({ name: "Fallback Name", companyName: " Acme " }),
    "Acme",
  );

  assert.equal(
    getClientDisplayName({ name: "Fallback Name", firstName: "John", lastName: "Doe" }),
    "John Doe",
  );

  assert.equal(getClientDisplayName({ name: "  " }), "-");
  assert.equal(getClientBillingIdentity({ name: "  " }), null);
});

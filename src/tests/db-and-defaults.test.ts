import assert from "node:assert/strict";
import test from "node:test";

import { isDbKnownRequestError } from "../lib/db-errors";
import { createEntityId, createNotFoundError, numericToNumber, toDate } from "../lib/db";
import { isPrismaKnownRequestError } from "../lib/prisma-errors";
import {
  DEFAULT_SETTINGS_CURRENCY,
  DEFAULT_SETTINGS_LANGUAGE,
  DEFAULT_SETTINGS_VAT_RATE,
  buildDefaultSettingsCreateInput,
} from "../server/db/settings-defaults";

test("db error guards detect known codes", () => {
  assert.equal(isDbKnownRequestError({ code: "P2002" }, "P2002"), true);
  assert.equal(isDbKnownRequestError({ code: "X" }, "P2002"), false);
  assert.equal(isPrismaKnownRequestError({ code: "P2025" }), true);
  assert.equal(isPrismaKnownRequestError(null), false);
});

test("db helpers: numeric/date/id/not-found", () => {
  assert.equal(numericToNumber(10), 10);
  assert.equal(numericToNumber("10.5"), 10.5);
  assert.equal(numericToNumber("abc"), 0);
  assert.equal(numericToNumber({ toString: () => "7.2" }), 7.2);

  const date = toDate("2026-01-01T00:00:00.000Z");
  assert.equal(date.toISOString(), "2026-01-01T00:00:00.000Z");

  const id = createEntityId("quote");
  assert.match(id, /^quote_[a-f0-9]{32}$/);

  const err = createNotFoundError();
  assert.equal(err.code, "P2025");
});

test("default settings builder uses deterministic defaults", () => {
  const payload = buildDefaultSettingsCreateInput("user_1", 2030);

  assert.deepEqual(payload, {
    userId: "user_1",
    companyName: "Your Company",
    companyAddress: "Street 1, City",
    companyEmail: "hello@example.com",
    companyPhone: "+421900000000",
    defaultLanguage: DEFAULT_SETTINGS_LANGUAGE,
    defaultCurrency: DEFAULT_SETTINGS_CURRENCY,
    vatRate: DEFAULT_SETTINGS_VAT_RATE,
    numberingYear: 2030,
    numberingCounter: 0,
  });
});

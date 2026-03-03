import assert from "node:assert/strict";
import test from "node:test";

import { formatInvoiceStatus, isInvoiceStatus, resolveInvoiceStatus } from "../lib/invoices/status";

test("invoice status: type guard and labels", () => {
  assert.equal(isInvoiceStatus("sent"), true);
  assert.equal(isInvoiceStatus("invalid"), false);
  assert.equal(formatInvoiceStatus("partially_paid"), "Ciastocne uhradena");
});

test("invoice status: cancelled remains terminal", () => {
  const status = resolveInvoiceStatus({
    currentStatus: "cancelled",
    total: 100,
    amountPaid: 100,
    dueDate: new Date("2026-01-01T00:00:00.000Z"),
    now: new Date("2026-01-02T00:00:00.000Z"),
  });

  assert.equal(status, "cancelled");
});

test("invoice status: paid, partially paid, overdue and draft resolution", () => {
  assert.equal(
    resolveInvoiceStatus({
      currentStatus: "sent",
      total: 100,
      amountPaid: 100,
      dueDate: new Date("2026-01-10T00:00:00.000Z"),
      now: new Date("2026-01-02T00:00:00.000Z"),
    }),
    "paid",
  );

  assert.equal(
    resolveInvoiceStatus({
      currentStatus: "sent",
      total: 100,
      amountPaid: 1,
      dueDate: new Date("2026-01-01T00:00:00.000Z"),
      now: new Date("2026-01-10T00:00:00.000Z"),
    }),
    "partially_paid",
  );

  assert.equal(
    resolveInvoiceStatus({
      currentStatus: "draft",
      total: 100,
      amountPaid: 0,
      dueDate: new Date("2026-01-01T00:00:00.000Z"),
      now: new Date("2026-01-10T00:00:00.000Z"),
    }),
    "draft",
  );

  assert.equal(
    resolveInvoiceStatus({
      currentStatus: "sent",
      total: 100,
      amountPaid: 0,
      dueDate: new Date("2026-01-01T00:00:00.000Z"),
      now: new Date("2026-01-10T00:00:00.000Z"),
    }),
    "overdue",
  );

  assert.equal(
    resolveInvoiceStatus({
      currentStatus: "sent",
      total: 0,
      amountPaid: 0,
      dueDate: new Date("2026-01-20T00:00:00.000Z"),
      now: new Date("2026-01-10T00:00:00.000Z"),
    }),
    "sent",
  );
});

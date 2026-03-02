import { createEntityId, createNotFoundError, dbQuery, dbQueryOne, numericToNumber, toDate } from "@/lib/db";

type PaymentRow = {
  id: string;
  userId: string;
  invoiceId: string;
  paymentDate: Date | string;
  amount: number | string;
  method: string;
  note: string | null;
  createdAt: Date | string;
};

function mapPaymentRow(row: PaymentRow) {
  return {
    ...row,
    paymentDate: toDate(row.paymentDate),
    amount: numericToNumber(row.amount),
    createdAt: toDate(row.createdAt),
  };
}

export async function listPaymentsByInvoice(userId: string, invoiceId: string) {
  const rows = await dbQuery<PaymentRow>(
    `SELECT
      id,
      user_id AS "userId",
      invoice_id AS "invoiceId",
      payment_date AS "paymentDate",
      amount,
      method,
      note,
      created_at AS "createdAt"
    FROM payments
    WHERE user_id = $1 AND invoice_id = $2
    ORDER BY payment_date DESC, created_at DESC`,
    [userId, invoiceId],
  );

  return rows.map(mapPaymentRow);
}

export async function createPayment(
  userId: string,
  data: Record<string, unknown>,
) {
  const row = await dbQueryOne<PaymentRow>(
    `INSERT INTO payments (
      id,
      user_id,
      invoice_id,
      payment_date,
      amount,
      method,
      note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING
      id,
      user_id AS "userId",
      invoice_id AS "invoiceId",
      payment_date AS "paymentDate",
      amount,
      method,
      note,
      created_at AS "createdAt"`,
    [
      createEntityId("pay"),
      userId,
      data.invoiceId,
      data.paymentDate,
      data.amount,
      data.method,
      data.note ?? null,
    ],
  );

  if (!row) {
    throw new Error("PAYMENT_CREATE_FAILED");
  }

  return mapPaymentRow(row);
}

export async function deletePayment(userId: string, id: string) {
  const row = await dbQueryOne<{ id: string; invoiceId: string }>(
    `DELETE FROM payments
     WHERE id = $1 AND user_id = $2
     RETURNING id, invoice_id AS "invoiceId"`,
    [id, userId],
  );

  if (!row) {
    throw createNotFoundError("PAYMENT_NOT_FOUND");
  }

  return row;
}

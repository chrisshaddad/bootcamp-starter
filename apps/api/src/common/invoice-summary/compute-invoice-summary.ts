import { InvoiceStatus } from '@repo/contracts';

export type InvoiceSummaryLineItem = { amount: number };
export type InvoiceSummaryPayment = { amount: number };

export type InvoiceSummary = {
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
};

/**
 * Pure, dependency-free derivation of an Invoice's total/paid amounts and
 * status from its line items and payments. No Prisma, no I/O — the single
 * source of truth for these derived fields, consumed by both InvoicesService
 * and InvoicePaymentsService so they can never disagree.
 */
export function computeInvoiceSummary(
  lineItems: InvoiceSummaryLineItem[],
  payments: InvoiceSummaryPayment[],
  dueDate: Date,
  now: Date,
): InvoiceSummary {
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  let status: InvoiceStatus;
  if (paidAmount >= totalAmount) {
    status = 'paid';
  } else if (dueDate < now) {
    status = 'overdue';
  } else if (paidAmount > 0) {
    status = 'partially_paid';
  } else {
    status = 'open';
  }

  return { totalAmount, paidAmount, status };
}

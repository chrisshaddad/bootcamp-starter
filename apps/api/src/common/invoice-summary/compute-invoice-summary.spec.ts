import { computeInvoiceSummary } from './compute-invoice-summary';

describe('computeInvoiceSummary', () => {
  const dueDate = new Date('2026-02-01T00:00:00.000Z');
  const beforeDue = new Date('2026-01-15T00:00:00.000Z');
  const afterDue = new Date('2026-02-15T00:00:00.000Z');

  it('is "open" when there are no payments and the due date has not passed', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }],
      [],
      dueDate,
      beforeDue,
    );

    expect(result).toEqual({
      totalAmount: 1000,
      paidAmount: 0,
      status: 'open',
    });
  });

  it('is "partially_paid" when some but not all of the total has been paid before the due date', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }],
      [{ amount: 400 }],
      dueDate,
      beforeDue,
    );

    expect(result).toEqual({
      totalAmount: 1000,
      paidAmount: 400,
      status: 'partially_paid',
    });
  });

  it('is "paid" when payments exactly match the total', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }],
      [{ amount: 1000 }],
      dueDate,
      beforeDue,
    );

    expect(result.status).toBe('paid');
  });

  it('is "paid" when payments exceed the total (overpayment)', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }],
      [{ amount: 1200 }],
      dueDate,
      beforeDue,
    );

    expect(result).toEqual({
      totalAmount: 1000,
      paidAmount: 1200,
      status: 'paid',
    });
  });

  it('is "overdue" when unpaid and the due date has passed', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }],
      [],
      dueDate,
      afterDue,
    );

    expect(result.status).toBe('overdue');
  });

  it('is "overdue" when partially paid and the due date has passed', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }],
      [{ amount: 300 }],
      dueDate,
      afterDue,
    );

    expect(result.status).toBe('overdue');
  });

  it('is "paid", not "overdue", when fully paid even past the due date (overdue-vs-paid precedence)', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }],
      [{ amount: 1000 }],
      dueDate,
      afterDue,
    );

    expect(result.status).toBe('paid');
  });

  it('sums multiple line items into the total', () => {
    const result = computeInvoiceSummary(
      [{ amount: 1000 }, { amount: 50 }, { amount: 25 }],
      [],
      dueDate,
      beforeDue,
    );

    expect(result.totalAmount).toBe(1075);
  });

  it('treats an empty line-item list as a zero total', () => {
    const result = computeInvoiceSummary([], [], dueDate, beforeDue);

    expect(result.totalAmount).toBe(0);
  });
});

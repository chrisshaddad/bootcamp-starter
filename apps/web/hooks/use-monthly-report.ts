'use client';

import useSWR from 'swr';
import type { MonthlyReportResponse } from '@repo/contracts';

/**
 * Params for a report request. `MONTHLY` targets a calendar month; `RANGE`
 * targets an inclusive custom date range (YYYY-MM-DD).
 */
type ReportParams =
  | { type: 'MONTHLY'; year: number; month: number }
  | { type: 'RANGE'; dateFrom: string; dateTo: string };

export function useReport(params: ReportParams) {
  let endpoint: string | null = null;

  if (params.type === 'MONTHLY') {
    const query = new URLSearchParams({
      year: String(params.year),
      month: String(params.month),
    });
    endpoint = `/reports/monthly?${query.toString()}`;
  } else if (
    params.dateFrom &&
    params.dateTo &&
    params.dateFrom <= params.dateTo
  ) {
    // Only fetch a valid range; an invalid one leaves endpoint null so SWR skips.
    const query = new URLSearchParams({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    endpoint = `/reports/range?${query.toString()}`;
  }

  const { data, error, isLoading, mutate } =
    useSWR<MonthlyReportResponse>(endpoint);

  return {
    report: data,
    isLoading,
    error,
    mutate,
  };
}

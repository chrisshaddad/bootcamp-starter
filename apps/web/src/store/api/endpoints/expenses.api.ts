import { baseApi } from '@/store/api/base-api';
import type { ApiEnvelope, ExpenseResponse } from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const expensesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listExpenses: build.query<ExpenseResponse[], void>({
      query: () => ({ url: '/expenses', method: 'GET' }),
      transformResponse: (
        response: ExpenseResponse[] | ApiEnvelope<ExpenseResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Expense' as const, id })),
              { type: 'Expense', id: 'LIST' },
            ]
          : [{ type: 'Expense', id: 'LIST' }],
    }),
  }),
});

export const { useListExpensesQuery } = expensesApi;

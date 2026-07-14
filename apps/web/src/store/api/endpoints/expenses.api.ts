import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateExpenseBody,
  ExpenseResponse,
  PatchExpenseBody,
} from '@/types/api';

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

    createExpense: build.mutation<ExpenseResponse, CreateExpenseBody>({
      query: (body) => ({ url: '/expenses', method: 'POST', body }),
      transformResponse: (
        response: ExpenseResponse | ApiEnvelope<ExpenseResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }, 'Timeline'],
    }),

    updateExpense: build.mutation<
      ExpenseResponse,
      { id: string; body: PatchExpenseBody }
    >({
      query: ({ id, body }) => ({
        url: `/expenses/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: ExpenseResponse | ApiEnvelope<ExpenseResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteExpense: build.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/expenses/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (
        response: { id: string } | ApiEnvelope<{ id: string }>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} = expensesApi;
